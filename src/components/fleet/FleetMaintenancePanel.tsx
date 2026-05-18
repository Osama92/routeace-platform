import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays } from "date-fns";
import {
  Wrench,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Gauge,
  Fuel,
  Settings,
  Calendar,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  maintenance_type: string;
  description: string;
  cost: number;
  odometer_reading: number;
  performed_by: string | null;
  performed_at: string;
  next_maintenance_km: number | null;
  next_maintenance_date: string | null;
  parts_replaced: any;
  notes: string | null;
  created_at: string;
  vehicles?: {
    registration_number: string;
    make: string | null;
    model: string | null;
  };
}

interface Vehicle {
  id: string;
  registration_number: string;
  make: string | null;
  model: string | null;
  current_odometer: number;
  lifetime_km: number;
  weekly_km: number;
  monthly_km: number;
  health_score: number;
  last_service_km: number;
  status: string | null;
}

const MAINTENANCE_TYPES = [
  { value: "oil_change", label: "Oil Change" },
  { value: "spare_parts", label: "Spare Parts Replacement" },
  { value: "service_log", label: "Service Log" },
  { value: "tire_replacement", label: "Tire Replacement" },
  { value: "brake_service", label: "Brake Service" },
  { value: "engine_repair", label: "Engine Repair" },
  { value: "general_inspection", label: "General Inspection" },
  { value: "other", label: "Other" },
];

const FleetMaintenancePanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [formData, setFormData] = useState({
    maintenance_type: "",
    description: "",
    cost: "",
    odometer_reading: "",
    performed_by: "",
    next_maintenance_km: "",
    notes: "",
  });

  // Fetch vehicles with extended data
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ["fleet-vehicles-extended"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, registration_number, make, model, status, current_odometer, lifetime_km, weekly_km, monthly_km, health_score, last_service_km")
        .order("registration_number");
      
      if (error) throw error;
      return data as Vehicle[];
    },
  });

  // Fetch maintenance records
  const { data: maintenanceRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ["fleet-maintenance-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_maintenance_records")
        .select(`*, vehicles(registration_number, make, model)`)
        .order("performed_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as MaintenanceRecord[];
    },
  });

  // Calculate fleet health metrics
  const fleetMetrics = {
    totalVehicles: vehicles?.length || 0,
    averageHealthScore: vehicles?.length 
      ? Math.round(vehicles.reduce((acc, v) => acc + (v.health_score || 100), 0) / vehicles.length)
      : 100,
    vehiclesNeedingService: vehicles?.filter(v => {
      const kmSinceService = (v.current_odometer || 0) - (v.last_service_km || 0);
      return kmSinceService >= 5000;
    }).length || 0,
    overdueVehicles: vehicles?.filter(v => (v.health_score || 100) < 70).length || 0,
  };

  // Add maintenance record mutation
  const addMaintenanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVehicle || !formData.maintenance_type || !formData.description) {
        throw new Error("Please fill in required fields");
      }

      const { error } = await supabase.from("vehicle_maintenance_records").insert({
        vehicle_id: selectedVehicle,
        maintenance_type: formData.maintenance_type,
        description: formData.description,
        cost: parseFloat(formData.cost) || 0,
        odometer_reading: parseFloat(formData.odometer_reading) || 0,
        performed_by: formData.performed_by || null,
        next_maintenance_km: formData.next_maintenance_km ? parseFloat(formData.next_maintenance_km) : null,
        notes: formData.notes || null,
        created_by: user?.id,
      });

      if (error) throw error;

      // Update vehicle's current odometer and last service km
      if (formData.odometer_reading) {
        await supabase
          .from("vehicles")
          .update({ 
            current_odometer: parseFloat(formData.odometer_reading),
            last_service_km: parseFloat(formData.odometer_reading),
          })
          .eq("id", selectedVehicle);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet-maintenance-records"] });
      queryClient.invalidateQueries({ queryKey: ["fleet-vehicles-extended"] });
      toast({ title: "Success", description: "Maintenance record added" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSelectedVehicle("");
    setFormData({
      maintenance_type: "",
      description: "",
      cost: "",
      odometer_reading: "",
      performed_by: "",
      next_maintenance_km: "",
      notes: "",
    });
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getMaintenanceTypeLabel = (type: string) => {
    return MAINTENANCE_TYPES.find(t => t.value === type)?.label || type;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (vehiclesLoading || recordsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fleet Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Gauge className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fleet Health</p>
                <p className={`text-2xl font-bold ${getHealthColor(fleetMetrics.averageHealthScore)}`}>
                  {fleetMetrics.averageHealthScore}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Vehicles</p>
                <p className="text-2xl font-bold">{fleetMetrics.totalVehicles}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Wrench className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Need Service</p>
                <p className="text-2xl font-bold text-warning">{fleetMetrics.vehiclesNeedingService}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-destructive">{fleetMetrics.overdueVehicles}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Alerts */}
      {fleetMetrics.vehiclesNeedingService > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <span className="font-medium">
                {fleetMetrics.vehiclesNeedingService} vehicle(s) approaching 5,000km service interval
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicle Mileage Grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5" />
              Vehicle Mileage Tracking
            </CardTitle>
            <CardDescription>Monitor vehicle distance and health scores</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles?.slice(0, 9).map((vehicle) => {
              const kmSinceService = (vehicle.current_odometer || 0) - (vehicle.last_service_km || 0);
              const serviceProgress = Math.min((kmSinceService / 5000) * 100, 100);
              
              return (
                <Card key={vehicle.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold">{vehicle.registration_number}</span>
                      <Badge 
                        variant={vehicle.health_score >= 70 ? "default" : "destructive"}
                        className={vehicle.health_score >= 70 ? "bg-success/20 text-success" : ""}
                      >
                        {vehicle.health_score || 100}% Health
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Odometer</span>
                        <span className="font-medium">{(vehicle.current_odometer || 0).toLocaleString()} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lifetime</span>
                        <span className="font-medium">{(vehicle.lifetime_km || 0).toLocaleString()} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">This Week</span>
                        <span className="font-medium">{(vehicle.weekly_km || 0).toLocaleString()} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">This Month</span>
                        <span className="font-medium">{(vehicle.monthly_km || 0).toLocaleString()} km</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Service in {Math.max(0, 5000 - kmSinceService).toLocaleString()} km</span>
                        <span>{Math.round(serviceProgress)}%</span>
                      </div>
                      <Progress 
                        value={serviceProgress} 
                        className={`h-2 ${serviceProgress >= 100 ? "bg-destructive/20" : ""}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Records */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Maintenance Records
            </CardTitle>
            <CardDescription>Track oil changes, spare parts, and service logs</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Maintenance Record</DialogTitle>
                <DialogDescription>Log a new maintenance activity</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Vehicle *</Label>
                  <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles?.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.registration_number} {v.make && `- ${v.make}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Maintenance Type *</Label>
                  <Select 
                    value={formData.maintenance_type} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, maintenance_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {MAINTENANCE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the maintenance work..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cost (₦)</Label>
                    <Input
                      type="number"
                      value={formData.cost}
                      onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Odometer Reading (km)</Label>
                    <Input
                      type="number"
                      value={formData.odometer_reading}
                      onChange={(e) => setFormData(prev => ({ ...prev, odometer_reading: e.target.value }))}
                      placeholder="Current reading"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Performed By</Label>
                    <Input
                      value={formData.performed_by}
                      onChange={(e) => setFormData(prev => ({ ...prev, performed_by: e.target.value }))}
                      placeholder="Mechanic name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Next Service (km)</Label>
                    <Input
                      type="number"
                      value={formData.next_maintenance_km}
                      onChange={(e) => setFormData(prev => ({ ...prev, next_maintenance_km: e.target.value }))}
                      placeholder="e.g., 50000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => addMaintenanceMutation.mutate()} disabled={addMaintenanceMutation.isPending}>
                  {addMaintenanceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Record
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {maintenanceRecords?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No maintenance records yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Odometer</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenanceRecords?.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.vehicles?.registration_number || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getMaintenanceTypeLabel(record.maintenance_type)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{record.description}</TableCell>
                    <TableCell>{record.odometer_reading?.toLocaleString() || 0} km</TableCell>
                    <TableCell>{formatCurrency(record.cost || 0)}</TableCell>
                    <TableCell>{format(new Date(record.performed_at), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FleetMaintenancePanel;
