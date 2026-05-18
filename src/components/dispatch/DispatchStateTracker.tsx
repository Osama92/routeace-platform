import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDispatchStateMachine } from "@/hooks/useDispatchStateMachine";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Truck,
  Package,
  MapPin,
  ArrowRight,
  RefreshCw,
  History,
  Timer,
  DollarSign,
  FileText
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface DispatchStateTrackerProps {
  dispatchId: string;
  onStateChange?: (newState: string) => void;
}

const DispatchStateTracker = ({ dispatchId, onStateChange }: DispatchStateTrackerProps) => {
  const { toast } = useToast();
  const { user, hasAnyRole } = useAuth();
  const {
    loading,
    stateConfig,
    fetchAllowedTransitions,
    executeTransition,
    getStateHistory,
    getSlaStatus
  } = useDispatchStateMachine();

  const [allowedTransitions, setAllowedTransitions] = useState<any[]>([]);
  const [stateHistory, setStateHistory] = useState<any[]>([]);
  const [slaStatus, setSlaStatus] = useState<any>(null);

  // Fetch dispatch details
  const { data: dispatch, refetch } = useQuery({
    queryKey: ["dispatch-state", dispatchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatches")
        .select(`
          *,
          customers (company_name),
          drivers (full_name, phone),
          vehicles (registration_number, truck_type)
        `)
        .eq("id", dispatchId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!dispatchId
  });

  // Load transitions and history when dispatch changes
  useEffect(() => {
    if (dispatch?.status) {
      loadTransitions();
      loadHistory();
      loadSlaStatus();
    }
  }, [dispatch?.status]);

  const loadTransitions = async () => {
    if (dispatch?.status) {
      // Validate status is a valid dispatch state before passing
      const validStates = ["created", "pending_approval", "approved", "assigned", "enroute", "picked_up", "in_transit", "delivered", "closed", "invoiced", "cancelled"];
      if (validStates.includes(dispatch.status)) {
        const transitions = await fetchAllowedTransitions(dispatch.status as any);
        setAllowedTransitions(transitions);
      }
    }
  };


  const loadHistory = async () => {
    const history = await getStateHistory(dispatchId);
    setStateHistory(history);
  };

  const loadSlaStatus = async () => {
    const status = await getSlaStatus(dispatchId);
    setSlaStatus(status);
  };

  const handleTransition = async (newState: string, requiresReason: boolean) => {
    let reason: string | undefined;
    
    if (requiresReason) {
      reason = window.prompt("Please provide a reason for this state change:");
      if (!reason) return;
    }

    const result = await executeTransition(dispatchId, newState as any, reason);
    
    if (result.success) {
      refetch();
      onStateChange?.(newState);
      
      // Handle auto-triggers
      if (result.auto_trigger === "auto_invoice") {
        toast({
          title: "Invoice Generated",
          description: "An invoice has been automatically created for this dispatch"
        });
      }
    }
  };

  // Calculate state progress
  const stateOrder = ["created", "pending_approval", "approved", "assigned", "enroute", "picked_up", "in_transit", "delivered", "closed", "invoiced"];
  const currentIndex = stateOrder.indexOf(dispatch?.status || "created");
  const progress = ((currentIndex + 1) / stateOrder.length) * 100;

  if (!dispatch) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading dispatch details...
        </CardContent>
      </Card>
    );
  }

  const currentStateConfig = stateConfig[dispatch.status as keyof typeof stateConfig] || {
    label: dispatch.status,
    color: "bg-muted",
    description: "Unknown state"
  };

  return (
    <div className="space-y-4">
      {/* Current State Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {dispatch.dispatch_number}
              </CardTitle>
              <CardDescription>{dispatch.customers?.company_name}</CardDescription>
            </div>
            <Badge className={currentStateConfig.color}>
              {currentStateConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="mb-4">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {currentStateConfig.description}
            </p>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">From</p>
                <p className="truncate max-w-24">{dispatch.pickup_address?.split(",")[0]}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">To</p>
                <p className="truncate max-w-24">{dispatch.delivery_address?.split(",")[0]}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              <div>
                <p className="text-xs text-muted-foreground">Vehicle</p>
                <p>{dispatch.vehicles?.registration_number || "Unassigned"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <div>
                <p className="text-xs text-muted-foreground">Cost</p>
                <p>₦{dispatch.cost?.toLocaleString() || "-"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SLA Timer (if active) */}
      {slaStatus && !slaStatus.isBreached && (
        <Card className={slaStatus.remainingHours < 2 ? "border-warning" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className={`w-5 h-5 ${slaStatus.remainingHours < 2 ? "text-warning" : "text-muted-foreground"}`} />
                <div>
                  <p className="font-medium">SLA Timer</p>
                  <p className="text-xs text-muted-foreground">
                    Deadline: {format(slaStatus.deadline, "MMM d, HH:mm")}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${slaStatus.remainingHours < 2 ? "text-warning" : ""}`}>
                  {Math.floor(slaStatus.remainingHours)}h {Math.round((slaStatus.remainingHours % 1) * 60)}m
                </p>
                <p className="text-xs text-muted-foreground">remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SLA Breached Warning */}
      {slaStatus?.isBreached && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="font-medium">SLA Breached</p>
                <p className="text-xs">
                  Breached at {format(new Date(slaStatus.breachedAt), "MMM d, HH:mm")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Transitions */}
      {allowedTransitions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Available Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {allowedTransitions.map((transition) => {
                const targetConfig = stateConfig[transition.to_state as keyof typeof stateConfig];
                return (
                  <Button
                    key={transition.to_state}
                    variant={transition.to_state === "cancelled" ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => handleTransition(transition.to_state, transition.requires_reason)}
                    disabled={loading}
                  >
                    {loading ? (
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3 h-3 mr-1" />
                    )}
                    Move to {targetConfig?.label || transition.to_state}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* State History Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" />
            State History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stateHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No state changes recorded yet
            </p>
          ) : (
            <div className="space-y-3">
              {stateHistory.slice(0, 5).map((entry, index) => {
                const toConfig = stateConfig[entry.to_state as keyof typeof stateConfig];
                return (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${index === 0 ? "bg-primary" : "bg-muted"}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {entry.from_state && (
                            <>
                              <Badge variant="outline" className="text-xs">{entry.from_state}</Badge>
                              <ArrowRight className="w-3 h-3" />
                            </>
                          )}
                          <Badge className={`text-xs ${toConfig?.color || ""}`}>
                            {toConfig?.label || entry.to_state}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {entry.reason && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Reason: {entry.reason}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DispatchStateTracker;
