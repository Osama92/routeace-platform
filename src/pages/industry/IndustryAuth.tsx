import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getIndustryConfig } from "@/lib/industryConfig";

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

const ROLE_ENABLED_INDUSTRIES = ["liquor", "pharma", "agri", "building", "cosmetics", "bfsi", "auto", "consumer"];

const IndustryAuth = () => {
  const { industryCode } = useParams<{ industryCode: string }>();
  const navigate = useNavigate();

  // Redirect industries with role systems to their dedicated auth
  useEffect(() => {
    if (industryCode && ROLE_ENABLED_INDUSTRIES.includes(industryCode)) {
      if (industryCode === "liquor") {
        navigate("/industry/liquor/auth", { replace: true });
      } else {
        navigate(`/industry/${industryCode}/role-auth`, { replace: true });
      }
    }
  }, [industryCode, navigate]);

  const config = getIndustryConfig(industryCode || "other");
  const Icon = config.icon;
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });

  const { signIn, signUp, user, userRole, isApproved, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (loading || !user) return;
    if (userRole === null) return;
    if (!isApproved && userRole !== "super_admin") return;
    navigate(`/industry/${industryCode}`, { replace: true });
  }, [user, userRole, isApproved, loading, navigate, industryCode]);

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
        else toast({ title: "Welcome back!", description: `Entering ${config.displayName}` });
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
        else toast({ title: "Account Created!", description: "Awaiting approval." });
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, hsl(${config.colorPrimary} / 0.15), hsl(${config.colorSecondary} / 0.05), transparent)` }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/access-hub")} className="mb-8 text-muted-foreground">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to RouteAce
            </Button>
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, hsl(${config.colorPrimary}), hsl(${config.colorSecondary}))` }}
              >
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-2xl">{config.displayName}</h1>
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-3xl font-bold font-heading leading-tight">
              Autonomous<br />
              <span style={{ color: `hsl(${config.colorPrimary})` }}>{config.name} Distribution</span><br />
              Intelligence
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {config.kpiCategories.slice(0, 4).map((kpi) => (
                <div key={kpi} className="glass-card p-3 rounded-xl">
                  <p className="text-xs text-muted-foreground">{kpi}</p>
                  <p className="text-lg font-bold" style={{ color: `hsl(${config.colorPrimary})` }}>-</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">© 2026 RouteAce. All rights reserved.</p>
        </div>
      </div>

      {/* Right Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, hsl(${config.colorPrimary}), hsl(${config.colorSecondary}))` }}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-heading font-bold text-xl">{config.displayName}</h1>
          </div>

          <div className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-2">
              {isLogin ? "Welcome back" : "Create an account"}
            </h2>
            <p className="text-muted-foreground">
              {isLogin ? `Sign in to ${config.displayName}` : `Join ${config.displayName}`}
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
            <Button type="submit" className="w-full" disabled={submitting} style={{ backgroundColor: `hsl(${config.colorPrimary})` }}>
              {submitting ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button type="button" onClick={() => { setIsLogin(!isLogin); setErrors({}); setFormData({ fullName: "", email: "", password: "", confirmPassword: "" }); }} className="text-primary hover:underline font-medium">
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default IndustryAuth;
