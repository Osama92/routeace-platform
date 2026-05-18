import { useParams } from "react-router-dom";
import IndustryLayout from "@/components/industry/IndustryLayout";
import { getIndustryConfig } from "@/lib/industryConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Route, MapPin, Clock, Fuel, Users, Brain, CheckCircle } from "lucide-react";

const IndustryBeatPlanning = () => {
  const { industryCode } = useParams<{ industryCode: string }>();
  const config = getIndustryConfig(industryCode || "other");

  const beats = [
    { name: "Lagos Island - Route A", rep: "Adebayo O.", outlets: 18, coverage: 94, visitFreq: "3x/week", estTime: "4.5 hrs", fuelCost: "₦8,200" },
    { name: "Ikeja Central - Route B", rep: "Chioma N.", outlets: 15, coverage: 88, visitFreq: "2x/week", estTime: "3.8 hrs", fuelCost: "₦6,500" },
    { name: "Lekki Corridor - Route C", rep: "Ibrahim M.", outlets: 12, coverage: 76, visitFreq: "2x/week", estTime: "5.2 hrs", fuelCost: "₦9,800" },
    { name: "Surulere Loop - Route D", rep: "Funke A.", outlets: 20, coverage: 91, visitFreq: "3x/week", estTime: "4.0 hrs", fuelCost: "₦7,100" },
  ];

  const aiOptimizations = [
    { suggestion: "Merge Route C and D during Wednesday visits - saves 1.2 hrs and ₦3,400 fuel", impact: "high" },
    { suggestion: "Add 3 uncovered outlets near Ikeja route - potential ₦180K/month revenue", impact: "medium" },
    { suggestion: "Shift Route A Friday visit to Thursday - reduces traffic delay by 35%", impact: "low" },
  ];

  return (
    <IndustryLayout industryCode={industryCode || "other"}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, hsl(${config.colorPrimary}), hsl(${config.colorSecondary}))` }}>
            <Route className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">AI-Guided Regional Journey Planning</h1>
            <p className="text-sm text-muted-foreground">Dynamic outlet sequencing, territory saturation & {config.terminology.agent.toLowerCase()} route optimization</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-5 text-center">
            <Route className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{beats.length}</p>
            <p className="text-xs text-muted-foreground">Active Routes</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 text-center">
            <MapPin className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold">65</p>
            <p className="text-xs text-muted-foreground">Total {config.terminology.outlet}s</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 text-center">
            <CheckCircle className="w-5 h-5 mx-auto mb-1 text-violet-500" />
            <p className="text-2xl font-bold">87%</p>
            <p className="text-xs text-muted-foreground">Avg Coverage</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 text-center">
            <Fuel className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">₦31.6K</p>
            <p className="text-xs text-muted-foreground">Weekly Fuel Cost</p>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Route Plans</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {beats.map((b) => (
              <div key={b.name} className="p-4 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm">{b.name}</p>
                  <Badge variant="outline" className="text-xs">{b.visitFreq}</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                  <div className="flex items-center gap-1"><Users className="w-3 h-3" /> {b.rep}</div>
                  <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {b.outlets} {config.terminology.outlet.toLowerCase()}s</div>
                  <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {b.estTime}</div>
                  <div className="flex items-center gap-1"><Fuel className="w-3 h-3" /> {b.fuelCost}</div>
                  <div>
                    <Progress value={b.coverage} className="h-1.5" />
                    <span className="text-muted-foreground">{b.coverage}% coverage</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="w-4 h-4" /> AI Route Optimization</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {aiOptimizations.map((a) => (
              <div key={a.suggestion} className="p-3 rounded-lg border border-border/40 bg-muted/10">
                <div className="flex items-start gap-2">
                  <Badge variant={a.impact === "high" ? "destructive" : a.impact === "medium" ? "secondary" : "outline"} className="text-xs mt-0.5 capitalize flex-shrink-0">{a.impact}</Badge>
                  <p className="text-sm">{a.suggestion}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </IndustryLayout>
  );
};

export default IndustryBeatPlanning;
