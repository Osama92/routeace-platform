import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, TrendingDown, DollarSign, Landmark, BarChart3, Users,
  Building2, Receipt, Scale, ShieldCheck, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";

interface KPIItem {
  name: string;
  value: string;
  numericValue: number;
  description: string;
  formula: string;
  trend: "up" | "down" | "neutral";
  health: "good" | "warning" | "critical";
}

interface KPICategory {
  key: string;
  label: string;
  icon: React.ElementType;
  kpis: KPIItem[];
}

const healthColor = (h: string) =>
  h === "good" ? "text-green-600" : h === "warning" ? "text-yellow-600" : "text-red-600";

const healthBg = (h: string) =>
  h === "good" ? "bg-green-500/10" : h === "warning" ? "bg-yellow-500/10" : "bg-red-500/10";

const trendIcon = (t: string) =>
  t === "up" ? <ArrowUpRight className="w-3.5 h-3.5" /> : t === "down" ? <ArrowDownRight className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />;

const pct = (n: number, d: number) => (d === 0 ? 0 : (n / d) * 100);
const ratio = (n: number, d: number) => (d === 0 ? 0 : n / d);
const days = (n: number, d: number) => (d === 0 ? 0 : (n / d) * 365);
const fmt = (v: number, suffix = "") => `${v.toFixed(2)}${suffix}`;
const fmtM = (v: number) => `₦${(v / 1_000_000).toFixed(2)}M`;
const classify = (v: number, goodMin: number, warnMin: number): "good" | "warning" | "critical" =>
  v >= goodMin ? "good" : v >= warnMin ? "warning" : "critical";
const classifyInverse = (v: number, goodMax: number, warnMax: number): "good" | "warning" | "critical" =>
  v <= goodMax ? "good" : v <= warnMax ? "warning" : "critical";

