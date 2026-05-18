import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Wallet, CreditCard, ArrowUpRight, ArrowDownLeft, Globe, RefreshCw,
  Shield, AlertTriangle, TrendingUp, Users, DollarSign, Zap, Building2,
  CheckCircle, Clock, BarChart3, Lock
} from "lucide-react";
import { TreasuryApprovalQueue } from "@/components/wallet/TreasuryApprovalQueue";

const fmt = (n: number, sym = "₦") => `${sym}${n.toLocaleString()}`;

const wallets = [
  { id: "WALLET-001", type: "Company Wallet", owner: "RouteAce Ltd", balance: 45_200_000, currency: "NGN", status: "active", flagged: false },
  { id: "WALLET-002", type: "Driver Wallet", owner: "Chukwuma A.", balance: 182_500, currency: "NGN", status: "active", flagged: false },
  { id: "WALLET-003", type: "Vendor Wallet", owner: "FastFleet Co.", balance: 2_340_000, currency: "NGN", status: "active", flagged: false },
  { id: "WALLET-004", type: "Escrow Wallet", owner: "RouteAce Escrow", balance: 8_900_000, currency: "NGN", status: "locked", flagged: false },
  { id: "WALLET-005", type: "Driver Wallet", owner: "Emeka O.", balance: 94_000, currency: "NGN", status: "active", flagged: true },
  { id: "WALLET-006", type: "Vendor Wallet", owner: "NorthFleet NG", balance: 1_200_000, currency: "NGN", status: "active", flagged: false },
];

const transactions = [
  { id: "TXN-9981", from: "Company Wallet", to: "Chukwuma A.", amount: 182_500, type: "driver_payout", status: "completed", time: "10m ago", risk: "low" },
  { id: "TXN-9980", from: "Customer ABC", to: "Escrow Wallet", amount: 500_000, type: "escrow_hold", status: "pending", time: "22m ago", risk: "low" },
  { id: "TXN-9979", from: "Escrow Wallet", to: "FastFleet Co.", amount: 2_100_000, type: "vendor_payment", status: "completed", time: "1h ago", risk: "medium" },
  { id: "TXN-9978", from: "Emeka O.", to: "External Bank", amount: 94_000, type: "withdrawal", status: "flagged", time: "2h ago", risk: "high" },
  { id: "TXN-9977", from: "Company Wallet", to: "FIRS", amount: 520_000, type: "tax_payment", status: "completed", time: "3h ago", risk: "low" },
];

const fxRates = [
  { pair: "NGN/USD", rate: 1550.25, change: +2.1, direction: "up" },
  { pair: "NGN/GBP", rate: 1952.80, change: -0.8, direction: "down" },
  { pair: "NGN/EUR", rate: 1680.40, change: +1.4, direction: "up" },
  { pair: "NGN/KES", rate: 11.20, change: +0.3, direction: "up" },
  { pair: "NGN/GHS", rate: 103.50, change: -1.2, direction: "down" },
  { pair: "NGN/ZAR", rate: 82.30, change: +0.6, direction: "up" },
];

const kycQueue = [
  { name: "Adebayo K.", type: "Driver", tier: "Basic", docs: 3, status: "pending", submitted: "2h ago" },
  { name: "TechFreight Ltd", type: "Vendor", tier: "Business", docs: 7, status: "review", submitted: "1d ago" },
  { name: "Grace N.", type: "Driver", tier: "Basic", docs: 3, status: "approved", submitted: "3d ago" },
  { name: "Premium Haulage", type: "Vendor", tier: "Enterprise", docs: 12, status: "review", submitted: "5d ago" },
];

const amlAlerts = [
  { id: "AML-001", type: "Structuring", entity: "Emeka O.", amount: 94_000, risk: "high", time: "2h ago" },
  { id: "AML-002", type: "Velocity", entity: "Unknown Vendor", amount: 4_200_000, risk: "critical", time: "1d ago" },
  { id: "AML-003", type: "Circular Transfer", entity: "Driver Pool", amount: 820_000, risk: "medium", time: "2d ago" },
];

