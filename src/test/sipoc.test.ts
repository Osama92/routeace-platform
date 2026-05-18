import { describe, it, expect } from "vitest";
import { generateLogisticsSIPOC } from "@/components/strategy/SIPOCDiagram";

describe("SIPOC Engine", () => {
  it("should generate valid SIPOC with all 5 sections", () => {
    const sipoc = generateLogisticsSIPOC();
    expect(sipoc.suppliers.length).toBeGreaterThan(0);
    expect(sipoc.inputs.length).toBeGreaterThan(0);
    expect(sipoc.process.length).toBeGreaterThan(0);
    expect(sipoc.outputs.length).toBeGreaterThan(0);
    expect(sipoc.customers.length).toBeGreaterThan(0);
  });

  it("should include KPI links in outputs", () => {
    const sipoc = generateLogisticsSIPOC();
    const hasKpiLink = sipoc.outputs.some(
      (o) => o.name.toLowerCase().includes("sla") || o.name.toLowerCase().includes("invoice") || o.kpiLink
    );
    expect(hasKpiLink).toBe(true);
  });

  it("should include standard logistics process steps", () => {
    const sipoc = generateLogisticsSIPOC();
    const processText = sipoc.process.map((p) => p.step).join(" ").toLowerCase();
    expect(processText).toContain("order");
    expect(processText).toContain("dispatch");
    expect(processText).toContain("delivery");
  });
});
