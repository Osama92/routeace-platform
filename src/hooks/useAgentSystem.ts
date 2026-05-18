import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fmt = (n: number) =>
  `${n < 0 ? "-" : ""}₦${Math.abs(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

export interface AgentOutput {
  id: string;
  name: string;
  icon: string;
  status: "healthy" | "warning" | "critical";
  score: number; // 0-100
  summary: string;
  metrics: Record<string, string | number>;
  signals: Array<{ type: "block" | "warn" | "recommend"; message: string }>;
}

export interface OrchestratorDecision {
  decision: string;
  confidence: number;
  reasoning: string[];
  actions: Array<{ label: string; type: "block" | "warn" | "recommend"; detail: string }>;
}

export function useAgentSystem() {
  // ─── Data Layer ───────────────────────────────────────────────
  const { data: invoices = [] } = useQuery({
    queryKey: ["agent-invoices"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("id, total_amount, status, invoice_date, due_date, customer_id, created_at").order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["agent-expenses"],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("id, amount, category, expense_date, approval_status").eq("approval_status", "approved").limit(500);
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: arData = [] } = useQuery({
    queryKey: ["agent-ar"],
    queryFn: async () => {
      const { data } = await supabase.from("accounts_receivable").select("*").neq("status", "paid").neq("status", "cancelled");
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: apData = [] } = useQuery({
    queryKey: ["agent-ap"],
    queryFn: async () => {
      const { data } = await supabase.from("accounts_payable").select("*").neq("status", "paid").neq("status", "cancelled");
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: funding = [] } = useQuery({
    queryKey: ["agent-funding"],
    queryFn: async () => {
      const { data } = await supabase.from("capital_funding").select("*").eq("status", "active");
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: repayments = [] } = useQuery({
    queryKey: ["agent-repayments"],
    queryFn: async () => {
      const { data } = await supabase.from("capital_repayments").select("*").eq("status", "pending").order("due_date", { ascending: true }).limit(12);
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["agent-vehicles"],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("id, truck_type, status, registration_number").limit(200);
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: dispatches = [] } = useQuery({
    queryKey: ["agent-dispatches"],
    queryFn: async () => {
      const { data } = await supabase.from("dispatches").select("id, vehicle_id, cost, status, created_at").limit(500);
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["agent-bills"],
    queryFn: async () => {
      const { data } = await supabase.from("bills").select("id, total_amount, payment_status, category, bill_date").limit(500);
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: glData = [] } = useQuery({
    queryKey: ["agent-gl"],
    queryFn: async () => {
      const { data } = await supabase.from("accounting_ledger").select("*");
      return data || [];
    },
    staleTime: 60_000,
  });

  // ─── Core Computed Values ─────────────────────────────────────
  const core = useMemo(() => {
    const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const pendingRevenue = invoices.filter(i => ["pending", "overdue"].includes(i.status)).reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const paidBills = bills.filter(b => b.payment_status === "paid").reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const totalOutflows = totalExpenses + paidBills;
    const accountingProfit = totalRevenue - totalOutflows;
    const arOutstanding = arData.reduce((s, e) => s + Number(e.balance || 0), 0);
    const apOutstanding = apData.reduce((s, e) => s + Number(e.balance || 0), 0);
    const cashBalance = glData.filter(e => e.account_name === "cash" || e.account_name === "bank").reduce((s, e) => s + Number(e.debit || 0) - Number(e.credit || 0), 0);
    const freeCashFlow = totalRevenue - totalOutflows;
    const totalDebt = funding.reduce((s, f) => s + Number(f.amount || 0), 0);
    const totalRepaid = funding.reduce((s, f) => s + Number(f.total_repaid || 0), 0);
    const remainingDebt = totalDebt - totalRepaid;
    const monthlyRepayment = repayments.slice(0, 1).reduce((s, r) => s + Number(r.net_payable || 0), 0);
    const debtToInflowRatio = totalRevenue > 0 ? (monthlyRepayment / totalRevenue) * 100 : 0;
    const profitToRepaymentRatio = monthlyRepayment > 0 ? accountingProfit / monthlyRepayment : Infinity;
    const activeVehicles = vehicles.filter(v => v.status === "active").length;

    return {
      totalRevenue, pendingRevenue, totalExpenses, paidBills, totalOutflows,
      accountingProfit, arOutstanding, apOutstanding, cashBalance, freeCashFlow,
      totalDebt, totalRepaid, remainingDebt, monthlyRepayment,
      debtToInflowRatio, profitToRepaymentRatio, activeVehicles,
    };
  }, [invoices, expenses, arData, apData, glData, funding, repayments, vehicles, bills]);

  // True when the tenant has no source data ingested yet. Used to avoid
  // showing fabricated default scores (the previous behaviour produced
  // baseline 80–95 scores even for brand-new tenants with empty tables).
  const hasNoData = useMemo(() => (
    invoices.length === 0 &&
    expenses.length === 0 &&
    arData.length === 0 &&
    apData.length === 0 &&
    funding.length === 0 &&
    repayments.length === 0 &&
    vehicles.length === 0 &&
    dispatches.length === 0 &&
    bills.length === 0 &&
    glData.length === 0
  ), [invoices, expenses, arData, apData, funding, repayments, vehicles, dispatches, bills, glData]);

  const emptyAgent = (id: string, name: string, icon: string): AgentOutput => ({
    id, name, icon,
    status: "warning",
    score: 0,
    summary: "No data yet — connect operations to populate this agent.",
    metrics: {},
    signals: [{ type: "warn", message: "No operational data available for this tenant yet." }],
  });

  // ─── Agent: Finance Core (FCA) ────────────────────────────────
  const financeAgent: AgentOutput = useMemo(() => {
    if (hasNoData) return emptyAgent("fca", "Finance Core", "DollarSign");
    const signals: AgentOutput["signals"] = [];
    let score = 85;

    if (core.freeCashFlow < core.accountingProfit * 0.5) {
      signals.push({ type: "warn", message: `Cash ≠ Profit gap: ${fmt(core.arOutstanding)} locked in receivables` });
      score -= 15;
    }
    if (core.freeCashFlow < 0) {
      signals.push({ type: "block", message: "Negative free cash flow - outflows exceed inflows" });
      score -= 30;
    }
    if (core.accountingProfit > 0 && core.freeCashFlow > 0) {
      signals.push({ type: "recommend", message: "Cash flow healthy - consider reinvestment" });
    }

    return {
      id: "fca", name: "Finance Core", icon: "DollarSign",
      status: score >= 70 ? "healthy" : score >= 40 ? "warning" : "critical",
      score: Math.max(0, score),
      summary: `Revenue: ${fmt(core.totalRevenue)} | Profit: ${fmt(core.accountingProfit)} | FCF: ${fmt(core.freeCashFlow)}`,
      metrics: { revenue: core.totalRevenue, profit: core.accountingProfit, fcf: core.freeCashFlow, arOutstanding: core.arOutstanding, apOutstanding: core.apOutstanding },
      signals,
    };
  }, [core]);

  // ─── Agent: Fleet Performance (FPA) ───────────────────────────
  const fleetAgent: AgentOutput = useMemo(() => {
    if (hasNoData) return emptyAgent("fpa", "Fleet Performance", "Truck");
    const signals: AgentOutput["signals"] = [];
    const now = new Date();
    const monthTrips = dispatches.filter(d => {
      const c = new Date(d.created_at);
      return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear();
    });
    const avgTrips = core.activeVehicles > 0 ? monthTrips.length / core.activeVehicles : 0;
    const utilRate = Math.min(100, (avgTrips / 20) * 100);
    const revenuePerTruck = core.activeVehicles > 0 ? core.totalRevenue / core.activeVehicles : 0;
    let score = Math.round(utilRate);

    if (utilRate < 50) {
      signals.push({ type: "warn", message: `Fleet utilization at ${utilRate.toFixed(0)}% - idle trucks costing money` });
    }
    if (utilRate < 30) {
      signals.push({ type: "block", message: "Do NOT acquire new assets - utilization below 30%" });
      score = Math.max(0, score - 20);
    }
    if (utilRate > 85) {
      signals.push({ type: "recommend", message: "High utilization - consider fleet expansion" });
    }

    return {
      id: "fpa", name: "Fleet Performance", icon: "Truck",
      status: score >= 60 ? "healthy" : score >= 35 ? "warning" : "critical",
      score: Math.max(0, score),
      summary: `${core.activeVehicles} active trucks | ${utilRate.toFixed(0)}% utilization | ${fmt(revenuePerTruck)}/truck`,
      metrics: { activeTrucks: core.activeVehicles, trips: monthTrips.length, utilization: `${utilRate.toFixed(0)}%`, revenuePerTruck },
      signals,
    };
  }, [core, dispatches, vehicles]);

  // ─── Agent: Debt & Financing (DFA) ────────────────────────────
  const debtAgent: AgentOutput = useMemo(() => {
    if (hasNoData) return emptyAgent("dfa", "Debt & Financing", "Wallet");
    const signals: AgentOutput["signals"] = [];
    let score = 90;

    if (core.debtToInflowRatio > 40) {
      signals.push({ type: "block", message: `Debt ratio ${core.debtToInflowRatio.toFixed(1)}% > 40% safe limit - block new acquisitions` });
      score -= 35;
    } else if (core.debtToInflowRatio > 25) {
      signals.push({ type: "warn", message: `Debt ratio at ${core.debtToInflowRatio.toFixed(1)}% - approaching safe limit` });
      score -= 15;
    }
    if (core.profitToRepaymentRatio < 2 && core.monthlyRepayment > 0) {
      signals.push({ type: "block", message: `Profit only ${core.profitToRepaymentRatio.toFixed(1)}× repayment (must be ≥2×)` });
      score -= 25;
    }
    const buffer = core.monthlyRepayment * 3;
    if (core.cashBalance < buffer && core.monthlyRepayment > 0) {
      signals.push({ type: "block", message: `Cash buffer ${fmt(core.cashBalance)} < required ${fmt(buffer)}` });
      score -= 20;
    }
    if (core.remainingDebt === 0) {
      signals.push({ type: "recommend", message: "No active debt - strong position for expansion" });
    }

    return {
      id: "dfa", name: "Debt & Financing", icon: "Wallet",
      status: score >= 60 ? "healthy" : score >= 30 ? "warning" : "critical",
      score: Math.max(0, score),
      summary: `Debt: ${fmt(core.remainingDebt)} | Repayment: ${fmt(core.monthlyRepayment)}/mo | Ratio: ${core.debtToInflowRatio.toFixed(1)}%`,
      metrics: { totalDebt: core.remainingDebt, monthlyRepayment: core.monthlyRepayment, debtRatio: `${core.debtToInflowRatio.toFixed(1)}%`, profitCoverage: `${core.profitToRepaymentRatio === Infinity ? "∞" : core.profitToRepaymentRatio.toFixed(1)}×` },
      signals,
    };
  }, [core]);

  // ─── Agent: Tax & Compliance (TCA) ────────────────────────────
  const taxAgent: AgentOutput = useMemo(() => {
    if (hasNoData) return emptyAgent("tca", "Tax & Compliance", "ShieldCheck");
    const signals: AgentOutput["signals"] = [];
    const taxableProfit = Math.max(0, core.accountingProfit);
    const cit = taxableProfit * 0.30;
    const tet = taxableProfit * 0.025;
    const minimumTax = core.totalRevenue * 0.005;
    const appliedCIT = Math.max(cit, minimumTax);
    const totalTax = appliedCIT + tet;
    let score = 80;

    if (totalTax > core.freeCashFlow * 0.5) {
      signals.push({ type: "warn", message: `Tax liability ${fmt(totalTax)} exceeds 50% of FCF` });
      score -= 20;
    }
    if (cit < minimumTax) {
      signals.push({ type: "warn", message: `Minimum tax (${fmt(minimumTax)}) applied instead of CIT (${fmt(cit)})` });
    }
    signals.push({ type: "recommend", message: `Buy assets to reduce taxable profit via capital allowance` });

    return {
      id: "tca", name: "Tax & Compliance", icon: "ShieldCheck",
      status: score >= 60 ? "healthy" : score >= 40 ? "warning" : "critical",
      score: Math.max(0, score),
      summary: `CIT: ${fmt(appliedCIT)} | TET: ${fmt(tet)} | Total: ${fmt(totalTax)}`,
      metrics: { cit: appliedCIT, tet, minimumTax, totalTax, taxableProfit },
      signals,
    };
  }, [core]);

  // ─── Agent: Risk Stress Simulation (RSA) ──────────────────────
  const riskAgent: AgentOutput = useMemo(() => {
    if (hasNoData) return emptyAgent("rsa", "Risk & Stress", "AlertTriangle");
    const signals: AgentOutput["signals"] = [];
    const scenarios = {
      paymentDelay: core.totalRevenue * 0.5 - core.totalOutflows,
      utilizationDrop: core.totalRevenue * 0.7 - core.totalOutflows * 0.85,
      costSpike: core.totalRevenue - core.totalOutflows * 1.2,
      worstCase: core.totalRevenue * 0.5 - core.totalOutflows * 1.2,
    };
    let score = 80;

    const survived = Object.values(scenarios).filter(v => v > 0).length;

    if (scenarios.worstCase < 0) {
      signals.push({ type: "block", message: `Worst-case: ${fmt(scenarios.worstCase)} - cannot survive combined stress` });
      score -= 25;
    }
    if (scenarios.paymentDelay < 0) {
      signals.push({ type: "warn", message: `50% payment delay → negative ${fmt(scenarios.paymentDelay)}` });
      score -= 15;
    }
    if (scenarios.costSpike < 0) {
      signals.push({ type: "warn", message: `20% cost spike → negative ${fmt(scenarios.costSpike)}` });
      score -= 10;
    }
    if (survived === 4) {
      signals.push({ type: "recommend", message: "Business survives all stress scenarios - resilient" });
    }

    return {
      id: "rsa", name: "Risk & Stress", icon: "AlertTriangle",
      status: score >= 60 ? "healthy" : score >= 35 ? "warning" : "critical",
      score: Math.max(0, score),
      summary: `${survived}/4 scenarios survived | Worst case: ${fmt(scenarios.worstCase)}`,
      metrics: { paymentDelay: scenarios.paymentDelay, utilizationDrop: scenarios.utilizationDrop, costSpike: scenarios.costSpike, worstCase: scenarios.worstCase },
      signals,
    };
  }, [core]);

  // ─── Agent: Growth Simulation (GSA) ───────────────────────────
  const growthAgent: AgentOutput = useMemo(() => {
    if (hasNoData) return emptyAgent("gsa", "Growth Simulation", "TrendingUp");
    const signals: AgentOutput["signals"] = [];
    const profitPerTruck = core.activeVehicles > 0 ? core.accountingProfit / core.activeVehicles : 2200000;
    const loanPerTruck = core.monthlyRepayment > 0 ? core.monthlyRepayment / Math.max(funding.length, 1) : 1300000;
    let score = 70;

    const canBuy = core.profitToRepaymentRatio >= 2 && core.debtToInflowRatio <= 40 && core.cashBalance >= core.monthlyRepayment * 3;

    if (canBuy) {
      signals.push({ type: "recommend", message: `BUY NOW: All safety thresholds met. Estimated ROI: ${fmt(profitPerTruck)}/truck/mo` });
      score = 90;
    } else {
      const reasons: string[] = [];
      if (core.profitToRepaymentRatio < 2) reasons.push("profit < 2× repayment");
      if (core.debtToInflowRatio > 40) reasons.push("debt ratio > 40%");
      if (core.cashBalance < core.monthlyRepayment * 3) reasons.push("cash buffer insufficient");
      signals.push({ type: "block", message: `WAIT: ${reasons.join(", ")}` });
      score = 35;
    }

    return {
      id: "gsa", name: "Growth Simulation", icon: "TrendingUp",
      status: canBuy ? "healthy" : "warning",
      score,
      summary: `Fleet: ${core.activeVehicles} trucks | ${canBuy ? "Ready to expand" : "Hold expansion"}`,
      metrics: { fleet: core.activeVehicles, profitPerTruck, loanPerTruck, canBuy: canBuy ? "Yes" : "No" },
      signals,
    };
  }, [core, funding]);

  // ─── Agent: Reconciliation (RA) ───────────────────────────────
  const reconAgent: AgentOutput = useMemo(() => {
    if (hasNoData) return emptyAgent("ra", "Reconciliation", "FileText");
    const signals: AgentOutput["signals"] = [];
    const unpaidInvoices = invoices.filter(i => i.status === "pending" || i.status === "overdue").length;
    const unpaidBills = bills.filter(b => b.payment_status !== "paid").length;
    const overdueInvoices = invoices.filter(i => i.status === "overdue").length;
    let score = 85;

    if (overdueInvoices > 5) {
      signals.push({ type: "warn", message: `${overdueInvoices} overdue invoices - cash leak risk` });
      score -= 20;
    }
    if (unpaidBills > 10) {
      signals.push({ type: "warn", message: `${unpaidBills} unpaid bills - vendor relationships at risk` });
      score -= 10;
    }
    if (unpaidInvoices === 0 && unpaidBills === 0) {
      signals.push({ type: "recommend", message: "All records reconciled - books are clean" });
      score = 95;
    }

    return {
      id: "ra", name: "Reconciliation", icon: "FileText",
      status: score >= 70 ? "healthy" : score >= 40 ? "warning" : "critical",
      score: Math.max(0, score),
      summary: `${unpaidInvoices} unpaid invoices | ${unpaidBills} unpaid bills | ${overdueInvoices} overdue`,
      metrics: { unpaidInvoices, unpaidBills, overdueInvoices },
      signals,
    };
  }, [invoices, bills]);

  // ─── Decision Orchestrator (DOA) ──────────────────────────────
  const agents = useMemo(() => [financeAgent, fleetAgent, debtAgent, taxAgent, riskAgent, growthAgent, reconAgent], [financeAgent, fleetAgent, debtAgent, taxAgent, riskAgent, growthAgent, reconAgent]);

  const orchestratorDecision: OrchestratorDecision = useMemo(() => {
    const allSignals = agents.flatMap(a => a.signals.map(s => ({ ...s, agent: a.name })));
    const blocks = allSignals.filter(s => s.type === "block");
    const warnings = allSignals.filter(s => s.type === "warn");
    const recommendations = allSignals.filter(s => s.type === "recommend");

    const avgScore = agents.reduce((s, a) => s + a.score, 0) / agents.length;
    const criticalAgents = agents.filter(a => a.status === "critical");

    let decision: string;
    let confidence: number;
    const reasoning: string[] = [];
    const actions: OrchestratorDecision["actions"] = [];

    if (hasNoData) {
      return {
        decision: "INSUFFICIENT DATA - Connect operations to activate decisioning.",
        confidence: 0,
        reasoning: ["No invoices, expenses, fleet or ledger data found for this tenant yet."],
        actions: [],
      };
    }

    if (criticalAgents.length >= 2) {
      decision = "SURVIVAL MODE - Freeze all expansion. Protect cash.";
      confidence = 95;
      reasoning.push(`${criticalAgents.length} agents in critical state`);
      blocks.forEach(b => {
        reasoning.push(`[BLOCK] ${b.message}`);
        actions.push({ label: b.message, type: "block", detail: `Source: ${(b as any).agent}` });
      });
    } else if (blocks.length > 0) {
      decision = "HOLD - Address blocking issues before growth.";
      confidence = 85;
      blocks.forEach(b => {
        reasoning.push(`[BLOCK] ${b.message}`);
        actions.push({ label: b.message, type: "block", detail: `Source: ${(b as any).agent}` });
      });
      warnings.forEach(w => {
        reasoning.push(`[WARN] ${w.message}`);
        actions.push({ label: w.message, type: "warn", detail: `Source: ${(w as any).agent}` });
      });
    } else if (warnings.length > 2) {
      decision = "CAUTION - Multiple warnings. Monitor closely.";
      confidence = 70;
      warnings.forEach(w => reasoning.push(`[WARN] ${w.message}`));
    } else {
      decision = "GROWTH MODE - Safe to expand. Execute recommendations.";
      confidence = avgScore > 80 ? 90 : 75;
      recommendations.forEach(r => {
        reasoning.push(`[GO] ${r.message}`);
        actions.push({ label: r.message, type: "recommend", detail: `Source: ${(r as any).agent}` });
      });
    }

    return { decision, confidence, reasoning, actions };
  }, [agents, hasNoData]);

  const systemHealth = useMemo(() => {
    const avg = agents.reduce((s, a) => s + a.score, 0) / agents.length;
    return { score: Math.round(avg), status: avg >= 70 ? "healthy" : avg >= 40 ? "warning" : "critical" as const };
  }, [agents]);

  return {
    agents,
    orchestratorDecision,
    systemHealth,
    core,
    financeAgent,
    fleetAgent,
    debtAgent,
    taxAgent,
    riskAgent,
    growthAgent,
    reconAgent,
  };
}
