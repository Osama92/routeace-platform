import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { downloadPayslipPdf, type Payslip } from "@/lib/workforce/payslipPdf";

export default function MyPayslips() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("payslips")
        .select("*")
        .order("pay_date", { ascending: false });
      if (error) toast.error(error.message);
      setPayslips((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const handleDownload = (p: Payslip) => {
    supabase.rpc("record_payslip_download", { p_payslip_id: p.id }).then(({ error }) => {
      if (error) console.warn("Payslip download audit failed:", error.message);
    });
    try {
      downloadPayslipPdf(p);
    } catch (e: any) {
      toast.error(e.message || "Download failed");
    }
  };

  return (
    <DashboardLayout title="My Payslips">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Payslips</h1>
          <p className="text-muted-foreground">Download verified payslips for every salary you've been paid.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : payslips.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
            No payslips yet. They appear automatically once payroll is processed.
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {payslips.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <div className="font-semibold">{p.payslip_number}</div>
                    <div className="text-sm text-muted-foreground">
                      Pay date: {new Date(p.pay_date).toLocaleDateString()} · Net {p.currency_code} {Number(p.net_amount).toLocaleString()}
                    </div>
                  </div>
                  <Button onClick={() => handleDownload(p)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
