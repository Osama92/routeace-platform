import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import {
  Users, Truck, Send, Link2, Gift, Map, Star, Network, Building2,
  Mail, Smartphone, Copy, CheckCircle, TrendingUp, Warehouse, Globe
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PARTNER_TYPES = [
  { label: "Subcontractor Fleet", icon: Truck, desc: "Outsource capacity to partner fleets" },
  { label: "Delivery Partner", icon: Send, desc: "Last-mile delivery collaborators" },
  { label: "Warehouse Operator", icon: Warehouse, desc: "Shared warehouse & drop points" },
  { label: "Distribution Company", icon: Building2, desc: "Regional distributors & wholesalers" },
];

const REFERRAL_TIERS = [
  { count: "1 Fleet", reward: "200 AI Credits", icon: Gift },
  { count: "5 Fleets", reward: "3 Months Premium", icon: Star },
  { count: "10 Fleets", reward: "Enterprise Features", icon: TrendingUp },
];

const NETWORK_STATS = [
  { label: "Fleets Connected", value: "340", icon: Truck },
  { label: "Delivery Routes", value: "12.5K", icon: Map },
  { label: "Network Capacity", value: "2,100 Trucks", icon: Network },
  { label: "Exchange Transactions", value: "8,420", icon: Globe },
];

export default function FleetNetworkActivation() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const inviteLink = "https://routeace.com/join/fleet-" + Math.random().toString(36).slice(2, 8);

  const handleInvite = () => {
    if (!email) return;
    toast({ title: "Invitation Sent", description: `Partner invitation sent to ${email}` });
    setEmail("");
  };

  return (
    <DashboardLayout title="Fleet Network Activation" subtitle="Grow the RouteAce logistics network through partner invitations">
      {/* Network Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {NETWORK_STATS.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><s.icon className="w-5 h-5 text-primary" /></div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="invite" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="invite">Invite Partners</TabsTrigger>
          <TabsTrigger value="capacity">Capacity Marketplace</TabsTrigger>
          <TabsTrigger value="referrals">Referral Incentives</TabsTrigger>
          <TabsTrigger value="network">Network Map</TabsTrigger>
          <TabsTrigger value="matching">Smart Matching</TabsTrigger>
          <TabsTrigger value="reliability">Reliability Scores</TabsTrigger>
        </TabsList>

        {/* Invite Partners */}
        <TabsContent value="invite" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invite Fleet Partners</CardTitle>
                <CardDescription>Send invitations via email, SMS, or shareable link</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="flex gap-2">
                    <Input placeholder="partner@logistics.com" value={email} onChange={e => setEmail(e.target.value)} />
                    <Button onClick={handleInvite}><Mail className="w-4 h-4 mr-1" /> Send</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Shareable Invite Link</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={inviteLink} className="text-xs" />
                    <Button variant="outline" onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ title: "Copied!" }); }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Partner Types</CardTitle>
                <CardDescription>Choose what type of partner to onboard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {PARTNER_TYPES.map(p => (
                  <div key={p.label} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10"><p.icon className="w-4 h-4 text-primary" /></div>
                    <div><p className="text-sm font-medium">{p.label}</p><p className="text-xs text-muted-foreground">{p.desc}</p></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Benefits */}
          <Card>
            <CardHeader><CardTitle className="text-base">Network Benefits</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {["Shared logistics capacity", "Coordinated deliveries", "Access Distribution Exchange", "Faster route matching"].map(b => (
                  <div key={b} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{b}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capacity Marketplace */}
        <TabsContent value="capacity">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logistics Capacity Marketplace</CardTitle>
              <CardDescription>Post available trucks, routes, or accept delivery jobs from partners</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: "Post Available Trucks", desc: "Share excess fleet capacity with the network", action: "Post Capacity" },
                  { title: "Post Available Routes", desc: "Offer routes you serve regularly", action: "Post Route" },
                  { title: "Accept Partner Jobs", desc: "Pick up subcontracted deliveries", action: "Browse Jobs" },
                ].map(c => (
                  <div key={c.title} className="p-4 rounded-lg border text-center space-y-3">
                    <p className="font-semibold text-sm">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.desc}</p>
                    <Button size="sm" variant="outline">{c.action}</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referral Incentives */}
        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Referral Incentives</CardTitle>
              <CardDescription>Earn rewards for growing the network</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {REFERRAL_TIERS.map(t => (
                  <div key={t.count} className="p-6 rounded-xl border-2 border-dashed text-center space-y-3 hover:border-primary transition-colors">
                    <t.icon className="w-8 h-8 mx-auto text-primary" />
                    <p className="font-semibold">Invite {t.count}</p>
                    <Badge className="bg-primary/10 text-primary">{t.reward}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Network Map Placeholder */}
        <TabsContent value="network">
          <Card>
            <CardHeader><CardTitle className="text-base">RouteAce Logistics Network Map</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center border-2 border-dashed">
                <div className="text-center space-y-2">
                  <Map className="w-12 h-12 mx-auto text-primary/40" />
                  <p className="text-muted-foreground">Interactive network map - connect Google Maps API to display fleet, warehouse, and hub locations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Smart Matching */}
        <TabsContent value="matching">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Partner Matching</CardTitle>
              <CardDescription>Intelligent recommendations based on location, capacity, and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Network className="w-12 h-12 mx-auto mb-3 text-primary/40" />
                <p>Partner matching activates once 3+ network partners are connected.</p>
                <Button className="mt-4" onClick={() => toast({ title: "Coming Soon", description: "AI matching requires network growth" })}>Run Matching</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reliability Scores */}
        <TabsContent value="reliability">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Network Reliability Scores</CardTitle>
              <CardDescription>Every partner fleet receives a Logistics Reliability Score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {["Delivery Completion Rate", "Route Punctuality", "Driver Ratings"].map(m => (
                  <div key={m} className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm font-medium">{m}</p>
                    <p className="text-2xl font-bold text-primary mt-1">--</p>
                    <p className="text-xs text-muted-foreground">No data yet</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
