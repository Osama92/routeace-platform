import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Handshake,
  Building2,
  FileText,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  CheckCircle,
  XCircle,
  Truck,
  Package,
  Users,
  CreditCard,
  Pencil,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import ApprovalDecisionHistory from "@/components/approvals/ApprovalDecisionHistory";
import CustomerVendorBulkUpload from "@/components/approvals/CustomerVendorBulkUpload";

interface Partner {
  id: string;
  company_name: string;
  partner_type: string;
  cac_number: string | null;
  tin_number: string | null;
  director_name: string | null;
  director_phone: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  is_verified: boolean;
  notes: string | null;
  created_at: string;
}

const Partners = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user, hasAnyRole, organizationId, userRole } = useAuth();
  const { logChange } = useAuditLog();

  const [formData, setFormData] = useState({
    company_name: "",
    partner_type: "",
    cac_number: "",
    tin_number: "",
    director_name: "",
    director_phone: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    city: "",
    state: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
    notes: "",
  });

  const [editFormData, setEditFormData] = useState({
    company_name: "",
    partner_type: "",
    cac_number: "",
    tin_number: "",
    director_name: "",
    director_phone: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    city: "",
    state: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
    notes: "",
  });

  const canManage = hasAnyRole([
    "ops_manager",
    "org_admin",
    "super_admin",
    "admin",
  ]);

  const fetchPartners = async () => {
    if (!organizationId) return;
    try {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("approval_status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const ids = (data || []).map((p: any) => p.id);
      let sensitiveMap: Record<string, any> = {};
      if (ids.length > 0) {
        const { data: sensitive } = await supabase
          .from("partner_sensitive_details")
          .select("partner_id, director_nin, bank_name, bank_account_name, bank_account_number")
          .in("partner_id", ids);
        for (const row of sensitive || []) {
          sensitiveMap[(row as any).partner_id] = row;
        }
      }

      const merged: Partner[] = (data || []).map((p: any) => ({
        ...p,
        bank_name: sensitiveMap[p.id]?.bank_name ?? null,
        bank_account_name: sensitiveMap[p.id]?.bank_account_name ?? null,
        bank_account_number: sensitiveMap[p.id]?.bank_account_number ?? null,
      }));
      setPartners(merged);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch partners",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) fetchPartners();
  }, [organizationId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.company_name || !formData.partner_type ||
        !formData.contact_name || !formData.contact_email || !formData.contact_phone) {
      toast({
        title: "Validation Error",
        description: "Company name, type, contact name, email and phone are required.",
        variant: "destructive",
      });
      return;
    }
    if (!organizationId) {
      toast({ title: "Error", description: "Organisation not found.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const approvalStatus =
        userRole === "super_admin" || userRole === "admin"
          ? "active"
          : userRole === "org_admin"
          ? "pending_sa"
          : "pending_coo";

      const insertData = {
        company_name: formData.company_name,
        partner_type: formData.partner_type,
        cac_number: formData.cac_number || null,
        tin_number: formData.tin_number || null,
        director_name: formData.director_name || null,
        director_phone: formData.director_phone || null,
        contact_name: formData.contact_name,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        notes: formData.notes || null,
        created_by: user?.id,
        organization_id: organizationId,
        approval_status: approvalStatus,
      };

      const { data, error } = await supabase
        .from("partners")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Persist sensitive fields separately (RLS restricts to finance/admin roles)
        if (formData.bank_name || formData.bank_account_name || formData.bank_account_number) {
          const { error: sErr } = await supabase
            .from("partner_sensitive_details")
            .insert([{
              partner_id: data.id,
              organization_id: organizationId,
              bank_name: formData.bank_name || null,
              bank_account_name: formData.bank_account_name || null,
              bank_account_number: formData.bank_account_number || null,
            }]);
          if (sErr) console.warn("Could not save sensitive partner details:", sErr.message);
        }

        await logChange({
          table_name: "partners",
          record_id: data.id,
          action: "insert",
          new_data: insertData,
        });
      }

      const successMsg =
        approvalStatus === "active"
          ? "Vendor added and activated."
          : approvalStatus === "pending_sa"
          ? "Vendor submitted. Awaiting Super Admin approval."
          : "Vendor submitted. Awaiting COO approval first.";

      toast({ title: "Success", description: successMsg });
      setIsDialogOpen(false);

      setFormData({
        company_name: "", partner_type: "", cac_number: "",
        tin_number: "", director_name: "", director_phone: "",
        contact_name: "", contact_email: "", contact_phone: "",
        address: "", city: "", state: "", bank_name: "",
        bank_account_number: "", bank_account_name: "", notes: "",
      });

      if (approvalStatus === "active") fetchPartners();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add vendor.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyPartner = async () => {
    if (!selectedPartner) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("partners")
        .update({ 
          is_verified: true,
          approval_status: "approved"
        })
        .eq("id", selectedPartner.id);

      if (error) throw error;

      await logChange({
        table_name: "partners",
        record_id: selectedPartner.id,
        action: "update",
        old_data: { is_verified: false },
        new_data: { is_verified: true, approval_status: "approved" },
      });

      toast({
        title: "Partner Verified",
        description: `${selectedPartner.company_name} has been verified successfully`,
      });
      setIsVerifyDialogOpen(false);
      setSelectedPartner(null);
      fetchPartners();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify partner",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditPartner = async () => {
    if (!selectedPartner) return;

    setSaving(true);
    try {
      const updateData = {
        company_name: editFormData.company_name,
        partner_type: editFormData.partner_type,
        cac_number: editFormData.cac_number || null,
        tin_number: editFormData.tin_number || null,
        director_name: editFormData.director_name || null,
        director_phone: editFormData.director_phone || null,
        contact_name: editFormData.contact_name,
        contact_email: editFormData.contact_email,
        contact_phone: editFormData.contact_phone,
        address: editFormData.address || null,
        city: editFormData.city || null,
        state: editFormData.state || null,
        notes: editFormData.notes || null,
      };

      const { error } = await supabase
        .from("partners")
        .update(updateData)
        .eq("id", selectedPartner.id);

      if (error) throw error;

      // Upsert sensitive fields separately (RLS restricts to finance/admin roles)
      const { error: sErr } = await supabase
        .from("partner_sensitive_details")
        .upsert([{
          partner_id: selectedPartner.id,
          organization_id: organizationId!,
          bank_name: editFormData.bank_name || null,
          bank_account_name: editFormData.bank_account_name || null,
          bank_account_number: editFormData.bank_account_number || null,
        }], { onConflict: "partner_id" });
      if (sErr) console.warn("Could not save sensitive partner details:", sErr.message);

      await logChange({
        table_name: "partners",
        record_id: selectedPartner.id,
        action: "update",
        old_data: selectedPartner,
        new_data: updateData,
      });

      toast({
        title: "Partner Updated",
        description: `${editFormData.company_name} has been updated successfully`,
      });
      setIsEditDialogOpen(false);
      setSelectedPartner(null);
      fetchPartners();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update partner",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (partner: Partner) => {
    setSelectedPartner(partner);
    setEditFormData({
      company_name: partner.company_name,
      partner_type: partner.partner_type,
      cac_number: partner.cac_number || "",
      tin_number: partner.tin_number || "",
      director_name: partner.director_name || "",
      director_phone: partner.director_phone || "",
      contact_name: partner.contact_name,
      contact_email: partner.contact_email,
      contact_phone: partner.contact_phone,
      address: partner.address || "",
      city: partner.city || "",
      state: partner.state || "",
      bank_name: partner.bank_name || "",
      bank_account_number: partner.bank_account_number || "",
      bank_account_name: partner.bank_account_name || "",
      notes: partner.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const openVerifyDialog = (partner: Partner) => {
    setSelectedPartner(partner);
    setIsVerifyDialogOpen(true);
  };

  const openDetailsDialog = (partner: Partner) => {
    setSelectedPartner(partner);
    setIsDetailsDialogOpen(true);
  };

  const filteredPartners = partners.filter((partner) => {
    const matchesSearch =
      partner.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.contact_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || partner.partner_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const transporters = partners.filter(p => p.partner_type === "transporter");
  const vendors = partners.filter(p => p.partner_type === "vendor");

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "transporter":
        return <Truck className="w-5 h-5 text-primary" />;
      case "vendor":
        return <Package className="w-5 h-5 text-warning" />;
      case "3pl":
        return <Users className="w-5 h-5 text-info" />;
      default:
        return <Building2 className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      transporter: "bg-primary/15 text-primary",
      vendor: "bg-warning/15 text-warning",
      "3pl": "bg-info/15 text-info",
    };
    return styles[type] || "bg-muted text-muted-foreground";
  };

  return (
    <DashboardLayout
      title="Partners & Vendors"
      subtitle="Manage transporters, vendors, and 3PL partners"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <Handshake className="w-6 h-6 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground">{partners.length}</p>
              <p className="text-sm text-muted-foreground">Total Partners</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground">{transporters.length}</p>
              <p className="text-sm text-muted-foreground">Transporters</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
              <Package className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground">{vendors.length}</p>
              <p className="text-sm text-muted-foreground">Vendors</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground">
                {partners.filter(p => p.is_verified).length}
              </p>
              <p className="text-sm text-muted-foreground">Verified</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
        <div className="flex gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search partners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50 border-border/50"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 bg-secondary/50 border-border/50">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="transporter">Transporters</SelectItem>
              <SelectItem value="vendor">Vendors</SelectItem>
              <SelectItem value="3pl">3PL Partners</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canManage && organizationId && (
          <CustomerVendorBulkUpload
            entityType="partners"
            organizationId={organizationId}
            onComplete={fetchPartners}
          />
        )}

        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Partner
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading">Onboard New Partner/Vendor</DialogTitle>
                <DialogDescription>
                  Enter the complete business details to add a new partner.
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="business" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="business">Business Info</TabsTrigger>
                  <TabsTrigger value="director">Director/Contact</TabsTrigger>
                  <TabsTrigger value="banking">Banking Details</TabsTrigger>
                </TabsList>
                
                <TabsContent value="business" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Company Name *</Label>
                      <Input
                        id="company_name"
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleInputChange}
                        placeholder="XYZ Logistics Ltd"
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="partner_type">Partner Type *</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger type="button">
                              <Info className="w-3.5 h-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="text-xs space-y-2">
                                <p><strong>Transporter:</strong> Third-party trucking companies you dispatch work to</p>
                                <p><strong>Vendor:</strong> Suppliers (fuel, maintenance, parts) for setting deployment targets</p>
                                <p><strong>3PL:</strong> Full-service logistics providers for end-to-end operations</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select
                        value={formData.partner_type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, partner_type: value }))}
                      >
                        <SelectTrigger className="bg-secondary/50">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="transporter">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-primary" />
                              <span>Transporter</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="vendor">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-warning" />
                              <span>Vendor</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="3pl">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-info" />
                              <span>3PL Partner</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cac_number">CAC Number</Label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="cac_number"
                          name="cac_number"
                          value={formData.cac_number}
                          onChange={handleInputChange}
                          placeholder="RC 123456"
                          className="pl-10 bg-secondary/50"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tin_number">TIN Number</Label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="tin_number"
                          name="tin_number"
                          value={formData.tin_number}
                          onChange={handleInputChange}
                          placeholder="12345678-0001"
                          className="pl-10 bg-secondary/50"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="123 Business District"
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Lagos"
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="Lagos State"
                        className="bg-secondary/50"
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="director" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="director_name">Director's Name</Label>
                      <Input
                        id="director_name"
                        name="director_name"
                        value={formData.director_name}
                        onChange={handleInputChange}
                        placeholder="Chief John Okafor"
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="director_phone">Director's Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="director_phone"
                          name="director_phone"
                          value={formData.director_phone}
                          onChange={handleInputChange}
                          placeholder="+234 800 123 4567"
                          className="pl-10 bg-secondary/50"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-border/50 pt-4 mt-4">
                    <h4 className="text-sm font-medium text-foreground mb-4">Primary Contact Person</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contact_name">Contact Name *</Label>
                        <Input
                          id="contact_name"
                          name="contact_name"
                          value={formData.contact_name}
                          onChange={handleInputChange}
                          placeholder="Jane Doe"
                          className="bg-secondary/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact_phone">Contact Phone *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="contact_phone"
                            name="contact_phone"
                            value={formData.contact_phone}
                            onChange={handleInputChange}
                            placeholder="+234 800 987 6543"
                            className="pl-10 bg-secondary/50"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="contact_email">Contact Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="contact_email"
                          name="contact_email"
                          type="email"
                          value={formData.contact_email}
                          onChange={handleInputChange}
                          placeholder="contact@company.com"
                          className="pl-10 bg-secondary/50"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="banking" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="bank_name"
                        name="bank_name"
                        value={formData.bank_name}
                        onChange={handleInputChange}
                        placeholder="First Bank Nigeria"
                        className="pl-10 bg-secondary/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bank_account_number">Account Number</Label>
                      <Input
                        id="bank_account_number"
                        name="bank_account_number"
                        value={formData.bank_account_number}
                        onChange={handleInputChange}
                        placeholder="0123456789"
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank_account_name">Account Name</Label>
                      <Input
                        id="bank_account_name"
                        name="bank_account_name"
                        value={formData.bank_account_name}
                        onChange={handleInputChange}
                        placeholder="XYZ Logistics Ltd"
                        className="bg-secondary/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Any additional information..."
                      className="bg-secondary/50"
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? "Adding..." : "Add Partner"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Partners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-muted-foreground">Loading partners...</span>
            </div>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Handshake className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No partners found</p>
            <p className="text-sm text-muted-foreground/70">Add your first partner to get started</p>
          </div>
        ) : (
          filteredPartners.map((partner, index) => (
            <motion.div
              key={partner.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="glass-card p-6 hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    {getTypeIcon(partner.partner_type)}
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">{partner.company_name}</h3>
                    <span className={`status-badge ${getTypeBadge(partner.partner_type)} mt-1`}>
                      {partner.partner_type.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {partner.is_verified ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                  {canManage && (
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(partner)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>{partner.contact_email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{partner.contact_phone}</span>
                </div>
                {partner.city && partner.state && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{partner.city}, {partner.state}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border/50 grid grid-cols-2 gap-4 text-sm">
                {partner.cac_number && (
                  <div>
                    <p className="text-muted-foreground/70">CAC No.</p>
                    <p className="font-medium text-foreground">{partner.cac_number}</p>
                  </div>
                )}
                {partner.tin_number && (
                  <div>
                    <p className="text-muted-foreground/70">TIN</p>
                    <p className="font-medium text-foreground">{partner.tin_number}</p>
                  </div>
                )}
                {partner.director_name && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground/70">Director</p>
                    <p className="font-medium text-foreground">{partner.director_name}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openDetailsDialog(partner)}>
                  View Details
                </Button>
                {!partner.is_verified && canManage && (
                  <Button size="sm" className="flex-1" onClick={() => openVerifyDialog(partner)}>
                    Verify
                  </Button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Verify Dialog */}
      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-heading">Verify Partner</DialogTitle>
            <DialogDescription>
              Are you sure you want to verify {selectedPartner?.company_name}? This will mark them as an approved partner.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsVerifyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerifyPartner} disabled={saving}>
              {saving ? "Verifying..." : "Verify Partner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Partner</DialogTitle>
            <DialogDescription>
              Update the partner's information.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="business" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="business">Business Info</TabsTrigger>
              <TabsTrigger value="director">Director/Contact</TabsTrigger>
              <TabsTrigger value="banking">Banking Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="business" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input
                    name="company_name"
                    value={editFormData.company_name}
                    onChange={handleEditInputChange}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Partner Type *</Label>
                  <Select
                    value={editFormData.partner_type}
                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, partner_type: value }))}
                  >
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transporter">Transporter</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="3pl">3PL Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CAC Number</Label>
                  <Input
                    name="cac_number"
                    value={editFormData.cac_number}
                    onChange={handleEditInputChange}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>TIN Number</Label>
                  <Input
                    name="tin_number"
                    value={editFormData.tin_number}
                    onChange={handleEditInputChange}
                    className="bg-secondary/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  name="address"
                  value={editFormData.address}
                  onChange={handleEditInputChange}
                  className="bg-secondary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    name="city"
                    value={editFormData.city}
                    onChange={handleEditInputChange}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    name="state"
                    value={editFormData.state}
                    onChange={handleEditInputChange}
                    className="bg-secondary/50"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="director" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Director's Name</Label>
                  <Input
                    name="director_name"
                    value={editFormData.director_name}
                    onChange={handleEditInputChange}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Director's Phone</Label>
                  <Input
                    name="director_phone"
                    value={editFormData.director_phone}
                    onChange={handleEditInputChange}
                    className="bg-secondary/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name *</Label>
                  <Input
                    name="contact_name"
                    value={editFormData.contact_name}
                    onChange={handleEditInputChange}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone *</Label>
                  <Input
                    name="contact_phone"
                    value={editFormData.contact_phone}
                    onChange={handleEditInputChange}
                    className="bg-secondary/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Contact Email *</Label>
                <Input
                  name="contact_email"
                  type="email"
                  value={editFormData.contact_email}
                  onChange={handleEditInputChange}
                  className="bg-secondary/50"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="banking" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  name="bank_name"
                  value={editFormData.bank_name}
                  onChange={handleEditInputChange}
                  className="bg-secondary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    name="bank_account_number"
                    value={editFormData.bank_account_number}
                    onChange={handleEditInputChange}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input
                    name="bank_account_name"
                    value={editFormData.bank_account_name}
                    onChange={handleEditInputChange}
                    className="bg-secondary/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  name="notes"
                  value={editFormData.notes}
                  onChange={handleEditInputChange}
                  className="bg-secondary/50"
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditPartner} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              {selectedPartner && getTypeIcon(selectedPartner.partner_type)}
              {selectedPartner?.company_name}
            </DialogTitle>
            <DialogDescription>
              Partner details and information
            </DialogDescription>
          </DialogHeader>
          
          {selectedPartner && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center gap-2">
                <span className={`status-badge ${getTypeBadge(selectedPartner.partner_type)}`}>
                  {selectedPartner.partner_type.toUpperCase()}
                </span>
                {selectedPartner.is_verified ? (
                  <span className="status-badge bg-success/15 text-success">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </span>
                ) : (
                  <span className="status-badge bg-muted text-muted-foreground">
                    Pending Verification
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Contact Person</p>
                  <p className="font-medium">{selectedPartner.contact_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedPartner.contact_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedPartner.contact_phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedPartner.city || "-"}, {selectedPartner.state || "-"}</p>
                </div>
              </div>

              {(selectedPartner.cac_number || selectedPartner.tin_number) && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">Registration Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedPartner.cac_number && (
                      <div>
                        <p className="text-sm text-muted-foreground">CAC Number</p>
                        <p className="font-medium">{selectedPartner.cac_number}</p>
                      </div>
                    )}
                    {selectedPartner.tin_number && (
                      <div>
                        <p className="text-sm text-muted-foreground">TIN Number</p>
                        <p className="font-medium">{selectedPartner.tin_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedPartner.director_name && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">Director Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Director Name</p>
                      <p className="font-medium">{selectedPartner.director_name}</p>
                    </div>
                    {selectedPartner.director_phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Director Phone</p>
                        <p className="font-medium">{selectedPartner.director_phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedPartner.bank_name && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">Banking Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Bank</p>
                      <p className="font-medium">{selectedPartner.bank_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Number</p>
                      <p className="font-medium">{selectedPartner.bank_account_number}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Account Name</p>
                      <p className="font-medium">{selectedPartner.bank_account_name}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedPartner.notes && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedPartner.notes}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
            {canManage && selectedPartner && (
              <Button onClick={() => {
                setIsDetailsDialogOpen(false);
                openEditDialog(selectedPartner);
              }}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {organizationId && (
        <div className="mt-6">
          <ApprovalDecisionHistory entityType="partners" organizationId={organizationId} title="Vendor Approval History" />
        </div>
      )}
    </DashboardLayout>
  );
};

export default Partners;