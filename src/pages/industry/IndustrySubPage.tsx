import { useParams } from "react-router-dom";
import IndustryLayout from "@/components/industry/IndustryLayout";
import { getIndustryConfig } from "@/lib/industryConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PAGE_TITLES: Record<string, string> = {
  sales: "Sales Intelligence",
  outlets: "Outlet Management",
  beats: "Beat Planning",
  visits: "Field Visits",
  catalog: "Product Catalog",
  logistics: "Distribution Logistics",
  routes: "Route Plans",
  deliveries: "Digital POD",
  stock: "Stock Intelligence",
  procurement: "Procurement AI",
  reconciliation: "Reconciliation",
  credit: "Credit Scoring",
  promotions: "Trade Promotions",
  distributors: "Distributor Index",
  benchmark: "Industry Benchmark",
  margin: "Margin Protection",
};

const IndustrySubPage = () => {
  const { industryCode, page } = useParams<{ industryCode: string; page: string }>();
  const config = getIndustryConfig(industryCode || "other");
  const Icon = config.icon;
  const title = PAGE_TITLES[page || ""] || "Module";

  // Replace generic terms with industry-specific terminology
  const localizedTitle = title
    .replace("Outlet", config.terminology.outlet)
    .replace("Product", config.terminology.product);

  return (
    <IndustryLayout industryCode={industryCode || "other"}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, hsl(${config.colorPrimary}), hsl(${config.colorSecondary}))` }}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">{localizedTitle}</h1>
            <p className="text-sm text-muted-foreground">{config.displayName}</p>
          </div>
        </div>

        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="py-16 text-center">
            <Icon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-2">{localizedTitle}</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              This module is ready for {config.name} operations. Add your first data to start tracking 
              {config.terminology.outlet.toLowerCase()} performance, {config.terminology.agent.toLowerCase()} activity, 
              and {config.terminology.product.toLowerCase()} velocity.
            </p>
          </CardContent>
        </Card>
      </div>
    </IndustryLayout>
  );
};

export default IndustrySubPage;
