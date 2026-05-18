import IndustryLayout from "@/components/industry/IndustryLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ShieldCheck, MapPin, AlertTriangle, CheckCircle2, XCircle,
  Brain, FileText, Scale, Building2, Lock,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

type RiskLevel = "low" | "medium" | "high" | "restricted";

const stateRegulations: {
  state: string;
  riskLevel: RiskLevel;
  score: number;
  alcoholAllowed: boolean;
  restrictions: string[];
  licenses: string[];
  notes: string;
  venueTypes: string[];
}[] = [
  {
    state: "Lagos",
    riskLevel: "low",
    score: 92,
    alcoholAllowed: true,
    restrictions: ["No sales to minors (under 18)", "Noise curfew for bars after 12am in residential zones"],
    licenses: ["Standard liquor license", "NAFDAC clearance", "Lagos State Signage permit"],
    notes: "Most permissive alcohol environment in Nigeria. Strong enforcement of age verification.",
    venueTypes: ["Bars", "Restaurants", "Hotels", "Clubs", "Retail Stores"],
  },
  {
    state: "Abuja (FCT)",
    riskLevel: "low",
    score: 90,
    alcoholAllowed: true,
    restrictions: ["FCT environmental compliance required", "Designated alcohol retail zones"],
    licenses: ["FCT liquor license", "NAFDAC clearance", "Business premises permit"],
    notes: "Federal territory with clear regulatory framework. Premium venues well-regulated.",
    venueTypes: ["Bars", "Restaurants", "Hotels", "Clubs"],
  },
  {
    state: "Rivers (Port Harcourt)",
    riskLevel: "low",
    score: 86,
    alcoholAllowed: true,
    restrictions: ["Environmental impact assessment for large venues", "Community approval in some LGAs"],
    licenses: ["Rivers State liquor license", "NAFDAC clearance"],
    notes: "Oil city with permissive alcohol culture. GRA district most favorable.",
    venueTypes: ["Bars", "Restaurants", "Hotels", "Clubs", "Retail Stores"],
  },
  {
    state: "Oyo (Ibadan)",
    riskLevel: "low",
    score: 84,
    alcoholAllowed: true,
    restrictions: ["Local government area approvals vary", "Traditional ruler consultation in some zones"],
    licenses: ["Oyo State business permit", "NAFDAC clearance"],
    notes: "Generally permissive. University areas have high demand but some local restrictions.",
    venueTypes: ["Bars", "Restaurants", "Hotels", "Retail Stores"],
  },
  {
    state: "Kano",
    riskLevel: "restricted",
    score: 18,
    alcoholAllowed: false,
    restrictions: ["Sharia law prohibits alcohol sale and consumption", "Only licensed hotels for non-Muslims", "No public advertising"],
    licenses: ["Special hotel exemption license", "Federal tourism waiver"],
    notes: "Alcohol banned under Sharia law. Expansion limited to internationally-licensed hotels in GRA only.",
    venueTypes: ["Licensed International Hotels only"],
  },
  {
    state: "Kaduna",
    riskLevel: "high",
    score: 38,
    alcoholAllowed: true,
    restrictions: ["Southern Kaduna only", "No sales in northern LGAs", "Strict advertising ban"],
    licenses: ["Kaduna South special permit", "NAFDAC clearance"],
    notes: "Split regulation - southern part allows alcohol, northern part under Sharia restrictions.",
    venueTypes: ["Hotels", "Licensed Bars (South only)"],
  },
  {
    state: "Edo (Benin City)",
    riskLevel: "low",
    score: 88,
    alcoholAllowed: true,
    restrictions: ["Standard age verification", "Noise control ordinance"],
    licenses: ["Edo State business permit", "NAFDAC clearance"],
    notes: "Very favorable for alcohol distribution. Festive culture drives strong demand.",
    venueTypes: ["Bars", "Restaurants", "Hotels", "Clubs", "Retail Stores"],
  },
  {
    state: "Enugu",
    riskLevel: "low",
    score: 86,
    alcoholAllowed: true,
    restrictions: ["Standard regulations", "University campus proximity rules"],
    licenses: ["Enugu State license", "NAFDAC clearance"],
    notes: "Growing entertainment scene with clear regulatory support.",
    venueTypes: ["Bars", "Restaurants", "Hotels", "Clubs"],
  },
];

