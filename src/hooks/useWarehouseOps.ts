import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useWarehouseOps = () => {
  const { user } = useAuth();
  const [picklists, setPicklists] = useState<any[]>([]);
  const [picklistItems, setPicklistItems] = useState<any[]>([]);
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);
  const [cycleCountItems, setCycleCountItems] = useState<any[]>([]);
  const [warehouseReturns, setWarehouseReturns] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [pickRes, pickItemsRes, ccRes, ccItemsRes, retRes, invRes] = await Promise.all([
      supabase.from("picklists").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("picklist_items").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("cycle_counts").select("*").order("count_date", { ascending: false }).limit(10),
      supabase.from("cycle_count_items").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("warehouse_returns").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("warehouse_inventory").select("*").order("updated_at", { ascending: false }).limit(100),
    ]);

    if (pickRes.data) setPicklists(pickRes.data);
    if (pickItemsRes.data) setPicklistItems(pickItemsRes.data);
    if (ccRes.data) setCycleCounts(ccRes.data);
    if (ccItemsRes.data) setCycleCountItems(ccItemsRes.data);
    if (retRes.data) setWarehouseReturns(retRes.data);
    if (invRes.data) setInventory(invRes.data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Mark picklist item as picked
  const markPicked = async (itemId: string) => {
    const { error } = await supabase.from("picklist_items").update({
      status: "picked",
      picked_at: new Date().toISOString(),
      picked_by: user?.id,
    }).eq("id", itemId);
    if (error) { toast.error("Failed to mark as picked"); return; }
    toast.success("Item picked!");
    await fetchAll();
  };

  // Submit cycle count
  const submitCount = async (itemId: string, countedQty: number) => {
    const item = cycleCountItems.find(i => i.id === itemId);
    const variance = item ? countedQty - (item.system_quantity || 0) : 0;
    const { error } = await supabase.from("cycle_count_items").update({
      counted_quantity: countedQty,
      variance,
      counted_at: new Date().toISOString(),
      counted_by: user?.id,
    }).eq("id", itemId);
    if (error) { toast.error("Failed to submit count"); return; }
    toast.success("Count recorded!");
    await fetchAll();
  };

  // Classify return
  const classifyReturn = async (returnId: string, classification: string) => {
    const status = classification === "destroy" ? "pending_disposal" : classification === "resellable" ? "approved" : "pending_repack";
    const { error } = await supabase.from("warehouse_returns").update({
      status,
      inspected_by: user?.id,
      inspected_at: new Date().toISOString(),
    }).eq("id", returnId);
    if (error) { toast.error("Classification failed"); return; }
    toast.success(`Return classified as ${classification}`);
    await fetchAll();
  };

  const pendingPicks = picklistItems.filter(p => p.status !== "picked");
  const completedPicks = picklistItems.filter(p => p.status === "picked");
  const pendingCounts = cycleCountItems.filter(c => !c.counted_quantity && c.counted_quantity !== 0);
  const varianceItems = cycleCountItems.filter(c => c.variance && c.variance !== 0);

  return {
    picklists, picklistItems, cycleCounts, cycleCountItems, warehouseReturns, inventory, loading,
    markPicked, submitCount, classifyReturn, refetch: fetchAll,
    kpis: {
      pendingPickCount: pendingPicks.length,
      completedPickCount: completedPicks.length,
      totalPickItems: picklistItems.length,
      pendingCountItems: pendingCounts.length,
      varianceCount: varianceItems.length,
      returnsToInspect: warehouseReturns.filter(r => r.status === "pending" || r.status === "received").length,
    },
  };
};
