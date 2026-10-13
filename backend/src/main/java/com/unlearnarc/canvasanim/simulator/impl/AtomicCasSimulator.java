package com.unlearnarc.canvasanim.simulator.impl;

import com.unlearnarc.canvasanim.simulator.SceneSimulator;
import com.unlearnarc.canvasanim.simulator.TraceBuilder;
import com.unlearnarc.canvasanim.spec.AnimationNotes;
import com.unlearnarc.canvasanim.spec.AnimationTheme;
import com.unlearnarc.canvasanim.spec.AnimationTrace;
import com.unlearnarc.canvasanim.spec.Checkpoint;
import com.unlearnarc.canvasanim.spec.ConnectionState;
import com.unlearnarc.canvasanim.spec.EntityState;
import com.unlearnarc.canvasanim.spec.EntityStatus;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Generates a Compare-And-Swap (CAS) contention trace: N threads race to
 * increment a shared counter with a lock-free CAS loop. One wins per round; the
 * losers observe a stale read, their CAS fails, and they retry.
 *
 * Params:
 *   - threads (int, 2..5, default 3): number of contending threads.
 *
 * Registered automatically via Spring DI — see {@code SceneSimulatorRegistry}.
 */
@Component
public class AtomicCasSimulator implements SceneSimulator {

    private static final double W = 720;
    private static final double H = 440;
    private static final double THREAD_Y = 320;
    private static final double THREAD_R = 30;
    private static final double CELL_X = W / 2 - 70;
    private static final double CELL_Y = 40;
    private static final double CELL_W = 140;
    private static final double CELL_H = 70;

    private static final String[] PALETTE =
            {"#6366F1", "#0EA5E9", "#EC4899", "#22C55E", "#F97316"};

    @Override
    public String kind() {
        return "atomic-cas";
    }

    @Override
    public String displayName() {
        return "Atomic Compare-And-Swap (CAS)";
    }

    @Override
    public String category() {
        return "CONCURRENCY";
    }

    @Override
    public String description() {
        return "N threads race to increment a shared counter with a lock-free CAS loop.";
    }

    @Override
    public Map<String, Object> paramSchema() {
        return Map.of("threads", Map.of(
                "type", "integer", "min", 2, "max", 5, "default", 3,
                "label", "Number of contending threads"));
    }

