/**
 * Intelligent Onboarding Teleprompter System
 * Region-aware (NG vs GLOBAL), role-aware, dismissible, DB-tracked
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useRegion } from "@/contexts/RegionContext";
import { supabase } from "@/integrations/supabase/client";

interface TeleprompterSlide {
  title: string;
  body: string;
  emoji: string;
  action?: { label: string; href: string };
}

const NG_SUPER_ADMIN_SLIDES: TeleprompterSlide[] = [
  { emoji: "🇳🇬", title: "Welcome to RouteAce Nigeria", body: "Built for African logistics realities - from Lagos to Kano, from bikes to 40-tonne trucks." },
  { emoji: "📍", title: "Set Your SLA Zones", body: "Lagos 1–2 days, South East 3 days, North 4–5 days. Configure your delivery promise by region.", action: { label: "Configure SLA", href: "/operations/sla-management" } },
  { emoji: "💰", title: "Configure Billing", body: "Choose per-drop billing (₦50/drop) or enterprise truck licensing - built for Nigerian scale.", action: { label: "Set Up Billing", href: "/invoices" } },
  { emoji: "🏦", title: "Connect Bank Accounts", body: "Link Nigerian bank accounts for direct driver and vendor payouts via your Finance settings.", action: { label: "Finance Settings", href: "/finance-erp" } },
  { emoji: "👥", title: "Invite Your Team", body: "Add dispatchers, ops managers, and finance managers. Assign roles and set approvals.", action: { label: "Manage Users", href: "/users" } },
];

const GLOBAL_SUPER_ADMIN_SLIDES: TeleprompterSlide[] = [
  { emoji: "🌍", title: "Welcome to RouteAce Global", body: "Freight Intelligence Infrastructure - built for scale across 196 countries." },
  { emoji: "🗺️", title: "Select Countries of Operation", body: "Configure your operational regions, each with localized tax, compliance, and payment routing.", action: { label: "Settings", href: "/settings" } },
  { emoji: "💱", title: "Enable Multi-Currency Billing", body: "USD, GBP, AED, EUR - auto-invoicing with regional VAT/GST compliance built in.", action: { label: "Configure Finance", href: "/finance-erp" } },
  { emoji: "🛃", title: "Activate Compliance Engine", body: "Cross-border compliance, ELD integration, and corridor risk intelligence activated per region.", action: { label: "Compliance", href: "/compliance/eu-dashboard" } },
  { emoji: "📊", title: "Set Corridor Preferences", body: "Choose your primary freight corridors - US Interstates, GCC, EU, Belt & Road, or custom.", action: { label: "Freight Intelligence", href: "/system/freight-intelligence" } },
  { emoji: "🔐", title: "Enable Treasury & Risk Engine", body: "Multi-currency hedging, FX buffer management, and insurance marketplace are now ready.", action: { label: "Risk Engine", href: "/system/risk-hedge-engine" } },
];

const NG_OPS_SLIDES: TeleprompterSlide[] = [
  { emoji: "🚚", title: "Create Your First Dispatch", body: "Assign drivers, select routes, and generate waybills in one unified workflow.", action: { label: "Go to Dispatch", href: "/dispatch" } },
  { emoji: "🗺️", title: "Assign Routes", body: "Use the route planner to optimize multi-drop sequences and fuel allocation.", action: { label: "Route Planner", href: "/routes" } },
  { emoji: "⏱️", title: "Monitor SLA Compliance", body: "Get real-time alerts before breaches happen. SLA risk scores update every 15 minutes.", action: { label: "SLA Dashboard", href: "/operations/sla-management" } },
  { emoji: "⛽", title: "Track Fuel Usage", body: "Log actual vs. agreed diesel liters per route. Variance flagged automatically.", action: { label: "Fleet Module", href: "/fleet" } },
];

const GLOBAL_OPS_SLIDES: TeleprompterSlide[] = [
  { emoji: "🛣️", title: "Corridor Optimization Active", body: "Select primary corridors (EU, US, GCC, BRI) for AI-optimized routing and margin calculation." },
  { emoji: "🛃", title: "Cross-Border Compliance", body: "Upload border documentation, manage customs delays, and receive clearance forecasts.", action: { label: "Compliance", href: "/compliance/eu-dashboard" } },
  { emoji: "🌐", title: "Multi-Country Fleet Visibility", body: "See all active vehicles across jurisdictions on a unified fleet command center.", action: { label: "Fleet Command", href: "/fleet-command" } },
];

const NG_FINANCE_SLIDES: TeleprompterSlide[] = [
  { emoji: "🧾", title: "Nigerian VAT Automation", body: "7.5% VAT auto-applied to all invoices. CIT projections updated quarterly.", action: { label: "Tax Filing", href: "/tax-filing-report" } },
  { emoji: "📈", title: "CIT Projections", body: "Company Income Tax modeled against your revenue targets. Export-ready for FIRS.", action: { label: "Finance ERP", href: "/finance-erp" } },
  { emoji: "📋", title: "Monthly P&L Export", body: "One-click P&L reports formatted for investors, auditors, and board reviews.", action: { label: "Analytics", href: "/admin-analytics" } },
];

const GLOBAL_FINANCE_SLIDES: TeleprompterSlide[] = [
  { emoji: "💱", title: "Multi-Currency Accounting", body: "Books maintained in base currency with live FX rates applied at transaction time.", action: { label: "Finance ERP", href: "/finance-erp" } },
  { emoji: "📊", title: "IFRS-Ready Reports", body: "Revenue recognition, lease accounting, and financial instruments per IFRS 15, 16 & 9.", action: { label: "Analytics", href: "/admin-analytics" } },
  { emoji: "🌍", title: "Cross-Border Tax Automation", body: "VAT, GST, WHT, and CIT auto-calculated by jurisdiction. Export filing packages included.", action: { label: "Global Tax", href: "/global-tax-compliance" } },
];

const NG_DRIVER_SLIDES: TeleprompterSlide[] = [
  { emoji: "📱", title: "Accept Your First Trip", body: "Trips assigned to you appear on your driver dashboard. Confirm pickup to activate." },
  { emoji: "✅", title: "Confirm Each Drop", body: "Mark each delivery confirmed at the drop point. This updates SLA timers in real-time." },
  { emoji: "⛽", title: "Log Your Fuel Usage", body: "Enter actual liters used after each trip to match against your route allocation." },
  { emoji: "💸", title: "Side Hustle Payouts", body: "Completed trips automatically calculate your side-hustle earnings for instant payout.", action: { label: "Super App", href: "/driver-super-app" } },
];

const GLOBAL_DRIVER_SLIDES: TeleprompterSlide[] = [
  { emoji: "📄", title: "Border Documentation", body: "Upload CMR, customs declarations, and border permits before cross-border dispatch." },
  { emoji: "📦", title: "Electronic Proof of Delivery", body: "Capture digital signatures and geo-tagged photos at each drop point." },
  { emoji: "🛣️", title: "Toll Capture", body: "Log toll charges at each crossing for automatic reimbursement calculation." },
  { emoji: "⛽", title: "Fuel Tracking", body: "Record fuel stops with station name, country, and liters for IFTA reporting." },
];

const DEPT_CUSTOMER_SLIDES: TeleprompterSlide[] = [
  { emoji: "📍", title: "Track your deliveries in real time", body: "Follow active distribution orders from creation through final delivery confirmation.", action: { label: "Open Tracker", href: "/dept/sales-tracker" } },
  { emoji: "⏱️", title: "Monitor On-Time Delivery rates", body: "Review OTD performance and compare actual delivery outcomes against SLA targets.", action: { label: "View SLA", href: "/dept/sales-tracker#sla" } },
  { emoji: "📦", title: "View order-to-delivery timelines", body: "Check each order’s created, dispatched, ETA, delivered, and exception status in one read-only view.", action: { label: "View Orders", href: "/dept/sales-tracker#orders" } },
];

function getSlidesForContext(role: string | null, isNGMode: boolean, tenantMode: string): TeleprompterSlide[] {
  if (tenantMode === "LOGISTICS_DEPARTMENT" && role === "customer") return DEPT_CUSTOMER_SLIDES;
  if (role === "super_admin" || role === "admin") {
    return isNGMode ? NG_SUPER_ADMIN_SLIDES : GLOBAL_SUPER_ADMIN_SLIDES;
  }
  if (role === "ops_manager" || role === "dispatcher") {
    return isNGMode ? NG_OPS_SLIDES : GLOBAL_OPS_SLIDES;
  }
  if (role === "finance_manager") {
    return isNGMode ? NG_FINANCE_SLIDES : GLOBAL_FINANCE_SLIDES;
  }
  if (role === "driver") {
    return isNGMode ? NG_DRIVER_SLIDES : GLOBAL_DRIVER_SLIDES;
  }
  return isNGMode ? NG_SUPER_ADMIN_SLIDES : GLOBAL_SUPER_ADMIN_SLIDES;
}

const MODULE_KEY = "welcome_tour_v1";
const STORAGE_KEY = `ra_teleprompter_${MODULE_KEY}`;

interface OnboardingTeleprompterProps {
  forceShow?: boolean;
  onClose?: () => void;
}

export function OnboardingTeleprompter({ forceShow, onClose }: OnboardingTeleprompterProps) {
  const { user, userRole, tenantMode } = useAuth();
  const { isNGMode, region } = useRegion();
  const [visible, setVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  const slides = getSlidesForContext(userRole, isNGMode, tenantMode);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    
    if (forceShow) {
      setCurrentSlide(0);
      setVisible(true);
      setLoading(false);
      return;
    }

    // Check localStorage first for performance
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      setLoading(false);
      return;
    }

    // Then check DB
    const checkCompletion = async () => {
      try {
        const { data } = await supabase
          .from("onboarding_progress" as any)
          .select("completed")
          .eq("user_id", user.id)
          .eq("module_key", MODULE_KEY)
          .maybeSingle();

        const record = data as { completed?: boolean } | null;
        if (!record || !record.completed) {
          setVisible(true);
        }
      } catch {
        setVisible(true);
      } finally {
        setLoading(false);
      }
    };

    checkCompletion();
  }, [user?.id, forceShow]);

  const persistProgress = useCallback(async (completed: boolean) => {
    if (!user) return;
    localStorage.setItem(STORAGE_KEY, "1");
    try {
      await supabase
        .from("onboarding_progress" as any)
        .upsert({
          user_id: user.id,
          module_key: MODULE_KEY,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          dismissed_at: !completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,module_key" });
    } catch {
      // Silently fail - localStorage is the primary guard
    }
  }, [user]);

  const handleDismiss = async () => {
    setVisible(false);
    await persistProgress(false);
    onClose?.();
  };

  const handleComplete = async () => {
    setVisible(false);
    await persistProgress(true);
    onClose?.();
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(s => s + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) setCurrentSlide(s => s - 1);
  };

  if (loading || !visible || slides.length === 0) return null;

  const slide = slides[currentSlide];
  const progress = ((currentSlide + 1) / slides.length) * 100;
  const isLast = currentSlide === slides.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 30 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-6 right-6 z-[101] w-[380px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {region.flag} {region.label} Mode · Getting Started
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <Progress value={progress} className="h-0.5 rounded-none" />

        {/* Slide content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
            className="p-6 space-y-3"
          >
            <div className="text-4xl">{slide.emoji}</div>
            <h3 className="text-lg font-bold leading-tight">{slide.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{slide.body}</p>
            {slide.action && (
              <a
                href={slide.action.href}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                {slide.action.label} <ChevronRight className="w-3.5 h-3.5" />
              </a>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
          <div className="flex items-center gap-1">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentSlide ? "bg-primary w-4" : "bg-muted-foreground/30 w-1.5"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {currentSlide > 0 && (
              <Button variant="ghost" size="sm" onClick={handlePrev} className="h-8 px-3 text-xs">
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="h-8 px-4 text-xs">
              {isLast ? <><Check className="w-3.5 h-3.5 mr-1" /> Done</> : <>Next <ChevronRight className="w-3.5 h-3.5 ml-1" /></>}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