const riskColors: Record<RiskLevel, string> = {
  low: "bg-emerald-500/15 text-emerald-600",
  medium: "bg-amber-500/15 text-amber-600",
  high: "bg-orange-500/15 text-orange-600",
  restricted: "bg-destructive/15 text-destructive",
};

const complianceScoreData = stateRegulations.map(s => ({ state: s.state, score: s.score }));

const LiquorRegulatoryExpansion = () => (
  <IndustryLayout industryCode="liquor">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" /> Regulatory Compliance Map
          </h1>
          <p className="text-sm text-muted-foreground">State-by-state alcohol regulation analysis for expansion planning</p>
        </div>
        <Button><FileText className="w-4 h-4 mr-1" /> Export Compliance Report</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "States Analyzed", value: "36 + FCT", icon: MapPin, color: "text-primary" },
          { label: "Low Risk", value: "22", icon: CheckCircle2, color: "text-emerald-500" },
          { label: "High Risk", value: "6", icon: AlertTriangle, color: "text-amber-500" },
          { label: "Restricted", value: "8", icon: XCircle, color: "text-destructive" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-3 text-center">
              <k.icon className={`w-5 h-5 mx-auto mb-1 ${k.color}`} />
              <p className="text-xl font-bold">{k.value}</p>
              <p className="text-[10px] text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compliance Scores */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Regulatory Compliance Score by State</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={complianceScoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="state" fontSize={10} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 100]} fontSize={10} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Bar
                dataKey="score"
                radius={[4, 4, 0, 0]}
                fill="hsl(var(--primary))"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* State Details */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">State Regulatory Profiles</h3>
        {stateRegulations.map((s, i) => (
          <motion.div key={s.state} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className={`transition-all ${s.riskLevel === "restricted" ? "border-destructive/30" : "hover:border-primary/30"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      s.riskLevel === "restricted" ? "bg-destructive/10" : s.riskLevel === "high" ? "bg-orange-500/10" : "bg-emerald-500/10"
                    }`}>
                      <span className={`text-lg font-bold ${
                        s.riskLevel === "restricted" ? "text-destructive" : s.riskLevel === "high" ? "text-orange-600" : "text-emerald-600"
                      }`}>{s.score}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{s.state}</p>
                        <Badge className={riskColors[s.riskLevel]}>{s.riskLevel.toUpperCase()} RISK</Badge>
                        {s.alcoholAllowed
                          ? <Badge className="bg-emerald-500/15 text-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" />Alcohol Allowed</Badge>
                          : <Badge variant="destructive"><Lock className="w-3 h-3 mr-1" />Restricted</Badge>
                        }
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.notes}</p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Restrictions</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {s.restrictions.map((r, j) => (
                        <li key={j} className="flex items-start gap-1"><AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />{r}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Required Licenses</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {s.licenses.map((l, j) => (
                        <li key={j} className="flex items-start gap-1"><FileText className="w-3 h-3 text-primary mt-0.5 shrink-0" />{l}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Allowed Venue Types</p>
                    <div className="flex flex-wrap gap-1">
                      {s.venueTypes.map((v, j) => (
                        <Badge key={j} variant="outline" className="text-[10px]">{v}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* AI Insight */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Brain className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Regulatory Intelligence</p>
            <p className="text-sm text-muted-foreground mt-1">
              8 northern states operate under Sharia law with alcohol bans - expansion limited to licensed 
              international hotels. Kaduna is a split jurisdiction: southern LGAs allow alcohol, northern do not. 
              For maximum ROI with minimum regulatory risk, prioritize Lagos → Abuja → Rivers → Edo → Enugu corridor. 
              All 5 states score above 84/100 on regulatory compliance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  </IndustryLayout>
);

export default LiquorRegulatoryExpansion;
