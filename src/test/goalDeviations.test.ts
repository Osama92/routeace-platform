import { describe, it, expect } from "vitest";
import { evaluateGoalDeviations } from "@/components/strategy/GoalDeviationAlerts";

describe("Goal Deviation Alert Engine", () => {
  const baseMetrics = {
    revenueTarget: 1000000,
    revenueCurrent: 1000000,
    slaBreachRate: 2,
    profitMargin: 15,
    profitMarginTarget: 12,
    fleetIdleRate: 10,
    cashRunwayMonths: 6,
  };

  it("should detect revenue gap above 10%", () => {
    const deviations = evaluateGoalDeviations({
      ...baseMetrics,
      revenueCurrent: 800000,
    });
    const revenueAlert = deviations.find((d) => d.metric.includes("Revenue"));
    expect(revenueAlert).toBeDefined();
  });

  it("should NOT flag revenue when within 10%", () => {
    const deviations = evaluateGoalDeviations({
      ...baseMetrics,
      revenueCurrent: 950000,
    });
    const revenueAlert = deviations.find((d) => d.metric.includes("Revenue"));
    expect(revenueAlert).toBeUndefined();
  });

  it("should detect SLA breaches above 5%", () => {
    const deviations = evaluateGoalDeviations({
      ...baseMetrics,
      slaBreachRate: 8,
    });
    const slaAlert = deviations.find((d) => d.category === "sla");
    expect(slaAlert).toBeDefined();
  });

  it("should detect fleet idle above 20%", () => {
    const deviations = evaluateGoalDeviations({
      ...baseMetrics,
      fleetIdleRate: 25,
    });
    const fleetAlert = deviations.find((d) => d.category === "fleet");
    expect(fleetAlert).toBeDefined();
  });

  it("should return empty array when all metrics healthy", () => {
    const deviations = evaluateGoalDeviations(baseMetrics);
    expect(deviations).toHaveLength(0);
  });
});
