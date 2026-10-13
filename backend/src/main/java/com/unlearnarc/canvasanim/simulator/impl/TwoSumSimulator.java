package com.unlearnarc.canvasanim.simulator.impl;

import com.unlearnarc.canvasanim.simulator.SceneSimulator;
import com.unlearnarc.canvasanim.simulator.TraceBuilder;
import com.unlearnarc.canvasanim.spec.AnimationNotes;
import com.unlearnarc.canvasanim.spec.AnimationTheme;
import com.unlearnarc.canvasanim.spec.AnimationTrace;
import com.unlearnarc.canvasanim.spec.Checkpoint;
import com.unlearnarc.canvasanim.spec.CodeProgram;
import com.unlearnarc.canvasanim.spec.EntityState;
import com.unlearnarc.canvasanim.spec.EntityStatus;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Generates a "teach a program" trace for LeetCode #1 (Two Sum). Proves the
 * server-generated path can ALSO carry a source-code program whose lines are
 * highlighted in lock-step with the array animation — so a tutorial can teach a
 * coding problem (or an SQL query) end-to-end from one scene.
 *
 * <p>Params:
 *   {@code nums}   : comma-separated ints (default "2,7,11,15")
 *   {@code target} : integer (default 9)
 *
 * Adding this required only a new {@code @Component} — the registry auto-wires it.
 */
@Component
public class TwoSumSimulator implements SceneSimulator {

    private static final String PY = """
            def two_sum(nums, target):
                seen = {}                      # value -> index
                for i, x in enumerate(nums):
                    need = target - x
                    if need in seen:
                        return [seen[need], i]
                    seen[x] = i
                return []

            print(two_sum([2, 7, 11, 15], 9))""";

    @Override
    public String kind() {
        return "leetcode-two-sum";
    }

    @Override
    public String displayName() {
        return "LeetCode 1 — Two Sum (hash map)";
    }

    @Override
    public String category() {
        return "DSA";
    }

    @Override
    public String description() {
        return "Teaches Two Sum with a runnable program whose lines highlight in sync.";
    }

    @Override
    public Map<String, Object> paramSchema() {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("nums", Map.of("type", "string", "default", "2,7,11,15",
                "label", "Comma-separated numbers"));
        schema.put("target", Map.of("type", "number", "default", 9, "label", "Target sum"));
        return schema;
    }

