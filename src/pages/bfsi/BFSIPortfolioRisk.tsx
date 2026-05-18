import IndustryLayout from "@/components/industry/IndustryLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Shield, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const riskData = [
  { category: "SME Loans", performing: 82, watchlist: 12, npl: 6 },
  { category: "Agri Loans", performing: 75, watchlist: 15, npl: 10 },
  { category: "Microfinance", performing: 68, watchlist: 20, npl: 12 },
  { category: "Asset Finance", performing: 90, watchlist: 7, npl: 3 },
  { category: "Working Cap", performing: 78, watchlist: 14, npl: 8 },
];

const BFSIPortfolioRisk = () => (
  <IndustryLayout industryCode="bfsi">
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Portfolio Risk Analytics</h1>
          <p className="text-muted-foreground">Monitor portfolio health, NPL ratios, and risk exposure</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">₦4.2B</p><p className="text-xs text-muted-foreground">Total Portfolio</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-500">79%</p><p className="text-xs text-muted-foreground">Performing</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-500">13.6%</p><p className="text-xs text-muted-foreground">Watchlist</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-500">7.4%</p><p className="text-xs text-muted-foreground">NPL Ratio</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-500" />Portfolio Quality by Category</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={riskData}>
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="performing" fill="#10b981" name="Performing %" stackId="a" />
              <Bar dataKey="watchlist" fill="#f59e0b" name="Watchlist %" stackId="a" />
              <Bar dataKey="npl" fill="#ef4444" name="NPL %" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  </IndustryLayout>
);

export default BFSIPortfolioRisk;
