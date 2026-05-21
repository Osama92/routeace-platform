import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Truck, MapPin, Phone, Mail, MessageCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Website {
  id: string;
  company_name: string;
  subdomain: string;
  tagline: string | null;
  primary_color: string | null;
  brand_style: string | null;
  services: string[] | null;
  cities_served: string[] | null;
  fleet_size: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  meta_title: string | null;
  meta_description: string | null;
  status: string;
  user_id: string;
}

interface Page {
  slug: string;
  page_type: string;
  title: string;
  content: any;
}

const PublicSiteViewer = () => {
  const { subdomain } = useParams();
  const [site, setSite] = useState<Website | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lead, setLead] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const [submittingLead, setSubmittingLead] = useState(false);

  useEffect(() => {
    (async () => {
      if (!subdomain) return;
      const { data: siteData } = await supabase
        .from("tenant_websites" as any)
        .select("*")
        .eq("subdomain", subdomain)
        .maybeSingle();

      if (!siteData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setSite(siteData as any);

      // SEO meta
      const s = siteData as any;
      document.title = s.meta_title || s.company_name;
      const setMeta = (name: string, content: string) => {
        let el = document.querySelector(`meta[name="${name}"]`);
        if (!el) {
          el = document.createElement("meta");
          el.setAttribute("name", name);
          document.head.appendChild(el);
        }
        el.setAttribute("content", content);
      };
      if (s.meta_description) setMeta("description", s.meta_description);

      const { data: pagesData } = await supabase
        .from("tenant_website_pages" as any)
        .select("slug, page_type, title, content")
        .eq("website_id", s.id);
      setPages((pagesData as any) || []);
      setLoading(false);
    })();
  }, [subdomain]);

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!site) return;
    if (!lead.email && !lead.phone) {
      toast.error("Please provide an email or phone number");
      return;
    }
    setSubmittingLead(true);
    const { error } = await supabase.from("tenant_website_leads" as any).insert({
      website_id: site.id,
      user_id: site.user_id,
      lead_name: lead.name || null,
      lead_email: lead.email || null,
      lead_phone: lead.phone || null,
      lead_company: lead.company || null,
      message: lead.message || null,
      status: "new",
      source: "public_site",
    });
    setSubmittingLead(false);
    if (error) {
      toast.error("Could not submit. Please try again.");
      return;
    }
    toast.success("Thanks! We'll be in touch shortly.");
    setLead({ name: "", email: "", phone: "", company: "", message: "" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !site) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-md">
          <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Site not found</h1>
          <p className="text-muted-foreground mb-6">
            No published site exists at this address. The site may be unpublished or the link is incorrect.
          </p>
          <Button asChild>
            <Link to="/">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const home = pages.find((p) => p.page_type === "home")?.content || {};
  const services = pages.find((p) => p.page_type === "services")?.content || {};
  const coverage = pages.find((p) => p.page_type === "coverage")?.content || {};
  const about = pages.find((p) => p.page_type === "about")?.content || {};
  const contact = pages.find((p) => p.page_type === "contact")?.content || {};
  const brand = site.primary_color || "#0EA5E9";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 sticky top-0 bg-background/90 backdrop-blur-sm z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: brand }}
            >
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">{site.company_name}</h1>
              {site.tagline && <p className="text-[11px] text-muted-foreground">{site.tagline}</p>}
            </div>
          </div>
          <a href="#contact">
            <Button size="sm" style={{ backgroundColor: brand }} className="text-white">
              Get a Quote
            </Button>
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{ background: `radial-gradient(circle at 30% 20%, ${brand}, transparent 60%)` }}
        />
        <div className="max-w-5xl mx-auto text-center relative">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {home.hero_headline || `Reliable Logistics by ${site.company_name}`}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            {home.hero_sub || site.tagline}
          </p>
          <a href="#contact">
            <Button size="lg" style={{ backgroundColor: brand }} className="text-white">
              {home.cta || "Request a Quote"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </a>
        </div>
      </section>

      {/* Value props */}
      {Array.isArray(home.value_props) && home.value_props.length > 0 && (
        <section className="py-12 px-6 bg-muted/30 border-y border-border/30">
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
            {home.value_props.map((v: string, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: brand }} />
                <p className="text-sm font-medium">{v}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services */}
      {Array.isArray(services.services) && services.services.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-3xl font-bold mb-3">Our Services</h3>
            <p className="text-muted-foreground mb-8 max-w-2xl">{services.intro}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.services.map((s: string, i: number) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                      style={{ backgroundColor: `${brand}20`, color: brand }}
                    >
                      <Truck className="w-5 h-5" />
                    </div>
                    <h4 className="font-semibold capitalize">{s}</h4>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Coverage */}
      {Array.isArray(coverage.cities) && coverage.cities.length > 0 && (
        <section className="py-16 px-6 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-3xl font-bold mb-3">Coverage</h3>
            <p className="text-muted-foreground mb-6">
              Operating across {coverage.cities.length} location{coverage.cities.length > 1 ? "s" : ""}
              {coverage.fleet_size ? ` with a fleet of ${coverage.fleet_size} vehicles.` : "."}
            </p>
            <div className="flex flex-wrap gap-2">
              {coverage.cities.map((c: string, i: number) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-border bg-background"
                >
                  <MapPin className="w-3.5 h-3.5" style={{ color: brand }} /> {c}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About */}
      {about.body && (
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-3xl font-bold mb-4">About Us</h3>
            <p className="text-muted-foreground leading-relaxed">{about.body}</p>
          </div>
        </section>
      )}

      {/* Contact / Lead */}
      <section id="contact" className="py-16 px-6 bg-muted/30 border-t border-border/30">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-3xl font-bold mb-3 text-center">Get in Touch</h3>
          <p className="text-muted-foreground text-center mb-8">
            Tell us about your shipment - we'll respond within 24 hours.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              {(contact.email || site.contact_email) && (
                <a
                  href={`mailto:${contact.email || site.contact_email}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-background"
                >
                  <Mail className="w-4 h-4" style={{ color: brand }} />
                  <span className="text-sm">{contact.email || site.contact_email}</span>
                </a>
              )}
              {(contact.phone || site.contact_phone) && (
                <a
                  href={`tel:${contact.phone || site.contact_phone}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-background"
                >
                  <Phone className="w-4 h-4" style={{ color: brand }} />
                  <span className="text-sm">{contact.phone || site.contact_phone}</span>
                </a>
              )}
              {(contact.whatsapp || site.contact_whatsapp) && (
                <a
                  href={`https://wa.me/${(contact.whatsapp || site.contact_whatsapp || "").replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-background"
                >
                  <MessageCircle className="w-4 h-4" style={{ color: brand }} />
                  <span className="text-sm">WhatsApp</span>
                </a>
              )}
            </div>

            <form onSubmit={submitLead} className="space-y-3">
              <input
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                placeholder="Your name"
                value={lead.name}
                onChange={(e) => setLead({ ...lead, name: e.target.value })}
              />
              <input
                type="email"
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                placeholder="Email"
                value={lead.email}
                onChange={(e) => setLead({ ...lead, email: e.target.value })}
              />
              <input
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                placeholder="Phone"
                value={lead.phone}
                onChange={(e) => setLead({ ...lead, phone: e.target.value })}
              />
              <input
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                placeholder="Company (optional)"
                value={lead.company}
                onChange={(e) => setLead({ ...lead, company: e.target.value })}
              />
              <textarea
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                placeholder="What do you need?"
                value={lead.message}
                onChange={(e) => setLead({ ...lead, message: e.target.value })}
              />
              <Button
                type="submit"
                disabled={submittingLead}
                className="w-full text-white"
                style={{ backgroundColor: brand }}
              >
                {submittingLead ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send enquiry"}
              </Button>
            </form>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-6 px-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {site.company_name}. Powered by{" "}
        <a href="https://routeace.app" className="text-primary hover:underline">
          RouteAce
        </a>
      </footer>
    </div>
  );
};

export default PublicSiteViewer;
