import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Truck, LogIn, ArrowRight, Mail, Lock, Eye, EyeOff, Loader2,
  CheckCircle, Crown, Building2, Clock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import heroTrucks from "@/assets/landing/img-8-hero-trucks.png";
import brandMark from "@/assets/routeace-mark.png";
import ThemeToggle from "@/components/theme/ThemeToggle";
import lcCardImg from "@/assets/landing/img-lc-card.png";
import ldCardImg from "@/assets/landing/img-ld-card.png";

const HERO_IMAGE = heroTrucks;
const LC_CARD_IMAGE = lcCardImg;
const LD_CARD_IMAGE = ldCardImg;

const LandingHero = () => {
  const navigate = useNavigate();
  const { signIn, userRole } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const getRoleDestination = (role: string | null): string => {
    switch (role) {
      case "super_admin": return "/super-admin";
      case "org_admin": return "/org-admin";
      case "ops_manager": return "/ops-manager";
      case "finance_manager": return "/finance-manager";
      case "driver": return "/driver-dashboard";
      case "customer": return "/customer-portal";
      case "core_founder": case "core_builder": case "core_product":
      case "core_engineer": case "internal_team": return "/core/dashboard";
      default: return "/dashboard";
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) { toast.error("Enter email and password"); return; }
    setIsLoggingIn(true);
    try {
      const { error } = await signIn(loginEmail, loginPassword);
      if (error) throw error;
      toast.success("Welcome back!");
      navigate(getRoleDestination(userRole));
    } catch (err: any) { toast.error(err.message || "Login failed"); }
    finally { setIsLoggingIn(false); }
  };

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      {/* NAV */}
      <header className="border-b border-border/30 bg-background/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity min-w-0 shrink"
          >
            <img src={brandMark} alt="RouteAce" className="w-9 h-9 sm:w-10 sm:h-10 object-contain shrink-0" />
            <div className="text-left min-w-0">
              <span className="font-heading font-bold text-lg sm:text-xl tracking-tight block leading-none">RouteAce</span>
              <p className="hidden sm:block text-[10px] text-muted-foreground leading-tight tracking-wide uppercase truncate">
                Fleet &amp; Distribution Intelligence
              </p>
            </div>
          </button>

          <nav className="hidden lg:flex items-center gap-1 min-w-0">
            {[
              { label: "For Logistics Companies", target: "lc-section" },
              { label: "For Enterprise Teams", target: "ld-section" },
              { label: "Platform", target: "logistics-os" },
              { label: "Pricing", target: "pricing" },
            ].map(n => (
              <Button key={n.label} variant="ghost" size="sm" onClick={() => scrollTo(n.target)} className="text-xs whitespace-nowrap">{n.label}</Button>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => setShowLogin(!showLogin)} className="gap-2 px-2 sm:px-3">
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </Button>
            <Button
              size="sm"
              className="bg-infra-orange hover:bg-infra-orange/90 text-primary-foreground font-semibold whitespace-nowrap px-3 sm:px-4"
              onClick={() => setShowModeSelect(true)}
            >
              <span className="sm:hidden">Get Started</span>
              <span className="hidden sm:inline">Get Started Free</span>
            </Button>
          </div>
        </div>
      </header>

      {/* MODE PICKER MODAL */}
      <Dialog open={showModeSelect} onOpenChange={setShowModeSelect}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
          <div className="px-6 pt-6 pb-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">How do you use logistics?</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Choose your setup — this determines your workspace, features, and free trial length.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 px-6 pb-6">
            {/* LOGISTICS COMPANY */}
            <button
              onClick={() => { setShowModeSelect(false); navigate("/signup/company?mode=LOGISTICS_COMPANY"); }}
              className="group text-left rounded-2xl border-2 border-primary/20 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 transition-all p-5 relative overflow-hidden"
            >
              <div className="absolute top-3 right-3">
                <span className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                  <Clock className="w-3 h-3" /> 30-day free trial
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <Badge variant="outline" className="text-[10px] mb-2">Logistics Company · LC</Badge>
              <h3 className="text-base font-bold font-heading mb-1">I Own or Run a Fleet</h3>
              <p className="text-xs text-muted-foreground mb-4">
                3PLs, haulage companies, last-mile operators. Full fleet control with real-time visibility.
              </p>
              <ul className="space-y-1.5 mb-4">
                {[
                  "Fleet tracking & dispatch management",
                  "Driver monitoring & fraud detection",
                  "Route optimisation & waybills",
                  "Invoicing & customer SLA tracking",
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
                <Crown className="w-3.5 h-3.5" /> Full access, no limits during trial
                <ArrowRight className="w-3.5 h-3.5 ml-auto group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* LOGISTICS DEPARTMENT */}
            <button
              onClick={() => { setShowModeSelect(false); navigate("/signup/company?mode=LOGISTICS_DEPARTMENT"); }}
              className="group text-left rounded-2xl border-2 border-teal-500/20 hover:border-teal-500/60 bg-teal-500/5 hover:bg-teal-500/10 transition-all p-5 relative overflow-hidden"
            >
              <div className="absolute top-3 right-3">
                <span className="flex items-center gap-1 text-[10px] font-semibold text-teal-600 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-full px-2 py-0.5">
                  <Clock className="w-3 h-3" /> 60-day free trial
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Building2 className="w-6 h-6 text-teal-500" />
              </div>
              <Badge variant="outline" className="text-[10px] mb-2">Enterprise Logistics Dept · LD</Badge>
              <h3 className="text-base font-bold font-heading mb-1">I Manage Company Logistics</h3>
              <p className="text-xs text-muted-foreground mb-4">
                FMCG, Manufacturing, Oil & Gas, Retail. Manage your internal logistics team and 3PL vendors.
              </p>
              <ul className="space-y-1.5 mb-4">
                {[
                  "OTIF, DQI & SLA tracking vs DPO standards",
                  "3PL vendor management & cost visibility",
                  "Multi-branch distribution control",
                  "Full finance suite & compliance hub",
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-teal-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 text-xs font-semibold">
                <Crown className="w-3.5 h-3.5" /> Full access, no limits during trial
                <ArrowRight className="w-3.5 h-3.5 ml-auto group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>

          <div className="border-t border-border/50 px-6 py-3 bg-muted/30 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">No credit card required. Cancel anytime.</p>
            <button onClick={() => setShowModeSelect(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Not now
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* LOGIN PANEL */}
      <AnimatePresence>
        {showLogin && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-border/50 bg-muted/30 overflow-hidden">
            <form onSubmit={handleLogin} className="max-w-md mx-auto px-6 py-6 space-y-4">
              <h3 className="text-lg font-semibold text-center">Welcome Back</h3>
              <div className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" placeholder="you@company.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="pl-10" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Sign In
              </Button>
              <div className="flex justify-between text-xs text-muted-foreground">
                <button type="button" onClick={() => navigate("/auth")} className="hover:text-foreground">Forgot password?</button>
                <button type="button" onClick={() => navigate("/core/login")} className="hover:text-foreground">Core Team Login →</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="RouteAce logistics fleet on Nigerian highway" width={1920} height={1080} fetchPriority="high" decoding="async" className="absolute inset-0 w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-[var(--gradient-hero)]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-12 sm:pb-16 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 backdrop-blur-sm">
              🇳🇬 Built for Nigeria · Scaling Across Africa
            </Badge>

            <h1 className="text-fluid-4xl lg:text-7xl font-bold font-heading mb-6 leading-[1.05] tracking-tight">
              <span className="text-foreground">Your Logistics Assets Are Moving.</span>
              <span className="gradient-text block mt-1">Your Money Is Leaking.</span>
              <span className="text-foreground block mt-1">RouteAce Stops That.</span>
            </h1>

            <p className="text-fluid-base md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-4">
              Nigerian logistics operators lose 12–18% of revenue to fraud, route inefficiency, and missed SLAs every year.
              RouteAce gives you the intelligence to stop it. No hardware. No disruption to your operations.
            </p>
            <p className="text-fluid-sm text-muted-foreground mb-10 tracking-wide">
              Deploy in hours. See savings in days. <span className="text-primary font-medium">No hardware. No consultants. No spreadsheets.</span>
            </p>
          </motion.div>

          {/* Market reality stats - sourced, not fabricated */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-14"
          >
            {[
              { label: "Nigerian logistics market", value: "$10.95B", sub: "2025 · Statista", color: "text-primary" },
              { label: "Avg fleet fraud rate", value: "12–18%", sub: "of revenue · NARTO", color: "text-destructive" },
              { label: "Asset utilisation gap", value: "55% → 75%", sub: "RouteAce benchmark", color: "text-success" },
            ].map(m => (
              <div key={m.label} className="glass-card p-4 text-center">
                <p className={`text-2xl font-bold font-heading ${m.color}`}>{m.value}</p>
                <p className="text-xs text-foreground mt-1">{m.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{m.sub}</p>
              </div>
            ))}
          </motion.div>

          {/* TWO PILLAR CTAs - LC and LD only */}
          <div id="pillars" className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.6 }}>
              <button
                onClick={() => navigate("/signup/company?mode=LOGISTICS_COMPANY")}
                className="w-full text-left glass-card p-8 border-2 border-primary/20 hover:border-primary/50 transition-all group relative overflow-hidden rounded-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative h-32 -mx-8 -mt-8 mb-5 overflow-hidden rounded-t-2xl">
                  <img src={LC_CARD_IMAGE} alt="Fleet owner" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                </div>
                <div className="relative z-10">
                  <Badge variant="outline" className="mb-3 text-[10px]">Logistics Company (LC)</Badge>
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Truck className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold font-heading mb-1">I Own or Run a Fleet</h3>
                  <p className="text-sm text-muted-foreground mb-5">
                    3PLs, haulage companies, last-mile operators. Stop leaking money on routes, fuel, and drivers you can't see.
                  </p>
                  <ul className="space-y-2 mb-6">
                    {[
                      "Fleet tracking, dispatch & SLA management",
                      "Driver fraud detection. ₦50/drop billing option.",
                      "Work orders, daily checklists and compliance hub",
                      "Zaza AI: your operations intelligence co-pilot",
                    ].map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                    <Crown className="w-4 h-4" /> Start Free. ₦5,000/vehicle/month after 30-day trial.
                    <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.6 }}>
              <button
                onClick={() => navigate("/signup/company?mode=LOGISTICS_DEPARTMENT")}
                className="w-full text-left glass-card p-8 border-2 border-teal-500/20 hover:border-teal-500/50 transition-all group relative overflow-hidden rounded-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative h-32 -mx-8 -mt-8 mb-5 overflow-hidden rounded-t-2xl">
                  <img src={LD_CARD_IMAGE} alt="Logistics manager" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                </div>
                <div className="relative z-10">
                  <Badge variant="outline" className="mb-3 text-[10px]">Enterprise Logistics Department (LD)</Badge>
                  <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Building2 className="w-7 h-7 text-teal-500" />
                  </div>
                  <h3 className="text-xl font-bold font-heading mb-1">I Manage a Company's Logistics</h3>
                  <p className="text-sm text-muted-foreground mb-5">
                    FMCG, Manufacturing, Oil & Gas, Retail. Run your internal logistics department and 3PL vendors from one platform.
                  </p>
                  <ul className="space-y-2 mb-6">
                    {[
                      "OTIF, DQI, SLA tracking vs DPO book standards",
                      "3PL transporter portal: POD, live location, billing",
                      "ERP/WMS integration with SAP, Odoo, Oracle and 25+ others",
                      "Inventory DOI, risk register and S&OP meeting tracker",
                    ].map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="w-3.5 h-3.5 text-teal-500 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 text-teal-500 font-semibold text-sm">
                    <Building2 className="w-4 h-4" /> From ₦150,000/month. 60-day free trial included.
                    <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default LandingHero;
