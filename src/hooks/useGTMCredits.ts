import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useGTMCredits(osContext: "logistics" | "industry" = "logistics", industryType: string = "logistics") {
  const { user } = useAuth();
  const [balance, setBalance] = useState(100); // default 100 credits
  const [totalPurchased, setTotalPurchased] = useState(100);
  const [totalConsumed, setTotalConsumed] = useState(0);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWallet = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Try to get existing wallet
    let { data: wallet } = await supabase
      .from("gtm_credit_wallets" as any)
      .select("*")
      .eq("os_context", osContext)
      .eq("industry_type", industryType)
      .maybeSingle();

    // Auto-create wallet if not exists
    if (!wallet) {
      const { data: newWallet } = await supabase
        .from("gtm_credit_wallets" as any)
        .insert({
          os_context: osContext,
          industry_type: industryType,
          balance: 100,
          total_purchased: 100,
          total_consumed: 0,
        } as any)
        .select()
        .single();
      wallet = newWallet;
    }

    if (wallet) {
      const w = wallet as any;
      setWalletId(w.id);
      setBalance(w.balance || 0);
      setTotalPurchased(w.total_purchased || 0);
      setTotalConsumed(w.total_consumed || 0);
    }

    // Fetch transactions
    const { data: txns } = await supabase
      .from("gtm_credit_txns" as any)
      .select("*")
      .eq("os_context", osContext)
      .eq("industry_type", industryType)
      .order("created_at", { ascending: false })
      .limit(50);
    if (txns) setTransactions(txns as any[]);

    setLoading(false);
  }, [user, osContext, industryType]);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  const consumeCredits = useCallback(async (actionType: string, amount: number): Promise<boolean> => {
    if (!user || !walletId || balance < amount) {
      toast.error("Insufficient credits");
      return false;
    }

    const newBalance = balance - amount;

    // Update wallet
    await supabase
      .from("gtm_credit_wallets" as any)
      .update({
        balance: newBalance,
        total_consumed: totalConsumed + amount,
      } as any)
      .eq("id", walletId);

    // Record transaction
    await supabase.from("gtm_credit_txns" as any).insert({
      wallet_id: walletId,
      user_id: user.id,
      action_type: actionType,
      action_label: actionType.replace(/_/g, " "),
      credits_consumed: amount,
      balance_after: newBalance,
      os_context: osContext,
      industry_type: industryType,
    } as any);

    setBalance(newBalance);
    setTotalConsumed(prev => prev + amount);
    await fetchWallet();
    return true;
  }, [user, walletId, balance, totalConsumed, osContext, industryType, fetchWallet]);

  return { balance, totalPurchased, totalConsumed, transactions, loading, consumeCredits, refetch: fetchWallet };
}
