import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

const CATEGORIES = [
  { key: "transport", label: "Transport / Dispatch" },
  { key: "fuel", label: "Fuel" },
  { key: "3pl_carriers", label: "3PL Carriers" },
  { key: "maintenance", label: "Fleet Maintenance" },
  { key: "other", label: "Operational Expenses" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

function fmt(n: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);
}

interface BudgetRow {
  id?: string;
  organization_id: string;
  budget_year: number;
  budget_period: "monthly" | "quarterly" | "annual";
  period_label: string;
  category: string;
  budget_amount: number;
}

export default function DeptBudgetPlanning() {
  const { organizationId, user } = useAuth();
  const [period, setPeriod] = useState<"monthly" | "quarterly" | "annual">("monthly");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [actuals, setActuals] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState<Record<string, number>>({});

  const periodLabels = useMemo(() => {
    if (period === "monthly") return MONTHS.map((m) => `${m} ${year}`);
    if (period === "quarterly") return QUARTERS.map((q) => `${q} ${year}`);
    return [`${year}`];
  }, [period, year]);

  useEffect(() => {
    if (organizationId) void load();
    // eslint-disable-next-line
  }, [organizationId, period, year]);

  async function load() {
    setLoading(true);
    if (!organizationId) { setLoading(false); return; }
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    const [bRes, expRes, billRes] = await Promise.all([
      supabase.from("dept_budgets" as any).select("*")
        .eq("organization_id", organizationId).eq("budget_year", year).eq("budget_period", period),
      supabase.from("expenses").select("amount,category,expense_date,created_at")
        .eq("organization_id", organizationId)
        .gte("expense_date", start).lte("expense_date", end),
      supabase.from("bills").select("amount,bill_date,created_at")
        .eq("organization_id", organizationId)
        .gte("bill_date", start).lte("bill_date", end),
    ]);
    setBudgets(((bRes.data as any) || []) as BudgetRow[]);

    // Aggregate actuals into period_label x category
    const agg: Record<string, Record<string, number>> = {};
    function bucket(date: string): string {
      const d = new Date(date);
      if (period === "monthly") return `${MONTHS[d.getMonth()]} ${year}`;
      if (period === "quarterly") return `Q${Math.floor(d.getMonth() / 3) + 1} ${year}`;
      return `${year}`;
    }
    function mapCategory(c?: string | null): string {
      const v = (c || "").toLowerCase();
      if (v.includes("fuel")) return "fuel";
      if (v.includes("3pl") || v.includes("carrier") || v.includes("vendor")) return "3pl_carriers";
      if (v.includes("maint") || v.includes("repair")) return "maintenance";
      if (v.includes("transport") || v.includes("dispatch")) return "transport";
      return "other";
    }
    (expRes.data || []).forEach((r: any) => {
      const lbl = bucket(r.expense_date || r.created_at);
      const cat = mapCategory(r.category);
      agg[lbl] = agg[lbl] || {};
      agg[lbl][cat] = (agg[lbl][cat] || 0) + Number(r.amount || 0);
    });
    (billRes.data || []).forEach((r: any) => {
      const lbl = bucket(r.bill_date || r.created_at);
      agg[lbl] = agg[lbl] || {};
      agg[lbl]["3pl_carriers"] = (agg[lbl]["3pl_carriers"] || 0) + Number(r.amount || 0);
    });
    setActuals(agg);
    setEdits({});
    setLoading(false);
  }

  function getBudget(label: string, cat: string): number {
    const k = `${label}|${cat}`;
    if (k in edits) return edits[k];
    const found = budgets.find((b) => b.period_label === label && b.category === cat);
    return found ? Number(found.budget_amount) : 0;
  }
  function setBudget(label: string, cat: string, val: number) {
    setEdits((p) => ({ ...p, [`${label}|${cat}`]: val }));
  }

  async function save() {
    if (!organizationId) return;
    setSaving(true);
    const rows = Object.entries(edits).map(([k, v]) => {
      const [period_label, category] = k.split("|");
      return {
        organization_id: organizationId,
        budget_year: year,
        budget_period: period,
        period_label,
        category,
        budget_amount: v,
        created_by: user?.id,
      };
    });
    if (rows.length === 0) { toast.info("No changes to save"); setSaving(false); return; }
    const { error } = await (supabase.from("dept_budgets" as any) as any).upsert(rows, {
      onConflict: "organization_id,budget_year,period_label,category",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${rows.length} budget cell(s) saved`);
    void load();
  }

  const variances = useMemo(() => {
    const list: Array<{ label: string; cat: string; budget: number; actual: number; over: number; pct: number }> = [];
    periodLabels.forEach((lbl) => {
      CATEGORIES.forEach((c) => {
        const b = getBudget(lbl, c.key);
        const a = (actuals[lbl] || {})[c.key] || 0;
        if (b > 0 && a > b * 1.1) {
          list.push({ label: lbl, cat: c.label, budget: b, actual: a, over: a - b, pct: ((a - b) / b) * 100 });
        }
      });
    });
    return list.sort((a, b) => b.over - a.over);
    // eslint-disable-next-line
  }, [periodLabels, actuals, budgets, edits]);

  const chartData = useMemo(() => {
    return CATEGORIES.map((c) => {
      let budget = 0, actual = 0;
      periodLabels.forEach((lbl) => {
        budget += getBudget(lbl, c.key);
        actual += (actuals[lbl] || {})[c.key] || 0;
      });
      return { category: c.label, Budget: budget, Actual: actual };
    });
    // eslint-disable-next-line
  }, [periodLabels, budgets, edits, actuals]);

  return (
    <DashboardLayout title="Budget Planning" subtitle="Set logistics cost budgets and track actual spend - scoped to your organization.">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Period</label>
            <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Year</label>
            <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || year)} className="w-28" />
          </div>
          <div className="ml-auto">
            <Button onClick={save} disabled={saving || Object.keys(edits).length === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Save Budgets
            </Button>
          </div>
        </div>

        <Tabs defaultValue="setup">
          <TabsList>
            <TabsTrigger value="setup">Budget Setup</TabsTrigger>
            <TabsTrigger value="tracking">Budget vs Actual</TabsTrigger>
            <TabsTrigger value="alerts">Variance Alerts {variances.length > 0 && <Badge variant="destructive" className="ml-2">{variances.length}</Badge>}</TabsTrigger>
          </TabsList>

          <TabsContent value="setup">
            <Card>
              <CardHeader><CardTitle className="text-base">Set Budgets per Category</CardTitle></CardHeader>
              <CardContent>
                {loading ? <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground border-b">
                        <tr><th className="text-left py-2 px-2 sticky left-0 bg-background">Category</th>
                          {periodLabels.map((l) => <th key={l} className="text-right px-2">{l}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {CATEGORIES.map((c) => (
                          <tr key={c.key} className="border-b">
                            <td className="py-2 px-2 font-medium sticky left-0 bg-background">{c.label}</td>
                            {periodLabels.map((lbl) => (
                              <td key={lbl} className="px-2 py-1">
                                <Input type="number" className="w-32 text-right" value={getBudget(lbl, c.key) || ""}
                                  onChange={(e) => setBudget(lbl, c.key, Number(e.target.value) || 0)} placeholder="0" />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Budget vs Actual</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground border-b">
                      <tr>
                        <th className="text-left py-2 px-2">Category</th>
                        {periodLabels.map((l) => <th key={l} className="text-right px-2" colSpan={3}>{l}</th>)}
                      </tr>
                      <tr>
                        <th></th>
                        {periodLabels.flatMap((l) => [
                          <th key={l + "b"} className="text-right text-[10px] px-1">Budget</th>,
                          <th key={l + "a"} className="text-right text-[10px] px-1">Actual</th>,
                          <th key={l + "v"} className="text-right text-[10px] px-1">Var</th>,
                        ])}
                      </tr>
                    </thead>
                    <tbody>
                      {CATEGORIES.map((c) => (
                        <tr key={c.key} className="border-b">
                          <td className="py-2 px-2 font-medium">{c.label}</td>
                          {periodLabels.flatMap((lbl) => {
                            const b = getBudget(lbl, c.key);
                            const a = (actuals[lbl] || {})[c.key] || 0;
                            const v = b - a;
                            return [
                              <td key={lbl + "b"} className="text-right px-1">{fmt(b)}</td>,
                              <td key={lbl + "a"} className="text-right px-1">{fmt(a)}</td>,
                              <td key={lbl + "v"} className={`text-right px-1 font-medium ${v < 0 ? "text-destructive" : "text-emerald-600"}`}>{fmt(v)}</td>,
                            ];
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Period Totals: Budget vs Actual</CardTitle></CardHeader>
              <CardContent style={{ height: 300 }}>
                <ResponsiveContainer><BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="category" /><YAxis />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} /><Legend />
                  <Bar dataKey="Budget" fill="hsl(var(--primary))" /><Bar dataKey="Actual" fill="hsl(var(--destructive))" />
                </BarChart></ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Variance Alerts (&gt;10% over)</CardTitle>
                <CardDescription>Categories where actual spend exceeds budget by more than 10%</CardDescription></CardHeader>
              <CardContent>
                {variances.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No overspend detected.</div> : (
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground border-b"><tr>
                      <th className="text-left py-2">Period</th><th className="text-left">Category</th>
                      <th className="text-right">Budget</th><th className="text-right">Actual</th>
                      <th className="text-right">Overspend</th><th className="text-right">% Over</th>
                    </tr></thead>
                    <tbody>
                      {variances.map((v, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-2">{v.label}</td><td>{v.cat}</td>
                          <td className="text-right">{fmt(v.budget)}</td><td className="text-right">{fmt(v.actual)}</td>
                          <td className="text-right text-destructive font-medium">{fmt(v.over)}</td>
                          <td className="text-right"><Badge variant="destructive">{v.pct.toFixed(1)}%</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