    @Override
    public AnimationTrace generate(Map<String, Object> params) {
        int[] nums = parseNums(params);
        int target = parseTarget(params);

        AnimationTheme theme = new AnimationTheme();
        theme.setBackground("#0F172A");

        TraceBuilder b = new TraceBuilder(
                kind(), displayName(),
                "Scan once, remembering seen values so each complement is an O(1) lookup.",
                720, 300, theme)
                .category("DSA");

        AnimationNotes notes = new AnimationNotes();
        notes.setSummary("Two Sum returns indices of the two numbers adding to target. The "
                + "hash-map approach stores each value's index while scanning, making the "
                + "complement search O(1) — overall O(n) time, O(n) space.");
        notes.setWhereToUse(List.of(
                "Pair-sum / complement problems (3Sum builds on this).",
                "Any 'have I seen X before?' scan."));
        notes.setKeyPoints(List.of(
                "Check for the complement BEFORE inserting the current value.",
                "Brute force is O(n²); the hash map trades space for O(n) time."));
        b.notes(notes);

        // runnable program attached to the scene
        CodeProgram py = new CodeProgram();
        py.setId("py");
        py.setLabel("Two Sum — O(n)");
        py.setLanguage("python");
        py.setSource(PY);
        py.setRunnable(true);
        py.setExplanation("Hash-map solution — O(n) time, O(n) space. Runnable in the client sandbox.");
        b.program(py);

        // array cells
        double x0 = 90, gap = 110;
        for (int i = 0; i < nums.length; i++) {
            EntityState cell = new EntityState();
            cell.setId("c" + i);
            cell.setShape("arrayCell");
            cell.setX(x0 + i * gap);
            cell.setY(110.0);
            cell.setWidth(80.0);
            cell.setHeight(80.0);
            cell.setColor("#334155");
            cell.setLabel(String.valueOf(nums[i]));
            cell.setSublabel("i=" + i);
            cell.setStatus(EntityStatus.IDLE);
            b.set("c" + i, cell);
        }
        EntityState need = new EntityState();
        need.setId("need");
        need.setShape("text");
        need.setX(360.0);
        need.setY(230.0);
        need.setColor("#94A3B8");
        need.setLabel("target = " + target);
        b.set("need", need);

        b.step("Setup", "Scan left→right, remembering each value in a hash map.")
                .highlightCode("py", List.of(1, 2), "Initialise an empty map of value → index.")
                .say("Two Sum, target " + target + ".")
                .commit(650);

        Map<Integer, Integer> seen = new LinkedHashMap<>();
        boolean asked = false;
        for (int i = 0; i < nums.length; i++) {
            int x = nums[i];
            int complement = target - x;

            b.set("c" + i, patch("#2563EB", EntityStatus.ACTIVE, null))
                    .set("need", label("need = " + target + " − " + x + " = " + complement))
                    .highlightCode("py", List.of(3, 4), "At i=" + i + ", x=" + x + " → need " + complement + ".")
                    .step("i = " + i, "x = " + x + "; complement needed = " + complement + ".")
                    .say("x=" + x + ", need=" + complement + ".")
                    .commit(600);

            if (seen.containsKey(complement)) {
                int j = seen.get(complement);
                b.set("c" + j, patch("#16A34A", EntityStatus.SUCCESS, null))
                        .set("c" + i, patch("#16A34A", EntityStatus.SUCCESS, null))
                        .set("need", label("found! indices [" + j + ", " + i + "]"))
                        .highlightCode("py", List.of(5, 6),
                                complement + " was seen at index " + j + " → answer [" + j + ", " + i + "].")
                        .step("Match found", "return [" + j + ", " + i + "].")
                        .say("Found pair → [" + j + ", " + i + "].")
                        .commit(900);
                break;
            }

            if (!asked) {
                asked = true;
                Checkpoint cp = new Checkpoint();
                cp.setKind("single");
                cp.setPrompt("The complement " + complement + " is not in the map yet. What do we do with x = " + x + "?");
                List<Checkpoint.Option> opts = new ArrayList<>();
                opts.add(option("store", "Store " + x + " → index " + i + ", then continue"));
                opts.add(option("return", "Return immediately"));
                opts.add(option("skip", "Skip it entirely"));
                cp.setOptions(opts);
                cp.setAnswer("store");
                cp.setExplanation("We record value→index so a later element can find it as its complement.");
                cp.setHint("We need to remember values we have already seen.");
                cp.setBlocking(true);
                b.checkpoint(cp);
            }

            seen.put(x, i);
            b.set("c" + i, patch("#475569", EntityStatus.WAITING, "seen[" + x + "]=" + i))
                    .highlightCode("py", List.of(7), "Store seen[" + x + "] = " + i + ".")
                    .step("Store " + x, complement + " not seen yet → record seen[" + x + "] = " + i + ".")
                    .say("Store seen[" + x + "]=" + i + ".")
                    .commit(600);
        }

        b.step("Done", "The answer is returned in a single pass.")
                .say("Two Sum complete.")
                .commit(500);

        return b.build();
    }

    // ── helpers ────────────────────────────────────────────────────────────────
    private static int[] parseNums(Map<String, Object> params) {
        String raw = params != null && params.get("nums") != null
                ? params.get("nums").toString() : "2,7,11,15";
        String[] parts = raw.split(",");
        List<Integer> out = new ArrayList<>();
        for (String p : parts) {
            String t = p.trim();
            if (t.isEmpty()) continue;
            try {
                out.add(Integer.parseInt(t));
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException("nums must be comma-separated integers");
            }
        }
        if (out.isEmpty()) throw new IllegalArgumentException("nums must contain at least one integer");
        return out.stream().mapToInt(Integer::intValue).toArray();
    }

    private static int parseTarget(Map<String, Object> params) {
        if (params == null || params.get("target") == null) return 9;
        try {
            return (int) Double.parseDouble(params.get("target").toString());
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("target must be an integer");
        }
    }

    private static EntityState patch(String color, EntityStatus status, String sublabel) {
        EntityState e = new EntityState();
        e.setColor(color);
        e.setStatus(status);
        if (sublabel != null) e.setSublabel(sublabel);
        return e;
    }

    private static EntityState label(String label) {
        EntityState e = new EntityState();
        e.setLabel(label);
        return e;
    }

    private static Checkpoint.Option option(String id, String label) {
        Checkpoint.Option o = new Checkpoint.Option();
        o.setId(id);
        o.setLabel(label);
        return o;
    }
}
