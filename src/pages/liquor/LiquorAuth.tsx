import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import {
  Mail, Lock, User, Eye, EyeOff, ArrowRight, ChevronLeft, Wine,
  Shield, BarChart3, Users, ClipboardList, MapPin, Package, Truck,
  CreditCard, Store, Globe, Brain, Target, Building2, Wallet, Eye as EyeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  useLiquorRole,
  LIQUOR_ROLE_LABELS,
  LIQUOR_ROLE_DESCRIPTIONS,
  LIQUOR_ROLE_CATEGORIES,
  type LiquorRole,
  type LiquorRoleCategory,
} from "@/hooks/useLiquorRole";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name required").max(100),
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const ROLE_ICONS: Record<LiquorRole, React.ComponentType<{ className?: string }>> = {
  distributor_owner: Building2,
  distributor_sales_manager: Target,
  distributor_sales_rep: MapPin,
  distributor_warehouse_manager: Package,
  distributor_finance_manager: CreditCard,
  distributor_logistics_manager: Truck,
  supplier_brand_owner: Wine,
  supplier_sales_director: BarChart3,
  supplier_trade_marketing: Store,
  supplier_market_analyst: Brain,
  supplier_distribution_manager: Globe,
  retailer_bar_owner: Wine,
  retailer_restaurant_owner: Store,
  retailer_procurement_manager: ClipboardList,
  retailer_store_manager: Package,
  logistics_fleet_manager: Truck,
  logistics_delivery_driver: MapPin,
  logistics_route_planner: Globe,
  platform_admin: Shield,
  data_intelligence_customer: Brain,
  investor_viewer: Wallet,
};

const CATEGORY_ICONS: Record<LiquorRoleCategory, React.ComponentType<{ className?: string }>> = {
  distributor: Building2,
  supplier: Wine,
  retailer: Store,
  logistics: Truck,
  platform: Shield,
};

const LiquorAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [selectedRole, setSelectedRole] = useState<LiquorRole | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<LiquorRoleCategory | null>(null);
  const [step, setStep] = useState<"auth" | "category-select" | "role-select">("auth");

  const { signIn, signUp, user, userRole, isApproved, loading } = useAuth();
  const { liquorRole, loading: liquorLoading, setRole } = useLiquorRole();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || liquorLoading || !user) return;
    if (userRole === null) return;
    if (!isApproved && userRole !== "super_admin") return;

    if (liquorRole) {
      navigate("/industry/liquor", { replace: true });
    } else if (step === "auth") {
      setStep("category-select");
    }
  }, [user, userRole, isApproved, loading, liquorLoading, liquorRole, navigate, step]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      if (isLogin) {
        const result = loginSchema.safeParse(formData);
        if (!result.success) {
          const fe: Record<string, string> = {};
          result.error.errors.forEach((err) => { if (err.path[0]) fe[err.path[0] as string] = err.message; });
          setErrors(fe);
          return;
        }
        const { error } = await signIn(formData.email, formData.password);
        if (error) toast({ title: "Login Failed", description: error.message, variant: "destructive" });
        else toast({ title: "Welcome back!", description: "Entering Liquor Commerce OS" });
      } else {
        const result = signupSchema.safeParse(formData);
        if (!result.success) {
          const fe: Record<string, string> = {};
          result.error.errors.forEach((err) => { if (err.path[0]) fe[err.path[0] as string] = err.message; });
          setErrors(fe);
          return;
        }
        const { error } = await signUp(formData.email, formData.password, formData.fullName);
        if (error) toast({ title: "Sign Up Failed", description: error.message, variant: "destructive" });
        else toast({ title: "Account Created!", description: "Please verify your email, then select your role." });
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleSelect = async () => {
    if (!selectedRole) return;
    setSubmitting(true);
    const result = await setRole(selectedRole);
    if (result?.error) {
      toast({ title: "Error", description: "Failed to set role. Please try again.", variant: "destructive" });
    } else {
      toast({ title: "Role Assigned", description: `You're now a ${LIQUOR_ROLE_LABELS[selectedRole]}` });
      navigate("/industry/liquor", { replace: true });
    }
    setSubmitting(false);
  };

  const categories = Object.entries(LIQUOR_ROLE_CATEGORIES) as [LiquorRoleCategory, typeof LIQUOR_ROLE_CATEGORIES[LiquorRoleCategory]][];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/access-hub")} className="mb-8 text-muted-foreground">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to RouteAce
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600">
                <Wine className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-2xl text-foreground">Liquor Commerce OS</h1>
                <p className="text-sm text-muted-foreground">Alcohol Distribution Intelligence Platform</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-3xl font-bold font-heading leading-tight text-foreground">
              Autonomous<br />
              <span className="text-amber-500">Liquor Distribution</span><br />
              Intelligence
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {["Sales Velocity", "Network Intelligence", "Commerce Exchange", "Revenue Engines"].map((kpi) => (
                <div key={kpi} className="glass-card p-3 rounded-xl">
                  <p className="text-xs text-muted-foreground">{kpi}</p>
                  <p className="text-lg font-bold text-amber-500">-</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">© 2026 RouteAce. All rights reserved.</p>
        </div>
      </div>

      {/* Right Content Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {step === "auth" ? (
            <motion.div key="auth" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-md">
              <div className="lg:hidden flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600">
                  <Wine className="w-5 h-5 text-white" />
                </div>
                <h1 className="font-heading font-bold text-xl text-foreground">Liquor Commerce OS</h1>
              </div>

              <div className="mb-8">
                <h2 className="font-heading text-2xl font-bold mb-2 text-foreground">
                  {isLogin ? "Welcome back" : "Create an account"}
                </h2>
                <p className="text-muted-foreground">
                  {isLogin ? "Sign in to Liquor Commerce OS" : "Join Liquor Commerce OS"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="fullName" name="fullName" placeholder="John Doe" value={formData.fullName} onChange={handleInputChange} className="pl-10 bg-secondary/50" disabled={submitting} />
                    </div>
                    {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" name="email" type="email" placeholder="you@company.com" value={formData.email} onChange={handleInputChange} className="pl-10 bg-secondary/50" disabled={submitting} />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.password} onChange={handleInputChange} className="pl-10 pr-10 bg-secondary/50" disabled={submitting} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="confirmPassword" name="confirmPassword" type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.confirmPassword} onChange={handleInputChange} className="pl-10 bg-secondary/50" disabled={submitting} />
                    </div>
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                  </div>
                )}
                <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" disabled={submitting}>
                  {submitting ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-muted-foreground">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button type="button" onClick={() => { setIsLogin(!isLogin); setErrors({}); setFormData({ fullName: "", email: "", password: "", confirmPassword: "" }); }} className="text-amber-600 hover:underline font-medium">
                    {isLogin ? "Sign up" : "Sign in"}
                  </button>
                </p>
              </div>
            </motion.div>

          ) : step === "category-select" ? (
            <motion.div key="category-select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-lg">
              <div className="mb-6">
                <h2 className="font-heading text-2xl font-bold mb-2 text-foreground">Select Your Organization Type</h2>
                <p className="text-muted-foreground">Choose your role in the alcohol distribution ecosystem. This determines your dashboard and module access.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {categories.map(([key, cat]) => {
                  const CatIcon = CATEGORY_ICONS[key];
                  const isSelected = selectedCategory === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setSelectedCategory(key); setSelectedRole(null); }}
                      className={`p-5 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/10 shadow-md"
                          : "border-border bg-card hover:border-amber-500/40 hover:bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "bg-amber-500 text-white" : "bg-secondary text-muted-foreground"
                        }`}>
                          <CatIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className={`text-base font-semibold ${isSelected ? "text-amber-600" : "text-foreground"}`}>
                            {cat.label}
                          </p>
                          <p className="text-sm text-muted-foreground">{cat.roles.length} roles available</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                <Button
                  onClick={() => { if (selectedCategory) setStep("role-select"); }}
                  disabled={!selectedCategory}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>

          ) : (
            <motion.div key="role-select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-lg">
              <div className="mb-6">
                <h2 className="font-heading text-2xl font-bold mb-2 text-foreground">Select Your Role</h2>
                <p className="text-muted-foreground">
                  {selectedCategory && LIQUOR_ROLE_CATEGORIES[selectedCategory].label} - choose your specific position.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {selectedCategory && LIQUOR_ROLE_CATEGORIES[selectedCategory].roles.map((role) => {
                  const RoleIcon = ROLE_ICONS[role];
                  const isSelected = selectedRole === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/10 shadow-md"
                          : "border-border bg-card hover:border-amber-500/40 hover:bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "bg-amber-500 text-white" : "bg-secondary text-muted-foreground"
                        }`}>
                          <RoleIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold ${isSelected ? "text-amber-600" : "text-foreground"}`}>
                            {LIQUOR_ROLE_LABELS[role]}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {LIQUOR_ROLE_DESCRIPTIONS[role]}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setStep("category-select"); setSelectedRole(null); }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleRoleSelect}
                  disabled={!selectedRole || submitting}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  {submitting ? "Setting up..." : "Enter Liquor OS"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LiquorAuth;
