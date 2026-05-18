import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, Network, Users, TrendingUp, Gift, Target } from "lucide-react";

const fmtN = (n: number) => `₦${(n / 1e6).toFixed(1)}M`;

export default function SelfExpandingNetwork() {
  const [running, setRunning] = useState(false);
  const qc = useQueryClient();

  const { data: leads = [] } = useQuery({
    queryKey: ["growth-leads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("growth_lead_signals")
        .select("*")
        .order("opportunity_score", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["growth-referrals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("growth_referral_triggers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const runEngine = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("growth-network-engine", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Generated ${data.summary?.new_lead_signals || 0} leads, ${data.summary?.new_referral_triggers || 0} referrals`);
      qc.invalidateQueries({ queryKey: ["growth-leads"] });
      qc.invalidateQueries({ queryKey: ["growth-referrals"] });
    } catch (e: any) {
      toast.error(e.message || "Engine run failed");
    } finally {
      setRunning(false);
    }
  };

  const updateLead = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("growth_lead_signals").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["growth-leads"] });
    },
  });

  const updateReferral = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("growth_referral_triggers").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["growth-referrals"] });
    },
  });

  const totalPipelineValue = leads
    .filter((l: any) => ["new", "contacted"].includes(l.status))
    .reduce((s: number, l: any) => s + Number(l.estimated_monthly_value || 0), 0);
  const newLeads = leads.filter((l: any) => l.status === "new").length;
  const converted = leads.filter((l: any) => l.status === "converted").length;
  const conversionRate = leads.length ? Math.round((converted / leads.length) * 100) : 0;
  const pendingReferrals = referrals.filter((r: any) => r.status === "pending").length;

  return (
    <DashboardLayout title="Self-Expanding Network">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Network className="w-7 h-7 text-primary" /> Self-Expanding Network
            </h1>
            <p className="text-muted-foreground">
              Auto-generated leads, referral triggers & product-led growth signals - recommend-only.
            </p>
          </div>
          <Button onClick={runEngine} disabled={running}>
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scanning…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" /> Run Growth Scan
              </>
            )}
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          <KPI icon={Target} label="Pipeline Value (monthly)" value={fmtN(totalPipelineValue)} accent="text-primary" />
          <KPI icon={Users} label="New leads" value={newLeads} accent="text-blue-500" />
          <KPI icon={TrendingUp} label="Conversion rate" value={`${conversionRate}%`} accent="text-green-500" />
          <KPI icon={Gift} label="Pending referrals" value={pendingReferrals} accent="text-purple-500" />
        </div>

        <Tabs defaultValue="leads">
          <TabsList>
            <TabsTrigger value="leads">Lead Signals ({leads.length})</TabsTrigger>
            <TabsTrigger value="referrals">Referral Triggers ({referrals.length})</TabsTrigger>
            <TabsTrigger value="hooks">Product-Led Hooks</TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <CardTitle>AI-generated lead signals</CardTitle>
                <CardDescription>Recommend-only. Action manually - no auto-outreach.</CardDescription>
              </CardHeader>
              <CardContent>
                {leads.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No leads yet. Click "Run Growth Scan".</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Target</TableHead>
                        <TableHead>Segment</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="text-right">Est. Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((l: any) => (
                        <TableRow key={l.id}>
                          <TableCell>
                            <div className="font-medium">{l.target_name}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">{l.recommended_pitch}</div>
                          </TableCell>
                          <TableCell><Badge variant="outline">{l.segment}</Badge></TableCell>
                          <TableCell className="text-sm">{l.region}</TableCell>
                          <TableCell className="text-right font-semibold">{Math.round(l.opportunity_score)}</TableCell>
                          <TableCell className="text-right">{fmtN(Number(l.estimated_monthly_value || 0))}</TableCell>
                          <TableCell>
                            <Badge variant={l.status === "converted" ? "default" : l.status === "rejected" ? "destructive" : "secondary"}>
                              {l.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {l.status === "new" && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={() => updateLead.mutate({ id: l.id, status: "contacted" })}>Mark Contacted</Button>
                                <Button size="sm" onClick={() => updateLead.mutate({ id: l.id, status: "converted" })}>Converted</Button>
                              </div>
                            )}
                            {l.status === "contacted" && (
                              <Button size="sm" onClick={() => updateLead.mutate({ id: l.id, status: "converted" })}>Converted</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals">
            <Card>
              <CardHeader>
                <CardTitle>Referral triggers</CardTitle>
                <CardDescription>High-performing customers eligible for a referral prompt.</CardDescription>
              </CardHeader>
              <CardContent>
                {referrals.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No triggers yet.</p>
                ) : (
                  <div className="space-y-2">
                    {referrals.map((r: any) => (
                      <div key={r.id} className="p-3 rounded-lg border flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{r.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{r.trigger_reason}</p>
                          <p className="text-xs mt-1">Reward: <span className="font-medium">{r.recommended_reward}</span></p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={r.status === "sent" ? "default" : "secondary"}>{r.status}</Badge>
                          {r.status === "pending" && (
                            <Button size="sm" onClick={() => updateReferral.mutate({ id: r.id, status: "sent" })}>
                              Mark Sent
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hooks">
            <Card>
              <CardHeader>
                <CardTitle>Product-Led Acquisition Loop</CardTitle>
                <CardDescription>Embedded hooks that turn your customers' clients into your leads.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Hook
                  title="Tracking link branding"
                  body="Every shipment tracking link shows: 'Powered by Routeace - Reduce logistics cost by 20%. Try free.' Drives organic signups from your customers' clients."
                  status="active"
                />
                <Hook
                  title="Performance insight share"
                  body="Auto-attach a 1-page on-time + savings report to delivery confirmation emails. Recipients see the value Routeace delivered."
                  status="ready"
                />
                <Hook
                  title="Marketplace match suggestions"
                  body="When a customer needs trucks on a route Routeace already serves, suggest verified vendor partners - strengthens the network."
                  status="ready"
                />
                <Hook
                  title="Referral reward unlock"
                  body="High-volume customers (20+ deliveries/mo) unlock a referral CTA: free dispatch credits + premium feature trial."
                  status="active"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function KPI({ icon: Icon, label, value, accent }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className={`w-4 h-4 ${accent}`} /> {label}
        </div>
        <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function Hook({ title, body, status }: { title: string; body: string; status: "active" | "ready" }) {
  return (
    <div className="p-3 rounded-lg border bg-muted/30 flex items-start justify-between gap-3">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{body}</p>
      </div>
      <Badge variant={status === "active" ? "default" : "outline"}>{status}</Badge>
    </div>
  );
}
