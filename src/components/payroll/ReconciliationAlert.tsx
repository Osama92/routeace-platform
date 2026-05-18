import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, TrendingUp } from "lucide-react";
import type { ReconciliationStatus } from "@/hooks/usePayrollFetch";

interface ReconciliationAlertProps {
  reconciliation: ReconciliationStatus;
  formatCurrency: (amount: number) => string;
}

const ReconciliationAlert = ({ reconciliation, formatCurrency }: ReconciliationAlertProps) => {
  if (reconciliation.isReconciled) {
    return (
      <Alert className="border-success/30 bg-success/5">
        <CheckCircle className="h-4 w-4 text-success" />
        <AlertTitle className="text-success">Ledger Reconciled</AlertTitle>
        <AlertDescription>
          Payroll totals match the finance ledger. Ready to process.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Reconciliation Variance Detected</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>
          There is a variance of <strong>{formatCurrency(reconciliation.varianceNet)}</strong> between 
          payroll calculations and the finance ledger.
        </p>
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="w-4 h-4" />
          <span>Please verify expense records before processing.</span>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default ReconciliationAlert;
