import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import {
  Cpu, Sparkles, Users, LayoutGrid, BarChart3, Brain,
  Plug, Monitor, ChevronRight, Loader2, Building2,
  ShieldCheck, Truck, Wallet, Target, ArrowLeft, Download,
} from "lucide-react";

interface IndustryOS {
  name: string;
  code: string;
  tagline: string;
  supplyChainAnalysis: {
    structure: string;
    primaryParticipants: string[];
    demandCycles: string;
    complianceRequirements: string[];
    logisticsRequirements: string[];
  };
  userHierarchy: Array<{
    role: string; label: string; description: string;
    level: number; permissions: string[];
    dashboardFocus: string; kpis: string[];
  }>;
  modules: Array<{
    id: string; name: string; icon: string;
    description: string; features: string[]; roles: string[];
  }>;
  industrySpecificFeatures: Array<{
    name: string; description: string;
    importance: "critical" | "high" | "medium";
  }>;
  kpiFramework: {
    sales: Array<{ name: string; formula: string; target: string }>;
    logistics: Array<{ name: string; formula: string; target: string }>;
    warehouse: Array<{ name: string; formula: string; target: string }>;
    finance: Array<{ name: string; formula: string; target: string }>;
  };
  aiIntelligence: Array<{
    name: string; type: string; description: string;
    dataInputs: string[]; outputs: string[];
  }>;
  integrations: Array<{
    name: string; category: string;
    description: string; priority: string;
  }>;
  dashboards: Array<{
    name: string; targetRole: string;
    widgets: Array<{ name: string; type: string; description: string }>;
  }>;
}

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-industry-os`;

const IndustryOSGenerator = () => {
  const [industryName, setIndustryName] = useState("");
  const [industryDesc, setIndustryDesc] = useState("");
  const [products, setProducts] = useState("");
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [result, setResult] = useState<IndustryOS | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const generate = useCallback(async () => {
    if (!industryName.trim()) { toast.error("Enter an industry name"); return; }
    setGenerating(true);
    setResult(null);
    setStreamText("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("You must be signed in to generate an Industry OS");
        setGenerating(false);
        return;
      }
      const resp = await fetch(GENERATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ industryName, industryDescription: industryDesc, products }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Generation failed" }));
        toast.error(err.error || "Generation failed");
        setGenerating(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              setStreamText(fullContent);
            }
          } catch { /* partial */ }
        }
      }

      // Parse the final JSON
      const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          setResult(parsed.industryOS || parsed);
          setActiveTab("overview");
          toast.success(`${industryName} OS generated successfully!`);
        } catch {
          toast.error("Failed to parse AI response. Please try again.");
        }
      } else {
        toast.error("No valid response received. Please try again.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [industryName, industryDesc, products]);

  const exportJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify({ industryOS: result }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.code || "industry"}-os-blueprint.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importanceBadge = (imp: string) => {
    const colors: Record<string, string> = {
      critical: "bg-destructive/15 text-destructive border-destructive/30",
      high: "bg-amber-500/15 text-amber-600 border-amber-500/30",
      medium: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    };
    return colors[imp] || colors.medium;
  };

  const priorityBadge = (p: string) => {
    const colors: Record<string, string> = {
      essential: "bg-destructive/15 text-destructive",
      recommended: "bg-amber-500/15 text-amber-600",
      optional: "bg-muted text-muted-foreground",
    };
    return colors[p] || colors.optional;
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-[280px] transition-all duration-300">
        <Header title="Industry OS Generator" subtitle="AI-Powered Vertical Commerce Architecture Engine" />
        <div className="p-8 space-y-8">

          {/* Input Section */}
          {!result && (
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="text-center space-y-3">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
                  <Cpu className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl font-heading font-bold text-foreground">
                  Generate Any Industry OS
                </h1>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  Enter an industry and our AI will architect a complete operating system - roles, modules, KPIs, dashboards, AI models, and integrations.
                </p>
              </div>

              <Card className="border-border/50">
                <CardContent className="pt-6 space-y-5">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Industry Name *</label>
                    <Input
                      placeholder="e.g. Fisheries Supply Chain, Medical Equipment, Textile Manufacturing"
                      value={industryName}
                      onChange={e => setIndustryName(e.target.value)}
                      className="text-base"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Industry Description</label>
                    <Textarea
                      placeholder="Describe the industry, its challenges, and distribution model..."
                      value={industryDesc}
                      onChange={e => setIndustryDesc(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Products / Services</label>
                    <Input
                      placeholder="e.g. frozen fish, seafood, aquaculture supplies, fishing nets"
                      value={products}
                      onChange={e => setProducts(e.target.value)}
                    />
                  </div>
                  <Button onClick={generate} disabled={generating} className="w-full h-12 text-base" size="lg">
                    {generating ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating OS Blueprint...</>
                    ) : (
                      <><Sparkles className="w-5 h-5 mr-2" /> Generate Industry OS</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Streaming preview */}
              {generating && streamText && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      AI is architecting your OS...
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                        {streamText.slice(-2000)}
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Result Section */}
          {result && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => setResult(null)}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <h2 className="text-2xl font-heading font-bold text-foreground">{result.name}</h2>
                    <p className="text-muted-foreground">{result.tagline}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportJSON}>
                    <Download className="w-4 h-4 mr-2" /> Export Blueprint
                  </Button>
                  <Button variant="outline" onClick={() => setResult(null)}>
                    Generate Another
                  </Button>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="roles" className="text-xs">Roles</TabsTrigger>
                  <TabsTrigger value="modules" className="text-xs">Modules</TabsTrigger>
                  <TabsTrigger value="kpis" className="text-xs">KPIs</TabsTrigger>
                  <TabsTrigger value="ai" className="text-xs">AI Layer</TabsTrigger>
                  <TabsTrigger value="integrations" className="text-xs">Integrations</TabsTrigger>
                  <TabsTrigger value="dashboards" className="text-xs">Dashboards</TabsTrigger>
                  <TabsTrigger value="features" className="text-xs">Features</TabsTrigger>
                </TabsList>

                {/* Overview */}
                <TabsContent value="overview" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard icon={Users} label="Roles" value={result.userHierarchy?.length || 0} />
                    <StatCard icon={LayoutGrid} label="Modules" value={result.modules?.length || 0} />
                    <StatCard icon={Brain} label="AI Models" value={result.aiIntelligence?.length || 0} />
                    <StatCard icon={Plug} label="Integrations" value={result.integrations?.length || 0} />
                  </div>
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Supply Chain Analysis</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{result.supplyChainAnalysis?.structure}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Primary Participants</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {result.supplyChainAnalysis?.primaryParticipants?.map((p, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Demand Cycles</h4>
                          <p className="text-sm text-muted-foreground">{result.supplyChainAnalysis?.demandCycles}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Compliance Requirements</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {result.supplyChainAnalysis?.complianceRequirements?.map((c, i) => (
                              <Badge key={i} variant="outline" className="text-xs border-destructive/30 text-destructive">{c}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Logistics Requirements</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {result.supplyChainAnalysis?.logisticsRequirements?.map((l, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{l}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Roles */}
                <TabsContent value="roles" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.userHierarchy?.sort((a, b) => a.level - b.level).map((role, i) => (
                      <Card key={i} className="border-border/50">
                        <CardContent className="pt-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-foreground">{role.label}</h3>
                              <p className="text-xs text-muted-foreground">Level {role.level} · {role.role}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">L{role.level}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{role.description}</p>
                          <div>
                            <p className="text-xs font-medium mb-1">Dashboard Focus</p>
                            <p className="text-xs text-muted-foreground">{role.dashboardFocus}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium mb-1">KPIs</p>
                            <div className="flex flex-wrap gap-1">
                              {role.kpis?.map((k, j) => (
                                <Badge key={j} variant="secondary" className="text-[10px]">{k}</Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium mb-1">Permissions</p>
                            <div className="flex flex-wrap gap-1">
                              {role.permissions?.slice(0, 6).map((p, j) => (
                                <Badge key={j} variant="outline" className="text-[10px]">{p}</Badge>
                              ))}
                              {(role.permissions?.length || 0) > 6 && (
                                <Badge variant="outline" className="text-[10px]">+{role.permissions.length - 6}</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Modules */}
                <TabsContent value="modules" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {result.modules?.map((mod, i) => (
                      <Card key={i} className="border-border/50">
                        <CardContent className="pt-5 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <LayoutGrid className="w-4 h-4 text-primary" />
                            </div>
                            <h3 className="font-semibold text-foreground text-sm">{mod.name}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground">{mod.description}</p>
                          <div>
                            <p className="text-xs font-medium mb-1.5">Features</p>
                            <ul className="space-y-1">
                              {mod.features?.map((f, j) => (
                                <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                  <ChevronRight className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {mod.roles?.map((r, j) => (
                              <Badge key={j} variant="secondary" className="text-[10px]">{r}</Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* KPIs */}
                <TabsContent value="kpis" className="mt-6 space-y-6">
                  {(["sales", "logistics", "warehouse", "finance"] as const).map(cat => {
                    const kpis = result.kpiFramework?.[cat];
                    if (!kpis?.length) return null;
                    const icons: Record<string, typeof Target> = { sales: Target, logistics: Truck, warehouse: Building2, finance: Wallet };
                    const Icon = icons[cat] || Target;
                    return (
                      <Card key={cat}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2 capitalize">
                            <Icon className="w-4 h-4 text-primary" /> {cat} KPIs
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {kpis.map((k, i) => (
                              <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-1">
                                <p className="text-sm font-medium text-foreground">{k.name}</p>
                                <p className="text-xs text-muted-foreground">Formula: {k.formula}</p>
                                <p className="text-xs text-primary font-medium">Target: {k.target}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </TabsContent>

                {/* AI Layer */}
                <TabsContent value="ai" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.aiIntelligence?.map((ai, i) => (
                      <Card key={i} className="border-primary/10 bg-gradient-to-br from-primary/5 to-transparent">
                        <CardContent className="pt-5 space-y-3">
                          <div className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold text-foreground text-sm">{ai.name}</h3>
                            <Badge variant="outline" className="text-[10px] ml-auto capitalize">{ai.type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{ai.description}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs font-medium mb-1">Data Inputs</p>
                              {ai.dataInputs?.map((d, j) => (
                                <p key={j} className="text-[10px] text-muted-foreground">• {d}</p>
                              ))}
                            </div>
                            <div>
                              <p className="text-xs font-medium mb-1">Outputs</p>
                              {ai.outputs?.map((o, j) => (
                                <p key={j} className="text-[10px] text-primary">• {o}</p>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Integrations */}
                <TabsContent value="integrations" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {result.integrations?.map((intg, i) => (
                      <Card key={i} className="border-border/50">
                        <CardContent className="pt-5 space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-foreground text-sm">{intg.name}</h3>
                            <Badge className={`text-[10px] ${priorityBadge(intg.priority)}`}>{intg.priority}</Badge>
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize">{intg.category}</Badge>
                          <p className="text-xs text-muted-foreground">{intg.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Dashboards */}
                <TabsContent value="dashboards" className="mt-6 space-y-6">
                  {result.dashboards?.map((dash, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Monitor className="w-4 h-4 text-primary" /> {dash.name}
                          </CardTitle>
                          <Badge variant="secondary" className="text-xs">{dash.targetRole}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {dash.widgets?.map((w, j) => (
                            <div key={j} className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-foreground">{w.name}</p>
                                <Badge variant="outline" className="text-[10px] capitalize">{w.type}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{w.description}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                {/* Industry-Specific Features */}
                <TabsContent value="features" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.industrySpecificFeatures?.map((f, i) => (
                      <Card key={i} className="border-border/50">
                        <CardContent className="pt-5 space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-primary" />
                              {f.name}
                            </h3>
                            <Badge className={`text-[10px] border ${importanceBadge(f.importance)}`}>{f.importance}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{f.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: number }) => (
  <Card className="border-border/50">
    <CardContent className="pt-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);

export default IndustryOSGenerator;
