import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";

/**
 * Lets a Super Admin toggle whether illustrative "showcase" preview pages
 * (PortoDash demo, Financial Trust, Supplier Intelligence, etc.) are visible
 * for this tenant. Default off so users only see their own real data.
 */
export function DemoPreviewToggleCard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const { data } = await supabase
        .from("tenant_config").select("show_demo_previews")
        .eq("user_id", u.user.id).maybeSingle();
      setEnabled(!!data?.show_demo_previews);
      setLoading(false);
    })();
  }, []);

  const onToggle = async (next: boolean) => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("tenant_config")
      .update({ show_demo_previews: next })
      .eq("user_id", u.user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not update", description: error.message, variant: "destructive" });
      return;
    }
    setEnabled(next);
    qc.invalidateQueries({ queryKey: ["tenant_config", "show_demo_previews"] });
    toast({
      title: next ? "Demo previews enabled" : "Demo previews disabled",
      description: next
        ? "Showcase pages will display illustrative data with a clear demo banner."
        : "Showcase pages will be hidden for everyone in this workspace.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" /> Demo Previews</CardTitle>
        <CardDescription>
          Controls whether illustrative showcase pages (PortoDash, Financial Trust,
          Supplier Intelligence, etc.) are visible. Off by default so users only
          see their own real data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="show-demo" className="font-medium">
            Show illustrative demo pages
          </Label>
          <Switch
            id="show-demo"
            checked={enabled}
            disabled={loading || saving}
            onCheckedChange={onToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
