import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, CheckCircle2, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PublicDeliveryRating() {
  const { token } = useParams();
  const { toast } = useToast();
  const [ctx, setCtx] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [nps, setNps] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) return;
      const { data } = await supabase.rpc("get_delivery_csat_context", { p_token: token });
      setCtx(Array.isArray(data) ? data[0] : data);
      setLoading(false);
    })();
  }, [token]);

  async function submit() {
    if (rating < 1) { toast({ title: "Please select a rating", variant: "destructive" }); return; }
    setSubmitting(true);
    const { error } = await supabase.rpc("rate_delivery_csat", {
      p_token: token, p_rating: rating, p_nps: nps, p_comment: comment || null,
    });
    setSubmitting(false);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setDone(true);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!ctx) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full"><CardHeader><CardTitle>Survey not found</CardTitle>
        <CardDescription>This rating link is invalid.</CardDescription></CardHeader></Card>
    </div>
  );
  if (ctx.expired) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full"><CardHeader><CardTitle>Link expired</CardTitle>
        <CardDescription>This rating window has closed.</CardDescription></CardHeader></Card>
    </div>
  );
  if (done || ctx.already_rated) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
          <CardTitle>Thank you!</CardTitle>
          <CardDescription>Your feedback has been recorded.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1"><Truck className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">{ctx.organization_name} {ctx.dispatch_number ? `· #${ctx.dispatch_number}` : ""}</span>
          </div>
          <CardTitle>How was your delivery?</CardTitle>
          <CardDescription>Your feedback helps us improve.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center gap-1">
            {[1,2,3,4,5].map(n => (
              <button key={n} type="button" onClick={() => setRating(n)} className="p-1">
                <Star className={`w-9 h-9 transition-colors ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">How likely are you to recommend us? (0–10)</Label>
            <div className="flex flex-wrap gap-1">
              {Array.from({length: 11}, (_,i) => i).map(n => (
                <button key={n} type="button" onClick={() => setNps(n)}
                  className={`w-9 h-9 text-xs rounded border ${nps === n ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Comments (optional)</Label>
            <Textarea rows={3} maxLength={2000} value={comment} onChange={e => setComment(e.target.value)} placeholder="What went well or what could we improve?" />
          </div>
          <Button className="w-full" onClick={submit} disabled={submitting || rating < 1}>
            {submitting ? "Submitting…" : "Submit Feedback"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