    @Override
    public AnimationTrace generate(Map<String, Object> params) {
        int threads = readInt(params, "threads", 3, 2, 5);

        AnimationTheme theme = new AnimationTheme();
        theme.setBackground("#0F172A");
        theme.setStatusColors(Map.of(
                "IDLE", "#475569",
                "ACTIVE", "#2563EB",
                "LOCKED", "#F59E0B",
                "SUCCESS", "#16A34A",
                "FAILED", "#DC2626",
                "RETRY", "#D97706"));

        TraceBuilder b = new TraceBuilder(
                "atomic-cas", displayName(),
                threads + " threads race to increment a shared counter using a lock-free CAS loop.",
                W, H, theme)
                .category("CONCURRENCY");

        AnimationNotes notes = new AnimationNotes();
        notes.setSummary("Compare-And-Swap (CAS) atomically writes a new value only if the "
                + "current value still equals an expected value — the foundation of lock-free code.");
        notes.setWhereToUse(List.of(
                "Lock-free counters, stacks and queues under high contention.",
                "Implementing atomics (AtomicInteger.compareAndSet, std::atomic).",
                "Optimistic concurrency control (version checks before writes)."));
        notes.setKeyPoints(List.of(
                "Only one thread wins per round; the rest observe a stale value and retry.",
                "CAS avoids locks but can livelock/spin under extreme contention.",
                "The ABA problem can make a changed value look unchanged — guard with tags/versions."));
        b.notes(notes);

        // thread lane x positions, evenly distributed
        List<String> threadIds = new ArrayList<>();
        double gap = W / (threads + 1);
        for (int i = 0; i < threads; i++) {
            String id = "T" + (i + 1);
            threadIds.add(id);
            EntityState t = new EntityState();
            t.setId(id);
            t.setShape("circle");
            t.setX(gap * (i + 1));
            t.setY(THREAD_Y);
            t.setRadius(THREAD_R);
            t.setColor(PALETTE[i % PALETTE.length]);
            t.setLabel(id);
            t.setSublabel("idle");
            t.setStatus(EntityStatus.IDLE);
            b.set(id, t);
        }

        int value = 0;
        EntityState cell = new EntityState();
        cell.setId("cell");
        cell.setShape("rect");
        cell.setX(CELL_X);
        cell.setY(CELL_Y);
        cell.setWidth(CELL_W);
        cell.setHeight(CELL_H);
        cell.setColor("#1E293B");
        cell.setLabel("counter");
        cell.setSublabel(String.valueOf(value));
        cell.setStatus(EntityStatus.IDLE);
        b.set("cell", cell);

        b.vars(orderedVars(value, 0, 0))
                .step("Setup", "A shared counter starts at 0; each thread will try to increment it.")
                .say("Shared counter = 0. " + threads + " threads will each CAS-increment it.")
                .commit(700);

        boolean askedCheckpoint = false;

        int retries = 0;
        int successes = 0;
        List<String> remaining = new ArrayList<>(threadIds);

        while (!remaining.isEmpty()) {
            final int expected = value;

            // 1) read phase
            for (String id : remaining) {
                b.set(id, patch(EntityStatus.ACTIVE, "read " + expected, null));
                ConnectionState c = new ConnectionState();
                c.setId("read-" + id);
                c.setFrom(id);
                c.setTo("cell");
                c.setDashed(true);
                c.setOpacity(0.5);
                c.setProgress(0.0);
                b.link(c);
            }
            b.say("Each thread reads expected = " + expected + ".").commit(250);
            for (String id : remaining) {
                ConnectionState c = new ConnectionState();
                c.setId("read-" + id);
                c.setFrom(id);
                c.setTo("cell");
                c.setDashed(true);
                c.setOpacity(0.5);
                c.setProgress(1.0);
                b.link(c);
            }
            b.commit(450);
            for (String id : remaining) b.unlink("read-" + id);

            // mid-animation question on the first contended round
            if (!askedCheckpoint && expected == 0 && remaining.size() > 1) {
                askedCheckpoint = true;
                Checkpoint cp = new Checkpoint();
                cp.setKind("single");
                cp.setPrompt("All " + remaining.size() + " threads read expected = 0. "
                        + "When they CAS concurrently, how many can succeed?");
                List<Checkpoint.Option> opts = new ArrayList<>();
                opts.add(option("all", "All " + remaining.size()));
                opts.add(option("one", "Exactly one"));
                opts.add(option("none", "None"));
                cp.setOptions(opts);
                cp.setAnswer("one");
                cp.setExplanation("CAS is atomic: only the first thread matches expected=0. "
                        + "Once it writes 1, the others' expected no longer matches, so they fail and retry.");
                cp.setHint("CAS only succeeds if the current value still equals the expected value.");
                cp.setBlocking(true);
                b.checkpoint(cp);
            }

            // 2) winner CAS
            String winner = remaining.get(0);
            List<String> losers = new ArrayList<>(remaining.subList(1, remaining.size()));

            b.set("cell", patch(EntityStatus.LOCKED, null, "#78350F"))
                    .set(winner, patch(EntityStatus.LOCKED,
                            "CAS(" + expected + "\u2192" + (expected + 1) + ")", null))
                    .step(winner + " attempts CAS",
                            winner + " tries CAS(expected=" + expected + ", new=" + (expected + 1) + ").")
                    .say(winner + " performs CAS(expected=" + expected + ", new=" + (expected + 1) + ").")
                    .commit(600);

            value = expected + 1;
            successes++;
            b.set("cell", patch(EntityStatus.SUCCESS, String.valueOf(value), "#14532D"))
                    .set(winner, patch(EntityStatus.SUCCESS, "committed \u2713", null))
                    .vars(orderedVars(value, successes, retries))
                    .say(winner + " succeeds! counter is now " + value + ".")
                    .commit(650);

            EntityState done = patch(EntityStatus.DONE, "done", "#14532D");
            done.setOpacity(0.55);
            b.set(winner, done);

            // 3) losers fail + retry
            if (!losers.isEmpty()) {
                for (String id : losers) {
                    b.set(id, patch(EntityStatus.FAILED,
                            "CAS fails (saw " + value + "\u2260" + expected + ")", null));
                }
                b.set("cell", patch(EntityStatus.IDLE, null, "#1E293B"))
                        .say(String.join(", ", losers) + " find the value changed ("
                                + value + " \u2260 " + expected + ") \u2014 CAS fails.")
                        .commit(650);

                retries += losers.size();
                for (String id : losers) {
                    b.set(id, patch(EntityStatus.RETRY, "retrying\u2026", null));
                }
                b.vars(orderedVars(value, successes, retries))
                        .say(String.join(", ", losers) + " back off and retry the CAS loop.")
                        .commit(550);
            } else {
                b.set("cell", patch(EntityStatus.IDLE, null, "#1E293B"));
            }

            remaining = losers;
        }

        b.set("cell", patch(EntityStatus.SUCCESS, String.valueOf(value), "#14532D"))
                .step("All done", "Every thread eventually succeeded. Final counter = " + value + ".")
                .say("All threads succeeded. Final counter = " + value
                        + ", after " + retries + " retries.")
                .commit(900);

        return b.build();
    }

    // ── helpers ─────────────────────────────────────────────────────────────
    private static EntityState patch(EntityStatus status, String sublabel, String color) {
        EntityState e = new EntityState();
        e.setStatus(status);
        if (sublabel != null) e.setSublabel(sublabel);
        if (color != null) e.setColor(color);
        return e;
    }

    private static Checkpoint.Option option(String id, String label) {
        Checkpoint.Option o = new Checkpoint.Option();
        o.setId(id);
        o.setLabel(label);
        return o;
    }

    private static Map<String, Object> orderedVars(int counter, int successes, int retries) {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("counter", counter);
        v.put("successes", successes);
        v.put("retries", retries);
        return v;
    }

    private static int readInt(Map<String, Object> params, String key,
                               int def, int min, int max) {
        if (params == null) return def;
        Object raw = params.get(key);
        if (raw == null) return def;
        int v;
        try {
            v = raw instanceof Number n ? n.intValue() : Integer.parseInt(raw.toString());
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Param '" + key + "' must be an integer");
        }
        if (v < min || v > max) {
            throw new IllegalArgumentException(
                    "Param '" + key + "' must be between " + min + " and " + max);
        }
        return v;
    }
}
