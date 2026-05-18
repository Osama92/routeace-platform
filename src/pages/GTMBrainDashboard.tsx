import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useGTMBrain, classifyIntent, generateEngagementMessage } from "@/hooks/useGTMBrain";
import { useGTMCampaigns } from "@/hooks/useGTMCampaigns";
import { useGTMProductSignals } from "@/hooks/useGTMProductSignals";
import { useGTMCredits } from "@/hooks/useGTMCredits";
import GTMExecutiveDashboard from "@/components/gtm/GTMExecutiveDashboard";
import GTMConversationsTab from "@/components/gtm/GTMConversationsTab";
import GTMAutomationTab from "@/components/gtm/GTMAutomationTab";
import {
  Brain, Zap, Target, Users, MessageSquare, Calendar, TrendingUp,
  Search, Radio, ArrowRight, ExternalLink, Plus, Eye, ArrowLeft,
  Lock, CreditCard, Shield, BarChart3, Package, Megaphone, Settings2,
  LayoutDashboard,
} from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

// ─── Credit Costs for GTM Actions ────────────────────────────────
const GTM_CREDIT_COSTS = {
  view_signal: 0,
  capture_signal: 1,
  view_match: 2,
  unlock_contact: 5,
  start_conversation: 3,
  schedule_meeting: 2,
  export_lead: 10,
};

const INTENT_COLORS: Record<string, string> = {
  active_buy: "bg-green-500/20 text-green-400 border-green-500/30",
  problem_aware: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  expansion: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  passive: "bg-muted text-muted-foreground",
};

const STAGE_COLORS: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400",
  contacted: "bg-amber-500/20 text-amber-400",
  qualified: "bg-purple-500/20 text-purple-400",
  negotiation: "bg-orange-500/20 text-orange-400",
  closed_won: "bg-green-500/20 text-green-400",
  closed_lost: "bg-red-500/20 text-red-400",
};

const PIE_COLORS = ["#22c55e", "#f59e0b", "#8b5cf6", "#f97316", "#3b82f6", "#ef4444"];

const INDUSTRY_LABELS: Record<string, string> = {
  logistics: "Logistics",
  fmcg: "FMCG",
  pharma: "Pharmaceuticals",
  liquor: "Liquor",
  building_materials: "Building Materials",
  cosmetics: "Cosmetics",
  agri: "Agri-Inputs",
  auto: "Auto Ancillary",
  bfsi: "BFSI",
  consumer_goods: "Consumer Goods",
};

function maskContact(value: string | undefined | null): string {
  if (!value) return "••••••••";
  if (value.includes("@")) {
    const [user, domain] = value.split("@");
    return `${user.substring(0, 2)}${"•".repeat(Math.max(3, user.length - 2))}@${domain}`;
  }
  if (value.length > 4) return `${value.substring(0, 4)}${"•".repeat(value.length - 4)}`;
  return "••••••••";
}

interface GTMBrainDashboardProps {
  osMode?: "logistics" | "industry";
  industryType?: string;
}

