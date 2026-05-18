import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FieldVisit {
  id: string;
  outlet_id: string | null;
  beat_plan_id: string | null;
  sales_rep_id: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  visit_notes: string | null;
  is_valid_visit: boolean | null;
  photo_urls: string[] | null;
  created_at: string | null;
  outlet?: { outlet_name: string; address: string | null; outlet_type: string | null; contact_phone: string | null };
}

export interface FieldOrder {
  id: string;
  order_number: string | null;
  outlet_id: string | null;
  sales_rep_id: string | null;
  status: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  order_date: string | null;
  created_at: string | null;
  outlet?: { outlet_name: string; address: string | null };
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string | null;
  sku_id: string | null;
  quantity: number | null;
  unit_price: number | null;
  line_total: number | null;
  sku?: { sku_name: string; sku_code: string };
}

export interface SKU {
  id: string;
  sku_code: string;
  sku_name: string;
  unit_price: number | null;
  category: string | null;
  is_active: boolean | null;
}

export interface Outlet {
  id: string;
  outlet_name: string;
  address: string | null;
  outlet_type: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  last_visit_at: string | null;
  last_order_at: string | null;
  tier: string | null;
}

export interface FieldReturn {
  id: string;
  outlet_id: string | null;
  outlet_name: string;
  sales_rep_id: string | null;
  items_count: number;
  reason: string;
  notes: string | null;
  status: string;
  created_at: string | null;
}

export interface ShelfAudit {
  id: string;
  outlet_name: string;
  audit_type: string;
  compliance_score: number | null;
  issues_found: any;
  photo_urls: string[] | null;
  notes: string | null;
  audit_date: string | null;
}

export const useFieldSales = () => {
  const { user } = useAuth();
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [orders, setOrders] = useState<FieldOrder[]>([]);
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [returns, setReturns] = useState<FieldReturn[]>([]);
  const [audits, setAudits] = useState<ShelfAudit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const today = new Date().toISOString().split("T")[0];

    const [visitsRes, ordersRes, skusRes, outletsRes, returnsRes, auditsRes] = await Promise.all([
      supabase.from("fmcg_field_visits").select("*, fmcg_outlets(outlet_name, address, outlet_type, contact_phone)").order("created_at", { ascending: false }).limit(20),
      supabase.from("fmcg_orders").select("*, fmcg_outlets(outlet_name, address)").order("created_at", { ascending: false }).limit(50),
      supabase.from("fmcg_skus").select("*").eq("is_active", true).order("sku_name"),
      supabase.from("fmcg_outlets").select("*").order("outlet_name").limit(200),
      supabase.from("fmcg_field_returns").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("shelf_audits").select("*").order("created_at", { ascending: false }).limit(20),
    ]);

    if (visitsRes.data) setVisits(visitsRes.data.map((v: any) => ({ ...v, outlet: v.fmcg_outlets })));
    if (ordersRes.data) setOrders(ordersRes.data.map((o: any) => ({ ...o, outlet: o.fmcg_outlets })));
    if (skusRes.data) setSKUs(skusRes.data);
    if (outletsRes.data) setOutlets(outletsRes.data);
    if (returnsRes.data) setReturns(returnsRes.data);
    if (auditsRes.data) setAudits(auditsRes.data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Check in to a visit
  const checkIn = async (outletId: string) => {
    if (!user) return;
    const { data, error } = await supabase.from("fmcg_field_visits").insert({
      outlet_id: outletId,
      sales_rep_id: user.id,
      check_in_at: new Date().toISOString(),
      is_valid_visit: true,
    }).select().single();
    if (error) { toast.error("Check-in failed: " + error.message); return null; }
    toast.success("Checked in successfully!");
    await fetchAll();
    return data;
  };

  // Check out of a visit
  const checkOut = async (visitId: string, notes?: string) => {
    const { error } = await supabase.from("fmcg_field_visits").update({
      check_out_at: new Date().toISOString(),
      visit_notes: notes || null,
    }).eq("id", visitId);
    if (error) { toast.error("Check-out failed"); return; }
    toast.success("Visit completed!");
    await fetchAll();
  };

  // Create an order
  const createOrder = async (outletId: string, items: { sku_id: string; quantity: number; unit_price: number }[], status: "draft" | "confirmed" = "confirmed") => {
    if (!user) return null;
    const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const tax = subtotal * 0.075;
    const orderNum = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const { data: order, error } = await supabase.from("fmcg_orders").insert({
      outlet_id: outletId,
      sales_rep_id: user.id,
      order_number: orderNum,
      status,
      subtotal,
      tax_amount: tax,
      total_amount: subtotal + tax,
      order_date: new Date().toISOString().split("T")[0],
    }).select().single();

    if (error || !order) { toast.error("Order creation failed: " + (error?.message || "")); return null; }

    const orderItems = items.map(i => ({
      order_id: order.id,
      sku_id: i.sku_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      line_total: i.quantity * i.unit_price,
    }));

    await supabase.from("fmcg_order_items").insert(orderItems);

    // Update outlet last_order_at
    await supabase.from("fmcg_outlets").update({ last_order_at: new Date().toISOString() }).eq("id", outletId);

    toast.success(status === "draft" ? "Order saved as draft" : "Order submitted successfully!");
    await fetchAll();
    return order;
  };

  // Submit a shelf audit
  const submitAudit = async (outletName: string, auditType: string, score: number, issues: any, notes?: string) => {
    if (!user) return;
    const { error } = await supabase.from("shelf_audits").insert({
      outlet_name: outletName,
      audit_type: auditType,
      compliance_score: score,
      issues_found: issues,
      merchandiser_id: user.id,
      audit_date: new Date().toISOString().split("T")[0],
      notes,
    });
    if (error) { toast.error("Audit submission failed"); return; }
    toast.success("Shelf audit submitted!");
    await fetchAll();
  };

  // Log a return
  const logReturn = async (outletId: string, outletName: string, itemsCount: number, reason: string, notes?: string) => {
    if (!user) return;
    const { error } = await supabase.from("fmcg_field_returns").insert({
      outlet_id: outletId,
      outlet_name: outletName,
      sales_rep_id: user.id,
      items_count: itemsCount,
      reason,
      notes,
      status: "pending",
    });
    if (error) { toast.error("Return logging failed"); return; }
    toast.success("Return logged for approval!");
    await fetchAll();
  };

  // Approve / reject return (ASM+)
  const updateReturnStatus = async (returnId: string, status: "approved" | "rejected") => {
    if (!user) return;
    const { error } = await supabase.from("fmcg_field_returns").update({
      status,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    }).eq("id", returnId);
    if (error) { toast.error("Update failed"); return; }
    toast.success(`Return ${status}!`);
    await fetchAll();
  };

  return {
    visits, orders, skus, outlets, returns, audits, loading,
    checkIn, checkOut, createOrder, submitAudit, logReturn, updateReturnStatus, refetch: fetchAll,
  };
};
