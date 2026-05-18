import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import {
  DollarSign, CreditCard, TrendingUp, Shield, FileText, Users, Brain,
  BarChart3, CheckCircle, AlertTriangle, Wallet, Globe, Landmark, Building2,
  Truck, Package, Coins, Scale, ArrowUpRight, ArrowDownRight, Activity,
  Banknote, Store, ShieldCheck, Zap, Target, PieChart,
} from "lucide-react";

// ── Animated counter ──
const useCounter = (end: number, duration = 2000) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = end / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= end) { setVal(end); clearInterval(id); }
      else setVal(Math.round(start));
    }, 16);
    return () => clearInterval(id);
  }, [end, duration]);
  return val;
};

import { useState, useEffect } from "react";

// ── Data ──
const networkKPIs = [
  { label: "Total Financing Deployed", value: "$84.6M", delta: "+12.4%", icon: DollarSign, color: "text-primary" },
  { label: "Active Credit Lines", value: "1,247", delta: "+8.2%", icon: CreditCard, color: "text-blue-500" },
  { label: "Invoices Factored", value: "3,842", delta: "+23.1%", icon: FileText, color: "text-emerald-500" },
  { label: "Export Contracts Funded", value: "186", delta: "+14.7%", icon: Globe, color: "text-amber-500" },
  { label: "Default Rate", value: "1.2%", delta: "-0.3%", icon: ShieldCheck, color: "text-emerald-500" },
  { label: "Lender Partners", value: "34", delta: "+6", icon: Building2, color: "text-purple-500" },
];

const distributorCredits = [
  { name: "Mega Distribution Ltd", score: 92, limit: "$500K", utilized: "$380K", pct: 76, sector: "FMCG", status: "Active" },
  { name: "Sahel Agro Partners", score: 87, limit: "$250K", utilized: "$180K", pct: 72, sector: "Agri", status: "Active" },
  { name: "NorthStar Beverages", score: 78, limit: "$400K", utilized: "$360K", pct: 90, sector: "Liquor", status: "Warning" },
  { name: "PharmaCare Nigeria", score: 95, limit: "$600K", utilized: "$210K", pct: 35, sector: "Pharma", status: "Active" },
  { name: "BuildRight Materials", score: 71, limit: "$150K", utilized: "$120K", pct: 80, sector: "Building", status: "Review" },
];

const invoiceFactoring = [
  { id: "INV-TF-4821", seller: "Mega Distribution Ltd", buyer: "Lagos Retail Chain", amount: "$124,000", advance: "85%", fee: "2.1%", status: "Funded", lender: "AfriCredit" },
  { id: "INV-TF-4822", seller: "Sahel Agro Partners", buyer: "GreenMart Co.", amount: "$67,500", advance: "80%", fee: "2.5%", status: "Pending", lender: "TradeVault" },
  { id: "INV-TF-4823", seller: "PharmaCare Nigeria", buyer: "HealthPlus Stores", amount: "$210,000", advance: "90%", fee: "1.8%", status: "Funded", lender: "MedFinance" },
  { id: "INV-TF-4824", seller: "NorthStar Beverages", buyer: "Skyline Nightclub", amount: "$45,000", advance: "75%", fee: "3.0%", status: "Under Review", lender: "AfriCredit" },
];

const supplyChainFinance = [
  { manufacturer: "Dangote Industries", program: "Distributor Finance", totalFacility: "$12M", deployed: "$8.4M", distributors: 45, avgTenor: "45 days", rate: "11%" },
  { manufacturer: "Nigerian Breweries", program: "Supply Chain Credit", totalFacility: "$8M", deployed: "$6.2M", distributors: 32, avgTenor: "30 days", rate: "12%" },
  { manufacturer: "GSK Pharma", program: "Channel Finance", totalFacility: "$5M", deployed: "$2.8M", distributors: 18, avgTenor: "60 days", rate: "9.5%" },
];

