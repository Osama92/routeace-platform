import PublicShell from "./PublicShell";
import { Card } from "@/components/ui/card";

const CASES = [
  { co: "Lagos FMCG Distributor", metric: "31% drop in cost-per-drop", body: "Migrated 220 vehicles from 3 disconnected systems to RouteAce in 6 weeks. Fuel theft alerts cut shrinkage by ₦42M in Q1." },
  { co: "Pan-African Cold Chain Operator", metric: "97% on-time delivery", body: "Predictive maintenance blocked 14 high-risk dispatches in the first month. SLA adherence climbed from 78% to 97%." },
  { co: "Nigerian E-commerce 3PL", metric: "2.4x driver throughput", body: "Multi-drop optimization + Side-Hustle mode let 180 riders absorb peak season volume without adding headcount." },
];

export default function CaseStudies() {
  return (
    <PublicShell title="Case Studies" description="How African logistics operators use RouteAce to cut cost and lift SLA." canonical="https://routeace.app/case-studies">
      <h1 className="text-4xl font-black">Case Studies</h1>
      <p className="text-muted-foreground">Real numbers from operators running RouteAce in production across Nigeria and West Africa.</p>
      <div className="space-y-4">
        {CASES.map((c) => (
          <Card key={c.co} className="p-6">
            <div className="text-xs uppercase tracking-wider text-primary font-semibold">{c.metric}</div>
            <h2 className="text-xl font-bold mt-1">{c.co}</h2>
            <p className="text-sm text-muted-foreground mt-2">{c.body}</p>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground pt-4">Want a deep-dive deck? Email <a className="text-primary underline" href="mailto:sales@routeace.app">sales@routeace.app</a>.</p>
    </PublicShell>
  );
}
