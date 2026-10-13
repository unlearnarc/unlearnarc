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

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Queue;

/**
 * Generates a Breadth-First Search trace over a fixed demo graph — proof that
 * adding an entirely different animation DOMAIN (DSA / graphs) requires only a
 * new {@code @Component}; the registry, controller, entity and table are
 * untouched. This is the Open/Closed extensibility contract in action.
 *
 * Params: none (fixed demo graph). A richer version could accept adjacency JSON.
 */
@Component
public class GraphBfsSimulator implements SceneSimulator {

    @Override
    public String kind() {
        return "graph-bfs";
    }

    @Override
    public String displayName() {
        return "Breadth-First Search (BFS)";
    }

    @Override
    public String category() {
        return "DSA";
    }

    @Override
    public String description() {
        return "Level-order graph traversal visiting nodes layer by layer from a start node.";
    }

    @Override
    public Map<String, Object> paramSchema() {
        return Map.of("start", Map.of(
                "type", "string", "default", "A",
                "label", "Start node id"));
    }

    @Override
    public AnimationTrace generate(Map<String, Object> params) {
        String start = params == null || params.get("start") == null
                ? "A" : params.get("start").toString();

        Map<String, double[]> pos = new LinkedHashMap<>();
        pos.put("A", new double[]{110, 80});
        pos.put("B", new double[]{320, 70});
        pos.put("C", new double[]{520, 90});
        pos.put("D", new double[]{250, 220});
        pos.put("E", new double[]{460, 240});
        pos.put("F", new double[]{330, 330});

        String[][] edges = {
                {"A", "B"}, {"A", "D"}, {"B", "C"}, {"B", "E"},
                {"D", "E"}, {"E", "F"}, {"C", "E"}
        };
        Map<String, List<String>> adj = new LinkedHashMap<>();
        pos.keySet().forEach(k -> adj.put(k, new ArrayList<>()));
        for (String[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        if (!pos.containsKey(start)) start = "A";

        AnimationTheme theme = new AnimationTheme();
        theme.setBackground("#0F172A");

        TraceBuilder b = new TraceBuilder(
                "graph-bfs", displayName(),
                "BFS explores a graph level by level from node " + start + ".",
                640, 380, theme)
                .category("DSA");

        AnimationNotes notes = new AnimationNotes();
        notes.setSummary("BFS visits all neighbours at the current depth before going deeper, "
                + "using a FIFO queue. It finds shortest paths in unweighted graphs.");
        notes.setWhereToUse(List.of(
                "Shortest path in unweighted graphs / grids.",
                "Level-order traversal, connected components, web crawling.",
                "Minimum number of moves (puzzles, mazes)."));
        notes.setKeyPoints(List.of(
                "BFS uses a queue (FIFO); DFS uses a stack (LIFO).",
                "A node is enqueued once — mark it visited when discovered."));
        b.notes(notes);

        // initial world
        for (Map.Entry<String, double[]> en : pos.entrySet()) {
            EntityState n = new EntityState();
            n.setId(en.getKey());
            n.setShape("node");
            n.setX(en.getValue()[0]);
            n.setY(en.getValue()[1]);
            n.setRadius(22.0);
            n.setColor("#334155");
            n.setLabel(en.getKey());
            n.setStatus(EntityStatus.IDLE);
            b.set(en.getKey(), n);
        }
        for (String[] e : edges) {
            ConnectionState c = new ConnectionState();
            c.setId(e[0] + e[1]);
            c.setFrom(e[0]);
            c.setTo(e[1]);
            c.setColor("#475569");
            c.setOpacity(0.6);
            b.link(c);
        }

        b.set(start, color(EntityStatus.ACTIVE, "#2563EB", "start"))
                .step("Start at " + start, "Enqueue the start node and mark it visited.")
                .var("queue", start).var("visited", start)
                .say("BFS from " + start + ". Queue = [" + start + "].")
                .commit(700);

        boolean askedCheckpoint = false;
        Queue<String> queue = new ArrayDeque<>();
        List<String> visited = new ArrayList<>();
        queue.add(start);
        visited.add(start);

        while (!queue.isEmpty()) {
            String node = queue.poll();
            List<String> discovered = new ArrayList<>();
            for (String nb : adj.get(node)) {
                if (!visited.contains(nb)) {
                    visited.add(nb);
                    queue.add(nb);
                    discovered.add(nb);
                    b.set(nb, color(EntityStatus.WAITING, "#F59E0B", null));
                }
            }
            b.set(node, color(EntityStatus.SUCCESS, "#16A34A", null))
                    .step("Visit " + node, discovered.isEmpty()
                            ? "No new neighbours."
                            : "Discover " + String.join(", ", discovered) + ".")
                    .var("queue", String.join(", ", queue))
                    .var("visited", String.join(", ", visited))
                    .say("Visit " + node + (discovered.isEmpty() ? "."
                            : " → discover " + String.join(", ", discovered) + "."))
                    .commit(600);

            if (!askedCheckpoint && discovered.size() >= 2) {
                askedCheckpoint = true;
                Checkpoint cp = new Checkpoint();
                cp.setKind("single");
                cp.setPrompt("BFS just discovered " + discovered.get(0) + " and "
                        + discovered.get(1) + ". Which is processed NEXT?");
                List<Checkpoint.Option> opts = new ArrayList<>();
                opts.add(option(discovered.get(0), discovered.get(0) + " (enqueued first)"));
                opts.add(option(discovered.get(1), discovered.get(1)));
                cp.setOptions(opts);
                cp.setAnswer(discovered.get(0));
                cp.setExplanation("BFS uses a FIFO queue, so the earliest-enqueued node is next.");
                cp.setHint("Queue = First In, First Out.");
                cp.setBlocking(true);
                b.checkpoint(cp);
            }
        }

        b.step("Done", "All reachable nodes visited in level order.")
                .say("BFS complete — all nodes visited.")
                .commit(600);

        return b.build();
    }

    private static EntityState color(EntityStatus status, String color, String sublabel) {
        EntityState e = new EntityState();
        e.setStatus(status);
        e.setColor(color);
        if (sublabel != null) e.setSublabel(sublabel);
        return e;
    }

    private static Checkpoint.Option option(String id, String label) {
        Checkpoint.Option o = new Checkpoint.Option();
        o.setId(id);
        o.setLabel(label);
        return o;
    }
}
