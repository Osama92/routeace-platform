import brandLogo from "@/assets/routeace-mark.png";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  Building2,
  Crown,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Truck,
  Shield,
  Sparkles,
} from "lucide-react";

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  email: z.string().trim().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  companyName: z.string().trim().min(2, "Company name is required"),
  businessType: z.enum(["heavy_truck", "bikes_vans", "mixed"]).default("heavy_truck"),
  industry: z.string().optional(),
  fleetSize: z.string().optional(),
  country: z.string().default("Nigeria"),
  currency: z.string().default("NGN"),
  subscriptionTier: z.enum(["starter", "growth", "enterprise"]).default("starter"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof signupSchema>;
type DeptPlanChoice = "foundation" | "growth" | "enterprise";

const COMPANY_STEPS = [
  { id: 1, title: "Account", icon: User },
  { id: 2, title: "Company", icon: Building2 },
  { id: 3, title: "Plan", icon: Sparkles },
  { id: 4, title: "Confirm", icon: CheckCircle2 },
];

const DEPARTMENT_STEPS = [
  { id: 1, title: "Account", icon: User },
  { id: 2, title: "Organisation", icon: Building2 },
  { id: 3, title: "Department Plan", icon: Sparkles },
  { id: 4, title: "Confirm", icon: CheckCircle2 },
];

const INDUSTRIES = [
  "Logistics & Freight",
  "E-commerce Delivery",
  "Food & Grocery Delivery",
  "Courier Services",
  "Fleet Management",
  "Last-Mile Delivery",
  "Trucking & Haulage",
  "Other",
];

const FLEET_SIZES = [
  "1-5 vehicles",
  "6-20 vehicles",
  "21-50 vehicles",
  "51-100 vehicles",
  "100+ vehicles",
];

const COUNTRIES = [
  "Nigeria",
  "Ghana",
  "Kenya",
  "South Africa",
  "United States",
  "United Kingdom",
  "Other",
];

const CURRENCIES = [
  { code: "NGN", name: "Nigerian Naira (₦)" },
  { code: "USD", name: "US Dollar ($)" },
  { code: "GBP", name: "British Pound (£)" },
  { code: "EUR", name: "Euro (€)" },
  { code: "KES", name: "Kenyan Shilling (KSh)" },
  { code: "ZAR", name: "South African Rand (R)" },
];

const BUSINESS_TYPES = [
  {
    type: "heavy_truck" as const,
    name: "Heavy Truck / Haulage",
    price: "₦5,000/vehicle/mo",
    icon: Truck,
    description: "Per active vehicle, unlimited dispatches",
    features: ["Unlimited dispatches per vehicle", "Full fleet management", "SLA engine", "Resell up to 10 licenses"],
    highlighted: true,
  },
  {
    type: "bikes_vans" as const,
    name: "Bikes / Vans / Buses",
    price: "₦50 per drop",
    icon: Truck,
    description: "Pay only for what you deliver",
    features: ["Pay per delivery", "Dispatch & tracking", "Driver management"],
  },
  {
    type: "mixed" as const,
    name: "Mixed Fleet",
    price: "₦5,000/vehicle + ₦50/drop",
    icon: Truck,
    description: "Per-vehicle base plus per-drop billing",
    features: ["All vehicle types", "Full platform access", "Team management"],
  },
];

const DEPT_INDUSTRIES = [
  "FMCG (Fast-Moving Consumer Goods)",
  "Manufacturing",
  "Oil & Gas",
  "Retail & E-Commerce",
  "Pharmaceutical",
  "Agriculture",
  "Building Materials",
  "Telecommunications",
  "Other",
];

const DEPT_ERP_SYSTEMS = [
  "SAP",
  "Oracle",
  "Microsoft Dynamics",
  "Sage",
  "Odoo",
  "QuickBooks",
  "None (Excel/Manual)",
  "Other",
];

const DEPT_WAREHOUSES = ["1 warehouse / DC", "2–5 warehouses / DCs", "6–10 warehouses / DCs", "10+ warehouses / DCs"];

const DEPT_PLANS = [
  {
    type: "foundation" as const,
    name: "Foundation",
    price: "₦150,000/mo",
    description: "Small internal logistics teams",
    users: "5 users included · ₦10,000/extra user",
    features: ["Core transport module", "Dispatch & tracking", "Basic 3PL vendor management", "SLA tracking dashboard"],
  },
  {
    type: "growth" as const,
    name: "Growth",
    price: "₦350,000/mo",
    description: "Scaling departments managing vendors",
    users: "15 users included · ₦7,500/extra user",
    features: ["Everything in Foundation", "AI dispatch optimization", "Vendor rate card upload", "3PL cost comparison", "Maintenance intelligence"],
    highlighted: true,
  },
  {
    type: "enterprise" as const,
    name: "Enterprise",
    price: "₦1,200,000/mo",
    description: "Multi-region logistics control tower",
    users: "50 users included · ₦5,000/extra user",
    features: ["Everything in Growth", "AI CFO module", "ERP & WMS integrations", "Advanced approvals", "Sales Department tracking portal"],
  },
];

const CreateCompany = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tenantMode = useMemo(() => {
    const m = searchParams.get("mode");
    return m === "LOGISTICS_DEPARTMENT" ? "LOGISTICS_DEPARTMENT" : "LOGISTICS_COMPANY";
  }, [searchParams]);
  const isDepartment = tenantMode === "LOGISTICS_DEPARTMENT";
  const activeSteps = isDepartment ? DEPARTMENT_STEPS : COMPANY_STEPS;
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    businessType: "heavy_truck",
    industry: "",
    fleetSize: "",
    country: "Nigeria",
    currency: "NGN",
    subscriptionTier: "starter",
  });
  const [deptData, setDeptData] = useState({
    industry: "",
    erpSystem: "",
    teamSize: "",
    operatingRegions: "",
    warehouseCount: "",
    plan: "growth" as DeptPlanChoice,
  });

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleDeptChange = (field: keyof typeof deptData, value: string) => {
    setDeptData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
      if (!formData.email.trim()) newErrors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email";
      if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords don't match";
    }

    if (step === 2) {
      if (!formData.companyName.trim()) newErrors.companyName = "Company name is required";
      if (isDepartment) {
        if (!deptData.industry) newErrors.industry = "Industry type is required";
        if (!deptData.teamSize || Number(deptData.teamSize) < 1) newErrors.teamSize = "Active team size is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, activeSteps.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);

    try {
      const tierFromModel: Record<string, string> = {
        heavy_truck: "starter",
        bikes_vans: "starter",
        mixed: "starter",
      };
      const resolvedTier = isDepartment ? "enterprise" : tierFromModel[formData.businessType] ?? "starter";
      const resolvedBillingModel = isDepartment ? `dept_${deptData.plan}` : formData.businessType;

      const { data, error } = await supabase.functions.invoke("create-company-signup", {
        body: {
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          full_name: formData.fullName,
          company_name: formData.companyName,
          subscription_tier: resolvedTier,
          business_type: isDepartment ? null : formData.businessType,
          billing_model: resolvedBillingModel,
          industry: isDepartment ? deptData.industry : formData.industry,
          fleet_size: isDepartment ? null : formData.fleetSize,
          country: formData.country,
          currency: formData.currency,
          tenant_mode: tenantMode,
          dept_plan: isDepartment ? deptData.plan : null,
          dept_industry: isDepartment ? deptData.industry : null,
          dept_erp_system: isDepartment ? deptData.erpSystem : null,
          dept_team_size: isDepartment ? Number(deptData.teamSize) || null : null,
          dept_operating_regions: isDepartment ? deptData.operatingRegions : null,
          dept_warehouse_count: isDepartment ? deptData.warehouseCount : null,
        },
      });

      // Try to extract the server's friendly error message even on non-2xx
      let serverError: string | null = null;
      if (error && (error as any).context?.json) {
        try {
          const body = await (error as any).context.json();
          serverError = body?.error ?? null;
        } catch { /* ignore */ }
      } else if (error && (error as any).context?.text) {
        try {
          const text = await (error as any).context.text();
          const parsed = JSON.parse(text);
          serverError = parsed?.error ?? null;
        } catch { /* ignore */ }
      }
      if (!data?.success && !serverError && data?.error) serverError = data.error;
      if (error && !serverError) serverError = "We couldn't reach our servers. Please check your connection and try again.";
      if (serverError) throw new Error(serverError);

      toast.success(
        isDepartment
          ? "Workspace created! Check your inbox to verify your email, then sign in."
          : "Company created! Check your inbox to verify your email, then sign in to access your platform.",
        { duration: 8000 },
      );

      navigate("/auth", {
        state: {
          email: formData.email.trim().toLowerCase(),
          message: "We've sent a verification email. Please check your inbox (and spam folder) to confirm your address.",
        },
      });
    } catch (error: any) {
      console.error("Error creating company:", error);
      const msg = (error?.message || "").toString();
      // Friendly mapping for common cases
      if (/already registered|already exists|duplicate/i.test(msg)) {
        toast.error("This email is already registered. Please sign in instead.");
      } else if (/reseller agreement/i.test(msg)) {
        toast.error("This email is managed by a reseller. Please contact your reseller to access your account.");
      } else if (/network|fetch|connection/i.test(msg)) {
        toast.error("We couldn't reach our servers. Please check your connection and try again.");
      } else {
        toast.error(msg || "We couldn't create your account right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <User className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Create Your Account</h2>
              <p className="text-sm text-muted-foreground">You'll be the Super Admin / Company Owner</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive mt-1">{errors.password}</p>}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold">{isDepartment ? "Organisation Details" : "Company Details"}</h2>
              <p className="text-sm text-muted-foreground">
                {isDepartment ? "Tell us about the organisation that owns this logistics department" : "Tell us about your business"}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="companyName">{isDepartment ? "Organisation Name *" : "Company Name *"}</Label>
                <Input
                  id="companyName"
                  placeholder={isDepartment ? "Enter your organisation name" : "Enter your company name"}
                  value={formData.companyName}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                />
                {errors.companyName && <p className="text-sm text-destructive mt-1">{errors.companyName}</p>}
              </div>

              {isDepartment ? (
                <>
                  <div>
                    <Label>Industry Type *</Label>
                    <Select value={deptData.industry} onValueChange={(v) => handleDeptChange("industry", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPT_INDUSTRIES.map((ind) => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.industry && <p className="text-sm text-destructive mt-1">{errors.industry}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>ERP / WMS System</Label>
                      <Select value={deptData.erpSystem} onValueChange={(v) => handleDeptChange("erpSystem", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select system" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPT_ERP_SYSTEMS.map((system) => (
                            <SelectItem key={system} value={system}>{system}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Active Team Size *</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="e.g. 12"
                        value={deptData.teamSize}
                        onChange={(e) => handleDeptChange("teamSize", e.target.value)}
                      />
                      {errors.teamSize && <p className="text-sm text-destructive mt-1">{errors.teamSize}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Operating Regions</Label>
                      <Input
                        placeholder="Lagos, Abuja"
                        value={deptData.operatingRegions}
                        onChange={(e) => handleDeptChange("operatingRegions", e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Warehouses / DCs</Label>
                      <Select value={deptData.warehouseCount} onValueChange={(v) => handleDeptChange("warehouseCount", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select count" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPT_WAREHOUSES.map((count) => (
                            <SelectItem key={count} value={count}>{count}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Industry</Label>
                    <Select value={formData.industry} onValueChange={(v) => handleChange("industry", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((ind) => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Fleet Size</Label>
                      <Select value={formData.fleetSize} onValueChange={(v) => handleChange("fleetSize", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          {FLEET_SIZES.map((size) => (
                            <SelectItem key={size} value={size}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Country</Label>
                      <Select value={formData.country} onValueChange={(v) => handleChange("country", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {isDepartment && (
                <div>
                  <Label>Country</Label>
                  <Select value={formData.country} onValueChange={(v) => handleChange("country", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Currency</Label>
                <Select value={formData.currency} onValueChange={(v) => handleChange("currency", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        );

      case 3:
        if (isDepartment) {
          return (
            <motion.div
              key="dept-step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-6">
                <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Select Department Plan</h2>
                <p className="text-sm text-muted-foreground">Fixed monthly pricing for internal logistics control</p>
              </div>

              <RadioGroup
                value={deptData.plan}
                onValueChange={(v) => handleDeptChange("plan", v as DeptPlanChoice)}
                className="space-y-3"
              >
                {DEPT_PLANS.map((plan) => (
                  <div
                    key={plan.type}
                    className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                      deptData.plan === plan.type
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    } ${plan.highlighted ? "ring-2 ring-primary/20" : ""}`}
                    onClick={() => handleDeptChange("plan", plan.type)}
                  >
                    {plan.highlighted && (
                      <div className="absolute -top-2 left-4 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                        Most Popular
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value={plan.type} id={plan.type} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <Label htmlFor={plan.type} className="font-semibold cursor-pointer">{plan.name}</Label>
                          <span className="font-bold text-sm text-right">{plan.price}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                        <p className="text-xs text-primary mt-1">{plan.users}</p>
                        <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                          {plan.features.map((f) => (
                            <li key={f} className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-primary" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </RadioGroup>

              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Billing Preview</p>
                <p className="text-sm">
                  {DEPT_PLANS.find((plan) => plan.type === deptData.plan)?.price} · VAT exclusive · Department workspace billing
                </p>
              </div>
            </motion.div>
          );
        }

        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Select Business Type</h2>
              <p className="text-sm text-muted-foreground">This determines your billing model</p>
            </div>

            <RadioGroup
              value={formData.businessType}
              onValueChange={(v) => handleChange("businessType", v as any)}
              className="space-y-3"
            >
              {BUSINESS_TYPES.map((bt) => (
                <div
                  key={bt.type}
                  className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                    formData.businessType === bt.type
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  } ${bt.highlighted ? "ring-2 ring-primary/20" : ""}`}
                  onClick={() => handleChange("businessType", bt.type)}
                >
                  {bt.highlighted && (
                    <div className="absolute -top-2 left-4 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                      Most Popular
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={bt.type} id={bt.type} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={bt.type} className="font-semibold cursor-pointer">{bt.name}</Label>
                        <span className="font-bold text-sm">{bt.price}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{bt.description}</p>
                      <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                        {bt.features.map((f) => (
                          <li key={f} className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {/* Billing preview */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Billing Preview</p>
              {formData.businessType === "heavy_truck" && (
                <p className="text-sm">₦5,000/vehicle/month · VAT exclusive · Unlimited dispatches per vehicle</p>
              )}
              {formData.businessType === "bikes_vans" && (
                <p className="text-sm">₦50 per delivery drop · No monthly fee · VAT exclusive</p>
              )}
              {formData.businessType === "mixed" && (
                <p className="text-sm">₦5,000/vehicle/month base + ₦50 per drop · VAT exclusive</p>
              )}
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mb-3 shadow-lg">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold">Confirm Your Setup</h2>
              <p className="text-sm text-muted-foreground">Review your details before creating</p>
            </div>

            <Card className="bg-secondary/30">
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{formData.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{formData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isDepartment ? "Organisation" : "Company"}</span>
                  <span className="font-medium">{formData.companyName}</span>
                </div>
                {isDepartment ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Department Plan</span>
                      <span className="font-medium">{DEPT_PLANS.find((plan) => plan.type === deptData.plan)?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Billing</span>
                      <span className="font-medium">{DEPT_PLANS.find((plan) => plan.type === deptData.plan)?.price}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Business Type</span>
                      <span className="font-medium">{BUSINESS_TYPES.find(b => b.type === formData.businessType)?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Billing</span>
                      <span className="font-medium">{BUSINESS_TYPES.find(b => b.type === formData.businessType)?.price}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  {isDepartment ? "Head of Logistics Powers" : "Super Admin Powers"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  {isDepartment ? "Full logistics department visibility" : "Full platform access & control"}
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  {isDepartment ? "Manage operations, vendors, SLA and team access" : "Invite and manage team members"}
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  {isDepartment ? "Director-level authority for department approvals" : "Cannot be downgraded by anyone"}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="relative z-10 flex flex-col justify-between p-12">
          <Link to="/" aria-label="RouteAce home" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={brandLogo} alt="RouteAce" className="h-12 w-auto object-contain" />
            <div>
              <h1 className="font-heading font-bold text-2xl">RouteAce</h1>
              <p className="text-sm text-muted-foreground">Logistics Platform</p>
            </div>
          </Link>

          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {isDepartment ? "Logistics Department Mode" : "Logistics Company Mode"}
                </span>
              </div>
              <h2 className="font-heading text-3xl font-bold mb-4">
                Create Your
                <span className="gradient-text block">
                  {isDepartment ? "Department Workspace" : "Company Account"}
                </span>
              </h2>
              <p className="text-muted-foreground max-w-md">
                {isDepartment
                  ? "Set up your internal logistics workspace. You'll become the Logistics Director with full operational visibility."
                  : "As the first user, you'll become the Super Admin with full control over your organization."}
              </p>
            </div>

            {/* Step Indicators */}
            <div className="space-y-3">
              {activeSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    currentStep === step.id
                      ? "bg-primary/10 border border-primary/30"
                      : currentStep > step.id
                      ? "opacity-60"
                      : "opacity-40"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStep >= step.id ? "bg-primary text-primary-foreground" : "bg-secondary"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <step.icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="font-medium">{step.title}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <button onClick={() => navigate("/auth")} className="text-primary hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <Link to="/" aria-label="RouteAce home" className="lg:hidden flex items-center gap-3 mb-6 hover:opacity-80 transition-opacity">
            <img src={brandLogo} alt="RouteAce" className="h-10 w-auto object-contain" />
            <h1 className="font-heading font-bold text-xl">RouteAce</h1>
          </Link>

          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={currentStep === 1 ? () => navigate("/") : handlePrevious}
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {currentStep === 1 ? "Back" : "Previous"}
            </Button>

            {currentStep < 4 ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    {isDepartment ? "Create Department" : "Create Company"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCompany;