const logisticsFinancing = [
  { operator: "SwiftFleet Logistics", type: "Fleet Expansion", amount: "$320K", deliveries: "4,200/mo", utilization: "89%", rating: 4.7, status: "Active" },
  { operator: "GreenLine Haulage", type: "Working Capital", amount: "$180K", deliveries: "2,800/mo", utilization: "76%", rating: 4.5, status: "Active" },
  { operator: "NorthernExpress", type: "Vehicle Maintenance", amount: "$95K", deliveries: "1,600/mo", utilization: "82%", rating: 4.3, status: "Pending" },
];

const exportFinance = [
  { exporter: "Sahel Export Co.", commodity: "Sesame Seeds", contract: "$3.2M", buyer: "TradeLink GmbH", financing: "Pre-shipment", amount: "$2.4M", insurance: "$640K", status: "Funded" },
  { exporter: "Cocoa Federation", commodity: "Cocoa Beans", contract: "$5.8M", buyer: "Nestlé AG", financing: "Post-shipment", amount: "$4.6M", insurance: "$1.2M", status: "Active" },
  { exporter: "Nile Agri Corp", commodity: "Cashew Nuts", contract: "$1.9M", buyer: "Pacific Foods", financing: "Pre-shipment", amount: "$1.4M", insurance: "$380K", status: "Pending" },
];

const marketplaceProducts = [
  { product: "Distributor Working Capital", provider: "AfriCredit", rate: "11–14%", minRevenue: "$200K", tenor: "30–90 days", type: "Credit" },
  { product: "Invoice Discounting", provider: "TradeVault Finance", rate: "1.5–3%", minRevenue: "$100K", tenor: "Up to 120 days", type: "Factoring" },
  { product: "Export Pre-Shipment", provider: "NEXIM Bank", rate: "9–11%", minRevenue: "$500K", tenor: "90–180 days", type: "Export" },
  { product: "Fleet Expansion Loan", provider: "Logistics Capital", rate: "14–18%", minRevenue: "$150K", tenor: "12–36 months", type: "Logistics" },
  { product: "Trade Credit Insurance", provider: "AXA Mansard", rate: "0.8–1.5%", minRevenue: "$250K", tenor: "Annual", type: "Insurance" },
  { product: "Supply Chain Finance", provider: "MedFinance", rate: "9–12%", minRevenue: "$1M", tenor: "30–60 days", type: "SCF" },
];

