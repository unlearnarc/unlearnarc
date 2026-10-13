package com.unlearnarc.canvasanim.simulator.impl;

import com.unlearnarc.canvasanim.simulator.SceneSimulator;
import com.unlearnarc.canvasanim.simulator.TraceBuilder;
import com.unlearnarc.canvasanim.spec.AnimationNotes;
import com.unlearnarc.canvasanim.spec.AnimationTheme;
import com.unlearnarc.canvasanim.spec.AnimationTrace;
import com.unlearnarc.canvasanim.spec.Checkpoint;
import com.unlearnarc.canvasanim.spec.EntityState;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * AI/ML domain: visualises C = A·B one dot-product at a time, using the generic
 * {@code matrix} entity shape (meta.rows/cols/values/highlight). Proves the
 * engine renders numeric-grid domains with the same primitives — no renderer or
 * schema change, just a new {@code @Component}.
 */
@Component
public class MatrixMultiplySimulator implements SceneSimulator {

    @Override
    public String kind() {
        return "matrix-multiply";
    }

    @Override
    public String displayName() {
        return "Matrix Multiplication (dot products)";
    }

    @Override
    public String category() {
        return "AI_ML";
    }

    @Override
    public String description() {
        return "Row × column dot products build each cell of the product matrix C = A·B.";
    }

    @Override
    public AnimationTrace generate(Map<String, Object> params) {
        int[][] A = {{1, 2}, {3, 4}};
        int[][] B = {{5, 6}, {7, 8}};
        Object[][] C = {{"·", "·"}, {"·", "·"}};

        AnimationTheme theme = new AnimationTheme();
        theme.setBackground("#0F172A");

        TraceBuilder b = new TraceBuilder(
                "matrix-multiply", displayName(),
                "Computing C = A · B one output cell at a time.",
                680, 320, theme)
                .category("AI_ML");

        AnimationNotes notes = new AnimationNotes();
        notes.setSummary("Each output cell C[i][j] is the dot product of row i of A and column j of B "
                + "— the core operation of dense neural-network layers.");
        notes.setWhereToUse(List.of(
                "Fully-connected / linear layers (y = Wx + b).",
                "Attention score computation (QKᵀ) in transformers.",
                "General linear algebra: transforms, PCA, graphics."));
        notes.setKeyPoints(List.of(
                "C is (rowsA × colsB); the inner dimensions must match.",
                "GPUs parallelise these independent dot products massively."));
        b.notes(notes);

        b.set("A", matrix("A", 40, 90, 120, 120, "#2563EB", values(A), null));
        b.set("B", matrix("B", 250, 90, 120, 120, "#0EA5E9", values(B), null));
        b.set("C", matrix("C", 500, 90, 120, 120, "#16A34A", valuesO(C), null));
        b.set("eq1", text("eq1", 190, 150, "×"));
        b.set("eq2", text("eq2", 430, 150, "="));

        b.step("C = A · B", "Each C[i][j] = row i of A · column j of B.")
                .say("Multiply A (2×2) by B (2×2).")
                .commit(650);

        int[][] cells = {{0, 0}, {0, 1}, {1, 0}, {1, 1}};
        boolean asked = false;
        for (int[] ij : cells) {
            int i = ij[0], j = ij[1];
            int val = A[i][0] * B[0][j] + A[i][1] * B[1][j];
            C[i][j] = val;
            b.set("A", matrix("A", 40, 90, 120, 120, "#2563EB", values(A),
                            List.of(List.of(i, 0), List.of(i, 1))))
                    .set("B", matrix("B", 250, 90, 120, 120, "#0EA5E9", values(B),
                            List.of(List.of(0, j), List.of(1, j))))
                    .set("C", matrix("C", 500, 90, 120, 120, "#16A34A", valuesO(C),
                            List.of(List.of(i, j))))
                    .step("C[" + i + "][" + j + "]",
                            "= A[" + i + "][0]·B[0][" + j + "] + A[" + i + "][1]·B[1][" + j + "] = " + val)
                    .say("C[" + i + "][" + j + "] = " + val)
                    .commit(700);

            if (!asked) {
                asked = true;
                Checkpoint cp = new Checkpoint();
                cp.setKind("number");
                cp.setPrompt("What is C[0][1] = row0 of A · col1 of B? (A row0=[1,2], B col1=[6,8])");
                cp.setAnswer(1 * 6 + 2 * 8);
                cp.setExplanation("1·6 + 2·8 = 22.");
                cp.setHint("Multiply element-wise then add: 1·6 + 2·8.");
                cp.setBlocking(false);
                b.checkpoint(cp);
            }
        }

        b.step("Done", "All four output cells are filled.")
                .say("Matrix product complete.")
                .commit(600);

        return b.build();
    }

    private static EntityState matrix(String id, double x, double y, double w, double h,
                                      String color, Object values, Object highlight) {
        EntityState e = new EntityState();
        e.setId(id);
        e.setShape("matrix");
        e.setX(x); e.setY(y); e.setWidth(w); e.setHeight(h);
        e.setColor(color);
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("rows", 2);
        meta.put("cols", 2);
        meta.put("values", values);
        if (highlight != null) meta.put("highlight", highlight);
        e.setMeta(meta);
        return e;
    }

    private static EntityState text(String id, double x, double y, String label) {
        EntityState e = new EntityState();
        e.setId(id);
        e.setShape("text");
        e.setX(x); e.setY(y);
        e.setColor("#94A3B8");
        e.setLabel(label);
        return e;
    }

    private static List<List<Object>> values(int[][] m) {
        List<List<Object>> out = new ArrayList<>();
        for (int[] row : m) {
            List<Object> r = new ArrayList<>();
            for (int v : row) r.add(v);
            out.add(r);
        }
        return out;
    }

    private static List<List<Object>> valuesO(Object[][] m) {
        List<List<Object>> out = new ArrayList<>();
        for (Object[] row : m) {
            List<Object> r = new ArrayList<>(List.of(row));
            out.add(r);
        }
        return out;
    }
}
