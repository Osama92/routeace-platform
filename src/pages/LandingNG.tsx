import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Truck, LogIn, ArrowRight, Mail, Lock, Eye, EyeOff, Loader2,
  Wifi, WifiOff, MapPin, Fuel, Users, Shield, Zap, BarChart3,
  Globe, CheckCircle, Bike, Layers, Crown, Brain, Target,
  TrendingUp, Calculator, Star, Building2, Quote,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SignupCards from "@/components/landing/SignupCards";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.1 * i, duration: 0.5 },
  }),
};

const LandingNG = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
          <button onClick={() => navigate("/")} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="font-heading font-bold text-xl">RouteAce</h1>
              <p className="text-xs text-muted-foreground">🇳🇬 Nigeria</p>
            </div>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/global")} className="gap-1.5 text-xs">
              <Globe className="w-3.5 h-3.5" /> Global
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowLogin(!showLogin)} className="gap-2">
              <LogIn className="w-4 h-4" /> Sign In
            </Button>
            <Button size="sm" onClick={() => navigate("/signup/company")}>Get Started</Button>
          </div>
        </div>
      </header>

      {/* Login Panel */}
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(173,80%,45%,0.08),transparent_60%)]" />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
              🇳🇬 Used by logistics operators across Nigeria
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold font-heading mb-6 leading-tight">
              Powering Africa's Logistics
              <span className="gradient-text block">Operators With Intelligent</span>
              Route Optimization
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
              From bikes to heavy trucks - automate routing, payroll, SLA tracking and white-label
              reselling in one platform built for African terrain.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-base h-14 px-8" onClick={() => navigate("/signup/company")}>
                <Crown className="w-5 h-5 mr-2" /> Start as Super Admin
              </Button>
              <Button size="lg" variant="outline" className="text-base h-14 px-8" onClick={() => {
                document.getElementById("ng-pricing")?.scrollIntoView({ behavior: "smooth" });
              }}>
                <Calculator className="w-5 h-5 mr-2" /> Explore MultiDrop Pricing
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 2 – Built for African Realities */}
      <section className="py-20 px-6 bg-secondary/20">
        <div className="max-w-7xl mx-auto">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-3xl font-bold font-heading text-center mb-4">
            Built for African Realities
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Optimized for Lagos traffic. Built for national scale.
          </motion.p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: WifiOff, title: "Low Bandwidth Mode", desc: "Works on 2G/3G connections. Compressed data sync." },
              { icon: Truck, title: "Offline Driver App", desc: "Drivers record trips offline, auto-syncs when connectivity returns." },
              { icon: MapPin, title: "SLA by Geopolitical Zones", desc: "Lagos 1–2 days, South East 3 days, North 4–5 days." },
              { icon: Users, title: "Hybrid Payroll Automation", desc: "PAYE, pension, NHF - all Nigerian tax rules built in." },
              { icon: Zap, title: "Per-Drop Billing", desc: "₦50 per drop for bikes/vans. No fixed subscription required." },
              { icon: Shield, title: "White-Label Resale", desc: "Turn RouteAce into your own logistics SaaS brand." },
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
          <div className="mt-8 text-center">
            <Badge variant="outline" className="text-xs">
              Lagos congestion modeling integrated
            </Badge>
          </div>
        </div>
      </section>

      {/* SECTION 3 – Pricing */}
      <section id="ng-pricing" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold font-heading text-center mb-4">Simple, Usage-Based Pricing</h2>
          <p className="text-center text-muted-foreground mb-12">Choose the model that fits your fleet type</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Bikes / Vans / Buses", price: "₦50/drop", sub: "Pay per delivery", icon: Bike, features: ["Pay only when you deliver", "Dispatch & tracking", "Driver management", "Basic analytics", "Email support"], highlighted: false },
              { name: "Heavy Truck / Haulage", price: "₦5,000/vehicle/mo", sub: "Per-vehicle subscription • VAT exclusive", icon: Truck, features: ["₦5,000 per vehicle, per month", "Unlimited dispatches", "Full fleet management", "SLA engine & breach costing", "Route intelligence"], highlighted: true },
              { name: "Mixed Fleet", price: "₦5,000/vehicle + ₦50/drop", sub: "Subscription + usage", icon: Layers, features: ["₦5,000 per vehicle, per month", "₦50 per delivery drop", "All vehicle types", "Full platform access", "Priority support"], highlighted: false },
            ].map((p, i) => (
              <motion.div key={p.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 * i }}>
                <Card className={`h-full ${p.highlighted ? "border-2 border-primary shadow-lg relative" : ""}`}>
                  {p.highlighted && <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">Most Popular</div>}
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <p.icon className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{p.name}</CardTitle>
                    </div>
                    <div className="text-3xl font-bold">{p.price}</div>
                    <p className="text-xs text-muted-foreground">{p.sub}</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {p.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-[hsl(142,76%,36%)] shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full mt-6" variant={p.highlighted ? "default" : "outline"} onClick={() => navigate("/signup/company")}>Get Started</Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          {/* Cost calculator CTA */}
          <div className="mt-8 text-center p-6 rounded-xl border border-border bg-muted/30">
            <p className="text-muted-foreground text-sm">
              <Calculator className="w-4 h-4 inline mr-1" />
              <strong className="text-foreground">Estimate your monthly cost:</strong>{" "}
              Enter your average drops and fleet size in-app to see a personalized quote.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4 – White Label */}
      <section className="py-20 px-6 bg-secondary/20">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-[hsl(var(--signup-owner),0.15)] text-[hsl(var(--signup-owner))] border-[hsl(var(--signup-owner),0.3)]">Enterprise</Badge>
              <h2 className="text-3xl font-bold font-heading mb-4">
                Turn RouteAce Into Your Own Logistics SaaS
              </h2>
              <p className="text-muted-foreground mb-8">
                White-label the platform, resell licenses, add markup, and earn recurring margin.
                No data cross-visibility between tenants.
              </p>
              <ul className="space-y-3">
                {[
                  "Resell up to 10 white-label licenses",
                  "₦5,000/month + ₦25/drop resale pricing",
                  "You earn 80% - RouteAce retains 20%",
                  "Full data isolation between tenants",
                  "6-month lock-in before direct migration",
                ].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <CheckCircle className="w-4 h-4 text-[hsl(142,76%,36%)] shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="mt-8" onClick={() => navigate("/signup/company")}>
                Start Reselling <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <div className="glass-card p-8 text-center">
              <Building2 className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Your Brand. Our Engine.</h3>
              <p className="text-muted-foreground text-sm">
                Your clients see your brand, your domain, your pricing.
                RouteAce powers everything behind the scenes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 – AI Route Intelligence */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold font-heading mb-4">AI Route Intelligence</h2>
          <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">
            Every dispatch is optimized with AI confidence scoring, margin awareness, and SLA risk prediction.
          </p>

          {/* Live display mockup */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-8 max-w-lg mx-auto mb-12">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Route Confidence</span>
                <span className="text-2xl font-bold text-[hsl(142,76%,36%)]">92%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-[hsl(142,76%,36%)] h-2 rounded-full" style={{ width: "92%" }} />
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground">Est. Delivery</p>
                  <p className="font-bold">2.3 Days</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">SLA Risk</p>
                  <p className="font-bold text-[hsl(142,76%,36%)]">Low</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Profit Score</p>
                  <p className="font-bold text-primary">87%</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: "AI Confidence Score", desc: "0–100 scoring for every route." },
              { icon: TrendingUp, title: "Margin-Aware Routing", desc: "Prioritize profitable routes." },
              { icon: Target, title: "SLA Risk Prediction", desc: "Know breach probability upfront." },
              { icon: Fuel, title: "Fuel Optimization", desc: "Suggest optimal fuel budgets." },
              { icon: BarChart3, title: "What-If Simulation", desc: "Test route variations before dispatch." },
              { icon: Zap, title: "Self-Learning Engine", desc: "Improves with every delivery." },
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

      {/* SECTION 6 – Testimonials */}
      <section className="py-20 px-6 bg-secondary/20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold font-heading text-center mb-12">
            Built for Nigerian Logistics Operators
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { quote: "RouteAce cut our delivery planning time by 60%. The per-drop billing is perfect for our bike fleet.", name: "Chinedu O.", role: "E-commerce Fleet Owner", city: "Lagos" },
              { quote: "We now track SLA breaches in real time and auto-penalize on invoices. Game changer for haulage.", name: "Amaka N.", role: "Haulage Operator", city: "Abuja" },
              { quote: "The white-label feature lets us resell to 8 smaller operators. Recurring revenue from day one.", name: "Ibrahim M.", role: "Regional Distributor", city: "Port Harcourt" },
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
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold font-heading mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-12 max-w-xl mx-auto">
            Choose your path and start managing your logistics operations in minutes.
          </p>
          <SignupCards />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold">RouteAce</span>
            <span className="text-xs text-muted-foreground">🇳🇬 Nigeria HQ · NGN Pricing</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 RouteAce. All rights reserved.</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Support</a>
            <button onClick={() => navigate("/global")} className="hover:text-foreground">🌍 Global Site</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingNG;
