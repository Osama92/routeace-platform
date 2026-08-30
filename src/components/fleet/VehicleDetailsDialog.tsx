import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Truck,
  Fuel,
  Gauge,
  Calendar,
  FileText,
  Wrench,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Plus,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Vehicle {
  id: string;
  registration_number: string;
  vehicle_type: string;
  truck_type?: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  status: string | null;
  current_fuel_level: number | null;
  capacity_kg: number | null;
  current_mileage?: number | null;
  ownership_type?: string | null;
  fuel_type?: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  image_url?: string | null;
}

interface VehicleDocument {
  id: string;
  vehicle_id: string;
  document_type: string;
  document_name: string;
  expiry_date: string | null;
  is_verified: boolean | null;
}

interface VehicleRepair {
  id: string;
  vehicle_id: string;
  repair_date: string;
  repair_type: string;
  description: string | null;
  cost: number;
  mileage_at_repair: number | null;
  performed_by: string | null;
  notes: string | null;
  parts_replaced: string | null;
  parts_cost: number | null;
  labour_cost: number | null;
  is_breakdown: boolean;
  downtime_days: number | null;
}

interface RepairInsights {
  ok: boolean;
  total_spend: number;
  repair_count: number;
  breakdown_count: number;
  planned_count: number;
  total_downtime_days: number;
  breakdowns_per_month: number;
  avg_repair_cost: number;
  last_repair: string | null;
  repeat_faults: { repair_type: string; occurrences: number; total_cost: number }[];
}

interface VehicleDetailsDialogProps {
  vehicle: Vehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which tab to land on. Lets a "Log Repair" button on the vehicle card
   *  open straight to the repair log instead of Overview, where the user
   *  would have to know to go looking for it. */
  initialTab?: "overview" | "documents" | "repairs";
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  available: { label: "Available", icon: CheckCircle, color: "bg-success/15 text-success" },
  in_use: { label: "In Use", icon: Gauge, color: "bg-info/15 text-info" },
  maintenance: { label: "Maintenance", icon: Wrench, color: "bg-warning/15 text-warning" },
  retired: { label: "Retired", icon: XCircle, color: "bg-muted text-muted-foreground" },
};

