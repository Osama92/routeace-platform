import { useState } from "react";
import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  ScanLine, Package, MapPin, Truck, CheckCircle2,
  ArrowDownUp, ClipboardList, RotateCcw, QrCode, Warehouse, ArrowRight,
} from "lucide-react";
import { useWarehouseOps } from "@/hooks/useWarehouseOps";
import { toast } from "sonner";

const FMCGWarehouseHandheld = () => {
  const [activeTab, setActiveTab] = useState("picking");
  const [countInputs, setCountInputs] = useState<Record<string, string>>({});
  const {
    picklists, picklistItems, cycleCountItems, warehouseReturns, inventory, loading,
    markPicked, submitCount, classifyReturn, kpis,
  } = useWarehouseOps();

  const handleCountSubmit = (itemId: string) => {
    const val = parseInt(countInputs[itemId] || "");
    if (isNaN(val) || val < 0) { toast.error("Enter a valid count"); return; }
    submitCount(itemId, val);
    setCountInputs(prev => ({ ...prev, [itemId]: "" }));
  };

  return (
    <FMCGLayout title="Warehouse Handheld Interface" subtitle="Task-driven pick, pack, receive & count operations">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Items to Pick", value: String(kpis.pendingPickCount), icon: ClipboardList, color: "text-orange-600" },
          { label: "Picked", value: `${kpis.completedPickCount}/${kpis.totalPickItems}`, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Counts Due", value: String(kpis.pendingCountItems), icon: ArrowDownUp, color: "text-blue-600" },
          { label: "Returns to Inspect", value: String(kpis.returnsToInspect), icon: RotateCcw, color: "text-primary" },
        ].map(s => (
          <Card key={s.label} className="cursor-pointer" onClick={() => {
            if (s.label.includes("Pick")) setActiveTab("picking");
            else if (s.label.includes("Count")) setActiveTab("count");
            else if (s.label.includes("Return")) setActiveTab("returns");
          }}>
            <CardContent className="pt-6 flex items-center gap-3">
              <s.icon className={`w-7 h-7 ${s.color}`} />
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="picking">Picking</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="count">Cycle Count</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
        </TabsList>

        {/* PICKING */}
        <TabsContent value="picking">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5" /> Active Picklist</CardTitle>
              <Badge>{kpis.completedPickCount}/{kpis.totalPickItems} Picked</Badge>
            </CardHeader>
            <CardContent>
              {picklistItems.length > 0 ? picklistItems.map((item, idx) => (
                <div key={item.id} className={`flex items-center gap-4 py-3 border-b last:border-0 ${item.status === "picked" ? "opacity-50" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.status === "picked" ? "bg-emerald-500 text-white" : "bg-muted"}`}>
                    {item.status === "picked" ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-sm font-bold">{idx + 1}</span>}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.sku_name || item.sku_code || "-"}</p>
                    <p className="text-xs text-muted-foreground">Bin: {item.bin_location || "-"}</p>
                  </div>
                  <div className="text-center w-16">
                    <p className="text-lg font-bold">{item.quantity || 0}</p>
                    <p className="text-xs text-muted-foreground">units</p>
                  </div>
                  <Badge variant={item.status === "picked" ? "default" : "secondary"}>{item.status || "pending"}</Badge>
                  {item.status !== "picked" && <Button size="sm" onClick={() => markPicked(item.id)}><ScanLine className="w-4 h-4 mr-1" /> Pick</Button>}
                </div>
              )) : <p className="text-center text-muted-foreground py-8">No pick items. Create a picklist from the WMS Hub.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVENTORY */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" /> Warehouse Inventory</CardTitle></CardHeader>
            <CardContent>
              {inventory.length > 0 ? inventory.map(inv => (
                <div key={inv.id} className="flex items-center gap-4 py-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{inv.sku_name || "-"}</p>
                    <p className="text-xs text-muted-foreground">Batch: {inv.batch_number || "-"} · Bin: {inv.bin_id?.slice(0, 8) || "-"}</p>
                  </div>
                  <p className="text-sm font-bold">{inv.quantity || 0} units</p>
                  <Badge variant="outline">{inv.status || "in_stock"}</Badge>
                </div>
              )) : <p className="text-center text-muted-foreground py-8">No inventory records yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CYCLE COUNT */}
        <TabsContent value="count">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2"><ArrowDownUp className="w-5 h-5" /> Daily Cycle Count</CardTitle>
              <Badge>{cycleCountItems.filter(c => c.counted_quantity !== null).length}/{cycleCountItems.length} Counted</Badge>
            </CardHeader>
            <CardContent>
              {cycleCountItems.length > 0 ? cycleCountItems.map(item => {
                const hasVariance = item.variance && item.variance !== 0;
                const isCounted = item.counted_quantity !== null;
                return (
                  <div key={item.id} className="flex items-center gap-4 py-3 border-b last:border-0">
                    <div className={`w-3 h-3 rounded-full ${isCounted ? (hasVariance ? "bg-destructive" : "bg-emerald-500") : "bg-muted-foreground"}`} />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.sku_name || item.sku_code || "-"}</p>
                      <Badge variant="outline" className="font-mono text-xs">{item.bin_code || "-"}</Badge>
                    </div>
                    <div className="text-center w-20">
                      <p className="text-sm font-bold">{item.system_quantity}</p>
                      <p className="text-xs text-muted-foreground">System</p>
                    </div>
                    <div className="text-center w-20">
                      {isCounted ? (
                        <p className={`text-sm font-bold ${hasVariance ? "text-destructive" : "text-emerald-600"}`}>{item.counted_quantity}</p>
                      ) : (
                        <div className="flex gap-1">
                          <Input type="number" className="w-16 h-8 text-center text-sm" placeholder="-"
                            value={countInputs[item.id] || ""}
                            onChange={e => setCountInputs(prev => ({ ...prev, [item.id]: e.target.value }))} />
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">Counted</p>
                    </div>
                    {hasVariance && <Badge variant="destructive">Var: {item.variance}</Badge>}
                    {!isCounted && <Button size="sm" onClick={() => handleCountSubmit(item.id)}>Submit</Button>}
                  </div>
                );
              }) : <p className="text-center text-muted-foreground py-8">No cycle count items. Create a count from the WMS Hub.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RETURNS */}
        <TabsContent value="returns">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5" /> Returns Inspection & Classification</CardTitle></CardHeader>
            <CardContent>
              {warehouseReturns.length > 0 ? warehouseReturns.map(r => (
                <div key={r.id} className="p-4 rounded-lg border space-y-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{r.return_reason || "Return"}</p>
                      <p className="text-xs text-muted-foreground">{r.id.slice(0, 8)} · Items: {r.total_items || "-"} · {r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}</p>
                    </div>
                    <Badge variant={r.status === "approved" ? "default" : r.status === "pending_disposal" ? "destructive" : "secondary"}>{r.status || "pending"}</Badge>
                  </div>
                  {(r.status === "pending" || r.status === "received") && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => classifyReturn(r.id, "resellable")}>Re-sellable</Button>
                      <Button size="sm" variant="secondary" onClick={() => classifyReturn(r.id, "repack")}>Repack</Button>
                      <Button size="sm" variant="destructive" onClick={() => classifyReturn(r.id, "destroy")}>Destroy</Button>
                    </div>
                  )}
                </div>
              )) : <p className="text-center text-muted-foreground py-8">No returns to process.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </FMCGLayout>
  );
};

export default FMCGWarehouseHandheld;
