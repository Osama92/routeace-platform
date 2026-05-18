import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Camera } from "lucide-react";
import type { ShelfAudit, Outlet } from "@/hooks/useFieldSales";

interface Props {
  audits: ShelfAudit[];
  outlets: Outlet[];
  selectedOutletName?: string;
  onSubmitAudit: (outletName: string, auditType: string, score: number, issues: any, notes?: string) => Promise<void>;
}

const CHECKLIST_ITEMS = [
  "Planogram Compliance",
  "Shelf Share vs Competition",
  "Price Tag Accuracy",
  "FIFO Compliance",
  "Promotional Material Display",
  "Stock Facing Count",
];

const MerchandisingAuditTab = ({ audits, outlets, selectedOutletName, onSubmitAudit }: Props) => {
  const [outletName, setOutletName] = useState(selectedOutletName || "");
  const [auditType, setAuditType] = useState("shelf_compliance");
  const [scores, setScores] = useState<Record<string, number>>(Object.fromEntries(CHECKLIST_ITEMS.map(i => [i, 80])));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const avgScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length);

  const handleSubmit = async () => {
    if (!outletName) return;
    setSubmitting(true);
    const issues = Object.entries(scores).filter(([, v]) => v < 70).map(([k, v]) => ({ item: k, score: v, status: v < 50 ? "fail" : "warning" }));
    await onSubmitAudit(outletName, auditType, avgScore, issues, notes || undefined);
    setNotes("");
    setSubmitting(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5" /> Compliance Checklist</CardTitle>
          <Badge variant="secondary">Score: {avgScore}/100</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={outletName} onValueChange={setOutletName}>
            <SelectTrigger><SelectValue placeholder="Select outlet..." /></SelectTrigger>
            <SelectContent>
              {outlets.map(o => <SelectItem key={o.id} value={o.outlet_name}>{o.outlet_name}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="space-y-4">
            {CHECKLIST_ITEMS.map(item => (
              <div key={item} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${scores[item] >= 80 ? "bg-emerald-500" : scores[item] >= 50 ? "bg-yellow-500" : "bg-red-500"}`} />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                  <Badge variant={scores[item] >= 80 ? "default" : scores[item] >= 50 ? "secondary" : "destructive"}>{scores[item]}%</Badge>
                </div>
                <Slider value={[scores[item]]} min={0} max={100} step={1} onValueChange={([v]) => setScores({ ...scores, [item]: v })} />
              </div>
            ))}
          </div>

          <Textarea placeholder="Additional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
          <Button className="w-full" onClick={handleSubmit} disabled={submitting || !outletName}>{submitting ? "Submitting..." : "Submit Audit"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="w-5 h-5" /> Recent Audits</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {audits.length > 0 ? audits.slice(0, 6).map(a => (
            <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="font-medium text-sm">{a.outlet_name}</p>
                <p className="text-xs text-muted-foreground">{a.audit_date ? new Date(a.audit_date).toLocaleDateString() : "-"} · {a.audit_type}</p>
              </div>
              <Badge variant={
                (a.compliance_score || 0) >= 80 ? "default" :
                (a.compliance_score || 0) >= 50 ? "secondary" : "destructive"
              }>{a.compliance_score || 0}%</Badge>
            </div>
          )) : (
            <p className="text-center text-muted-foreground py-8">No audits submitted yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchandisingAuditTab;
