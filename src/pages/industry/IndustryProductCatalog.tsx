import { useParams } from "react-router-dom";
import IndustryLayout from "@/components/industry/IndustryLayout";
import { getIndustryConfig } from "@/lib/industryConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Boxes, Search, AlertTriangle, TrendingUp, Brain, Package } from "lucide-react";

const IndustryProductCatalog = () => {
  const { industryCode } = useParams<{ industryCode: string }>();
  const config = getIndustryConfig(industryCode || "other");

  const products = [
    { sku: "SKU-001", name: `Premium ${config.terminology.product} A`, price: "₦4,500", distPrice: "₦3,800", margin: 15.6, packSize: "12 units", stockRisk: "low", velocity: 94, forecast: "+12% demand next week" },
    { sku: "SKU-002", name: `Standard ${config.terminology.product} B`, price: "₦2,200", distPrice: "₦1,900", margin: 13.6, packSize: "24 units", stockRisk: "medium", velocity: 71, forecast: "Stable demand" },
    { sku: "SKU-003", name: `Economy ${config.terminology.product} C`, price: "₦1,100", distPrice: "₦950", margin: 13.6, packSize: "48 units", stockRisk: "high", velocity: 42, forecast: "Slow moving - consider promotion" },
    { sku: "SKU-004", name: `New Launch ${config.terminology.product} D`, price: "₦6,800", distPrice: "₦5,500", margin: 19.1, packSize: "6 units", stockRisk: "low", velocity: 88, forecast: "+28% launch momentum" },
  ];

  const riskColors = { low: "outline", medium: "secondary", high: "destructive" } as const;

  return (
    <IndustryLayout industryCode={industryCode || "other"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, hsl(${config.colorPrimary}), hsl(${config.colorSecondary}))` }}>
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold">{config.terminology.product} Catalog</h1>
              <p className="text-sm text-muted-foreground">{products.length} active {config.terminology.product.toLowerCase()}s</p>
            </div>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={`Search ${config.terminology.product.toLowerCase()}s...`} className="pl-10" />
          </div>
        </div>

        <div className="space-y-3">
          {products.map((p) => (
            <Card key={p.sku} className="hover:border-primary/30 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{p.name}</p>
                      <Badge variant="outline" className="text-xs">{p.sku}</Badge>
                      <Badge variant={riskColors[p.stockRisk as keyof typeof riskColors]} className="text-xs capitalize">
                        {p.stockRisk === "high" && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {p.stockRisk} stock risk
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs mt-2">
                      <div><span className="text-muted-foreground">Price:</span> <span className="font-medium">{p.price}</span></div>
                      <div><span className="text-muted-foreground">Dist Price:</span> <span className="font-medium">{p.distPrice}</span></div>
                      <div><span className="text-muted-foreground">Margin:</span> <span className="font-medium">{p.margin}%</span></div>
                      <div><span className="text-muted-foreground">Pack:</span> <span className="font-medium">{p.packSize}</span></div>
                      <div>
                        <span className="text-muted-foreground">Velocity: </span>
                        <Progress value={p.velocity} className="h-1.5 inline-block w-12 align-middle mx-1" />
                        <span className="font-medium">{p.velocity}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <Brain className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground italic">{p.forecast}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </IndustryLayout>
  );
};

export default IndustryProductCatalog;
