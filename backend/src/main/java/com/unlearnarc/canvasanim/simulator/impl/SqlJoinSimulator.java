package com.unlearnarc.canvasanim.simulator.impl;

import com.unlearnarc.canvasanim.simulator.SceneSimulator;
import com.unlearnarc.canvasanim.simulator.TraceBuilder;
import com.unlearnarc.canvasanim.spec.AnimationNotes;
import com.unlearnarc.canvasanim.spec.AnimationTheme;
import com.unlearnarc.canvasanim.spec.AnimationTrace;
import com.unlearnarc.canvasanim.spec.Checkpoint;
import com.unlearnarc.canvasanim.spec.ConnectionState;
import com.unlearnarc.canvasanim.spec.EntityState;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * DATABASE domain: an INNER JOIN between two tables, using the generic
 * {@code table} entity shape (meta.title/columns/rows/highlightRow). Demonstrates
 * the engine rendering SQL/record data from the same primitive set.
 */
@Component
public class SqlJoinSimulator implements SceneSimulator {

    @Override
    public String kind() {
        return "sql-inner-join";
    }

    @Override
    public String displayName() {
        return "SQL INNER JOIN";
    }

    @Override
    public String category() {
        return "DATABASE";
    }

    @Override
    public String description() {
        return "Matches rows across two tables on a join key to produce a joined result set.";
    }

    @Override
    public AnimationTrace generate(Map<String, Object> params) {
        AnimationTheme theme = new AnimationTheme();
        theme.setBackground("#0F172A");

        TraceBuilder b = new TraceBuilder(
                "sql-inner-join", displayName(),
                "Matching rows from two tables on a shared key.",
                720, 360, theme)
                .category("DATABASE");

        AnimationNotes notes = new AnimationNotes();
        notes.setSummary("An INNER JOIN returns only rows where the join predicate matches in "
                + "both tables; unmatched rows are excluded.");
        notes.setWhereToUse(List.of(
                "Combining normalized tables (orders ⋈ customers).",
                "Filtering to records present on both sides of a relationship."));
        notes.setKeyPoints(List.of(
                "INNER JOIN drops non-matching rows from BOTH tables.",
                "Use LEFT JOIN to keep all left rows even without a match."));
        b.notes(notes);

        b.set("users", table("users", 40, 60, 260, "#2563EB", "users",
                List.of("id", "name"),
                rows(List.of(List.of(1, "Ana"), List.of(2, "Ben"), List.of(3, "Cy"))), null));
        b.set("orders", table("orders", 420, 60, 260, "#0EA5E9", "orders",
                List.of("user_id", "item"),
                rows(List.of(List.of(1, "Book"), List.of(2, "Pen"), List.of(5, "Lamp"))), null));

        b.step("Two tables", "users and orders share users.id = orders.user_id.")
                .say("INNER JOIN users ⋈ orders ON users.id = orders.user_id")
                .commit(700);

        b.set("users", table("users", 40, 60, 260, "#2563EB", "users",
                        List.of("id", "name"),
                        rows(List.of(List.of(1, "Ana"), List.of(2, "Ben"), List.of(3, "Cy"))), 0))
                .set("orders", table("orders", 420, 60, 260, "#0EA5E9", "orders",
                        List.of("user_id", "item"),
                        rows(List.of(List.of(1, "Book"), List.of(2, "Pen"), List.of(5, "Lamp"))), 0));
        ConnectionState m1 = new ConnectionState();
        m1.setId("m1"); m1.setFrom("users"); m1.setTo("orders");
        m1.setColor("#16A34A"); m1.setLabel("id=1 ✓");
        b.link(m1)
                .step("Match id = 1", "Ana (id 1) matches order user_id 1 → included.")
                .say("Row id=1 matches → kept.")
                .commit(650);

        Checkpoint cp = new Checkpoint();
        cp.setKind("single");
        cp.setPrompt("order user_id = 5 has no matching users.id. With INNER JOIN, is it in the result?");
        List<Checkpoint.Option> opts = new ArrayList<>();
        opts.add(option("yes", "Yes, with NULLs"));
        opts.add(option("no", "No, it is dropped"));
        cp.setOptions(opts);
        cp.setAnswer("no");
        cp.setExplanation("INNER JOIN excludes rows without a match on both sides, so user_id=5 is dropped.");
        cp.setHint("INNER keeps only rows present on BOTH sides.");
        cp.setBlocking(false);
        b.checkpoint(cp);

        b.unlink("m1")
                .set("result", table("result", 220, 240, 300, "#16A34A", "result (INNER JOIN)",
                        List.of("id", "name", "item"),
                        rows(List.of(List.of(1, "Ana", "Book"), List.of(2, "Ben", "Pen"))), null))
                .step("Result", "Only matched rows remain; id 3 and user_id 5 are gone.")
                .say("Result keeps only matching rows.")
                .commit(700);

        return b.build();
    }

    private static EntityState table(String id, double x, double y, double w, String color,
                                     String title, List<String> columns,
                                     List<List<Object>> rows, Integer highlightRow) {
        EntityState e = new EntityState();
        e.setId(id);
        e.setShape("table");
        e.setX(x); e.setY(y); e.setWidth(w);
        e.setColor(color);
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("title", title);
        meta.put("columns", columns);
        meta.put("rows", rows);
        if (highlightRow != null) meta.put("highlightRow", highlightRow);
        e.setMeta(meta);
        return e;
    }

    private static List<List<Object>> rows(List<List<Object>> r) {
        return new ArrayList<>(r);
    }

    private static Checkpoint.Option option(String id, String label) {
        Checkpoint.Option o = new Checkpoint.Option();
        o.setId(id);
        o.setLabel(label);
        return o;
    }
}