const riskColor: Record<string, string> = {
  critical: "text-destructive bg-destructive/10",
  high: "text-orange-600 bg-orange-500/10",
  medium: "text-yellow-600 bg-yellow-500/10",
  low: "text-green-600 bg-green-500/10",
};

export default function WalletBanking() {
  const [activeTab, setActiveTab] = useState("overview");
  const [sendAmount, setSendAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("NGN");

  const totalWalletValue = wallets.reduce((s, w) => s + w.balance, 0);

  return (
    <DashboardLayout title="Embedded Wallet Banking" subtitle="Multi-currency wallets, FX engine, escrow & embedded fintech">
      {/* Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Wallet Value", value: fmt(totalWalletValue), icon: Wallet, color: "text-primary" },
          { label: "Active Wallets", value: "6", icon: Users, color: "text-blue-500" },
          { label: "Pending Payouts", value: fmt(182_500), icon: Clock, color: "text-yellow-500" },
          { label: "Escrow Held", value: fmt(8_900_000), icon: Lock, color: "text-purple-500" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <k.icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-lg font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="overview">Wallets</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="fx">FX Engine</TabsTrigger>
          <TabsTrigger value="kyc">KYC Verification</TabsTrigger>
          <TabsTrigger value="aml">AML Monitoring</TabsTrigger>
          <TabsTrigger value="transfer">Transfer</TabsTrigger>
          <TabsTrigger value="treasury" className="text-primary font-semibold">🔐 Treasury Approvals</TabsTrigger>
        </TabsList>

        {/* ─── WALLETS ─── */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Wallet className="w-4 h-4" />All Wallets</CardTitle>
              <CardDescription>Multi-party wallet infrastructure - driver, vendor, company, escrow</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Wallet ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallets.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono text-xs">{w.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{w.type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {w.owner} {w.flagged && <AlertTriangle className="w-3 h-3 text-destructive inline ml-1" />}
                      </TableCell>
                      <TableCell className="font-bold">{fmt(w.balance)}</TableCell>
                      <TableCell>{w.currency}</TableCell>
                      <TableCell>
                        <Badge className={w.status === "active" ? "bg-green-500/20 text-green-700" : "bg-yellow-500/20 text-yellow-700"}>
                          {w.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-xs">Fund</Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs">History</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TRANSACTIONS ─── */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" />Transaction Ledger</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.id}</TableCell>
                      <TableCell className="text-xs">{t.from}</TableCell>
                      <TableCell className="text-xs">{t.to}</TableCell>
                      <TableCell className="font-bold text-sm">{fmt(t.amount)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{t.type.replace("_", " ")}</Badge></TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskColor[t.risk]}`}>{t.risk}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          t.status === "completed" ? "bg-green-500/20 text-green-700" :
                          t.status === "flagged" ? "bg-destructive/20 text-destructive" :
                          "bg-yellow-500/20 text-yellow-700"
                        }>{t.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── FX ENGINE ─── */}
        <TabsContent value="fx">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" />Live FX Rates</CardTitle>
                <CardDescription>Real-time cross-border exchange rates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {fxRates.map((fx) => (
                  <div key={fx.pair} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="font-mono font-bold text-sm">{fx.pair}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{fx.rate.toFixed(2)}</span>
                      <span className={`text-xs flex items-center gap-0.5 ${fx.direction === "up" ? "text-green-500" : "text-destructive"}`}>
                        {fx.direction === "up" ? <TrendingUp className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                        {Math.abs(fx.change)}%
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><RefreshCw className="w-4 h-4" />FX Converter</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount (NGN)</label>
                  <Input placeholder="Enter amount" type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Convert To</label>
                  <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {sendAmount && (
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm text-muted-foreground">Converted Amount</p>
                    <p className="text-2xl font-bold text-primary">
                      {selectedCurrency === "USD" ? `$${(+sendAmount / 1550.25).toFixed(2)}` :
                       selectedCurrency === "GBP" ? `£${(+sendAmount / 1952.80).toFixed(2)}` :
                       selectedCurrency === "EUR" ? `€${(+sendAmount / 1680.40).toFixed(2)}` :
                       `KES ${(+sendAmount * 11.20).toFixed(2)}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Includes 0.5% FX buffer margin</p>
                  </div>
                )}
                <Button className="w-full">Execute FX Transfer</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── KYC ─── */}
        <TabsContent value="kyc">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" />KYC Verification Queue</CardTitle>
              <CardDescription>Digital identity verification for drivers and vendors</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>KYC Tier</TableHead>
                    <TableHead>Docs Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kycQueue.map((k) => (
                    <TableRow key={k.name}>
                      <TableCell className="font-medium">{k.name}</TableCell>
                      <TableCell><Badge variant="outline">{k.type}</Badge></TableCell>
                      <TableCell>{k.tier}</TableCell>
                      <TableCell>{k.docs} documents</TableCell>
                      <TableCell>
                        <Badge className={
                          k.status === "approved" ? "bg-green-500/20 text-green-700" :
                          k.status === "review" ? "bg-blue-500/20 text-blue-700" :
                          "bg-yellow-500/20 text-yellow-700"
                        }>{k.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{k.submitted}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {k.status !== "approved" && <Button variant="outline" size="sm" className="h-7 text-xs">Approve</Button>}
                          <Button variant="outline" size="sm" className="h-7 text-xs">View</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── AML ─── */}
        <TabsContent value="aml">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" />AML Monitoring Alerts</CardTitle>
              <CardDescription>Anti-money laundering transaction pattern detection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {amlAlerts.map((a) => (
                <div key={a.id} className={`p-4 rounded-lg border-l-4 ${
                  a.risk === "critical" ? "border-destructive bg-destructive/5" :
                  a.risk === "high" ? "border-orange-500 bg-orange-500/5" :
                  "border-yellow-500 bg-yellow-500/5"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{a.id}</span>
                      <Badge className={`text-xs ${riskColor[a.risk]}`}>{a.risk.toUpperCase()}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{a.time}</span>
                  </div>
                  <p className="font-semibold text-sm">{a.type} Pattern Detected</p>
                  <p className="text-xs text-muted-foreground">Entity: {a.entity} • Amount: {fmt(a.amount)}</p>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="h-7 text-xs">Investigate</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs text-destructive">Freeze Wallet</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs">Dismiss</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TRANSFER ─── */}
        <TabsContent value="transfer">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowUpRight className="w-4 h-4" />Instant Transfer</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">From Wallet</label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Select source wallet" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">Company Wallet - ₦45.2M</SelectItem>
                      <SelectItem value="escrow">Escrow Wallet - ₦8.9M</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">To Wallet / Bank</label>
                  <Input placeholder="Wallet ID or bank account" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount (₦)</label>
                  <Input placeholder="0.00" type="number" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Transfer Type</label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant Payout</SelectItem>
                      <SelectItem value="escrow_release">Escrow Release</SelectItem>
                      <SelectItem value="driver_payout">Driver Payout</SelectItem>
                      <SelectItem value="vendor_payment">Vendor Payment</SelectItem>
                      <SelectItem value="tax_remittance">Tax Remittance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full flex items-center gap-2">
                  <Zap className="w-4 h-4" />Execute Transfer
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4" />Payment Gateway Status</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "Paystack (NG)", status: "live", uptime: "99.9%", latency: "120ms" },
                  { name: "Flutterwave (Africa)", status: "live", uptime: "99.7%", latency: "145ms" },
                  { name: "Stripe (Global)", status: "live", uptime: "99.99%", latency: "90ms" },
                  { name: "Mobile Money (Africa)", status: "live", uptime: "98.5%", latency: "200ms" },
                  { name: "BNPL Engine", status: "maintenance", uptime: "95.0%", latency: "N/A" },
                ].map((gw) => (
                  <div key={gw.name} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${gw.status === "live" ? "bg-green-500" : "bg-yellow-500"}`} />
                      <span className="font-medium text-sm">{gw.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono">{gw.uptime} uptime</p>
                      <p className="text-xs text-muted-foreground">{gw.latency}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TREASURY APPROVALS ─── */}
        <TabsContent value="treasury">
          <TreasuryApprovalQueue />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
