import IndustryLayout from "@/components/industry/IndustryLayout";
import { Card, CardContent } from "@/components/ui/card";
import { DataZeroState } from "@/components/shared/DataZeroState";
import { ShoppingCart } from "lucide-react";

const __WrappedDemo_BuildingProcurement = () => (
  <IndustryLayout industryCode="building">
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
          <ShoppingCart className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Contractor Procurement</h1>
          <p className="text-muted-foreground">Manage purchase orders and supplier relationships</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataZeroState
            icon={ShoppingCart}
            title="No data yet"
            description="This module will populate automatically as your team records live activity. No sample data is shown."
          />
        </CardContent>
      </Card>
    </div>
  </IndustryLayout>
);

export default __WrappedDemo_BuildingProcurement;
