import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import VendorInvoicesPanel from "@/components/vendor/VendorInvoicesPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertCircle } from "lucide-react";

export default function VendorPortal() {
  const { user } = useAuth();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("ld_transporters")
        .select("partner_id, organization_id, company_name, onboarding_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setPartnerId((data as any).partner_id);
        setOrgId((data as any).organization_id);
        setCompanyName((data as any).company_name);
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return <DashboardLayout title="Vendor Portal"><p className="text-muted-foreground">Loading…</p></DashboardLayout>;
  }

  if (!partnerId) {
    return (
      <DashboardLayout title="Vendor Portal">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-warning mb-3" />
            <h3 className="text-lg font-semibold mb-1">Awaiting Approval</h3>
            <p className="text-muted-foreground text-sm">Your vendor profile is pending approval. Once the Logistics Manager approves your account, you'll be able to upload invoices and view your payment status here.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Vendor Portal" subtitle={companyName}>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><FileText className="w-5 h-5" /> My Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Upload your invoice PDFs here. Our AI will read each invoice and match the waybill / dispatch numbers to our records,
            then route it to the Logistics Manager for approval. You'll only see invoices you've uploaded - no other vendor or company data is visible.
          </p>
          <VendorInvoicesPanel vendorPartnerId={partnerId} organizationId={orgId || undefined} readOnly />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
