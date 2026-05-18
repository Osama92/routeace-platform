import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import OpsOnboardingChecklist from "@/components/operations/OpsOnboardingChecklist";
import { useOpsOnboardingCounts } from "@/hooks/useOpsOnboardingCounts";
import VehicleHealthScore from "@/components/fleet/VehicleHealthScore";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import VehicleImageUpload from "@/components/fleet/VehicleImageUpload";
import { EntitlementGate } from "@/components/entitlements/EntitlementGate";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Filter,
  Truck,
  Calendar,
  Fuel,
  Gauge,
  Wrench,
  MoreVertical,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Upload,
  Clock,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { format, differenceInDays } from "date-fns";
import VehicleDetailsDialog from "@/components/fleet/VehicleDetailsDialog";

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
  last_maintenance: string | null;
  next_maintenance: string | null;
  partner_id: string | null;
  image_url?: string | null;
}

interface VehicleDocument {
  id: string;
  vehicle_id: string;
  document_type: string;
  document_name: string;
  document_url: string | null;
  expiry_date: string | null;
  is_verified: boolean | null;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  available: { label: "Available", icon: CheckCircle, color: "bg-success/15 text-success" },
  in_use: { label: "In Use", icon: Gauge, color: "bg-info/15 text-info" },
  maintenance: { label: "Maintenance", icon: Wrench, color: "bg-warning/15 text-warning" },
  retired: { label: "Retired", icon: XCircle, color: "bg-muted text-muted-foreground" },
};

const documentTypes = [
  { value: "registration", label: "Vehicle Registration" },
  { value: "insurance", label: "Insurance Certificate" },
  { value: "roadworthiness", label: "Road Worthiness" },
  { value: "hackney_permit", label: "Hackney Permit" },
  { value: "vehicle_license", label: "Vehicle License" },
];

