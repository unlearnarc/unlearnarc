package com.unlearnarc.dailyquiz;

import com.fasterxml.jackson.databind.*;
import com.unlearnarc.dailyquiz.DailyQuizRules.*;
import com.unlearnarc.quspool.entity.*;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.*;

/** Learner-scoped, batched data adapter. Aggregate scores never become fabricated question outcomes. */
@Service @RequiredArgsConstructor @Slf4j
public class DailyLearningProfile {
    private final EntityManager em;
    private final ObjectMapper json;
    private final DailyQuizRules rules;
    private final Clock clock;
    public record TopicInfo(String id, String name, String course, Instant learned) {}
    public record Profile(Map<String,TopicInfo> topics, Map<String,Evidence> evidence,
        Set<String> learned, List<Candidate> candidates, Map<String,Question> questions, List<String> notices) {}

    public Profile load(String user, LocalDate date, ZoneId zone) {
        List<String> notices = new ArrayList<>();
        // Only results linked to this student; EXISTS prevents duplicate join rows inflating evidence.
        List<TestResult> results = em.createQuery("select r from TestResult r where exists (select a.id from UserTestAttempt a where a.testId=r.id and a.userId=:u) order by r.createdAt desc, r.id",TestResult.class)
            .setParameter("u",user).setMaxResults(1000).getResultList();
        List<Event> events = new ArrayList<>(); Set<String> historicalTopics = new HashSet<>();
        Map<String,Instant> exposures = new HashMap<>();
        Set<String> questionIds = new HashSet<>();
        Map<String,List<JsonNode>> snapshots = new LinkedHashMap<>();
        Set<String> historicalCourses = new HashSet<>();
        for (TestResult r : results) {
            if (r.getCreatedAt()==null || r.getCreatedAt().isAfter(clock.instant())) continue;
            if (r.getEntityType()==QuestionPool.ScopeType.TOPIC && r.getEntityId()!=null) historicalTopics.add(r.getEntityId());
            if (r.getEntityType()==QuestionPool.ScopeType.COURSE && r.getEntityId()!=null) historicalCourses.add(r.getEntityId());
            try {
                JsonNode rows = r.getAnswerSnapshot()==null ? json.createArrayNode() : json.readTree(r.getAnswerSnapshot());
                if (!rows.isArray()) continue;
                List<JsonNode> valid = new ArrayList<>();
                for (JsonNode row: rows) {
                    String id = row.path("questionId").asText("");
                    if (id.isBlank()) continue;
                    questionIds.add(id); valid.add(row);
                    exposures.merge(id,r.getCreatedAt(),(a,b)->a.isAfter(b)?a:b);
                }
                snapshots.put(r.getId(),valid);
            } catch (Exception ignored) { log.warn("[DAILY] Ignored malformed historical snapshot"); notices.add("Some historical assessment evidence could not be used."); }
        }
        // Resolve topic only for pools with exactly one topic mapping. Shared ambiguous mappings are not mastery evidence.
        Map<String,String> questionTopics = new HashMap<>();
        if (!questionIds.isEmpty()) {
            List<Object[]> mappings = em.createQuery("select q.id,m.topicId from Question q,TopicPoolMapping m where q.poolId=m.poolId and q.id in :ids",Object[].class).setParameter("ids",questionIds).getResultList();
            Map<String,Set<String>> grouped = new HashMap<>();
            mappings.forEach(m->grouped.computeIfAbsent((String)m[0],k->new HashSet<>()).add((String)m[1]));
            grouped.forEach((q,ts)->{if(ts.size()==1) questionTopics.put(q,ts.iterator().next());});
        }
        Map<String,TestResult> byId = new HashMap<>(); results.forEach(r->byId.put(r.getId(),r));
        snapshots.forEach((result,rows)->{
            Set<String> seen = new HashSet<>();
            for(JsonNode row:rows) {
                String q=row.path("questionId").asText(); String topic=questionTopics.get(q);
                if(topic==null || !seen.add(q) || !row.path("selectedAnswerIds").isArray() || row.path("selectedAnswerIds").isEmpty() || !row.path("isCorrect").isBoolean()) continue;
                Question.Difficulty d=null; try {d=Question.Difficulty.valueOf(row.path("difficulty").asText());}catch(Exception ignored){}
                events.add(new Event(result+":"+q,result,q,topic,d,row.path("isCorrect").asBoolean(),byId.get(result).getCreatedAt())); historicalTopics.add(topic);
            }
        });
        List<DailyItem> daily = em.createQuery("select i from DailyItem i where i.userId=:u order by i.exposedAt desc,i.id",DailyItem.class).setParameter("u",user).setMaxResults(10000).getResultList();
        for(DailyItem i:daily) {
            if(i.getExposedAt()==null || i.getExposedAt().isAfter(clock.instant())) continue;
            exposures.merge(i.getQuestionId(),i.getExposedAt(),(a,b)->a.isAfter(b)?a:b);
            if(i.getTopicId()!=null && i.getAnsweredAt()!=null && i.getCorrect()!=null) {
                events.add(new Event(i.getId(),i.getSessionId(),i.getQuestionId(),i.getTopicId(),Question.Difficulty.valueOf(i.getDifficulty()),i.getCorrect(),i.getAnsweredAt())); historicalTopics.add(i.getTopicId());
            }
        }
        Map<String,Instant> learned = new HashMap<>();
        List<Object[]> completions = em.createQuery("select t.topicKey,t.completedAt from StudyTask t where t.plan.user.id=:u and t.completedAt is not null",Object[].class).setParameter("u",user).getResultList();
        completions.stream().filter(row -> row[0] != null && !((Instant)row[1]).isAfter(clock.instant()))
            .forEach(row->learned.merge((String)row[0],(Instant)row[1],(a,b)->a.isAfter(b)?a:b));
        // Topic-scope aggregate results establish studied scope, but not correctness or mastery.
        for(TestResult r:results) if(r.getEntityType()==QuestionPool.ScopeType.TOPIC && r.getEntityId()!=null && r.getCreatedAt()!=null && !r.getCreatedAt().isAfter(clock.instant()))
            learned.merge(r.getEntityId(),r.getCreatedAt(),(a,b)->a.isAfter(b)?a:b);
        List<Object[]> scope = em.createQuery("""
            select t.id,t.name,t.courseId from Topic t where
            exists (select e.id from EnrolledCourse e where e.userId=:u and e.courseId=t.courseId)
            or t.id in :history or t.id in :learned or t.courseId in :historyCourses
            or (not exists (select e.id from EnrolledCourse e where e.userId=:u)
                and exists (select m.id from TopicPoolMapping m,DailyPoolPolicy p where m.topicId=t.id and m.poolId=p.poolId and p.generalDiagnostic=true))
            """,Object[].class).setParameter("u",user).setParameter("history",historicalTopics.isEmpty()?Set.of(""):historicalTopics)
            .setParameter("historyCourses",historicalCourses.isEmpty()?Set.of(""):historicalCourses)
            .setParameter("learned",learned.isEmpty()?Set.of(""):learned.keySet()).getResultList();
        Map<String,TopicInfo> topics = new HashMap<>();
        scope.forEach(t->topics.put((String)t[0],new TopicInfo((String)t[0],(String)t[1],(String)t[2],learned.get((String)t[0]))));
        Map<String,Evidence> evidence = new HashMap<>();
        topics.forEach((id,t)->evidence.put(id,rules.evidence(id,events,t.learned(),date,zone)));
        List<Object[]> eligible = topics.isEmpty()?List.of():em.createQuery("""
            select q,m.topicId from Question q,QuestionPool p,TopicPoolMapping m,Topic t,Course course where
            q.poolId=p.id and m.poolId=p.id and m.topicId=t.id and t.courseId=course.id and m.topicId in :ts
            and p.isActive=true and q.isActive=true and q.difficulty is not null
            and (m.topicId in :studied or exists (select policy.poolId from DailyPoolPolicy policy where policy.poolId=p.id and (policy.generalDiagnostic=true or policy.introductory=true)))
            and not exists (select m2.id from TopicPoolMapping m2 where m2.poolId=m.poolId and m2.topicId<>m.topicId)
            order by q.id
            """,Object[].class).setParameter("ts",topics.keySet())
            .setParameter("studied",learned.isEmpty()&&historicalTopics.isEmpty()?Set.of(""):union(learned.keySet(),historicalTopics))
            .setMaxResults(5000).getResultList();
        Map<String,Question> questions=new LinkedHashMap<>(); List<Candidate> candidates=new ArrayList<>();
        for(Object[] row:eligible) {Question q=(Question)row[0]; if(questions.putIfAbsent(q.getId(),q)==null) candidates.add(new Candidate(q.getId(),(String)row[1],q.getDifficulty(),exposures.get(q.getId())));}
        if(results.size()==1000 || daily.size()==10000 || eligible.size()==5000) notices.add("Personalization uses a bounded recent history and eligible question window.");
        return new Profile(topics,evidence,learned.keySet(),candidates,questions,notices);
    }
    private Set<String> union(Set<String> a,Set<String>b){Set<String> s=new HashSet<>(a);s.addAll(b);return s;}
}
