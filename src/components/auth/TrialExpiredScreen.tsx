import { motion } from "framer-motion";
import { Clock, LogOut, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface TrialExpiredScreenProps {
  planType?: string | null;
}

const TrialExpiredScreen = ({ planType }: TrialExpiredScreenProps) => {
  const { signOut, user, tenantMode } = useAuth();
  const navigate = useNavigate();

  const label = planType ?? (tenantMode === "LOGISTICS_DEPARTMENT"
    ? "Logistics Department (60-day trial)"
    : "Logistics Company (30-day trial)");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 max-w-md w-full text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-warning/20 flex items-center justify-center">
          <Clock className="w-10 h-10 text-warning" />
        </div>

        <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
          Your Free Trial Has Ended
        </h1>

        <p className="text-muted-foreground mb-6">
          Thanks for trying RouteAce. Upgrade now to keep full access to your data,
          dispatches, and operational tools.
        </p>

        <div className="bg-secondary/50 rounded-lg p-4 mb-6 text-left">
          <p className="text-xs text-muted-foreground mb-1">Plan</p>
          <p className="font-medium text-foreground mb-3">{label}</p>
          <p className="text-xs text-muted-foreground mb-1">Account</p>
          <p className="font-medium text-foreground">{user?.email}</p>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full gap-2"
            onClick={() => navigate("/settings")}
          >
            <Crown className="w-4 h-4" />
            Upgrade to Continue
          </Button>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default TrialExpiredScreen;
