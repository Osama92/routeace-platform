import brandLogo from "@/assets/routeace-mark.png";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { z } from "zod";
import { Truck, Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const getRoleDestination = (userRole: string | null, tenantMode: string, from?: string): string => {
  if (tenantMode === "LOGISTICS_DEPARTMENT" && userRole === "customer") return "/dept/sales-tracker";
  if (from && from !== "/auth" && from !== "/access-hub" && from !== "/welcome" && from !== "/") {
    return from;
  }
  switch (userRole) {
    case "super_admin": return "/super-admin";
    case "org_admin": return "/org-admin";
    case "ops_manager": return "/ops-dashboard";
    case "finance_manager": return "/finance-dashboard";
    case "driver": return "/driver-dashboard";
    case "customer": return "/customer-portal";
    case "core_founder":
    case "core_builder":
    case "core_product":
    case "core_engineer":
    case "internal_team": return "/core/dashboard";
    case "dispatcher":
    case "support":
    case "admin":
    default: return "/dashboard";
  }
};

const Auth = () => {
  // Self-serve signup is handled exclusively by /signup/create-company so the
  // founding user is correctly provisioned as Super Admin + Organization owner.
  const [isLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const { signIn, signUp, user, userRole, isApproved, approvalStatus, loading, tenantMode } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname;

  // Role-based redirect after login + approval
  useEffect(() => {
    if (loading || !user) return;
    // Wait until role is resolved
    if (userRole === null) return;
    // Only redirect when approved (or super_admin who bypasses approval)
    if (!isApproved && userRole !== "super_admin") return;

    navigate(getRoleDestination(userRole, tenantMode, from), { replace: true });
  }, [user, userRole, tenantMode, isApproved, approvalStatus, loading, navigate, from]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      if (isLogin) {
        const result = loginSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          return;
        }

        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          const msg = error.message || "";
          const isUnconfirmed = /confirm/i.test(msg) && /email/i.test(msg);
          setNeedsVerification(isUnconfirmed);
          toast({
            title: isUnconfirmed ? "Email not verified" : "Login Failed",
            description: isUnconfirmed
              ? "Please verify your email first. We can resend the verification link below."
              : msg.includes("Invalid login credentials")
              ? "That email or password doesn't match. Please try again."
              : "We couldn't sign you in. Please try again in a moment.",
            variant: "destructive",
          });
        } else {
          setNeedsVerification(false);
          toast({ title: "Welcome back!", description: "You have successfully logged in." });
        }
      } else {
        const result = signupSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          return;
        }

        const { error } = await signUp(formData.email, formData.password, formData.fullName);
        if (error) {
          toast({
            title: error.message.includes("User already registered") ? "Account Exists" : "Sign Up Failed",
            description: error.message.includes("User already registered")
              ? "This email is already registered. Please log in instead."
              : error.message,
            variant: "destructive",
          });
        } else {
          toast({ title: "Account Created!", description: "Your account has been created. Awaiting approval." });
        }
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!formData.email) {
      setErrors({ email: "Please enter your email above first" });
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: formData.email,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) {
        toast({
          title: "Couldn't resend email",
          description: /already confirmed/i.test(error.message)
            ? "This email is already verified. Try signing in."
            : "We couldn't resend the verification email. Please try again shortly.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Verification email sent",
          description: "Check your inbox (and spam folder) within the next minute.",
        });
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Helmet>
        <title>{isLogin ? "Sign in to RouteAce" : "Create your RouteAce account"}</title>
        <meta name="description" content={isLogin ? "Sign in to RouteAce to manage dispatch, fleet, and distribution operations." : "Create your RouteAce account to start tracking fleet, dispatch, and distribution intelligence."} />
        <link rel="canonical" href="https://routeaceglyde.app/auth" />
        <meta property="og:title" content={isLogin ? "Sign in to RouteAce" : "Create your RouteAce account"} />
        <meta property="og:description" content="Authentication for RouteAce - Distribution Intelligence Platform for African logistics." />
        <meta property="og:url" content="https://routeaceglyde.app/auth" />
      </Helmet>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-glow)" }} />

        <div className="relative z-10 flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <img src={brandLogo} alt="RouteAce" className="h-12 w-auto object-contain" />
            <div>
              <span className="font-heading font-bold text-2xl text-foreground block">RouteAce</span>
              <p className="text-sm text-muted-foreground">Logistics Platform</p>
            </div>
          </div>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="font-heading text-4xl font-bold text-foreground mb-4">
                Streamline Your
                <span className="gradient-text block">Logistics Operations</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-md">
                Real-time tracking, intelligent dispatch management, and comprehensive
                analytics all in one powerful platform.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Active Shipments", value: "2,500+" },
                { label: "Delivery Rate", value: "99.2%" },
                { label: "Partners", value: "150+" },
                { label: "Cities Covered", value: "36" },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="glass-card p-4"
                >
                  <p className="text-2xl font-heading font-bold text-primary">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            © 2026 RouteAce. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src={brandLogo} alt="RouteAce" className="h-10 w-auto object-contain" />
            <span className="font-heading font-bold text-xl text-foreground">RouteAce</span>
          </div>

          <div className="mb-8">
            <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
              {isLogin ? "Sign in to RouteAce" : "Create your RouteAce account"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin
                ? "Enter your credentials to access your account"
                : "Fill in your details to get started"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="pl-10 bg-secondary/50"
                    disabled={submitting}
                  />
                </div>
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10 bg-secondary/50"
                  disabled={submitting}
                />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 pr-10 bg-secondary/50"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
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
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="pl-10 bg-secondary/50"
                    disabled={submitting}
                  />
                </div>
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            {needsVerification && (
              <div className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-foreground">
                Your email isn't verified yet. Check your inbox for the link, or resend it below.
              </div>
            )}
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending}
              className="text-sm text-primary hover:underline disabled:opacity-50"
            >
              {resending ? "Sending..." : "Resend verification email"}
            </button>
          </div>

          <div className="mt-6 text-center space-y-2">
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/signup/company")}
                className="text-primary hover:underline font-medium"
              >
                Create your company
              </button>
            </p>
            <p className="text-xs text-muted-foreground">
              Joining a team?{" "}
              <button
                type="button"
                onClick={() => navigate("/signup/join")}
                className="text-primary hover:underline"
              >
                Use your invite
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
