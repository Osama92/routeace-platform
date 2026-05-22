import PublicShell from "./PublicShell";
import { Card } from "@/components/ui/card";

const ROLES = [
  { t: "Senior Backend Engineer", l: "Lagos / Remote", d: "Edge functions, event-driven services, Postgres at scale." },
  { t: "Field Ops Lead", l: "Lagos", d: "Onboard new fleets, train ops managers, own first-month NPS." },
  { t: "Integrations Engineer", l: "Remote (WAT)", d: "Build connectors for GPS, fuel probes, IoT maintenance hardware." },
];

export default function Careers() {
  return (
    <PublicShell title="Careers" description="Join the team building Africa's distribution infrastructure." canonical="https://routeace.app/careers">
      <h1 className="text-4xl font-black">Careers</h1>
      <p className="text-muted-foreground">We hire operators and builders. Engineers who have ridden in the truck. Ops folks who can read a query plan.</p>
      <div className="space-y-3">
        {ROLES.map((r) => (
          <Card key={r.t} className="p-5">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <h2 className="text-lg font-bold">{r.t}</h2>
              <span className="text-xs text-muted-foreground">{r.l}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{r.d}</p>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground pt-4">Don't see your role? Email <a className="text-primary underline" href="mailto:careers@routeace.app">careers@routeace.app</a>.</p>
    </PublicShell>
  );
}
