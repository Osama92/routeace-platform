import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, ArrowRight, TrendingUp, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { onQuotaExceeded, type QuotaExceededDetail, type QuotaResource } from "@/lib/quotaErrors";

// ── Resource display config ───────────────────────────────────────
const RESOURCE_COPY: Record<QuotaResource, { noun: string; action: string; icon: string }> = {
  vehicle:     { noun: "Vehicles",     action: "add more vehicles",      icon: "🚛" },
  user:        { noun: "Team Members", action: "invite more team members", icon: "👥" },
  dispatch:    { noun: "Dispatches",   action: "create more dispatches",  icon: "📦" },
  ai_credit:   { noun: "AI Credits",   action: "use more AI features",    icon: "🤖" },
  branch:      { noun: "Branches",     action: "add more branches",       icon: "🏢" },
  integration: { noun: "Integrations", action: "connect more integrations", icon: "🔌" },
};

// ── What each plan unlocks ────────────────────────────────────────
const PLAN_HIGHLIGHTS: Record<QuotaResource, string[]> = {
  vehicle:     ["Up to 100 vehicles on Growth", "Unlimited on Enterprise", "AI-powered fleet insights"],
  user:        ["50 team members on Growth", "Unlimited on Enterprise", "Role-based access control"],
  dispatch:    ["5,000 dispatches/month on Growth", "99,999 on Enterprise", "Waybills & POD included"],
  ai_credit:   ["500 AI credits/month on Growth", "2,000 on Enterprise", "Route optimization & forecasting"],
  branch:      ["10 branches on Growth", "999 on Enterprise", "Per-branch reporting"],
  integration: ["5 integrations on Growth", "99 on Enterprise", "WhatsApp, webhooks & API access"],
};

export default function UpgradePromptDialog() {
  const navigate = useNavigate();
  const [open, setOpen]     = useState(false);
  const [detail, setDetail] = useState<QuotaExceededDetail | null>(null);

  useEffect(() => {
    return onQuotaExceeded((d) => {
      setDetail(d);
      setOpen(true);
    });
  }, []);

  if (!detail) return null;

  const copy       = RESOURCE_COPY[detail.resource];
  const highlights = PLAN_HIGHLIGHTS[detail.resource];

  // Extract counts from the trigger message, e.g. "Vehicle quota exceeded (20 of 20 used)"
  const countMatch = detail.message.match(/\((\d+)\s+of\s+(\d+)\s+used\)/i);
  const usedCount  = countMatch ? Number(countMatch[1]) : null;
  const maxCount   = countMatch ? Number(countMatch[2]) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-6 pt-6 pb-5 text-white relative">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/15 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="text-3xl mb-3">{copy.icon}</div>
          <DialogTitle className="text-xl font-bold text-white leading-tight">
            {copy.noun} limit reached
          </DialogTitle>
          <DialogDescription className="text-indigo-100 text-sm mt-1">
            {usedCount !== null && maxCount !== null
              ? `You've used ${usedCount} of ${maxCount} ${copy.noun.toLowerCase()} on your current plan.`
              : `You've reached the ${copy.noun.toLowerCase()} limit on your current plan.`}
          </DialogDescription>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* What you unlock */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Upgrade to unlock
            </p>
            <ul className="space-y-2">
              {highlights.map((h) => (
                <li key={h} className="flex items-center gap-2.5 text-sm text-foreground">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <Button
              className="w-full gap-2 h-10 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => { setOpen(false); navigate("/billing-engine"); }}
            >
              <Zap className="w-4 h-4" />
              View Plans & Upgrade
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
