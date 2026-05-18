import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, MapPin, Phone, Calendar, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Outlet } from "@/hooks/useFieldSales";

interface Props {
  outlets: Outlet[];
  selectedOutletId?: string;
}

const RetailerProfileTab = ({ outlets, selectedOutletId }: Props) => {
  const [outletId, setOutletId] = useState(selectedOutletId || "");
  const [credit, setCredit] = useState<any>(null);
  const [orderStats, setOrderStats] = useState({ count: 0, value: 0 });

  const outlet = outlets.find(o => o.id === outletId);

  useEffect(() => {
    if (!outletId) return;
    // Fetch credit info
    supabase.from("fmcg_retailer_credit").select("*").eq("outlet_id", outletId).maybeSingle().then(({ data }) => setCredit(data));
    // Fetch order stats
    supabase.from("fmcg_orders").select("id, total_amount").eq("outlet_id", outletId).then(({ data }) => {
      if (data) setOrderStats({ count: data.length, value: data.reduce((s, o) => s + (o.total_amount || 0), 0) });
    });
  }, [outletId]);

  return (
    <div className="space-y-6">
      <Select value={outletId} onValueChange={setOutletId}>
        <SelectTrigger><SelectValue placeholder="Select a retailer..." /></SelectTrigger>
        <SelectContent>
          {outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.outlet_name}</SelectItem>)}
        </SelectContent>
      </Select>

      {outlet && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="flex items-center gap-2"><Store className="w-5 h-5" /> Retailer Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2"><Store className="w-8 h-8 text-primary" /></div>
                <p className="font-bold">{outlet.outlet_name}</p>
                <Badge variant="outline">{outlet.outlet_type || "General Trade"}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" />{outlet.address || "No address"}</div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />{outlet.contact_phone || "N/A"}</div>
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" />Last order: {outlet.last_order_at ? new Date(outlet.last_order_at).toLocaleDateString() : "Never"}</div>
                <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-muted-foreground" />Tier: {outlet.tier || "Unclassified"}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Performance & Credit</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-muted/50 text-center"><p className="text-lg font-bold">{orderStats.count}</p><p className="text-xs text-muted-foreground">Total Orders</p></div>
                <div className="p-3 rounded-lg bg-muted/50 text-center"><p className="text-lg font-bold">₦{(orderStats.value / 1000).toFixed(0)}K</p><p className="text-xs text-muted-foreground">Total Value</p></div>
                <div className="p-3 rounded-lg bg-muted/50 text-center"><p className="text-lg font-bold">{credit?.order_frequency_score || "-"}</p><p className="text-xs text-muted-foreground">Credit Score</p></div>
                <div className="p-3 rounded-lg bg-muted/50 text-center"><p className="text-lg font-bold">₦{credit ? ((credit.current_balance || 0) / 1000).toFixed(0) + "K" : "-"}</p><p className="text-xs text-muted-foreground">of ₦{credit ? ((credit.credit_limit || 0) / 1000).toFixed(0) + "K" : "-"}</p></div>
              </div>
              {credit && (
                <div className="mt-4 p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-1">Credit Details</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Risk Band: <strong className="text-foreground">{credit.risk_band || "N/A"}</strong></span>
                    <span>Payment Score: <strong className="text-foreground">{credit.payment_timeliness_score || "-"}/100</strong></span>
                    <span>Terms: <strong className="text-foreground">{credit.recommended_terms || "COD"}</strong></span>
                    <span>Return Rate: <strong className="text-foreground">{credit.return_rate || 0}%</strong></span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RetailerProfileTab;
