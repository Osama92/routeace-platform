import { motion } from "framer-motion";
import { Clock, LogOut, Zap, ShieldCheck, Database, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const TrialExpiredScreen = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const dataPoints = [
    { icon: Database,    label: "Dispatches & routes",      desc: "All historical dispatches preserved" },
    { icon: ShieldCheck, label: "Fleet & driver records",   desc: "Every vehicle and driver still here" },
    { icon: ShieldCheck, label: "Customers & invoices",     desc: "Nothing deleted, nothing lost" },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">

          {/* Red accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-red-500 to-orange-400" />

          <div className="p-8">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
              <Clock className="w-8 h-8 text-red-500" />
            </div>

            {/* Headline */}
            <h1 className="text-2xl font-bold text-foreground text-center mb-2">
              Your free trial has ended
            </h1>
            <p className="text-muted-foreground text-center text-sm mb-6">
              Choose a plan to restore full access instantly. Your operations data is
              completely safe and waiting for you.
            </p>

            {/* Data safety assurance */}
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6 space-y-2.5">
              <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-3">
                Your data is safe
              </p>
              {dataPoints.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <Icon className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground leading-tight">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Account info */}
            <div className="bg-muted/40 rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Signed in as</p>
                <p className="text-sm font-medium text-foreground truncate max-w-[240px]">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                className="w-full gap-2 h-11 text-base font-semibold"
                onClick={() => navigate("/billing-engine")}
              >
                <Zap className="w-4 h-4" />
                Choose a Plan
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>

              <Button
                variant="ghost"
                className="w-full gap-2 text-muted-foreground"
                onClick={() => signOut()}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Need help?{" "}
          <a href="mailto:support@routeace.app" className="underline hover:text-foreground transition-colors">
            Contact support
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default TrialExpiredScreen;
