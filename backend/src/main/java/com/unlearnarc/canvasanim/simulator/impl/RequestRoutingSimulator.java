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
import java.util.List;
import java.util.Map;

/**
 * SYSTEM_DESIGN domain: a read request flows Client → Load Balancer → Replica,
 * using pill/rect entities, the {@code cylinder} datastore shape, and connections
 * with travelling-packet progress. Another new {@code @Component} = another
 * domain, zero core changes.
 */
@Component
public class RequestRoutingSimulator implements SceneSimulator {

    @Override
    public String kind() {
        return "request-routing";
    }

    @Override
    public String displayName() {
        return "Request Routing through a Load Balancer";
    }

    @Override
    public String category() {
        return "SYSTEM_DESIGN";
    }

    @Override
    public String description() {
        return "A client request fans out through a load balancer to a replica and back.";
    }

    @Override
    public AnimationTrace generate(Map<String, Object> params) {
        AnimationTheme theme = new AnimationTheme();
        theme.setBackground("#0F172A");

        TraceBuilder b = new TraceBuilder(
                "request-routing", displayName(),
                "A read request flows from a client through a load balancer to a replica.",
                720, 360, theme)
                .category("SYSTEM_DESIGN");

        AnimationNotes notes = new AnimationNotes();
        notes.setSummary("A load balancer spreads traffic across backends and routes reads to "
                + "replicas to offload the primary database.");
        notes.setWhereToUse(List.of(
                "Horizontally-scaled web tiers behind an L4/L7 load balancer.",
                "Read-heavy workloads using primary/replica topologies.",
                "Blue-green / canary routing and health-check failover."));
        notes.setKeyPoints(List.of(
                "Reads can go to replicas; writes must go to the primary.",
                "The LB is a single logical entry point but is itself replicated for HA."));
        b.notes(notes);

        b.set("client", pill("client", 70, 160, 120, 48, "#2563EB", "Client"))
                .set("lb", rect("lb", 300, 120, 130, 60, "#0EA5E9", "Load Balancer"))
                .set("primary", cylinder("primary", 560, 60, 90, 64, "#7C3AED", "DB primary"))
                .set("replica", cylinder("replica", 560, 220, 90, 64, "#16A34A", "DB replica"));

        b.step("Idle topology", "A client, a load balancer and primary + replica databases.")
                .say("A read request is about to be issued by the client.")
                .commit(600);

        b.set("client", status("client", EntityStatus.ACTIVE))
                .link(conn("c-lb", "client", "lb", "#2563EB", "GET /item", 0.0, false))
                .step("Request sent", "The client sends a read request to the load balancer.")
                .say("Client sends GET /item to the load balancer.")
                .commit(200);
        b.link(conn("c-lb", "client", "lb", "#2563EB", "GET /item", 1.0, false)).commit(500);

        Checkpoint cp = new Checkpoint();
        cp.setKind("single");
        cp.setPrompt("This is a READ request. Where should the load balancer route it?");
        List<Checkpoint.Option> opts = new ArrayList<>();
        opts.add(option("primary", "The primary database"));
        opts.add(option("replica", "A read replica"));
        opts.add(option("client", "Back to the client"));
        cp.setOptions(opts);
        cp.setAnswer("replica");
        cp.setExplanation("Reads are routed to replicas to offload the primary, which handles writes.");
        cp.setHint("Primaries handle writes; replicas serve reads.");
        cp.setBlocking(true);
        b.checkpoint(cp);

        b.set("lb", status("lb", EntityStatus.ACTIVE))
                .unlink("c-lb")
                .link(conn("lb-r", "lb", "replica", "#16A34A", "route read", 0.0, false))
                .step("Routed to replica", "The LB forwards the read to a replica.")
                .say("Load balancer routes the read to a replica.")
                .commit(200);
        b.link(conn("lb-r", "lb", "replica", "#16A34A", "route read", 1.0, false)).commit(500);

        b.set("replica", status("replica", EntityStatus.SUCCESS))
                .unlink("lb-r")
                .link(conn("r-c", "replica", "client", "#16A34A", "rows", 0.0, true))
                .step("Replica responds", "The replica returns the rows to the client.")
                .say("Replica returns the data to the client.")
                .commit(200);
        b.link(conn("r-c", "replica", "client", "#16A34A", "rows", 1.0, true))
                .set("client", status("client", EntityStatus.SUCCESS))
                .commit(600);

        return b.build();
    }

    // ── helpers ─────────────────────────────────────────────────────────────
    private static EntityState box(String id, String shape, double x, double y,
                                   double w, double h, String color, String label) {
        EntityState e = new EntityState();
        e.setId(id);
        e.setShape(shape);
        e.setX(x); e.setY(y); e.setWidth(w); e.setHeight(h);
        e.setColor(color);
        e.setLabel(label);
        e.setStatus(EntityStatus.IDLE);
        return e;
    }

    private static EntityState pill(String id, double x, double y, double w, double h, String c, String l) {
        return box(id, "pill", x, y, w, h, c, l);
    }

    private static EntityState rect(String id, double x, double y, double w, double h, String c, String l) {
        return box(id, "rect", x, y, w, h, c, l);
    }

    private static EntityState cylinder(String id, double x, double y, double w, double h, String c, String l) {
        return box(id, "cylinder", x, y, w, h, c, l);
    }

    private static EntityState status(String id, EntityStatus status) {
        EntityState e = new EntityState();
        e.setId(id);
        e.setStatus(status);
        return e;
    }

    private static ConnectionState conn(String id, String from, String to, String color,
                                        String label, double progress, boolean dashed) {
        ConnectionState c = new ConnectionState();
        c.setId(id);
        c.setFrom(from);
        c.setTo(to);
        c.setColor(color);
        c.setLabel(label);
        c.setProgress(progress);
        c.setDashed(dashed);
        return c;
    }

    private static Checkpoint.Option option(String id, String label) {
        Checkpoint.Option o = new Checkpoint.Option();
        o.setId(id);
        o.setLabel(label);
        return o;
    }
}
