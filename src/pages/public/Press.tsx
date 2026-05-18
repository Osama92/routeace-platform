import PublicShell from "./PublicShell";
import { Card } from "@/components/ui/card";

export default function Press() {
  return (
    <PublicShell title="Press" description="RouteAce press kit, brand assets, and recent coverage." canonical="https://routeaceglyde.app/press">
      <h1 className="text-4xl font-black">Press</h1>
      <p className="text-muted-foreground">Logos, screenshots, and founder bios available on request.</p>
      <Card className="p-5 space-y-2">
        <h2 className="text-lg font-bold">Press kit</h2>
        <p className="text-sm text-muted-foreground">Email <a className="text-primary underline" href="mailto:press@routeaceglyde.app">press@routeaceglyde.app</a> and we'll send the full kit (logos, product shots, founder photos, fact sheet) within 24 hours.</p>
      </Card>
      <Card className="p-5 space-y-2">
        <h2 className="text-lg font-bold">Boilerplate</h2>
        <p className="text-sm text-muted-foreground">RouteAce, operated by Glyde Systems, is the distribution intelligence infrastructure for African logistics. The platform combines dispatch, fleet, fuel intelligence, predictive maintenance, and finance into a single operating system used by operators across Nigeria and West Africa.</p>
      </Card>
    </PublicShell>
  );
}