export default function GTMBrainDashboard({ osMode, industryType }: GTMBrainDashboardProps) {
  const navigate = useNavigate();
  const osContext = osMode || "logistics";
  const effectiveIndustry = industryType || (osContext === "logistics" ? "logistics" : "fmcg");

  const gtm = useGTMBrain(osContext, effectiveIndustry);
  const campaigns = useGTMCampaigns(osContext, effectiveIndustry);
  const productSignals = useGTMProductSignals(osContext, effectiveIndustry);
  const credits = useGTMCredits(osContext, effectiveIndustry);

  const [showIngestDialog, setShowIngestDialog] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showSupplyDialog, setShowSupplyDialog] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [showProductSignalDialog, setShowProductSignalDialog] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<any>(null);
  const [unlockedContacts, setUnlockedContacts] = useState<Set<string>>(new Set());
  const [showCreditInfo, setShowCreditInfo] = useState(false);

  const [ingestForm, setIngestForm] = useState({
    source_type: "social",
    source_platform: "twitter",
    content: "",
    geo_location: "",
    author_handle: "",
    industry_tag: effectiveIndustry,
  });

  const [searchForm, setSearchForm] = useState({
    query_text: "", platform: "google", geo_location: "", city: "", state: "",
  });

  const [supplyForm, setSupplyForm] = useState({
    business_name: "",
    node_type: osContext === "logistics" ? "logistics_operator" : "distributor",
    city: "", state: "", country: "Nigeria",
    contact_name: "", contact_phone: "", contact_email: "", contact_whatsapp: "",
    industry: effectiveIndustry,
  });

  const [campaignForm, setCampaignForm] = useState({
    campaign_name: "", platform: "meta", impressions: 0, clicks: 0, spend: 0,
    conversions: 0, region: "", city: "", state: "", ad_type: "display",
  });

  const [productSignalForm, setProductSignalForm] = useState({
    product_name: "", product_category: "", signal_type: "demand",
    volume_indicator: 0, region: "", city: "", state: "",
    is_stockout: false, demand_level: "medium", raw_content: "",
  });

  // Credit helpers
  const canAfford = (action: keyof typeof GTM_CREDIT_COSTS) => credits.balance >= GTM_CREDIT_COSTS[action];
  const spendCredits = async (action: keyof typeof GTM_CREDIT_COSTS): Promise<boolean> => {
    const cost = GTM_CREDIT_COSTS[action];
    if (cost === 0) return true;
    if (!canAfford(action)) return false;
    return await credits.consumeCredits(action, cost);
  };

  const handleUnlockContact = async (nodeId: string) => {
    if (unlockedContacts.has(nodeId)) return;
    const ok = await spendCredits("unlock_contact");
    if (ok) setUnlockedContacts(prev => new Set(prev).add(nodeId));
  };

  const handleIngestSubmit = async () => {
    if (!ingestForm.content.trim()) return;
    const ok = await spendCredits("capture_signal");
    if (!ok) return;
    await gtm.ingestSignal(ingestForm);
    setIngestForm({ ...ingestForm, content: "", author_handle: "", geo_location: "" });
    setShowIngestDialog(false);
  };

  const handleSearchSubmit = async () => {
    if (!searchForm.query_text.trim()) return;
    const ok = await spendCredits("capture_signal");
    if (!ok) return;
    await gtm.ingestSearchQuery(searchForm);
    setSearchForm({ ...searchForm, query_text: "", geo_location: "", city: "", state: "" });
    setShowSearchDialog(false);
  };

  const handleSupplySubmit = async () => {
    if (!supplyForm.business_name.trim()) return;
    await gtm.registerSupplyNode({
      ...supplyForm,
      service_capabilities: [supplyForm.node_type],
      geo_coverage: { city: supplyForm.city, state: supplyForm.state, country: supplyForm.country },
      capacity: { level: "medium" },
      is_active: true,
    });
    setSupplyForm({ ...supplyForm, business_name: "", contact_name: "", contact_phone: "", contact_email: "", contact_whatsapp: "" });
    setShowSupplyDialog(false);
  };

  const handleCampaignSubmit = async () => {
    if (!campaignForm.campaign_name.trim()) return;
    const ctr = campaignForm.impressions > 0 ? (campaignForm.clicks / campaignForm.impressions) : 0;
    await campaigns.addCampaign({
      ...campaignForm,
      ctr,
      currency: "NGN",
      country: "Nigeria",
    });
    setCampaignForm({ ...campaignForm, campaign_name: "", impressions: 0, clicks: 0, spend: 0, conversions: 0, region: "" });
    setShowCampaignDialog(false);
  };

  const handleProductSignalSubmit = async () => {
    if (!productSignalForm.product_name.trim()) return;
    await productSignals.addProductSignal(productSignalForm);
    setProductSignalForm({ ...productSignalForm, product_name: "", product_category: "", raw_content: "", volume_indicator: 0 });
    setShowProductSignalDialog(false);
  };

  const osLabel = INDUSTRY_LABELS[effectiveIndustry] || (osContext === "logistics" ? "Logistics OS" : "Industry OS");
  const osColor = osContext === "logistics" ? "text-blue-400" : "text-purple-400";

  // Chart data
  const pipelineChartData = [
    { stage: "New", count: gtm.pipelineStats.new, fill: "#3b82f6" },
    { stage: "Contacted", count: gtm.pipelineStats.contacted, fill: "#f59e0b" },
    { stage: "Qualified", count: gtm.pipelineStats.qualified, fill: "#8b5cf6" },
    { stage: "Negotiation", count: gtm.pipelineStats.negotiation, fill: "#f97316" },
    { stage: "Won", count: gtm.pipelineStats.closedWon, fill: "#22c55e" },
    { stage: "Lost", count: gtm.pipelineStats.closedLost, fill: "#ef4444" },
  ];

  const intentDistribution = (() => {
    const counts: Record<string, number> = { active_buy: 0, problem_aware: 0, expansion: 0, passive: 0 };
    gtm.signals.forEach(s => {
      const intent = classifyIntent(s.content);
      counts[intent.type] = (counts[intent.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const sourceDistribution = (() => {
    const counts: Record<string, number> = {};
    gtm.signals.forEach(s => {
      const p = s.source_platform || "unknown";
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const matchesForOpp = (oppId: string) => gtm.matches.filter(m => m.opportunity_id === oppId);

  const industryOptions = osContext === "logistics"
    ? [{ value: "logistics", label: "Logistics" }, { value: "haulage", label: "Haulage" }, { value: "courier", label: "Courier" }, { value: "freight", label: "Freight" }]
    : [{ value: "fmcg", label: "FMCG" }, { value: "pharma", label: "Pharma" }, { value: "building_materials", label: "Building Materials" }, { value: "agriculture", label: "Agriculture" }, { value: "cosmetics", label: "Cosmetics" }, { value: "consumer_goods", label: "Consumer Goods" }];

  const supplyNodeTypes = osContext === "logistics"
    ? [{ value: "logistics_operator", label: "Logistics Operator" }, { value: "fleet_owner", label: "Fleet Owner" }, { value: "courier_company", label: "Courier Company" }]
    : [{ value: "distributor", label: "Distributor" }, { value: "manufacturer", label: "Manufacturer" }, { value: "wholesaler", label: "Wholesaler" }, { value: "exporter", label: "Exporter" }];

  // Campaign performance summary
  const campaignSummary = campaigns.insights.reduce(
    (acc, c) => ({
      totalSpend: acc.totalSpend + (c.spend || 0),
      totalClicks: acc.totalClicks + (c.clicks || 0),
      totalImpressions: acc.totalImpressions + (c.impressions || 0),
      totalConversions: acc.totalConversions + (c.conversions || 0),
      totalLeads: acc.totalLeads + (c.leads_generated || 0),
    }),
    { totalSpend: 0, totalClicks: 0, totalImpressions: 0, totalConversions: 0, totalLeads: 0 }
  );

  // Product signal summary
  const productSummary = {
    totalSignals: productSignals.signals.length,
    stockouts: productSignals.signals.filter(s => s.is_stockout).length,
    highDemand: productSignals.signals.filter(s => s.demand_level === "high" || s.demand_level === "critical").length,
    categories: [...new Set(productSignals.signals.map(s => s.product_category).filter(Boolean))].length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Market & Revenue Command Center</h1>
              <Badge className={osContext === "logistics" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}>
                {osLabel}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {osContext === "logistics"
                ? "Logistics demand intelligence - delivery, haulage & fleet signals"
                : `${osLabel} demand intelligence - product sourcing, distribution & trade signals`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCreditInfo(!showCreditInfo)} className="gap-1">
            <CreditCard className="h-4 w-4" />
            <span className="font-mono">{credits.balance}</span> credits
          </Button>
          <Dialog open={showIngestDialog} onOpenChange={setShowIngestDialog}>
            <DialogTrigger asChild>
              <Button size="sm"><Radio className="h-4 w-4 mr-1" /> Capture Signal <span className="ml-1 text-xs opacity-60">(1cr)</span></Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Capture {osLabel} Demand Signal</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={ingestForm.source_type} onValueChange={v => setIngestForm({ ...ingestForm, source_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Source type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="search">Search</SelectItem>
                      <SelectItem value="first_party">First Party</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={ingestForm.source_platform} onValueChange={v => setIngestForm({ ...ingestForm, source_platform: v })}>
                    <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="bing">Bing</SelectItem>
                      <SelectItem value="yahoo">Yahoo</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="manual">Manual Entry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder={osContext === "logistics"
                    ? "Signal content (e.g., 'I need a reliable delivery company in Lagos for 100+ daily packages')"
                    : "Signal content (e.g., 'Looking for bulk cement supplier in Abuja')"
                  }
                  value={ingestForm.content}
                  onChange={e => setIngestForm({ ...ingestForm, content: e.target.value })}
                  rows={3}
                />
                {ingestForm.content && (() => {
                  const intent = classifyIntent(ingestForm.content);
                  return (
                    <div className={`p-2 rounded-md text-xs border ${INTENT_COLORS[intent.type]}`}>
                      <strong>Live Classification:</strong> {intent.type.replace("_", " ").toUpperCase()} ({Math.round(intent.confidence * 100)}%)
                      <br />{intent.reasoning}
                    </div>
                  );
                })()}
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Author handle (@user)" value={ingestForm.author_handle} onChange={e => setIngestForm({ ...ingestForm, author_handle: e.target.value })} />
                  <Input placeholder="Location (Lagos, Nigeria)" value={ingestForm.geo_location} onChange={e => setIngestForm({ ...ingestForm, geo_location: e.target.value })} />
                </div>
                <Select value={ingestForm.industry_tag} onValueChange={v => setIngestForm({ ...ingestForm, industry_tag: v })}>
                  <SelectTrigger><SelectValue placeholder="Industry" /></SelectTrigger>
                  <SelectContent>
                    {industryOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleIngestSubmit} className="w-full" disabled={!canAfford("capture_signal")}>
                  {canAfford("capture_signal") ? "Capture & Classify Signal" : "Insufficient Credits"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Search className="h-4 w-4 mr-1" /> Capture Search <span className="ml-1 text-xs opacity-60">(1cr)</span></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Capture {osLabel} Search Query</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Textarea
                  placeholder={osContext === "logistics"
                    ? "Search query (e.g., 'Need delivery company near me')"
                    : "Search query (e.g., 'Where to buy cement in bulk in Lagos')"
                  }
                  value={searchForm.query_text}
                  onChange={e => setSearchForm({ ...searchForm, query_text: e.target.value })}
                  rows={2}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={searchForm.platform} onValueChange={v => setSearchForm({ ...searchForm, platform: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="bing">Bing</SelectItem>
                      <SelectItem value="yahoo">Yahoo</SelectItem>
                      <SelectItem value="microsoft">Microsoft Edge</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Location" value={searchForm.geo_location} onChange={e => setSearchForm({ ...searchForm, geo_location: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="City" value={searchForm.city} onChange={e => setSearchForm({ ...searchForm, city: e.target.value })} />
                  <Input placeholder="State" value={searchForm.state} onChange={e => setSearchForm({ ...searchForm, state: e.target.value })} />
                </div>
                <Button onClick={handleSearchSubmit} className="w-full" disabled={!canAfford("capture_signal")}>
                  {canAfford("capture_signal") ? "Capture & Match" : "Insufficient Credits"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showSupplyDialog} onOpenChange={setShowSupplyDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Add Supply Node</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Register {osLabel} Supply Node</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Business Name" value={supplyForm.business_name} onChange={e => setSupplyForm({ ...supplyForm, business_name: e.target.value })} />
                <Select value={supplyForm.node_type} onValueChange={v => setSupplyForm({ ...supplyForm, node_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {supplyNodeTypes.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="City" value={supplyForm.city} onChange={e => setSupplyForm({ ...supplyForm, city: e.target.value })} />
                  <Input placeholder="State" value={supplyForm.state} onChange={e => setSupplyForm({ ...supplyForm, state: e.target.value })} />
                  <Input placeholder="Country" value={supplyForm.country} onChange={e => setSupplyForm({ ...supplyForm, country: e.target.value })} />
                </div>
                <Input placeholder="Contact Name" value={supplyForm.contact_name} onChange={e => setSupplyForm({ ...supplyForm, contact_name: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Phone" value={supplyForm.contact_phone} onChange={e => setSupplyForm({ ...supplyForm, contact_phone: e.target.value })} />
                  <Input placeholder="WhatsApp" value={supplyForm.contact_whatsapp} onChange={e => setSupplyForm({ ...supplyForm, contact_whatsapp: e.target.value })} />
                </div>
                <Input placeholder="Email" value={supplyForm.contact_email} onChange={e => setSupplyForm({ ...supplyForm, contact_email: e.target.value })} />
                <Button onClick={handleSupplySubmit} className="w-full">Register Node</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Credit Info Banner */}
      {showCreditInfo && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">GTM Brain Credit Usage</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All actions are credit-metered. Contact details are masked until unlocked to protect the platform ecosystem.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                  {Object.entries(GTM_CREDIT_COSTS).map(([action, cost]) => (
                    <div key={action} className="text-xs flex justify-between bg-muted/30 rounded p-1.5">
                      <span>{action.replace(/_/g, " ")}</span>
                      <span className="font-mono font-bold">{cost}cr</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-3 text-xs">
                  <span>Balance: <strong className="font-mono">{credits.balance}</strong></span>
                  <span>Used: <strong className="font-mono">{credits.totalConsumed}</strong></span>
                  <span>Purchased: <strong className="font-mono">{credits.totalPurchased}</strong></span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowCreditInfo(false)}>×</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Zap className="h-5 w-5 mx-auto text-amber-400 mb-1" />
          <div className="text-xl font-bold">{gtm.highIntentSignals.length}</div>
          <div className="text-[10px] text-muted-foreground">High-Intent</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Radio className="h-5 w-5 mx-auto text-blue-400 mb-1" />
          <div className="text-xl font-bold">{gtm.signals.length}</div>
          <div className="text-[10px] text-muted-foreground">Total Signals</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Search className="h-5 w-5 mx-auto text-purple-400 mb-1" />
          <div className="text-xl font-bold">{gtm.searchQueries.length}</div>
          <div className="text-[10px] text-muted-foreground">Search Queries</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Target className="h-5 w-5 mx-auto text-green-400 mb-1" />
          <div className="text-xl font-bold">{gtm.opportunities.length}</div>
          <div className="text-[10px] text-muted-foreground">Opportunities</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Users className="h-5 w-5 mx-auto text-cyan-400 mb-1" />
          <div className="text-xl font-bold">{gtm.supplyNodes.length}</div>
          <div className="text-[10px] text-muted-foreground">Supply Nodes</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <MessageSquare className="h-5 w-5 mx-auto text-indigo-400 mb-1" />
          <div className="text-xl font-bold">{gtm.conversations.length}</div>
          <div className="text-[10px] text-muted-foreground">Conversations</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Megaphone className="h-5 w-5 mx-auto text-pink-400 mb-1" />
          <div className="text-xl font-bold">{campaigns.insights.length}</div>
          <div className="text-[10px] text-muted-foreground">Campaigns</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <TrendingUp className="h-5 w-5 mx-auto text-emerald-400 mb-1" />
          <div className="text-xl font-bold">₦{(gtm.pipelineStats.wonRevenue / 1e6).toFixed(1)}M</div>
          <div className="text-[10px] text-muted-foreground">Won Revenue</div>
        </CardContent></Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Pipeline Stages</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={pipelineChartData}>
                <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Intent Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={intentDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, value }) => value > 0 ? `${name.replace("_", " ")} (${value})` : ""}>
                  {intentDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Signal Sources</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={sourceDistribution} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs - 7 tabs */}
      <Tabs defaultValue="executive" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="executive"><LayoutDashboard className="h-3 w-3 mr-1" />Executive</TabsTrigger>
          <TabsTrigger value="demand">Demand Feed</TabsTrigger>
          <TabsTrigger value="search">Search Queries</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="marketing">Marketing Intel</TabsTrigger>
          {osContext === "industry" && <TabsTrigger value="product">Product Intel</TabsTrigger>}
          <TabsTrigger value="supply">Supply Nodes</TabsTrigger>
          <TabsTrigger value="automation">Automation & Credits</TabsTrigger>
        </TabsList>

        {/* ─── Executive Dashboard ─────────────────────────────── */}
        <TabsContent value="executive">
          <GTMExecutiveDashboard
            signals={gtm.signals}
            opportunities={gtm.opportunities}
            matches={gtm.matches}
            supplyNodes={gtm.supplyNodes}
            conversations={gtm.conversations}
            campaigns={campaigns.insights}
            searchQueries={gtm.searchQueries}
            pipelineStats={gtm.pipelineStats}
            creditBalance={credits.balance}
            osLabel={osLabel}
          />
        </TabsContent>

        {/* ─── Demand Feed ──────────────────────────────────────── */}
        <TabsContent value="demand" className="space-y-3">
          {gtm.signals.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <Radio className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No {osLabel} signals captured yet</p>
              <p className="text-sm mt-1">Use "Capture Signal" to ingest demand from social platforms, search engines, or manual entry</p>
            </CardContent></Card>
          ) : (
            gtm.signals.map(signal => {
              const intent = classifyIntent(signal.content);
              const suggestedMsg = generateEngagementMessage(signal, intent.type);
              return (
                <Card key={signal.id} className="border-l-4" style={{ borderLeftColor: intent.type === "active_buy" ? "#22c55e" : intent.type === "problem_aware" ? "#f59e0b" : "#6b7280" }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={INTENT_COLORS[intent.type]}>
                            {intent.type.replace("_", " ").toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{signal.source_platform}</Badge>
                          <span className="text-xs text-muted-foreground">{Math.round(intent.confidence * 100)}%</span>
                        </div>
                        <p className="text-sm font-medium">{signal.content}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {signal.author_handle && <span>@{signal.author_handle}</span>}
                          {signal.geo_location && <span>📍 {signal.geo_location}</span>}
                          <span>{format(new Date(signal.created_at), "MMM d, HH:mm")}</span>
                        </div>
                        {intent.type !== "passive" && (
                          <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                            <strong>Suggested engagement:</strong> {suggestedMsg}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        {signal.is_processed && <Badge className="bg-green-500/20 text-green-400 text-xs">Processed</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ─── Search Queries ──────────────────────────────────── */}
        <TabsContent value="search" className="space-y-3">
          {gtm.searchQueries.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No {osLabel} search queries captured</p>
              <p className="text-sm mt-1">Capture search queries from Google, Bing, Yahoo and other engines</p>
            </CardContent></Card>
          ) : (
            gtm.searchQueries.map(sq => (
              <Card key={sq.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{sq.platform}</Badge>
                        <Badge variant="outline" className={sq.intent_type === "logistics_needed" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}>
                          {sq.intent_type?.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">"{sq.query_text}"</p>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        {sq.geo_location && <span>📍 {sq.geo_location}</span>}
                        {sq.city && <span>{sq.city}, {sq.state}</span>}
                        <span>{format(new Date(sq.created_at), "MMM d, HH:mm")}</span>
                      </div>
                    </div>
                    <Badge className={sq.is_processed ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}>
                      {sq.is_processed ? "Matched" : "Pending"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ─── Pipeline ────────────────────────────────────────── */}
        <TabsContent value="pipeline" className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {["new", "contacted", "qualified", "negotiation", "closed_won", "closed_lost"].map(stage => (
              <Card key={stage}>
                <CardContent className="p-3 text-center">
                  <Badge className={STAGE_COLORS[stage]}>{stage.replace("_", " ").toUpperCase()}</Badge>
                  <div className="text-2xl font-bold mt-2">
                    {gtm.opportunities.filter(o => o.stage === stage).length}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {gtm.opportunities.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No opportunities yet</p>
              <p className="text-sm mt-1">High-intent signals automatically create opportunities</p>
            </CardContent></Card>
          ) : (
            gtm.opportunities.map(opp => {
              const oppMatches = matchesForOpp(opp.id);
              return (
                <Card key={opp.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={STAGE_COLORS[opp.stage]}>{opp.stage?.replace("_", " ")}</Badge>
                          <Badge variant="outline" className="text-xs">{opp.opportunity_type}</Badge>
                          {opp.priority === "critical" && <Badge className="bg-red-500/20 text-red-400">CRITICAL</Badge>}
                          {opp.priority === "high" && <Badge className="bg-orange-500/20 text-orange-400">HIGH</Badge>}
                        </div>
                        <p className="text-sm font-medium">{opp.title}</p>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          {opp.geo_location && <span>📍 {opp.geo_location}</span>}
                          {opp.estimated_value > 0 && <span>₦{opp.estimated_value.toLocaleString()}</span>}
                          <span>{format(new Date(opp.created_at), "MMM d, HH:mm")}</span>
                        </div>
                        {oppMatches.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <span className="text-green-400 font-medium">{oppMatches.length} matches</span> - Top: {Math.round((oppMatches[0]?.match_score || 0) * 100)}%
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Select value={opp.stage} onValueChange={v => gtm.updateOpportunityStage(opp.id, v)}>
                          <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["new", "contacted", "qualified", "negotiation", "closed_won", "closed_lost"].map(s => (
                              <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedOpp(opp)}>
                          <Eye className="h-3 w-3 mr-1" /> Matches
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ─── Matches ─────────────────────────────────────────── */}
        <TabsContent value="matches" className="space-y-3">
          {gtm.matches.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <ArrowRight className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No demand-supply matches yet</p>
              <p className="text-sm mt-1">Matches auto-generate when high-intent signals meet supply nodes</p>
            </CardContent></Card>
          ) : (
            gtm.matches.map(match => (
              <Card key={match.id} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-primary/20 text-primary">{Math.round((match.match_score || 0) * 100)}% match</Badge>
                        <Badge variant="outline" className="text-xs">{match.status}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Demand</p>
                          <p className="font-medium">{match.gtm_opportunities?.title || "-"}</p>
                          <p className="text-muted-foreground">{match.gtm_opportunities?.geo_location}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Supply</p>
                          <p className="font-medium">{match.gtm_supply_nodes?.business_name || "-"}</p>
                          <p className="text-muted-foreground">{match.gtm_supply_nodes?.city}, {match.gtm_supply_nodes?.state}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
                        <span>Geo: {Math.round((match.geo_proximity_score || 0) * 100)}%</span>
                        <span>Fit: {Math.round((match.service_fit_score || 0) * 100)}%</span>
                        <span>Perf: {Math.round((match.performance_score || 0) * 100)}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {unlockedContacts.has(match.gtm_supply_nodes?.id) ? (
                        <Button size="sm" variant="outline" className="text-xs">
                          <ExternalLink className="h-3 w-3 mr-1" /> Contact
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => handleUnlockContact(match.gtm_supply_nodes?.id)} disabled={!canAfford("unlock_contact")}>
                          <Lock className="h-3 w-3 mr-1" /> Unlock (5cr)
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ─── Marketing Intelligence ──────────────────────────── */}
        <TabsContent value="marketing" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-pink-400" /> Marketing Intelligence
            </h3>
            <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Campaign</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Record Campaign Performance</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Campaign Name" value={campaignForm.campaign_name} onChange={e => setCampaignForm({ ...campaignForm, campaign_name: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={campaignForm.platform} onValueChange={v => setCampaignForm({ ...campaignForm, platform: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meta">Meta (Facebook/IG)</SelectItem>
                        <SelectItem value="google_ads">Google Ads</SelectItem>
                        <SelectItem value="twitter_ads">Twitter/X Ads</SelectItem>
                        <SelectItem value="linkedin_ads">LinkedIn Ads</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="organic">Organic</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={campaignForm.ad_type} onValueChange={v => setCampaignForm({ ...campaignForm, ad_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="display">Display</SelectItem>
                        <SelectItem value="search">Search</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="social">Social</SelectItem>
                        <SelectItem value="native">Native</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" placeholder="Impressions" value={campaignForm.impressions || ""} onChange={e => setCampaignForm({ ...campaignForm, impressions: parseInt(e.target.value) || 0 })} />
                    <Input type="number" placeholder="Clicks" value={campaignForm.clicks || ""} onChange={e => setCampaignForm({ ...campaignForm, clicks: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" placeholder="Spend (₦)" value={campaignForm.spend || ""} onChange={e => setCampaignForm({ ...campaignForm, spend: parseFloat(e.target.value) || 0 })} />
                    <Input type="number" placeholder="Conversions" value={campaignForm.conversions || ""} onChange={e => setCampaignForm({ ...campaignForm, conversions: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Region" value={campaignForm.region} onChange={e => setCampaignForm({ ...campaignForm, region: e.target.value })} />
                    <Input placeholder="City" value={campaignForm.city} onChange={e => setCampaignForm({ ...campaignForm, city: e.target.value })} />
                  </div>
                  <Button onClick={handleCampaignSubmit} className="w-full">Save Campaign Data</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Campaign KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card><CardContent className="p-3 text-center">
              <div className="text-lg font-bold">₦{(campaignSummary.totalSpend / 1000).toFixed(0)}K</div>
              <div className="text-[10px] text-muted-foreground">Total Spend</div>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <div className="text-lg font-bold">{campaignSummary.totalImpressions.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">Impressions</div>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <div className="text-lg font-bold">{campaignSummary.totalClicks.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">Clicks</div>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <div className="text-lg font-bold">{campaignSummary.totalImpressions > 0 ? ((campaignSummary.totalClicks / campaignSummary.totalImpressions) * 100).toFixed(2) : "0"}%</div>
              <div className="text-[10px] text-muted-foreground">CTR</div>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <div className="text-lg font-bold">{campaignSummary.totalConversions}</div>
              <div className="text-[10px] text-muted-foreground">Conversions</div>
            </CardContent></Card>
          </div>

          {/* Campaign List */}
          {campaigns.insights.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No campaign data recorded</p>
              <p className="text-sm mt-1">Track marketing performance from Meta, Google, Twitter ads and organic campaigns</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {campaigns.insights.map(c => (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{c.campaign_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{c.platform}</Badge>
                          <Badge variant="outline" className="text-xs">{c.ad_type}</Badge>
                          {c.region && <span className="text-xs text-muted-foreground">📍 {c.region}</span>}
                        </div>
                        <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                          <div><span className="text-muted-foreground">Imp:</span> {(c.impressions || 0).toLocaleString()}</div>
                          <div><span className="text-muted-foreground">Clicks:</span> {c.clicks}</div>
                          <div><span className="text-muted-foreground">CTR:</span> {((c.ctr || 0) * 100).toFixed(2)}%</div>
                          <div><span className="text-muted-foreground">Conv:</span> {c.conversions}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-sm">₦{(c.spend || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">spend</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Product Intelligence (Industry OS only) ─────────── */}
        {osContext === "industry" && (
          <TabsContent value="product" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-400" /> Product Intelligence
              </h3>
              <Dialog open={showProductSignalDialog} onOpenChange={setShowProductSignalDialog}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Product Signal</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Record Product Signal</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Product Name" value={productSignalForm.product_name} onChange={e => setProductSignalForm({ ...productSignalForm, product_name: e.target.value })} />
                    <Input placeholder="Category" value={productSignalForm.product_category} onChange={e => setProductSignalForm({ ...productSignalForm, product_category: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={productSignalForm.signal_type} onValueChange={v => setProductSignalForm({ ...productSignalForm, signal_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="demand">Demand</SelectItem>
                          <SelectItem value="stockout">Stockout</SelectItem>
                          <SelectItem value="sentiment">Sentiment</SelectItem>
                          <SelectItem value="price_change">Price Change</SelectItem>
                          <SelectItem value="competitor">Competitor</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={productSignalForm.demand_level} onValueChange={v => setProductSignalForm({ ...productSignalForm, demand_level: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" placeholder="Volume Indicator" value={productSignalForm.volume_indicator || ""} onChange={e => setProductSignalForm({ ...productSignalForm, volume_indicator: parseInt(e.target.value) || 0 })} />
                      <Input placeholder="Region" value={productSignalForm.region} onChange={e => setProductSignalForm({ ...productSignalForm, region: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={productSignalForm.is_stockout} onChange={e => setProductSignalForm({ ...productSignalForm, is_stockout: e.target.checked })} />
                      <label className="text-sm">Currently out of stock</label>
                    </div>
                    <Textarea placeholder="Additional context..." value={productSignalForm.raw_content} onChange={e => setProductSignalForm({ ...productSignalForm, raw_content: e.target.value })} rows={2} />
                    <Button onClick={handleProductSignalSubmit} className="w-full">Save Product Signal</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Product KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="p-3 text-center">
                <div className="text-lg font-bold">{productSummary.totalSignals}</div>
                <div className="text-[10px] text-muted-foreground">Total Signals</div>
              </CardContent></Card>
              <Card className={productSummary.stockouts > 0 ? "border-red-500/30" : ""}><CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-red-400">{productSummary.stockouts}</div>
                <div className="text-[10px] text-muted-foreground">Stockouts</div>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-amber-400">{productSummary.highDemand}</div>
                <div className="text-[10px] text-muted-foreground">High Demand</div>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <div className="text-lg font-bold">{productSummary.categories}</div>
                <div className="text-[10px] text-muted-foreground">Categories</div>
              </CardContent></Card>
            </div>

            {productSignals.signals.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No product signals tracked</p>
                <p className="text-sm mt-1">Track SKU demand, stockouts, sentiment, and competitor activity</p>
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {productSignals.signals.map(ps => (
                  <Card key={ps.id} className={ps.is_stockout ? "border-red-500/30" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{ps.product_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{ps.signal_type}</Badge>
                            <Badge variant="outline" className={ps.demand_level === "high" || ps.demand_level === "critical" ? "bg-amber-500/20 text-amber-400" : "text-xs"}>{ps.demand_level}</Badge>
                            {ps.is_stockout && <Badge className="bg-red-500/20 text-red-400 text-xs">STOCKOUT</Badge>}
                          </div>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            {ps.product_category && <span>{ps.product_category}</span>}
                            {ps.region && <span>📍 {ps.region}</span>}
                            {ps.volume_indicator > 0 && <span>Vol: {ps.volume_indicator}</span>}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{format(new Date(ps.created_at), "MMM d")}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* ─── Supply Nodes ────────────────────────────────────── */}
        <TabsContent value="supply" className="space-y-3">
          {gtm.supplyNodes.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No {osLabel} supply nodes registered</p>
              <p className="text-sm mt-1">Register providers to enable demand-supply matching</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {gtm.supplyNodes.map(node => {
                const isUnlocked = unlockedContacts.has(node.id);
                return (
                  <Card key={node.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{node.business_name}</p>
                          <Badge variant="outline" className="text-xs mt-1">{node.node_type?.replace("_", " ")}</Badge>
                          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                            <span>📍 {node.city}, {node.state}</span>
                            {node.rating > 0 && <span>⭐ {node.rating}</span>}
                          </div>
                          {node.contact_name && (
                            <p className="text-xs mt-1">
                              {isUnlocked ? node.contact_name : maskContact(node.contact_name)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {isUnlocked ? (node.contact_phone || node.contact_email || "") : maskContact(node.contact_phone || node.contact_email)}
                          </p>
                          {!isUnlocked && (
                            <Button size="sm" variant="ghost" className="text-xs mt-1 h-6 px-2 text-amber-400" onClick={() => handleUnlockContact(node.id)} disabled={!canAfford("unlock_contact")}>
                              <Lock className="h-3 w-3 mr-1" /> Unlock contact (5 credits)
                            </Button>
                          )}
                        </div>
                        <Badge className={node.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                          {node.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Conversations & Meetings ─────────────────────── */}
        <TabsContent value="conversations">
          <GTMConversationsTab
            conversations={gtm.conversations}
            meetings={gtm.meetings}
            opportunities={gtm.opportunities}
            entities={gtm.entities}
            supplyNodes={gtm.supplyNodes}
            onStartConversation={gtm.startConversation}
            onScheduleMeeting={gtm.scheduleMeeting}
            canAfford={(action: string) => canAfford(action as keyof typeof GTM_CREDIT_COSTS)}
            spendCredits={(action: string) => spendCredits(action as keyof typeof GTM_CREDIT_COSTS)}
            osLabel={osLabel}
          />
        </TabsContent>

        {/* ─── Automation & Credits ────────────────────────────── */}
        <TabsContent value="automation">
          <GTMAutomationTab
            creditBalance={credits.balance}
            totalConsumed={credits.totalConsumed}
            totalPurchased={credits.totalPurchased}
            transactions={credits.transactions}
            osLabel={osLabel}
          />
        </TabsContent>
      </Tabs>

      {/* Match Details Dialog */}
      <Dialog open={!!selectedOpp} onOpenChange={() => setSelectedOpp(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Matches for: {selectedOpp?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {selectedOpp && matchesForOpp(selectedOpp.id).map(match => {
              const isUnlocked = unlockedContacts.has(match.gtm_supply_nodes?.id);
              return (
                <Card key={match.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{match.gtm_supply_nodes?.business_name}</p>
                        <p className="text-xs text-muted-foreground">{match.gtm_supply_nodes?.city}, {match.gtm_supply_nodes?.state}</p>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                          <div><span className="text-muted-foreground">Geo:</span> {Math.round((match.geo_proximity_score || 0) * 100)}%</div>
                          <div><span className="text-muted-foreground">Fit:</span> {Math.round((match.service_fit_score || 0) * 100)}%</div>
                          <div><span className="text-muted-foreground">Score:</span> {Math.round((match.match_score || 0) * 100)}%</div>
                        </div>
                        {isUnlocked && match.gtm_supply_nodes?.contact_phone && (
                          <p className="text-xs mt-1 text-green-400">📞 {match.gtm_supply_nodes.contact_phone}</p>
                        )}
                      </div>
                      {!isUnlocked ? (
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => handleUnlockContact(match.gtm_supply_nodes?.id)} disabled={!canAfford("unlock_contact")}>
                          <Lock className="h-3 w-3 mr-1" /> Unlock (5cr)
                        </Button>
                      ) : (
                        <Badge className="bg-green-500/20 text-green-400">Unlocked</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
