import IndustryLayout from "@/components/industry/IndustryLayout";
import { Card, CardContent } from "@/components/ui/card";
import { DataZeroState } from "@/components/shared/DataZeroState";
import { Leaf } from "lucide-react";

const AgriFarmAdvisory = () => (
  <IndustryLayout industryCode="agri">
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-lime-600 flex items-center justify-center">
          <Leaf className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Farm Advisory System</h1>
          <p className="text-muted-foreground">AI-powered crop recommendations, soil analytics, and input advisory</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataZeroState
            icon={Leaf}
            title="No data yet"
            description="This module will populate automatically as your team records live activity. No sample data is shown."
          />
        </CardContent>
      </Card>
    </div>
  </IndustryLayout>
);

export default AgriFarmAdvisory;
