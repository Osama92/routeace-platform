import {
  Store, Wine, Wheat, Pill, HardHat, Sparkles, Landmark, Wrench,
  ShoppingBag, Factory,
} from "lucide-react";

export interface IndustryConfig {
  code: string;
  name: string;
  displayName: string;
  icon: typeof Store;
  colorPrimary: string; // HSL values
  colorSecondary: string;
  description: string;
  terminology: {
    outlet: string;
    order: string;
    delivery: string;
    agent: string;
    product: string;
  };
  kpiCategories: string[];
}

export const INDUSTRIES: Record<string, IndustryConfig> = {
  fmcg: {
    code: "fmcg",
    name: "FMCG",
    displayName: "RouteAce FMCG OS",
    icon: Store,
    colorPrimary: "142 76% 36%",
    colorSecondary: "173 80% 40%",
    description: "Fast-Moving Consumer Goods distribution intelligence",
    terminology: { outlet: "Retailer", order: "Order", delivery: "Delivery", agent: "Sales Rep", product: "SKU" },
    kpiCategories: ["Numeric Distribution", "Weighted Distribution", "SKU Penetration", "Fill Rate", "Promotion ROI"],
  },
  liquor: {
    code: "liquor",
    name: "Liquor",
    displayName: "RouteAce Liquor OS",
    icon: Wine,
    colorPrimary: "0 72% 51%",
    colorSecondary: "348 83% 47%",
    description: "Beverage distribution with excise & compliance tracking",
    terminology: { outlet: "Bar/Restaurant", order: "Case Order", delivery: "Dispatch", agent: "Trade Rep", product: "Case" },
    kpiCategories: ["Case Velocity", "Outlet Compliance", "Brand Penetration", "Bottle Returns"],
  },
  agri: {
    code: "agri",
    name: "Agri-Inputs",
    displayName: "RouteAce Agri OS",
    icon: Wheat,
    colorPrimary: "83 78% 41%",
    colorSecondary: "120 61% 34%",
    description: "Agricultural input distribution with crop-cycle intelligence",
    terminology: { outlet: "Agro-Dealer", order: "Season Order", delivery: "Delivery", agent: "Field Agent", product: "Input" },
    kpiCategories: ["Dealer Coverage", "Seasonal Capture", "Input Adoption", "Crop Cycle"],
  },
  pharma: {
    code: "pharma",
    name: "Pharmaceuticals",
    displayName: "RouteAce Pharma OS",
    icon: Pill,
    colorPrimary: "199 89% 48%",
    colorSecondary: "210 79% 42%",
    description: "Pharmaceutical distribution with prescription tracking",
    terminology: { outlet: "Pharmacy/Hospital", order: "Prescription Order", delivery: "Dispatch", agent: "Med Rep", product: "Drug" },
    kpiCategories: ["Prescription Uplift", "Doctor Coverage", "Sample Conversion"],
  },
  building: {
    code: "building",
    name: "Building Materials",
    displayName: "RouteAce Build OS",
    icon: HardHat,
    colorPrimary: "25 95% 53%",
    colorSecondary: "32 95% 44%",
    description: "Construction material distribution with project tracking",
    terminology: { outlet: "Dealer/Site", order: "Project Order", delivery: "Site Delivery", agent: "Sales Engineer", product: "Material" },
    kpiCategories: ["Project Conversion", "Site Coverage", "Bulk Velocity"],
  },
  cosmetics: {
    code: "cosmetics",
    name: "Cosmetics",
    displayName: "RouteAce Beauty OS",
    icon: Sparkles,
    colorPrimary: "330 81% 60%",
    colorSecondary: "316 72% 52%",
    description: "Beauty & cosmetics distribution with campaign intelligence",
    terminology: { outlet: "Counter/Store", order: "Order", delivery: "Delivery", agent: "Beauty Advisor", product: "Shade/SKU" },
    kpiCategories: ["Counter Conversion", "Campaign ROI", "Shelf Share"],
  },
  bfsi: {
    code: "bfsi",
    name: "BFSI",
    displayName: "RouteAce Finance OS",
    icon: Landmark,
    colorPrimary: "217 91% 60%",
    colorSecondary: "224 76% 48%",
    description: "Banking & financial services agent network management",
    terminology: { outlet: "Branch/Agent", order: "Application", delivery: "Disbursement", agent: "Agent", product: "Product" },
    kpiCategories: ["Loan Growth", "Agent Productivity", "Portfolio-at-Risk"],
  },
  auto: {
    code: "auto",
    name: "Auto-Ancillary",
    displayName: "RouteAce Auto OS",
    icon: Wrench,
    colorPrimary: "45 93% 47%",
    colorSecondary: "38 92% 50%",
    description: "Automotive parts distribution with workshop intelligence",
    terminology: { outlet: "Workshop", order: "Parts Order", delivery: "Dispatch", agent: "Parts Rep", product: "Part" },
    kpiCategories: ["Parts Penetration", "Workshop Activation", "Territory Fill"],
  },
  consumer: {
    code: "consumer",
    name: "Consumer Goods",
    displayName: "RouteAce Consumer OS",
    icon: ShoppingBag,
    colorPrimary: "262 83% 58%",
    colorSecondary: "270 76% 50%",
    description: "General consumer goods distribution management",
    terminology: { outlet: "Retailer", order: "Order", delivery: "Delivery", agent: "Sales Rep", product: "SKU" },
    kpiCategories: ["Distribution", "Sales Velocity", "Fill Rate"],
  },
  other: {
    code: "other",
    name: "Others",
    displayName: "RouteAce Industry OS",
    icon: Factory,
    colorPrimary: "220 14% 46%",
    colorSecondary: "220 9% 36%",
    description: "Custom industry distribution operating system",
    terminology: { outlet: "Point", order: "Order", delivery: "Delivery", agent: "Rep", product: "Product" },
    kpiCategories: ["Coverage", "Velocity", "Fill Rate"],
  },
};

export const getIndustryConfig = (code: string): IndustryConfig => {
  return INDUSTRIES[code] || INDUSTRIES.other;
};

export const INDUSTRY_LIST = Object.values(INDUSTRIES);
