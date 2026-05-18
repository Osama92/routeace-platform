import PublicShell from "./PublicShell";
import { Card } from "@/components/ui/card";

const POSTS = [
  { t: "Why fuel theft is the silent killer of African logistics margins", d: "May 2026", s: "A breakdown of common drainage signatures and how probe + GPS fusion detects them in under 90 seconds." },
  { t: "Designing dispatch state machines that survive bad connectivity", d: "Apr 2026", s: "Offline-first sync patterns we learned the hard way operating across 8 Nigerian states." },
  { t: "From spreadsheets to predictive maintenance in 30 days", d: "Mar 2026", s: "A playbook for ops managers replacing tribal knowledge with a health score." },
];

export default function Blog() {
  return (
    <PublicShell
      title="Blog"
      description="Operator-grade field notes on African logistics, fleet intelligence, fuel fraud detection, and distribution playbooks."
      canonical="https://routeaceglyde.app/blog"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "Blog",
        name: "RouteAce Blog",
        url: "https://routeaceglyde.app/blog",
        description: "Field notes from the team building distribution infrastructure for Africa.",
        blogPost: POSTS.map((p) => ({
          "@type": "BlogPosting",
          headline: p.t,
          datePublished: p.d,
          description: p.s,
        })),
      }}
    >
      <h1 className="text-4xl font-black">Blog</h1>
      <p className="text-muted-foreground">Field notes from the team building distribution infrastructure for the continent.</p>
      <div className="space-y-3">
        {POSTS.map((p) => (
          <Card key={p.t} className="p-5">
            <div className="text-xs text-muted-foreground">{p.d}</div>
            <h2 className="text-lg font-bold mt-1">{p.t}</h2>
            <p className="text-sm text-muted-foreground mt-2">{p.s}</p>
          </Card>
        ))}
      </div>
    </PublicShell>
  );
}
