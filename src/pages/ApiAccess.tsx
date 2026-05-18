import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Key,
  Shield,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Building2,
  Zap,
  Crown,
  User,
  Users,
  Mail,
  FileText,
  Receipt,
  TruckIcon,
  BarChart3,
  Settings,
  Link2,
  Check,
  X,
  Bike,
  Layers,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface PartnerTier {
  id: string;
  name: string;
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  features: Record<string, unknown>;
  monthly_price: number;
  is_active: boolean;
}

interface Partner {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  tier_id: string | null;
  partner_type: string;
  is_verified: boolean;
}

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  partner_id: string;
  scopes: string[];
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

// Define tier-specific features
const TIER_FEATURES = {
  starter: {
    name: "Starter",
    description: "Single operator access for basic logistics operations",
    price: "Free",
    icon: User,
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    features: [
      { label: "Single User Access", included: true, icon: User },
      { label: "Create & Manage Dispatches", included: true, icon: TruckIcon },
      { label: "Raise Invoices", included: true, icon: FileText },
      { label: "Capture Expenses", included: true, icon: Receipt },
      { label: "Send Emails to Customers", included: true, icon: Mail },
      { label: "Real-time Tracking", included: true, icon: TruckIcon },
      { label: "Analytics Dashboard", included: false, icon: BarChart3 },
      { label: "Fleet Management", included: false, icon: TruckIcon },
      { label: "Team Management", included: false, icon: Users },
    ],
  },
  "bikes / vans": {
    name: "Bikes / Vans",
    description: "Pay-per-drop for last-mile & multi-drop delivery",
    price: "₦50/drop",
    icon: Bike,
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    features: [
      { label: "Everything in Starter", included: true, icon: Check },
      { label: "Dispatch & Tracking", included: true, icon: TruckIcon },
      { label: "Driver Management", included: true, icon: Users },
      { label: "Basic Analytics", included: true, icon: BarChart3 },
      { label: "Full Fleet Management", included: true, icon: TruckIcon },
      { label: "SLA Engine & Breach Costing", included: true, icon: Shield },
      { label: "ERP & External Integrations", included: false, icon: Link2 },
      { label: "Admin Panel Access", included: false, icon: Settings },
    ],
  },
  "heavy truck / haulage": {
    name: "Heavy Fleet / Haulage",
    description: "VAT exclusive · per active vehicle · unlimited dispatches",
    price: "₦5,000/vehicle/mo",
    icon: TruckIcon,
    color: "bg-primary/20 text-primary border-primary/30",
    features: [
      { label: "Everything in Starter", included: true, icon: Check },
      { label: "Unlimited Dispatches", included: true, icon: TruckIcon },
      { label: "Full Fleet Management", included: true, icon: TruckIcon },
      { label: "SLA Engine & Breach Costing", included: true, icon: Shield },
      { label: "Resell Up to 10 Licenses", included: true, icon: Users },
      { label: "Full Analytics Dashboard", included: true, icon: BarChart3 },
      { label: "Admin Panel Access", included: true, icon: Settings },
      { label: "ERP & External Integrations", included: false, icon: Link2 },
    ],
  },
  "mixed fleet": {
    name: "Mixed Fleet",
    description: "Hybrid · ₦5,000/vehicle base + ₦50/drop usage",
    price: "₦5,000/vehicle + ₦50/drop",
    icon: Layers,
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    features: [
      { label: "Everything in Haulage & Bikes", included: true, icon: Check },
      { label: "All Vehicle Types", included: true, icon: Layers },
      { label: "Full Platform Access", included: true, icon: Crown },
      { label: "Unlimited Dispatches", included: true, icon: TruckIcon },
      { label: "Full Fleet Management", included: true, icon: TruckIcon },
      { label: "Full Analytics Dashboard", included: true, icon: BarChart3 },
      { label: "Admin Panel Access", included: true, icon: Settings },
      { label: "Team Management & Approvals", included: true, icon: Users },
      { label: "ERP & External Integrations", included: true, icon: Link2 },
    ],
  },
};

