import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import usePermissions from "@/hooks/usePermissions";
import { AlertTriangle, Plus, Shield, Truck, User, MapPin, Calendar, Edit2 } from "lucide-react";
import { format } from "date-fns";

interface RouteRisk {
  id: string;
  route_name: string;
  risk_level: "low" | "medium" | "high" | "critical";
  risk_description: string;
  mitigation_plan: string;
  driver_id: string | null;
  vehicle_id: string | null;
  driver_name?: string;
  vehicle_plate?: string;
  reported_by: string;
  reported_at: string;
  status: "open" | "mitigated" | "closed";
  last_incident_date: string | null;
  incident_count: number;
}

const RouteRiskRegister = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOpsManager, isSuperAdmin, isOrgAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<RouteRisk | null>(null);

  // Form state
  const [routeName, setRouteName] = useState("");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [riskDescription, setRiskDescription] = useState("");
  const [mitigationPlan, setMitigationPlan] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [status, setStatus] = useState<"open" | "mitigated" | "closed">("open");

  const canEdit = isOpsManager || isSuperAdmin;
  const canView = isOpsManager || isSuperAdmin || isOrgAdmin;

  // Fetch route risks
  const { data: risks, isLoading } = useQuery({
    queryKey: ["route-risks"],
    queryFn: async () => {
      const { data: riskData, error } = await supabase
        .from("route_risk_register")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch driver and vehicle names separately
      const driverIds = riskData?.map(r => r.driver_id).filter(Boolean) || [];
      const vehicleIds = riskData?.map(r => r.vehicle_id).filter(Boolean) || [];
      
      const [driversRes, vehiclesRes] = await Promise.all([
        driverIds.length > 0 ? supabase.from("drivers").select("id, full_name").in("id", driverIds) : { data: [] },
        vehicleIds.length > 0 ? supabase.from("vehicles").select("id, registration_number").in("id", vehicleIds) : { data: [] }
      ]);
      
      const driverMap = new Map((driversRes.data || []).map(d => [d.id, d.full_name]));
      const vehicleMap = new Map((vehiclesRes.data || []).map(v => [v.id, v.registration_number]));
      
      return (riskData || []).map(r => ({
        ...r,
        driver_name: r.driver_id ? driverMap.get(r.driver_id) : undefined,
        vehicle_plate: r.vehicle_id ? vehicleMap.get(r.vehicle_id) : undefined,
      })) as RouteRisk[];
    },
    enabled: canView,
  });

  // Fetch drivers and vehicles for form
  const { data: drivers } = useQuery({
    queryKey: ["risk-drivers"],
    queryFn: async () => {
      const { data } = await supabase.from("drivers").select("id, full_name").eq("status", "active");
      return data || [];
    },
    enabled: dialogOpen,
  });

  const { data: vehicles } = useQuery({
    queryKey: ["risk-vehicles"],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("id, registration_number").eq("status", "active");
      return data || [];
    },
    enabled: dialogOpen,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (isEdit: boolean) => {
      const payload = {
        route_name: routeName,
        risk_level: riskLevel,
        risk_description: riskDescription,
        mitigation_plan: mitigationPlan,
        driver_id: selectedDriver || null,
        vehicle_id: selectedVehicle || null,
        status,
        reported_by: user?.id,
        reported_at: new Date().toISOString(),
      };

      if (isEdit && editingRisk) {
        const { error } = await supabase
          .from("route_risk_register")
          .update(payload)
          .eq("id", editingRisk.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("route_risk_register").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["route-risks"] });
      toast({ title: "Success", description: editingRisk ? "Risk updated" : "Risk registered" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenDialog = (risk?: RouteRisk) => {
    if (risk) {
      setEditingRisk(risk);
      setRouteName(risk.route_name);
      setRiskLevel(risk.risk_level);
      setRiskDescription(risk.risk_description);
      setMitigationPlan(risk.mitigation_plan);
      setSelectedDriver(risk.driver_id || "");
      setSelectedVehicle(risk.vehicle_id || "");
      setStatus(risk.status);
    } else {
      setEditingRisk(null);
      setRouteName("");
      setRiskLevel("medium");
      setRiskDescription("");
      setMitigationPlan("");
      setSelectedDriver("");
      setSelectedVehicle("");
      setStatus("open");
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRisk(null);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "default";
      default: return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "closed": return "default";
      case "mitigated": return "secondary";
      case "open": return "destructive";
      default: return "secondary";
    }
  };

  if (!canView) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">You don't have permission to view the Risk Register</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-heading font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-destructive" />
            Route Risk Register
          </h3>
          <p className="text-sm text-muted-foreground">
            Track and mitigate route-specific risks for drivers and trucks
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Register Risk
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{risks?.filter(r => r.risk_level === "critical" || r.risk_level === "high").length || 0}</p>
                <p className="text-xs text-muted-foreground">High/Critical Risks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{risks?.filter(r => r.status === "open").length || 0}</p>
                <p className="text-xs text-muted-foreground">Open Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-success" />
              <div>
                <p className="text-2xl font-bold">{risks?.filter(r => r.status === "mitigated").length || 0}</p>
                <p className="text-xs text-muted-foreground">Mitigated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{risks?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Risk Assessment Log</CardTitle>
          <CardDescription>All registered route risks with associated drivers and vehicles</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported</TableHead>
                  {canEdit && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {risks?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No risks registered yet
                    </TableCell>
                  </TableRow>
                ) : (
                  risks?.map((risk) => (
                    <TableRow key={risk.id}>
                      <TableCell className="font-medium">{risk.route_name}</TableCell>
                      <TableCell>
                        <Badge variant={getRiskColor(risk.risk_level)} className="capitalize">
                          {risk.risk_level}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-48 truncate">{risk.risk_description}</TableCell>
                      <TableCell>
                        {risk.driver_name ? (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {risk.driver_name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {risk.vehicle_plate ? (
                          <div className="flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            {risk.vehicle_plate}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(risk.status)} className="capitalize">
                          {risk.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(risk.reported_at), "MMM d, yyyy")}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(risk)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRisk ? "Edit Risk" : "Register New Risk"}</DialogTitle>
            <DialogDescription>
              Document route risks and mitigation strategies
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Route Name</Label>
              <Input
                placeholder="e.g., Lagos → Ibadan Highway"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Risk Level</Label>
                <Select value={riskLevel} onValueChange={(v: any) => setRiskLevel(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="mitigated">Mitigated</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Risk Description</Label>
              <Textarea
                placeholder="Describe the risk..."
                value={riskDescription}
                onChange={(e) => setRiskDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Mitigation Plan</Label>
              <Textarea
                placeholder="How will this risk be mitigated?"
                value={mitigationPlan}
                onChange={(e) => setMitigationPlan(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Associated Driver (Optional)</Label>
                <Select value={selectedDriver || "none"} onValueChange={(v) => setSelectedDriver(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {drivers?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Associated Vehicle (Optional)</Label>
                <Select value={selectedVehicle || "none"} onValueChange={(v) => setSelectedVehicle(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vehicles?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(!!editingRisk)} disabled={!routeName || !riskDescription}>
              {editingRisk ? "Update" : "Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RouteRiskRegister;
