import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface SLACountdownTimerProps {
  deadline: string | null;
  status: string;
  actualDelivery?: string | null;
  compact?: boolean;
}

export function SLACountdownTimer({ deadline, status, actualDelivery, compact = false }: SLACountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [urgency, setUrgency] = useState<"safe" | "warning" | "critical" | "breached" | "met">("safe");

  useEffect(() => {
    if (!deadline) return;

    // If already delivered
    if (actualDelivery && ["delivered", "closed"].includes(status)) {
      const deadlineDate = new Date(deadline);
      const deliveredDate = new Date(actualDelivery);
      if (deliveredDate <= deadlineDate) {
        setUrgency("met");
        setTimeLeft("SLA Met");
      } else {
        setUrgency("breached");
        const diff = deliveredDate.getTime() - deadlineDate.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        setTimeLeft(`Breached by ${hours}h`);
      }
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const deadlineTime = new Date(deadline).getTime();
      const diff = deadlineTime - now;

      if (diff <= 0) {
        setUrgency("breached");
        const overdue = Math.abs(diff);
        const hours = Math.floor(overdue / (1000 * 60 * 60));
        const mins = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`-${hours}h ${mins}m`);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours < 2) setUrgency("critical");
      else if (hours < 6) setUrgency("warning");
      else setUrgency("safe");

      setTimeLeft(`${hours}h ${mins}m ${secs}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline, status, actualDelivery]);

  if (!deadline) return null;

  const config = {
    safe: { icon: Clock, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    warning: { icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    critical: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
    breached: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
    met: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  };

  const { icon: Icon, color, bg, border } = config[urgency];

  if (compact) {
    return (
      <Badge variant="outline" className={`${bg} ${color} ${border} font-mono text-[10px] gap-1`}>
        <Icon className="w-3 h-3" />
        {timeLeft}
      </Badge>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${bg} ${border} border`}>
      <Icon className={`w-4 h-4 ${color}`} />
      <div>
        <p className={`text-xs font-semibold ${color}`}>
          {urgency === "breached" ? "SLA BREACHED" : urgency === "met" ? "SLA MET" : "SLA Countdown"}
        </p>
        <p className={`font-mono text-sm font-bold ${color}`}>{timeLeft}</p>
      </div>
    </div>
  );
}

export default SLACountdownTimer;
