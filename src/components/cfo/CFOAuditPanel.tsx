import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ScrollText, Hash } from "lucide-react";

type AuditRow = {
  id: string;
  module_key: string;
  event_type: string;
  recommendation: string | null;
  ledger_entry_hash: string | null;
  metadata: any;
  created_at: string;
};

export default function CFOAuditPanel() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cfo_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      setRows((data || []) as AuditRow[]);
      setLoading(false);
    })();
  }, []);

  const tone = (e: string) =>
    e === "action_taken" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
    : e === "approval" ? "bg-primary/15 text-primary border-primary/30"
    : e === "recommendation_shown" ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
    : "bg-muted text-muted-foreground border-border";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary" /> CFO Audit Trail
        </CardTitle>
        <CardDescription>
          Every CFO module click and AI recommendation, linked to immutable ledger hashes when actions are taken.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading audit trail…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No CFO activity recorded yet.</div>
        ) : (
          <div className="space-y-1 max-h-96 overflow-auto">
            {rows.map((r) => (
              <div key={r.id} className="flex items-start gap-3 text-sm border border-border/40 rounded-md px-3 py-2">
                <Badge variant="outline" className={`text-[10px] shrink-0 ${tone(r.event_type)}`}>
                  {r.event_type.replace(/_/g, " ")}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-xs">{r.module_key}</div>
                  {r.recommendation && (
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{r.recommendation}</div>
                  )}
                  {r.ledger_entry_hash && (
                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 font-mono">
                      <Hash className="w-2.5 h-2.5" /> {r.ledger_entry_hash.slice(0, 16)}…
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
