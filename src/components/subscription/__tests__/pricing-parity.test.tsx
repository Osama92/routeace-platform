import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LC_PRICING_PLANS } from "@/config/lcPricingPlans";

// Mocks so the components don't need Supabase or auth at test time
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: { ok: true, findings: [] }, error: null }) },
  },
}));
vi.mock("@/hooks/useTenantMode", () => ({
  default: () => ({ isDepartment: false }),
}));
vi.mock("@/components/landing/PricingSimulator", () => ({
  default: () => null,
}));

import LandingPricingSection from "@/components/landing/LandingPricingSection";
import SubscriptionManager from "@/components/subscription/SubscriptionManager";

/**
 * Concatenated price string used by both surfaces - must match exactly.
 * For the landing page we render `${price}${period}` into a single line.
 * For Settings, price and period live in separate spans but render as the same text.
 */
function expectedDisplayPrice(p: typeof LC_PRICING_PLANS[number]) {
  return p.period ? `${p.price}${p.period}` : p.price;
}

describe("LC pricing parity: landing page ↔ Settings billing", () => {
  it("uses the same canonical config (no drift in source-of-truth)", () => {
    expect(LC_PRICING_PLANS).toHaveLength(4);
    const ids = LC_PRICING_PLANS.map((p) => p.id);
    expect(ids).toEqual(["starter", "bikes_vans", "heavy_fleet", "mixed_fleet"]);
  });

  it("renders identical tier names and prices on both surfaces", () => {
    const { unmount } = render(
      <MemoryRouter>
        <LandingPricingSection />
      </MemoryRouter>
    );
    for (const p of LC_PRICING_PLANS) {
      expect(screen.getAllByText(p.name).length).toBeGreaterThan(0);
      expect(screen.getAllByText(expectedDisplayPrice(p)).length).toBeGreaterThan(0);
    }
    unmount();

    render(<SubscriptionManager />);
    for (const p of LC_PRICING_PLANS) {
      expect(screen.getAllByText(p.name).length).toBeGreaterThan(0);
      // In Settings, price + period are split across spans - assert each part is present.
      expect(screen.getAllByText(p.price).length).toBeGreaterThan(0);
      if (p.period) {
        expect(screen.getAllByText(p.period).length).toBeGreaterThan(0);
      }
    }
  });

  it("Paystack subscribe is scoped only to subscribable tiers (per-vehicle / hybrid)", () => {
    render(<SubscriptionManager />);
    // Heavy Fleet & Mixed Fleet → Subscribe button enabled with the tier price embedded
    const subscribeButtons = screen.getAllByRole("button", { name: /Subscribe - / });
    const labels = subscribeButtons.map((b) => b.textContent ?? "");
    expect(labels.some((l) => l.includes("₦5,000") && l.includes("/vehicle/mo"))).toBe(true);
    expect(labels.some((l) => l.includes("₦5,000/vehicle + ₦50/drop"))).toBe(true);

    // Starter → "Current - Free tier", Bikes/Vans → "Billed per delivery"
    expect(screen.getByText(/Current - Free tier/i)).toBeInTheDocument();
    expect(screen.getByText(/Billed per delivery/i)).toBeInTheDocument();
  });
});
