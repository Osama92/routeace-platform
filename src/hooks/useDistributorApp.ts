import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useDistributorApp = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [stockLevels, setStockLevels] = useState<any[]>([]);
  const [fleet, setFleet] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [ordersRes, stockRes, fleetRes, creditRes, promoRes, outletsRes] = await Promise.all([
      supabase.from("fmcg_orders").select("*, fmcg_outlets(outlet_name, address)").order("created_at", { ascending: false }).limit(50),
      supabase.from("fmcg_stock_levels").select("*, fmcg_skus(sku_name, sku_code, unit_price)").order("urgency_score", { ascending: false }).limit(50),
      supabase.from("fmcg_fleet_tracking").select("*").order("updated_at", { ascending: false }),
      supabase.from("fmcg_retailer_credit").select("*, fmcg_outlets(outlet_name)").order("current_balance", { ascending: false }).limit(50),
      supabase.from("fmcg_trade_promotions").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("fmcg_outlets").select("id, outlet_name, address, outlet_type, last_order_at").limit(200),
    ]);

    if (ordersRes.data) setOrders(ordersRes.data);
    if (stockRes.data) setStockLevels(stockRes.data);
    if (fleetRes.data) setFleet(fleetRes.data);
    if (creditRes.data) setCredits(creditRes.data);
    if (promoRes.data) setPromotions(promoRes.data);
    if (outletsRes.data) setOutlets(outletsRes.data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const acceptOrder = async (orderId: string) => {
    const { error } = await supabase.from("fmcg_orders").update({ status: "confirmed" }).eq("id", orderId);
    if (error) { toast.error("Failed to accept order"); return; }
    toast.success("Order accepted!");
    await fetchAll();
  };

  const rejectOrder = async (orderId: string) => {
    const { error } = await supabase.from("fmcg_orders").update({ status: "rejected" }).eq("id", orderId);
    if (error) { toast.error("Failed to reject order"); return; }
    toast.success("Order rejected");
    await fetchAll();
  };

  // KPI calculations
  const todayOrders = orders.filter(o => o.created_at && new Date(o.created_at).toDateString() === new Date().toDateString());
  const pendingOrders = orders.filter(o => o.status === "draft" || o.status === "pending");
  const totalRevenueMTD = orders.filter(o => {
    const d = o.created_at ? new Date(o.created_at) : null;
    return d && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
  }).reduce((s, o) => s + (o.total_amount || 0), 0);

  const lowStockItems = stockLevels.filter(s => (s.current_qty || 0) <= (s.reorder_point || 0));
  const totalInventoryValue = stockLevels.reduce((s, sl) => s + (sl.current_qty || 0) * (sl.fmcg_skus?.unit_price || 0), 0);
  const activeVehicles = fleet.filter(f => f.current_status === "en_route" || f.current_status === "loading");
  const totalCreditOutstanding = credits.reduce((s, c) => s + (c.current_balance || 0), 0);

  return {
    orders, stockLevels, fleet, credits, promotions, outlets, loading,
    acceptOrder, rejectOrder, refetch: fetchAll,
    kpis: {
      todayOrderCount: todayOrders.length,
      pendingOrderCount: pendingOrders.length,
      totalRevenueMTD,
      totalInventoryValue,
      lowStockCount: lowStockItems.length,
      activeVehicleCount: activeVehicles.length,
      totalFleetCount: fleet.length,
      totalCreditOutstanding,
      outletsServed: outlets.length,
    },
    pendingOrders,
    lowStockItems,
  };
};
