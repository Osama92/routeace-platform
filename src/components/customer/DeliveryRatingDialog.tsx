import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Star } from "lucide-react";

interface Props {
  dispatchId: string;
  organizationId: string;
  customerEmail?: string | null;
  customerName?: string | null;
}

export default function DeliveryRatingDialog({ dispatchId, organizationId, customerEmail, customerName }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [existing, setExisting] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("delivery_csat_surveys")
      .select("rating, comment, responded_at")
      .eq("dispatch_id", dispatchId)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExisting(data);
          setRating(data.rating || 0);
          setComment(data.comment || "");
        }
      });
  }, [open, dispatchId]);

  const submit = async () => {
    if (rating < 1) {
      toast({ title: "Please pick a star rating", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("delivery_csat_surveys").insert({
      dispatch_id: dispatchId,
      organization_id: organizationId,
      customer_email: customerEmail ?? null,
      customer_name: customerName ?? null,
      rating,
      comment: comment.trim() || null,
      responded_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not submit rating", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Thanks for your feedback!" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Star className="h-3 w-3 mr-1" />
          {existing?.responded_at ? "Update Rating" : "Rate Delivery"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>How was this delivery?</DialogTitle>
          <DialogDescription>Your rating helps us improve service quality.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1 justify-center py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="p-1"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  n <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Tell us what worked well or what to improve (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />
        <Button onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit rating"}</Button>
      </DialogContent>
    </Dialog>
  );
}
