import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2, Crown, Shield, Users, CheckCircle2, ArrowRight, ArrowLeft,
  Loader2, MapPin, Truck, Sparkles, Target, Globe, Factory,
  BarChart3, Zap, X, Check,
} from "lucide-react";
import BusinessProfileStep, { type BusinessProfile } from "@/components/strategy/BusinessProfileStep";
import LogisticsTypeStep, { type LogisticsTypeData } from "./LogisticsTypeStep";
import PricingEstimatorStep from "./PricingEstimatorStep";
import PlatformSelectStep, { type PlatformChoice } from "./PlatformSelectStep";
import ModeSelectionStep, { type TenantModeChoice } from "./ModeSelectionStep";

interface OnboardingFlowProps {
  onComplete?: () => void;
}

interface CompanyData {
  companyName: string;
  industry: string;
  fleetSize: string;
  country: string;
  currency: string;
}

interface DeptProfileData {
  industryType: string;
  erpSystem: string;
  teamSize: string;
  operatingRegions: string;
  warehouseCount: string;
}

type DeptPlanChoice = "foundation" | "growth" | "enterprise" | "";

const LC_STEPS = [
  { id: 1, title: "Operating Mode", icon: Building2, description: "Logistics company or department?" },
  { id: 2, title: "Select Platform", icon: Globe, description: "Which operating system do you need?" },
  { id: 3, title: "Company Setup", icon: Building2, description: "Tell us about your business" },
  { id: 4, title: "Operations Type", icon: Truck, description: "Classify your logistics model" },
  { id: 5, title: "Your Pricing", icon: Target, description: "See your estimated cost" },
  { id: 6, title: "Business Profile", icon: Target, description: "Define your strategic direction" },
  { id: 7, title: "Owner Setup", icon: Crown, description: "Establish platform ownership" },
  { id: 8, title: "Access Control", icon: Shield, description: "Understand your powers" },
  { id: 9, title: "Guided Tour", icon: Sparkles, description: "Get started quickly" },
];

const LD_STEPS = [
  { id: 1, title: "Operating Mode", icon: Building2, description: "Logistics company or department?" },
  { id: 2, title: "Organisation Setup", icon: Factory, description: "Tell us about your company" },
  { id: 3, title: "Department Profile", icon: BarChart3, description: "Your team structure & systems" },
  { id: 4, title: "Select Your Plan", icon: Target, description: "Foundation, Growth or Enterprise" },
  { id: 5, title: "Director Setup", icon: Crown, description: "Establish your authority" },
  { id: 6, title: "Role Overview", icon: Shield, description: "Your team's access levels" },
  { id: 7, title: "Get Started", icon: Sparkles, description: "Launch your control tower" },
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
  "SAP", "Oracle", "Microsoft Dynamics", "Sage", "Odoo", "QuickBooks", "None (Excel/Manual)", "Other",
];

const DEPT_WAREHOUSE_COUNTS = [
  "1 warehouse / DC",
  "2–5 warehouses / DCs",
  "6–10 warehouses / DCs",
  "10+ warehouses / DCs",
];

const COUNTRIES = ["Nigeria", "Ghana", "Kenya", "South Africa", "United States", "United Kingdom", "Other"];
const CURRENCIES = [
  { code: "NGN", name: "Nigerian Naira (₦)" },
  { code: "USD", name: "US Dollar ($)" },
  { code: "GBP", name: "British Pound (£)" },
  { code: "EUR", name: "Euro (€)" },
  { code: "KES", name: "Kenyan Shilling (KSh)" },
  { code: "ZAR", name: "South African Rand (R)" },
];
const INDUSTRIES_LC = [
  "Logistics & Freight", "E-commerce Delivery", "Food & Grocery Delivery",
  "Courier Services", "Fleet Management", "Last-Mile Delivery", "Trucking & Haulage", "Other",
];
const FLEET_SIZES = ["1-5 vehicles", "6-20 vehicles", "21-50 vehicles", "51-100 vehicles", "100+ vehicles"];

