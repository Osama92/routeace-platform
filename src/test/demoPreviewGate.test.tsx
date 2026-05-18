/**
 * DemoPreviewGate regression tests.
 *
 * Guarantees, for every gated showcase route used by LC + LD tenants, that:
 *
 * 1. Fresh tenants (`tenant_config.show_demo_previews = false`, the default)
 *    see the empty-state card and NEVER see the wrapped showcase children -
 *    so illustrative company names from other tenants cannot leak into a
 *    real LC/LD workspace.
 *
 * 2. Tenants that have explicitly opted in (`show_demo_previews = true`) see
 *    the amber "Demo preview" banner above the children, so it is always
 *    unambiguous that the figures are illustrative.
 *
 * The hook is mocked rather than calling Supabase, so the tests run hermetic
 * and assert UI contract only - there is no network request, hence no chance
 * of these tests themselves leaking tenant data.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DemoPreviewGate } from "@/components/demo/DemoPreviewGate";

// Mock the flag hook - every test sets the return value explicitly.
vi.mock("@/hooks/useDemoPreviewsEnabled", () => ({
  useDemoPreviewsEnabled: vi.fn(),
}));
import { useDemoPreviewsEnabled } from "@/hooks/useDemoPreviewsEnabled";

// The illustrative company names that must never reach a fresh tenant.
const LEAK_CANARIES = [
  "Acme Logistics",
  "Demo Distributor Co",
  "Sample Trader NG",
];

function ShowcaseChildren() {
  return (
    <div>
      <h2>Top Counterparties</h2>
      {LEAK_CANARIES.map((n) => (
        <p key={n}>{n}</p>
      ))}
    </div>
  );
}

// The four showcase routes currently wrapped in DemoPreviewGate across the
// LC (Logistics Carrier) and LD (Logistics Dispatcher) experience.
const GATED_SHOWCASES = [
  { tenant: "LC", title: "Financial Trust Dashboard" },
  { tenant: "LC", title: "Supplier Intelligence" },
  { tenant: "LD", title: "Distributor Financing" },
  { tenant: "LD", title: "PortoDash Demo" },
] as const;

describe("DemoPreviewGate - fresh LC/LD tenant (flag OFF)", () => {
  beforeEach(() => {
    vi.mocked(useDemoPreviewsEnabled).mockReturnValue({
      enabled: false,
      isLoading: false,
    });
  });

  GATED_SHOWCASES.forEach(({ tenant, title }) => {
    it(`${tenant}: "${title}" renders empty state and hides showcase data`, () => {
      render(
        <DemoPreviewGate title={title}>
          <ShowcaseChildren />
        </DemoPreviewGate>
      );

      // Empty-state copy is shown.
      expect(
        screen.getByText(`${title} - Preview Disabled`)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/No data from other tenants is shown here\./i)
      ).toBeInTheDocument();

      // Amber demo banner must NOT appear.
      expect(
        screen.queryByText(/Demo preview - illustrative data only/i)
      ).not.toBeInTheDocument();

      // Critical: none of the illustrative company names leak through.
      for (const name of LEAK_CANARIES) {
        expect(screen.queryByText(name)).not.toBeInTheDocument();
      }
      expect(screen.queryByText("Top Counterparties")).not.toBeInTheDocument();
    });
  });
});

describe("DemoPreviewGate - opted-in LC/LD tenant (flag ON)", () => {
  beforeEach(() => {
    vi.mocked(useDemoPreviewsEnabled).mockReturnValue({
      enabled: true,
      isLoading: false,
    });
  });

  GATED_SHOWCASES.forEach(({ tenant, title }) => {
    it(`${tenant}: "${title}" shows amber demo banner and renders children`, () => {
      render(
        <DemoPreviewGate title={title}>
          <ShowcaseChildren />
        </DemoPreviewGate>
      );

      // Amber preview banner is present with the exact disclosure copy.
      expect(
        screen.getByText("Demo preview - illustrative data only")
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /are for demonstration\. They\s+are not your tenant's real records\./i
        )
      ).toBeInTheDocument();

      // The amber banner uses the project's amber-500 token classes.
      const banner = screen
        .getByText("Demo preview - illustrative data only")
        .closest("div[class]");
      expect(banner?.className).toMatch(/amber-500\/40/);
      expect(banner?.className).toMatch(/amber-500\/10/);

      // Children render only when the flag is on.
      expect(screen.getByText("Top Counterparties")).toBeInTheDocument();
      for (const name of LEAK_CANARIES) {
        expect(screen.getByText(name)).toBeInTheDocument();
      }

      // The disabled-state copy must NOT also appear.
      expect(
        screen.queryByText(`${title} - Preview Disabled`)
      ).not.toBeInTheDocument();
    });
  });
});

describe("DemoPreviewGate - loading state", () => {
  it("renders neutral loading card and never leaks children while flag is resolving", () => {
    vi.mocked(useDemoPreviewsEnabled).mockReturnValue({
      enabled: false,
      isLoading: true,
    });

    render(
      <DemoPreviewGate title="Financial Trust Dashboard">
        <ShowcaseChildren />
      </DemoPreviewGate>
    );

    expect(screen.getByText(/Loading…/)).toBeInTheDocument();
    for (const name of LEAK_CANARIES) {
      expect(screen.queryByText(name)).not.toBeInTheDocument();
    }
    expect(
      screen.queryByText(/Demo preview - illustrative data only/i)
    ).not.toBeInTheDocument();
  });
});
