import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3, CreditCard, Users, TrendingUp, ShieldCheck, Target,
  Globe, ChevronLeft, ChevronRight, LogOut, Route, Package,
  Receipt, MapPin, Truck, ClipboardList, Boxes, Brain, Flame,
  Eye, Search, Award, Share2, Store, ShoppingCart, Wallet,
  BookOpen, Lock, ArrowRightLeft, Tag, DollarSign, Database, Megaphone,
  Activity, Building2, LayoutDashboard, Fingerprint, FileText,
  Star, Heart, Zap, Wine, Rocket, Radio, Moon, Hash, Plane, Swords,
  Sprout, CloudRain, Leaf, Wheat, Warehouse, Thermometer,
  Pill, Stethoscope, TestTube, Syringe, HeartPulse, Scale,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { getIndustryConfig } from "@/lib/industryConfig";
import { useLiquorRole, type LiquorRole } from "@/hooks/useLiquorRole";
import { useIndustryRole, ROLE_ENABLED_INDUSTRIES } from "@/hooks/useIndustryRole";
import { RoleBadge } from "@/components/rbac/RoleBadge";
import type { AgriRole } from "@/hooks/useAgriRole";
import type { PharmaRole } from "@/hooks/usePharmaRole";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  liquorRoles?: LiquorRole[];
  agriRoles?: AgriRole[];
  pharmaRoles?: PharmaRole[];
}

