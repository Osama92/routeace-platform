import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Wine, Sprout, Pill,
  Camera, FileText, MapPin, Clock, Eye, Lock, ShieldCheck, Loader2,
} from "lucide-react";

const RegulatoryRulesTab = () => {
  const { data: complianceRecords = [], isLoading } = useQuery({
    queryKey: ["compliance-registry"],
    queryFn: async () => {
      const { data } = await supabase.from("compliance_registry")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const rules = [
    { industry: "Liquor", country: "NG", code: "NAFDAC-ALR-001", requirement: "Age verification required for all alcohol sales", enforcement: "block", active: true },
    { industry: "Liquor", country: "NG", code: "NAFDAC-ALR-002", requirement: "Retailer license verification before distribution", enforcement: "warn", active: true },
    { industry: "Agri", country: "NG", code: "NAQS-AGR-001", requirement: "Batch approval number required for agri-inputs", enforcement: "block", active: true },
    { industry: "Agri", country: "NG", code: "NAQS-AGR-002", requirement: "Safety certificate upload mandatory", enforcement: "block", active: true },
    { industry: "Agri", country: "NG", code: "NAQS-AGR-003", requirement: "Farm geo-tag required for delivery", enforcement: "warn", active: false },
    { industry: "Pharma", country: "NG", code: "NAFDAC-PHA-001", requirement: "Drug batch number and expiry date tracking", enforcement: "block", active: true },
    { industry: "Pharma", country: "NG", code: "NAFDAC-PHA-002", requirement: "Cold chain temperature logging", enforcement: "warn", active: true },
    { industry: "Pharma", country: "NG", code: "NAFDAC-PHA-003", requirement: "Anti-counterfeit verification scan", enforcement: "block", active: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Regulatory Rules Engine</h3>
          <p className="text-sm text-muted-foreground">
            Rules execute BEFORE transaction completion • {complianceRecords.length} compliance records in database
          </p>
        </div>
        <Button size="sm"><Shield className="w-4 h-4 mr-2" /> Add Rule</Button>
      </div>

      {/* Show real compliance records if any */}
      {complianceRecords.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Active Compliance Certificates</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {complianceRecords.map(cr => (
              <div key={cr.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{cr.compliance_type}</p>
                  <p className="text-xs text-muted-foreground">{cr.issuing_authority} • {cr.certificate_number || "No cert #"}</p>
                </div>
                <Badge variant={cr.status === "active" ? "default" : "secondary"}>{cr.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {rules.map((rule) => (
          <Card key={rule.code} className={`${!rule.active ? "opacity-60" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${rule.enforcement === "block" ? "bg-destructive/10" : "bg-amber-500/10"}`}>
                    {rule.enforcement === "block" ? <Lock className="w-4 h-4 text-destructive" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">{rule.code}</span>
                      <Badge variant="outline" className="text-[10px]">{rule.industry}</Badge>
                      <Badge variant="outline" className="text-[10px]">🇳🇬 {rule.country}</Badge>
                    </div>
                    <p className="text-sm font-medium">{rule.requirement}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={`text-[10px] ${rule.enforcement === "block" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-500"}`}>
                    {rule.enforcement.toUpperCase()}
                  </Badge>
                  <Switch checked={rule.active} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const AgriComplianceTab = () => {
  const { data: agriRecords = [], isLoading } = useQuery({
    queryKey: ["agri-compliance"],
    queryFn: async () => {
      const { data } = await supabase.from("agri_input_compliance")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const compliant = agriRecords.filter(r => r.is_compliant);
  const blocked = agriRecords.filter(r => !r.is_compliant);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center">
          <Sprout className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{compliant.length}</p>
          <p className="text-xs text-muted-foreground">Compliant Orders</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <XCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
          <p className="text-2xl font-bold text-destructive">{blocked.length}</p>
          <p className="text-xs text-muted-foreground">Blocked Orders</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Shield className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">{agriRecords.length > 0 ? Math.round(compliant.length / agriRecords.length * 100) : 0}%</p>
          <p className="text-xs text-muted-foreground">Compliance Rate</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Agri-Input Compliance Log</CardTitle>
          <CardDescription>Batch approval, safety certificates & farm geo-tags from database</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          ) : agriRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Sprout className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No agri-input compliance records yet. Records are created when orders pass through the compliance engine.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agriRecords.map(o => (
                <div key={o.id} className={`p-4 rounded-lg border ${!o.is_compliant ? "border-destructive/20 bg-destructive/5" : "border-border"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">Order: {o.order_id || "N/A"}</p>
                      <p className="text-xs text-muted-foreground">Verified by: {o.verified_by || "System"}</p>
                    </div>
                    <Badge className={!o.is_compliant ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-500"}>
                      {o.is_compliant ? "COMPLIANT" : "BLOCKED"}
                    </Badge>
                  </div>
                  <div className="flex gap-3 mt-3">
                    <div className={`flex items-center gap-1.5 text-xs ${o.batch_approval_number ? "text-emerald-500" : "text-destructive"}`}>
                      {o.batch_approval_number ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      Batch: {o.batch_approval_number || "Missing"}
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs ${o.safety_certificate_url ? "text-emerald-500" : "text-destructive"}`}>
                      {o.safety_certificate_url ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      Safety Cert
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs ${o.farm_geo_lat ? "text-emerald-500" : "text-destructive"}`}>
                      {o.farm_geo_lat ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      Geo-Tag
                    </div>
                  </div>
                  {o.blocked_reason && <p className="text-xs text-destructive mt-2">Reason: {o.blocked_reason}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const LiquorComplianceTab = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card><CardContent className="p-4 text-center">
        <Wine className="w-6 h-6 text-primary mx-auto mb-2" />
        <p className="text-2xl font-bold">0</p>
        <p className="text-xs text-muted-foreground">Total Checks Today</p>
      </CardContent></Card>
      <Card><CardContent className="p-4 text-center">
        <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
        <p className="text-2xl font-bold text-emerald-500">0</p>
        <p className="text-xs text-muted-foreground">Verified Sales</p>
      </CardContent></Card>
      <Card><CardContent className="p-4 text-center">
        <XCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
        <p className="text-2xl font-bold text-destructive">0</p>
        <p className="text-xs text-muted-foreground">Blocked Attempts</p>
      </CardContent></Card>
      <Card><CardContent className="p-4 text-center">
        <ShieldCheck className="w-6 h-6 text-primary mx-auto mb-2" />
        <p className="text-2xl font-bold">-</p>
        <p className="text-xs text-muted-foreground">Compliance Score</p>
      </CardContent></Card>
    </div>
    <Card>
      <CardHeader><CardTitle className="text-sm">Age Verification Log</CardTitle></CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Wine className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No liquor verification records yet. Records appear when age verification checks are performed during liquor sales.</p>
        </div>
      </CardContent>
    </Card>
  </div>
);

const PharmaComplianceTab = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card><CardContent className="p-4 text-center">
        <Pill className="w-6 h-6 text-primary mx-auto mb-2" />
        <p className="text-2xl font-bold">0</p>
        <p className="text-xs text-muted-foreground">Verified Shipments</p>
      </CardContent></Card>
      <Card><CardContent className="p-4 text-center">
        <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
        <p className="text-2xl font-bold text-amber-500">0</p>
        <p className="text-xs text-muted-foreground">Expiry Warnings</p>
      </CardContent></Card>
      <Card><CardContent className="p-4 text-center">
        <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-2" />
        <p className="text-2xl font-bold text-destructive">0</p>
        <p className="text-xs text-muted-foreground">Counterfeit Flagged</p>
      </CardContent></Card>
    </div>
    <Card>
      <CardHeader><CardTitle className="text-sm">Pharmaceutical Distribution Log</CardTitle></CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Pill className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No pharmaceutical compliance records yet. Records appear when drug shipments pass through the anti-counterfeit verification engine.</p>
        </div>
      </CardContent>
    </Card>
  </div>
);

const ComplianceMonitor = () => (
  <DashboardLayout title="Compliance Monitor" subtitle="Regulatory enforcement across all industry verticals">
    <Tabs defaultValue="rules" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4 max-w-2xl">
        <TabsTrigger value="rules" className="gap-2"><Shield className="w-4 h-4" /> Rules Engine</TabsTrigger>
        <TabsTrigger value="liquor" className="gap-2"><Wine className="w-4 h-4" /> Liquor</TabsTrigger>
        <TabsTrigger value="agri" className="gap-2"><Sprout className="w-4 h-4" /> Agri-Input</TabsTrigger>
        <TabsTrigger value="pharma" className="gap-2"><Pill className="w-4 h-4" /> Pharma</TabsTrigger>
      </TabsList>
      <TabsContent value="rules"><RegulatoryRulesTab /></TabsContent>
      <TabsContent value="liquor"><LiquorComplianceTab /></TabsContent>
      <TabsContent value="agri"><AgriComplianceTab /></TabsContent>
      <TabsContent value="pharma"><PharmaComplianceTab /></TabsContent>
    </Tabs>
  </DashboardLayout>
);

export default ComplianceMonitor;
