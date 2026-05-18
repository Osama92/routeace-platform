import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Loader2, Upload, Camera, FileText, CreditCard } from "lucide-react";

const CreateDriverDialog = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    license_number: "",
    license_expiry: "",
    driver_type: "owned",
    salary_type: "monthly",
    base_salary: "",
    tax_id: "",
    profile_picture_url: "",
    license_document_url: "",
    nin_document_url: "",
  });

  const profileRef = useRef<HTMLInputElement>(null);
  const licenseRef = useRef<HTMLInputElement>(null);
  const ninRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, bucket: string, folder: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    // All these buckets are now private; consumers create signed URLs on demand via StorageImage.
    return path;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "profile_picture_url" | "license_document_url" | "nin_document_url") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({ title: "File too large", description: "Maximum file size is 5MB", variant: "destructive" });
      return;
    }

    setUploading(field);
    // Profile photo → public bucket; sensitive identity docs (licence, NIN) → private bucket
    const bucket = field === "profile_picture_url" ? "profile-pictures" : "driver-documents";
    const folder = field === "profile_picture_url" ? "drivers" : field === "license_document_url" ? "driver-licenses" : "driver-nin";
    const url = await uploadFile(file, bucket, folder);
    if (url) {
      setForm((p) => ({ ...p, [field]: url }));
      toast({ title: "Uploaded", description: `${field === "profile_picture_url" ? "Photo" : field === "license_document_url" ? "License" : "NIN"} uploaded successfully` });
    }
    setUploading(null);
  };

  const handleSubmit = async () => {
    if (!form.full_name || !form.phone) {
      toast({ title: "Missing fields", description: "Full name and phone are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: inserted, error } = await supabase.from("drivers").insert({
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone,
        license_number: form.license_number || null,
        license_expiry: form.license_expiry || null,
        driver_type: form.driver_type,
        salary_type: form.salary_type,
        base_salary: form.base_salary ? parseFloat(form.base_salary) : 0,
        profile_picture_url: form.profile_picture_url || null,
        license_document_url: form.license_document_url || null,
      }).select("id, organization_id").single();

      if (error) throw error;

      // Persist sensitive identity fields (tax_id, NIN doc path) to restricted table.
      if (inserted && (form.tax_id || form.nin_document_url)) {
        await supabase.from("driver_sensitive_details").upsert({
          driver_id: inserted.id,
          organization_id: (inserted as any).organization_id ?? null,
          tax_id: form.tax_id || null,
          nin_document_url: form.nin_document_url || null,
        }, { onConflict: "driver_id" });
      }

      toast({ title: "Driver added", description: `${form.full_name} registered successfully` });
      queryClient.invalidateQueries({ queryKey: ["available-drivers"] });
      queryClient.invalidateQueries({ queryKey: ["ops-drivers-list"] });
      setOpen(false);
      setForm({ full_name: "", email: "", phone: "", license_number: "", license_expiry: "", driver_type: "owned", salary_type: "monthly", base_salary: "", tax_id: "", profile_picture_url: "", license_document_url: "", nin_document_url: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const FileUploadButton = ({ label, icon: Icon, field, inputRef, accept }: { label: string; icon: React.ComponentType<{ className?: string }>; field: "profile_picture_url" | "license_document_url" | "nin_document_url"; inputRef: React.RefObject<HTMLInputElement>; accept: string }) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => handleFileUpload(e, field)} />
      <Button
        type="button"
        variant={form[field] ? "default" : "outline"}
        size="sm"
        className="w-full mt-1 text-xs"
        onClick={() => inputRef.current?.click()}
        disabled={uploading === field}
      >
        {uploading === field ? (
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        ) : (
          <Icon className="w-3 h-3 mr-1" />
        )}
        {form[field] ? "✓ Uploaded" : `Upload ${label}`}
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Users className="w-3 h-3 mr-1" />Add Driver</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register New Driver</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} placeholder="Enter full name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+234..." />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>License Number</Label>
              <Input value={form.license_number} onChange={(e) => setForm((p) => ({ ...p, license_number: e.target.value }))} placeholder="DL number" />
            </div>
            <div>
              <Label>License Expiry</Label>
              <Input type="date" value={form.license_expiry} onChange={(e) => setForm((p) => ({ ...p, license_expiry: e.target.value }))} />
            </div>
          </div>

          {/* Document Uploads */}
          <div className="border border-border rounded-lg p-3 space-y-2">
            <Label className="text-sm font-semibold">Documents & Photo</Label>
            <div className="grid grid-cols-3 gap-2">
              <FileUploadButton label="Profile Photo" icon={Camera} field="profile_picture_url" inputRef={profileRef as React.RefObject<HTMLInputElement>} accept="image/*" />
              <FileUploadButton label="License Doc" icon={FileText} field="license_document_url" inputRef={licenseRef as React.RefObject<HTMLInputElement>} accept="image/*,.pdf" />
              <FileUploadButton label="NIN Document" icon={CreditCard} field="nin_document_url" inputRef={ninRef as React.RefObject<HTMLInputElement>} accept="image/*,.pdf" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Driver Ownership *</Label>
              <Select value={form.driver_type} onValueChange={(v) => setForm((p) => ({ ...p, driver_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owned">Internal (Company)</SelectItem>
                  <SelectItem value="third_party">3PL / Vendor</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Salary Type</Label>
              <Select value={form.salary_type} onValueChange={(v) => setForm((p) => ({ ...p, salary_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="per_trip">Per Trip</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Base Salary (₦)</Label>
              <Input type="number" value={form.base_salary} onChange={(e) => setForm((p) => ({ ...p, base_salary: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <Label>Tax ID</Label>
              <Input value={form.tax_id} onChange={(e) => setForm((p) => ({ ...p, tax_id: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Register Driver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDriverDialog;
