import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Shield, Lock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type CoreRole = "core_founder" | "core_builder" | "core_product" | "core_engineer" | "internal_team";

/**
 * INTERNAL ONLY - RouteAce Core Team Login
 * This is a separate authentication entry for internal team members
 * who need access to platform observability and analytics.
 * 
 * This login page is NOT visible in regular navigation.
 * It grants access to internal dashboards only.
 */
const CoreLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Sign in the user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Authentication failed");
      }

      // Check if user has a core team role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .single();

      const role = roleData?.role as string;
      const isCoreTeam = role?.startsWith("core_") || role === "internal_team";
      
      if (roleError || !isCoreTeam) {
        // Sign out if not core team
        await supabase.auth.signOut();
        toast({
          title: "Access Denied",
          description: "This login is restricted to RouteAce Core Team members only.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Log the internal access
      await supabase.from("core_access_logs").insert({
        user_id: authData.user.id,
        core_role: role,
        action: "login",
        resource: "/core/dashboard",
        user_agent: navigator.userAgent,
      });

      // Also log to audit_logs for consistency
      await supabase.from("audit_logs").insert({
        table_name: "internal_access",
        record_id: authData.user.id,
        action: "core_login",
        user_id: authData.user.id,
        user_email: email,
        new_data: {
          access_type: "core_team_login",
          core_role: role,
          timestamp: new Date().toISOString(),
        },
      });

      const roleLabel = getRoleLabel(role as CoreRole);
      toast({
        title: `Welcome, ${roleLabel}`,
        description: "Redirecting to Core Dashboard...",
      });

      // Redirect based on role
      navigate("/core/dashboard");
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: CoreRole): string => {
    switch (role) {
      case "core_founder": return "Founder";
      case "core_builder": return "Builder";
      case "core_product": return "Product Manager";
      case "core_engineer": return "Engineer";
      case "internal_team": return "Core Team Member";
      default: return "Team Member";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-950/10 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-amber-500/30 bg-background/95 backdrop-blur-sm">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-heading">
                RouteAce Core System
              </CardTitle>
              <CardDescription className="mt-2">
                Internal team authentication portal
              </CardDescription>
            </div>
            <Badge variant="outline" className="mx-auto border-amber-500/50 text-amber-500">
              <Lock className="w-3 h-3 mr-1" />
              RESTRICTED ACCESS
            </Badge>
          </CardHeader>

          <CardContent>
            <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  This portal is exclusively for RouteAce Founders, Builders, Product Managers, 
                  and Engineers. Unauthorized access attempts are logged and monitored.
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="team@routeace.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-secondary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-secondary/50 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Access Core System
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button
                variant="link"
                className="text-muted-foreground text-sm"
                onClick={() => navigate("/")}
              >
                Return to Main Platform
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          For internal use only. Not for customer operations.
        </p>
      </motion.div>
    </div>
  );
};

export default CoreLogin;