const VehicleDetailsDialog = ({ vehicle, open, onOpenChange, initialTab = "overview" }: VehicleDetailsDialogProps) => {
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [repairs, setRepairs] = useState<VehicleRepair[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRepairForm, setShowRepairForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { hasAnyRole } = useAuth();
  
  // Mirrors the vehicle_repairs write policy. The previous ["admin"] gate
  // matched the old RLS rule that no Relma user could satisfy, so the Add
  // button never appeared for anyone.
  const canManage = hasAnyRole([
    "ops_manager", "org_admin", "finance_manager", "admin", "super_admin",
  ]);
  // A vendor maintains their own truck at their own cost, so repairs are
  // only logged against owned vehicles. The database enforces this too.
  const isOwned = (vehicle?.ownership_type ?? "owned") === "owned";

  const [insights, setInsights] = useState<RepairInsights | null>(null);
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const emptyRepairForm = {
    repair_date: format(new Date(), "yyyy-MM-dd"),
    repair_type: "",
    description: "",
    parts_replaced: "",
    parts_cost: "",
    labour_cost: "",
    mileage_at_repair: "",
    performed_by: "",
    is_breakdown: false,
    downtime_days: "",
    notes: "",
  };
  const [repairForm, setRepairForm] = useState(emptyRepairForm);

  useEffect(() => {
    if (vehicle && open) {
      // Re-apply on each open: the component stays mounted between vehicles,
      // so without this the tab would stick wherever it was last left.
      setActiveTab(initialTab);
      fetchDocuments();
      fetchRepairs();
    }
  }, [vehicle, open, initialTab]);

  const fetchDocuments = async () => {
    if (!vehicle) return;
    const { data } = await supabase
      .from("vehicle_documents")
      .select("*")
      .eq("vehicle_id", vehicle.id)
      .order("expiry_date", { ascending: true });
    setDocuments(data || []);
  };

  const fetchRepairs = async () => {
    if (!vehicle) return;
    setLoading(true);
    const { data } = await supabase
      .from("vehicle_repairs")
      .select("*")
      .eq("vehicle_id", vehicle.id)
      .order("repair_date", { ascending: false });
    setRepairs(data || []);

    // Spend, breakdown frequency, downtime and repeat faults, computed
    // server-side so the same numbers appear wherever they are read.
    const { data: ins } = await (supabase.rpc as any)("get_vehicle_repair_insights", {
      p_vehicle_id: vehicle.id,
    });
    setInsights(ins?.ok ? (ins as RepairInsights) : null);

    setLoading(false);
  };

  const handleAddRepair = async () => {
    if (!vehicle || !repairForm.repair_type) {
      toast({
        title: "Repair type required",
        description: "Describe what was done, e.g. \"Brake overhaul\".",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // log_vehicle_repair() writes the repair AND books the expense in one
      // call, so the workshop record and the money cannot drift apart. It
      // also rejects vendor-owned trucks.
      const partsCost = parseFloat(repairForm.parts_cost || "0") || 0;
      const labourCost = parseFloat(repairForm.labour_cost || "0") || 0;

      const { error } = await (supabase.rpc as any)("log_vehicle_repair", {
        p_vehicle_id: vehicle.id,
        p_repair_date: repairForm.repair_date,
        p_repair_type: repairForm.repair_type,
        p_description: repairForm.description || null,
        p_parts_replaced: repairForm.parts_replaced || null,
        p_parts_cost: partsCost,
        p_labour_cost: labourCost,
        p_mileage: repairForm.mileage_at_repair ? parseInt(repairForm.mileage_at_repair) : null,
        p_performed_by: repairForm.performed_by || null,
        p_is_breakdown: repairForm.is_breakdown,
        p_downtime_days: repairForm.downtime_days ? parseInt(repairForm.downtime_days) : null,
        p_book_expense: true,
      });

      if (error) throw error;

      toast({
        title: "Repair logged",
        description: partsCost + labourCost > 0
          ? `${formatCurrency(partsCost + labourCost)} also booked to expenses.`
          : "No cost recorded, so nothing was booked to expenses.",
      });
      setShowRepairForm(false);
      setRepairForm(emptyRepairForm);
      fetchRepairs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return { status: "expired", color: "text-destructive", bgColor: "bg-destructive/15", label: "Expired" };
    if (days <= 30) return { status: "expiring", color: "text-warning", bgColor: "bg-warning/15", label: `${days} days left` };
    return { status: "valid", color: "text-success", bgColor: "bg-success/15", label: "Valid" };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!vehicle) return null;

  const statusInfo = statusConfig[vehicle.status || "available"] || statusConfig.available;
  const StatusIcon = statusInfo.icon;
  const totalRepairCost = repairs.reduce((sum, r) => sum + Number(r.cost), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            {vehicle.registration_number}
          </DialogTitle>
          <DialogDescription>
            {vehicle.make} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
            <TabsTrigger value="repairs">Repairs ({repairs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* Vehicle Image with Type & Tonnage */}
            <div className="flex gap-4">
              <div className="relative w-48 h-32 rounded-lg overflow-hidden bg-secondary/50 flex items-center justify-center flex-shrink-0">
                {vehicle.image_url ? (
                  <img 
                    src={vehicle.image_url} 
                    alt={vehicle.registration_number}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Truck className="w-16 h-16 text-muted-foreground/30" />
                )}
              </div>
              <div className="flex flex-col justify-center gap-2">
                <h3 className="text-xl font-bold">{vehicle.registration_number}</h3>
                <p className="text-sm text-muted-foreground">
                  {vehicle.make} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge className={statusInfo.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusInfo.label}
                  </Badge>
                  {vehicle.truck_type && (
                    <Badge className="bg-primary/15 text-primary">{vehicle.truck_type} Truck</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Type & Ownership Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{vehicle.vehicle_type?.replace("_", " ")}</Badge>
              {vehicle.ownership_type && (
                <Badge variant="secondary">{vehicle.ownership_type}</Badge>
              )}
            </div>

            {/* Vehicle Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Registration</p>
                <p className="font-medium">{vehicle.registration_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Make & Model</p>
                <p className="font-medium">{vehicle.make || "-"} {vehicle.model || ""}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Year</p>
                <p className="font-medium">{vehicle.year || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capacity</p>
                <p className="font-medium">{vehicle.capacity_kg ? `${vehicle.capacity_kg.toLocaleString()} kg` : "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fuel Type</p>
                <p className="font-medium capitalize">{vehicle.fuel_type || "Diesel"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Mileage</p>
                <p className="font-medium">{vehicle.current_mileage ? `${vehicle.current_mileage.toLocaleString()} km` : "-"}</p>
              </div>
            </div>

            {/* Fuel Level */}
            {vehicle.current_fuel_level !== null && (
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Fuel className="w-4 h-4" />
                    Fuel Level
                  </span>
                  <span className="font-medium">{vehicle.current_fuel_level}%</span>
                </div>
                <Progress value={vehicle.current_fuel_level} className="h-2" />
              </div>
            )}

            {/* Maintenance Info */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Maintenance Schedule
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Last Maintenance</p>
                  <p className="font-medium">
                    {vehicle.last_maintenance
                      ? format(new Date(vehicle.last_maintenance), "dd MMM yyyy")
                      : "Not recorded"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Maintenance</p>
                  <p className="font-medium">
                    {vehicle.next_maintenance
                      ? format(new Date(vehicle.next_maintenance), "dd MMM yyyy")
                      : "Not scheduled"}
                  </p>
                </div>
              </div>
            </div>

            {/* Repair Summary */}
            {repairs.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Total Repair Cost</h4>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRepairCost)}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-muted-foreground">No documents uploaded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => {
                  const expiry = getExpiryStatus(doc.expiry_date);
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.document_name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{doc.document_type.replace("_", " ")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.is_verified && (
                          <CheckCircle className="w-4 h-4 text-success" />
                        )}
                        {expiry && (
                          <Badge className={`${expiry.bgColor} ${expiry.color}`}>
                            {expiry.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="repairs" className="mt-4">
            {/* Vendor trucks are maintained by the vendor at their own cost,
                so there is nothing to log here. Explained rather than just
                hiding the button, so it does not look broken. */}
            {!isOwned && (
              <div className="mb-4 rounded-lg border border-muted bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground">
                  This is a vendor-owned truck. The vendor maintains it at their own
                  cost, so repairs are not recorded against your fleet spend.
                </p>
              </div>
            )}

            {/* Service summary. Only shown once there is something to summarise —
                a panel of zeros teaches the reader nothing. */}
            {isOwned && insights && insights.repair_count > 0 && (
              <div className="mb-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Total spend</p>
                    <p className="text-lg font-semibold">{formatCurrency(Number(insights.total_spend))}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Repairs</p>
                    <p className="text-lg font-semibold">
                      {insights.repair_count}
                      <span className="text-xs font-normal text-muted-foreground">
                        {" "}({insights.breakdown_count} breakdown{insights.breakdown_count === 1 ? "" : "s"})
                      </span>
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Breakdowns / month</p>
                    <p className="text-lg font-semibold">{insights.breakdowns_per_month}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Days off road</p>
                    <p className="text-lg font-semibold">{insights.total_downtime_days}</p>
                  </div>
                </div>

                {/* The same fault recurring inside 90 days is either a bad fix
                    or a failing component — the signal worth acting on. */}
                {insights.repeat_faults?.length > 0 && (
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-yellow-600">Recurring faults</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Repeated within 90 days — likely an incomplete fix or a failing part.
                        </p>
                        <ul className="space-y-1">
                          {insights.repeat_faults.map((f) => (
                            <li key={f.repair_type} className="text-sm">
                              <span className="font-medium">{f.repair_type}</span>
                              <span className="text-muted-foreground">
                                {" "}&times;{f.occurrences} · {formatCurrency(Number(f.total_cost))}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {canManage && isOwned && !showRepairForm && (
              <Button
                onClick={() => setShowRepairForm(true)}
                className="mb-4"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Log Repair
              </Button>
            )}

            {showRepairForm && (
              <div className="mb-6 p-4 rounded-lg bg-secondary/50 space-y-4">
                <h4 className="font-medium">Log a repair</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={repairForm.repair_date}
                      onChange={(e) => setRepairForm(p => ({ ...p, repair_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Repair Type *</Label>
                    <Input
                      placeholder="e.g., Engine Overhaul"
                      value={repairForm.repair_type}
                      onChange={(e) => setRepairForm(p => ({ ...p, repair_type: e.target.value }))}
                    />
                  </div>
                  {/* Split so "what did the part cost vs the mechanic" is
                      answerable later. The total is derived from these. */}
                  <div className="space-y-2">
                    <Label>Parts cost (NGN)</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={repairForm.parts_cost}
                      onChange={(e) => setRepairForm(p => ({ ...p, parts_cost: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Labour cost (NGN)</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={repairForm.labour_cost}
                      onChange={(e) => setRepairForm(p => ({ ...p, labour_cost: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mileage at Repair</Label>
                    <Input
                      type="number"
                      placeholder="km"
                      value={repairForm.mileage_at_repair}
                      onChange={(e) => setRepairForm(p => ({ ...p, mileage_at_repair: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Performed By</Label>
                    <Input
                      placeholder="Mechanic name"
                      value={repairForm.performed_by}
                      onChange={(e) => setRepairForm(p => ({ ...p, performed_by: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Parts replaced</Label>
                  <Input
                    placeholder="e.g., Brake pads, discs, oil filter"
                    value={repairForm.parts_replaced}
                    onChange={(e) => setRepairForm(p => ({ ...p, parts_replaced: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Breakdown vs planned is the reliability signal: a truck
                      with plenty of scheduled servicing is well kept, one
                      that keeps failing in service is not. */}
                  <div className="space-y-2">
                    <Label>Type of work</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={!repairForm.is_breakdown ? "default" : "outline"}
                        onClick={() => setRepairForm(p => ({ ...p, is_breakdown: false }))}
                      >
                        Planned
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={repairForm.is_breakdown ? "default" : "outline"}
                        onClick={() => setRepairForm(p => ({ ...p, is_breakdown: true }))}
                      >
                        Breakdown
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Days off road</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={repairForm.downtime_days}
                      onChange={(e) => setRepairForm(p => ({ ...p, downtime_days: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Details about the repair..."
                    value={repairForm.description}
                    onChange={(e) => setRepairForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Recording a cost also books it to expenses against this vehicle,
                  so finance does not have to enter it again.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleAddRepair} disabled={saving}>
                    {saving ? "Saving..." : "Save repair"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowRepairForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : repairs.length === 0 ? (
              <div className="text-center py-8">
                <Wrench className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-muted-foreground">No repair records</p>
              </div>
            ) : (
              <div className="space-y-3">
                {repairs.map((repair) => (
                  <div key={repair.id} className="p-4 rounded-lg bg-secondary/50">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{repair.repair_type}</p>
                          <Badge
                            variant="outline"
                            className={
                              repair.is_breakdown
                                ? "text-red-600 border-red-500/40 text-[10px]"
                                : "text-green-600 border-green-500/40 text-[10px]"
                            }
                          >
                            {repair.is_breakdown ? "Breakdown" : "Planned"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(repair.repair_date), "dd MMM yyyy")}
                          {repair.mileage_at_repair ? ` • ${repair.mileage_at_repair.toLocaleString()} km` : ""}
                          {repair.downtime_days ? ` • ${repair.downtime_days}d off road` : ""}
                        </p>
                        {repair.parts_replaced && (
                          <p className="text-sm mt-1">
                            <span className="text-muted-foreground">Parts: </span>
                            {repair.parts_replaced}
                          </p>
                        )}
                        {repair.description && (
                          <p className="text-sm text-muted-foreground mt-1">{repair.description}</p>
                        )}
                        {repair.performed_by && (
                          <p className="text-sm text-muted-foreground">By: {repair.performed_by}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-foreground">{formatCurrency(Number(repair.cost))}</p>
                        {/* Only worth splitting out when both halves exist. */}
                        {Number(repair.parts_cost) > 0 && Number(repair.labour_cost) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(Number(repair.parts_cost))} parts ·{" "}
                            {formatCurrency(Number(repair.labour_cost))} labour
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleDetailsDialog;