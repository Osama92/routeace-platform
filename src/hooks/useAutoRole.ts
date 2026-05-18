import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AutoRole =
  | "manufacturer_ceo"
  | "manufacturer_sales_director"
  | "manufacturer_territory_rep"
  | "manufacturer_product_engineer"
  | "manufacturer_supply_chain"
  | "distributor_owner"
  | "distributor_sales_manager"
  | "distributor_sales_rep"
  | "distributor_warehouse_manager"
  | "distributor_finance_manager"
  | "workshop_owner"
  | "workshop_service_manager"
  | "workshop_parts_manager"
  | "fleet_maintenance_head"
  | "logistics_fleet_manager"
  | "logistics_delivery_driver"
  | "platform_admin"
  | "investor_viewer";

export const AUTO_ROLE_LABELS: Record<AutoRole, string> = {
  manufacturer_ceo: "Auto Parts Manufacturer CEO",
  manufacturer_sales_director: "Sales Director",
  manufacturer_territory_rep: "Territory Representative",
  manufacturer_product_engineer: "Product Engineer",
  manufacturer_supply_chain: "Supply Chain Director",
  distributor_owner: "Parts Distributor Owner",
  distributor_sales_manager: "Sales Manager",
  distributor_sales_rep: "Parts Sales Rep",
  distributor_warehouse_manager: "Warehouse Manager",
  distributor_finance_manager: "Finance Manager",
  workshop_owner: "Workshop Owner",
  workshop_service_manager: "Service Manager",
  workshop_parts_manager: "Parts Manager",
  fleet_maintenance_head: "Fleet Maintenance Head",
  logistics_fleet_manager: "Fleet Manager",
  logistics_delivery_driver: "Delivery Driver",
  platform_admin: "Platform Admin",
  investor_viewer: "Investor Viewer",
};

export const AUTO_ROLE_DESCRIPTIONS: Record<AutoRole, string> = {
  manufacturer_ceo: "Full platform - parts penetration, workshop analytics, OEM data",
  manufacturer_sales_director: "Territory strategy, dealer management, sales analytics",
  manufacturer_territory_rep: "Workshop visits, parts promotion, territory execution",
  manufacturer_product_engineer: "Parts catalog, compatibility data, technical specs",
  manufacturer_supply_chain: "Production planning, inventory allocation, logistics",
  distributor_owner: "Distribution operations, inventory, credit, fleet",
  distributor_sales_manager: "Workshop coverage, territory analytics, rep management",
  distributor_sales_rep: "Workshop visits, order capture, parts recommendations",
  distributor_warehouse_manager: "Parts storage, dispatch, receiving operations",
  distributor_finance_manager: "Reconciliation, credit control, financial reporting",
  workshop_owner: "Workshop operations, parts ordering, service management",
  workshop_service_manager: "Service scheduling, parts requisition, job management",
  workshop_parts_manager: "Parts inventory, ordering, compatibility lookup",
  fleet_maintenance_head: "Fleet parts procurement, maintenance scheduling",
  logistics_fleet_manager: "Fleet operations, delivery logistics",
  logistics_delivery_driver: "Delivery execution, proof of delivery",
  platform_admin: "Full system administration",
  investor_viewer: "Platform metrics and growth analytics",
};

export type AutoRoleCategory = "manufacturer" | "distributor" | "workshop" | "fleet" | "logistics" | "platform";

export const AUTO_ROLE_CATEGORIES: Record<AutoRoleCategory, { label: string; roles: AutoRole[] }> = {
  manufacturer: {
    label: "Auto Parts Manufacturer",
    roles: ["manufacturer_ceo", "manufacturer_sales_director", "manufacturer_territory_rep", "manufacturer_product_engineer", "manufacturer_supply_chain"],
  },
  distributor: {
    label: "Parts Distributor",
    roles: ["distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "distributor_warehouse_manager", "distributor_finance_manager"],
  },
  workshop: {
    label: "Workshop / Garage",
    roles: ["workshop_owner", "workshop_service_manager", "workshop_parts_manager"],
  },
  fleet: {
    label: "Fleet Operator",
    roles: ["fleet_maintenance_head"],
  },
  logistics: {
    label: "Logistics Partner",
    roles: ["logistics_fleet_manager", "logistics_delivery_driver"],
  },
  platform: {
    label: "Platform",
    roles: ["platform_admin", "investor_viewer"],
  },
};

export const useAutoRole = () => {
  const { user } = useAuth();
  const [autoRole, setAutoRole] = useState<AutoRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) { setAutoRole(null); setLoading(false); return; }
      const { data, error } = await supabase
        .from("auto_team_members")
        .select("auto_role")
        .eq("user_id", user.id)
        .single();
      if (!error && data) setAutoRole(data.auto_role as AutoRole);
      setLoading(false);
    };
    fetchRole();
  }, [user]);

  const setRole = async (role: AutoRole) => {
    if (!user) return;
    const { error } = await supabase
      .from("auto_team_members")
      .upsert({ user_id: user.id, auto_role: role, email: user.email, display_name: user.user_metadata?.full_name || user.email?.split("@")[0] }, { onConflict: "user_id" });
    if (!error) setAutoRole(role);
    return { error };
  };

  return { autoRole, loading, setRole };
};