const DEPT_PLANS = [
  {
    id: "foundation" as const,
    title: "Foundation",
    price: "₦150,000",
    period: "/month",
    subtitle: "For small internal logistics teams (3–10 users)",
    includedUsers: 5,
    extraUserPrice: "₦10,000",
    badge: null as string | null,
    features: [
      { label: "Core Transport Module (Dispatch, Tracking, Fleet)", included: true },
      { label: "Basic 3PL Vendor Management", included: true },
      { label: "SLA Tracking Dashboard", included: true },
      { label: "Operations Overview", included: true },
      { label: "5 users included", included: true },
      { label: "AI Dispatch Optimization", included: false },
      { label: "Vendor Rate Card Engine (Excel)", included: false },
      { label: "Automated Vendor Payout Engine", included: false },
      { label: "ERP / WMS Integration", included: false },
    ],
  },
  {
    id: "growth" as const,
    title: "Growth",
    price: "₦350,000",
    period: "/month",
    subtitle: "For scaling departments managing 3PL vendors",
    includedUsers: 15,
    extraUserPrice: "₦7,500",
    badge: "Most Popular" as string | null,
    features: [
      { label: "Everything in Foundation", included: true },
      { label: "AI Dispatch Optimization", included: true },
      { label: "Vendor Rate Card Upload (Excel)", included: true },
      { label: "3PL vs Internal Fleet Cost Comparison (AI)", included: true },
      { label: "Automated Vendor Payout Engine", included: true },
      { label: "Maintenance Intelligence", included: true },
      { label: "15 users included", included: true },
      { label: "AI CFO Module", included: false },
      { label: "ERP / WMS API Integration", included: false },
      { label: "Multi-Warehouse / Multi-Region", included: false },
    ],
  },
  {
    id: "enterprise" as const,
    title: "Enterprise",
    price: "₦1,200,000",
    period: "/month",
    subtitle: "Full control tower for FMCG, Manufacturing & Oil & Gas",
    includedUsers: 50,
    extraUserPrice: "₦5,000",
    badge: null as string | null,
    features: [
      { label: "Everything in Growth", included: true },
      { label: "AI CFO (Cost, Margin & Capital Intelligence)", included: true },
      { label: "Vendor Performance Intelligence (AI)", included: true },
      { label: "Autonomous Dispatch Rebalancing", included: true },
      { label: "Multi-Warehouse / Multi-Region Support", included: true },
      { label: "ERP & WMS API Integrations", included: true },
      { label: "Advanced Approval Workflows", included: true },
      { label: "Sales Department E2E Tracking Portal", included: true },
      { label: "50 users included", included: true },
    ],
  },
];

function recommendDeptPlan(teamSize: string): DeptPlanChoice {
  const n = parseInt(teamSize, 10);
  if (isNaN(n) || n === 0) return "";
  if (n <= 5) return "foundation";
  if (n <= 15) return "growth";
  return "enterprise";
}

