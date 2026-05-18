import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  dispatchId: string;
  status: string;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
  label?: string;
}

export function ResendClientEmailButton({
  dispatchId,
  status,
  size = "sm",
  variant = "outline",
  label = "Resend Email",
}: Props) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (!dispatchId || !status) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-delivery-status", {
        body: { dispatch_id: dispatchId, status, notes: "Manual resend by operations team." },
      });
      if (error) throw error;
      toast.success(
        (data as any)?.email_sent
          ? "Client email re-sent from routeaceglyde.app"
          : "Update logged - no client email on file",
      );
    } catch (e: any) {
      toast.error("Resend failed", { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size={size} variant={variant} onClick={handleClick} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
      {label}
    </Button>
  );
}
