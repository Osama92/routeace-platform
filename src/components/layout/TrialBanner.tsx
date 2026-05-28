import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, X, ArrowRight, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "routeace_trial_banner_dismissed_at";
const REDISPLAY_HOURS = 24; // re-show after 24 h even if dismissed

export default function TrialBanner() {
  const { subscriptionStatus, trialDaysRemaining, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Re-show banner after REDISPLAY_HOURS even if user dismissed it earlier
  useEffect(() => {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return;
    const dismissedAt = Number(raw);
    const hoursSince = (Date.now() - dismissedAt) / 3_600_000;
    if (hoursSince < REDISPLAY_HOURS) setDismissed(true);
  }, []);

  // Never show to super_admins or non-trial orgs
  if (subscriptionStatus !== "trial" || isSuperAdmin) return null;
  if (trialDaysRemaining === null) return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  // ── Urgency tier ──────────────────────────────────────────────
  const isUrgent   = trialDaysRemaining <= 1;
  const isWarning  = trialDaysRemaining === 2;

  const { bg, border, text, subtext, badgeBg, badgeText, btnVariant } = (() => {
    if (isUrgent) return {
      bg:          "bg-red-50 dark:bg-red-950/40",
      border:      "border-red-200 dark:border-red-800",
      text:        "text-red-900 dark:text-red-100",
      subtext:     "text-red-700 dark:text-red-300",
      badgeBg:     "bg-red-500",
      badgeText:   "text-white",
      btnVariant:  "destructive" as const,
    };
    if (isWarning) return {
      bg:          "bg-amber-50 dark:bg-amber-950/40",
      border:      "border-amber-200 dark:border-amber-800",
      text:        "text-amber-900 dark:text-amber-100",
      subtext:     "text-amber-700 dark:text-amber-300",
      badgeBg:     "bg-amber-500",
      badgeText:   "text-white",
      btnVariant:  "default" as const,
    };
    return {
      bg:          "bg-indigo-50 dark:bg-indigo-950/40",
      border:      "border-indigo-200 dark:border-indigo-800",
      text:        "text-indigo-900 dark:text-indigo-100",
      subtext:     "text-indigo-600 dark:text-indigo-300",
      badgeBg:     "bg-indigo-500",
      badgeText:   "text-white",
      btnVariant:  "default" as const,
    };
  })();

  const dayLabel = trialDaysRemaining === 0
    ? "Expires today"
    : trialDaysRemaining === 1
    ? "1 day left"
    : `${trialDaysRemaining} days left`;

  const message = trialDaysRemaining === 0
    ? "Your free trial expires tonight. Upgrade now to avoid any interruption."
    : trialDaysRemaining === 1
    ? "Your free trial expires tomorrow. Upgrade to keep your operations running."
    : trialDaysRemaining === 2
    ? "2 days left on your free trial. Lock in your plan before it expires."
    : `You're on a free 7-day trial. ${trialDaysRemaining} days remaining.`;

  return (
    <div
      role="banner"
      aria-label="Free trial status"
      className={cn(
        "w-full border-b px-4 py-2.5 flex items-center gap-3",
        bg, border,
        isUrgent && "animate-pulse-subtle"
      )}
    >
      {/* Icon + badge */}
      <div className="flex items-center gap-2 shrink-0">
        <Clock className={cn("w-4 h-4", subtext)} />
        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", badgeBg, badgeText)}>
          {dayLabel}
        </span>
      </div>

      {/* Message */}
      <p className={cn("text-sm flex-1 min-w-0 truncate", text)}>
        {message}
      </p>

      {/* CTA */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant={btnVariant}
          className="h-7 text-xs gap-1 font-semibold"
          onClick={() => navigate("/billing-engine")}
        >
          <Zap className="w-3.5 h-3.5" />
          Upgrade Now
          <ArrowRight className="w-3 h-3" />
        </Button>

        {/* Only show dismiss if not on last day */}
        {trialDaysRemaining > 0 && (
          <button
            aria-label="Dismiss trial banner"
            onClick={handleDismiss}
            className={cn(
              "p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors",
              subtext
            )}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
