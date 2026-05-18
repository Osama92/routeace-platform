import PortoDashLayout from "@/components/portodash/PortoDashLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, Globe, BarChart3, Target, Lightbulb, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const demandData = [
  { product: "Cashew", eu: 45, asia: 30, mena: 15, us: 10 },
  { product: "Sesame", eu: 20, asia: 50, mena: 20, us: 10 },
  { product: "Shea", eu: 55, asia: 5, mena: 10, us: 30 },
  { product: "Ginger", eu: 35, asia: 25, mena: 25, us: 15 },
  { product: "Hibiscus", eu: 30, asia: 10, mena: 40, us: 20 },
];

const insights = [
  { title: "Cashew demand surging in Germany", description: "W320 grade cashew demand up 34% YoY in EU market. TradeLink GmbH seeking additional 80T for Q2.", importance: "high", market: "EU" },
  { title: "Organic certification premium increasing", description: "Organic-certified products command 22-35% premium in US/EU. Consider USDA Organic for Moringa & Shea.", importance: "high", market: "Global" },
  { title: "Sesame prices stabilizing after spike", description: "After Q4 volatility, sesame prices settling at $2,500-2,700/T. Good time to lock in forward contracts.", importance: "medium", market: "Asia" },
  { title: "UAE halal market expansion opportunity", description: "GCC countries increasing African commodity imports by 18% annually. Hibiscus and Moringa showing strongest growth.", importance: "high", market: "MENA" },
  { title: "New phytosanitary requirements for China", description: "Updated AQSIQ protocols effective April 2026. Ensure fumigation certificates are updated.", importance: "critical", market: "Asia" },
];

const PortoDashIntelligence = () => (
  <PortoDashLayout title="Export Intelligence" subtitle="AI-powered market insights, demand trends, and pricing analytics">
    {/* AI Insights */}
    <Card className="mb-8 border-primary/10 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" /> AI Market Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((ins, i) => (
          <div key={i} className="p-3 rounded-lg bg-background/80 border border-border/50 hover:border-primary/20 transition-colors cursor-pointer">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary shrink-0" />
                <p className="text-sm font-medium">{ins.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{ins.market}</Badge>
                <Badge className={`text-[10px] ${
                  ins.importance === "critical" ? "bg-destructive/15 text-destructive" :
                  ins.importance === "high" ? "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]" :
                  "bg-muted text-muted-foreground"
                }`}>{ins.importance}</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground ml-6">{ins.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>

    {/* Global Demand by Product */}
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="w-4 h-4 text-info" /> Global Demand Distribution (% by Region)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={demandData}>
            <XAxis dataKey="product" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="eu" name="EU" stackId="a" fill="hsl(var(--primary))" />
            <Bar dataKey="asia" name="Asia" stackId="a" fill="hsl(var(--info))" />
            <Bar dataKey="mena" name="MENA" stackId="a" fill="hsl(var(--warning))" />
            <Bar dataKey="us" name="Americas" stackId="a" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

    {/* Price Intelligence */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" /> Commodity Price Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { product: "Cashew W320", price: "$2,800/T", change: "+5.2%", trend: "up" },
            { product: "Sesame Natural", price: "$2,600/T", change: "-1.8%", trend: "down" },
            { product: "Shea Butter Grade A", price: "$3,400/T", change: "+8.4%", trend: "up" },
            { product: "Dried Ginger", price: "$2,900/T", change: "+2.1%", trend: "up" },
            { product: "Dried Hibiscus", price: "$3,000/T", change: "+3.6%", trend: "up" },
            { product: "Moringa Powder", price: "$4,200/T", change: "+12.3%", trend: "up" },
          ].map(p => (
            <div key={p.product} className="p-4 rounded-lg border border-border/50">
              <p className="text-sm font-medium">{p.product}</p>
              <p className="text-xl font-bold text-primary mt-1">{p.price}</p>
              <p className={`text-xs mt-1 ${p.trend === "up" ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
                <TrendingUp className={`w-3 h-3 inline mr-1 ${p.trend === "down" ? "rotate-180" : ""}`} />
                {p.change} (30d)
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </PortoDashLayout>
);

export default PortoDashIntelligence;