const riskProfiles = [
  { company: "Mega Distribution", score: 92, trend: "up", payment: 98, delivery: 96, disputes: 0.4 },
  { company: "Sahel Agro", score: 87, trend: "up", payment: 94, delivery: 91, disputes: 1.2 },
  { company: "NorthStar Beverages", score: 78, trend: "down", payment: 85, delivery: 88, disputes: 3.1 },
  { company: "PharmaCare Nigeria", score: 95, trend: "up", payment: 99, delivery: 97, disputes: 0.1 },
];

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const TradeFinanceNetwork = () => {
  const totalDeployed = useCounter(84.6, 2500);
  const creditLines = useCounter(1247, 2000);
  const defaultRate = useCounter(12, 1800);

  return (
    <DashboardLayout title="Trade Finance Network" subtitle="Africa's Infrastructure for Supply Chain Finance">
      <div className="space-y-6">
        {/* Hero */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Landmark className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Trade Finance Network</h1>
                <p className="text-sm text-muted-foreground">Africa's Infrastructure for Supply Chain Finance - Powering $84.6M+ in trade financing</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-1" /> Export Report</Button>
            <Button size="sm"><Wallet className="w-4 h-4 mr-1" /> Apply for Financing</Button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {networkKPIs.map((k, i) => (
            <motion.div key={k.label} variants={fade} initial="hidden" animate="show" transition={{ delay: i * 0.06 }}>
              <Card className="hover:border-primary/20 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <k.icon className={`w-4 h-4 ${k.color}`} />
                    <span className={`text-[10px] font-medium ${k.delta.startsWith("+") ? "text-emerald-500" : k.delta.startsWith("-") ? (k.label === "Default Rate" ? "text-emerald-500" : "text-rose-500") : "text-muted-foreground"}`}>{k.delta}</span>
                  </div>
                  <p className="text-xl font-bold">{k.value}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{k.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Live Activity Ticker */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 flex items-center gap-4 overflow-x-auto">
            <Activity className="w-4 h-4 text-primary shrink-0" />
            <div className="flex gap-6 text-xs font-medium whitespace-nowrap">
              <span>🔄 Loans Issued Today - <strong className="text-primary">$3.8M</strong></span>
              <span>📄 Invoices Financed - <strong className="text-blue-500">$2.1M</strong></span>
              <span>🏦 Distributor Credit Lines - <strong className="text-emerald-500">420 active</strong></span>
              <span>🌍 Export Contracts Funded - <strong className="text-amber-500">63 this week</strong></span>
              <span>🛡️ Insurance Coverage - <strong className="text-purple-500">$12.4M</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="credit" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="credit">Distributor Credit</TabsTrigger>
            <TabsTrigger value="factoring">Invoice Factoring</TabsTrigger>
            <TabsTrigger value="scf">Supply Chain Finance</TabsTrigger>
            <TabsTrigger value="logistics">Logistics Finance</TabsTrigger>
            <TabsTrigger value="export">Export Finance</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="risk">Risk Engine</TabsTrigger>
          </TabsList>

          {/* 1. Distributor Credit Network */}
          <TabsContent value="credit" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Credit lines powered by RouteAce operational data - sales volume, delivery reliability, payment history</p>
              <Button size="sm" variant="outline"><Users className="w-3 h-3 mr-1" /> Onboard Lender</Button>
            </div>
            {distributorCredits.map((d, i) => (
              <motion.div key={d.name} variants={fade} initial="hidden" animate="show" transition={{ delay: i * 0.04 }}>
                <Card className={`hover:border-primary/20 transition-colors ${d.status === "Warning" ? "border-l-4 border-l-amber-500" : d.status === "Review" ? "border-l-4 border-l-rose-500" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{d.name}</p>
                          <Badge variant="outline">{d.sector}</Badge>
                          <Badge className={
                            d.status === "Warning" ? "bg-amber-500/15 text-amber-600" :
                            d.status === "Review" ? "bg-rose-500/15 text-rose-600" :
                            "bg-emerald-500/15 text-emerald-600"
                          }>{d.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Credit Score: <strong>{d.score}</strong> · Limit: {d.limit}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{d.utilized}</p>
                        <p className="text-[10px] text-muted-foreground">of {d.limit}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={d.pct} className={`flex-1 h-2 ${d.pct > 85 ? "[&>div]:bg-amber-500" : ""}`} />
                      <span className="text-xs font-medium w-10 text-right">{d.pct}%</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          {/* 2. Invoice Factoring */}
          <TabsContent value="factoring" className="space-y-3">
            <p className="text-sm text-muted-foreground">Convert unpaid invoices into immediate cash - RouteAce verifies transaction authenticity, delivery confirmation, and buyer reliability</p>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Seller → Buyer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Advance</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Lender</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceFactoring.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs">{f.id}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{f.seller}</p>
                        <p className="text-xs text-muted-foreground">→ {f.buyer}</p>
                      </TableCell>
                      <TableCell className="text-right font-bold">{f.amount}</TableCell>
                      <TableCell>{f.advance}</TableCell>
                      <TableCell>{f.fee}</TableCell>
                      <TableCell className="text-xs">{f.lender}</TableCell>
                      <TableCell>
                        <Badge className={
                          f.status === "Funded" ? "bg-emerald-500/15 text-emerald-600" :
                          f.status === "Under Review" ? "bg-amber-500/15 text-amber-600" :
                          "bg-blue-500/15 text-blue-600"
                        }>{f.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* 3. Supply Chain Finance */}
          <TabsContent value="scf" className="space-y-3">
            <p className="text-sm text-muted-foreground">Large manufacturers financing their distributor networks - RouteAce acts as the verification layer</p>
            {supplyChainFinance.map((s, i) => (
              <motion.div key={s.manufacturer} variants={fade} initial="hidden" animate="show" transition={{ delay: i * 0.05 }}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-lg">{s.manufacturer}</p>
                        <p className="text-xs text-muted-foreground">{s.program} · {s.rate} p.a. · Avg Tenor: {s.avgTenor}</p>
                      </div>
                      <Badge variant="outline">{s.distributors} Distributors</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold text-primary">{s.totalFacility}</p>
                        <p className="text-[10px] text-muted-foreground">Total Facility</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold text-emerald-500">{s.deployed}</p>
                        <p className="text-[10px] text-muted-foreground">Deployed</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <Progress value={(parseFloat(s.deployed.replace(/[$M]/g, "")) / parseFloat(s.totalFacility.replace(/[$M]/g, ""))) * 100} className="mt-2 h-2" />
                        <p className="text-[10px] text-muted-foreground mt-1">Utilization</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          {/* 4. Logistics Financing */}
          <TabsContent value="logistics" className="space-y-3">
            <p className="text-sm text-muted-foreground">Funding for fleet expansion, fuel, maintenance, and driver payroll - based on delivery volumes and route profitability</p>
            {logisticsFinancing.map((l, i) => (
              <motion.div key={l.operator} variants={fade} initial="hidden" animate="show" transition={{ delay: i * 0.05 }}>
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Truck className="w-4 h-4 text-primary" />
                        <p className="font-semibold">{l.operator}</p>
                        <Badge variant="outline">{l.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{l.deliveries} deliveries · {l.utilization} fleet util. · ⭐ {l.rating}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-bold text-primary">{l.amount}</p>
                      <Badge className={l.status === "Active" ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}>{l.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          {/* 5. Export Finance */}
          <TabsContent value="export" className="space-y-3">
            <p className="text-sm text-muted-foreground">Pre-shipment and post-shipment financing with export credit insurance - RouteAce verifies supplier capacity, logistics readiness, buyer credibility</p>
            {exportFinance.map((e, i) => (
              <motion.div key={e.exporter} variants={fade} initial="hidden" animate="show" transition={{ delay: i * 0.05 }}>
                <Card className="border-l-4 border-l-primary/40">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold">{e.exporter}</p>
                        <p className="text-xs text-muted-foreground">{e.commodity} → {e.buyer} · {e.financing}</p>
                      </div>
                      <Badge className={
                        e.status === "Funded" ? "bg-emerald-500/15 text-emerald-600" :
                        e.status === "Active" ? "bg-blue-500/15 text-blue-600" :
                        "bg-amber-500/15 text-amber-600"
                      }>{e.status}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-2 rounded bg-muted/50">
                        <p className="font-bold">{e.contract}</p>
                        <p className="text-[10px] text-muted-foreground">Contract Value</p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <p className="font-bold text-primary">{e.amount}</p>
                        <p className="text-[10px] text-muted-foreground">Financing</p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <p className="font-bold text-emerald-500">{e.insurance}</p>
                        <p className="text-[10px] text-muted-foreground">Insurance</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          {/* 6. Trade Finance Marketplace */}
          <TabsContent value="marketplace" className="space-y-3">
            <p className="text-sm text-muted-foreground">Lenders offer financing products - businesses apply directly through RouteAce</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {marketplaceProducts.map((p, i) => (
                <motion.div key={p.product} variants={fade} initial="hidden" animate="show" transition={{ delay: i * 0.04 }}>
                  <Card className="hover:border-primary/20 transition-colors h-full">
                    <CardContent className="p-4 flex flex-col h-full">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-[10px]">{p.type}</Badge>
                        <p className="text-xs text-muted-foreground">{p.provider}</p>
                      </div>
                      <p className="font-semibold mb-1">{p.product}</p>
                      <div className="space-y-1 text-xs text-muted-foreground flex-1">
                        <p>Rate: <strong className="text-foreground">{p.rate}</strong></p>
                        <p>Min Revenue: <strong className="text-foreground">{p.minRevenue}</strong></p>
                        <p>Tenor: <strong className="text-foreground">{p.tenor}</strong></p>
                      </div>
                      <Button size="sm" className="mt-3 w-full" variant="outline">
                        Apply Now <ArrowUpRight className="w-3 h-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* 7. Risk Engine */}
          <TabsContent value="risk" className="space-y-3">
            <p className="text-sm text-muted-foreground">Dynamic risk profiles calculated from transaction reliability, delivery success, payment punctuality, and dispute history</p>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-center">Risk Score</TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                    <TableHead className="text-center">Payment %</TableHead>
                    <TableHead className="text-center">Delivery %</TableHead>
                    <TableHead className="text-center">Dispute %</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riskProfiles.map(r => (
                    <TableRow key={r.company}>
                      <TableCell className="font-medium">{r.company}</TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${r.score >= 90 ? "text-emerald-500" : r.score >= 80 ? "text-blue-500" : r.score >= 70 ? "text-amber-500" : "text-rose-500"}`}>{r.score}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {r.trend === "up" ? <ArrowUpRight className="w-4 h-4 text-emerald-500 mx-auto" /> : <ArrowDownRight className="w-4 h-4 text-rose-500 mx-auto" />}
                      </TableCell>
                      <TableCell className="text-center">{r.payment}%</TableCell>
                      <TableCell className="text-center">{r.delivery}%</TableCell>
                      <TableCell className="text-center">{r.disputes}%</TableCell>
                      <TableCell className="text-center">
                        <Badge className={r.score >= 90 ? "bg-emerald-500/15 text-emerald-600" : r.score >= 80 ? "bg-blue-500/15 text-blue-600" : "bg-amber-500/15 text-amber-600"}>
                          {r.score >= 90 ? "AAA" : r.score >= 85 ? "AA" : r.score >= 80 ? "A" : r.score >= 70 ? "BBB" : "BB"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Revenue Model & AI Insight */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Coins className="w-4 h-4 text-primary" /> RouteAce Revenue from RTFN</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { stream: "Financing Referral Fees", amount: "$1.2M", pct: 35 },
                { stream: "Transaction Processing", amount: "$840K", pct: 25 },
                { stream: "Credit Scoring Services", amount: "$520K", pct: 15 },
                { stream: "Insurance Commissions", amount: "$380K", pct: 11 },
                { stream: "Marketplace Fees", amount: "$470K", pct: 14 },
              ].map(r => (
                <div key={r.stream} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{r.stream}</span>
                      <span className="font-semibold">{r.amount}</span>
                    </div>
                    <Progress value={r.pct} className="h-1.5" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Trade Finance Intelligence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p><strong>NorthStar Beverages</strong> at 90% credit utilization with declining score (78) - recommend reducing exposure by $40K and triggering early payment collection.</p>
              </div>
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <p><strong>PharmaCare Nigeria</strong> (score 95, 35% util.) is an ideal candidate for credit limit increase to $800K - strong payment history supports expansion.</p>
              </div>
              <div className="flex items-start gap-2">
                <Globe className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p><strong>Sesame export corridor</strong> (Nigeria → Germany) showing 23% volume increase - recommend pre-positioning export finance facility of $5M for Q2.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ecosystem Integration */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ecosystem Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: "Distribution Exchange", status: "Connected", icon: Store },
                { name: "Liquidity Engine", status: "Connected", icon: Coins },
                { name: "Financial Trust Layer", status: "Connected", icon: ShieldCheck },
                { name: "Network Graph", status: "Connected", icon: Globe },
              ].map(e => (
                <div key={e.name} className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-muted/30">
                  <e.icon className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs font-medium">{e.name}</p>
                    <p className="text-[10px] text-emerald-500">● {e.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};



const __InnerDemo_TradeFinanceNetwork = TradeFinanceNetwork;


/* ── Demo-Preview Gate (auto-added) ──────────────────────────── */
import { DemoPreviewGate as __DemoPreviewGate } from "@/components/demo/DemoPreviewGate";
const __WrappedDemo_TradeFinanceNetwork = () => (
  <__DemoPreviewGate title="Trade Finance Network" description="Lender-buyer-seller financing network.">
    <__InnerDemo_TradeFinanceNetwork />
  </__DemoPreviewGate>
);
export default __WrappedDemo_TradeFinanceNetwork;
