package com.unlearnarc.algoviz.spec;

import com.unlearnarc.algoviz.entity.Algorithm.Visualizer;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Semantic validation that bean-validation annotations cannot express:
 *  - spec.visualizer must match the algorithm's declared visualizer
 *  - every step must carry non-empty state
 *  - the state key required by the renderer must be present
 *  - CHOICE inputs must have options; branch targets must resolve to real step ids
 *  - highlighted lines must reference a provided source language
 */
@Component
public class AlgorithmSpecValidator {

    public void validate(VisualizationSpec spec,
                         Visualizer declaredVisualizer,
                         boolean hasJava,
                         boolean hasPython) {
        if (spec == null) {
            throw new SpecValidationException("spec is required");
        }
        if (spec.getVisualizer() == null) {
            throw new SpecValidationException("spec.visualizer is required");
        }
        if (declaredVisualizer != null && spec.getVisualizer() != declaredVisualizer) {
            throw new SpecValidationException(
                "spec.visualizer (" + spec.getVisualizer() +
                ") must match algorithm.visualizer (" + declaredVisualizer + ")");
        }
        List<Step> steps = spec.getSteps();
        if (CollectionUtils.isEmpty(steps)) {
            throw new SpecValidationException("spec.steps must contain at least one step");
        }

        String requiredKey = requiredStateKey(spec.getVisualizer());
        Set<String> stepIds = collectStepIds(steps);

        for (int i = 0; i < steps.size(); i++) {
            Step step = steps.get(i);
            String where = "step[" + i + "]" + (step.getId() != null ? " (id=" + step.getId() + ")" : "");

            if (CollectionUtils.isEmpty(step.getState())) {
                throw new SpecValidationException(where + ": state must not be empty");
            }
            if (requiredKey != null && !step.getState().containsKey(requiredKey)) {
                throw new SpecValidationException(
                    where + ": state must contain key '" + requiredKey +
                    "' for visualizer " + spec.getVisualizer());
            }

            validateLine(step, where, hasJava, hasPython);
            validateInput(step, where, stepIds);
        }
    }

    private void validateLine(Step step, String where, boolean hasJava, boolean hasPython) {
        if (step.getLine() == null) return;
        if (step.getLine() < 1) {
            throw new SpecValidationException(where + ": line must be >= 1");
        }
        String lang = step.getLang() == null ? "java" : step.getLang().toLowerCase();
        boolean ok = switch (lang) {
            case "java" -> hasJava;
            case "python" -> hasPython;
            default -> false;
        };
        if (!ok) {
            throw new SpecValidationException(
                where + ": line references '" + lang + "' source which was not provided");
        }
    }

    private void validateInput(Step step, String where, Set<String> stepIds) {
        UserInputRequest input = step.getInput();
        if (input == null) return;

        if (input.getType() == UserInputRequest.InputType.CHOICE
                && CollectionUtils.isEmpty(input.getOptions())) {
            throw new SpecValidationException(where + ": CHOICE input requires options");
        }
        if (input.getOptions() != null) {
            for (UserInputRequest.Option opt : input.getOptions()) {
                String target = opt.getNextStepId();
                if (target != null && !stepIds.contains(target)) {
                    throw new SpecValidationException(
                        where + ": option '" + opt.getLabel() +
                        "' branches to unknown step id '" + target + "'");
                }
            }
        }
    }

    private Set<String> collectStepIds(List<Step> steps) {
        Set<String> ids = new HashSet<>();
        for (Step s : steps) {
            if (s.getId() != null && !ids.add(s.getId())) {
                throw new SpecValidationException("duplicate step id: " + s.getId());
            }
        }
        return ids;
    }

    /** The primary state key each renderer needs; null = no hard requirement. */
    private String requiredStateKey(Visualizer v) {
        return switch (v) {
            case ARRAY -> "array";
            case MATRIX -> "matrix";
            case STACK -> "stack";
            case QUEUE -> "queue";
            case GRAPH, TREE -> "nodes";
            case LINKED_LIST -> "nodes";
            case CUSTOM -> null;
        };
    }
}
