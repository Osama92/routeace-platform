import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, HelpCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PayrollErrorFallbackProps {
  error: string;
  retryCount: number;
  onRetry: () => void;
}

const PayrollErrorFallback = ({ error, retryCount, onRetry }: PayrollErrorFallbackProps) => {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-5 h-5" />
          Payroll Data Load Failed
        </CardTitle>
        <CardDescription>
          Unable to fetch payroll data after {retryCount + 1} attempt(s)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Details</AlertTitle>
          <AlertDescription className="mt-2">
            {error}
          </AlertDescription>
        </Alert>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry Loading
          </Button>
        </div>

        <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
          <p className="font-medium mb-2">Common Causes & Fixes:</p>
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong>No drivers/staff registered:</strong> Add drivers (Drivers → Add Driver) or staff before running payroll.</li>
            <li><strong>Permission denied:</strong> You need Finance Manager or Admin role to access payroll data.</li>
            <li><strong>Network timeout:</strong> Check your internet connection and try refreshing the page.</li>
            <li><strong>No data for selected month:</strong> If no dispatches or salary records exist for the selected period, totals will be zero - this is normal for new tenants.</li>
            <li><strong>Database connection issue:</strong> Wait a moment and click "Retry Loading" above.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default PayrollErrorFallback;
