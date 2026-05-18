import PublicShell from "./PublicShell";
import { Card } from "@/components/ui/card";
import { Mail, Phone, MapPin } from "lucide-react";

const contactCards = [
  { icon: Mail, label: "Sales", lines: ["r.oladipupo@glydeservicesng.com"] },
  { icon: Mail, label: "Support", lines: ["support@glydeservicesng.com"] },
  {
    icon: Mail,
    label: "Integrations",
    lines: ["management@glydeservicesng.com", "glideglobalservices@gmail.com"],
  },
  {
    icon: Mail,
    label: "Press",
    lines: ["management@glydeservicesng.com", "r.oladipupo@glydeservicesng.com"],
  },
  {
    icon: Phone,
    label: "Phone (NG)",
    lines: ["+234-9051776879", "+234 813 188 8679", "+234 703 116 7360"],
  },
  { icon: MapPin, label: "HQ", lines: ["Lagos, Nigeria"] },
];

export default function Contact() {
  return (
    <PublicShell
      title="Contact"
      description="Reach the RouteAce team for sales, support, integrations, or press inquiries — typically within one business day."
      canonical="https://routeaceglyde.app/contact"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: "RouteAce (Glyde Services)",
        url: "https://routeaceglyde.app/contact",
        email: "support@glydeservicesng.com",
        telephone: "+234-9051776879",
        address: { "@type": "PostalAddress", addressLocality: "Lagos", addressCountry: "NG" },
      }}
    >
      <h1 className="text-4xl font-black">Contact</h1>
      <p className="text-muted-foreground">We typically respond within one business day.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        {contactCards.map((c) => (
          <Card key={c.label} className="p-4 flex items-start gap-3">
            <c.icon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <div className="text-xs uppercase text-muted-foreground">{c.label}</div>
              <div className="flex flex-col">
                {c.lines.map((line) => (
                  <span key={line} className="text-sm font-medium">{line}</span>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PublicShell>
  );
}