export function CompanyOnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const navigate = useNavigate();
  const { user, refreshApprovalStatus } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tenantMode, setTenantMode] = useState<TenantModeChoice>("");

  const [platformChoice, setPlatformChoice] = useState<PlatformChoice>("");
  const [companyData, setCompanyData] = useState<CompanyData>({
    companyName: "", industry: "", fleetSize: "", country: "Nigeria", currency: "NGN",
  });
  const [logisticsType, setLogisticsType] = useState<LogisticsTypeData>({
    operationType: "", vehicleCount: "", vehicleTypes: "", operatingRegions: "",
    monthlyDeliveries: "", avgStopsPerRoute: "", deliveryFrequency: "", avgDeliveryDistance: "",
  });
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({
    industry: "", targetMarkets: "", fleetType: "", revenueTarget12m: "",
    currentMonthlyRevenue: "", profitMarginTarget: "", growthAmbition: "", visionStatement: "",
  });

  const [deptOrgData, setDeptOrgData] = useState<CompanyData>({
    companyName: "", industry: "", fleetSize: "", country: "Nigeria", currency: "NGN",
  });
  const [deptProfile, setDeptProfile] = useState<DeptProfileData>({
    industryType: "", erpSystem: "", teamSize: "", operatingRegions: "", warehouseCount: "",
  });
  const [deptPlan, setDeptPlan] = useState<DeptPlanChoice>("");

  const isDept = tenantMode === "LOGISTICS_DEPARTMENT";
  const STEPS = isDept ? LD_STEPS : LC_STEPS;
  const totalSteps = STEPS.length;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      if (!isDept && platformChoice === "industry" && currentStep === 3) {
        setCurrentStep(6);
        return;
      }
      if (isDept && currentStep === 3) {
        const rec = recommendDeptPlan(deptProfile.teamSize);
        if (rec && !deptPlan) setDeptPlan(rec);
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      if (!isDept && platformChoice === "industry" && currentStep === 6) {
        setCurrentStep(3);
        return;
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const isNextDisabled = () => {
    if (isDept) {
      if (currentStep === 1) return !tenantMode;
      if (currentStep === 2) return !deptOrgData.companyName.trim();
      if (currentStep === 3) return !deptProfile.industryType || !deptProfile.teamSize;
      if (currentStep === 4) return !deptPlan;
      return false;
    } else {
      if (currentStep === 1) return !tenantMode;
      if (currentStep === 2) return !platformChoice;
      return false;
    }
  };

  const handleComplete = async () => {
    if (!user) {
      toast.error("You must be logged in to complete setup");
      return;
    }
    setIsSubmitting(true);
    try {
      const countryCodeMap: Record<string, string> = {
        Nigeria: "NG", Ghana: "GH", Kenya: "KE", "South Africa": "ZA",
        "United States": "US", "United Kingdom": "GB", Other: "GB",
      };
      const activeCountry = isDept ? deptOrgData.country : companyData.country;
      const countryCode = countryCodeMap[activeCountry] || "NG";
      const regionMode = ["NG", "GH", "KE", "ZA"].includes(countryCode) ? "NG" : "GLOBAL";
      const activeCompanyName = isDept ? deptOrgData.companyName : companyData.companyName;

      await supabase.from("company_settings").upsert({
        company_name: activeCompanyName || "My Organisation",
        updated_by: user.id,
      });

      await supabase.from("profiles").update({
        region_mode: regionMode,
        country_code: countryCode,
      } as any).eq("user_id", user.id);

      const planDefaults: Record<string, number> = {
        haulage: 0, multidrop: 500, hybrid: 500,
        foundation: 0, growth: 500, enterprise: 2000,
      };
      const activeModel = isDept ? (deptPlan || "foundation") : (logisticsType.operationType || "haulage");
      const aiCredits = planDefaults[activeModel] ?? 0;

      await supabase.from("tenant_config" as any).upsert({
        user_id: user.id,
        company_name: activeCompanyName || "My Organisation",
        business_email: user.email,
        country: activeCountry,
        company_size: isDept ? `${deptProfile.teamSize} users` : companyData.fleetSize,
        operating_model: isDept ? "department" : (logisticsType.operationType || "haulage"),
        vehicle_count: isDept ? 0 : (parseInt(logisticsType.vehicleCount) || 1),
        vehicle_classes: isDept ? [] : (logisticsType.vehicleTypes ? [logisticsType.vehicleTypes] : []),
        billing_currency: isDept ? deptOrgData.currency : (companyData.currency || "NGN"),
        plan_tier: isDept ? (deptPlan || "foundation") : "free",
        ai_credits_total: aiCredits,
        enabled_modules: JSON.stringify(
          isDept
            ? ["dispatching", "fleet", "drivers", "tracking", "reporting", "vendor_management", "sla", "finance"]
            : ["dispatching", "fleet", "drivers", "tracking", "reporting"]
        ),
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_step: totalSteps,
        tenant_mode: tenantMode || "LOGISTICS_COMPANY",
        mode_locked_at: new Date().toISOString(),
        uses_warehouse_dispatch: isDept,
        enable_website_builder: !isDept,
        ...(isDept && {
          dept_plan: deptPlan,
          dept_industry: deptProfile.industryType,
          dept_erp_system: deptProfile.erpSystem,
          dept_team_size: parseInt(deptProfile.teamSize) || 0,
          dept_operating_regions: deptProfile.operatingRegions,
          dept_warehouse_count: deptProfile.warehouseCount,
        }),
      } as any, { onConflict: "user_id" });

      await supabase.from("audit_logs").insert([{
        action: "onboarding_completed",
        table_name: "company_settings",
        record_id: user.id,
        user_id: user.id,
        user_email: user.email,
        new_data: {
          tenant_mode: tenantMode,
          company_name: activeCompanyName,
          country: activeCountry,
          ...(isDept
            ? { dept_plan: deptPlan, dept_industry: deptProfile.industryType, dept_team_size: deptProfile.teamSize }
            : { logistics_model: logisticsType.operationType, vehicle_count: logisticsType.vehicleCount }
          ),
          completed_at: new Date().toISOString(),
        } as any,
      }]);

      try { await supabase.rpc("approve_user_profile", { p_user_id: user.id }); } catch (_) {}
      try { await refreshApprovalStatus(); } catch (_) {}

      toast.success(
        isDept
          ? "🏭 Welcome to RouteAce! Your Logistics Department portal is ready."
          : regionMode === "NG"
          ? "🇳🇬 Welcome to RouteAce Nigeria! Your platform is ready."
          : "🌍 Welcome to RouteAce Global! Your platform is ready.",
        { duration: 5000 }
      );

      onComplete?.();
      navigate("/admin-governance");
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Failed to complete setup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDeptStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Factory className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Set up your organisation</h2>
        <p className="text-muted-foreground mt-2">Tell us about the company that owns this logistics department</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="deptCompanyName">Company / Organisation Name *</Label>
          <Input
            id="deptCompanyName"
            placeholder="e.g. Dangote Industries, PZ Cussons, Nestlé Nigeria"
            value={deptOrgData.companyName}
            onChange={(e) => setDeptOrgData({ ...deptOrgData, companyName: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={deptOrgData.country} onValueChange={(v) => setDeptOrgData({ ...deptOrgData, country: v })}>
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default Currency</Label>
            <Select value={deptOrgData.currency} onValueChange={(v) => setDeptOrgData({ ...deptOrgData, currency: v })}>
              <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">You are setting up the Logistics Department portal</strong> -
            not a logistics company. This system will manage your internal fleet, 3PL vendors,
            dispatch planning, and cost control.
          </p>
        </div>
      </div>
    </motion.div>
  );

  const renderDeptStep3 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Your logistics operation</h2>
        <p className="text-muted-foreground mt-2">This configures your department's workflows and integrations</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Industry Type *</Label>
          <Select value={deptProfile.industryType} onValueChange={(v) => setDeptProfile({ ...deptProfile, industryType: v })}>
            <SelectTrigger><SelectValue placeholder="Select your industry" /></SelectTrigger>
            <SelectContent>
              {DEPT_INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Number of Platform Users *</Label>
          <Input
            type="number"
            min={1}
            placeholder="How many team members will use RouteAce?"
            value={deptProfile.teamSize}
            onChange={(e) => {
              const v = e.target.value;
              setDeptProfile({ ...deptProfile, teamSize: v });
              const rec = recommendDeptPlan(v);
              if (rec) setDeptPlan(rec);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Includes Head of Logistics, Logistics Managers, Outbound/Inbound Officers, Finance Controllers, etc.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Current ERP / WMS System</Label>
          <Select value={deptProfile.erpSystem} onValueChange={(v) => setDeptProfile({ ...deptProfile, erpSystem: v })}>
            <SelectTrigger><SelectValue placeholder="Select your ERP or WMS" /></SelectTrigger>
            <SelectContent>
              {DEPT_ERP_SYSTEMS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">RouteAce integrates alongside your existing systems</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Operating Regions</Label>
            <Input
              placeholder="e.g. Lagos, Abuja, Kano"
              value={deptProfile.operatingRegions}
              onChange={(e) => setDeptProfile({ ...deptProfile, operatingRegions: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Warehouses / Distribution Centres</Label>
            <Select value={deptProfile.warehouseCount} onValueChange={(v) => setDeptProfile({ ...deptProfile, warehouseCount: v })}>
              <SelectTrigger><SelectValue placeholder="Select count" /></SelectTrigger>
              <SelectContent>
                {DEPT_WAREHOUSE_COUNTS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderDeptStep4 = () => {
    const recommended = recommendDeptPlan(deptProfile.teamSize);
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
        className="space-y-5"
      >
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Choose your plan</h2>
          {deptProfile.teamSize && (
            <p className="text-sm text-primary mt-2 font-medium">
              Based on {deptProfile.teamSize} users, we recommend{" "}
              <strong>{recommended === "foundation" ? "Foundation" : recommended === "growth" ? "Growth" : "Enterprise"}</strong>
            </p>
          )}
        </div>
        <div className="grid gap-4">
          {DEPT_PLANS.map((plan) => {
            const isSelected = deptPlan === plan.id;
            const isRec = recommended === plan.id;
            return (
              <Card
                key={plan.id}
                className={`cursor-pointer transition-all relative ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 shadow-lg"
                    : "border-border/50 hover:border-primary/30 hover:shadow-md"
                }`}
                onClick={() => setDeptPlan(plan.id)}
              >
                {(plan.badge || isRec) && (
                  <div className="absolute -top-2.5 left-4">
                    <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5">
                      {isRec ? "Recommended for you" : plan.badge}
                    </Badge>
                  </div>
                )}
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{plan.title}</h3>
                        <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {plan.includedUsers} users included · Extra users {plan.extraUserPrice}/user
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-2xl font-bold text-primary">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-border/50 grid gap-1.5">
                      {plan.features.map((f) => (
                        <div key={f.label} className="flex items-center gap-2">
                          {f.included
                            ? <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                            : <X className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />}
                          <span className={`text-xs ${f.included ? "text-foreground" : "text-muted-foreground/50"}`}>
                            {f.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-xs text-center text-muted-foreground">
          All plans billed monthly in NGN · Extra users charged at end of billing cycle
        </p>
      </motion.div>
    );
  };

  const renderDeptStep5 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 shadow-lg">
          <Crown className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">You are the Head of Logistics</h2>
        <p className="text-muted-foreground mt-2">
          As the first user, you have full authority over this portal
        </p>
      </div>
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Director / Head of Logistics - Full Authority
          </CardTitle>
          <CardDescription>Your role has final authority over all logistics decisions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { title: "Full Platform Control", desc: "View, approve, and override all dispatch, vendor, and finance decisions" },
            { title: "Vendor & 3PL Authority", desc: "Approve vendor onboarding, rate cards, and payment releases above ₦500,000" },
            { title: "Team Management", desc: "Add Logistics Managers, Outbound/Inbound Officers, Finance Controllers, and more" },
            { title: "Budget & Cost Oversight", desc: "Access the full cost-per-delivery and margin intelligence layer" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm text-muted-foreground">
          <strong>Registered as:</strong>{" "}
          <span className="font-mono text-foreground">{user?.email}</span>{" "}
          · <strong>Organisation:</strong> {deptOrgData.companyName || "Your Company"}
          · <strong>Plan:</strong> {deptPlan ? deptPlan.charAt(0).toUpperCase() + deptPlan.slice(1) : "-"}
        </p>
      </div>
    </motion.div>
  );

  const renderDeptStep6 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Your Team's Access Levels</h2>
        <p className="text-muted-foreground mt-2">Invite your team and assign their roles from Settings → Users</p>
      </div>
      <div className="grid gap-3">
        {[
          { role: "Head of Logistics / Director", desc: "Final authority. Full platform access. Approves all major vendor payments. (You)", icon: Crown, isYou: true },
          { role: "Logistics Manager", desc: "Runs daily operations. Approves dispatches, vendor invoices, and team actions.", icon: Shield },
          { role: "Outbound & Inbound Officer", desc: "Creates dispatches, manages warehouse hand-offs, tracks in-transit orders.", icon: Truck },
          { role: "Finance Controller (Logistics)", desc: "Reviews vendor invoices, tracks cost centre spend, triggers payment approvals.", icon: Building2 },
          { role: "Fleet & Transport Supervisor", desc: "Manages vehicles, drivers, and 3PL carrier assignments.", icon: Zap },
          { role: "Sales Department (Read-only)", desc: "Tracks orders, delivery timelines, OTD rates, and E2E shipment visibility.", icon: BarChart3 },
        ].map((item) => (
          <div key={item.role} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <div className="p-2 rounded-lg bg-primary/10">
              <item.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{item.role}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            {item.isYou && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
          </div>
        ))}
      </div>
    </motion.div>
  );

  const renderDeptStep7 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 shadow-lg">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Your control tower is ready</h2>
        <p className="text-muted-foreground mt-2">Here's where to start with your Logistics Department portal</p>
      </div>
      <div className="space-y-3">
        {[
          { step: 1, title: "Add Your 3PL Vendors", desc: "Onboard your transport carriers and upload their rate cards", link: "/vendors" },
          { step: 2, title: "Set Up Your Fleet", desc: "Register internal vehicles and assign drivers", link: "/fleet" },
          { step: 3, title: "Create Your First Dispatch", desc: "Assign a shipment to internal fleet or a 3PL carrier", link: "/dispatch" },
          { step: 4, title: "Invite Your Team", desc: "Add Logistics Managers, Finance Controllers, and Officers", link: "/users" },
          { step: 5, title: "Give Sales Dept Access", desc: "Invite Sales team members - they get E2E tracking only", link: "/users" },
        ].map((item) => (
          <div
            key={item.step}
            className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => navigate(item.link)}
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
              {item.step}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        ))}
      </div>
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
        <p className="text-sm">
          <strong className="text-primary">{deptOrgData.companyName}</strong> ·{" "}
          {deptPlan ? deptPlan.charAt(0).toUpperCase() + deptPlan.slice(1) : "Foundation"} Plan ·{" "}
          {deptProfile.industryType || "Logistics Department"}
        </p>
      </div>
    </motion.div>
  );

  const renderLCStep3 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Let's set up your company</h2>
        <p className="text-muted-foreground mt-2">Tell us about your business so we can customize your experience</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            placeholder="Enter your company name"
            value={companyData.companyName}
            onChange={(e) => setCompanyData({ ...companyData, companyName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Industry</Label>
          <Select value={companyData.industry} onValueChange={(v) => setCompanyData({ ...companyData, industry: v })}>
            <SelectTrigger><SelectValue placeholder="Select your industry" /></SelectTrigger>
            <SelectContent>
              {INDUSTRIES_LC.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fleet Size</Label>
            <Select value={companyData.fleetSize} onValueChange={(v) => setCompanyData({ ...companyData, fleetSize: v })}>
              <SelectTrigger><SelectValue placeholder="Select fleet size" /></SelectTrigger>
              <SelectContent>
                {FLEET_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={companyData.country} onValueChange={(v) => setCompanyData({ ...companyData, country: v })}>
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Default Currency</Label>
          <Select value={companyData.currency} onValueChange={(v) => setCompanyData({ ...companyData, currency: v })}>
            <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.div>
  );

  const renderLCStep7 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 shadow-lg">
          <Crown className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">You are the Company Owner</h2>
        <p className="text-muted-foreground mt-2">As the first user, you have been assigned as the Super Admin</p>
      </div>
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Super Admin Powers</CardTitle>
          <CardDescription>Your role cannot be downgraded by anyone</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { title: "Full System Access", desc: "View, create, edit, approve, and delete everything" },
            { title: "User Management", desc: "Only you can add or remove staff members" },
            { title: "Super Admin Assignment", desc: "Only Super Admins can assign/remove other Super Admins" },
            { title: "Platform Governance", desc: "White-label configuration, API access, investor dashboards" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.desc}</p></div>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Your email <span className="font-mono text-foreground">{user?.email}</span> is now registered as the Company Owner.
        </p>
      </div>
    </motion.div>
  );

  const renderLCStep8 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Access Control Overview</h2>
        <p className="text-muted-foreground mt-2">You have full system control. Here's how roles work:</p>
      </div>
      <div className="grid gap-3">
        {[
          { role: "Super Admin", desc: "Full platform access (You)", icon: Crown },
          { role: "Org Admin", desc: "Company management & team oversight", icon: Shield },
          { role: "Ops Manager", desc: "Fleet, dispatch, and route planning", icon: Truck },
          { role: "Finance Manager", desc: "Invoicing, payroll, and funding", icon: Building2 },
          { role: "Dispatcher", desc: "Job creation and driver assignment", icon: MapPin },
        ].map((item) => (
          <div key={item.role} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <div className="p-2 rounded-lg bg-primary/10"><item.icon className="h-5 w-5 text-primary" /></div>
            <div className="flex-1"><p className="font-medium">{item.role}</p><p className="text-sm text-muted-foreground">{item.desc}</p></div>
            {item.role === "Super Admin" && <CheckCircle2 className="h-5 w-5 text-primary" />}
          </div>
        ))}
      </div>
      <Card><CardContent className="pt-4">
        <h4 className="font-medium mb-2">Quick Actions Available to You:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Invite users and assign roles from Settings → Users</li>
          <li>• Configure approval workflows from Settings</li>
          <li>• Set up white-label branding for your clients</li>
          <li>• Access all dashboards and analytics</li>
        </ul>
      </CardContent></Card>
    </motion.div>
  );

  const renderLCStep9 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 shadow-lg">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">You're All Set!</h2>
        <p className="text-muted-foreground mt-2">Here's how to get started with RouteAce</p>
      </div>
      <div className="space-y-4">
        {[
          { step: 1, title: "Add Your Fleet", desc: "Register your vehicles with their capacity and type", link: "/fleet" },
          { step: 2, title: "Add Drivers", desc: "Onboard your drivers and assign them to vehicles", link: "/drivers" },
          { step: 3, title: "Create Your First Dispatch", desc: "Start planning routes and managing deliveries", link: "/dispatch" },
          { step: 4, title: "Invite Your Team", desc: "Add team members with appropriate roles", link: "/users" },
        ].map((item) => (
          <div key={item.step} className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(item.link)}>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">{item.step}</div>
            <div className="flex-1"><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.desc}</p></div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        ))}
      </div>
    </motion.div>
  );

  const renderStepContent = () => {
    if (isDept) {
      switch (currentStep) {
        case 1: return <ModeSelectionStep selected={tenantMode} onChange={setTenantMode} />;
        case 2: return renderDeptStep2();
        case 3: return renderDeptStep3();
        case 4: return renderDeptStep4();
        case 5: return renderDeptStep5();
        case 6: return renderDeptStep6();
        case 7: return renderDeptStep7();
        default: return null;
      }
    } else {
      switch (currentStep) {
        case 1: return <ModeSelectionStep selected={tenantMode} onChange={setTenantMode} />;
        case 2: return <PlatformSelectStep selected={platformChoice} onChange={setPlatformChoice} />;
        case 3: return renderLCStep3();
        case 4: return <LogisticsTypeStep data={logisticsType} onChange={setLogisticsType} />;
        case 5: return (
          <PricingEstimatorStep
            operationType={logisticsType.operationType}
            vehicleCount={logisticsType.vehicleCount}
            monthlyDeliveries={logisticsType.monthlyDeliveries}
            currency={companyData.currency}
          />
        );
        case 6: return <BusinessProfileStep data={businessProfile} onChange={setBusinessProfile} />;
        case 7: return renderLCStep7();
        case 8: return renderLCStep8();
        case 9: return renderLCStep9();
        default: return null;
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4 overflow-x-auto">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-shrink-0">
                <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-colors ${
                  currentStep >= step.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground"
                }`}>
                  {currentStep > step.id ? <CheckCircle2 className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`h-0.5 w-8 sm:w-14 mx-1.5 transition-colors ${currentStep > step.id ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h3 className="font-semibold">{STEPS[currentStep - 1]?.title}</h3>
            <p className="text-sm text-muted-foreground">{STEPS[currentStep - 1]?.description}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto px-6 py-8 w-full">
        <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>
      </div>

      <div className="border-t bg-card">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1}>
            <ArrowLeft className="h-4 w-4 mr-2" />Previous
          </Button>
          {currentStep < totalSteps ? (
            <Button onClick={handleNext} disabled={isNextDisabled()}>
              Next<ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Setting up...</>
              ) : (
                <>{isDept ? "Launch My Portal" : "Get Started"}<Sparkles className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CompanyOnboardingFlow;
