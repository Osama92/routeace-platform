import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Truck, LogIn, ArrowRight, Mail, Lock, Eye, EyeOff, Loader2,
  Globe, CheckCircle, Shield, Zap, BarChart3, Brain, Target,
  TrendingUp, Fuel, Users, Building2, Crown, DollarSign,
  MapPin, Quote, Cpu, CreditCard, Scale, FileText, Code,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  COUNTRY_DEFAULTS, COUNTRY_FLAGS, buildPricingTiers, formatPrice,
  type CountryConfig,
} from "@/lib/global/countryConfig";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.1 * i, duration: 0.5 },
  }),
};

const GLOBAL_REGIONS = [
  { code: "GB", label: "UK", flag: "🇬🇧" },
  { code: "US", label: "US", flag: "🇺🇸" },
  { code: "AE", label: "UAE", flag: "🇦🇪" },
  { code: "CA", label: "Canada", flag: "🇨🇦" },
];

const LandingGlobal = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("GB");

  const config = COUNTRY_DEFAULTS[selectedRegion] as Partial<CountryConfig>;
  const tiers = buildPricingTiers(config);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) { toast.error("Enter email and password"); return; }
    setIsLoggingIn(true);
    try {
      const { error } = await signIn(loginEmail, loginPassword);
      if (error) throw error;
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err: any) { toast.error(err.message || "Login failed"); }
    finally { setIsLoggingIn(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl">RouteAce</h1>
              <p className="text-xs text-muted-foreground">🌍 Global Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/ng")} className="gap-1.5 text-xs">
              🇳🇬 Nigeria
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowLogin(!showLogin)} className="gap-2">
              <LogIn className="w-4 h-4" /> Sign In
            </Button>
            <Button size="sm" onClick={() => navigate("/signup/company")}>Start Free Trial</Button>
          </div>
        </div>
      </header>

      {/* Login */}
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
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Sign In
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(199,89%,48%,0.08),transparent_60%)]" />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
              {["🇬🇧", "🇺🇸", "🇦🇪", "🇨🇦", "🇳🇬"].map(flag => (
                <span key={flag} className="text-2xl">{flag}</span>
              ))}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold font-heading mb-6 leading-tight">
              Route Intelligence for
              <span className="gradient-text block">Modern Fleet Operators</span>
              Worldwide
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
              AI-powered routing, margin-aware optimization, SLA automation and embedded payroll -
              built for scale across emerging and developed markets.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-base h-14 px-8" onClick={() => navigate("/signup/company")}>
                Start Global Free Trial <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="text-base h-14 px-8">
                Book Enterprise Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 2 – Global Infrastructure */}
      <section className="py-20 px-6 bg-secondary/20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold font-heading text-center mb-4">Global Infrastructure</h2>
          <p className="text-center text-muted-foreground mb-12">Powered by Google Maps Platform</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: DollarSign, title: "Multi-Currency Billing", desc: "USD, GBP, AED, CAD - automatic invoicing in local currency." },
              { icon: FileText, title: "VAT-Compliant Invoicing", desc: "Auto-calculated tax for every region with compliance badges." },
              { icon: Scale, title: "International Tax Engine", desc: "UK VAT, US state tax, UAE zero-rate, Canadian GST." },
              { icon: MapPin, title: "Real-Time Traffic", desc: "Google Maps API with live traffic, ETA recalculation." },
              { icon: Globe, title: "Cross-Border Routing", desc: "Toll modeling, border crossings, terrain weighting." },
              { icon: CreditCard, title: "Stripe + Local Payments", desc: "Stripe, SEPA, and region-specific payment gateways." },
            ].map((f, i) => (
              <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card className="h-full hover:border-primary/30 transition-colors">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <f.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 – Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold font-heading text-center mb-4">Global, Usage-Based Pricing</h2>
          <p className="text-center text-muted-foreground mb-6">Choose your region and billing model</p>

          {/* Region selector */}
          <div className="flex justify-center gap-2 mb-6 flex-wrap">
            {GLOBAL_REGIONS.map(r => (
              <Button key={r.code} variant={selectedRegion === r.code ? "default" : "outline"} size="sm" onClick={() => setSelectedRegion(r.code)} className="gap-1.5">
                <span>{r.flag}</span> {r.label}
              </Button>
            ))}
          </div>

          {/* Per-Drop Pricing Highlight */}
          <div className="mb-10 p-6 rounded-xl border-2 border-primary/30 bg-primary/5 text-center">
            <h3 className="text-xl font-bold mb-2">💰 Per-Drop Pricing - Pay Only For Deliveries</h3>
            <p className="text-muted-foreground text-sm mb-4">No vehicle minimums. Start free with 100 drops/month.</p>
            <div className="flex flex-wrap justify-center gap-6">
              {[
                { tier: "Free", price: "100 drops/mo", sub: "No card required" },
                { tier: "Growth", price: "$0.04/drop", sub: "AI routing included" },
                { tier: "Scale", price: "$0.035/drop", sub: "Full analytics + API" },
                { tier: "Enterprise", price: "Custom", sub: "Dedicated SLA" },
              ].map(t => (
                <div key={t.tier} className="text-center">
                  <p className="text-xs text-muted-foreground">{t.tier}</p>
                  <p className="text-lg font-bold text-primary">{t.price}</p>
                  <p className="text-xs text-muted-foreground">{t.sub}</p>
                </div>
              ))}
            </div>
            <Button className="mt-4" size="sm" onClick={() => navigate("/pricing")}>
              View Full Pricing <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Per-Vehicle Tier Cards */}
          <p className="text-center text-sm text-muted-foreground mb-4">Or choose per-vehicle plans:</p>
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier, i) => (
              <motion.div key={`${selectedRegion}-${tier.name}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                <Card className={`h-full ${tier.highlighted ? "border-2 border-primary shadow-lg" : ""}`}>
                  {tier.highlighted && <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">Most Popular</div>}
                  <CardHeader>
                    <CardTitle className="text-lg">{tier.name}</CardTitle>
                    <div className="text-3xl font-bold">
                      {formatPrice(tier.price, config)}
                      <span className="text-sm font-normal text-muted-foreground">/vehicle/mo</span>
                    </div>
                    {tier.perDrop > 0 && <p className="text-xs text-muted-foreground">+ {formatPrice(tier.perDrop, config)}/drop</p>}
                    {config.annualFreeMonths && config.annualFreeMonths > 0 && (
                      <Badge variant="secondary" className="text-xs w-fit">
                        Save {config.annualFreeMonths} months free annually
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {tier.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-[hsl(142,76%,36%)] shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full mt-6" variant={tier.highlighted ? "default" : "outline"} onClick={() => navigate("/signup/company")}>
                      Get Started
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* API Access Banner */}
          <div className="mt-8 p-6 rounded-xl border border-border bg-muted/30">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-semibold flex items-center gap-2">
                  <Code className="w-4 h-4 text-primary" /> Developer API Access
                </p>
                <p className="text-sm text-muted-foreground">
                  Build logistics into your product. REST APIs with per-call billing from $0.01/call.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/developer-platform")} className="gap-1.5 shrink-0">
                <Code className="w-4 h-4" /> View API Docs
              </Button>
            </div>
          </div>

          {/* AI Add-on */}
          {config.aiAddonPrice && config.aiAddonPrice > 0 && (
            <div className="mt-4 text-center p-6 rounded-xl border border-border bg-muted/30">
              <p className="text-sm text-muted-foreground">
                <Brain className="w-4 h-4 inline mr-1" />
                <strong className="text-foreground">AI Route Intelligence Add-on:</strong>{" "}
                {formatPrice(config.aiAddonPrice, config)}/fleet/month
              </p>
            </div>
          )}

          {/* Enterprise */}
          <div className="mt-4 text-center p-6 rounded-xl border border-border bg-muted/30">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Enterprise (200+ vehicles):</strong>{" "}
              Custom pricing with setup fees, dedicated SLA, integration support, and data export premium.{" "}
              <button className="text-primary hover:underline font-medium">Contact sales →</button>
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4 – Enterprise Features */}
      <section className="py-20 px-6 bg-secondary/20">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold font-heading mb-12">Enterprise-Grade Features</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: "AI Route Confidence", desc: "0–100 scoring with margin-first optimization." },
              { icon: Target, title: "Predictive SLA Risk", desc: "Know breach probability before dispatch." },
              { icon: TrendingUp, title: "Margin-First Routing", desc: "Prioritize profitability on every route." },
              { icon: Cpu, title: "Observability Dashboard", desc: "Full system health monitoring." },
              { icon: Shield, title: "Insurance Logic", desc: "SLA-linked coverage automation." },
              { icon: Building2, title: "Reseller Marketplace", desc: "Multi-tenant white-label resale." },
            ].map((f, i) => (
              <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card className="h-full text-center hover:border-primary/30 transition-colors">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                      <f.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 – Competitive Positioning */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold font-heading mb-4">
                Not a Dispatch Tool.<br />
                <span className="gradient-text">A Logistics Intelligence Infrastructure.</span>
              </h2>
              <p className="text-muted-foreground mb-6">
                Competes with Onfleet, Routific, and Bringg - but optimized for multi-tenant
                operations, informal workforce payroll, and emerging market complexity.
              </p>
              <ul className="space-y-3">
                {[
                  "Multi-tenant white-label resale",
                  "Informal workforce hybrid payroll",
                  "Emerging market complexity handling",
                  "Hybrid subscription + per-drop billing",
                  "AI confidence routing with self-learning",
                ].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <CheckCircle className="w-4 h-4 text-[hsl(142,76%,36%)] shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              {[
                { label: "AI Confidence Routing", pct: 95 },
                { label: "Profit-First Optimization", pct: 92 },
                { label: "Reseller Monetization", pct: 88 },
                { label: "Embedded Payroll", pct: 90 },
                { label: "Fuel Analytics", pct: 85 },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{m.label}</span>
                    <span className="font-bold text-primary">{m.pct}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${m.pct}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.2 }} className="bg-primary h-2 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 – Why RouteAce Wins */}
      <section className="py-20 px-6 bg-secondary/20">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold font-heading mb-12">Why RouteAce Wins</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { icon: Brain, label: "AI Confidence" },
              { icon: TrendingUp, label: "Profit-First" },
              { icon: Building2, label: "Reseller Layer" },
              { icon: Users, label: "Embedded Payroll" },
              { icon: Fuel, label: "Fuel Analytics" },
            ].map((w, i) => (
              <motion.div key={w.label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="glass-card p-6 text-center">
                <w.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <p className="text-sm font-semibold">{w.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7 – Trust Layer / Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold font-heading text-center mb-12">Trusted Worldwide</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { quote: "RouteAce's AI routing reduced our failed deliveries by 35%. The multi-currency billing just works.", name: "James H.", role: "Urban Delivery Operator", city: "London 🇬🇧" },
              { quote: "We switched from Onfleet. The margin-aware routing and payroll automation are unmatched at this price.", name: "Sarah K.", role: "Mid-Mile Fleet Manager", city: "Texas 🇺🇸" },
              { quote: "Premium fleet management with same-day SLA tracking. Perfect for our enterprise logistics operation.", name: "Ahmed R.", role: "Enterprise Logistics Director", city: "Dubai 🇦🇪" },
            ].map((t, i) => (
              <motion.div key={t.name} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <Quote className="w-8 h-8 text-primary/30 mb-3" />
                    <p className="text-sm text-foreground/80 mb-4 italic">"{t.quote}"</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role} · {t.city}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-6 bg-secondary/20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold font-heading mb-4">
            Ready to Scale Your Fleet Operations?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join fleet operators across 5 countries using RouteAce to optimize routes,
            automate payroll, and grow revenue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-base h-14 px-8" onClick={() => navigate("/signup/company")}>
              Start Global Free Trial <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="text-base h-14 px-8">
              Book Enterprise Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold">RouteAce</span>
            <span className="text-xs text-muted-foreground">🌍 Global Platform</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 RouteAce. All rights reserved.</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">API Docs</a>
            <a href="#" className="hover:text-foreground">Partner Program</a>
            <button onClick={() => navigate("/ng")} className="hover:text-foreground">🇳🇬 Nigeria Site</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingGlobal;
