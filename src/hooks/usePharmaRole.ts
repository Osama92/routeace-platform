import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PharmaRole =
  | "manufacturer_ceo"
  | "manufacturer_sales_director"
  | "manufacturer_med_rep"
  | "manufacturer_med_science"
  | "manufacturer_regulatory_affairs"
  | "manufacturer_quality_assurance"
  | "manufacturer_supply_chain"
  | "distributor_owner"
  | "distributor_sales_manager"
  | "distributor_sales_rep"
  | "distributor_warehouse_manager"
  | "distributor_finance_manager"
  | "pharmacy_owner"
  | "pharmacy_manager"
  | "pharmacy_procurement"
  | "hospital_pharmacy_director"
  | "hospital_procurement"
  | "logistics_fleet_manager"
  | "logistics_cold_chain_specialist"
  | "logistics_delivery_driver"
  | "platform_admin"
  | "investor_viewer";

export const PHARMA_ROLE_LABELS: Record<PharmaRole, string> = {
  manufacturer_ceo: "Pharma CEO / MD",
  manufacturer_sales_director: "Sales Director",
  manufacturer_med_rep: "Medical Representative",
  manufacturer_med_science: "Medical Science Liaison",
  manufacturer_regulatory_affairs: "Regulatory Affairs Manager",
  manufacturer_quality_assurance: "QA Manager",
  manufacturer_supply_chain: "Supply Chain Director",
  distributor_owner: "Distributor Owner",
  distributor_sales_manager: "Distributor Sales Manager",
  distributor_sales_rep: "Sales Representative",
  distributor_warehouse_manager: "Warehouse Manager",
  distributor_finance_manager: "Finance Manager",
  pharmacy_owner: "Pharmacy Owner",
  pharmacy_manager: "Pharmacy Manager",
  pharmacy_procurement: "Procurement Officer",
  hospital_pharmacy_director: "Hospital Pharmacy Director",
  hospital_procurement: "Hospital Procurement",
  logistics_fleet_manager: "Fleet Manager",
  logistics_cold_chain_specialist: "Cold Chain Specialist",
  logistics_delivery_driver: "Delivery Driver",
  platform_admin: "Platform Admin",
  investor_viewer: "Investor Viewer",
};

export const PHARMA_ROLE_DESCRIPTIONS: Record<PharmaRole, string> = {
  manufacturer_ceo: "Full platform access - national KPIs, regulatory, financing",
  manufacturer_sales_director: "Sales strategy, territory management, med rep oversight",
  manufacturer_med_rep: "Doctor visits, prescription tracking, sample distribution",
  manufacturer_med_science: "Clinical data, pharmacovigilance, formulary management",
  manufacturer_regulatory_affairs: "NAFDAC compliance, drug registration, recalls",
  manufacturer_quality_assurance: "Batch tracking, counterfeit detection, quality audits",
  manufacturer_supply_chain: "Production planning, cold chain, distribution logistics",
  distributor_owner: "Distribution operations, inventory, credit, fleet",
  distributor_sales_manager: "Pharmacy coverage, territory analytics, rep management",
  distributor_sales_rep: "Pharmacy visits, order capture, territory execution",
  distributor_warehouse_manager: "Stock management, cold storage, dispatch operations",
  distributor_finance_manager: "Reconciliation, credit control, financial reporting",
  pharmacy_owner: "Pharmacy operations, ordering, inventory management",
  pharmacy_manager: "Daily operations, stock management, prescription filling",
  pharmacy_procurement: "Supplier management, ordering, cost control",
  hospital_pharmacy_director: "Hospital formulary, controlled substances, procurement",
  hospital_procurement: "Multi-vendor ordering, tender management",
  logistics_fleet_manager: "Fleet operations, cold chain logistics, route planning",
  logistics_cold_chain_specialist: "Temperature monitoring, cold storage compliance",
  logistics_delivery_driver: "Delivery execution, proof of delivery",
  platform_admin: "Full system administration",
  investor_viewer: "Platform metrics and growth analytics",
};

export type PharmaRoleCategory = "manufacturer" | "distributor" | "pharmacy" | "hospital" | "logistics" | "platform";

export const PHARMA_ROLE_CATEGORIES: Record<PharmaRoleCategory, { label: string; roles: PharmaRole[] }> = {
  manufacturer: {
    label: "Pharmaceutical Manufacturer",
    roles: ["manufacturer_ceo", "manufacturer_sales_director", "manufacturer_med_rep", "manufacturer_med_science", "manufacturer_regulatory_affairs", "manufacturer_quality_assurance", "manufacturer_supply_chain"],
  },
  distributor: {
    label: "Pharma Distributor",
    roles: ["distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "distributor_warehouse_manager", "distributor_finance_manager"],
  },
  pharmacy: {
    label: "Pharmacy / Retail",
    roles: ["pharmacy_owner", "pharmacy_manager", "pharmacy_procurement"],
  },
  hospital: {
    label: "Hospital",
    roles: ["hospital_pharmacy_director", "hospital_procurement"],
  },
  logistics: {
    label: "Logistics Partner",
    roles: ["logistics_fleet_manager", "logistics_cold_chain_specialist", "logistics_delivery_driver"],
  },
  platform: {
    label: "Platform",
    roles: ["platform_admin", "investor_viewer"],
  },
};

export const usePharmaRole = () => {
  const { user } = useAuth();
  const [pharmaRole, setPharmaRole] = useState<PharmaRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) { setPharmaRole(null); setLoading(false); return; }
      const { data, error } = await supabase
        .from("pharma_team_members")
        .select("pharma_role")
        .eq("user_id", user.id)
        .single();
      if (!error && data) setPharmaRole(data.pharma_role as PharmaRole);
      setLoading(false);
    };
    fetchRole();
  }, [user]);

  const setRole = async (role: PharmaRole) => {
    if (!user) return;
    const { error } = await supabase
      .from("pharma_team_members")
      .upsert({ user_id: user.id, pharma_role: role, email: user.email, display_name: user.user_metadata?.full_name || user.email?.split("@")[0] }, { onConflict: "user_id" });
    if (!error) setPharmaRole(role);
    return { error };
  };

  return { pharmaRole, loading, setRole };
};
