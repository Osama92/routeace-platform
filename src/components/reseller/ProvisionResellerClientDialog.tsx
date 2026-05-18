import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Building2, CheckCircle2, Copy, Info, Layers, Lock, Key,
  ArrowRight, ShieldCheck, Mail,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ProvisionResellerClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

interface ProvisionResult {
  orgId: string;
  orgName: string;
  email: string;
  tempPassword?: string;
  tier: string;
  maxLicenses: number;
  resellerPrice: number | null;
  lockUntil: string;
}

const TIER_INFO: Record<string, { label: string; floorNgn: number; rate: string; resaleHint: string }> = {
  starter: { label: "Starter (Free)", floorNgn: 0, rate: "30 req/min · 5,000/day", resaleHint: "Free tier - no resale price" },
  "bikes / vans": { label: "Bikes / Vans (₦50/drop)", floorNgn: 50, rate: "120 req/min · 50,000/day", resaleHint: "Floor: ₦50/drop" },
  "heavy truck / haulage": { label: "Heavy Fleet / Haulage (₦5,000/vehicle/mo)", floorNgn: 5000, rate: "300 req/min · 200,000/day", resaleHint: "Floor: ₦5,000/vehicle/mo" },
  "mixed fleet": { label: "Mixed Fleet (₦5,000 + ₦50/drop)", floorNgn: 5000, rate: "600 req/min · 500,000/day", resaleHint: "Floor: ₦5,000 base + ₦50/drop" },
};

