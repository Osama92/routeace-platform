import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Crown,
  Users,
  Shield,
  ArrowRight,
  Building2,
  Zap,
  Globe,
  BarChart3,
  Lock,
  Cpu,
  TrendingUp,
  Truck,
} from "lucide-react";

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 * i, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

const SignupCards = () => {
  const navigate = useNavigate();

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
      {/* Super Admin / Platform Owner */}
      <motion.div
        custom={0}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover={{ y: -6, transition: { duration: 0.2 } }}
        className="signup-card-owner rounded-2xl border-2 p-[1px] cursor-pointer group"
        onClick={() => navigate("/signup/company")}
      >
        <div className="rounded-2xl p-8 h-full flex flex-col">
          {/* Icon + Badge */}
          <div className="flex items-start justify-between mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(43,96%,56%)] to-[hsl(25,95%,53%)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Crown className="w-8 h-8 text-background" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-[hsl(43,96%,56%,0.15)] text-[hsl(43,96%,70%)]">
              Owner
            </span>
          </div>

          {/* Title */}
          <h3 className="text-2xl font-heading font-bold mb-2">Platform Owner</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Own and operate a full RouteAce instance. Full control over your logistics empire.
          </p>

          {/* Features */}
          <div className="space-y-3 mb-8 flex-1">
            {[
              { icon: Building2, text: "Create your organization" },
              { icon: Zap, text: "Full platform access & governance" },
              { icon: Users, text: "Invite & manage your entire team" },
              { icon: Globe, text: "White-label & reseller capabilities" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[hsl(43,96%,56%,0.1)] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[hsl(43,96%,60%)]" />
                </div>
                <span className="text-sm text-foreground/80">{text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[hsl(43,96%,56%)] to-[hsl(25,95%,53%)] hover:from-[hsl(43,96%,50%)] hover:to-[hsl(25,95%,47%)] text-background shadow-lg">
            Create Platform
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </motion.div>

      {/* General Users / Logistics Companies */}
      <motion.div
        custom={1}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover={{ y: -6, transition: { duration: 0.2 } }}
        className="signup-card-team rounded-2xl border-2 p-[1px] cursor-pointer group"
        onClick={() => navigate("/signup/join")}
      >
        <div className="rounded-2xl p-8 h-full flex flex-col">
          {/* Icon + Badge */}
          <div className="flex items-start justify-between mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(217,91%,60%)] to-[hsl(224,76%,48%)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Truck className="w-8 h-8 text-background" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-[hsl(217,91%,60%,0.15)] text-[hsl(217,91%,70%)]">
              Teams
            </span>
          </div>

          {/* Title */}
          <h3 className="text-2xl font-heading font-bold mb-2">Logistics Companies & Teams</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Dispatch, track, and optimize deliveries. Join with an invitation from your organization.
          </p>

          {/* Features */}
          <div className="space-y-3 mb-8 flex-1">
            {[
              { icon: Lock, text: "Join via secure invite link" },
              { icon: Users, text: "Role assigned by your admin" },
              { icon: BarChart3, text: "Access your team's live data" },
              { icon: Zap, text: "Dispatch, track & collaborate" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[hsl(217,91%,60%,0.1)] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[hsl(217,91%,65%)]" />
                </div>
                <span className="text-sm text-foreground/80">{text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button variant="outline" className="w-full h-12 text-base font-semibold border-[hsl(217,91%,60%,0.4)] hover:bg-[hsl(217,91%,60%,0.1)] hover:border-[hsl(217,91%,60%,0.6)]">
            Start Using RouteAce
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </motion.div>

      {/* Core Team */}
      <motion.div
        custom={2}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover={{ y: -6, transition: { duration: 0.2 } }}
        className="signup-card-core rounded-2xl border-2 p-[1px] cursor-pointer group md:col-span-2 lg:col-span-1"
        onClick={() => navigate("/signup/core-team")}
      >
        <div className="rounded-2xl p-8 h-full flex flex-col">
          {/* Icon + Badge */}
          <div className="flex items-start justify-between mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(271,91%,65%)] to-[hsl(271,81%,56%)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Shield className="w-8 h-8 text-background" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-[hsl(271,91%,65%,0.15)] text-[hsl(271,91%,75%)]">
              Internal
            </span>
          </div>

          {/* Title */}
          <h3 className="text-2xl font-heading font-bold mb-2">RouteAce Core Team</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Internal builders, engineers, product & ops. Full system observability.
          </p>

          {/* Features */}
          <div className="space-y-3 mb-8 flex-1">
            {[
              { icon: Cpu, text: "Platform-wide observability" },
              { icon: TrendingUp, text: "Revenue & growth intelligence" },
              { icon: BarChart3, text: "System health monitoring" },
              { icon: Lock, text: "Invite-code protected access" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[hsl(271,91%,65%,0.1)] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[hsl(271,91%,70%)]" />
                </div>
                <span className="text-sm text-foreground/80">{text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button variant="outline" className="w-full h-12 text-base font-semibold border-[hsl(271,91%,65%,0.4)] hover:bg-[hsl(271,91%,65%,0.1)] hover:border-[hsl(271,91%,65%,0.6)]">
            Join Core Team
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default SignupCards;
