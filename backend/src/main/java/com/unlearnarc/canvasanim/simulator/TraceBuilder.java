package com.unlearnarc.canvasanim.simulator;

import com.unlearnarc.canvasanim.spec.AnimationNotes;
import com.unlearnarc.canvasanim.spec.AnimationTheme;
import com.unlearnarc.canvasanim.spec.AnimationTrace;
import com.unlearnarc.canvasanim.spec.Checkpoint;
import com.unlearnarc.canvasanim.spec.CodeProgram;
import com.unlearnarc.canvasanim.spec.ConnectionState;
import com.unlearnarc.canvasanim.spec.EntityState;
import com.unlearnarc.canvasanim.spec.InstructionStep;
import com.unlearnarc.canvasanim.spec.Keyframe;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Chainable authoring helper for simulators — the server-side mirror of the
 * frontend {@code TraceBuilder}. Describe the world mutably ("set T1 here, lock
 * the cell, hold 400ms") and emit a clean, time-sorted {@link AnimationTrace}.
 *
 * Keeping the builder API identical on both tiers means a scene can move from
 * client-generated to server-generated with zero renderer changes.
 */
public class TraceBuilder {

    private final String id;
    private final String title;
    private final String description;
    private final AnimationTrace.Viewport viewport;
    private final AnimationTheme theme;

    private final Map<String, EntityState> entities = new LinkedHashMap<>();
    private final Map<String, ConnectionState> connections = new LinkedHashMap<>();
    private final Map<String, Object> variables = new LinkedHashMap<>();
    private final List<Keyframe> keyframes = new ArrayList<>();
    private final List<InstructionStep> instructions = new ArrayList<>();
    private final List<Checkpoint> checkpoints = new ArrayList<>();
    private final List<CodeProgram> programs = new ArrayList<>();

    private String caption;
    private String category;
    private AnimationNotes notes;
    private double cursor = 0;

    public TraceBuilder(String id, String title, String description,
                        double width, double height, AnimationTheme theme) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.viewport = new AnimationTrace.Viewport();
        this.viewport.setWidth(width);
        this.viewport.setHeight(height);
        this.theme = theme;
    }

    public double now() {
        return cursor;
    }

    public TraceBuilder category(String category) {
        this.category = category;
        return this;
    }

    public TraceBuilder notes(AnimationNotes notes) {
        this.notes = notes;
        return this;
    }

    /** Attach a source-code program (LeetCode solution, SQL query, …) to the scene. */
    public TraceBuilder program(CodeProgram program) {
        programs.removeIf(p -> p.getId().equals(program.getId()));
        programs.add(program);
        return this;
    }

    /**
     * Highlight code line(s) of a program at the current cursor time. Chains
     * naturally with set/say/commit so code lights up in lock-step with motion.
     */
    public TraceBuilder highlightCode(String programId, List<Integer> lines, String note) {
        for (CodeProgram p : programs) {
            if (p.getId().equals(programId)) {
                if (p.getHighlights() == null) p.setHighlights(new ArrayList<>());
                CodeProgram.CodeHighlight h = new CodeProgram.CodeHighlight();
                h.setTime(cursor);
                h.setLines(lines);
                h.setNote(note);
                p.getHighlights().add(h);
                break;
            }
        }
        return this;
    }

    /** Add an instruction-rail step anchored at the current cursor time. */
    public TraceBuilder step(String title, String detail) {
        InstructionStep s = new InstructionStep();
        s.setId("step-" + (instructions.size() + 1));
        s.setTime(cursor);
        s.setTitle(title);
        s.setDetail(detail);
        instructions.add(s);
        return this;
    }

    /** Add a mid-animation checkpoint anchored at the current cursor time. */
    public TraceBuilder checkpoint(Checkpoint cp) {
        if (cp.getId() == null) cp.setId("cp-" + (checkpoints.size() + 1));
        if (cp.getTime() == null) cp.setTime(cursor);
        checkpoints.add(cp);
        return this;
    }

    /** Create or merge an entity's state (fields left null are preserved). */
    public TraceBuilder set(String entityId, EntityState patch) {
        EntityState prev = entities.get(entityId);
        EntityState merged = prev == null ? new EntityState() : copy(prev);
        merged.setId(entityId);
        mergeEntity(merged, patch);
        entities.put(entityId, merged);
        return this;
    }

    public TraceBuilder link(ConnectionState conn) {
        connections.put(conn.getId(), conn);
        return this;
    }

    public TraceBuilder unlink(String connId) {
        connections.remove(connId);
        return this;
    }

    public TraceBuilder vars(Map<String, Object> patch) {
        variables.putAll(patch);
        return this;
    }

    public TraceBuilder var(String key, Object value) {
        variables.put(key, value);
        return this;
    }

    public TraceBuilder say(String caption) {
        this.caption = caption;
        return this;
    }

    /** Commit the current world as a keyframe, then advance the cursor. */
    public TraceBuilder commit(double holdMs) {
        keyframes.add(snapshot(cursor));
        cursor += holdMs;
        return this;
    }

    public TraceBuilder wait(double ms) {
        cursor += ms;
        return this;
    }

    public AnimationTrace build() {
        if (keyframes.isEmpty()
                || keyframes.get(keyframes.size() - 1).getTime() < cursor) {
            keyframes.add(snapshot(cursor));
        }
        AnimationTrace trace = new AnimationTrace();
        trace.setId(id);
        trace.setTitle(title);
        trace.setDescription(description);
        trace.setViewport(viewport);
        trace.setTheme(theme);
        trace.setKeyframes(keyframes);
        trace.setDuration(keyframes.get(keyframes.size() - 1).getTime());
        trace.setCategory(category);
        if (!instructions.isEmpty()) trace.setInstructions(instructions);
        if (!checkpoints.isEmpty()) {
            checkpoints.sort(Comparator.comparingDouble(Checkpoint::getTime));
            trace.setCheckpoints(checkpoints);
        }
        trace.setNotes(notes);
        if (!programs.isEmpty()) {
            programs.forEach(p -> {
                if (p.getHighlights() != null) {
                    p.getHighlights().sort(
                            Comparator.comparingDouble(CodeProgram.CodeHighlight::getTime));
                }
            });
            trace.setPrograms(programs);
        }
        return trace;
    }

    // ── internals ─────────────────────────────────────────────────────────────
    private Keyframe snapshot(double time) {
        Keyframe k = new Keyframe();
        k.setTime(time);
        Map<String, EntityState> es = new LinkedHashMap<>();
        entities.forEach((id, e) -> es.put(id, copy(e)));
        k.setEntities(es);
        if (!connections.isEmpty()) {
            Map<String, ConnectionState> cs = new LinkedHashMap<>();
            connections.forEach((id, c) -> cs.put(id, copyConn(c)));
            k.setConnections(cs);
        }
        k.setVariables(new LinkedHashMap<>(variables));
        k.setCaption(caption);
        return k;
    }

    private static void mergeEntity(EntityState into, EntityState p) {
        if (p == null) return;
        if (p.getX() != null) into.setX(p.getX());
        if (p.getY() != null) into.setY(p.getY());
        if (p.getWidth() != null) into.setWidth(p.getWidth());
        if (p.getHeight() != null) into.setHeight(p.getHeight());
        if (p.getRadius() != null) into.setRadius(p.getRadius());
        if (p.getOpacity() != null) into.setOpacity(p.getOpacity());
        if (p.getScale() != null) into.setScale(p.getScale());
        if (p.getRotation() != null) into.setRotation(p.getRotation());
        if (p.getProgress() != null) into.setProgress(p.getProgress());
        if (p.getLabel() != null) into.setLabel(p.getLabel());
        if (p.getSublabel() != null) into.setSublabel(p.getSublabel());
        if (p.getColor() != null) into.setColor(p.getColor());
        if (p.getShape() != null) into.setShape(p.getShape());
        if (p.getStatus() != null) into.setStatus(p.getStatus());
        if (p.getVisible() != null) into.setVisible(p.getVisible());
        if (p.getMeta() != null) into.setMeta(p.getMeta());
    }

    private static EntityState copy(EntityState s) {
        EntityState c = new EntityState();
        c.setId(s.getId());
        mergeEntity(c, s);
        return c;
    }

    private static ConnectionState copyConn(ConnectionState s) {
        ConnectionState c = new ConnectionState();
        c.setId(s.getId());
        c.setFrom(s.getFrom());
        c.setTo(s.getTo());
        c.setColor(s.getColor());
        c.setProgress(s.getProgress());
        c.setOpacity(s.getOpacity());
        c.setLabel(s.getLabel());
        c.setDashed(s.getDashed());
        return c;
    }
}
