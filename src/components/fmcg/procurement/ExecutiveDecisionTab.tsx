import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, DollarSign, MessageSquare, FileBarChart, Users, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

const financialScenarios = [
  {
    scenario: "Aggressive Stocking - Q2",
    revenue: "₦284M", margin: "18.2%", cashFlow: "-₦14.8M",
    roic: "22.4%", verdict: "Proceed with caution",
    details: "High revenue upside but working capital strain in Month 1–2",
  },
  {
    scenario: "Conservative - Hold Inventory",
    revenue: "₦248M", margin: "21.6%", cashFlow: "+₦4.2M",
    roic: "19.8%", verdict: "Safe baseline",
    details: "Protects margin but risks stockouts on 4 fast-movers",
  },
  {
    scenario: "Promo-Led Growth",
    revenue: "₦312M", margin: "14.8%", cashFlow: "-₦22.1M",
    roic: "16.2%", verdict: "High risk",
    details: "Volume growth at margin erosion - requires ₦22M trade spend",
  },
];

const nlQueries = [
  { query: "What if we reduce sugar inventory by 20%?", answer: "Stockout probability rises to 34% in Lagos. Estimated lost revenue: ₦8.4M. Service level drops from 96% → 82%. Recommendation: Reduce by max 12% instead.", time: "Just now" },
  { query: "Show me margin impact of switching to local flour supplier", answer: "Gross margin improves by 3.2% (₦850 → ₦720/unit). Quality score drops from 96% → 91%. Lead time improves from 4.0d → 2.8d. Net financial benefit: ₦1.4M/month.", time: "5 min ago" },
  { query: "Which territories should we expand into next quarter?", answer: "Top 3 expansion targets: 1) Edo State (28% penetration gap, ₦14M potential), 2) Kwara State (retail density 340/km², underserved), 3) Delta State (competitor weakness detected). Combined ROI: 34%.", time: "12 min ago" },
];

const meetingPrep = [
  { title: "Weekly S&OP Review - Week 10", kpis: ["Fill Rate: 94.2% ↑", "OTIF: 91.8% →", "Stockout Events: 3 ↓", "Working Capital: ₦42.1M"], decisions: 4, generated: "Auto-generated 2 hr ago" },
  { title: "Monthly Business Review - Feb 2026", kpis: ["Revenue: ₦68.4M ↑12%", "Gross Margin: 19.4%", "DSO: 28 days ↓", "SKU Velocity: 4.2x"], decisions: 7, generated: "Auto-generated yesterday" },
];

const territoryAllocations = [
  { rep: "Adebayo Kunle", territory: "Lagos Island", quota: "₦12.4M", achievement: 94, commission: "₦186K", optimalQuota: "₦14.1M", reason: "High-density outlet cluster - capacity for 14% more" },
  { rep: "Chioma Obi", territory: "Lagos Mainland", quota: "₦10.8M", achievement: 108, commission: "₦248K", optimalQuota: "₦11.2M", reason: "Consistently exceeding - slight increase sustainable" },
  { rep: "Ibrahim Musa", territory: "Ogun Central", quota: "₦8.2M", achievement: 72, commission: "₦98K", optimalQuota: "₦7.4M", reason: "Travel inefficiency - reduce territory size, add support" },
  { rep: "Ngozi Eze", territory: "South-East Hub", quota: "₦15.6M", achievement: 88, commission: "₦205K", optimalQuota: "₦14.8M", reason: "Territory too large - split for better coverage" },
];

const ExecutiveDecisionTab = () => (
  <div className="space-y-6">
    {/* Financial Integration */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" /> Financial Scenario Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {financialScenarios.map((s) => (
            <div key={s.scenario} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">{s.scenario}</h4>
                <Badge variant={s.verdict === "Safe baseline" ? "default" : s.verdict === "High risk" ? "destructive" : "secondary"}>
                  {s.verdict}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-lg font-bold">{s.revenue}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gross Margin</p>
                  <p className="text-lg font-bold">{s.margin}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cash Flow Impact</p>
                  <p className={`text-lg font-bold ${s.cashFlow.startsWith("+") ? "text-green-600" : "text-destructive"}`}>{s.cashFlow}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ROIC</p>
                  <p className="text-lg font-bold">{s.roic}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{s.details}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Natural Language Interaction */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> AI Planning Assistant</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {nlQueries.map((q, i) => (
            <div key={i} className="border rounded-lg overflow-hidden">
              <div className="p-3 bg-muted/50 flex items-start gap-2">
                <Users className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{q.query}</p>
                  <p className="text-xs text-muted-foreground">{q.time}</p>
                </div>
              </div>
              <div className="p-3 flex items-start gap-2">
                <Brain className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <p className="text-sm">{q.answer}</p>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground italic">Ask a planning question... e.g., "What if we cut promo spend by 30%?"</p>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Automated Meeting Prep */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileBarChart className="w-5 h-5 text-primary" /> Auto-Generated Meeting Packs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meetingPrep.map((m) => (
            <div key={m.title} className="p-4 border rounded-lg">
              <h4 className="font-semibold text-sm mb-2">{m.title}</h4>
              <div className="space-y-1 mb-3">
                {m.kpis.map((k, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {k.includes("↑") ? <ArrowUpRight className="w-3 h-3 text-green-600" /> : k.includes("↓") ? <ArrowDownRight className="w-3 h-3 text-destructive" /> : <TrendingUp className="w-3 h-3 text-muted-foreground" />}
                    <span>{k}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{m.decisions} decisions pending</span>
                <span>{m.generated}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Commission & Territory Automation */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> AI Territory & Quota Optimizer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">Rep</th>
                <th className="pb-3 font-medium">Territory</th>
                <th className="pb-3 font-medium">Current Quota</th>
                <th className="pb-3 font-medium">Achievement</th>
                <th className="pb-3 font-medium">Commission</th>
                <th className="pb-3 font-medium">AI Optimal</th>
                <th className="pb-3 font-medium">Rationale</th>
              </tr>
            </thead>
            <tbody>
              {territoryAllocations.map((t) => (
                <tr key={t.rep} className="border-b last:border-0">
                  <td className="py-3 font-medium">{t.rep}</td>
                  <td className="py-3">{t.territory}</td>
                  <td className="py-3">{t.quota}</td>
                  <td className="py-3">
                    <span className={`font-bold ${t.achievement >= 100 ? "text-green-600" : t.achievement >= 85 ? "text-foreground" : "text-destructive"}`}>{t.achievement}%</span>
                  </td>
                  <td className="py-3 font-bold">{t.commission}</td>
                  <td className="py-3 font-bold text-primary">{t.optimalQuota}</td>
                  <td className="py-3 text-xs text-muted-foreground max-w-[200px]">{t.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default ExecutiveDecisionTab;
