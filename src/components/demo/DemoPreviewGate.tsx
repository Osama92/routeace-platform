import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Eye, EyeOff } from "lucide-react";
import { useDemoPreviewsEnabled } from "@/hooks/useDemoPreviewsEnabled";

interface Props {
  /** Short name of the showcase page, e.g. "Financial Trust Dashboard" */
  title: string;
  /** One-line description of what the page would show with real data */
  description?: string;
  children: ReactNode;
}

/**
 * Wraps a "showcase / illustrative" page so that fresh tenants
 * NEVER see other companies' demo names by mistake.
 *
 * - tenant_config.show_demo_previews = false (default)  → renders
 *   a clear empty-state explaining the feature is in preview.
 * - tenant_config.show_demo_previews = true             → renders
 *   the original page contents with a persistent "Demo Preview"
 *   banner so it's always unambiguous.
 */
export function DemoPreviewGate({ title, description, children }: Props) {
  const { enabled, isLoading } = useDemoPreviewsEnabled();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="p-8 text-center text-muted-foreground">Loading…</CardContent></Card>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <EyeOff className="h-5 w-5 text-muted-foreground" />
              {title} - Preview Disabled
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {description ??
                "This module is part of an upcoming feature set and is hidden by default so you only see your own data."}
            </p>
            <Alert>
              <AlertTitle>No data from other tenants is shown here.</AlertTitle>
              <AlertDescription>
                A workspace administrator can enable illustrative previews from
                <span className="font-medium"> Settings → Workspace → Show demo previews</span>.
                Until then, this page stays hidden to protect your view.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Alert className="border-amber-500/40 bg-amber-500/10">
        <Eye className="h-4 w-4" />
        <AlertTitle>Demo preview - illustrative data only</AlertTitle>
        <AlertDescription>
          The figures and company names on this page are for demonstration. They
          are not your tenant's real records.
        </AlertDescription>
      </Alert>
      {children}
    </div>
  );
}
