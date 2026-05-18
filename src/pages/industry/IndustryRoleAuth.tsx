import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import {
  Mail, Lock, User, Eye, EyeOff, ArrowRight, ChevronLeft,
  Shield, BarChart3, Users, ClipboardList, MapPin, Package, Truck,
  CreditCard, Store, Globe, Brain, Target, Building2, Wallet,
  Pill, Wheat, HardHat, Sparkles, Landmark, Wrench, ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getIndustryConfig } from "@/lib/industryConfig";
import { useIndustryRole, type AnyIndustryRole } from "@/hooks/useIndustryRole";

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

const DEFAULT_ROLE_ICON = Users;

const IndustryRoleAuth = () => {
  const { industryCode } = useParams<{ industryCode: string }>();
  const navigate = useNavigate();
  const config = getIndustryConfig(industryCode || "other");
  const Icon = config.icon;
  const industryRole = useIndustryRole(industryCode || "");

  const [step, setStep] = useState<"auth" | "role">("auth");
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [selectedRole, setSelectedRole] = useState<AnyIndustryRole | null>(null);

  const { signIn, signUp, user, userRole, isApproved, loading } = useAuth();
  const { toast } = useToast();

  // If user is authed and has a role, go to dashboard
  useEffect(() => {
    if (loading || !user) return;
    if (userRole === null) return;
    if (!isApproved && userRole !== "super_admin") return;
    if (industryRole?.role) {
      navigate(`/industry/${industryCode}`, { replace: true });
    } else if (industryRole && !industryRole.loading) {
      setStep("role");
    }
  }, [user, userRole, isApproved, loading, industryRole?.role, industryRole?.loading, navigate, industryCode]);

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
          result.error.errors.forEach((err) => { if (err.path[0]) fe[String(err.path[0])] = err.message; });
          setErrors(fe);
          return;
        }
        const { error } = await signIn(formData.email, formData.password);
        if (error) { toast({ title: "Login failed", description: error.message, variant: "destructive" }); return; }
        toast({ title: "Welcome back!", description: `Signed in to ${config.displayName}` });
      } else {
        const result = signupSchema.safeParse(formData);
        if (!result.success) {
          const fe: Record<string, string> = {};
          result.error.errors.forEach((err) => { if (err.path[0]) fe[String(err.path[0])] = err.message; });
          setErrors(fe);
          return;
        }
        const { error } = await signUp(formData.email, formData.password, formData.fullName);
        if (error) { toast({ title: "Signup failed", description: error.message, variant: "destructive" }); return; }
        toast({ title: "Account created!", description: "Please check your email to verify your account." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleSelect = async (role: AnyIndustryRole) => {
    if (!industryRole) return;
    setSelectedRole(role);
    const result = await industryRole.setRole(role);
    if (result?.error) {
      toast({ title: "Error", description: "Failed to set role. Please try again.", variant: "destructive" });
      setSelectedRole(null);
    } else {
      toast({ title: "Role assigned!", description: `You're now ${industryRole.labels[role]}` });
      navigate(`/industry/${industryCode}`, { replace: true });
    }
  };

  if (!industryRole) {
    navigate(`/industry/${industryCode}/auth`, { replace: true });
    return null;
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, hsl(${config.colorPrimary} / 0.08), hsl(${config.colorSecondary} / 0.05))` }}
    >
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, hsl(${config.colorPrimary}), hsl(${config.colorSecondary}))` }}
          >
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">{config.displayName}</h1>
          <p className="text-muted-foreground text-sm mt-1">{config.description}</p>
        </div>

        <AnimatePresence mode="wait">
          {step === "auth" ? (
            <motion.div key="auth" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <Card className="border-border/50 shadow-lg">
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                      <div>
                        <Label htmlFor="fullName">Full Name</Label>
                        <div className="relative mt-1">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="fullName" name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="Full name" className="pl-10" />
                        </div>
                        {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
                      </div>
                    )}
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="your@email.com" className="pl-10" />
                      </div>
                      {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="password" name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleInputChange} placeholder="••••••••" className="pl-10 pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                    </div>
                    {!isLogin && (
                      <div>
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative mt-1">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleInputChange} placeholder="••••••••" className="pl-10" />
                        </div>
                        {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
                      </div>
                    )}
                    <Button type="submit" disabled={submitting} className="w-full" style={{ background: `linear-gradient(135deg, hsl(${config.colorPrimary}), hsl(${config.colorSecondary}))` }}>
                      {submitting ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                  <div className="text-center mt-4">
                    <button onClick={() => { setIsLogin(!isLogin); setErrors({}); }} className="text-sm text-primary hover:underline">
                      {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="role" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-6">
                <h2 className="font-heading text-xl font-bold text-foreground">Select Your Role</h2>
                <p className="text-muted-foreground text-sm mt-1">Choose the role that best describes your position</p>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {Object.entries(industryRole.categories).map(([catKey, cat]) => (
                  <div key={catKey}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{cat.label}</p>
                    <div className="space-y-2">
                      {cat.roles.map((role) => (
                        <button
                          key={role}
                          onClick={() => handleRoleSelect(role as AnyIndustryRole)}
                          disabled={!!selectedRole}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedRole === role
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          } ${selectedRole && selectedRole !== role ? "opacity-50" : ""}`}
                        >
                          <div className="font-medium text-sm text-foreground">{industryRole.labels[role]}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{industryRole.descriptions[role]}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center mt-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default IndustryRoleAuth;