const FleetPage = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const { data: onboardingCounts } = useOpsOnboardingCounts();
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDocDialogOpen, setIsDocDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user, hasAnyRole, organizationId } = useAuth();
  const { logChange } = useAuditLog();
  const { config: tenantConfig } = useTenantConfig();

  // LD/LC: admins, ops_manager, org_admin, super_admin can add fleet.
  // ops_manager is additionally gated by tenant flag set by Logistics Manager.
  const isPrivileged = hasAnyRole(["admin", "super_admin", "org_admin"]);
  const isOpsManager = hasAnyRole(["ops_manager"]);
  const opsAllowed = (tenantConfig?.ops_can_add_vehicles ?? true) && (tenantConfig?.ops_can_add_fleet ?? true);
  const canManage = isPrivileged || (isOpsManager && opsAllowed);

  const [formData, setFormData] = useState({
    registration_number: "",
    vehicle_type: "",
    truck_type: "",
    make: "",
    model: "",
    year: "",
    capacity_kg: "",
    fuel_type: "diesel",
    ownership_type: "owned",
    image_url: "",
  });

  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [detailsVehicle, setDetailsVehicle] = useState<Vehicle | null>(null);

  const TRUCK_TYPES = ["3T", "5T", "10T", "15T", "20T", "30T", "45T", "60T"];

  const [docFormData, setDocFormData] = useState({
    document_type: "",
    document_name: "",
    expiry_date: "",
  });

  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);

  const resetForm = () => {
    setFormData({
      registration_number: "",
      vehicle_type: "",
      truck_type: "",
      make: "",
      model: "",
      year: "",
      capacity_kg: "",
      fuel_type: "diesel",
      ownership_type: "owned",
      image_url: "",
    });
    setEditingVehicle(null);
  };

  const openEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormData({
      registration_number: v.registration_number || "",
      vehicle_type: v.vehicle_type || "",
      truck_type: v.truck_type || "",
      make: v.make || "",
      model: v.model || "",
      year: v.year ? String(v.year) : "",
      capacity_kg: v.capacity_kg ? String(v.capacity_kg) : "",
      fuel_type: (v as any).fuel_type || "diesel",
      ownership_type: (v as any).ownership_type || "owned",
      image_url: v.image_url || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("vehicles").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      await logChange({ table_name: "vehicles", record_id: deleteTarget.id, action: "delete", old_data: deleteTarget as any });
      toast({ title: "Vehicle deleted" });
      setDeleteTarget(null);
      fetchVehicles();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const fetchVehicles = async () => {
    try {
      const orgFilter = organizationId ?? "00000000-0000-0000-0000-000000000000";
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("organization_id", orgFilter)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setVehicles(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch vehicles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicle_documents")
        .select("*")
        .order("expiry_date", { ascending: true });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
    }
  };

  useEffect(() => {
    if (organizationId !== undefined) {
      fetchVehicles();
      fetchDocuments();
    }
  }, [organizationId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.registration_number || !formData.vehicle_type) {
      toast({
        title: "Validation Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const insertData = {
        organization_id: organizationId ?? null,
        registration_number: formData.registration_number,
        vehicle_type: formData.vehicle_type,
        truck_type: formData.truck_type || null,
        make: formData.make || null,
        model: formData.model || null,
        year: formData.year ? parseInt(formData.year) : null,
        capacity_kg: formData.capacity_kg ? parseFloat(formData.capacity_kg) : null,
        fuel_type: formData.fuel_type,
        ownership_type: formData.ownership_type,
        image_url: formData.image_url || null,
      };

      let data: any = null;
      let error: any = null;
      if (editingVehicle) {
        const { organization_id, ...updateData } = insertData as any;
        const res = await supabase.from("vehicles").update(updateData).eq("id", editingVehicle.id).select().single();
        data = res.data; error = res.error;
      } else {
        const res = await supabase.from("vehicles").insert(insertData).select().single();
        data = res.data; error = res.error;
      }

      if (error) throw error;

      if (data) {
        await logChange({
          table_name: "vehicles",
          record_id: data.id,
          action: editingVehicle ? "update" : "insert",
          new_data: insertData,
        });
      }

      toast({
        title: "Success",
        description: editingVehicle ? "Vehicle updated" : "Vehicle added successfully",
      });
      setIsDialogOpen(false);
      resetForm();
      fetchVehicles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add vehicle",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddDocument = async () => {
    if (!selectedVehicle || !docFormData.document_type || !docFormData.document_name) {
      toast({
        title: "Validation Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const insertData = {
        vehicle_id: selectedVehicle.id,
        document_type: docFormData.document_type,
        document_name: docFormData.document_name,
        expiry_date: docFormData.expiry_date || null,
      };

      const { data, error } = await supabase.from("vehicle_documents").insert(insertData).select().single();

      if (error) throw error;

      // Log the creation
      if (data) {
        await logChange({
          table_name: "vehicle_documents",
          record_id: data.id,
          action: "insert",
          new_data: insertData,
        });
      }

      toast({
        title: "Success",
        description: "Document added successfully",
      });
      setIsDocDialogOpen(false);
      setDocFormData({
        document_type: "",
        document_name: "",
        expiry_date: "",
      });
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add document",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return { status: "expired", color: "text-destructive", label: "Expired" };
    if (days <= 30) return { status: "expiring", color: "text-warning", label: `${days} days left` };
    return { status: "valid", color: "text-success", label: format(new Date(expiryDate), "dd MMM yyyy") };
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      vehicle.registration_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vehicle.make?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (vehicle.model?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesStatus =
      statusFilter === "all" || vehicle.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const expiringDocs = documents.filter(doc => {
    if (!doc.expiry_date) return false;
    const days = differenceInDays(new Date(doc.expiry_date), new Date());
    return days <= 30 && days >= 0;
  });

  const expiredDocs = documents.filter(doc => {
    if (!doc.expiry_date) return false;
    return differenceInDays(new Date(doc.expiry_date), new Date()) < 0;
  });

  return (
    <DashboardLayout
      title="Fleet Management"
      subtitle="Manage your vehicle fleet, documents, and maintenance schedules"
    >
      {/* Onboarding Checklist (only when there are no vehicles yet) */}
      {vehicles.length === 0 && (
        <div className="mb-6">
          <OpsOnboardingChecklist
            fleetCount={onboardingCounts?.fleetCount ?? 0}
            vehicleCount={onboardingCounts?.vehicleCount ?? 0}
            driverCount={onboardingCounts?.driverCount ?? 0}
            dispatchCount={onboardingCounts?.dispatchCount ?? 0}
            orderCount={onboardingCounts?.orderCount ?? 0}
            routePlanCount={onboardingCounts?.routePlanCount ?? 0}
            waybillCount={onboardingCounts?.waybillCount ?? 0}
          />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Vehicles",
            value: vehicles.length,
            icon: Truck,
            color: "text-foreground",
          },
          {
            label: "Available",
            value: vehicles.filter((v) => v.status === "available").length,
            icon: CheckCircle,
            color: "text-success",
          },
          {
            label: "In Maintenance",
            value: vehicles.filter((v) => v.status === "maintenance").length,
            icon: Wrench,
            color: "text-warning",
          },
          {
            label: "Docs Expiring",
            value: expiringDocs.length + expiredDocs.length,
            icon: AlertTriangle,
            color: expiringDocs.length + expiredDocs.length > 0 ? "text-destructive" : "text-muted-foreground",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="glass-card p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className={`text-2xl font-heading font-bold ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Document Alerts */}
      {(expiringDocs.length > 0 || expiredDocs.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-lg border border-warning/30 bg-warning/10"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h3 className="font-semibold text-foreground">Document Alerts</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {expiredDocs.length > 0 && `${expiredDocs.length} expired document(s). `}
            {expiringDocs.length > 0 && `${expiringDocs.length} document(s) expiring within 30 days.`}
          </p>
        </motion.div>
      )}

      {/* Vehicle Health Score Section */}
      <div className="mb-6">
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-foreground mb-3 select-none">
            <span className="group-open:rotate-90 transition-transform">▶</span>
            Vehicle Health Scoring
          </summary>
          <VehicleHealthScore />
        </details>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
        <div className="flex gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search vehicles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50 border-border/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-secondary/50 border-border/50">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="in_use">In Use</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm(); }}>
            <EntitlementGate
              usageResource="vehicles"
              usageCurrent={vehicles.length}
              featureLabel="Add Vehicle"
            >
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => resetForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Vehicle
                </Button>
              </DialogTrigger>
            </EntitlementGate>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="font-heading">{editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
                <DialogDescription>
                  {editingVehicle ? "Update vehicle details." : "Enter vehicle details and documentation."}
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="specs">Specs</TabsTrigger>
                  <TabsTrigger value="photo">Photo</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="registration_number">Registration Number *</Label>
                      <Input
                        id="registration_number"
                        name="registration_number"
                        value={formData.registration_number}
                        onChange={handleInputChange}
                        placeholder="LAG-XXX-XX"
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicle_type">Vehicle Type *</Label>
                      <Select
                        value={formData.vehicle_type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_type: value }))}
                      >
                        <SelectTrigger className="bg-secondary/50">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light_truck">Light Truck</SelectItem>
                          <SelectItem value="medium_truck">Medium Truck</SelectItem>
                          <SelectItem value="heavy_truck">Heavy Truck</SelectItem>
                          <SelectItem value="trailer">Trailer</SelectItem>
                          <SelectItem value="tanker">Tanker</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="truck_type">Truck Capacity *</Label>
                      <Select
                        value={formData.truck_type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, truck_type: value }))}
                      >
                        <SelectTrigger className="bg-secondary/50">
                          <SelectValue placeholder="Select capacity" />
                        </SelectTrigger>
                        <SelectContent>
                          {TRUCK_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type} Truck
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ownership_type">Ownership Type</Label>
                      <Select
                        value={formData.ownership_type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, ownership_type: value }))}
                      >
                        <SelectTrigger className="bg-secondary/50">
                          <SelectValue placeholder="Select ownership" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owned">Owned</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="leased">Leased</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="make">Make</Label>
                      <Input
                        id="make"
                        name="make"
                        value={formData.make}
                        onChange={handleInputChange}
                        placeholder="e.g., Mercedes-Benz"
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        name="model"
                        value={formData.model}
                        onChange={handleInputChange}
                        placeholder="e.g., Actros"
                        className="bg-secondary/50"
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="specs" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <Input
                        id="year"
                        name="year"
                        type="number"
                        value={formData.year}
                        onChange={handleInputChange}
                        placeholder="2024"
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="capacity_kg">Capacity (kg)</Label>
                      <Input
                        id="capacity_kg"
                        name="capacity_kg"
                        type="number"
                        value={formData.capacity_kg}
                        onChange={handleInputChange}
                        placeholder="30000"
                        className="bg-secondary/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fuel_type">Fuel Type</Label>
                    <Select
                      value={formData.fuel_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, fuel_type: value }))}
                    >
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue placeholder="Select fuel type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="petrol">Petrol</SelectItem>
                        <SelectItem value="gas">Gas</SelectItem>
                        <SelectItem value="electric">Electric</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                <TabsContent value="photo" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Vehicle Photo</Label>
                    <p className="text-sm text-muted-foreground">
                      Upload a clear photo of the truck showing its type and condition
                    </p>
                  </div>
                  <VehicleImageUpload
                    currentImageUrl={formData.image_url || null}
                    onUploadComplete={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                    onRemove={() => setFormData(prev => ({ ...prev, image_url: "" }))}
                  />
                </TabsContent>
              </Tabs>
              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? "Saving..." : editingVehicle ? "Save Changes" : "Add Vehicle"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Vehicle Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="text-center py-12">
          <Truck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No vehicles found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle, index) => {
            const statusInfo = statusConfig[vehicle.status || "available"] || statusConfig.available;
            const StatusIcon = statusInfo.icon;
            const vehicleDocs = documents.filter(d => d.vehicle_id === vehicle.id);
            const hasExpiringDocs = vehicleDocs.some(d => {
              if (!d.expiry_date) return false;
              const days = differenceInDays(new Date(d.expiry_date), new Date());
              return days <= 30;
            });

            return (
              <motion.div
                key={vehicle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="glass-card p-6 hover:border-primary/30 transition-all duration-300"
              >
                {/* Vehicle Image */}
                <div className="w-full h-28 rounded-lg overflow-hidden bg-secondary/30 mb-4 -mt-2 -mx-2" style={{ width: 'calc(100% + 16px)' }}>
                  {vehicle.image_url ? (
                    <img 
                      src={vehicle.image_url} 
                      alt={vehicle.registration_number}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Truck className="w-12 h-12 text-muted-foreground/20" />
                    </div>
                  )}
                </div>

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {vehicle.registration_number}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {vehicle.make} {vehicle.model}
                    </p>
                  </div>
                  {hasExpiringDocs && (
                    <AlertTriangle className="w-5 h-5 text-warning" />
                  )}
                </div>

                {/* Status & Type */}
                <div className="flex items-center gap-2 mb-4">
                  <Badge className={statusInfo.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusInfo.label}
                  </Badge>
                  <Badge variant="outline" className="text-muted-foreground">
                    {vehicle.vehicle_type.replace("_", " ")}
                  </Badge>
                </div>

                {/* Details */}
                <div className="space-y-3 mb-4">
                  {vehicle.capacity_kg && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Capacity</span>
                      <span className="text-foreground">{vehicle.capacity_kg.toLocaleString()} kg</span>
                    </div>
                  )}
                  {vehicle.year && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Year</span>
                      <span className="text-foreground">{vehicle.year}</span>
                    </div>
                  )}
                </div>

                {/* Fuel Level */}
                {vehicle.current_fuel_level !== null && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Fuel className="w-4 h-4" />
                        Fuel Level
                      </span>
                      <span className="text-foreground">{vehicle.current_fuel_level}%</span>
                    </div>
                    <Progress value={vehicle.current_fuel_level} className="h-2" />
                  </div>
                )}

                {/* Documents Summary */}
                <div className="pt-4 border-t border-border/50 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      Documents
                    </span>
                    <span className="text-foreground">{vehicleDocs.length} uploaded</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[88px]"
                    onClick={() => {
                      setSelectedVehicle(vehicle);
                      setIsDocDialogOpen(true);
                    }}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Doc
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 min-w-[88px]"
                    onClick={() => {
                      setDetailsVehicle(vehicle);
                      setIsDetailsDialogOpen(true);
                    }}
                  >
                    Details
                  </Button>
                  {canManage && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(vehicle)}
                        aria-label="Edit vehicle"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(vehicle)}
                        aria-label="Delete vehicle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Document Dialog */}
      <Dialog open={isDocDialogOpen} onOpenChange={setIsDocDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-heading">
              Add Document - {selectedVehicle?.registration_number}
            </DialogTitle>
            <DialogDescription>
              Upload vehicle documentation with expiry tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="document_type">Document Type *</Label>
              <Select
                value={docFormData.document_type}
                onValueChange={(value) => setDocFormData(prev => ({ ...prev, document_type: value }))}
              >
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_name">Document Name *</Label>
              <Input
                id="document_name"
                value={docFormData.document_name}
                onChange={(e) => setDocFormData(prev => ({ ...prev, document_name: e.target.value }))}
                placeholder="e.g., Insurance Certificate 2025"
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                value={docFormData.expiry_date}
                onChange={(e) => setDocFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                className="bg-secondary/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDocDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDocument} disabled={saving}>
              {saving ? "Adding..." : "Add Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vehicle Details Dialog */}
      <VehicleDetailsDialog
        vehicle={detailsVehicle}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.registration_number} will be permanently removed. Related documents and history will also be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default FleetPage;