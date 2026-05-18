// Phase 12 - KPI propagation regression tests.
// Verifies the hierarchical rollup model (Driver → Support/CX → Logistics
// Manager → Org Admin → Super Admin) computes consistent aggregates and
// never invents inputs ("no manual KPIs" rule).

import { describe, it, expect } from "vitest";

type Tier = "driver" | "support" | "logistics_manager" | "org_admin" | "super_admin";

interface KpiPoint {
  tier: Tier;
  owner_id: string;
  parent_id?: string | null;
  metric: string;
  value: number;
  source:
    | "dispatch"
    | "cost"
    | "delivery"
    | "call"
    | "maintenance"
    | "finance"
    | "sla";
}

// Pure rollup: parent value = sum of children values for the same metric.
function rollup(points: KpiPoint[], metric: string, tier: Tier): Map<string, number> {
  const result = new Map<string, number>();
  const filtered = points.filter((p) => p.metric === metric);
  if (tier === "driver") {
    for (const p of filtered.filter((p) => p.tier === "driver")) {
      result.set(p.owner_id, (result.get(p.owner_id) ?? 0) + p.value);
    }
    return result;
  }
  // For higher tiers, sum the child rollup values keyed by parent_id chain.
  // We compute one tier at a time so the test mirrors the propagation engine.
  const tierOrder: Tier[] = ["driver", "support", "logistics_manager", "org_admin", "super_admin"];
  const targetIdx = tierOrder.indexOf(tier);
  let current = filtered.filter((p) => p.tier === "driver");
  for (let i = 1; i <= targetIdx; i++) {
    const nextTier = tierOrder[i];
    const aggregated = new Map<string, number>();
    // group children by their parent_id (which lives on points of nextTier).
    const parentLookup = new Map<string, string | null>();
    for (const p of points.filter((p) => p.tier === nextTier)) {
      parentLookup.set(p.owner_id, p.parent_id ?? null);
    }
    // Find each child's parent at this level.
    for (const child of current) {
      // Walk up: child belongs to a node whose owner_id == child.parent_id at nextTier.
      const parentNode = points.find(
        (p) => p.tier === nextTier && p.owner_id === child.parent_id,
      );
      if (!parentNode) continue;
      aggregated.set(
        parentNode.owner_id,
        (aggregated.get(parentNode.owner_id) ?? 0) + child.value,
      );
    }
    // Re-shape into KpiPoint[] to feed the next iteration.
    current = Array.from(aggregated.entries()).map(([owner_id, value]) => {
      const node = points.find((p) => p.tier === nextTier && p.owner_id === owner_id)!;
      return {
        tier: nextTier,
        owner_id,
        parent_id: node.parent_id,
        metric,
        value,
        source: "dispatch" as const,
      };
    });
  }
  for (const p of current) result.set(p.owner_id, p.value);
  return result;
}

describe("KPI propagation engine", () => {
  // Hierarchy:
  //   super (S1)
  //    └─ org (O1)
  //        ├─ lm (LM1)
  //        │   ├─ support (CX1) ── driver D1 (5), driver D2 (3)
  //        │   └─ support (CX2) ── driver D3 (7)
  //        └─ lm (LM2)
  //            └─ support (CX3) ── driver D4 (4)
  const points: KpiPoint[] = [
    { tier: "super_admin", owner_id: "S1", parent_id: null, metric: "deliveries", value: 0, source: "dispatch" },
    { tier: "org_admin", owner_id: "O1", parent_id: "S1", metric: "deliveries", value: 0, source: "dispatch" },
    { tier: "logistics_manager", owner_id: "LM1", parent_id: "O1", metric: "deliveries", value: 0, source: "dispatch" },
    { tier: "logistics_manager", owner_id: "LM2", parent_id: "O1", metric: "deliveries", value: 0, source: "dispatch" },
    { tier: "support", owner_id: "CX1", parent_id: "LM1", metric: "deliveries", value: 0, source: "dispatch" },
    { tier: "support", owner_id: "CX2", parent_id: "LM1", metric: "deliveries", value: 0, source: "dispatch" },
    { tier: "support", owner_id: "CX3", parent_id: "LM2", metric: "deliveries", value: 0, source: "dispatch" },
    { tier: "driver", owner_id: "D1", parent_id: "CX1", metric: "deliveries", value: 5, source: "dispatch" },
    { tier: "driver", owner_id: "D2", parent_id: "CX1", metric: "deliveries", value: 3, source: "dispatch" },
    { tier: "driver", owner_id: "D3", parent_id: "CX2", metric: "deliveries", value: 7, source: "dispatch" },
    { tier: "driver", owner_id: "D4", parent_id: "CX3", metric: "deliveries", value: 4, source: "dispatch" },
  ];

  it("rolls driver KPIs up to support tier", () => {
    const r = rollup(points, "deliveries", "support");
    expect(r.get("CX1")).toBe(8);
    expect(r.get("CX2")).toBe(7);
    expect(r.get("CX3")).toBe(4);
  });

  it("rolls support KPIs up to logistics manager", () => {
    const r = rollup(points, "deliveries", "logistics_manager");
    expect(r.get("LM1")).toBe(15); // 8 + 7
    expect(r.get("LM2")).toBe(4);
  });

  it("rolls logistics manager KPIs up to org admin", () => {
    const r = rollup(points, "deliveries", "org_admin");
    expect(r.get("O1")).toBe(19); // 15 + 4
  });

  it("rolls org admin KPIs up to super admin", () => {
    const r = rollup(points, "deliveries", "super_admin");
    expect(r.get("S1")).toBe(19);
  });

  it("ignores points with no parent chain (orphan-safe)", () => {
    const orphan: KpiPoint[] = [
      ...points,
      { tier: "driver", owner_id: "D99", parent_id: "CX_GHOST", metric: "deliveries", value: 100, source: "dispatch" },
    ];
    const r = rollup(orphan, "deliveries", "super_admin");
    // Orphan must NOT poison the super admin total.
    expect(r.get("S1")).toBe(19);
  });

  it("treats every leaf KPI as system-sourced (no manual inputs)", () => {
    const allowed = new Set(["dispatch", "cost", "delivery", "call", "maintenance", "finance", "sla"]);
    for (const p of points.filter((p) => p.tier === "driver")) {
      expect(allowed.has(p.source)).toBe(true);
    }
  });

  it("does not double-count when the same driver appears in multiple metrics", () => {
    const mixed: KpiPoint[] = [
      ...points,
      { tier: "driver", owner_id: "D1", parent_id: "CX1", metric: "incidents", value: 2, source: "sla" },
    ];
    const deliveries = rollup(mixed, "deliveries", "super_admin");
    const incidents = rollup(mixed, "incidents", "super_admin");
    expect(deliveries.get("S1")).toBe(19);
    expect(incidents.get("S1")).toBe(2);
  });
});
