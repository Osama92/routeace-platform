import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type BFSIRole =
  | "bank_ceo"
  | "bank_branch_manager"
  | "bank_credit_officer"
  | "bank_risk_officer"
  | "bank_compliance_officer"
  | "mfi_ceo"
  | "mfi_branch_manager"
  | "mfi_loan_officer"
  | "mfi_collections_officer"
  | "insurance_ceo"
  | "insurance_product_manager"
  | "insurance_sales_agent"
  | "fintech_ceo"
  | "fintech_product_manager"
  | "agent_network_manager"
  | "agent_field_officer"
  | "agent_super_agent"
  | "platform_admin"
  | "investor_viewer";

export const BFSI_ROLE_LABELS: Record<BFSIRole, string> = {
  bank_ceo: "Bank CEO / MD",
  bank_branch_manager: "Branch Manager",
  bank_credit_officer: "Credit Officer",
  bank_risk_officer: "Risk Officer",
  bank_compliance_officer: "Compliance Officer",
  mfi_ceo: "MFI CEO",
  mfi_branch_manager: "MFI Branch Manager",
  mfi_loan_officer: "Loan Officer",
  mfi_collections_officer: "Collections Officer",
  insurance_ceo: "Insurance CEO",
  insurance_product_manager: "Product Manager",
  insurance_sales_agent: "Insurance Sales Agent",
  fintech_ceo: "Fintech CEO",
  fintech_product_manager: "Product Manager",
  agent_network_manager: "Agent Network Manager",
  agent_field_officer: "Field Officer",
  agent_super_agent: "Super Agent",
  platform_admin: "Platform Admin",
  investor_viewer: "Investor Viewer",
};

export const BFSI_ROLE_DESCRIPTIONS: Record<BFSIRole, string> = {
  bank_ceo: "Full platform - portfolio analytics, regulatory compliance, treasury",
  bank_branch_manager: "Branch operations, loan approvals, agent management",
  bank_credit_officer: "Loan processing, KYC verification, customer management",
  bank_risk_officer: "Portfolio risk, PAR analysis, fraud detection",
  bank_compliance_officer: "AML/KYC compliance, CBN reporting, audit management",
  mfi_ceo: "Microfinance operations, portfolio growth, regulatory reporting",
  mfi_branch_manager: "Branch loan portfolio, collections, agent oversight",
  mfi_loan_officer: "Field loan origination, KYC, customer visits",
  mfi_collections_officer: "Loan recovery, delinquency management",
  insurance_ceo: "Insurance portfolio, claims management, distribution",
  insurance_product_manager: "Product design, pricing, underwriting rules",
  insurance_sales_agent: "Policy sales, customer engagement, claims intake",
  fintech_ceo: "Digital lending, product analytics, growth metrics",
  fintech_product_manager: "Product features, credit scoring, disbursement flows",
  agent_network_manager: "Agent recruitment, territory management, performance",
  agent_field_officer: "Agent support, customer onboarding, KYC collection",
  agent_super_agent: "Sub-agent management, transaction monitoring",
  platform_admin: "Full system administration",
  investor_viewer: "Platform metrics and growth analytics",
};

export type BFSIRoleCategory = "bank" | "microfinance" | "insurance" | "fintech" | "agent_network" | "platform";

export const BFSI_ROLE_CATEGORIES: Record<BFSIRoleCategory, { label: string; roles: BFSIRole[] }> = {
  bank: {
    label: "Commercial Bank",
    roles: ["bank_ceo", "bank_branch_manager", "bank_credit_officer", "bank_risk_officer", "bank_compliance_officer"],
  },
  microfinance: {
    label: "Microfinance Institution",
    roles: ["mfi_ceo", "mfi_branch_manager", "mfi_loan_officer", "mfi_collections_officer"],
  },
  insurance: {
    label: "Insurance Company",
    roles: ["insurance_ceo", "insurance_product_manager", "insurance_sales_agent"],
  },
  fintech: {
    label: "Fintech / Digital Lender",
    roles: ["fintech_ceo", "fintech_product_manager"],
  },
  agent_network: {
    label: "Agent Banking Network",
    roles: ["agent_network_manager", "agent_field_officer", "agent_super_agent"],
  },
  platform: {
    label: "Platform",
    roles: ["platform_admin", "investor_viewer"],
  },
};

export const useBFSIRole = () => {
  const { user } = useAuth();
  const [bfsiRole, setBfsiRole] = useState<BFSIRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) { setBfsiRole(null); setLoading(false); return; }
      const { data, error } = await supabase
        .from("bfsi_team_members")
        .select("bfsi_role")
        .eq("user_id", user.id)
        .single();
      if (!error && data) setBfsiRole(data.bfsi_role as BFSIRole);
      setLoading(false);
    };
    fetchRole();
  }, [user]);

  const setRole = async (role: BFSIRole) => {
    if (!user) return;
    const { error } = await supabase
      .from("bfsi_team_members")
      .upsert({ user_id: user.id, bfsi_role: role, email: user.email, display_name: user.user_metadata?.full_name || user.email?.split("@")[0] }, { onConflict: "user_id" });
    if (!error) setBfsiRole(role);
    return { error };
  };

  return { bfsiRole, loading, setRole };
};