const AVAILABLE_SCOPES = [
  { value: "dispatch:read", label: "Read Dispatches" },
  { value: "dispatch:write", label: "Create/Update Dispatches" },
  { value: "tracking:read", label: "Read Tracking Data" },
  { value: "invoice:read", label: "Read Invoices" },
  { value: "invoice:write", label: "Create Invoices" },
  { value: "expense:read", label: "Read Expenses" },
  { value: "expense:write", label: "Create Expenses" },
  { value: "vehicle:read", label: "Read Vehicles" },
  { value: "driver:read", label: "Read Drivers" },
  { value: "webhook:manage", label: "Manage Webhooks" },
  { value: "analytics:read", label: "View Analytics" },
  { value: "team:manage", label: "Manage Team Members" },
  { value: "integrations:manage", label: "Manage Integrations" },
];

const TIER_SCOPES: Record<string, string[]> = {
  starter: [
    "dispatch:read",
    "dispatch:write",
    "tracking:read",
    "invoice:read",
    "invoice:write",
    "expense:read",
    "expense:write",
  ],
  "bikes / vans": [
    "dispatch:read",
    "dispatch:write",
    "tracking:read",
    "invoice:read",
    "invoice:write",
    "expense:read",
    "expense:write",
    "vehicle:read",
    "driver:read",
  ],
  "heavy truck / haulage": [
    "dispatch:read",
    "dispatch:write",
    "tracking:read",
    "invoice:read",
    "invoice:write",
    "expense:read",
    "expense:write",
    "vehicle:read",
    "driver:read",
    "analytics:read",
  ],
  "mixed fleet": [
    "dispatch:read",
    "dispatch:write",
    "tracking:read",
    "invoice:read",
    "invoice:write",
    "expense:read",
    "expense:write",
    "vehicle:read",
    "driver:read",
    "webhook:manage",
    "analytics:read",
    "team:manage",
    "integrations:manage",
  ],
};

