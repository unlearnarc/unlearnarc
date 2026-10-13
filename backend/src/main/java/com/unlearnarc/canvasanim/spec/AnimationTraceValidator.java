package com.unlearnarc.canvasanim.spec;

import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.util.Map;

/**
 * Semantic validation beyond bean-validation annotations:
 *  - keyframes must be sorted ascending by time
 *  - connections must reference entities that exist in the SAME keyframe
 *  - duration must be >= the last keyframe's time
 */
@Component
public class AnimationTraceValidator {

    public void validate(AnimationTrace trace) {
        if (trace == null) {
            throw new TraceValidationException("trace is required");
        }
        if (CollectionUtils.isEmpty(trace.getKeyframes())) {
            throw new TraceValidationException("trace.keyframes must contain at least one keyframe");
        }
        if (trace.getViewport() == null
                || trace.getViewport().getWidth() == null
                || trace.getViewport().getHeight() == null) {
            throw new TraceValidationException("trace.viewport.width/height are required");
        }

        double prev = -1;
        double last = 0;
        for (int i = 0; i < trace.getKeyframes().size(); i++) {
            Keyframe k = trace.getKeyframes().get(i);
            String where = "keyframe[" + i + "]";

            if (k.getTime() == null) {
                throw new TraceValidationException(where + ": time is required");
            }
            if (k.getTime() < prev) {
                throw new TraceValidationException(
                        where + ": keyframes must be sorted ascending by time (" +
                        k.getTime() + " < " + prev + ")");
            }
            prev = k.getTime();
            last = k.getTime();

            if (CollectionUtils.isEmpty(k.getEntities())) {
                throw new TraceValidationException(where + ": entities must not be empty");
            }
            for (Map.Entry<String, EntityState> e : k.getEntities().entrySet()) {
                if (e.getValue() == null || e.getValue().getId() == null) {
                    throw new TraceValidationException(
                            where + ": entity '" + e.getKey() + "' is missing its id");
                }
            }
            if (!CollectionUtils.isEmpty(k.getConnections())) {
                for (ConnectionState c : k.getConnections().values()) {
                    if (!k.getEntities().containsKey(c.getFrom())
                            || !k.getEntities().containsKey(c.getTo())) {
                        throw new TraceValidationException(
                                where + ": connection '" + c.getId() +
                                "' references an entity not present in this keyframe");
                    }
                }
            }
        }
        if (trace.getDuration() == null || trace.getDuration() < last) {
            throw new TraceValidationException(
                    "trace.duration (" + trace.getDuration() +
                    ") must be >= last keyframe time (" + last + ")");
        }

        validateInstructions(trace);
        validateCheckpoints(trace);
        validatePrograms(trace);
    }

    private void validatePrograms(AnimationTrace trace) {
        if (CollectionUtils.isEmpty(trace.getPrograms())) return;
        for (CodeProgram p : trace.getPrograms()) {
            if (p.getId() == null || p.getLabel() == null
                    || p.getLanguage() == null || p.getSource() == null) {
                throw new TraceValidationException(
                        "code program requires id, label, language and source");
            }
            if (!CollectionUtils.isEmpty(p.getHighlights())) {
                for (CodeProgram.CodeHighlight h : p.getHighlights()) {
                    if (h.getTime() == null || h.getTime() < 0 || h.getTime() > trace.getDuration()) {
                        throw new TraceValidationException(
                                "program '" + p.getId() + "' highlight time must be within [0, duration]");
                    }
                    if (CollectionUtils.isEmpty(h.getLines())) {
                        throw new TraceValidationException(
                                "program '" + p.getId() + "' highlight requires at least one line");
                    }
                }
            }
        }
    }

    private void validateInstructions(AnimationTrace trace) {
        if (CollectionUtils.isEmpty(trace.getInstructions())) return;
        for (InstructionStep s : trace.getInstructions()) {
            if (s.getId() == null || s.getTitle() == null) {
                throw new TraceValidationException("instruction step requires id and title");
            }
            if (s.getTime() == null || s.getTime() < 0 || s.getTime() > trace.getDuration()) {
                throw new TraceValidationException(
                        "instruction '" + s.getId() + "' time must be within [0, duration]");
            }
        }
    }

    private void validateCheckpoints(AnimationTrace trace) {
        if (CollectionUtils.isEmpty(trace.getCheckpoints())) return;
        for (Checkpoint c : trace.getCheckpoints()) {
            if (c.getId() == null || c.getPrompt() == null || c.getKind() == null) {
                throw new TraceValidationException("checkpoint requires id, kind and prompt");
            }
            if (c.getTime() == null || c.getTime() < 0 || c.getTime() > trace.getDuration()) {
                throw new TraceValidationException(
                        "checkpoint '" + c.getId() + "' time must be within [0, duration]");
            }
            if (c.getAnswer() == null) {
                throw new TraceValidationException(
                        "checkpoint '" + c.getId() + "' requires an answer");
            }
            boolean optionBased = "single".equals(c.getKind()) || "multiple".equals(c.getKind());
            if (optionBased && CollectionUtils.isEmpty(c.getOptions())) {
                throw new TraceValidationException(
                        "checkpoint '" + c.getId() + "' (" + c.getKind() + ") requires options");
            }
        }
    }
}
