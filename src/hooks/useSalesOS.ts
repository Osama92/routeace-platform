import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SalesLead {
  id: string;
  company_name: string;
  contact_name: string;
  contact_title: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  stage: string | null;
  score: number | null;
  expected_value: number | null;
  currency: string | null;
  assigned_to: string | null;
  territory: string | null;
  industry: string | null;
  notes: string | null;
  created_at: string | null;
}

export interface SalesAccount {
  id: string;
  account_name: string;
  account_type: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  tier: string | null;
  credit_limit: number | null;
  territory: string | null;
  total_revenue: number | null;
  total_orders: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

export interface SalesOpportunity {
  id: string;
  opportunity_name: string;
  account_id: string | null;
  lead_id: string | null;
  stage: string | null;
  probability: number | null;
  amount: number | null;
  currency: string | null;
  expected_close_date: string | null;
  assigned_to: string | null;
  competitor: string | null;
  deal_risk: string | null;
  notes: string | null;
  created_at: string | null;
  account?: { account_name: string } | null;
}

export interface SalesQuote {
  id: string;
  quote_number: string;
  account_id: string | null;
  opportunity_id: string | null;
  status: string | null;
  subtotal: number | null;
  discount_amount: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  valid_until: string | null;
  version: number | null;
  notes: string | null;
  created_at: string | null;
  account?: { account_name: string } | null;
}

export interface SalesActivity {
  id: string;
  activity_type: string;
  subject: string;
  description: string | null;
  lead_id: string | null;
  account_id: string | null;
  opportunity_id: string | null;
  activity_date: string | null;
  duration_minutes: number | null;
  outcome: string | null;
  next_action: string | null;
  is_completed: boolean | null;
  created_at: string | null;
}

export const useSalesOS = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [accounts, setAccounts] = useState<SalesAccount[]>([]);
  const [opportunities, setOpportunities] = useState<SalesOpportunity[]>([]);
  const [quotes, setQuotes] = useState<SalesQuote[]>([]);
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [leadsR, accountsR, oppsR, quotesR, activitiesR] = await Promise.all([
      supabase.from("sales_leads").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("sales_accounts").select("*").order("account_name").limit(200),
      supabase.from("sales_opportunities").select("*, sales_accounts(account_name)").order("created_at", { ascending: false }).limit(200),
      supabase.from("sales_quotes").select("*, sales_accounts(account_name)").order("created_at", { ascending: false }).limit(100),
      supabase.from("sales_activities").select("*").order("activity_date", { ascending: false }).limit(100),
    ]);
    if (leadsR.data) setLeads(leadsR.data as any);
    if (accountsR.data) setAccounts(accountsR.data as any);
    if (oppsR.data) setOpportunities(oppsR.data.map((o: any) => ({ ...o, account: o.sales_accounts })) as any);
    if (quotesR.data) setQuotes(quotesR.data.map((q: any) => ({ ...q, account: q.sales_accounts })) as any);
    if (activitiesR.data) setActivities(activitiesR.data as any);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createLead = async (data: Partial<SalesLead>) => {
    if (!user) return;
    const { error } = await supabase.from("sales_leads").insert({ ...data, created_by: user.id } as any);
    if (error) { toast.error("Failed to create lead: " + error.message); return; }
    toast.success("Lead created!");
    await fetchAll();
  };

  const createAccount = async (data: Partial<SalesAccount>) => {
    if (!user) return;
    const { error } = await supabase.from("sales_accounts").insert({ ...data, created_by: user.id } as any);
    if (error) { toast.error("Failed to create account: " + error.message); return; }
    toast.success("Account created!");
    await fetchAll();
  };

  const createOpportunity = async (data: Partial<SalesOpportunity>) => {
    if (!user) return;
    const { error } = await supabase.from("sales_opportunities").insert({ ...data, created_by: user.id } as any);
    if (error) { toast.error("Failed to create opportunity: " + error.message); return; }
    toast.success("Opportunity created!");
    await fetchAll();
  };

  const updateOpportunityStage = async (id: string, stage: string, probability: number) => {
    const { error } = await supabase.from("sales_opportunities").update({ stage, probability, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Update failed"); return; }
    toast.success(`Stage updated to ${stage}`);
    await fetchAll();
  };

  const createQuote = async (data: Partial<SalesQuote>) => {
    if (!user) return;
    const num = `QT-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from("sales_quotes").insert({ ...data, quote_number: num, created_by: user.id } as any);
    if (error) { toast.error("Failed to create quote: " + error.message); return; }
    toast.success("Quote created!");
    await fetchAll();
  };

  const logActivity = async (data: Partial<SalesActivity>) => {
    if (!user) return;
    const { error } = await supabase.from("sales_activities").insert({ ...data, performed_by: user.id } as any);
    if (error) { toast.error("Failed to log activity: " + error.message); return; }
    toast.success("Activity logged!");
    await fetchAll();
  };

  // Pipeline stats
  const pipelineStages = [
    { stage: "lead", label: "Lead", probability: 10 },
    { stage: "qualified", label: "Qualified", probability: 25 },
    { stage: "discovery", label: "Discovery", probability: 40 },
    { stage: "proposal", label: "Proposal", probability: 60 },
    { stage: "negotiation", label: "Negotiation", probability: 75 },
    { stage: "approval", label: "Approval", probability: 90 },
    { stage: "won", label: "Won", probability: 100 },
    { stage: "lost", label: "Lost", probability: 0 },
  ];

  const pipelineData = pipelineStages.map(ps => ({
    ...ps,
    count: opportunities.filter(o => o.stage === ps.stage).length,
    value: opportunities.filter(o => o.stage === ps.stage).reduce((s, o) => s + (o.amount || 0), 0),
  }));

  const totalPipeline = opportunities.filter(o => o.stage !== "won" && o.stage !== "lost").reduce((s, o) => s + (o.amount || 0), 0);
  const weightedPipeline = opportunities.filter(o => o.stage !== "won" && o.stage !== "lost").reduce((s, o) => s + (o.amount || 0) * ((o.probability || 0) / 100), 0);
  const wonRevenue = opportunities.filter(o => o.stage === "won").reduce((s, o) => s + (o.amount || 0), 0);

  return {
    leads, accounts, opportunities, quotes, activities, loading,
    createLead, createAccount, createOpportunity, updateOpportunityStage, createQuote, logActivity,
    pipelineData, totalPipeline, weightedPipeline, wonRevenue, refetch: fetchAll,
  };
};