export default function ProvisionResellerClientDialog({
  open,
  onOpenChange,
  onCreated,
}: ProvisionResellerClientDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ProvisionResult | null>(null);

  const [orgName, setOrgName] = useState("");
  const [tier, setTier] = useState("heavy truck / haulage");
  const [maxLicenses, setMaxLicenses] = useState<string>("10");
  const [resellerPrice, setResellerPrice] = useState<string>("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");

  const tierInfo = TIER_INFO[tier] ?? TIER_INFO.starter;

  const reset = () => {
    setOrgName(""); setTier("heavy truck / haulage"); setMaxLicenses("10"); setResellerPrice("");
    setOwnerEmail(""); setOwnerName(""); setOwnerPhone("");
    setResult(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Copied to clipboard." });
  };

  const handleSubmit = async () => {
    if (!orgName || !ownerEmail || !ownerName) {
      toast({ title: "Missing fields", description: "Organization name, owner name and email are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const priceNum = resellerPrice ? Number(resellerPrice) : null;
      if (priceNum !== null && priceNum < tierInfo.floorNgn) {
        toast({
          title: "Price below floor",
          description: `Your price must be at least ₦${tierInfo.floorNgn.toLocaleString()} (RouteAce's base price for this tier).`,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("resell-create-client", {
        body: {
          organization: {
            name: orgName,
            subscription_tier: tier,
            max_reseller_licenses: Number(maxLicenses) || 0,
          },
          owner: {
            email: ownerEmail,
            full_name: ownerName,
            phone: ownerPhone || undefined,
          },
          reseller_price: priceNum ?? undefined,
        },
      });
      if (error) throw error;
      const payload = data as any;
      if (payload?.error || payload?.success === false) {
        throw new Error(payload?.error || "Provisioning failed");
      }

      const lockUntil = new Date();
      lockUntil.setMonth(lockUntil.getMonth() + 6);

      setResult({
        orgId: payload.organization_id,
        orgName: payload.organization_name ?? orgName,
        email: ownerEmail,
        tempPassword: payload?.owner?.temp_password,
        tier,
        maxLicenses: Number(maxLicenses) || 0,
        resellerPrice: priceNum,
        lockUntil: lockUntil.toLocaleDateString(),
      });
      onCreated?.();
    } catch (err: any) {
      toast({
        title: "Failed to create client",
        description: err?.message || "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading flex items-center gap-2 text-success">
                <CheckCircle2 className="w-5 h-5" />
                Client provisioned successfully
              </DialogTitle>
              <DialogDescription>
                Receipt of provisioning. Share credentials securely - the temporary password is shown only once.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Provisioning summary */}
              <div className="rounded-lg border border-success/30 bg-success/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase text-muted-foreground tracking-wide">Provisioning Receipt</p>
                  <Badge variant="outline" className="text-[10px]">ID: {result.orgId.slice(0, 8)}…</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Organisation</p>
                    <p className="font-medium">{result.orgName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tier</p>
                    <p className="font-medium">{TIER_INFO[result.tier]?.label ?? result.tier}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">License cap</p>
                    <p className="font-medium">{result.maxLicenses} downstream license(s)</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Resale price</p>
                    <p className="font-medium">
                      {result.resellerPrice !== null ? `₦${result.resellerPrice.toLocaleString()}` : "Default tier price"}
                    </p>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 text-xs">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-muted-foreground">6-month reseller lock active until <strong className="text-foreground">{result.lockUntil}</strong></span>
                  </div>
                </div>
              </div>

              {/* Owner credentials */}
              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                <p className="text-xs uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> Owner Login Credentials
                </p>
                <div>
                  <p className="text-xs text-muted-foreground">Admin email</p>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-sm">{result.email}</code>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(result.email)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {result.tempPassword && (
                  <div>
                    <p className="text-xs text-muted-foreground">Temporary password</p>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm break-all">{result.tempPassword}</code>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(result.tempPassword!)}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Welcome email dispatched to the owner.
                </p>
              </div>

              {/* Next steps */}
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription className="text-xs space-y-1">
                  <strong>Next steps:</strong>
                  <ul className="list-disc list-inside space-y-0.5 ml-1">
                    <li>Issue the API key from <code className="text-[11px]">/api-access</code> and assign it to this org.</li>
                    <li>Every API transaction will auto-write an 80/20 split row to the commission ledger.</li>
                    <li>Audit each split in <strong>Reseller Command Center → Split Audit</strong>.</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); }}>Provision Another</Button>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Provision Reseller Client
              </DialogTitle>
              <DialogDescription>
                Create a downstream tenant in one step. Inputs explained below.
              </DialogDescription>
            </DialogHeader>

            {/* Guided explainer */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2 text-xs">
              <p className="flex items-start gap-2">
                <Layers className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <span><strong>Tier</strong> - sets the API rate limits, feature set and base price floor your downstream client must pay.</span>
              </p>
              <p className="flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <span><strong>License cap</strong> - maximum number of users this client can onboard. Heavy Fleet allows up to 10 by default.</span>
              </p>
              <p className="flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                <span><strong>Lock period</strong> - a 6-month reseller lock is auto-applied. The client cannot self-signup or switch resellers during this window.</span>
              </p>
              <p className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <span><strong>Resale price</strong> - what you charge the client. Must be ≥ RouteAce's tier floor. Leave blank to bill at the default tier price.</span>
              </p>
            </div>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="rc-org">Organization Name *</Label>
                  <Input id="rc-org" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Logistics Ltd" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="rc-tier">Subscription Tier</Label>
                  <Select value={tier} onValueChange={setTier}>
                    <SelectTrigger id="rc-tier"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter (Free)</SelectItem>
                      <SelectItem value="bikes / vans">Bikes / Vans - ₦50/drop</SelectItem>
                      <SelectItem value="heavy truck / haulage">Heavy Fleet / Haulage - ₦5,000/vehicle/mo</SelectItem>
                      <SelectItem value="mixed fleet">Mixed Fleet - ₦5,000 + ₦50/drop</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">{tierInfo.rate} · {tierInfo.resaleHint}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rc-licenses">License Cap</Label>
                  <Input id="rc-licenses" type="number" min={1} value={maxLicenses} onChange={(e) => setMaxLicenses(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rc-price">Your Resale Price (₦)</Label>
                  <Input
                    id="rc-price" type="number" min={tierInfo.floorNgn}
                    value={resellerPrice}
                    onChange={(e) => setResellerPrice(e.target.value)}
                    placeholder={`≥ ${tierInfo.floorNgn.toLocaleString()}`}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Owner Account</p>
                <div className="space-y-2">
                  <Label htmlFor="rc-oname">Owner Full Name *</Label>
                  <Input id="rc-oname" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Jane Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rc-oemail">Owner Email *</Label>
                  <Input id="rc-oemail" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="owner@acme.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rc-ophone">Owner Phone (optional)</Label>
                  <Input id="rc-ophone" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="+234..." />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Provisioning...</> : <>Provision Client <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
