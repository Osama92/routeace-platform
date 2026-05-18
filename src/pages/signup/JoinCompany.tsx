import brandLogo from "@/assets/routeace-mark.png";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Users,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Truck,
  Building2,
  AlertCircle,
} from "lucide-react";

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  email: z.string().trim().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface InvitationData {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  organization?: {
    name: string;
  };
}

const JoinCompany = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("token");

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (inviteToken) {
      validateInvitation();
    } else {
      setIsLoading(false);
    }
  }, [inviteToken]);

  const validateInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from("organization_invitations")
        .select(`
          id,
          organization_id,
          email,
          role,
          expires_at,
          accepted_at,
          organizations:organization_id (name)
        `)
        .eq("token", inviteToken)
        .single();

      if (error || !data) {
        toast.error("Invalid or expired invitation link");
        setIsLoading(false);
        return;
      }

      if (data.accepted_at) {
        toast.error("This invitation has already been used");
        navigate("/auth");
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        toast.error("This invitation has expired");
        setIsLoading(false);
        return;
      }

      setInvitation({
        id: data.id,
        organization_id: data.organization_id,
        email: data.email,
        role: data.role,
        organization: data.organizations as any,
      });
      setFormData((prev) => ({ ...prev, email: data.email }));
    } catch (error) {
      console.error("Error validating invitation:", error);
      toast.error("Failed to validate invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = signupSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    if (!invitation) {
      toast.error("No valid invitation found");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create account");

      const userId = authData.user.id;

      // 2. Add user as organization member
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: invitation.organization_id,
          user_id: userId,
          role: invitation.role as any,
          is_owner: false,
          is_active: true,
        });

      if (memberError) throw memberError;

      // 3. Assign role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: invitation.role as any,
        });

      if (roleError) throw roleError;

      // 4. Approve profile via secure server-side function
      await supabase.rpc("approve_user_profile", { p_user_id: userId });

      // 5. Mark invitation as accepted
      await supabase
        .from("organization_invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      // 6. Log the event
      await supabase.from("audit_logs").insert({
        action: "invitation_accepted",
        table_name: "organization_members",
        record_id: invitation.organization_id,
        user_id: userId,
        user_email: formData.email,
        new_data: {
          organization_id: invitation.organization_id,
          role: invitation.role,
        },
      });

      toast.success("Account created successfully! Please check your email to verify.", {
        duration: 6000,
      });

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error joining company:", error);
      if (error.message?.includes("User already registered")) {
        toast.error("This email is already registered. Please sign in instead.");
      } else {
        toast.error(error.message || "Failed to join company. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // No token provided - show info page
  if (!inviteToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <CardTitle>Join an Existing Company</CardTitle>
            <CardDescription>
              You need an invitation link from your organization admin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                How it works
              </h4>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Ask your organization admin to invite you</li>
                <li>You'll receive an email with an invitation link</li>
                <li>Click the link to create your account</li>
                <li>Your role will be assigned by your admin</li>
              </ol>
            </div>

            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Already have an account? Sign In
              </Button>
              <Button onClick={() => navigate("/signup/company")}>
                Or create your own company
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid/expired invitation
  if (!invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Please contact your organization admin for a new invitation.
            </p>
            <Button className="w-full" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-background to-background" />
        <div className="relative z-10 flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <img src={brandLogo} alt="RouteAce" className="h-12 w-auto object-contain" />
            <div>
              <h1 className="font-heading font-bold text-2xl">RouteAce</h1>
              <p className="text-sm text-muted-foreground">Logistics Platform</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="font-heading text-3xl font-bold mb-4">
                Join
                <span className="gradient-text block">{invitation.organization?.name || "Your Organization"}</span>
              </h2>
              <p className="text-muted-foreground max-w-md">
                You've been invited to join as a team member. Create your account to get started.
              </p>
            </div>

            <Card className="bg-secondary/30 border-border">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Organization</p>
                    <p className="font-medium">{invitation.organization?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Your Role</p>
                    <p className="font-medium capitalize">{invitation.role.replace("_", " ")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <button onClick={() => navigate("/auth")} className="text-primary hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <img src={brandLogo} alt="RouteAce" className="h-10 w-auto object-contain" />
            <h1 className="font-heading font-bold text-xl">RouteAce</h1>
          </div>

          <div className="text-center mb-6">
            <div className="mx-auto w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
              <Users className="w-7 h-7 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold">Create Your Account</h2>
            <p className="text-sm text-muted-foreground">
              Joining {invitation.organization?.name} as {invitation.role.replace("_", " ")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
              {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="pl-10 bg-muted"
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Email is set by your invitation</p>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="pl-10 pr-10"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive mt-1">{errors.password}</p>}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
              {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Join Organization
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default JoinCompany;
