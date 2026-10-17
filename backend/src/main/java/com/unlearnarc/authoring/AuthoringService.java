package com.unlearnarc.authoring;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.*;
import com.unlearnarc.authoring.AuthoringModels.*;
import com.unlearnarc.canvasanim.dto.AnimationSceneRequest;
import com.unlearnarc.canvasanim.entity.AnimationScene.Source;
import com.unlearnarc.canvasanim.service.AnimationSceneService;
import com.unlearnarc.course.service.CourseService;
import com.unlearnarc.topic.dto.TopicRequest;
import com.unlearnarc.topic.service.TopicService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthoringService {
    private final AuthoringJobRepository jobs;
    private final AiContentGenerator generator;
    private final ObjectMapper mapper;
    private final Validator validator;
    private final CourseService courses;
    private final TopicService topics;
    private final AnimationSceneService scenes;

    public List<JobView> history(String owner) {
        return jobs.findTop20ByOwnerOrderByCreatedAtDesc(owner).stream().map(this::view).toList();
    }

    public JobView generate(String owner, GenerateRequest request) {
        Map<String, Object> context = new LinkedHashMap<>();
        String contract;
        if (request.kind() == Kind.TOPICS) {
            if (request.courseId() == null || request.courseId().isBlank()) {
                throw new IllegalArgumentException("Choose a course for topic generation.");
            }
            context.put("course", courses.findById(request.courseId()));
            context.put("existingTopics", topics.findByCourseId(request.courseId()));
            context.put("requestedCount", request.count());
            contract = "{\"topics\":[{\"name\":\"Topic name\",\"time\":\"00:20:00\",\"topicOrder\":1,"
                    + "\"level\":\"BEGINNER\",\"courseId\":\"selected course ID\"}]}. "
                    + "Return exactly requestedCount topics, never repeat existing names. Names max 200 characters. "
                    + "Levels: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT. time is HH:mm:ss and must be positive. "
                    + "Append sequential topicOrder values after the largest existing order (start at 1 if empty).";
        } else {
            context.put("simulators", scenes.simulatorCatalog());
            contract = "{\"slug\":\"unique-kebab-case-slug\",\"title\":\"Lesson title\",\"description\":\"Summary\","
                    + "\"category\":\"DSA\",\"source\":\"GENERATED\",\"kind\":\"catalog kind\","
                    + "\"simulatorParams\":{},\"isPublished\":false}. "
                    + "Choose ONLY a simulator from the catalog that genuinely teaches the requested subject; "
                    + "if none fits return {\"error\":\"Explain which available simulators can be used instead\"}. "
                    + "Use only parameters in that simulator's paramSchema, using small examples (max 12 elements). "
                    + "Do not claim a simulator teaches unrelated content. category must match the selected simulator. "
                    + "Description max 1000 characters; title max 200. Never provide a trace.";
        }
        JsonNode proposal = generator.generate(contract, context, request.prompt());
        if (proposal.has("error")) throw new IllegalArgumentException(proposal.path("error").asText("No suitable simulator."));
        AuthoringJob job = new AuthoringJob();
        job.setOwner(owner);
        job.setKind(request.kind());
        job.setCourseId(request.kind() == Kind.TOPICS ? request.courseId() : null);
        job.setPrompt(request.prompt());
        validate(job, proposal);
        if (request.kind() == Kind.TOPICS && proposal.path("topics").size() != request.count()) {
            throw new IllegalArgumentException("AI returned the wrong topic count. Please regenerate.");
        }
        job.setProposal(proposal.toString());
        job = jobs.save(job);
        log.info("[AI-AUTHORING] Draft generated job={} owner={} kind={}", job.getId(), owner, job.getKind());
        return view(job);
    }

    public record Review(JobView job, JsonNode preview) {}

    @Transactional
    public Review review(String owner, String id, JsonNode proposal) {
        AuthoringJob job = owned(owner, id);
        if (!"DRAFT".equals(job.getStatus())) throw new IllegalArgumentException("Saved jobs cannot be edited.");
        JsonNode preview = validate(job, proposal);
        job.setProposal(proposal.toString());
        jobs.save(job);
        return new Review(view(job), preview);
    }

    /** One transaction + a row lock makes retries idempotent and batch writes all-or-nothing. */
    @Transactional
    public JobView save(String owner, String id) {
        AuthoringJob job = owned(owner, id);
        if ("SAVED".equals(job.getStatus())) return view(job);
        JsonNode proposal = parse(job.getProposal());
        validate(job, proposal); // Recheck duplicates/order against current catalog at approval time.
        Object result;
        if (job.getKind() == Kind.TOPICS) {
            List<Object> created = new ArrayList<>();
            for (JsonNode node : proposal.path("topics")) created.add(topics.create(convert(node, TopicRequest.class)));
            result = created;
        } else {
            AnimationSceneRequest scene = convert(proposal, AnimationSceneRequest.class);
            scene.setIsPublished(false);
            result = scenes.create(scene);
        }
        job.setResult(mapper.valueToTree(result).toString());
        job.setStatus("SAVED");
        job.setSavedAt(Instant.now());
        jobs.save(job);
        log.info("[AI-AUTHORING] Approved and saved job={} owner={} kind={}", id, owner, job.getKind());
        return view(job);
    }

    JsonNode validate(AuthoringJob job, JsonNode proposal) {
        if (!proposal.isObject() || proposal.toString().length() > 65536) {
            throw new IllegalArgumentException("Proposal must be a JSON object under 64 KB.");
        }
        if (job.getKind() == Kind.TOPICS) {
            fields(proposal, Set.of("topics"));
            JsonNode list = proposal.path("topics");
            if (!list.isArray() || list.isEmpty() || list.size() > 12) {
                throw new IllegalArgumentException("Provide between 1 and 12 topics.");
            }
            courses.findById(job.getCourseId());
            Set<String> names = new HashSet<>();
            Set<Long> orders = new HashSet<>();
            topics.findByCourseId(job.getCourseId()).forEach(t -> {
                names.add(t.getName().trim().toLowerCase(Locale.ROOT));
                orders.add(t.getTopicOrder());
            });
            long previous = orders.stream().filter(Objects::nonNull).max(Long::compare).orElse(0L);
            for (JsonNode node : list) {
                fields(node, Set.of("name", "time", "topicOrder", "level", "courseId"));
                if (!node.path("topicOrder").isIntegralNumber()) throw new IllegalArgumentException("Topic order must be an integer.");
                TopicRequest topic = convert(node, TopicRequest.class);
                beanValid(topic);
                if (!Objects.equals(job.getCourseId(), topic.getCourseId())) throw new IllegalArgumentException("Topic course cannot be changed.");
                if (topic.getName().length() > 200 || !topic.getName().equals(topic.getName().trim())) {
                    throw new IllegalArgumentException("Topic names must be trimmed and at most 200 characters.");
                }
                if (!names.add(topic.getName().toLowerCase(Locale.ROOT))) throw new IllegalArgumentException("Duplicate topic: " + topic.getName());
                if (topic.getTime().toSecondOfDay() == 0) throw new IllegalArgumentException("Topic duration must be positive.");
                if (topic.getTopicOrder() <= previous) throw new IllegalArgumentException("Topic orders must increase after existing topics (last order " + previous + ").");
                previous = topic.getTopicOrder();
            }
            return mapper.nullNode();
        }
        fields(proposal, Set.of("slug", "title", "description", "category", "source", "kind", "simulatorParams", "isPublished"));
        AnimationSceneRequest scene = convert(proposal, AnimationSceneRequest.class);
        beanValid(scene);
        if (scene.getSource() != Source.GENERATED || Boolean.TRUE.equals(scene.getIsPublished())) {
            throw new IllegalArgumentException("AI animations must be GENERATED and unpublished.");
        }
        if (scene.getTitle().length() > 200) throw new IllegalArgumentException("Title must be at most 200 characters.");
        var simulator = scenes.simulatorCatalog().stream().filter(s -> Objects.equals(s.get("kind"), scene.getKind()))
                .findFirst().orElseThrow(() -> new IllegalArgumentException("Choose a supported simulator kind."));
        if (scene.getCategory() == null || !scene.getCategory().name().equals(simulator.get("category"))) {
            throw new IllegalArgumentException("Category must match the simulator catalog.");
        }
        validateParams(scene.getSimulatorParams(), simulator.get("paramSchema"));
        if (scenes.findAll(null).stream().anyMatch(s -> s.getSlug().equals(scene.getSlug()))) {
            throw new IllegalArgumentException("Animation slug already exists. Choose a different slug.");
        }
        return mapper.valueToTree(scenes.validate(scene));
    }

    private void validateParams(Map<String, Object> params, Object schemaObject) {
        if (params == null) return;
        JsonNode schema = mapper.valueToTree(schemaObject);
        params.forEach((key, value) -> {
            JsonNode spec = schema.path(key);
            if (spec.isMissingNode()) throw new IllegalArgumentException("Unsupported simulator parameter: " + key);
            String type = spec.path("type").asText();
            if ((("number".equals(type) || "integer".equals(type)) && !(value instanceof Number))
                    || ("integer".equals(type) && value instanceof Number n && n.doubleValue() != Math.rint(n.doubleValue()))
                    || ("string".equals(type) && !(value instanceof String))
                    || ("boolean".equals(type) && !(value instanceof Boolean))) {
                throw new IllegalArgumentException("Incorrect type for simulator parameter: " + key);
            }
            if (value instanceof Number n && (!Double.isFinite(n.doubleValue()) || Math.abs(n.doubleValue()) > 1000)) {
                throw new IllegalArgumentException("Numeric simulator inputs must be between -1000 and 1000.");
            }
            if (value instanceof Number n && ((spec.has("min") && n.doubleValue() < spec.path("min").asDouble())
                    || (spec.has("max") && n.doubleValue() > spec.path("max").asDouble()))) {
                throw new IllegalArgumentException("Simulator parameter outside catalog bounds: " + key);
            }
            if (value instanceof String s && (s.length() > 200 || s.split(",", -1).length > 12)) {
                throw new IllegalArgumentException("Use small simulator examples (max 200 characters / 12 values).");
            }
            if (!(value instanceof String || value instanceof Number || value instanceof Boolean)) {
                throw new IllegalArgumentException("Simulator inputs must be scalar values.");
            }
        });
    }

    private void fields(JsonNode node, Set<String> allowed) {
        if (!node.isObject()) throw new IllegalArgumentException("Each proposal item must be an object.");
        node.fieldNames().forEachRemaining(key -> {
            if (!allowed.contains(key)) throw new IllegalArgumentException("Unsupported proposal field: " + key);
        });
    }
    private void beanValid(Object object) {
        var errors = validator.validate(object);
        if (!errors.isEmpty()) throw new IllegalArgumentException(errors.iterator().next().getPropertyPath() + ": " + errors.iterator().next().getMessage());
    }
    private <T> T convert(JsonNode node, Class<T> type) {
        try { return mapper.treeToValue(node, type); }
        catch (JsonProcessingException | IllegalArgumentException ex) { throw new IllegalArgumentException("Invalid " + type.getSimpleName() + " fields. Check types, enums and time format."); }
    }
    private JsonNode parse(String json) {
        try { return mapper.readTree(json); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("Stored authoring data is invalid."); }
    }
    private AuthoringJob owned(String owner, String id) {
        return jobs.lockOwned(id, owner).orElseThrow(() -> new EntityNotFoundException("Authoring job not found."));
    }
    private JobView view(AuthoringJob job) {
        return new JobView(job.getId(), job.getKind(), job.getCourseId(), job.getPrompt(), parse(job.getProposal()),
                job.getStatus(), job.getResult() == null ? null : parse(job.getResult()), job.getCreatedAt());
    }
}
