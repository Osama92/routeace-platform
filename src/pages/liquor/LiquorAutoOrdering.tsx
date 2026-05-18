import IndustryLayout from "@/components/industry/IndustryLayout";
import { Card, CardContent } from "@/components/ui/card";
import { DataZeroState } from "@/components/shared/DataZeroState";
import { LayoutDashboard } from "lucide-react";

const LiquorAutoOrdering = () => (
  <IndustryLayout industryCode="liquor">
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <LayoutDashboard className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Automated Ordering Engine</h1>
          <p className="text-muted-foreground">Smart reorder rules, low-stock triggers & scheduled replenishment</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataZeroState
            icon={LayoutDashboard}
            title="No data yet"
            description="This module will populate automatically as your team records live activity. No sample data is shown."
          />
        </CardContent>
      </Card>
    </div>
  </IndustryLayout>
);

export default LiquorAutoOrdering;
