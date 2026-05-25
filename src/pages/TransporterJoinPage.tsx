import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Truck, CheckCircle, Clock, AlertTriangle, Upload,
  FileText, Mail, Phone, Shield, X,
} from "lucide-react";

const VEHICLE_TYPES = [
  "Bike / Motorcycle", "Van / Small Truck (<3T)", "5-Tonne Truck",
  "10-Tonne Truck", "15-Tonne Truck", "20-Tonne Articulated",
  "30-Tonne Articulated", "Refrigerated Truck", "Flatbed",
];

type PageState = "loading" | "ready" | "invalid" | "submitted";
const PUBLIC_ROUTEACE_ORIGIN = "https://routeace.app";
const normalizeLinkType = (value: string | null): "new" | "access" | "vendor" =>
  value === "new" ? "new" : value === "vendor" ? "vendor" : "access";

const isLovableOrLocalHost = (hostname: string) =>
  hostname.includes("id-preview--") ||
  hostname.endsWith(".lovable.app") ||
  hostname.endsWith(".lovableproject.com") ||
  hostname === "localhost";

const UploadField = ({
  label, required = false, hint, accept, value, onChange, orgId, token, folder,
}: {
  label: string; required?: boolean; hint?: string; accept?: string;
  value: string; onChange: (url: string) => void;
  orgId: string; token: string; folder: string;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const path = `${orgId}/${token}/${folder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage
        .from("transporter-onboarding-docs")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      onChange(path);
      setFileName(file.name);
      toast.success(`${label} uploaded`);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <div
        className="border-2 border-dashed border-border hover:border-primary/40 rounded-lg p-4 cursor-pointer bg-muted/20 transition-colors"
        onClick={() => ref.current?.click()}
      >
        {value ? (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span className="truncate">{fileName || "Uploaded"}</span>
          </div>
        ) : uploading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
            Uploading…
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center gap-1">
            <Upload className="w-5 h-5 text-muted-foreground" />
            <p className="text-xs">Click to upload {label.toLowerCase()}</p>
            {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
          </div>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept={accept ?? "image/*,application/pdf"}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
};

const MultiPhotoUpload = ({
  label, values, onChange, orgId, token, folder,
}: {
  label: string; values: string[]; onChange: (urls: string[]) => void;
  orgId: string; token: string; folder: string;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const path = `${orgId}/${token}/${folder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage
        .from("transporter-onboarding-docs")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      onChange([...values, path]);
      toast.success("Photo added");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {values.map((url, i) => (
          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border bg-muted/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-muted-foreground" aria-label={`Truck ${i + 1} uploaded`} />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        <div
          onClick={() => ref.current?.click()}
          className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/40 cursor-pointer flex items-center justify-center bg-muted/20"
        >
          {uploading
            ? <span className="w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
            : <Upload className="w-5 h-5 text-muted-foreground" />}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">Upload clear photos of each truck (exterior, sides, interior)</p>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
};

export default function TransporterJoinPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const linkType = normalizeLinkType(searchParams.get("type"));

  const [pageState, setPageState] = useState<PageState>("loading");
  const [orgName, setOrgName] = useState("");
  const [orgId, setOrgId] = useState("");
  const [isLc, setIsLc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const [form, setForm] = useState({
    company_name: "", contact_name: "", phone: "", email: "",
    vehicle_count: "1", coverage_areas: "", vehicle_types: [] as string[],
    cac_number: "", rates_notes: "",
  });

  const [docs, setDocs] = useState({
    cac_document_url: "",
    insurance_document_url: "",
    mou_document_url: "",
    letter_of_intent_url: "",
    rates_proposal_url: "",
    truck_photos_urls: [] as string[],
  });

  useEffect(() => {
    if (!token) { setPageState("invalid"); return; }
    if (isLovableOrLocalHost(window.location.hostname)) {
      const redirectUrl = `${PUBLIC_ROUTEACE_ORIGIN}/transporter/join/${token}?type=${linkType}`;
      console.log("[TransporterJoinPage] Redirecting LD public intake off preview domain", {
        currentHost: window.location.hostname,
        currentOrigin: window.location.origin,
        redirectUrl,
        linkType,
      });
      window.location.replace(redirectUrl);
      return;
    }
    supabase.functions.invoke("transporter-self-signup", {
      body: { token, validate_only: true, link_type: linkType },
    }).then(({ data }) => {
      setDebugInfo(data);
      if (data?.valid && data?.org_name) {
        setOrgName(data.org_name);
        setOrgId(data.org_id ?? "");
        setIsLc(data.tenant_mode === "LOGISTICS_COMPANY");
        setPageState("ready");
      } else {
        setPageState("invalid");
      }
    }).catch((e) => {
      setDebugInfo({ error: e?.message });
      setPageState("invalid");
    });
  }, [token, linkType]);

  const toggleVehicleType = (vt: string) =>
    setForm((f) => ({
      ...f,
      vehicle_types: f.vehicle_types.includes(vt)
        ? f.vehicle_types.filter((x) => x !== vt)
        : [...f.vehicle_types, vt],
    }));

  const handleSubmit = async () => {
    if (!form.company_name || !form.contact_name || !form.phone) {
      toast.error("Company name, contact name, and phone number are required");
      return;
    }
    if (!form.email) {
      toast.error("Email address is required - login credentials will be sent there");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (linkType === "new") {
      if (!docs.cac_document_url) { toast.error("CAC Certificate is required for new partner onboarding"); return; }
      if (!docs.insurance_document_url) { toast.error("Insurance document is required for new partner onboarding"); return; }
      if (!docs.letter_of_intent_url) { toast.error("Letter of Intent / Motivation Letter is required"); return; }
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        token,
        company_name: form.company_name,
        contact_name: form.contact_name,
        phone: form.phone,
        email: form.email,
        vehicle_count: parseInt(form.vehicle_count) || 1,
        vehicle_types: form.vehicle_types,
        coverage_areas: form.coverage_areas || undefined,
        cac_number: form.cac_number || undefined,
        link_type: linkType,
      };
      if (linkType === "new") {
        Object.assign(payload, {
          cac_document_url: docs.cac_document_url || undefined,
          insurance_document_url: docs.insurance_document_url || undefined,
          mou_document_url: docs.mou_document_url || undefined,
          letter_of_intent_url: docs.letter_of_intent_url || undefined,
          rates_proposal_url: docs.rates_proposal_url || undefined,
          truck_photos_urls: docs.truck_photos_urls.length > 0 ? docs.truck_photos_urls : undefined,
        });
      }

      const { data, error } = await supabase.functions.invoke("transporter-self-signup", { body: payload });
      if (error || !data?.success) {
        toast.error(data?.error ?? error?.message ?? "Registration failed. Please try again.");
        return;
      }
      setPageState("submitted");
    } catch (e: any) {
      toast.error(e.message ?? "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (pageState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <span className="inline-block w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Verifying invite link…</p>
        </div>
      </div>
    );
  }

  if (pageState === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold">Invalid or Expired Link</h2>
            <p className="text-sm text-muted-foreground">
              This invite link is invalid, has expired (links are valid for 72 hours),
              or has been deactivated. Please ask the Logistics Manager to generate
              a new link and share it with you.
            </p>
            {debugInfo && (
              <details className="text-left mt-4">
                <summary className="text-xs text-muted-foreground cursor-pointer">Technical details</summary>
                <pre className="text-[10px] bg-muted p-2 rounded mt-1 overflow-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === "submitted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">
              {linkType === "new" ? "Application Submitted!" : "Registration Successful!"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Your login credentials have been sent to your email address.
              Please check your inbox (and spam folder).
            </p>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-left">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>Pending Approval:</strong> Your account needs approval from
                  the Head of Logistics before you can receive job assignments.
                  {linkType === "new" && " Your documents will be reviewed as part of the onboarding process."}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Log in at{" "}
              <a href="/login" className="text-primary underline">routeace.app/login</a>
              {" "}once approved.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold">RouteAce</span>
          </div>
          <h1 className="text-2xl font-bold">
            {linkType === "new" ? "3PL Partner Onboarding" : "3PL Transporter Registration"}
          </h1>
          <p className="text-sm text-muted-foreground">
            You've been invited to join <strong>{orgName}</strong> as a{" "}
            {linkType === "new" ? "logistics partner" : "3PL carrier"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {!isLc && <Badge variant="outline">Free to register · ₦2,000/vehicle/month billed to the department</Badge>}
            {linkType === "new" && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Full KYC - document uploads required
              </Badge>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Company Details
            </CardTitle>
            <CardDescription>
              Your business information.{" "}
              <strong>Login credentials will be sent to your email address.</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Company Name *</Label>
                <Input value={form.company_name} onChange={(e) => setForm(f => ({ ...f, company_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contact Person *</Label>
                <Input value={form.contact_name} onChange={(e) => setForm(f => ({ ...f, contact_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  Email Address *
                </Label>
                <Input type="email" placeholder="you@company.com" value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
                <p className="text-[10px] text-muted-foreground">Login credentials sent here</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Phone Number *
                </Label>
                <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">CAC Registration Number</Label>
                <Input value={form.cac_number} onChange={(e) => setForm(f => ({ ...f, cac_number: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Coverage Areas</Label>
                <Input placeholder="Lagos, Ogun, Oyo" value={form.coverage_areas}
                  onChange={(e) => setForm(f => ({ ...f, coverage_areas: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Number of Vehicles</Label>
              <Input type="number" min={1} value={form.vehicle_count}
                onChange={(e) => setForm(f => ({ ...f, vehicle_count: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vehicle Types Available</Label>
              <div className="flex flex-wrap gap-1.5">
                {VEHICLE_TYPES.map((vt) => (
                  <button
                    key={vt}
                    type="button"
                    onClick={() => toggleVehicleType(vt)}
                    className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                      form.vehicle_types.includes(vt)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-muted/60"
                    }`}>
                    {vt}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {linkType === "new" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Required Compliance Documents
                </CardTitle>
                <CardDescription>
                  Upload clear, legible scans or photos. PDF preferred for certificates.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3">
                <UploadField label="CAC Certificate" required hint="PDF or photo"
                  value={docs.cac_document_url}
                  onChange={(url) => setDocs(d => ({ ...d, cac_document_url: url }))}
                  orgId={orgId || "public"} token={token ?? ""} folder="cac" />
                <UploadField label="Insurance Document" required hint="Comprehensive vehicle insurance"
                  value={docs.insurance_document_url}
                  onChange={(url) => setDocs(d => ({ ...d, insurance_document_url: url }))}
                  orgId={orgId || "public"} token={token ?? ""} folder="insurance" />
                <UploadField label="MOU / Service Agreement" hint="If already signed"
                  value={docs.mou_document_url}
                  onChange={(url) => setDocs(d => ({ ...d, mou_document_url: url }))}
                  orgId={orgId || "public"} token={token ?? ""} folder="mou" />
                <UploadField label="Letter of Intent / Motivation" required hint="Why partner with this department"
                  value={docs.letter_of_intent_url}
                  onChange={(url) => setDocs(d => ({ ...d, letter_of_intent_url: url }))}
                  orgId={orgId || "public"} token={token ?? ""} folder="intent" />
                <UploadField label="Rates Proposal" hint="Your rate card / pricing sheet"
                  value={docs.rates_proposal_url}
                  onChange={(url) => setDocs(d => ({ ...d, rates_proposal_url: url }))}
                  orgId={orgId || "public"} token={token ?? ""} folder="rates" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Vehicle Photos
                </CardTitle>
                <CardDescription>
                  Upload photos of each truck you're registering - exterior (front, sides, rear) and cab interior.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MultiPhotoUpload label="Truck Photos"
                  values={docs.truck_photos_urls}
                  onChange={(urls) => setDocs(d => ({ ...d, truck_photos_urls: urls }))}
                  orgId={orgId || "public"} token={token ?? ""} folder="trucks" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Additional Notes</CardTitle>
                <CardDescription>Anything else the logistics team should know.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea value={form.rates_notes}
                  onChange={(e) => setForm(f => ({ ...f, rates_notes: e.target.value }))}
                  rows={3} />
              </CardContent>
            </Card>
          </>
        )}

        <Card className="bg-muted/30 border-border">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold mb-2">What happens next:</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>1. Your login credentials are sent to your email address</p>
              {linkType === "new" && <p>2. The logistics team reviews your documents and vehicles</p>}
              <p>{linkType === "new" ? "3" : "2"}. Head of Logistics approves your account</p>
              <p>{linkType === "new" ? "4" : "3"}. You receive job assignments in your transporter portal</p>
              <p>{linkType === "new" ? "5" : "4"}. You confirm pickups, update location, and upload POD after each delivery</p>
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={handleSubmit}
          disabled={submitting || !form.company_name || !form.contact_name || !form.phone || !form.email}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {linkType === "new" ? "Submitting Application…" : "Creating Account…"}
            </span>
          ) : linkType === "new" ? "Submit Onboarding Application" : "Register & Get Access"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <a href="/login" className="text-primary underline">Log in here</a>
        </p>
      </div>
    </div>
  );
}