// Liquor role groups
const DIST_OWNER: LiquorRole[] = ["distributor_owner", "platform_admin"];
const DIST_ALL: LiquorRole[] = ["distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "distributor_warehouse_manager", "distributor_finance_manager", "distributor_logistics_manager", "platform_admin"];
const SUPPLIER_ALL: LiquorRole[] = ["supplier_brand_owner", "supplier_sales_director", "supplier_trade_marketing", "supplier_market_analyst", "supplier_distribution_manager", "platform_admin"];
const RETAILER_ALL: LiquorRole[] = ["retailer_bar_owner", "retailer_restaurant_owner", "retailer_procurement_manager", "retailer_store_manager", "platform_admin"];
const LOGISTICS_ALL: LiquorRole[] = ["logistics_fleet_manager", "logistics_delivery_driver", "logistics_route_planner", "platform_admin"];
const PLATFORM_ALL: LiquorRole[] = ["platform_admin", "data_intelligence_customer", "investor_viewer"];
const FINANCE_ROLES: LiquorRole[] = ["distributor_owner", "distributor_finance_manager", "supplier_brand_owner", "platform_admin"];
const ALL_LIQUOR: LiquorRole[] = [
  "distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "distributor_warehouse_manager",
  "distributor_finance_manager", "distributor_logistics_manager", "supplier_brand_owner", "supplier_sales_director",
  "supplier_trade_marketing", "supplier_market_analyst", "supplier_distribution_manager", "retailer_bar_owner",
  "retailer_restaurant_owner", "retailer_procurement_manager", "retailer_store_manager", "logistics_fleet_manager",
  "logistics_delivery_driver", "logistics_route_planner", "platform_admin", "data_intelligence_customer", "investor_viewer",
];

// Agri role groups
const AGRI_LEADERSHIP: AgriRole[] = ["manufacturer_ceo", "distributor_owner", "platform_admin"];
const AGRI_MANUFACTURER: AgriRole[] = ["manufacturer_ceo", "manufacturer_product_manager", "manufacturer_agronomist", "manufacturer_field_officer", "manufacturer_regulatory", "manufacturer_supply_chain", "platform_admin"];
const AGRI_DISTRIBUTOR: AgriRole[] = ["distributor_owner", "distributor_sales_manager", "distributor_field_agent", "distributor_warehouse_manager", "distributor_finance_manager", "platform_admin"];
const AGRI_DEALER: AgriRole[] = ["dealer_owner", "dealer_store_manager", "dealer_procurement", "platform_admin"];
const AGRI_FIELD: AgriRole[] = ["manufacturer_field_officer", "distributor_field_agent", "cooperative_extension_officer", "manufacturer_agronomist", "platform_admin"];
const AGRI_WAREHOUSE: AgriRole[] = ["distributor_warehouse_manager", "manufacturer_supply_chain", "dealer_store_manager", "platform_admin"];
const AGRI_LOGISTICS: AgriRole[] = ["logistics_fleet_manager", "logistics_delivery_driver", "distributor_owner", "platform_admin"];
const AGRI_FINANCE: AgriRole[] = ["manufacturer_ceo", "distributor_owner", "distributor_finance_manager", "platform_admin"];
const AGRI_SCIENCE: AgriRole[] = ["manufacturer_agronomist", "manufacturer_field_officer", "cooperative_extension_officer", "platform_admin"];
const ALL_AGRI: AgriRole[] = [
  "manufacturer_ceo", "manufacturer_product_manager", "manufacturer_agronomist", "manufacturer_field_officer",
  "manufacturer_regulatory", "manufacturer_supply_chain", "distributor_owner", "distributor_sales_manager",
  "distributor_field_agent", "distributor_warehouse_manager", "distributor_finance_manager",
  "dealer_owner", "dealer_store_manager", "dealer_procurement",
  "cooperative_manager", "cooperative_extension_officer",
  "logistics_fleet_manager", "logistics_delivery_driver", "platform_admin", "investor_viewer",
];

// Pharma role groups
const PHARMA_LEADERSHIP: PharmaRole[] = ["manufacturer_ceo", "distributor_owner", "platform_admin"];
const PHARMA_MANUFACTURER: PharmaRole[] = ["manufacturer_ceo", "manufacturer_sales_director", "manufacturer_med_rep", "manufacturer_med_science", "manufacturer_regulatory_affairs", "manufacturer_quality_assurance", "manufacturer_supply_chain", "platform_admin"];
const PHARMA_DISTRIBUTOR: PharmaRole[] = ["distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "distributor_warehouse_manager", "distributor_finance_manager", "platform_admin"];
const PHARMA_PHARMACY: PharmaRole[] = ["pharmacy_owner", "pharmacy_manager", "pharmacy_procurement", "platform_admin"];
const PHARMA_HOSPITAL: PharmaRole[] = ["hospital_pharmacy_director", "hospital_procurement", "platform_admin"];
const PHARMA_LOGISTICS: PharmaRole[] = ["logistics_fleet_manager", "logistics_cold_chain_specialist", "logistics_delivery_driver", "platform_admin"];
const PHARMA_COMPLIANCE: PharmaRole[] = ["manufacturer_regulatory_affairs", "manufacturer_quality_assurance", "manufacturer_ceo", "platform_admin"];
const PHARMA_SALES: PharmaRole[] = ["manufacturer_ceo", "manufacturer_sales_director", "manufacturer_med_rep", "distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "platform_admin"];
const PHARMA_WAREHOUSE: PharmaRole[] = ["distributor_owner", "distributor_warehouse_manager", "manufacturer_supply_chain", "platform_admin"];
const PHARMA_FINANCE: PharmaRole[] = ["manufacturer_ceo", "distributor_owner", "distributor_finance_manager", "platform_admin"];
const ALL_PHARMA: PharmaRole[] = [
  "manufacturer_ceo", "manufacturer_sales_director", "manufacturer_med_rep", "manufacturer_med_science",
  "manufacturer_regulatory_affairs", "manufacturer_quality_assurance", "manufacturer_supply_chain",
  "distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "distributor_warehouse_manager", "distributor_finance_manager",
  "pharmacy_owner", "pharmacy_manager", "pharmacy_procurement",
  "hospital_pharmacy_director", "hospital_procurement",
  "logistics_fleet_manager", "logistics_cold_chain_specialist", "logistics_delivery_driver",
  "platform_admin", "investor_viewer",
];

const IndustrySidebar = ({ industryCode }: { industryCode: string }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, userRole } = useAuth();
  const config = getIndustryConfig(industryCode);
  const Icon = config.icon;
  const base = `/industry/${industryCode}`;
  const isLiquor = industryCode === "liquor";
  const isAgri = industryCode === "agri";
  const isPharma = industryCode === "pharma";
  const isRoleEnabled = ROLE_ENABLED_INDUSTRIES.includes(industryCode);
  const { liquorRole } = useLiquorRole();
  const industryRole = useIndustryRole(industryCode);
  const isSuperAdmin = userRole === "super_admin";

  const filterByRole = (items: NavItem[]): NavItem[] => {
    if (isSuperAdmin) return items;
    if (isLiquor) {
      if (!liquorRole) return [];
      return items.filter((item) => !item.liquorRoles || item.liquorRoles.includes(liquorRole));
    }
    if (isAgri) {
      const agriRole = industryRole?.role as AgriRole | null;
      if (!agriRole) return [];
      return items.filter((item) => !item.agriRoles || item.agriRoles.includes(agriRole));
    }
    if (isPharma) {
      const pharmaRole = industryRole?.role as PharmaRole | null;
      if (!pharmaRole) return [];
      return items.filter((item) => !item.pharmaRoles || item.pharmaRoles.includes(pharmaRole));
    }
    // For other role-enabled industries, show all items (guards handle access)
    return items;
  };

  // ── Agri-specific navigation ──
  const agriDashboardNav: NavItem[] = isAgri ? [
    { name: "Overview", href: base, icon: BarChart3, agriRoles: ALL_AGRI },
  ] : [];

  const agriCropNav: NavItem[] = isAgri ? [
    { name: "Crop Cycle Intelligence", href: `${base}/crop-cycle`, icon: Sprout, agriRoles: [...AGRI_SCIENCE, ...AGRI_LEADERSHIP] },
    { name: "Farm Advisory", href: `${base}/farm-advisory`, icon: Leaf, agriRoles: [...AGRI_SCIENCE, ...AGRI_FIELD] },
    { name: "Weather Intelligence", href: `${base}/weather`, icon: CloudRain, agriRoles: [...AGRI_SCIENCE, ...AGRI_LEADERSHIP] },
    { name: "Demand Forecasting", href: `${base}/demand-forecast`, icon: Brain, agriRoles: [...AGRI_LEADERSHIP, "manufacturer_supply_chain"] },
  ] : [];

  const agriNetworkNav: NavItem[] = isAgri ? [
    { name: "Farmer Network", href: `${base}/farmer-network`, icon: Users, agriRoles: [...AGRI_FIELD, ...AGRI_LEADERSHIP] },
    { name: "Dealer Network", href: `${base}/outlets`, icon: Store, agriRoles: [...AGRI_DISTRIBUTOR, ...AGRI_DEALER, ...AGRI_LEADERSHIP] },
  ] : [];

  const agriSalesNav: NavItem[] = isAgri ? [
    { name: "Field Sales Ops", href: `${base}/field-sales`, icon: MapPin, agriRoles: [...AGRI_FIELD, ...AGRI_DISTRIBUTOR] },
    { name: "Sales Intelligence", href: `${base}/sales`, icon: Target, agriRoles: [...AGRI_LEADERSHIP, ...AGRI_DISTRIBUTOR] },
    { name: "Product Catalog", href: `${base}/catalog`, icon: Boxes, agriRoles: ALL_AGRI },
  ] : [];

  const agriSupplyNav: NavItem[] = isAgri ? [
    { name: "Supply Logistics", href: `${base}/supply-logistics`, icon: Truck, agriRoles: [...AGRI_LOGISTICS, ...AGRI_DISTRIBUTOR] },
    { name: "Warehouse & Storage", href: `${base}/warehouse`, icon: Warehouse, agriRoles: [...AGRI_WAREHOUSE, ...AGRI_LEADERSHIP] },
    { name: "Procurement", href: `${base}/procurement`, icon: Package, agriRoles: [...AGRI_DISTRIBUTOR, ...AGRI_DEALER] },
  ] : [];

  const agriFinanceNav: NavItem[] = isAgri ? [
    { name: "Finance & Credit", href: `${base}/credit`, icon: CreditCard, agriRoles: AGRI_FINANCE },
    { name: "Reconciliation", href: `${base}/reconciliation`, icon: Receipt, agriRoles: AGRI_FINANCE },
  ] : [];

  // ── Pharma-specific navigation ──
  const pharmaDashboardNav: NavItem[] = isPharma ? [
    { name: "Overview", href: base, icon: BarChart3, pharmaRoles: ALL_PHARMA },
  ] : [];

  const pharmaPrescriptionNav: NavItem[] = isPharma ? [
    { name: "Prescription Intelligence", href: `${base}/prescriptions`, icon: FileText, pharmaRoles: [...PHARMA_SALES, ...PHARMA_PHARMACY, ...PHARMA_HOSPITAL] },
    { name: "Doctor Network", href: `${base}/doctor-network`, icon: Stethoscope, pharmaRoles: [...PHARMA_MANUFACTURER, ...PHARMA_LEADERSHIP] },
    { name: "Drug Batch Tracking", href: `${base}/batch-tracking`, icon: TestTube, pharmaRoles: [...PHARMA_MANUFACTURER, ...PHARMA_DISTRIBUTOR, ...PHARMA_PHARMACY] },
  ] : [];

  const pharmaNetworkNav: NavItem[] = isPharma ? [
    { name: "Pharmacy Network", href: `${base}/pharmacy-network`, icon: Store, pharmaRoles: [...PHARMA_DISTRIBUTOR, ...PHARMA_PHARMACY, ...PHARMA_LEADERSHIP] },
    { name: "Med Rep Sales", href: `${base}/med-rep-sales`, icon: Users, pharmaRoles: PHARMA_SALES },
  ] : [];

  const pharmaSupplyNav: NavItem[] = isPharma ? [
    { name: "Cold Chain Logistics", href: `${base}/cold-chain`, icon: Thermometer, pharmaRoles: [...PHARMA_LOGISTICS, ...PHARMA_WAREHOUSE, ...PHARMA_LEADERSHIP] },
    { name: "Distribution", href: `${base}/distribution`, icon: Truck, pharmaRoles: [...PHARMA_LOGISTICS, ...PHARMA_DISTRIBUTOR] },
    { name: "Warehouse", href: `${base}/warehouse`, icon: Warehouse, pharmaRoles: [...PHARMA_WAREHOUSE, ...PHARMA_LEADERSHIP] },
  ] : [];

  const pharmaComplianceNav: NavItem[] = isPharma ? [
    { name: "Compliance Hub", href: `${base}/compliance`, icon: ShieldCheck, pharmaRoles: [...PHARMA_COMPLIANCE, ...PHARMA_LEADERSHIP] },
  ] : [];

  const pharmaFinanceNav: NavItem[] = isPharma ? [
    { name: "Finance & Credit", href: `${base}/credit`, icon: CreditCard, pharmaRoles: PHARMA_FINANCE },
    { name: "Reconciliation", href: `${base}/reconciliation`, icon: Receipt, pharmaRoles: PHARMA_FINANCE },
  ] : [];

  // ── Liquor-specific navigation (unchanged) ──
  const dashboardNav: NavItem[] = isLiquor ? [
    { name: "Overview", href: base, icon: BarChart3, liquorRoles: ALL_LIQUOR },
  ] : (!isAgri && !isPharma ? [
    { name: "Overview", href: base, icon: BarChart3 },
  ] : []);

  const salesNav: NavItem[] = isLiquor
    ? [
        { name: "Sales Intelligence", href: `${base}/sales`, icon: Target, liquorRoles: [...DIST_ALL, ...SUPPLIER_ALL] },
        { name: "Bar & Restaurant Mgmt", href: `${base}/outlets`, icon: MapPin, liquorRoles: [...DIST_ALL, ...RETAILER_ALL] },
        { name: "AI Journey Planning", href: `${base}/beats`, icon: Route, liquorRoles: DIST_ALL },
        { name: "Field Visits", href: `${base}/visits`, icon: ClipboardList, liquorRoles: DIST_ALL },
        { name: "Case Catalog", href: `${base}/catalog`, icon: Boxes, liquorRoles: ALL_LIQUOR },
      ]
    : (!isAgri && !isPharma ? [
        { name: `${config.terminology.agent} Intelligence`, href: `${base}/sales`, icon: Target },
        { name: `${config.terminology.outlet} Management`, href: `${base}/outlets`, icon: MapPin },
        { name: "AI Journey Planning", href: `${base}/beats`, icon: Route },
        { name: "Field Visits", href: `${base}/visits`, icon: ClipboardList },
        { name: `${config.terminology.product} Catalog`, href: `${base}/catalog`, icon: Boxes },
      ] : []);

  const logisticsNav: NavItem[] = isLiquor ? [
    { name: "Distribution Logistics", href: `${base}/logistics`, icon: Truck, liquorRoles: [...DIST_ALL, ...LOGISTICS_ALL] },
    { name: "Route Plans", href: `${base}/routes`, icon: Route, liquorRoles: [...DIST_ALL, ...LOGISTICS_ALL] },
    { name: "Digital POD", href: `${base}/deliveries`, icon: ClipboardList, liquorRoles: [...DIST_ALL, ...LOGISTICS_ALL] },
  ] : (!isAgri && !isPharma ? [
    { name: "Distribution Logistics", href: `${base}/logistics`, icon: Truck },
    { name: "Route Plans", href: `${base}/routes`, icon: Route },
    { name: "Digital POD", href: `${base}/deliveries`, icon: ClipboardList },
  ] : []);

  const supplyNav: NavItem[] = isLiquor ? [
    { name: "Stock Intelligence", href: `${base}/stock`, icon: Package, liquorRoles: [...DIST_ALL, ...SUPPLIER_ALL] },
    { name: "Procurement AI", href: `${base}/procurement`, icon: Boxes, liquorRoles: [...DIST_ALL, ...SUPPLIER_ALL] },
  ] : (!isAgri && !isPharma ? [
    { name: "Stock Intelligence", href: `${base}/stock`, icon: Package },
    { name: "Procurement AI", href: `${base}/procurement`, icon: Boxes },
  ] : []);

  const financeNav: NavItem[] = isLiquor
    ? [
        { name: "Finance & Credit", href: `${base}/credit`, icon: CreditCard, liquorRoles: FINANCE_ROLES },
        { name: "Reconciliation", href: `${base}/reconciliation`, icon: Receipt, liquorRoles: FINANCE_ROLES },
        { name: "Trade Promotions", href: `${base}/promotions`, icon: TrendingUp, liquorRoles: [...DIST_ALL, ...SUPPLIER_ALL] },
      ]
    : (!isAgri && !isPharma ? [
        { name: "Reconciliation", href: `${base}/reconciliation`, icon: Receipt },
        { name: `${config.terminology.outlet} Credit`, href: `${base}/credit`, icon: CreditCard },
        { name: "Trade Promotions", href: `${base}/promotions`, icon: TrendingUp },
      ] : []);

  const intelligenceNav: NavItem[] = isLiquor ? [
    { name: "Distributor Index", href: `${base}/distributors`, icon: Users, liquorRoles: [...DIST_OWNER, ...SUPPLIER_ALL, ...PLATFORM_ALL] },
    { name: "Benchmark", href: `${base}/benchmark`, icon: Globe, liquorRoles: [...DIST_OWNER, ...SUPPLIER_ALL, ...PLATFORM_ALL] },
    { name: "Margin Protection", href: `${base}/margin`, icon: ShieldCheck, liquorRoles: [...DIST_OWNER, ...FINANCE_ROLES] },
  ] : (!isAgri && !isPharma ? [
    { name: "Distributor Index", href: `${base}/distributors`, icon: Users },
    { name: "Benchmark", href: `${base}/benchmark`, icon: Globe },
    { name: "Margin Protection", href: `${base}/margin`, icon: ShieldCheck },
  ] : []);

  // ── Building Materials navigation ──
  const isBuilding = industryCode === "building";
  const buildingProjectNav: NavItem[] = isBuilding ? [
    { name: "Overview", href: base, icon: BarChart3 },
    { name: "Project Tracker", href: `${base}/projects`, icon: Building2 },
    { name: "Material Planning", href: `${base}/material-planning`, icon: Package },
    { name: "Demand Forecast", href: `${base}/demand-forecast`, icon: Brain },
  ] : [];
  const buildingNetworkNav: NavItem[] = isBuilding ? [
    { name: "Contractor Network", href: `${base}/contractors`, icon: Users },
    { name: "Procurement", href: `${base}/procurement`, icon: Boxes },
  ] : [];
  const buildingSupplyNav: NavItem[] = isBuilding ? [
    { name: "Site Delivery", href: `${base}/site-delivery`, icon: Truck },
    { name: "Supply Logistics", href: `${base}/logistics`, icon: Route },
    { name: "Warehouse", href: `${base}/warehouse`, icon: Warehouse },
  ] : [];

  // ── Cosmetics navigation ──
  const isCosmetics = industryCode === "cosmetics";
  const cosmeticsMarketingNav: NavItem[] = isCosmetics ? [
    { name: "Overview", href: base, icon: BarChart3 },
    { name: "Campaign Manager", href: `${base}/campaigns`, icon: Megaphone },
    { name: "Influencer Engine", href: `${base}/influencers`, icon: Heart },
    { name: "Retail Promotions", href: `${base}/retail-promo`, icon: Tag },
    { name: "Product Launches", href: `${base}/product-launch`, icon: Rocket },
  ] : [];
  const cosmeticsNetworkNav: NavItem[] = isCosmetics ? [
    { name: "Salon Network", href: `${base}/salons`, icon: Store },
    { name: "Consultant Training", href: `${base}/training`, icon: Award },
  ] : [];
  const cosmeticsSupplyNav: NavItem[] = isCosmetics ? [
    { name: "Distribution", href: `${base}/distribution`, icon: Truck },
    { name: "Warehouse", href: `${base}/warehouse`, icon: Warehouse },
  ] : [];

  // ── BFSI navigation ──
  const isBFSI = industryCode === "bfsi";
  const bfsiOpsNav: NavItem[] = isBFSI ? [
    { name: "Overview", href: base, icon: BarChart3 },
    { name: "Agent Performance", href: `${base}/agent-performance`, icon: Users },
    { name: "Loan Processing", href: `${base}/loans`, icon: FileText },
    { name: "Insurance Mgmt", href: `${base}/insurance`, icon: ShieldCheck },
    { name: "Payment Ops", href: `${base}/payments`, icon: CreditCard },
  ] : [];
  const bfsiNetworkNav: NavItem[] = isBFSI ? [
    { name: "Customer Profiling", href: `${base}/customer-profiling`, icon: Eye },
    { name: "Merchant Network", href: `${base}/merchants`, icon: Store },
  ] : [];
  const bfsiRiskNav: NavItem[] = isBFSI ? [
    { name: "Portfolio Risk", href: `${base}/portfolio-risk`, icon: Activity },
    { name: "Compliance", href: `${base}/compliance`, icon: ShieldCheck },
  ] : [];

  // ── Auto-Ancillary navigation ──
  const isAuto = industryCode === "auto";
  const autoPartsNav: NavItem[] = isAuto ? [
    { name: "Overview", href: base, icon: BarChart3 },
    { name: "Parts Database", href: `${base}/parts-database`, icon: Database },
    { name: "Recommendations", href: `${base}/recommendations`, icon: Brain },
    { name: "Demand Forecast", href: `${base}/demand-forecast`, icon: TrendingUp },
  ] : [];
  const autoNetworkNav: NavItem[] = isAuto ? [
    { name: "Workshop Network", href: `${base}/workshops`, icon: Store },
    { name: "Mechanic Registry", href: `${base}/mechanics`, icon: Users },
    { name: "Fleet Service", href: `${base}/fleet-service`, icon: Truck },
  ] : [];
  const autoSupplyNav: NavItem[] = isAuto ? [
    { name: "Distribution", href: `${base}/distribution`, icon: Route },
    { name: "Warehouse", href: `${base}/warehouse`, icon: Warehouse },
  ] : [];

  // ── Consumer Goods navigation ──
  const isConsumer = industryCode === "consumer";
  const consumerSalesNav: NavItem[] = isConsumer ? [
    { name: "Dashboard", href: base, icon: BarChart3 },
    { name: "Sales Intelligence", href: `${base}/sales`, icon: Target },
    { name: "Field Sales", href: `${base}/field-sales`, icon: MapPin },
    { name: "Trade Promotions", href: `${base}/promotions`, icon: Tag },
    { name: "Demand Forecast", href: `${base}/demand-forecast`, icon: Brain },
  ] : [];
  const consumerNetworkNav: NavItem[] = isConsumer ? [
    { name: "Retailer Network", href: `${base}/retailers`, icon: Store },
  ] : [];
  const consumerSupplyNav: NavItem[] = isConsumer ? [
    { name: "Route Optimization", href: `${base}/logistics`, icon: Truck },
    { name: "Warehouse", href: `${base}/warehouse`, icon: Warehouse },
  ] : [];

  // Liquor-only sections
  const networkIntelNav: NavItem[] = isLiquor ? [
    { name: "Retail Network Map", href: `${base}/network-map`, icon: Share2, liquorRoles: [...DIST_ALL, ...SUPPLIER_ALL, ...PLATFORM_ALL] },
    { name: "Retailer Profiles", href: `${base}/retailer-intel`, icon: Eye, liquorRoles: [...DIST_ALL, ...SUPPLIER_ALL] },
    { name: "Territory Heatmaps", href: `${base}/heatmaps`, icon: Flame, liquorRoles: [...DIST_OWNER, ...SUPPLIER_ALL, ...PLATFORM_ALL] },
    { name: "Coverage Analysis", href: `${base}/coverage`, icon: Target, liquorRoles: [...DIST_OWNER, ...SUPPLIER_ALL] },
    { name: "Outlet Lookalikes", href: `${base}/lookalikes`, icon: Search, liquorRoles: [...DIST_ALL, ...SUPPLIER_ALL] },
    { name: "Brand Performance", href: `${base}/brand-intel`, icon: Award, liquorRoles: [...SUPPLIER_ALL, ...DIST_OWNER] },
    { name: "Market Share", href: `${base}/market-share`, icon: BarChart3, liquorRoles: [...SUPPLIER_ALL, ...DIST_OWNER, ...PLATFORM_ALL] },
    { name: "Territory Expansion", href: `${base}/expansion`, icon: Brain, liquorRoles: [...DIST_OWNER, ...SUPPLIER_ALL] },
  ] : [];

  const commerceExchangeNav: NavItem[] = isLiquor ? [
    { name: "Supplier Marketplace", href: `${base}/supplier-market`, icon: Store, liquorRoles: [...DIST_ALL, ...SUPPLIER_ALL] },
    { name: "Distributor Inventory", href: `${base}/dist-market`, icon: Package, liquorRoles: [...DIST_ALL, ...RETAILER_ALL] },
    { name: "Retailer Ordering", href: `${base}/retailer-order`, icon: ShoppingCart, liquorRoles: [...RETAILER_ALL, ...DIST_ALL] },
    { name: "Promo Exchange", href: `${base}/promo-exchange`, icon: Tag, liquorRoles: [...SUPPLIER_ALL, ...DIST_ALL] },
    { name: "Order Routing", href: `${base}/order-routing`, icon: ArrowRightLeft, liquorRoles: [...DIST_OWNER, ...PLATFORM_ALL] },
    { name: "Allocation Engine", href: `${base}/allocations`, icon: Lock, liquorRoles: [...SUPPLIER_ALL, ...DIST_OWNER] },
    { name: "Trade Financing", href: `${base}/trade-finance`, icon: Wallet, liquorRoles: [...FINANCE_ROLES, ...RETAILER_ALL] },
    { name: "Transaction Ledger", href: `${base}/ledger`, icon: BookOpen, liquorRoles: [...FINANCE_ROLES, ...PLATFORM_ALL] },
    { name: "Compliance Engine", href: `${base}/compliance`, icon: ShieldCheck, liquorRoles: [...DIST_OWNER, ...PLATFORM_ALL] },
    { name: "Distributor Intel", href: `${base}/dist-competition`, icon: Award, liquorRoles: [...SUPPLIER_ALL, ...PLATFORM_ALL] },
  ] : [];

  const revenueEngineNav: NavItem[] = isLiquor ? [
    { name: "Transaction Revenue", href: `${base}/txn-revenue`, icon: DollarSign, liquorRoles: [...DIST_OWNER, ...PLATFORM_ALL] },
    { name: "Data Intelligence", href: `${base}/data-intel`, icon: Database, liquorRoles: [...PLATFORM_ALL, ...SUPPLIER_ALL] },
    { name: "Embedded Finance", href: `${base}/embedded-finance`, icon: Wallet, liquorRoles: [...FINANCE_ROLES, ...PLATFORM_ALL] },
    { name: "Supplier Demand", href: `${base}/supplier-demand`, icon: Megaphone, liquorRoles: [...SUPPLIER_ALL, ...PLATFORM_ALL] },
  ] : [];

  const roleDashboardNav: NavItem[] = isLiquor ? [
    { name: "Distributor Hub", href: `${base}/distributor-dash`, icon: Building2, liquorRoles: DIST_ALL },
    { name: "Retailer Hub", href: `${base}/retailer-dash`, icon: Store, liquorRoles: RETAILER_ALL },
    { name: "Supplier Hub", href: `${base}/supplier-dash`, icon: Globe, liquorRoles: SUPPLIER_ALL },
    { name: "Platform Intelligence", href: `${base}/platform-intel`, icon: Activity, liquorRoles: PLATFORM_ALL },
  ] : [];

  const complianceEngineNav: NavItem[] = isLiquor ? [
    { name: "ID Verification", href: `${base}/id-verification`, icon: Fingerprint, liquorRoles: [...DIST_ALL, ...RETAILER_ALL] },
    { name: "Government Dashboard", href: `${base}/gov-dashboard`, icon: Building2, liquorRoles: PLATFORM_ALL },
    { name: "Retailer Compliance", href: `${base}/retailer-compliance`, icon: ShieldCheck, liquorRoles: [...RETAILER_ALL, ...DIST_OWNER] },
    { name: "Compliance Audit", href: `${base}/compliance-audit`, icon: FileText, liquorRoles: [...DIST_OWNER, ...FINANCE_ROLES, ...PLATFORM_ALL] },
  ] : [];

  const enterpriseModulesNav: NavItem[] = isLiquor ? [
    { name: "Account Scoring", href: `${base}/account-scoring`, icon: Star, liquorRoles: [...DIST_ALL] },
    { name: "Demand Forecast", href: `${base}/demand-forecast`, icon: Brain, liquorRoles: [...DIST_OWNER, "distributor_warehouse_manager", ...SUPPLIER_ALL] },
    { name: "Territory Manager", href: `${base}/territory-mgmt`, icon: MapPin, liquorRoles: [...DIST_OWNER, "distributor_sales_manager", ...SUPPLIER_ALL] },
    { name: "Retailer Loyalty", href: `${base}/loyalty`, icon: Heart, liquorRoles: [...RETAILER_ALL, ...DIST_OWNER, "distributor_sales_manager"] },
    { name: "Campaign Funding", href: `${base}/campaign-funding`, icon: Megaphone, liquorRoles: [...SUPPLIER_ALL, ...PLATFORM_ALL] },
    { name: "Auto-Ordering", href: `${base}/auto-ordering`, icon: Zap, liquorRoles: [...RETAILER_ALL, ...DIST_OWNER, "distributor_warehouse_manager"] },
    { name: "Allocation Releases", href: `${base}/allocation-releases`, icon: Wine, liquorRoles: [...SUPPLIER_ALL, ...DIST_OWNER, "distributor_sales_manager", ...RETAILER_ALL] },
    { name: "Success Journey", href: `${base}/journey`, icon: Rocket, liquorRoles: ALL_LIQUOR },
  ] : [];

  const intelligenceBrainNav: NavItem[] = isLiquor ? [
    { name: "Network Graph", href: `${base}/network-graph`, icon: Share2, liquorRoles: [...DIST_OWNER, ...SUPPLIER_ALL, ...PLATFORM_ALL] },
    { name: "Inventory Risk", href: `${base}/inventory-risk`, icon: Package, liquorRoles: [...DIST_ALL, ...SUPPLIER_ALL, ...PLATFORM_ALL] },
    { name: "Brand Trends", href: `${base}/brand-trends`, icon: Flame, liquorRoles: [...DIST_OWNER, ...SUPPLIER_ALL, ...PLATFORM_ALL] },
    { name: "Credit Risk", href: `${base}/credit-risk`, icon: Lock, liquorRoles: FINANCE_ROLES },
    { name: "Promotion ROI", href: `${base}/promotion-roi`, icon: Megaphone, liquorRoles: [...DIST_OWNER, ...SUPPLIER_ALL, ...PLATFORM_ALL] },
    { name: "Retailer Growth", href: `${base}/retailer-growth`, icon: TrendingUp, liquorRoles: [...DIST_ALL, ...SUPPLIER_ALL, ...PLATFORM_ALL] },
    { name: "AI Recommendations", href: `${base}/ai-recommendations`, icon: Brain, liquorRoles: ALL_LIQUOR },
    { name: "Intelligence Alerts", href: `${base}/ai-alerts`, icon: Activity, liquorRoles: [...DIST_OWNER, ...SUPPLIER_ALL, ...PLATFORM_ALL] },
  ] : [];

  const expansionEngineNav: NavItem[] = isLiquor ? [
    { name: "Expansion Dashboard", href: `${base}/expansion-dashboard`, icon: Globe, liquorRoles: [...DIST_OWNER, ...SUPPLIER_ALL, ...PLATFORM_ALL] },
    { name: "SKU Expansion", href: `${base}/sku-expansion`, icon: Wine, liquorRoles: [...DIST_OWNER, "distributor_sales_manager", ...SUPPLIER_ALL, ...PLATFORM_ALL] },
    { name: "Brand Expansion", href: `${base}/brand-expansion`, icon: Award, liquorRoles: [...SUPPLIER_ALL, ...DIST_OWNER, ...PLATFORM_ALL] },
    { name: "Logistics Feasibility", href: `${base}/logistics-feasibility`, icon: Truck, liquorRoles: [...DIST_OWNER, "distributor_logistics_manager", ...LOGISTICS_ALL, ...PLATFORM_ALL] },
    { name: "Regulatory Map", href: `${base}/regulatory-expansion`, icon: ShieldCheck, liquorRoles: [...DIST_OWNER, ...SUPPLIER_ALL, ...PLATFORM_ALL] },
  ] : [];

  const demandSignalNav: NavItem[] = isLiquor ? [
    { name: "Signal Dashboard", href: `${base}/demand-signals`, icon: Radio, liquorRoles: [...DIST_OWNER, ...SUPPLIER_ALL, ...PLATFORM_ALL] },
    { name: "Nightlife Signals", href: `${base}/nightlife-signals`, icon: Moon, liquorRoles: [...DIST_OWNER, ...SUPPLIER_ALL, ...PLATFORM_ALL] },
    { name: "Social Trends", href: `${base}/social-trends`, icon: Hash, liquorRoles: [...DIST_OWNER, ...SUPPLIER_ALL, ...PLATFORM_ALL] },
    { name: "Tourism Signals", href: `${base}/tourism-signals`, icon: Plane, liquorRoles: [...DIST_OWNER, ...SUPPLIER_ALL, ...PLATFORM_ALL] },
    { name: "Competitor Intel", href: `${base}/competitor-intel`, icon: Swords, liquorRoles: [...DIST_OWNER, "distributor_sales_manager", ...SUPPLIER_ALL, ...PLATFORM_ALL] },
  ] : [];

  const securityNav: NavItem[] = isLiquor ? [
    { name: "Security Audit", href: `${base}/security-audit`, icon: ShieldCheck, liquorRoles: ["platform_admin"] },
  ] : [];

  const renderSection = (items: NavItem[], title?: string) => {
    const filtered = filterByRole(items);
    if (filtered.length === 0) return null;
    return (
      <>
        {!collapsed && title && (
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          </div>
        )}
        {filtered.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              } ${collapsed ? "justify-center px-3" : ""}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.name}</span>}
            </Link>
          );
        })}
      </>
    );
  };

  // Role badge display
  const currentRoleName = isLiquor && liquorRole
    ? liquorRole
    : isRoleEnabled && industryRole?.role
    ? industryRole.labels[industryRole.role] || industryRole.role
    : null;

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
    >
      <Link to="/" className="flex items-center gap-3 p-6 border-b border-sidebar-border hover:opacity-80 transition-opacity">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, hsl(${config.colorPrimary}), hsl(${config.colorSecondary}))` }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="font-heading font-bold text-lg text-foreground">{config.displayName}</h1>
            <p className="text-xs text-muted-foreground">{config.description.substring(0, 35)}...</p>
          </motion.div>
        )}
      </Link>

      <div className={`px-4 py-2 border-b border-sidebar-border ${collapsed ? "flex justify-center" : ""}`}>
        <Link to="/dashboard" className="text-xs text-primary hover:underline flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" />
          {!collapsed && "Back to RouteAce"}
        </Link>
      </div>

      {/* Role badge for any role-enabled industry */}
      {!collapsed && currentRoleName && (
        <div className="px-4 py-2 border-b border-sidebar-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Your Role</p>
          {isLiquor && liquorRole ? (
            <RoleBadge role={liquorRole} size="sm" />
          ) : (
            <span className="text-xs font-medium text-foreground">{currentRoleName}</span>
          )}
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {/* Agri sections */}
        {isAgri && (
          <>
            {renderSection(agriDashboardNav)}
            {renderSection(agriCropNav, "Crop Intelligence")}
            {renderSection(agriNetworkNav, "Network")}
            {renderSection(agriSalesNav, "Sales Operations")}
            {renderSection(agriSupplyNav, "Supply & Logistics")}
            {renderSection(agriFinanceNav, "Finance")}
            {renderSection([{ name: "GTM Brain", href: `/gtm-brain-agri`, icon: Radio, agriRoles: AGRI_LEADERSHIP }], "Intelligence")}
          </>
        )}

        {/* Pharma sections */}
        {isPharma && (
          <>
            {renderSection(pharmaDashboardNav)}
            {renderSection(pharmaPrescriptionNav, "Prescriptions & Drugs")}
            {renderSection(pharmaNetworkNav, "Network")}
            {renderSection(pharmaSupplyNav, "Supply & Cold Chain")}
            {renderSection(pharmaComplianceNav, "Compliance")}
            {renderSection(pharmaFinanceNav, "Finance")}
            {renderSection([{ name: "GTM Brain", href: `/gtm-brain-pharma`, icon: Radio, pharmaRoles: PHARMA_LEADERSHIP }], "Intelligence")}
          </>
        )}

        {/* Building Materials sections */}
        {isBuilding && (
          <>
            {renderSection(buildingProjectNav, "Projects")}
            {renderSection(buildingNetworkNav, "Network")}
            {renderSection(buildingSupplyNav, "Supply & Delivery")}
            {renderSection([{ name: "GTM Brain", href: `/gtm-brain-building`, icon: Radio }], "Intelligence")}
          </>
        )}

        {/* Cosmetics sections */}
        {isCosmetics && (
          <>
            {renderSection(cosmeticsMarketingNav, "Marketing")}
            {renderSection(cosmeticsNetworkNav, "Network")}
            {renderSection(cosmeticsSupplyNav, "Supply Chain")}
            {renderSection([{ name: "GTM Brain", href: `/gtm-brain-cosmetics`, icon: Radio }], "Intelligence")}
          </>
        )}

        {/* BFSI sections */}
        {isBFSI && (
          <>
            {renderSection(bfsiOpsNav, "Operations")}
            {renderSection(bfsiNetworkNav, "Network")}
            {renderSection(bfsiRiskNav, "Risk & Compliance")}
            {renderSection([{ name: "GTM Brain", href: `/gtm-brain-bfsi`, icon: Radio }], "Intelligence")}
          </>
        )}

        {/* Auto-Ancillary sections */}
        {isAuto && (
          <>
            {renderSection(autoPartsNav, "Parts Intelligence")}
            {renderSection(autoNetworkNav, "Workshop Network")}
            {renderSection(autoSupplyNav, "Supply Chain")}
            {renderSection([{ name: "GTM Brain", href: `/gtm-brain-auto`, icon: Radio }], "Intelligence")}
          </>
        )}

        {/* Consumer Goods sections */}
        {isConsumer && (
          <>
            {renderSection(consumerSalesNav, "Sales")}
            {renderSection(consumerNetworkNav, "Network")}
            {renderSection(consumerSupplyNav, "Supply Chain")}
            {renderSection([{ name: "GTM Brain", href: `/gtm-brain-consumer`, icon: Radio }], "Intelligence")}
          </>
        )}

        {/* Liquor + generic sections */}
        {!isAgri && !isPharma && !isBuilding && !isCosmetics && !isBFSI && !isAuto && !isConsumer && (
          <>
            {renderSection(dashboardNav)}
            {renderSection(salesNav, "Sales Intelligence")}
            {renderSection(logisticsNav, "Distribution")}
            {renderSection(supplyNav, "Supply Chain")}
            {renderSection(financeNav, "Finance & Credit")}
            {renderSection(intelligenceNav, "Intelligence")}
            {isLiquor && renderSection([{ name: "GTM Brain", href: `/gtm-brain-liquor`, icon: Radio, liquorRoles: [...DIST_OWNER, ...PLATFORM_ALL] }], "GTM Brain")}
            {networkIntelNav.length > 0 && renderSection(networkIntelNav, "Network Graph")}
            {commerceExchangeNav.length > 0 && renderSection(commerceExchangeNav, "Commerce Exchange")}
            {revenueEngineNav.length > 0 && renderSection(revenueEngineNav, "Revenue Engines")}
            {roleDashboardNav.length > 0 && renderSection(roleDashboardNav, "Role Dashboards")}
            {complianceEngineNav.length > 0 && renderSection(complianceEngineNav, "Compliance Engine")}
            {enterpriseModulesNav.length > 0 && renderSection(enterpriseModulesNav, "Enterprise Modules")}
            {intelligenceBrainNav.length > 0 && renderSection(intelligenceBrainNav, "Intelligence Brain")}
            {expansionEngineNav.length > 0 && renderSection(expansionEngineNav, "Expansion Engine")}
            {demandSignalNav.length > 0 && renderSection(demandSignalNav, "Demand Signals")}
            {securityNav.length > 0 && renderSection(securityNav, "Security")}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-1">
        {user && (
          <Button
            variant="ghost"
            onClick={async () => { await signOut(); navigate(`/industry/${industryCode}/auth`, { replace: true }); }}
            className={`w-full flex items-center gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 ${collapsed ? "justify-center px-3" : ""}`}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="font-medium">Sign Out</span>}
          </Button>
        )}
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-secondary border border-border rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </motion.aside>
  );
};

export default IndustrySidebar;
