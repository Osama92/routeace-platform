import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw, CheckCircle, AlertTriangle, Link2, Unlink,
  Clock, ArrowRight,
} from "lucide-react";

interface Connector {
  id: string;
  name: string;
  logo: string;
  description: string;
  status: "connected" | "disconnected" | "error";
  lastSync?: string;
  syncHealth?: "healthy" | "warning" | "error";
  features: string[];
}

const CONNECTORS: Connector[] = [
  {
    id: "zoho",
    name: "Zoho Books",
    logo: "📗",
    description: "Sync invoices, bills, chart of accounts, and payments with Zoho Books.",
    status: "disconnected",
    features: ["Invoices", "Bills", "Payments", "Chart of Accounts", "Contacts"],
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    logo: "📘",
    description: "Connect to QuickBooks Online for two-way financial data synchronization.",
    status: "disconnected",
    features: ["Invoices", "Expenses", "Bills", "Payments", "Reports"],
  },
  {
    id: "sap",
    name: "SAP Business One",
    logo: "🏢",
    description: "Enterprise-grade integration with SAP for large-scale financial operations.",
    status: "disconnected",
    features: ["GL Entries", "Invoices", "Payments", "AP/AR", "Cost Centers"],
  },
  {
    id: "xero",
    name: "Xero",
    logo: "📙",
    description: "Bidirectional sync with Xero for invoicing, expenses, and bank reconciliation.",
    status: "disconnected",
    features: ["Invoices", "Bills", "Bank Feeds", "Payments", "Contacts"],
  },
];

export default function FinanceIntegrations() {
  const [connectors] = useState(CONNECTORS);

  return (
    <DashboardLayout title="Finance Integrations" subtitle="Connect external accounting systems to RouteAce">
      <Tabs defaultValue="connectors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connectors">Connectors</TabsTrigger>
          <TabsTrigger value="sync-status">Sync Status</TabsTrigger>
          <TabsTrigger value="mapping">Data Mapping</TabsTrigger>
        </TabsList>

        <TabsContent value="connectors">
          <div className="grid md:grid-cols-2 gap-4">
            {connectors.map(c => (
              <Card key={c.id} className="hover:border-primary/20 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{c.logo}</span>
                      <div>
                        <h3 className="font-semibold">{c.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${c.status === "connected" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                      {c.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {c.features.map(f => (
                      <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {c.status === "connected" ? (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                          <RefreshCw className="w-3 h-3" /> Sync Now
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive">
                          <Unlink className="w-3 h-3" /> Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" className="h-7 text-xs gap-1">
                        <Link2 className="w-3 h-3" /> Connect
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sync-status">
          <Card>
            <CardHeader><CardTitle className="text-sm">Sync Activity Log</CardTitle></CardHeader>
            <CardContent className="text-center py-12 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No sync activity yet</p>
              <p className="text-xs mt-1">Connect an accounting platform to see sync history here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping">
          <Card>
            <CardHeader><CardTitle className="text-sm">Data Mapping Configuration</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { routeace: "Invoices", external: "Sales Invoices", direction: "↔" },
                  { routeace: "Bills", external: "Purchase Bills", direction: "↔" },
                  { routeace: "Expenses", external: "Expense Claims", direction: "←" },
                  { routeace: "Payments", external: "Payment Receipts", direction: "↔" },
                  { routeace: "Customers", external: "Contacts", direction: "↔" },
                  { routeace: "Chart of Accounts", external: "GL Accounts", direction: "←" },
                ].map(m => (
                  <div key={m.routeace} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px]">RouteAce</Badge>
                      <span className="text-sm font-medium">{m.routeace}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{m.external}</span>
                      <Badge variant="outline" className="text-[10px]">External</Badge>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{m.direction} Bidirectional</Badge>
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