const FinanceKPIIntelligence = () => {
  const [activeCategory, setActiveCategory] = useState("accounting");

  const { data: kpiData, isLoading } = useQuery({
    queryKey: ["finance-kpi-intelligence"],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

      const [
        invoicesRes, prevInvoicesRes, expensesRes, prevExpensesRes,
        arRes, apRes, paymentsRes, cashTxRes,
        assetProfRes, cashDailyRes, ledgerRes, capitalRes
      ] = await Promise.all([
        supabase.from("invoices").select("total_amount, status, tax_amount, created_at").gte("created_at", startOfMonth),
        supabase.from("invoices").select("total_amount, status, tax_amount").gte("created_at", startOfPrevMonth).lte("created_at", endOfPrevMonth),
        supabase.from("expenses").select("amount, approval_status, category, created_at").gte("created_at", startOfMonth),
        supabase.from("expenses").select("amount, approval_status").gte("created_at", startOfPrevMonth).lte("created_at", endOfPrevMonth),
        supabase.from("accounts_receivable").select("amount_due, amount_paid, balance, status, due_date, posting_date"),
        supabase.from("accounts_payable").select("amount_due, amount_paid, balance, status, due_date, posting_date"),
        supabase.from("ar_payments").select("amount, payment_date").gte("payment_date", startOfYear),
        supabase.from("cash_transactions").select("amount, transaction_type, category, transaction_date").gte("transaction_date", startOfMonth),
        supabase.from("asset_profitability").select("total_revenue, total_cost, net_profit, profit_margin_percent, depreciation_cost, fuel_cost, maintenance_cost").gte("period_start", startOfMonth),
        supabase.from("cash_balance_daily").select("opening_balance, closing_balance, total_inflow, total_outflow, snapshot_date").order("snapshot_date", { ascending: false }).limit(30),
        supabase.from("accounting_ledger").select("account_type, debit, credit, entry_date").gte("entry_date", startOfYear),
        supabase.from("capital_funding").select("amount, funding_type, status, interest_rate_annual, total_repaid"),
      ]);

      const invoices = invoicesRes.data || [];
      const prevInvoices = prevInvoicesRes.data || [];
      const expenses = expensesRes.data || [];
      const prevExpenses = prevExpensesRes.data || [];
      const ar = arRes.data || [];
      const ap = apRes.data || [];
      const payments = paymentsRes.data || [];
      const cashTx = cashTxRes.data || [];
      const assets = assetProfRes.data || [];
      const cashDaily = cashDailyRes.data || [];
      const ledger = ledgerRes.data || [];
      const capital = capitalRes.data || [];

      // === Derived values ===
      const totalRevenue = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
      const prevRevenue = prevInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);
      const totalExpenseAmt = expenses.filter(e => e.approval_status === "approved").reduce((s, e) => s + (e.amount || 0), 0);
      const prevExpenseAmt = prevExpenses.filter(e => e.approval_status === "approved").reduce((s, e) => s + (e.amount || 0), 0);
      const cogs = expenses.filter(e => e.approval_status === "approved" && ["fuel", "maintenance", "driver_salary", "vehicle_lease"].includes(e.category || "")).reduce((s, e) => s + (e.amount || 0), 0);
      const grossProfit = totalRevenue - cogs;
      const netIncome = totalRevenue - totalExpenseAmt;
      const totalTax = invoices.reduce((s, i) => s + (i.tax_amount || 0), 0);

      const totalAR = ar.filter(r => r.status !== "paid").reduce((s, r) => s + (r.balance || 0), 0);
      const avgAR = totalAR; // simplified - current outstanding
      const totalAPBalance = ap.filter(r => r.status !== "paid").reduce((s, r) => s + (r.balance || 0), 0);
      const avgAP = totalAPBalance;
      const totalAPPurchases = ap.reduce((s, r) => s + (r.amount_due || 0), 0);

      const cashInflows = cashTx.filter(t => t.transaction_type === "inflow").reduce((s, t) => s + (t.amount || 0), 0);
      const cashOutflows = cashTx.filter(t => t.transaction_type === "outflow").reduce((s, t) => s + (t.amount || 0), 0);
      const latestCashBalance = cashDaily.length > 0 ? cashDaily[0].closing_balance : 0;

      const totalAssetRevenue = assets.reduce((s, a) => s + (a.total_revenue || 0), 0);
      const totalAssetCost = assets.reduce((s, a) => s + (a.total_cost || 0), 0);
      const totalDepreciation = assets.reduce((s, a) => s + (a.depreciation_cost || 0), 0);

      const totalDebt = capital.filter(c => c.funding_type === "debt" && c.status === "active").reduce((s, c) => s + (c.amount || 0), 0);
      const totalEquity = capital.filter(c => c.funding_type === "equity").reduce((s, c) => s + (c.amount || 0), 0) || 1;
      const totalAssets = latestCashBalance + totalAR + totalAssetRevenue;
      const totalLiabilities = totalAPBalance + totalDebt;

      const arOverdue = ar.filter(r => r.status !== "paid" && r.due_date && new Date(r.due_date) < now);
      const overdueAR = arOverdue.reduce((s, r) => s + (r.balance || 0), 0);

      const dso = days(avgAR, totalRevenue * 12);
      const dpo = days(avgAP, totalAPPurchases * 12);
      const ccc = dso - dpo;

      const burnRate = cashOutflows - cashInflows;
      const dailyExpense = totalExpenseAmt / 30;
      const cashReservesDays = dailyExpense > 0 ? latestCashBalance / dailyExpense : 999;

      const revenueGrowth = pct(totalRevenue - prevRevenue, prevRevenue || 1);

      // === Build KPI categories ===
      const categories: KPICategory[] = [
        {
          key: "accounting", label: "Accounting", icon: Landmark,
          kpis: [
            { name: "AR Turnover", value: fmt(ratio(totalRevenue * 12, avgAR || 1), "x"), numericValue: ratio(totalRevenue * 12, avgAR || 1), description: "How quickly you collect outstanding debts", formula: "Net Credit Sales / Avg AR", trend: "up", health: classify(ratio(totalRevenue * 12, avgAR || 1), 8, 4) },
            { name: "AP Turnover", value: fmt(ratio(totalAPPurchases * 12, avgAP || 1), "x"), numericValue: ratio(totalAPPurchases * 12, avgAP || 1), description: "How quickly you pay suppliers", formula: "Total Purchases / Avg AP", trend: "neutral", health: classify(ratio(totalAPPurchases * 12, avgAP || 1), 6, 3) },
            { name: "Working Capital Ratio", value: fmt(ratio(totalAR + latestCashBalance, totalLiabilities || 1), "x"), numericValue: ratio(totalAR + latestCashBalance, totalLiabilities || 1), description: "Ability to meet short-term obligations", formula: "Current Assets / Current Liabilities", trend: ratio(totalAR + latestCashBalance, totalLiabilities || 1) >= 1.5 ? "up" : "down", health: classify(ratio(totalAR + latestCashBalance, totalLiabilities || 1), 1.5, 1) },
            { name: "Debt-to-Equity Ratio", value: fmt(ratio(totalDebt, totalEquity), "x"), numericValue: ratio(totalDebt, totalEquity), description: "Financing from debt vs equity", formula: "Total Debt / Total Equity", trend: ratio(totalDebt, totalEquity) <= 1.5 ? "up" : "down", health: classifyInverse(ratio(totalDebt, totalEquity), 1.5, 3) },
            { name: "Gross Profit Margin", value: fmt(pct(grossProfit, totalRevenue || 1), "%"), numericValue: pct(grossProfit, totalRevenue || 1), description: "Revenue remaining after COGS", formula: "(Revenue - COGS) / Revenue", trend: pct(grossProfit, totalRevenue || 1) >= 30 ? "up" : "down", health: classify(pct(grossProfit, totalRevenue || 1), 30, 15) },
            { name: "Net Profit Margin", value: fmt(pct(netIncome, totalRevenue || 1), "%"), numericValue: pct(netIncome, totalRevenue || 1), description: "Revenue remaining after all expenses", formula: "Net Income / Revenue", trend: pct(netIncome, totalRevenue || 1) >= 10 ? "up" : "down", health: classify(pct(netIncome, totalRevenue || 1), 10, 0) },
            { name: "Return on Assets (ROA)", value: fmt(pct(netIncome, totalAssets || 1), "%"), numericValue: pct(netIncome, totalAssets || 1), description: "Profit generated per asset value", formula: "Net Income / Total Assets", trend: "up", health: classify(pct(netIncome, totalAssets || 1), 5, 2) },
            { name: "Return on Equity (ROE)", value: fmt(pct(netIncome, totalEquity), "%"), numericValue: pct(netIncome, totalEquity), description: "Profit from shareholder investment", formula: "Net Income / Total Equity", trend: "up", health: classify(pct(netIncome, totalEquity), 15, 5) },
            { name: "Inventory Turnover", value: "N/A (service)", numericValue: 0, description: "COGS / Avg Inventory - N/A for logistics", formula: "COGS / Avg Inventory", trend: "neutral", health: "good" },
            { name: "Fixed Asset Turnover", value: fmt(ratio(totalRevenue * 12, totalAssetCost || 1), "x"), numericValue: ratio(totalRevenue * 12, totalAssetCost || 1), description: "Revenue generated per fixed asset value", formula: "Revenue / Fixed Assets", trend: "up", health: classify(ratio(totalRevenue * 12, totalAssetCost || 1), 2, 1) },
          ]
        },
        {
          key: "cash", label: "Cash", icon: DollarSign,
          kpis: [
            { name: "Cash Burn Rate", value: fmtM(burnRate), numericValue: burnRate, description: "Net cash spent monthly", formula: "Cash Spent - Cash Received", trend: burnRate <= 0 ? "up" : "down", health: burnRate <= 0 ? "good" : "warning" },
            { name: "Avg Days Delinquent", value: fmt(Math.max(0, dso - 30), " days"), numericValue: Math.max(0, dso - 30), description: "DSO minus best possible DSO", formula: "DSO - BPDSO", trend: "neutral", health: classifyInverse(Math.max(0, dso - 30), 10, 30) },
            { name: "Operating Cash Flow", value: fmtM(cashInflows - cashOutflows), numericValue: cashInflows - cashOutflows, description: "Cash from daily operations", formula: "Net Income + Non-Cash − ΔWC", trend: (cashInflows - cashOutflows) >= 0 ? "up" : "down", health: (cashInflows - cashOutflows) >= 0 ? "good" : "critical" },
            { name: "Free Cash Flow", value: fmtM(cashInflows - cashOutflows - totalDepreciation), numericValue: cashInflows - cashOutflows - totalDepreciation, description: "OCF minus capital expenditures", formula: "OCF - Interest - Asset Purchases", trend: (cashInflows - cashOutflows - totalDepreciation) >= 0 ? "up" : "down", health: (cashInflows - cashOutflows - totalDepreciation) >= 0 ? "good" : "warning" },
            { name: "Overdues Ratio", value: fmt(pct(overdueAR, totalAR || 1), "%"), numericValue: pct(overdueAR, totalAR || 1), description: "Overdue receivables vs total", formula: "Overdues / Total Receivables", trend: pct(overdueAR, totalAR || 1) <= 20 ? "up" : "down", health: classifyInverse(pct(overdueAR, totalAR || 1), 15, 30) },
            { name: "Days Inventory O/S", value: "N/A (service)", numericValue: 0, description: "Avg Inventory holding period", formula: "Avg Inventory / COGS × 365", trend: "neutral", health: "good" },
            { name: "Days Sales O/S (DSO)", value: fmt(dso, " days"), numericValue: dso, description: "Average collection period", formula: "Avg AR / Annual Sales × 365", trend: dso <= 45 ? "up" : "down", health: classifyInverse(dso, 45, 90) },
            { name: "Days Payable O/S (DPO)", value: fmt(dpo, " days"), numericValue: dpo, description: "Average payment period to suppliers", formula: "Avg AP / COGS × 365", trend: "neutral", health: classify(dpo, 30, 15) },
            { name: "Cash Conversion Cycle", value: fmt(ccc, " days"), numericValue: ccc, description: "Days from cash out to cash in", formula: "DSO + DIO − DPO", trend: ccc <= 30 ? "up" : "down", health: classifyInverse(ccc, 30, 60) },
            { name: "Cash Reserves (Days)", value: fmt(Math.min(cashReservesDays, 999), " days"), numericValue: cashReservesDays, description: "How long cash lasts at current burn", formula: "Cash Reserves / Avg Daily Expenses", trend: cashReservesDays >= 90 ? "up" : "down", health: classify(cashReservesDays, 90, 30) },
          ]
        },
        {
          key: "ceo", label: "CEO", icon: BarChart3,
          kpis: [
            { name: "Revenue Growth", value: fmt(revenueGrowth, "%"), numericValue: revenueGrowth, description: "Period-over-period revenue increase", formula: "(Current - Previous) / Previous", trend: revenueGrowth > 0 ? "up" : "down", health: classify(revenueGrowth, 10, 0) },
            { name: "Gross Profit Margin", value: fmt(pct(grossProfit, totalRevenue || 1), "%"), numericValue: pct(grossProfit, totalRevenue || 1), description: "Revenue after COGS", formula: "(Revenue - COGS) / Revenue", trend: "up", health: classify(pct(grossProfit, totalRevenue || 1), 30, 15) },
            { name: "Net Profit Margin", value: fmt(pct(netIncome, totalRevenue || 1), "%"), numericValue: pct(netIncome, totalRevenue || 1), description: "Revenue after all expenses", formula: "(Net Income / Revenue) × 100", trend: netIncome > 0 ? "up" : "down", health: classify(pct(netIncome, totalRevenue || 1), 10, 0) },
            { name: "Return on Investment", value: fmt(pct(netIncome, totalAssetCost || 1), "%"), numericValue: pct(netIncome, totalAssetCost || 1), description: "Gain relative to investment cost", formula: "(Gain - Cost) / Cost", trend: "up", health: classify(pct(netIncome, totalAssetCost || 1), 15, 5) },
            { name: "Earnings Per Share", value: "N/A (private)", numericValue: 0, description: "Net income per outstanding share", formula: "(Net Income - Pref Div) / Avg Shares", trend: "neutral", health: "good" },
            { name: "Customer Acq. Cost", value: fmtM(0), numericValue: 0, description: "Cost to acquire a new customer", formula: "Sales+Marketing / New Customers", trend: "neutral", health: "good" },
            { name: "Customer Lifetime Value", value: fmtM(0), numericValue: 0, description: "Total value over customer lifespan", formula: "Avg Annual Rev × Avg Lifespan", trend: "neutral", health: "good" },
            { name: "Employee Engagement", value: "-", numericValue: 0, description: "Staff satisfaction & commitment", formula: "Survey-based score", trend: "neutral", health: "good" },
            { name: "Employee Turnover", value: "-", numericValue: 0, description: "Staff departure rate", formula: "(Leavers / Avg Headcount) × 100", trend: "neutral", health: "good" },
            { name: "Cash Flow", value: fmtM(cashInflows - cashOutflows), numericValue: cashInflows - cashOutflows, description: "Total cash inflows and outflows", formula: "Operating + Investing + Financing CF", trend: (cashInflows - cashOutflows) >= 0 ? "up" : "down", health: (cashInflows - cashOutflows) >= 0 ? "good" : "critical" },
          ]
        },
        {
          key: "saas", label: "SaaS", icon: TrendingUp,
          kpis: [
            { name: "Customer Churn Rate", value: "-", numericValue: 0, description: "% of customers lost", formula: "Lost / Total Customers", trend: "neutral", health: "good" },
            { name: "New Buyer Growth", value: "-", numericValue: 0, description: "Speed of new customer acquisition", formula: "(New - Prev New) / Prev New", trend: "neutral", health: "good" },
            { name: "Lifetime Value", value: "-", numericValue: 0, description: "Revenue from customer over retention", formula: "Customer Value × Avg Lifespan", trend: "neutral", health: "good" },
            { name: "Customer Acq. Cost", value: "-", numericValue: 0, description: "Cost to get a new customer", formula: "Sales+Mktg / New Customers", trend: "neutral", health: "good" },
            { name: "Net Burn Rate", value: fmtM(Math.abs(burnRate)), numericValue: Math.abs(burnRate), description: "Net cash spent monthly", formula: "Cash Spent − Cash Received", trend: burnRate <= 0 ? "up" : "down", health: burnRate <= 0 ? "good" : "warning" },
            { name: "Runway", value: fmt(dailyExpense > 0 ? latestCashBalance / (burnRate > 0 ? burnRate : 1) : 999, " months"), numericValue: dailyExpense > 0 ? latestCashBalance / (burnRate > 0 ? burnRate : 1) : 999, description: "Months until cash runs out", formula: "Cash Balance / Burn Rate", trend: "up", health: classify(latestCashBalance / (burnRate > 0 ? burnRate : 1), 12, 6) },
            { name: "ARPU", value: "-", numericValue: 0, description: "Average revenue per user/client", formula: "Total Revenue / Total Customers", trend: "neutral", health: "good" },
            { name: "SaaS Quick Ratio", value: "-", numericValue: 0, description: "Revenue added vs lost", formula: "(New MRR + Expansion) / (Churn + Contraction)", trend: "neutral", health: "good" },
            { name: "MRR", value: fmtM(totalRevenue), numericValue: totalRevenue, description: "Monthly recurring revenue", formula: "Customers × Avg Billed", trend: totalRevenue > prevRevenue ? "up" : "down", health: classify(totalRevenue, 1000000, 100000) },
            { name: "TAM", value: "-", numericValue: 0, description: "Total addressable market", formula: "Contract Value × Potential Clients", trend: "neutral", health: "good" },
          ]
        },
        {
          key: "investors", label: "Investors", icon: Scale,
          kpis: [
            { name: "ROI", value: fmt(pct(netIncome, totalAssetCost || 1), "%"), numericValue: pct(netIncome, totalAssetCost || 1), description: "Return relative to investment", formula: "Income / Asset Invested", trend: "up", health: classify(pct(netIncome, totalAssetCost || 1), 15, 5) },
            { name: "ROE", value: fmt(pct(netIncome, totalEquity), "%"), numericValue: pct(netIncome, totalEquity), description: "Return on shareholders' equity", formula: "Net Income / Shareholders' Equity", trend: "up", health: classify(pct(netIncome, totalEquity), 15, 5) },
            { name: "EPS", value: "N/A (private)", numericValue: 0, description: "Profitability per share", formula: "Net Income / Avg Shares", trend: "neutral", health: "good" },
            { name: "P/E Ratio", value: "N/A (private)", numericValue: 0, description: "Share price vs earnings", formula: "Market Price / EPS", trend: "neutral", health: "good" },
            { name: "Dividend Yield", value: "N/A", numericValue: 0, description: "Return from dividends", formula: "Annual Div / Market Price", trend: "neutral", health: "good" },
            { name: "Debt-to-Equity", value: fmt(ratio(totalDebt, totalEquity), "x"), numericValue: ratio(totalDebt, totalEquity), description: "Financial leverage", formula: "Total Liabilities / Equity", trend: ratio(totalDebt, totalEquity) <= 1.5 ? "up" : "down", health: classifyInverse(ratio(totalDebt, totalEquity), 1.5, 3) },
            { name: "Current Ratio", value: fmt(ratio(totalAR + latestCashBalance, totalLiabilities || 1), "x"), numericValue: ratio(totalAR + latestCashBalance, totalLiabilities || 1), description: "Ability to pay short-term liabilities", formula: "Current Assets / Current Liabilities", trend: "up", health: classify(ratio(totalAR + latestCashBalance, totalLiabilities || 1), 1.5, 1) },
            { name: "Quick Ratio", value: fmt(ratio(latestCashBalance, totalLiabilities || 1), "x"), numericValue: ratio(latestCashBalance, totalLiabilities || 1), description: "Liquid assets vs liabilities", formula: "(Current Assets − Inventory) / Liabilities", trend: "up", health: classify(ratio(latestCashBalance, totalLiabilities || 1), 1, 0.5) },
            { name: "Gross Margin Ratio", value: fmt(pct(grossProfit, totalRevenue || 1), "%"), numericValue: pct(grossProfit, totalRevenue || 1), description: "Profitability of products/services", formula: "(Revenue − COGS) / Revenue", trend: "up", health: classify(pct(grossProfit, totalRevenue || 1), 30, 15) },
            { name: "Net Promoter Score", value: "-", numericValue: 0, description: "Customer satisfaction & loyalty", formula: "% Promoters − % Detractors", trend: "neutral", health: "good" },
          ]
        },
        {
          key: "headcount", label: "Headcount", icon: Users,
          kpis: [
            { name: "Headcount", value: "-", numericValue: 0, description: "Active employees (full + part time)", formula: "FT + PT + Leasing", trend: "neutral", health: "good" },
            { name: "FTE", value: "-", numericValue: 0, description: "Full-time equivalent workers", formula: "Hours in Contract / Standard Hours", trend: "neutral", health: "good" },
            { name: "Turnover Rate", value: "-", numericValue: 0, description: "% of staff leaving", formula: "Departures / Avg Headcount", trend: "neutral", health: "good" },
            { name: "Natural Attrition", value: "-", numericValue: 0, description: "Planned retirements + contract ends", formula: "Planned Retirement + Contract End", trend: "neutral", health: "good" },
            { name: "Capacity", value: "-", numericValue: 0, description: "Available FTE hours", formula: "FTEs × Period × Available Hours", trend: "neutral", health: "good" },
            { name: "Capacity Increase Flex", value: "-", numericValue: 0, description: "Capacity increase without hiring", formula: "Overtime + Flex Time Available", trend: "neutral", health: "good" },
            { name: "Capacity Decrease Flex", value: "-", numericValue: 0, description: "Capacity decrease without layoffs", formula: "Temp Time + PT Flex", trend: "neutral", health: "good" },
            { name: "Noria Effect", value: "-", numericValue: 0, description: "Compensation changes from turnover", formula: "(New Hires Cost − Leavers Cost) / Prev Cost", trend: "neutral", health: "good" },
            { name: "Absenteeism", value: "-", numericValue: 0, description: "% of time lost to illness", formula: "Illness Days / Total Working Days", trend: "neutral", health: "good" },
            { name: "Time to Fill", value: "-", numericValue: 0, description: "Avg days to fill open position", formula: "Avg(Open Date → Signed Date)", trend: "neutral", health: "good" },
          ]
        },
        {
          key: "capex", label: "CAPEX", icon: Building2,
          kpis: [
            { name: "Acquisition", value: fmtM(totalAssetCost), numericValue: totalAssetCost, description: "Total spent on fixed assets", formula: "Purchase Cost + Direct Costs", trend: "neutral", health: "good" },
            { name: "Commitments", value: "-", numericValue: 0, description: "Future asset purchase commitments", formula: "Future Purchase Contracts", trend: "neutral", health: "good" },
            { name: "Asset Turnover", value: fmt(ratio(totalRevenue * 12, totalAssetCost || 1), "x"), numericValue: ratio(totalRevenue * 12, totalAssetCost || 1), description: "Revenue per fixed asset value", formula: "Revenue / Fixed Assets", trend: "up", health: classify(ratio(totalRevenue * 12, totalAssetCost || 1), 2, 1) },
            { name: "Return on Assets", value: fmt(pct(netIncome, totalAssets || 1), "%"), numericValue: pct(netIncome, totalAssets || 1), description: "Profit per fixed asset value", formula: "Net Income / Fixed Assets", trend: "up", health: classify(pct(netIncome, totalAssets || 1), 5, 2) },
            { name: "ROI", value: fmt(pct(netIncome, totalAssetCost || 1), "%"), numericValue: pct(netIncome, totalAssetCost || 1), description: "Profit per total investment", formula: "Net Income / Total Investment", trend: "up", health: classify(pct(netIncome, totalAssetCost || 1), 15, 5) },
            { name: "Payback Period", value: fmt(ratio(totalAssetCost, (cashInflows - cashOutflows) * 12 || 1), " yrs"), numericValue: ratio(totalAssetCost, (cashInflows - cashOutflows) * 12 || 1), description: "Time to recoup investment", formula: "Investment / Annual Cash Flow", trend: "neutral", health: classifyInverse(ratio(totalAssetCost, (cashInflows - cashOutflows) * 12 || 1), 3, 7) },
            { name: "IRR", value: "-", numericValue: 0, description: "Expected rate of return", formula: "(FV/PV)^(1/n) − 1", trend: "neutral", health: "good" },
            { name: "NPV", value: "-", numericValue: 0, description: "Present value of future cash flows", formula: "Net Cash Flows / (1+r)^n", trend: "neutral", health: "good" },
            { name: "Depreciation", value: fmtM(totalDepreciation), numericValue: totalDepreciation, description: "Asset value consumed over time", formula: "Acquisition / Useful Life", trend: "neutral", health: "good" },
            { name: "Utilization", value: "-", numericValue: 0, description: "Degree of fixed asset usage", formula: "Actual / Max Production × 100%", trend: "neutral", health: "good" },
          ]
        },
        {
          key: "balance", label: "Balance Sheet", icon: Receipt,
          kpis: [
            { name: "Current Ratio", value: fmt(ratio(totalAR + latestCashBalance, totalLiabilities || 1), "x"), numericValue: ratio(totalAR + latestCashBalance, totalLiabilities || 1), description: "Pay short-term liabilities with current assets", formula: "Current Assets / Current Liabilities", trend: "up", health: classify(ratio(totalAR + latestCashBalance, totalLiabilities || 1), 1.5, 1) },
            { name: "Quick Ratio", value: fmt(ratio(latestCashBalance, totalLiabilities || 1), "x"), numericValue: ratio(latestCashBalance, totalLiabilities || 1), description: "Pay liabilities with liquid assets", formula: "(Current Assets − Inventory) / Liabilities", trend: "up", health: classify(ratio(latestCashBalance, totalLiabilities || 1), 1, 0.5) },
            { name: "Debt-to-Equity", value: fmt(ratio(totalLiabilities, totalEquity), "x"), numericValue: ratio(totalLiabilities, totalEquity), description: "Proportion of debt vs equity financing", formula: "Total Liabilities / Equity", trend: ratio(totalLiabilities, totalEquity) <= 2 ? "up" : "down", health: classifyInverse(ratio(totalLiabilities, totalEquity), 2, 4) },
            { name: "Debt Ratio", value: fmt(ratio(totalLiabilities, totalAssets || 1), "x"), numericValue: ratio(totalLiabilities, totalAssets || 1), description: "Proportion of assets financed by debt", formula: "Total Liabilities / Total Assets", trend: ratio(totalLiabilities, totalAssets || 1) <= 0.5 ? "up" : "down", health: classifyInverse(ratio(totalLiabilities, totalAssets || 1), 0.5, 0.8) },
            { name: "Interest Coverage", value: "-", numericValue: 0, description: "Ability to pay interest on debt", formula: "EBIT / Interest Expenses", trend: "neutral", health: "good" },
            { name: "ROA", value: fmt(pct(netIncome, totalAssets || 1), "%"), numericValue: pct(netIncome, totalAssets || 1), description: "Profit from assets", formula: "Net Income / Total Assets", trend: "up", health: classify(pct(netIncome, totalAssets || 1), 5, 2) },
            { name: "ROE", value: fmt(pct(netIncome, totalEquity), "%"), numericValue: pct(netIncome, totalEquity), description: "Profit from shareholder investment", formula: "Net Income / Equity", trend: "up", health: classify(pct(netIncome, totalEquity), 15, 5) },
            { name: "Inventory Turnover", value: "N/A (service)", numericValue: 0, description: "How quickly inventory sells", formula: "COGS / Avg Inventory", trend: "neutral", health: "good" },
            { name: "AR Turnover", value: fmt(ratio(totalRevenue * 12, avgAR || 1), "x"), numericValue: ratio(totalRevenue * 12, avgAR || 1), description: "Speed of payment collection", formula: "Revenue / Avg AR", trend: "up", health: classify(ratio(totalRevenue * 12, avgAR || 1), 8, 4) },
            { name: "Working Capital", value: fmtM((totalAR + latestCashBalance) - totalLiabilities), numericValue: (totalAR + latestCashBalance) - totalLiabilities, description: "Cash available for operations", formula: "Current Assets − Current Liabilities", trend: ((totalAR + latestCashBalance) - totalLiabilities) > 0 ? "up" : "down", health: ((totalAR + latestCashBalance) - totalLiabilities) > 0 ? "good" : "critical" },
          ]
        },
        {
          key: "tax", label: "Tax", icon: ShieldCheck,
          kpis: [
            { name: "Effective Tax Rate", value: fmt(pct(totalTax, totalRevenue || 1), "%"), numericValue: pct(totalTax, totalRevenue || 1), description: "Actual tax paid on income", formula: "Tax Expense / Taxable Income", trend: "neutral", health: classifyInverse(pct(totalTax, totalRevenue || 1), 25, 35) },
            { name: "Marginal Tax Rate", value: "30%", numericValue: 30, description: "Tax on next ₦1 of income (Nigeria CIT)", formula: "ΔTax Liability / ΔTaxable Income", trend: "neutral", health: "good" },
            { name: "Taxable Income", value: fmtM(netIncome > 0 ? netIncome : 0), numericValue: netIncome > 0 ? netIncome : 0, description: "Income subject to tax", formula: "Gross Income − Deductions", trend: "neutral", health: "good" },
            { name: "Tax Provision", value: fmtM(totalTax), numericValue: totalTax, description: "Amount set aside for tax payments", formula: "Current + Deferred Tax Expense", trend: "neutral", health: "good" },
            { name: "Deferred Tax Asset/Liability", value: "-", numericValue: 0, description: "Timing difference between book and tax", formula: "Book Value − Tax Value × Tax Rate", trend: "neutral", health: "good" },
            { name: "Tax Compliance Rating", value: "-", numericValue: 0, description: "Compliance with tax laws", formula: "Filing Errors / Total Filings", trend: "neutral", health: "good" },
            { name: "Tax Audit Rate", value: "-", numericValue: 0, description: "Frequency of tax audits", formula: "Audits / Total Filings", trend: "neutral", health: "good" },
            { name: "Tax Loss Carryforward", value: "-", numericValue: 0, description: "Unused losses for future offset", formula: "Total Losses − Losses Utilized", trend: "neutral", health: "good" },
            { name: "Tax Credits", value: "-", numericValue: 0, description: "Credits to offset tax liability", formula: "Total Credits − Forfeited Credits", trend: "neutral", health: "good" },
            { name: "Effective Tax Planning Rate", value: "-", numericValue: 0, description: "Tax savings from planning", formula: "Tax Savings / Taxable Income", trend: "neutral", health: "good" },
          ]
        },
      ];

      return categories;
    },
    refetchInterval: 60000,
  });

  const categories = kpiData || [];
  const activeData = categories.find(c => c.key === activeCategory);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Financial KPI Intelligence</CardTitle>
          <p className="text-sm text-muted-foreground">
            90 KPIs across 9 domains - Accounting, Cash, CEO, SaaS, Investors, Headcount, CAPEX, Balance Sheet & Tax
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
              {categories.map(cat => (
                <TabsTrigger key={cat.key} value={cat.key} className="text-xs gap-1">
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map(cat => (
              <TabsContent key={cat.key} value={cat.key}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {cat.kpis.map((kpi) => (
                    <div
                      key={kpi.name}
                      className={`rounded-lg border p-4 ${healthBg(kpi.health)} transition-colors`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-semibold">{kpi.name}</span>
                        <span className={`flex items-center gap-0.5 text-xs ${healthColor(kpi.health)}`}>
                          {trendIcon(kpi.trend)}
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {kpi.health}
                          </Badge>
                        </span>
                      </div>
                      <p className="text-2xl font-bold mb-1">{kpi.value}</p>
                      <p className="text-xs text-muted-foreground mb-2">{kpi.description}</p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 font-mono bg-background/50 rounded px-2 py-1">
                        <span>Formula:</span>
                        <span>{kpi.formula}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceKPIIntelligence;
