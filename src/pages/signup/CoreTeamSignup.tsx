import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Shield, 
  ArrowLeft, 
  Lock, 
  Eye, 
  EyeOff,
  CheckCircle,
  Loader2,
  BarChart3,
  TrendingUp,
  Users,
  Globe,
} from "lucide-react";

const CoreTeamSignup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const inviteCode = formData.get("inviteCode") as string;

    // Validate invite code (in production, this would be verified against a database)
    const validCodes = ["ROUTEACE-CORE-2025", "BUILDER-ACCESS-2025"];
    if (!validCodes.includes(inviteCode.toUpperCase())) {
      setError("Invalid invite code. Core team access requires a valid invitation.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            is_core_team: true,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Add to core_team_members table
        const { error: insertError } = await supabase
          .from("core_team_members")
          .insert({
            user_id: data.user.id,
            email: email,
            display_name: fullName,
            core_role: "core_viewer", // Default role, can be upgraded later
          });

        if (insertError) {
          console.error("Failed to create core team member:", insertError);
        }

        toast.success("Account created! Please check your email to verify.");
        navigate("/core/login");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: BarChart3, title: "Platform Analytics", description: "Full visibility into platform health and growth" },
    { icon: TrendingUp, title: "Revenue Intelligence", description: "Real-time revenue tracking and forecasting" },
    { icon: Users, title: "Tenant Oversight", description: "Monitor all organizations and their performance" },
    { icon: Globe, title: "System Health", description: "Infrastructure monitoring and alerts" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-950/10 to-background flex">
      {/* Left Panel - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 to-purple-800 p-12 flex-col justify-between">
        <div>
          <button 
            onClick={() => navigate("/welcome")}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-12"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">RouteAce Core</h1>
                <p className="text-white/70">Internal Team Portal</p>
              </div>
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-4">
              Build the Future of Logistics
            </h2>
            <p className="text-lg text-white/80 mb-12">
              Access internal tools, analytics, and system observability designed 
              for RouteAce builders and stakeholders.
            </p>
          </motion.div>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="flex items-start gap-4 p-4 bg-white/10 rounded-xl backdrop-blur"
              >
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-white/70">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="text-white/60 text-sm">
          <p>Access restricted to authorized personnel only.</p>
          <p>All activities are logged and audited.</p>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <button 
            onClick={() => navigate("/welcome")}
            className="lg:hidden flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          <Card className="border-purple-500/20">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Core Team Access</CardTitle>
              <CardDescription>
                Request access to the RouteAce internal portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName" 
                    name="fullName" 
                    placeholder="Your name"
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    placeholder="you@routeace.com"
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      name="password" 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      minLength={8}
                      required 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite Code</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="inviteCode" 
                      name="inviteCode" 
                      placeholder="Enter your invite code"
                      className="pl-10"
                      required 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contact a core team member if you don't have an invite code.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Request Access
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have access?{" "}
                  <button
                    onClick={() => navigate("/core/login")}
                    className="text-purple-500 hover:underline font-medium"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            By signing up, you agree to RouteAce's internal access policies.
            All actions are logged for security purposes.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default CoreTeamSignup;
