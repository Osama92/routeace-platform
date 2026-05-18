import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Globe, Sparkles, Send, ExternalLink, Eye } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function WebsiteGenerator() {
  const { toast } = useToast();
  const [sites, setSites] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    services: "",
    cities_served: "",
    fleet_size: "",
    target_clients: "",
    contact_email: "",
    contact_phone: "",
    contact_whatsapp: "",
    tagline: "",
    brand_style: "professional",
    primary_color: "#0EA5E9",
  });

  const call = async (route: string, method = "GET", body?: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/website-generator-engine?route=${route}`;
    const r = await fetch(url, { method, headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    return r.json();
  };

  const load = async () => {
    const j = await call("/list");
    setSites(j.data || []);
    const lj = await call("/leads");
    setLeads(lj.data || []);
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    if (!form.company_name) { toast({ title: "Company name required", variant: "destructive" }); return; }
    setLoading(true);
    const payload = {
      ...form,
      services: form.services.split(",").map(s => s.trim()).filter(Boolean),
      cities_served: form.cities_served.split(",").map(s => s.trim()).filter(Boolean),
      target_clients: form.target_clients.split(",").map(s => s.trim()).filter(Boolean),
      fleet_size: form.fleet_size ? Number(form.fleet_size) : null,
    };
    const j = await call("/generate", "POST", payload);
    if (j.error) toast({ title: "Error", description: j.error, variant: "destructive" });
    else toast({ title: "Website generated", description: `${j.pages_created} pages created.` });
    await load();
    setLoading(false);
  };

  const publish = async (id: string) => {
    await call("/publish", "POST", { website_id: id });
    toast({ title: "Published" });
    await load();
  };

  return (
    <DashboardLayout title="AI Website Generator" subtitle="Spin up SEO-ready, lead-capturing logistics sites">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Generate New Website</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div><Label>Company Name *</Label><Input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></div>
            <div><Label>Tagline</Label><Input value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} placeholder="Reliable logistics, delivered." /></div>
            <div><Label>Services (comma-separated)</Label><Input value={form.services} onChange={e => setForm({ ...form, services: e.target.value })} placeholder="haulage, last-mile, cold chain" /></div>
            <div><Label>Cities Served</Label><Input value={form.cities_served} onChange={e => setForm({ ...form, cities_served: e.target.value })} placeholder="Lagos, Abuja, Ibadan" /></div>
            <div><Label>Fleet Size</Label><Input type="number" value={form.fleet_size} onChange={e => setForm({ ...form, fleet_size: e.target.value })} /></div>
            <div><Label>Target Clients</Label><Input value={form.target_clients} onChange={e => setForm({ ...form, target_clients: e.target.value })} placeholder="FMCG, e-commerce, SMEs" /></div>
            <div><Label>Contact Email</Label><Input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></div>
            <div><Label>Contact Phone</Label><Input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} /></div>
            <div><Label>WhatsApp</Label><Input value={form.contact_whatsapp} onChange={e => setForm({ ...form, contact_whatsapp: e.target.value })} /></div>
            <div><Label>Brand Color</Label><Input type="color" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} /></div>
            <div className="md:col-span-2">
              <Button onClick={generate} disabled={loading} className="w-full"><Sparkles className="h-4 w-4 mr-2" /> {loading ? "Generating..." : "Generate Website with AI"}</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Your Websites</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {sites.length === 0 && <p className="text-muted-foreground text-sm">No websites yet.</p>}
            {sites.map((s) => {
              const previewUrl = `/site/${s.subdomain}`;
              return (
                <div key={s.id} className="border rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="truncate">{s.company_name}</strong>
                      <Badge variant={s.status === "published" ? "default" : "secondary"}>{s.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground break-all">
                      <a href={previewUrl} target="_blank" rel="noreferrer" className="hover:underline">
                        {window.location.origin}{previewUrl}
                      </a>
                      {" · "}{s.seo_keywords?.length || 0} keywords
                    </p>
                    <p className="text-xs mt-1 italic">{s.meta_description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <a href={previewUrl} target="_blank" rel="noreferrer">
                        <Eye className="h-4 w-4 mr-1" /> Preview
                      </a>
                    </Button>
                    {s.status !== "published" && (
                      <Button size="sm" onClick={() => publish(s.id)}><Send className="h-4 w-4 mr-1" /> Publish</Button>
                    )}
                    {s.status === "published" && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={previewUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Captured Leads ({leads.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {leads.length === 0 && <p className="text-muted-foreground text-sm">No leads yet.</p>}
            {leads.map((l) => (
              <div key={l.id} className="border rounded-lg p-3 flex justify-between text-sm">
                <div>
                  <strong>{l.lead_name || "Anonymous"}</strong> · {l.lead_email || l.lead_phone}
                  {l.lead_company && <span className="text-muted-foreground"> · {l.lead_company}</span>}
                  <p className="text-xs text-muted-foreground mt-1">{l.message}</p>
                </div>
                <Badge variant="outline">{l.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
