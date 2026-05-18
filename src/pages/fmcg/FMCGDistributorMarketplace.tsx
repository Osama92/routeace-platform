import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Store, Globe, MapPin, Truck, Users, Star, Search, Filter, Handshake, TrendingUp, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import FMCGLayout from "@/components/fmcg/FMCGLayout";

interface DistributorProfile {
  id: string;
  company_name: string;
  country: string;
  region: string;
  territories_served: string[];
  warehouse_count: number;
  fleet_size: number;
  retail_network_size: number;
  category_expertise: string[];
  monthly_revenue: number;
  performance_rating: number;
  is_verified: boolean;
}


const FMCGDistributorMarketplace = () => {
  const [profiles, setProfiles] = useState<DistributorProfile[]>([]);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase.from("distributor_marketplace_profiles").select("*").eq("is_active", true);
      setProfiles((data as DistributorProfile[]) || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = profiles.filter(p => {
    const matchSearch = p.company_name.toLowerCase().includes(search.toLowerCase()) || p.region?.toLowerCase().includes(search.toLowerCase());
    const matchCountry = countryFilter === "all" || p.country === countryFilter;
    return matchSearch && matchCountry;
  });

  if (!loading && profiles.length === 0) {
    return (
      <FMCGLayout>
        <div className="p-6">
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-3 mb-2">
            <Store className="w-7 h-7 text-primary" />
            Distributor Marketplace
          </h1>
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-6">
              <Handshake className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No distributors listed yet</h3>
            <p className="text-sm text-muted-foreground">Distributor profiles will appear here once partners register on the marketplace or are added by your team.</p>
          </div>
        </div>
      </FMCGLayout>
    );
  }

  const countries = [...new Set(profiles.map(p => p.country))];

  return (
    <FMCGLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-3">
              <Handshake className="w-7 h-7 text-purple-400" />
              Distributor Marketplace
            </h1>
            <p className="text-muted-foreground mt-1">Connect manufacturers with distributors across Africa - AI-powered territory matching</p>
          </div>
          <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-sm px-3 py-1">
            ENGINE 5 - Network Expansion
          </Badge>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Listed Distributors", value: profiles.length, icon: Building2, color: "text-primary" },
            { label: "Countries", value: countries.length, icon: Globe, color: "text-emerald-400" },
            { label: "Total Retail Network", value: `${(profiles.reduce((s, p) => s + p.retail_network_size, 0) / 1000).toFixed(1)}K`, icon: Store, color: "text-amber-400" },
            { label: "Verified Partners", value: profiles.filter(p => p.is_verified).length, icon: Star, color: "text-blue-400" },
          ].map(kpi => (
            <Card key={kpi.label} className="bg-card border-border">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
                  </div>
                  <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search distributors, regions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Countries" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="directory">
          <TabsList>
            <TabsTrigger value="directory">Directory ({filtered.length})</TabsTrigger>
            <TabsTrigger value="matching">AI Matching</TabsTrigger>
            <TabsTrigger value="flywheel">Network Effect</TabsTrigger>
          </TabsList>

          <TabsContent value="directory">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(profile => (
                <motion.div key={profile.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="bg-card border-border hover:border-primary/30 transition-colors">
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-purple-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-foreground">{profile.company_name}</h3>
                              {profile.is_verified && <Badge className="bg-emerald-500/15 text-emerald-400 text-[10px]">✓ Verified</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {profile.region}, {profile.country}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-amber-400">
                          <Star className="w-4 h-4 fill-amber-400" />
                          <span className="text-sm font-medium">{profile.performance_rating}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                        <div className="text-center p-2 rounded bg-secondary/30">
                          <Truck className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                          <p className="font-medium text-foreground">{profile.fleet_size}</p>
                          <p className="text-[10px] text-muted-foreground">Fleet</p>
                        </div>
                        <div className="text-center p-2 rounded bg-secondary/30">
                          <Store className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                          <p className="font-medium text-foreground">{profile.retail_network_size}</p>
                          <p className="text-[10px] text-muted-foreground">Retailers</p>
                        </div>
                        <div className="text-center p-2 rounded bg-secondary/30">
                          <MapPin className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                          <p className="font-medium text-foreground">{profile.territories_served.length}</p>
                          <p className="text-[10px] text-muted-foreground">Territories</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {profile.category_expertise.map(cat => (
                          <Badge key={cat} variant="outline" className="text-[10px]">{cat}</Badge>
                        ))}
                      </div>

                      <Button size="sm" className="w-full">
                        <Handshake className="w-4 h-4 mr-2" /> Request Partnership
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="matching">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-heading font-bold text-foreground mb-2">AI Territory Matching Engine</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    Our AI analyzes territory gaps, category expertise, and retail coverage density to recommend optimal distributor partnerships for market expansion.
                  </p>
                  <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto text-sm">
                    {["Territory Gap Analysis", "Category Fit Score", "Coverage Density Match"].map(f => (
                      <div key={f} className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">{f}</div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flywheel">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-6">
                  <h3 className="text-xl font-heading font-bold text-foreground">Marketplace Network Effect</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                    {[
                      { step: "1", title: "Manufacturers Join", desc: "Seeking distribution partners" },
                      { step: "2", title: "Distributors Onboard", desc: "Showcase capabilities & coverage" },
                      { step: "3", title: "AI Matches Partners", desc: "Optimal territory-category fit" },
                      { step: "4", title: "Network Expands", desc: "Larger retail coverage map" },
                    ].map(s => (
                      <div key={s.step} className="flex flex-col items-center text-center p-4 rounded-lg bg-secondary/30">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mb-2">
                          <span className="font-bold text-purple-400">{s.step}</span>
                        </div>
                        <p className="font-medium text-foreground text-sm">{s.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FMCGLayout>
  );
};

export default FMCGDistributorMarketplace;