const ApiAccess = () => {
  const { toast } = useToast();
  const { user, userRole, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isAssignTierOpen, setIsAssignTierOpen] = useState(false);
  const [isCreateKeyOpen, setIsCreateKeyOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string>("");

  const [keyForm, setKeyForm] = useState({
    name: "",
    scopes: [] as string[],
    expires_in_days: "90",
  });

  // Fetch partner tiers (only active ones - starter and enterprise)
  const { data: tiers = [], isLoading: tiersLoading } = useQuery({
    queryKey: ["partner-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_tiers")
        .select("*")
        .eq("is_active", true)
        .order("monthly_price", { ascending: true });

      if (error) throw error;
      return data as PartnerTier[];
    },
  });

  // Fetch partners (only verified ones eligible for API access)
  const { data: partners = [], isLoading: partnersLoading } = useQuery({
    queryKey: ["partners-for-api"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, company_name, contact_name, contact_email, tier_id, partner_type, is_verified")
        .order("company_name", { ascending: true });

      if (error) throw error;
      return data as Partner[];
    },
  });

  // Fetch API keys for selected partner
  const { data: apiKeys = [], isLoading: keysLoading } = useQuery({
    queryKey: ["api-keys", selectedPartner?.id],
    queryFn: async () => {
      if (!selectedPartner) return [];
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("partner_id", selectedPartner.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ApiKey[];
    },
    enabled: !!selectedPartner,
  });

  // Assign tier mutation
  const assignTierMutation = useMutation({
    mutationFn: async ({ partnerId, tierId }: { partnerId: string; tierId: string }) => {
      const { error } = await supabase
        .from("partners")
        .update({ tier_id: tierId })
        .eq("id", partnerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners-for-api"] });
      setIsAssignTierOpen(false);
      setSelectedTierId("");
      toast({ title: "Tier assigned", description: "Partner API tier has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Generate API key mutation
  const generateKeyMutation = useMutation({
    mutationFn: async (data: typeof keyForm) => {
      if (!selectedPartner) throw new Error("No partner selected");
      const effectiveScopes = data.scopes.length > 0 ? data.scopes : getAvailableScopesForPartner(selectedPartner);
      // Generate a secure random key
      const keyBytes = new Uint8Array(32);
      crypto.getRandomValues(keyBytes);
      const rawKey = Array.from(keyBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const keyPrefix = `pk_${selectedPartner.id.slice(0, 8)}_`;
      const fullKey = keyPrefix + rawKey;

      // Hash the key for storage
      const encoder = new TextEncoder();
      const keyData = encoder.encode(fullKey);
      const hashBuffer = await crypto.subtle.digest("SHA-256", keyData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      // Calculate expiration
      const expiresAt =
        data.expires_in_days !== "never"
          ? new Date(Date.now() + parseInt(data.expires_in_days) * 24 * 60 * 60 * 1000).toISOString()
          : null;

      const { error } = await supabase.from("api_keys").insert({
        name: data.name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        partner_id: selectedPartner.id,
        scopes: effectiveScopes,
        expires_at: expiresAt,
        created_by: user?.id,
      });

      if (error) throw error;
      return fullKey;
    },
    onSuccess: (key) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys", selectedPartner?.id] });
      setNewApiKey(key);
      setKeyForm({ name: "", scopes: [], expires_in_days: "90" });
      toast({
        title: "API Key generated",
        description: "Copy the key now - it won't be shown again!",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Revoke API key mutation
  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await supabase
        .from("api_keys")
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: user?.id,
        })
        .eq("id", keyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys", selectedPartner?.id] });
      toast({ title: "API Key revoked", description: "The key has been deactivated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCopyKey = async () => {
    if (newApiKey) {
      await navigator.clipboard.writeText(newApiKey);
      toast({ title: "Copied", description: "API key copied to clipboard." });
    }
  };

  const handleScopeToggle = (scope: string) => {
    setKeyForm((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const getTierConfig = (tierName: string) => {
    const key = tierName?.toLowerCase() as keyof typeof TIER_FEATURES;
    return TIER_FEATURES[key] || TIER_FEATURES.starter;
  };

  const getAvailableScopesForPartner = (partner: Partner) => {
    const tier = tiers.find((t) => t.id === partner.tier_id);
    if (!tier) return TIER_SCOPES.starter;
    const tierKey = tier.name.toLowerCase() as keyof typeof TIER_SCOPES;
    return TIER_SCOPES[tierKey] || TIER_SCOPES["mixed fleet"];
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const partnersWithTiers = partners.filter((p) => p.tier_id);
  const partnersWithoutTiers = partners.filter((p) => !p.tier_id && p.is_verified);

  if (!isSuperAdmin && userRole !== "admin") {
    return (
      <DashboardLayout title="API Access" subtitle="Manage partner API access">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">You don't have permission to access this page. Super Admin access required.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="API Access Management" subtitle="Manage partner API tiers, keys, and access permissions">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Partner Platform Access</h1>
          <p className="text-muted-foreground">
            Grant partners access to the RouteAce platform for their logistics operations
          </p>
        </div>

        {/* Partner Tiers Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {tiersLoading ? (
            <div className="col-span-4 flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (Object.entries(TIER_FEATURES).map(([key, config], index) => {
              const matchedTier = tiers.find((t) => t.name.toLowerCase() === key);
              const IconComponent = config.icon;
              const rateLimitMin = matchedTier?.rate_limit_per_minute ?? (key === "starter" ? 30 : key === "bikes / vans" ? 120 : key === "heavy truck / haulage" ? 300 : 600);
              const rateLimitDay = matchedTier?.rate_limit_per_day ?? (key === "starter" ? 5000 : key === "bikes / vans" ? 50000 : key === "heavy truck / haulage" ? 200000 : 500000);

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`border-2 ${config.color} h-full overflow-hidden`}>
                    <CardHeader className="pb-3 px-4 pt-4">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className={`p-2 rounded-lg ${config.color} flex-shrink-0`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm leading-tight break-words">{config.name}</CardTitle>
                          <CardDescription className="text-[11px] mt-1 leading-snug break-words">
                            {config.description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="pt-2">
                        <span className="text-base font-bold break-words block">{config.price}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 px-4 pb-4">
                      <div className="flex items-center gap-3 text-xs pb-2 border-b border-border/50">
                        <div className="flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{rateLimitMin} req/min</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{rateLimitDay.toLocaleString()} req/day</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-xs font-medium mb-2">Features Included:</p>
                        {config.features.map((feature) => {
                          const FeatureIcon = feature.icon;
                          return (
                            <div
                              key={feature.label}
                              className={`flex items-center gap-1.5 text-xs ${
                                feature.included ? "text-foreground" : "text-muted-foreground line-through"
                              }`}
                            >
                              {feature.included ? (
                                <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              )}
                              <FeatureIcon className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{feature.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">
                          {matchedTier ? partners.filter((p) => p.tier_id === matchedTier.id).length : 0} partners assigned
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Info Banner */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Admin Oversight</p>
                <p className="text-sm text-muted-foreground">
                  You can view all partner operations to track and resolve issues, but partners cannot see your operations.
                  Enterprise partners get full admin-like access to their own data only.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Partners with API Access */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Partners with Platform Access ({partnersWithTiers.length})
                </CardTitle>
                <CardDescription>
                  Partners assigned to a tier can access the platform via API
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {partnersLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : partnersWithTiers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No partners have platform access yet. Assign a tier to a partner below.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Access Level</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnersWithTiers.map((partner) => {
                    const tier = tiers.find((t) => t.id === partner.tier_id);
                    const config = tier ? getTierConfig(tier.name) : null;
                    return (
                      <TableRow key={partner.id}>
                        <TableCell className="font-medium">{partner.company_name}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{partner.contact_name}</p>
                            <p className="text-xs text-muted-foreground">{partner.contact_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {tier && config ? (
                            <Badge className={config.color} variant="outline">
                              {tier.name}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Unknown</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {tier?.name.toLowerCase() === "enterprise" 
                              ? "Full Admin Access"
                              : "Single User Ops"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPartner(partner);
                              setNewApiKey(null);
                            }}
                            className="gap-2"
                          >
                            <Key className="w-4 h-4" />
                            Manage Keys
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Partners without API Access */}
        {partnersWithoutTiers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Verified Partners Without Access ({partnersWithoutTiers.length})
              </CardTitle>
              <CardDescription>
                These verified partners can be assigned a platform tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnersWithoutTiers.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell className="font-medium">{partner.company_name}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{partner.contact_name}</p>
                          <p className="text-xs text-muted-foreground">{partner.contact_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {partner.partner_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog
                          open={isAssignTierOpen && selectedPartner?.id === partner.id}
                          onOpenChange={(open) => {
                            setIsAssignTierOpen(open);
                            if (open) setSelectedPartner(partner);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Plus className="w-4 h-4" />
                              Assign Tier
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Assign Platform Tier</DialogTitle>
                              <DialogDescription>
                                Select a tier for {partner.company_name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                              <Label>Select Tier</Label>
                              <div className="space-y-3">
                                {tiers.map((tier) => {
                                  const config = getTierConfig(tier.name);
                                  const IconComponent = config.icon;
                                  return (
                                    <div
                                      key={tier.id}
                                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                        selectedTierId === tier.id
                                          ? config.color
                                          : "border-border hover:border-muted-foreground/50"
                                      }`}
                                      onClick={() => setSelectedTierId(tier.id)}
                                    >
                                      <div className="flex items-center gap-3">
                                        <IconComponent className="w-5 h-5" />
                                        <div className="flex-1">
                                          <p className="font-medium capitalize">{tier.name}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {config.description}
                                          </p>
                                        </div>
                                        <span className="font-semibold">{config.price}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsAssignTierOpen(false)}>
                                Cancel
                              </Button>
                              <Button
                                onClick={() =>
                                  assignTierMutation.mutate({
                                    partnerId: partner.id,
                                    tierId: selectedTierId,
                                  })
                                }
                                disabled={!selectedTierId || assignTierMutation.isPending}
                              >
                                {assignTierMutation.isPending ? "Assigning..." : "Assign Tier"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* API Keys Management Dialog */}
        <Dialog
          open={!!selectedPartner && !isAssignTierOpen}
          onOpenChange={(open) => !open && setSelectedPartner(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Keys - {selectedPartner?.company_name}
              </DialogTitle>
              <DialogDescription>
                Manage API keys for this partner. Keys are hashed and cannot be retrieved after
                creation.
              </DialogDescription>
            </DialogHeader>

            {/* Show newly generated key */}
            {newApiKey && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-green-400">New API Key Generated</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background/50 px-3 py-2 rounded text-sm font-mono break-all">
                    {showNewKey ? newApiKey : "•".repeat(40)}
                  </code>
                  <Button size="icon" variant="ghost" onClick={() => setShowNewKey(!showNewKey)}>
                    {showNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleCopyKey}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  ⚠️ Copy this key now. It won't be shown again!
                </p>
              </div>
            )}

            {/* Existing keys */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Active Keys</h4>
                <Dialog open={isCreateKeyOpen} onOpenChange={(open) => {
                  setIsCreateKeyOpen(open);
                  if (open && selectedPartner) {
                    const defaults = getAvailableScopesForPartner(selectedPartner);
                    setKeyForm((prev) => ({ ...prev, scopes: defaults }));
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Generate Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Generate New API Key</DialogTitle>
                      <DialogDescription>
                        Create a new API key with specific permissions based on the partner's tier.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="key_name">Key Name</Label>
                        <Input
                          id="key_name"
                          value={keyForm.name}
                          onChange={(e) => setKeyForm((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="Production API Key"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Permissions (based on tier)</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedPartner &&
                            AVAILABLE_SCOPES.filter((scope) =>
                              getAvailableScopesForPartner(selectedPartner).includes(scope.value)
                            ).map((scope) => (
                              <div key={scope.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={scope.value}
                                  checked={keyForm.scopes.includes(scope.value)}
                                  onCheckedChange={() => handleScopeToggle(scope.value)}
                                />
                                <label htmlFor={scope.value} className="text-sm cursor-pointer">
                                  {scope.label}
                                </label>
                              </div>
                            ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expires">Expiration</Label>
                        <Select
                          value={keyForm.expires_in_days}
                          onValueChange={(value) =>
                            setKeyForm((prev) => ({ ...prev, expires_in_days: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30 days</SelectItem>
                            <SelectItem value="90">90 days</SelectItem>
                            <SelectItem value="365">1 year</SelectItem>
                            <SelectItem value="never">Never</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateKeyOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          generateKeyMutation.mutate(keyForm);
                          setIsCreateKeyOpen(false);
                        }}
                        disabled={
                          !keyForm.name.trim() ||
                          generateKeyMutation.isPending
                        }
                      >
                        Generate Key
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {keysLoading ? (
                <div className="flex items-center justify-center h-20">
                  <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : apiKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No API keys yet. Generate one to get started.
                </p>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        key.is_active
                          ? "border-border/50 bg-secondary/20"
                          : "border-destructive/30 bg-destructive/5"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{key.name}</p>
                          {!key.is_active && (
                            <Badge variant="destructive" className="text-xs">
                              Revoked
                            </Badge>
                          )}
                        </div>
                        <code className="text-xs text-muted-foreground">{key.key_prefix}•••••</code>
                        <div className="flex gap-1 flex-wrap">
                          {key.scopes?.map((scope) => (
                            <Badge key={scope} variant="outline" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {key.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeKeyMutation.mutate(key.id)}
                          disabled={revokeKeyMutation.isPending}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ApiAccess;
