import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";

export default function BillingVerify() {
  const navigate = useNavigate();
  const { refreshApprovalStatus } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [plan, setPlan] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference") ?? params.get("trxref");
    if (!ref) { setStatus("failed"); return; }

    supabase.functions
      .invoke("verify-subscription-payment", { body: { reference: ref } })
      .then(async ({ data, error }) => {
        if (error || !data?.success) { setStatus("failed"); return; }
        setPlan(data.plan_name ?? "");
        await refreshApprovalStatus();
        setStatus("success");
      })
      .catch(() => setStatus("failed"));
  }, []);

  return (
    <DashboardLayout title="Payment Verification">
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            {status === "loading" && (
              <>
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <h2 className="text-xl font-semibold">Verifying your payment…</h2>
                <p className="text-muted-foreground">Please don't close this page.</p>
              </>
            )}
            {status === "success" && (
              <>
                <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                <h2 className="text-xl font-semibold">Subscription Activated!</h2>
                {plan && <p className="text-muted-foreground">Your {plan} plan is now active.</p>}
                <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
              </>
            )}
            {status === "failed" && (
              <>
                <XCircle className="h-12 w-12 mx-auto text-destructive" />
                <h2 className="text-xl font-semibold">Payment Not Confirmed</h2>
                <p className="text-muted-foreground">
                  Your payment could not be verified. If you were charged, contact support with your transaction reference.
                </p>
                <Button variant="outline" onClick={() => navigate("/billing-engine")}>Back to Billing</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
