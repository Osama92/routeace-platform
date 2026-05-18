import PortoDashLayout from "@/components/portodash/PortoDashLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, CheckCircle, AlertTriangle, FileText, Globe, Clock } from "lucide-react";

const complianceChecks = [
  { name: "NAFDAC Export Certification", status: "passed", score: 100, details: "Valid until Dec 2026" },
  { name: "Phytosanitary Requirements", status: "action_needed", score: 75, details: "Inspection pending for Sesame shipment" },
  { name: "SON Quality Standards", status: "passed", score: 95, details: "All products certified" },
  { name: "NEPC Export Documentation", status: "passed", score: 100, details: "NXP forms filed" },
  { name: "EU Food Safety (RASFF)", status: "warning", score: 85, details: "Aflatoxin test results pending for Cashew" },
  { name: "Customs Tariff Classification", status: "passed", score: 100, details: "HS codes verified" },
];

const regulations = [
  { market: "European Union", requirements: ["CE marking where applicable", "RASFF food safety compliance", "EU organic certification", "Phytosanitary certificates"], status: "compliant" },
  { market: "United States", requirements: ["FDA registration", "FSVP compliance", "CBP entry requirements", "Lacey Act (wood products)"], status: "partial" },
  { market: "China", requirements: ["AQSIQ registration", "CIQ inspection", "Chinese label requirements", "Phytosanitary protocols"], status: "compliant" },
  { market: "UAE/GCC", requirements: ["Halal certification", "GSO standards", "Certificate of Conformity", "Emirates Authority approval"], status: "compliant" },
];

const PortoDashCompliance = () => (
  <PortoDashLayout title="Customs Compliance" subtitle="Regulatory verification, tariff management, and export clearance">
    {/* Compliance Score */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { label: "Overall Score", value: "94%", color: "text-[hsl(var(--success))]" },
        { label: "Documents Valid", value: "42/47", color: "text-primary" },
        { label: "Pending Actions", value: "3", color: "text-[hsl(var(--warning))]" },
        { label: "Violations (YTD)", value: "0", color: "text-[hsl(var(--success))]" },
      ].map(m => (
        <Card key={m.label}>
          <CardContent className="pt-5 text-center">
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Compliance Checks */}
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> Compliance Checks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {complianceChecks.map(c => (
          <div key={c.name} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              {c.status === "passed" ? <CheckCircle className="w-4 h-4 text-[hsl(var(--success))]" /> :
               c.status === "warning" ? <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))]" /> :
               <Clock className="w-4 h-4 text-destructive" />}
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.details}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-24">
                <Progress value={c.score} className="h-1.5" />
              </div>
              <span className="text-xs font-medium w-8">{c.score}%</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>

    {/* Market Regulations */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="w-4 h-4 text-info" /> Market-Specific Regulations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          {regulations.map(r => (
            <div key={r.market} className="p-4 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{r.market}</h3>
                <Badge variant={r.status === "compliant" ? "default" : "secondary"} className="text-[10px] capitalize">{r.status}</Badge>
              </div>
              <ul className="space-y-1.5">
                {r.requirements.map(req => (
                  <li key={req} className="text-xs text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-[hsl(var(--success))] shrink-0" /> {req}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </PortoDashLayout>
);

export default PortoDashCompliance;
