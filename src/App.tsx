import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import UpgradePromptDialog from "@/components/ui/UpgradePromptDialog";
// QueryClientProvider is in main.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import UserThemeSync from "@/components/theme/UserThemeSync";
import { RegionProvider } from "@/contexts/RegionContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { DispatchNotificationProvider } from "@/contexts/DispatchNotificationContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import CoreProtectedRoute from "@/components/core/CoreProtectedRoute";
import OSIsolationGuard from "@/components/guards/OSIsolationGuard";
import DeptRouteGuard from "@/components/dept/DeptRouteGuard";
import AppErrorBoundary from "@/components/auth/AppErrorBoundary";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import BillingVerify from "./pages/BillingVerify";
import TransporterJoinPage from "./pages/TransporterJoinPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Documentation from "./pages/public/Documentation";
import ApiReference from "./pages/public/ApiReference";
import CaseStudies from "./pages/public/CaseStudies";
import Blog from "./pages/public/Blog";
import About from "./pages/public/About";
import Careers from "./pages/public/Careers";
import Contact from "./pages/public/Contact";
import Press from "./pages/public/Press";
import TrialROISummary from "./pages/TrialROISummary";
import TransporterRoster from "./pages/dept/TransporterRoster";
import UserAuth from "./pages/UserAuth";
import Dashboard from "./pages/Dashboard";
import UserDashboard from "./pages/UserDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import Dispatch from "./pages/Dispatch";
import Tracking from "./pages/Tracking";
import Track from "./pages/Track";
import PublicSiteViewer from "./pages/PublicSiteViewer";
import Drivers from "./pages/Drivers";
import DriverPerformance from "./pages/DriverPerformance";
import DriverPayroll from "./pages/DriverPayroll";
import Staff from "./pages/Staff";
import Payroll from "./pages/Payroll";
import Fleet from "./pages/Fleet";
import RoutesPage from "./pages/Routes";
import SalesDeptPortal from "./pages/dept/SalesDeptPortal";
import SalesDeptGuard from "./components/dept/SalesDeptGuard";
import Customers from "./pages/Customers";
import Partners from "./pages/Partners";
import VendorPerformance from "./pages/VendorPerformance";
import Invoices from "./pages/Invoices";
import InvoiceApprovals from "./pages/InvoiceApprovals";
import CollectionsReminders from "./pages/CollectionsReminders";
import InvoiceReports from "./pages/InvoiceReports";
import AccountsLedger from "./pages/AccountsLedger";
import Expenses from "./pages/Expenses";
import VendorPayables from "./pages/VendorPayables";
import VendorPortal from "./pages/VendorPortal";
import Analytics from "./pages/Analytics";
import AdminAnalytics from "./pages/AdminAnalytics";
import EmailTemplatePreview from "./pages/EmailTemplatePreview";
import SessionAnalytics from "./pages/SessionAnalytics";
import SessionAlerts from "./pages/SessionAlerts";
import Settings from "./pages/Settings";
import UsersPage from "./pages/Users";
import AuditLogs from "./pages/AuditLogs";
import IntelligenceAccessLogs from "./pages/IntelligenceAccessLogs";
import EmailNotifications from "./pages/EmailNotifications";
import EmailTemplates from "./pages/EmailTemplates";
import TargetSettings from "./pages/TargetSettings";
import EmailTemplatesSettings from "./pages/settings/EmailTemplatesSettings";
import ProductMetrics from "./pages/ProductMetrics";
import NetworkEffects from "@/pages/NetworkEffects";
import ProfitLoss from "./pages/ProfitLoss";
import TaxFilingReport from "./pages/TaxFilingReport";
import DriverBonuses from "./pages/DriverBonuses";
import TripRateConfig from "./pages/TripRateConfig";
import VendorRateCards from "./pages/dept/VendorRateCards";
import DeptDynamicPricing from "./pages/dept/DeptDynamicPricing";
import ErpIntegrations from "./pages/dept/ErpIntegrations";
import DeptAIAdvisor from "./pages/dept/DeptAIAdvisor";
import LCAIAdvisor from "./pages/LCAIAdvisor";
import WaybillTemplates from "./pages/dept/WaybillTemplates";
import WaybillManagement from "./pages/dept/WaybillManagement";
import DeptCostCentre from "./pages/dept/DeptCostCentre";
import DeptCostPerDelivery from "./pages/dept/DeptCostPerDelivery";
import DeptBudgetPlanning from "./pages/dept/DeptBudgetPlanning";
import DeptExceptionManagement from "./pages/dept/DeptExceptionManagement";
import DeptInboundReceipts from "./pages/dept/DeptInboundReceipts";
import DeptVendorOnboarding from "./pages/dept/DeptVendorOnboarding";
import DeptRouteApprovals from "./pages/dept/DeptRouteApprovals";
import HistoricalDataMigration from "./pages/HistoricalDataMigration";
import AssetOperationsControl from "./pages/AssetOperationsControl";
import ApiAccess from "./pages/ApiAccess";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import OrgAdminDashboard from "./pages/OrgAdminDashboard";
import OpsManagerDashboard from "./pages/OpsManagerDashboard";
import FinanceManagerDashboard from "./pages/FinanceManagerDashboard";
import CustomerPortal from "./pages/CustomerPortal";
import CustomerAcceptInvite from "./pages/CustomerAcceptInvite";
import PublicTracking from "./pages/PublicTracking";
import LoanManagement from "./pages/LoanManagement";
import InvestorDashboard from "./pages/InvestorDashboard";
import MultiDropBilling from "./pages/MultiDropBilling";
import SideHustleEngine from "./pages/SideHustleEngine";
import PayoutEngine from "./pages/PayoutEngine";
import Onboarding from "./pages/Onboarding";
import GlobalPricing from "./pages/GlobalPricing";
import IndustryOSPricing from "./pages/IndustryOSPricing";
import AdminGovernance from "./pages/AdminGovernance";
import GovernanceControl from "./pages/GovernanceControl";
import NotFound from "./pages/NotFound";

import RoleManagement from "./pages/RoleManagement";
import SuperAdminSignup from "./pages/SuperAdminSignup";
// Signup pages
import LandingPage from "./pages/LandingPage";
import LandingNG from "./pages/LandingNG";
import LandingGlobal from "./pages/LandingGlobal";
import DeveloperPlatform from "./pages/DeveloperPlatform";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import CreateCompany from "./pages/signup/CreateCompany";
import JoinCompany from "./pages/signup/JoinCompany";
import CoreTeamSignup from "./pages/signup/CoreTeamSignup";
// Core System (Internal Only)
import CoreDashboard from "./pages/core/CoreDashboard";
import CoreLoginPage from "./pages/core/CoreLogin";
import CoreIntelligence from "./pages/core/CoreIntelligence";
import CoreSecurityCenter from "./pages/core/CoreSecurityCenter";
import CoreInfrastructureFramework from "./pages/core/CoreInfrastructureFramework";
// Operations pages
import SLAManagement from "./pages/operations/SLAManagement";
import StrategyDashboard from "./pages/StrategyDashboard";
import SupportCenter from "./pages/SupportCenter";
import PublicSupportSubmit from "./pages/PublicSupportSubmit";
import PublicSupportTrack from "./pages/PublicSupportTrack";
import PublicDeliveryRating from "./pages/PublicDeliveryRating";
import FleetCommandCenter from "./pages/FleetCommandCenter";
import FinanceERP from "./pages/FinanceERP";
import FraudMonitor from "./pages/FraudMonitor";
import DriverSuperApp from "./pages/DriverSuperApp";
import CustomerMatchingEngine from "./pages/CustomerMatchingEngine";
import SecurityCenter from "./pages/SecurityCenter";
import FinancialTrustLayer from "./pages/FinancialTrustLayer";
import MultiTenantProtection from "./pages/MultiTenantProtection";
import BackdoorDetection from "./pages/BackdoorDetection";
import AccountIntegrity from "./pages/AccountIntegrity";
import FinancialTrustDashboard from "./pages/FinancialTrustDashboard";
import FinanceAIPerformance from "./pages/FinanceAIPerformance";
import RoleAIPerformance from "./pages/RoleAIPerformance";
import DecisionSimulation from "./pages/DecisionSimulation";
import AutonomousExecutionDashboard from "./pages/AutonomousExecutionDashboard";
import AICEODashboard from "./pages/AICEODashboard";
import AICEOConsciousnessCore from "./pages/AICEOConsciousnessCore";
import AICFOEngine from "./pages/AICFOEngine";
import APWorkspace from "./pages/cfo/APWorkspace";
import ARWorkspace from "./pages/cfo/ARWorkspace";
import MaintenanceIntelligence from "./pages/MaintenanceIntelligence";
import LedgerViewer from "./pages/LedgerViewer";
import FleetInspectionEngine from "./pages/FleetInspectionEngine";
import DriverIntelligence from "./pages/DriverIntelligence";
import IoTTelemetry from "./pages/IoTTelemetry";
import RevenueProtection from "./pages/RevenueProtection";
import AutonomousFleetCommand from "./pages/AutonomousFleetCommand";
import FuelIntelligence from "./pages/FuelIntelligence";
import FleetComplianceHub from "./pages/FleetComplianceHub";
import PredictiveMaintenance from "./pages/PredictiveMaintenance";

import MaintenanceCostOptimizer from "./pages/MaintenanceCostOptimizer";
import FuelSavingsDashboard from "./pages/FuelSavingsDashboard";
import RevenueExpansionEngine from "./pages/RevenueExpansionEngine";
import AutonomousCompanyMode from "./pages/AutonomousCompanyMode";
import UnifiedExecutiveLayer from "./pages/UnifiedExecutiveLayer";
import AIBoardOfDirectors from "./pages/AIBoardOfDirectors";
import SelfExpandingNetwork from "./pages/SelfExpandingNetwork";
import EcosystemControl from "./pages/EcosystemControl";
import WebsiteGenerator from "./pages/WebsiteGenerator";
import AIDealCloser from "./pages/AIDealCloser";
import PartnershipsEngine from "./pages/PartnershipsEngine";
import GlobalExpansion from "./pages/GlobalExpansion";
import MonopolyStrategy from "./pages/MonopolyStrategy";
import CompetitiveIntel from "./pages/CompetitiveIntel";
import PricingDominance from "./pages/PricingDominance";
import WarehouseOutbound from "./pages/WarehouseOutbound";
import AIModulesHub from "./pages/AIModulesHub";
import SystemIntegrityAuditor from "./pages/SystemIntegrityAuditor";
import MyLeave from "./pages/MyLeave";
import LeaveInbox from "./pages/LeaveInbox";
import StaffSignIn from "./pages/StaffSignIn";
import MyKPI from "./pages/MyKPI";
import PerformancePanel from "./pages/PerformancePanel";
import TeamPerformance from "./pages/TeamPerformance";
import MyPayslips from "./pages/MyPayslips";
import AdminPayslips from "./pages/AdminPayslips";
import PayrollAudit from "./pages/PayrollAudit";
import KPITargetCalibration from "./pages/KPITargetCalibration";
import KPIAuditLog from "./pages/KPIAuditLog";
import SecurityArchitectureHub from "./pages/SecurityArchitectureHub";
import AIWorkforce from "./pages/AIWorkforce";
import WalletBanking from "./pages/WalletBanking";
import AIOperationsController from "./pages/AIOperationsController";
import AutonomousDistributionAI from "./pages/AutonomousDistributionAI";
import FleetCCCDashboard from "./pages/FleetCCCDashboard";
import CommerceIdentityTrust from "./pages/CommerceIdentityTrust";
import ContinentalCommerceNetwork from "./pages/ContinentalCommerceNetwork";
import IPOReadiness from "./pages/IPOReadiness";
import TreasuryRiskEngine from "./pages/TreasuryRiskEngine";
import EmbeddedBanking from "./pages/EmbeddedBanking";
import SovereignReporting from "./pages/SovereignReporting";
import TaxAutomation from "./pages/TaxAutomation";
import AdvancedRoutePlanner from "./pages/AdvancedRoutePlanner";
import GlobalTaxCompliance from "./pages/GlobalTaxCompliance";
import EUFreightCompliance from "./pages/EUFreightCompliance";
import TECCorridorOptimizer from "./pages/TECCorridorOptimizer";
import USInterstateFrightAI from "./pages/USInterstateFrightAI";
import GCCTradeCorridorAI from "./pages/GCCTradeCorridorAI";
import BeltRoadAsiaEngine from "./pages/BeltRoadAsiaEngine";
import GlobalFreightIntelligenceExchange from "./pages/GlobalFreightIntelligenceExchange";
import FreightIntelligenceCore from "./pages/FreightIntelligenceCore";
import RiskHedgeEngine from "./pages/RiskHedgeEngine";
import GovernmentIntelligence from "./pages/GovernmentIntelligence";
import SystemInvestorMode from "./pages/SystemInvestorMode";
import InfrastructureFlywheel from "./pages/InfrastructureFlywheel";
import FleetNetworkActivation from "./pages/FleetNetworkActivation";
import ContinentalIntelligenceGraph from "./pages/ContinentalIntelligenceGraph";
import InfrastructureControlTower from "./pages/InfrastructureControlTower";
import CommerceIdentityNetwork from "./pages/CommerceIdentityNetwork";
import MarketIntelligenceEngine from "./pages/MarketIntelligenceEngine";
import PricingIntelligenceEngine from "./pages/PricingIntelligenceEngine";
import TaxIntelligenceEngine from "./pages/TaxIntelligenceEngine";
import RegulatoryMappingAI from "./pages/RegulatoryMappingAI";
import InsuranceMarketplace from "./pages/InsuranceMarketplace";
import FreightFinancialization from "./pages/FreightFinancialization";
import AICommandCenter from "./pages/AICommandCenter";
import MobilityCommandCenter from "./pages/MobilityCommandCenter";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import TaxEngines from "./pages/TaxEngines";
import FinancialStatements from "./pages/FinancialStatements";
import GovernanceIntelligence from "./pages/GovernanceIntelligence";
import DiasporaTradeEngine from "./pages/DiasporaTradeEngine";
import CashflowForecasting from "./pages/CashflowForecasting";
import FinancialIntelligence from "./pages/FinancialIntelligence";
import ProfitabilityEngine from "./pages/ProfitabilityEngine";
import RevenueOptimizationEngine from "./pages/RevenueOptimizationEngine";
import ApprovalCenter from "./pages/ApprovalCenter";
import PanAfricanSettlement from "./pages/PanAfricanSettlement";
import RemittanceCommerceEngine from "./pages/RemittanceCommerceEngine";
import SMECreditMarketplace from "./pages/SMECreditMarketplace";
import TradeLiquidityExchange from "./pages/TradeLiquidityExchange";
import StablecoinSettlement from "./pages/StablecoinSettlement";
import CorridorArbitrage from "./pages/CorridorArbitrage";
import CBDCIntegration from "./pages/CBDCIntegration";
import DigitalAssetHedge from "./pages/DigitalAssetHedge";
import TradeFinanceTokens from "./pages/TradeFinanceTokens";
import TradeFinanceNetwork from "./pages/TradeFinanceNetwork";
import GrowthFunnelOS from "./pages/GrowthFunnelOS";
import SalesCRM from "./pages/SalesCRM";
import AfricanCommerceDataCloud from "./pages/AfricanCommerceDataCloud";
import EmbeddedCommerceLayer from "./pages/EmbeddedCommerceLayer";
import KPIDashboard from "./pages/KPIDashboard";
import CFODashboard from "./pages/CFODashboard";
import RevenueRecognition from "./pages/RevenueRecognition";
import RevenueActivationEngine from "./pages/RevenueActivationEngine";
import AIAutopilot from "./pages/AIAutopilot";
import DecisionCenter from "./pages/DecisionCenter";
import BillingEngine from "./pages/BillingEngine";
import FleetIntelligenceEngine from "./pages/FleetIntelligenceEngine";
import DeptFleetIntelligence from "./pages/dept/DeptFleetIntelligence";
import DeptDriverIntelligence from "./pages/dept/DeptDriverIntelligence";
import DecisionCockpit from "./pages/DecisionCockpit";
import Bills from "./pages/Bills";
import FinanceReconciliation from "./pages/FinanceReconciliation";
import PeriodClosing from "./pages/PeriodClosing";

import IntegrationHub from "./pages/IntegrationHub";
import GTMGrowthEngine from "./pages/GTMGrowthEngine";
import GTMBrainDashboard from "./pages/GTMBrainDashboard";
import ExecutiveAutopilot from "./pages/ExecutiveAutopilot";
import EntityConsolidation from "./pages/EntityConsolidation";
import EventBusMonitor from "./pages/EventBusMonitor";
import PortoDashExport from "./pages/PortoDashExport";
import ProductControlTower from "./pages/ProductControlTower";
import PartnerConsole from "./pages/PartnerConsole";
import FinanceLedger from "./pages/FinanceLedger";
import EntitlementDashboard from "./pages/EntitlementDashboard";
import ApiMarketplace from "./pages/ApiMarketplace";
import ResellerCommandCenter from "./pages/ResellerCommandCenter";
import ResellerScopeCheck from "./pages/ResellerScopeCheck";
import SalesDashboard from "./pages/sales/SalesDashboard";
import SalesLeads from "./pages/sales/SalesLeads";
import SalesAccounts from "./pages/sales/SalesAccounts";
import SalesPipeline from "./pages/sales/SalesPipeline";
import SalesQuotes from "./pages/sales/SalesQuotes";
import SalesForecast from "./pages/sales/SalesForecast";
import SalesActivities from "./pages/sales/SalesActivities";
import {
  PortoDashCommandCenter, PortoDashOrders, PortoDashCatalog, PortoDashMarketplace,
  PortoDashTracking, PortoDashFreight, PortoDashPortLogistics, PortoDashDocuments,
  PortoDashCompliance, PortoDashFinance, PortoDashFX, PortoDashIntelligence,
  PortoDashAnalytics, PortoDashPartners,
} from "./pages/portodash";
import EnterpriseControlCenter from "./pages/EnterpriseControlCenter";
import ComplianceMonitor from "./pages/ComplianceMonitor";
import DistributionExchange from "./pages/DistributionExchange";
import ADEIDashboard from "./pages/ADEIDashboard";
import DistributionNetworkGraph from "./pages/DistributionNetworkGraph";
import TerritoryExpansionEngine from "./pages/TerritoryExpansionEngine";
import DistributionLiquidity from "./pages/DistributionLiquidity";
// FMCG OS Pages
import FMCGDashboard from "./pages/fmcg/FMCGDashboard";
import SalesIntelligence from "./pages/fmcg/SalesIntelligence";
import FMCGLogistics from "./pages/fmcg/FMCGLogistics";
import FMCGRoutePlans from "./pages/fmcg/FMCGRoutePlans";
import FMCGDigitalPOD from "./pages/fmcg/FMCGDigitalPOD";
import FMCGProcurement from "./pages/fmcg/FMCGProcurement";
import StockIntelligence from "./pages/fmcg/StockIntelligence";
import FMCGReconciliation from "./pages/fmcg/FMCGReconciliation";
import TradePromotions from "./pages/fmcg/TradePromotions";
import RetailerCredit from "./pages/fmcg/RetailerCredit";
import DistributorIndex from "./pages/fmcg/DistributorIndex";
import FMCGBenchmark from "./pages/fmcg/FMCGBenchmark";
import MarginDashboard from "./pages/fmcg/MarginDashboard";
import FMCGSalesKPI from "./pages/fmcg/FMCGSalesKPI";
import FMCGRepIntelligence from "./pages/fmcg/FMCGRepIntelligence";
import FMCGRetailers from "./pages/fmcg/FMCGRetailers";
import FMCGJourneyPlanning from "./pages/fmcg/FMCGJourneyPlanning";
import FMCGSKUCatalog from "./pages/fmcg/FMCGSKUCatalog";
import FMCGWarehouse from "./pages/fmcg/FMCGWarehouse";
import FMCGWarehouseHub from "./pages/fmcg/FMCGWarehouseHub";
import FMCGFinance from "./pages/fmcg/FMCGFinance";
import FMCGIntelligence from "./pages/fmcg/FMCGIntelligence";
import FMCGDataLake from "./pages/fmcg/FMCGDataLake";
import FMCGDistributorFinancing from "./pages/fmcg/FMCGDistributorFinancing";
import FMCGAuth from "./pages/fmcg/FMCGAuth";
import FMCGRetailCreditNetwork from "./pages/fmcg/FMCGRetailCreditNetwork";
import FMCGDistributorMarketplace from "./pages/fmcg/FMCGDistributorMarketplace";
import FMCGDemandForecasting from "./pages/fmcg/FMCGDemandForecasting";
import FMCGTeamAccessConsole from "./pages/fmcg/FMCGTeamAccessConsole";
import FMCGWhatsAppOrders from "./pages/fmcg/FMCGWhatsAppOrders";
import FMCGOrderToDelivery from "./pages/fmcg/FMCGOrderToDelivery";
import FMCGFleetCommand from "./pages/fmcg/FMCGFleetCommand";
import FMCGOutboundOps from "./pages/fmcg/FMCGOutboundOps";
import FMCGDistributorApp from "./pages/fmcg/FMCGDistributorApp";
import FMCGSalesRepApp from "./pages/fmcg/FMCGSalesRepApp";
import FMCGWarehouseHandheld from "./pages/fmcg/FMCGWarehouseHandheld";
import FMCGLogisticsCommand from "./pages/fmcg/FMCGLogisticsCommand";
// Industry OS Pages
import IndustryDashboard from "./pages/industry/IndustryDashboard";
import IndustrySubPage from "./pages/industry/IndustrySubPage";
import IndustryAuth from "./pages/industry/IndustryAuth";
import IndustryRoleAuth from "./pages/industry/IndustryRoleAuth";
import IndustrySalesIntelligence from "./pages/industry/IndustrySalesIntelligence";
import IndustryOutletManagement from "./pages/industry/IndustryOutletManagement";
import IndustryBeatPlanning from "./pages/industry/IndustryBeatPlanning";
import IndustryFieldVisits from "./pages/industry/IndustryFieldVisits";
import IndustryProductCatalog from "./pages/industry/IndustryProductCatalog";
import IndustrySupplyChain from "./pages/industry/IndustrySupplyChain";
import IndustryTradePromotions from "./pages/industry/IndustryTradePromotions";
import IndustryDistributorIndex from "./pages/industry/IndustryDistributorIndex";
import IndustryFinanceCredit from "./pages/industry/IndustryFinanceCredit";
import IndustryRoleGuard from "./components/industry/IndustryRoleGuard";
// Agri OS Pages
import {
  AgriCropCycleIntelligence, AgriFarmerNetwork, AgriFieldSales,
  AgriWarehouse, AgriDemandForecast, AgriSupplyLogistics,
  AgriFarmAdvisory, AgriWeatherIntelligence,
} from "./pages/agri";
// Pharma OS Pages
import {
  PharmaPrescriptionIntelligence, PharmaDrugBatchTracking, PharmaColdChain,
  PharmaPharmacyNetwork, PharmaDoctorNetwork, PharmaComplianceHub,
  PharmaMedRepSales, PharmaWarehouse, PharmaDistributionLogistics,
} from "./pages/pharma";
// Building Materials OS Pages
import {
  BuildingProjectTracker, BuildingMaterialPlanning, BuildingSiteDelivery,
  BuildingContractorNetwork, BuildingWarehouse, BuildingDemandForecast,
  BuildingProcurement, BuildingSupplyLogistics,
} from "./pages/building";
// Cosmetics OS Pages
import {
  CosmeticsCampaignManager, CosmeticsInfluencerEngine, CosmeticsRetailPromo,
  CosmeticsProductLaunch, CosmeticsSalonNetwork, CosmeticsConsultantTraining,
  CosmeticsWarehouse, CosmeticsDistribution,
} from "./pages/cosmetics";
// BFSI OS Pages
import {
  BFSIAgentPerformance, BFSILoanProcessing, BFSIInsuranceManagement,
  BFSICustomerProfiling, BFSIMerchantNetwork, BFSIPortfolioRisk,
  BFSIPaymentOps, BFSICompliance,
} from "./pages/bfsi";
// Auto-Ancillary OS Pages
import {
  AutoPartsDatabase, AutoWorkshopNetwork, AutoMechanicRegistry,
  AutoPartsRecommendation, AutoFleetService, AutoWarehouse,
  AutoDistribution, AutoDemandForecast,
} from "./pages/auto";
// Consumer Goods OS Pages
import {
  ConsumerDashboard, ConsumerSalesIntelligence, ConsumerRetailerNetwork,
  ConsumerFieldSales, ConsumerWarehouse, ConsumerLogistics,
  ConsumerTradePromo, ConsumerDemandForecast,
} from "./pages/consumer";
// Industry OS Generator
import IndustryOSGenerator from "./pages/industry/IndustryOSGenerator";
// Global Trade Graph
import {
  TradeGraphOverview, TradeCorridors, DistributionCoverage,
  RetailDemandMap, ExportFlowMap, LogisticsNetwork, TradeAIEngine,
} from "./pages/tradegraph";
// Liquor OS Pages
import {
  LiquorDashboard, LiquorSalesIntelligence, LiquorBarManagement,
  LiquorCaseCatalog, LiquorDigitalPOD, LiquorDistribution,
  LiquorStockIntelligence, LiquorFinanceCredit, LiquorTradePromotions,
  LiquorDistributorIndex, LiquorBenchmarking, LiquorMarginProtection,
  LiquorRetailNetworkMap, LiquorRetailerIntelligence, LiquorTerritoryHeatmaps,
  LiquorDistributorCoverage, LiquorOutletLookalike, LiquorBrandPerformance,
  LiquorMarketShare, LiquorTerritoryExpansion,
  LiquorSupplierMarketplace, LiquorDistributorMarketplace, LiquorRetailerOrdering,
  LiquorTradePromotionExchange, LiquorSmartOrderRouting, LiquorAllocationEngine,
  LiquorTradeFinancing, LiquorTransactionLedger, LiquorComplianceEngine,
  LiquorDistributorCompetition,
  // Revenue Engine Layer
  LiquorTransactionRevenue, LiquorDataIntelligence, LiquorEmbeddedFinance,
  LiquorSupplierDemand, LiquorDistributorDashboard, LiquorRetailerDashboard,
  LiquorSupplierDashboard, LiquorPlatformIntelligence,
  // Compliance Engine
  LiquorIDVerification, LiquorGovernmentDashboard, LiquorRetailerCompliance, LiquorComplianceAudit,
  // Enterprise Modules v2
  LiquorAccountScoring, LiquorDemandForecast, LiquorTerritoryManager, LiquorRetailerLoyalty,
  LiquorCampaignFunding, LiquorAutoOrdering, LiquorAllocationReleases, LiquorOrgJourney,
  // Security Audit
  LiquorSecurityAudit,
  // Intelligence Brain
  LiquorNetworkGraph, LiquorInventoryRisk, LiquorBrandTrends, LiquorCreditRisk,
  LiquorPromotionROI, LiquorRetailerGrowth, LiquorAIRecommendations, LiquorAIAlerts,
  // Global Expansion Engine
  LiquorExpansionDashboard, LiquorSKUExpansion, LiquorBrandExpansion,
  LiquorLogisticsFeasibility, LiquorRegulatoryExpansion,
  // Demand Signal Harvester
  LiquorDemandSignals, LiquorNightlifeSignals, LiquorSocialTrends,
  LiquorTourismSignals, LiquorCompetitorIntel,
} from "./pages/liquor";
import LiquorAuth from "./pages/liquor/LiquorAuth";
import LiquorRoleGuard from "./components/liquor/LiquorRoleGuard";
import { useEffect } from "react";

// Define role groups for easier management
const ADMIN_ROLES = ["admin", "super_admin"] as const;
const ORG_MANAGEMENT_ROLES = ["admin", "super_admin", "org_admin"] as const;
const OPERATIONS_ROLES = ["admin", "super_admin", "org_admin", "ops_manager", "dispatcher"] as const;
const FINANCE_ROLES = ["admin", "super_admin", "org_admin", "finance_manager"] as const;
const SUPPORT_ROLES = ["admin", "super_admin", "org_admin", "support"] as const;
const SHARED_INTELLIGENCE_ROLES = ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher", "support", "driver", "customer"] as const;
const WORKFORCE_SELF_SERVICE_ROLES = ["admin", "super_admin", "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher", "support", "driver"] as const;
const WORKFORCE_APPROVER_ROLES = ["admin", "super_admin", "org_admin", "ops_manager"] as const;
const WORKFORCE_MANAGER_ROLES = ["admin", "super_admin", "org_admin", "ops_manager"] as const;

const UnhandledRejectionGuard = () => {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("[UnhandledRejection]", event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);
  return null;
};

const App = () => (
  <AppErrorBoundary>
    <UnhandledRejectionGuard />
    <AuthProvider>
      <UserThemeSync />
      <RegionProvider>
      <DispatchNotificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <UpgradePromptDialog />
          <BrowserRouter>
            <WorkspaceProvider>
            <OSIsolationGuard>
            <DeptRouteGuard>
            
            <Routes>
            {/* Public routes */}
              <Route path="/access-hub" element={<LandingPage />} />
              <Route path="/welcome" element={<LandingPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/billing/verify" element={<BillingVerify />} />
              <Route path="/support/submit/:slug" element={<PublicSupportSubmit />} />
              <Route path="/support/track/:token" element={<PublicSupportTrack />} />
              <Route path="/rate-delivery/:token" element={<PublicDeliveryRating />} />
              <Route path="/ng" element={<LandingNG />} />
              <Route path="/global" element={<LandingGlobal />} />
              <Route path="/user-auth" element={<UserAuth />} />
              <Route path="/signup/super-admin" element={<Navigate to="/signup/company" replace />} />
              <Route path="/signup/company" element={<CreateCompany />} />
              <Route path="/signup/join" element={<JoinCompany />} />
              <Route path="/signup/core-team" element={<CoreTeamSignup />} />
              <Route path="/track" element={<Track />} />
              <Route path="/site/:subdomain" element={<PublicSiteViewer />} />
              <Route path="/public-tracking" element={<PublicTracking />} />
              <Route path="/transporter/join/:token" element={<TransporterJoinPage />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/docs" element={<Documentation />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/api-reference" element={<ApiReference />} />
              <Route path="/case-studies" element={<CaseStudies />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/about" element={<About />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/press" element={<Press />} />
              <Route
                path="/my-savings"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "admin", "org_admin", "finance_manager"]}>
                    <TrialROISummary />
                  </ProtectedRoute>
                }
              />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/pricing" element={<Navigate to="/" replace />} />
              <Route path="/developer-platform" element={<DeveloperPlatform />} />
              <Route path="/industry-os-pricing" element={<IndustryOSPricing />} />
              <Route
                path="/admin-governance"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES]}>
                    <AdminGovernance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/governance-control"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                    <GovernanceControl />
                  </ProtectedRoute>
                }
              />
              {/* Product Control Tower - Core Team Only (not visible to tenants) */}
              <Route
                path="/product-control-tower"
                element={
                  <ProtectedRoute allowedRoles={["super_admin"]}>
                    <ProductControlTower />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/entitlement-dashboard"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                    <EntitlementDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/partner-console"
                element={
                  <ProtectedRoute>
                    <PartnerConsole />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/finance-ledger"
                element={
                  <ProtectedRoute>
                    <FinanceLedger />
                  </ProtectedRoute>
                }
              />

              {/* Sales OS Routes */}
              <Route path="/sales/dashboard" element={<ProtectedRoute><SalesDashboard /></ProtectedRoute>} />
              <Route path="/sales/leads" element={<ProtectedRoute><SalesLeads /></ProtectedRoute>} />
              <Route path="/sales/accounts" element={<ProtectedRoute><SalesAccounts /></ProtectedRoute>} />
              <Route path="/sales/pipeline" element={<ProtectedRoute><SalesPipeline /></ProtectedRoute>} />
              <Route path="/sales/opportunities" element={<ProtectedRoute><SalesPipeline /></ProtectedRoute>} />
              <Route path="/sales/quotes" element={<ProtectedRoute><SalesQuotes /></ProtectedRoute>} />
              <Route path="/sales/forecast" element={<ProtectedRoute><SalesForecast /></ProtectedRoute>} />
              <Route path="/sales/activities" element={<ProtectedRoute><SalesActivities /></ProtectedRoute>} />

              <Route
                path="/decision-simulation"
                element={
                  <ProtectedRoute allowedRoles={[...SHARED_INTELLIGENCE_ROLES]}>
                    <DecisionSimulation />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/autonomous-execution"
                element={
                  <ProtectedRoute allowedRoles={[...SHARED_INTELLIGENCE_ROLES]}>
                    <AutonomousExecutionDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/ai-ceo"
                element={
                  <ProtectedRoute allowedRoles={["super_admin"]}>
                    <AICEODashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/ai-ceo-core"
                element={
                  <ProtectedRoute allowedRoles={["super_admin"]}>
                    <AICEOConsciousnessCore />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/ai-cfo"
                element={
                  <ProtectedRoute>
                    <AICFOEngine />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ledger-viewer"
                element={
                  <ProtectedRoute>
                    <LedgerViewer />
                  </ProtectedRoute>
                }
              />


              <Route path="/join-company" element={<Navigate to="/signup/join" replace />} />
              <Route path="/super-admin-signup" element={<Navigate to="/signup/company" replace />} />
              <Route path="/create-company" element={<Navigate to="/signup/company" replace />} />
              <Route path="/signup/create-company" element={<Navigate to="/signup/company" replace />} />
              <Route path="/core-team-signup" element={<Navigate to="/signup/core-team" replace />} />
              
              {/* Internal Core Team routes - COMPLETELY SEPARATE from customer auth */}
              <Route path="/core/login" element={<CoreLoginPage />} />
              <Route
                path="/core/dashboard"
                element={
                  <CoreProtectedRoute>
                    <CoreDashboard />
                  </CoreProtectedRoute>
                }
              />
              <Route
                path="/core/observability"
                element={
                  <CoreProtectedRoute>
                    <CoreDashboard />
                  </CoreProtectedRoute>
                }
              />
              <Route
                path="/core/intelligence"
                element={
                  <CoreProtectedRoute>
                    <CoreIntelligence />
                  </CoreProtectedRoute>
                }
              />
              <Route
                path="/core/intelligence/*"
                element={
                  <CoreProtectedRoute>
                    <CoreIntelligence />
                  </CoreProtectedRoute>
                }
              />
              <Route
                path="/core/security"
                element={
                  <CoreProtectedRoute>
                    <CoreSecurityCenter />
                  </CoreProtectedRoute>
                }
              />
              <Route
                path="/core/infrastructure"
                element={
                  <CoreProtectedRoute>
                    <CoreInfrastructureFramework />
                  </CoreProtectedRoute>
                }
              />
              
              {/* Role Management - Admin only */}
              <Route
                path="/role-management"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES]}>
                    <RoleManagement />
                  </ProtectedRoute>
                }
              />

              {/* Root: smart role-based redirect via Index */}
              <Route path="/" element={<Index />} />

              {/* Main Dashboard fallback */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Role-specific dashboards */}
              <Route
                path="/super-admin"
                element={
                  <ProtectedRoute allowedRoles={["super_admin"]}>
                    <SuperAdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/org-admin"
                element={
                  <ProtectedRoute allowedRoles={["org_admin"]}>
                    <OrgAdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ops-manager"
                element={
                  <ProtectedRoute allowedRoles={["ops_manager"]}>
                    <OpsManagerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/finance-manager"
                element={
                  <ProtectedRoute allowedRoles={["finance_manager"]}>
                    <FinanceManagerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/finance-ai-performance"
                element={
                  <ProtectedRoute allowedRoles={["finance_manager", "super_admin", "admin"]}>
                    <FinanceAIPerformance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/role-ai-performance"
                element={
                  <ProtectedRoute allowedRoles={["ops_manager", "support", "org_admin", "super_admin", "admin"]}>
                    <RoleAIPerformance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/driver-dashboard"
                element={
                  <ProtectedRoute allowedRoles={["driver"]}>
                    <DriverDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer-portal"
                element={
                  <ProtectedRoute allowedRoles={["customer", "super_admin", "org_admin", "admin", "ops_manager", "support"]}>
                    <CustomerPortal />
                  </ProtectedRoute>
                }
              />
              <Route path="/customer-accept/:token" element={<CustomerAcceptInvite />} />
              <Route
                path="/dept/sales-tracker"
                element={
                  <SalesDeptGuard>
                    <SalesDeptPortal />
                  </SalesDeptGuard>
                }
              />
              <Route
                path="/dept/ai-advisor"
                element={
                  <DeptRouteGuard>
                    <DeptAIAdvisor />
                  </DeptRouteGuard>
                }
              />
              <Route path="/ai-advisor" element={<LCAIAdvisor />} />
              <Route
                path="/dept/route-approvals"
                element={
                  <DeptRouteGuard>
                    <DeptRouteApprovals />
                  </DeptRouteGuard>
                }
              />
              <Route
                path="/user-dashboard"
                element={
                  <ProtectedRoute>
                    <UserDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Operations routes */}
              <Route
                path="/dispatch"
                element={
                  <ProtectedRoute allowedRoles={[...OPERATIONS_ROLES, "operations"]}>
                    <Dispatch />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tracking"
                element={
                  <ProtectedRoute allowedRoles={[...OPERATIONS_ROLES, "operations", "support"]}>
                    <Tracking />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/drivers"
                element={
                  <ProtectedRoute allowedRoles={[...OPERATIONS_ROLES]}>
                    <Drivers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fleet"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES, "ops_manager"]}>
                    <Fleet />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/routes"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES, "ops_manager", "dispatcher"]}>
                    <RoutesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute allowedRoles={[...SUPPORT_ROLES, "ops_manager"]}>
                    <Customers />
                  </ProtectedRoute>
                }
              />

              {/* Partners & Vendors */}
              <Route
                path="/partners"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}>
                    <Partners />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor-performance"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES]}>
                    <VendorPerformance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES]}>
                    <Staff />
                  </ProtectedRoute>
                }
              />

              {/* Finance routes */}
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute allowedRoles={[...FINANCE_ROLES, "operations", "support"]}>
                    <Invoices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoice-approvals"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES]}>
                    <InvoiceApprovals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/collections-reminders"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES, "finance_manager"]}>
                    <CollectionsReminders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/approval-center"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES, "finance_manager", "ops_manager"]}>
                    <ApprovalCenter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoice-reports"
                element={
                  <ProtectedRoute allowedRoles={[...FINANCE_ROLES]}>
                    <InvoiceReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounts-ledger"
                element={
                  <ProtectedRoute allowedRoles={[...FINANCE_ROLES]}>
                    <AccountsLedger />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/expenses"
                element={
                  <ProtectedRoute allowedRoles={[...FINANCE_ROLES, "operations"]}>
                    <Expenses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor-payables"
                element={
                  <ProtectedRoute allowedRoles={[...FINANCE_ROLES]}>
                    <VendorPayables />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payroll"
                element={
                  <ProtectedRoute allowedRoles={[...FINANCE_ROLES]}>
                    <Payroll />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/driver-payroll"
                element={
                  <ProtectedRoute allowedRoles={[...FINANCE_ROLES]}>
                    <DriverPayroll />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/driver-bonuses"
                element={
                  <ProtectedRoute allowedRoles={[...FINANCE_ROLES]}>
                    <DriverBonuses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tax-filing-report"
                element={
                  <ProtectedRoute allowedRoles={[...FINANCE_ROLES]}>
                    <TaxFilingReport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/loan-management"
                element={
                  <ProtectedRoute allowedRoles={[...FINANCE_ROLES]}>
                    <LoanManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profit-loss"
                element={
                  <ProtectedRoute allowedRoles={[...FINANCE_ROLES]}>
                    <ProfitLoss />
                  </ProtectedRoute>
                }
              />

              {/* Analytics routes */}
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES, "finance_manager"]}>
                    <Analytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/network-effects"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES, "finance_manager"]}>
                    <NetworkEffects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-analytics"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES, "finance_manager"]}>
                    <AdminAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/email-preview"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES]}>
                    <EmailTemplatePreview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/session-analytics"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                    <SessionAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/session-alerts"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                    <SessionAlerts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/driver-performance"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES, "ops_manager"]}>
                    <DriverPerformance />
                  </ProtectedRoute>
                }
              />

              {/* Admin routes */}
              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES]}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES]}>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/intelligence-access-logs"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                    <IntelligenceAccessLogs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/email-templates"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                    <EmailTemplates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/trip-rate-config"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES]}>
                    <TripRateConfig />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor-rate-cards"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "org_admin", "ops_manager", "finance_manager"]}>
                    <VendorRateCards />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dept-dynamic-pricing"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "org_admin", "ops_manager", "finance_manager"]}>
                    <DeptDynamicPricing />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/erp-integrations"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "org_admin"]}>
                    <ErpIntegrations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/waybill-templates"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "org_admin", "ops_manager"]}>
                    <WaybillTemplates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/waybill-management"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "org_admin", "ops_manager", "dispatcher"]}>
                    <WaybillManagement />
                  </ProtectedRoute>
                }
              />
              <Route path="/dept/jaggaer" element={<Navigate to="/erp-integrations" replace />} />
              <Route
                path="/dept/cost-centre"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "admin", "org_admin", "finance_manager", "ops_manager"]}>
                    <DeptCostCentre />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dept/cost-per-delivery"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "admin", "org_admin", "finance_manager", "ops_manager"]}>
                    <DeptCostPerDelivery />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dept/budget-planning"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "admin", "org_admin", "finance_manager", "ops_manager"]}>
                    <DeptBudgetPlanning />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dept/exceptions"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "admin", "org_admin", "finance_manager", "ops_manager"]}>
                    <DeptExceptionManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dept/inbound-receipts"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "admin", "org_admin", "finance_manager", "ops_manager"]}>
                    <DeptInboundReceipts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dept/vendor-onboarding"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "admin", "org_admin", "finance_manager", "ops_manager"]}>
                    <DeptVendorOnboarding />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dept/transporters"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "admin", "org_admin"]}>
                    <TransporterRoster />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/historical-data"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                    <HistoricalDataMigration />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/strategy"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                    <StrategyDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/api-access"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                    <ApiAccess />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/api-marketplace"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                    <ApiMarketplace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/target-settings"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES]}>
                    <TargetSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings/email-notifications"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES, "finance_manager"]}>
                    <EmailTemplatesSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/product-metrics"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                    <ProductMetrics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/investor"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}>
                    <InvestorDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Communications */}
              <Route
                path="/emails"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES, "support", "operations"]}>
                    <EmailNotifications />
                  </ProtectedRoute>
                }
              />

              {/* Operations - SLA Management */}
              <Route
                path="/operations/sla-management"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES, "ops_manager"]}>
                    <SLAManagement />
                  </ProtectedRoute>
                }
              />

              {/* Multi-Drop Engine */}
              <Route
                path="/multidrop"
                element={
                  <ProtectedRoute allowedRoles={[...FINANCE_ROLES, "ops_manager"]}>
                    <MultiDropBilling />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/side-hustle"
                element={
                  <ProtectedRoute allowedRoles={[...ORG_MANAGEMENT_ROLES, "ops_manager"]}>
                    <SideHustleEngine />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payout-engine"
                element={
                  <ProtectedRoute allowedRoles={[...FINANCE_ROLES]}>
                    <PayoutEngine />
                  </ProtectedRoute>
                }
              />

              {/* Support Center */}
              <Route
                path="/support-center"
                element={
                  <ProtectedRoute allowedRoles={[...SUPPORT_ROLES, ...ORG_MANAGEMENT_ROLES]}>
                    <SupportCenter />
                  </ProtectedRoute>
                }
              />
              {/* Fleet Command Center */}
              <Route
                path="/fleet-command"
                element={
                  <ProtectedRoute allowedRoles={[...OPERATIONS_ROLES]}>
                    <FleetCommandCenter />
                  </ProtectedRoute>
                }
              />
              {/* Finance ERP */}
              <Route
                path="/finance-erp"
                element={
                  <ProtectedRoute allowedRoles={[...FINANCE_ROLES]}>
                    <FinanceERP />
                  </ProtectedRoute>
                }
              />
              {/* Fraud Monitor */}
              <Route
                path="/fraud-monitor"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                    <FraudMonitor />
                  </ProtectedRoute>
                }
              />

              {/* Driver Super App */}
              <Route
                path="/driver-super-app"
                element={
                  <ProtectedRoute allowedRoles={["driver", "transporter" as any]}>
                    <DriverSuperApp />
                  </ProtectedRoute>
                }
              />
              {/* LD-mode alias - surfaces the 3PL Transporter Portal explicitly */}
              <Route
                path="/transporter-portal"
                element={
                  <ProtectedRoute allowedRoles={["driver", "transporter" as any]}>
                    <DriverSuperApp />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor-portal"
                element={
                  <ProtectedRoute allowedRoles={["transporter" as any, "driver"]}>
                    <VendorPortal />
                  </ProtectedRoute>
                }
              />

              {/* Customer Matching Engine */}
              <Route
                path="/customer-matching"
                element={
                  <ProtectedRoute allowedRoles={["customer", ...ORG_MANAGEMENT_ROLES]}>
                    <CustomerMatchingEngine />
                  </ProtectedRoute>
                }
              />

              {/* Security Command Center */}
              <Route
                path="/security-center"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                    <SecurityCenter />
                  </ProtectedRoute>
                }
              />

              {/* Financial Trust Layer */}
              <Route
                path="/financial-trust"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}>
                    <FinancialTrustLayer />
                  </ProtectedRoute>
                }
              />

              {/* Multi-Tenant Protection */}
              <Route
                path="/multi-tenant-protection"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                    <MultiTenantProtection />
                  </ProtectedRoute>
                }
              />

              {/* Backdoor Detection */}
              <Route
                path="/backdoor-detection"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                    <BackdoorDetection />
                  </ProtectedRoute>
                }
              />

              {/* Account Integrity */}
              <Route
                path="/account-integrity"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                    <AccountIntegrity />
                  </ProtectedRoute>
                }
              />

              {/* Financial Trust Dashboard */}
              <Route
                path="/financial-trust-dashboard"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}>
                    <FinancialTrustDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Security Architecture Hub */}
              <Route
                path="/security-architecture"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                    <SecurityArchitectureHub />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/wallet-banking"
                element={
                  <ProtectedRoute allowedRoles={[...FINANCE_ROLES]}>
                    <WalletBanking />
                  </ProtectedRoute>
                }
              />

              {/* AI Operations Controller */}
              <Route
                path="/ai-operations"
                element={
                <ProtectedRoute allowedRoles={[...ADMIN_ROLES, ...OPERATIONS_ROLES, ...FINANCE_ROLES, "operations"]}>
                    <AIOperationsController />
                  </ProtectedRoute>
                }
              />

              {/* Autonomous Distribution AI */}
              <Route
                path="/autonomous-distribution-ai"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES, "ops_manager", "finance_manager"]}>
                    <AutonomousDistributionAI />
                  </ProtectedRoute>
                }
              />

              {/* Fleet CCC Dashboard */}
              <Route
                path="/fleet-financial-intelligence"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES, "ops_manager", "finance_manager"]}>
                    <FleetCCCDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Commerce Identity & Trust Network */}
              <Route
                path="/commerce-identity-trust"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager"]}>
                    <CommerceIdentityTrust />
                  </ProtectedRoute>
                }
              />
              <Route path="/continental-commerce-network" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}><ContinentalCommerceNetwork /></ProtectedRoute>} />

              {/* Infrastructure & Intelligence Pages */}
              <Route path="/infrastructure-flywheel" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><InfrastructureFlywheel /></ProtectedRoute>} />
              <Route path="/fleet-network-activation" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "ops_manager"]}><FleetNetworkActivation /></ProtectedRoute>} />
              <Route path="/continental-intelligence-graph" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><ContinentalIntelligenceGraph /></ProtectedRoute>} />
              <Route path="/infrastructure-control-tower" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><InfrastructureControlTower /></ProtectedRoute>} />
              <Route path="/commerce-identity-network" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager"]}><CommerceIdentityNetwork /></ProtectedRoute>} />

              <Route
                path="/ipo-readiness"
                element={
                  <ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}>
                    <IPOReadiness />
                  </ProtectedRoute>
                }
              />

              {/* Tax Automation */}
              <Route
                path="/tax-automation"
                element={
                  <ProtectedRoute allowedRoles={[...FINANCE_ROLES]}>
                    <TaxAutomation />
                  </ProtectedRoute>
                }
              />

              {/* Advanced Route Planner */}
              <Route
                path="/advanced-route-planner"
                element={
                  <ProtectedRoute allowedRoles={[...OPERATIONS_ROLES]}>
                    <AdvancedRoutePlanner />
                  </ProtectedRoute>
                }
              />

              {/* Global Tax Compliance Engine */}
              <Route
                path="/global-tax-compliance"
                element={
                  <ProtectedRoute allowedRoles={[...FINANCE_ROLES]}>
                    <GlobalTaxCompliance />
                  </ProtectedRoute>
                }
              />

              {/* EU Freight Compliance Engine */}
              <Route
                path="/compliance/eu-dashboard"
                element={
                  <ProtectedRoute allowedRoles={[...OPERATIONS_ROLES, ...FINANCE_ROLES]}>
                    <EUFreightCompliance />
                  </ProtectedRoute>
                }
              />

              {/* Trans-European Corridor Optimizer */}
              <Route
                path="/analytics/eu-corridor-dashboard"
                element={
                  <ProtectedRoute allowedRoles={[...OPERATIONS_ROLES, ...FINANCE_ROLES]}>
                    <TECCorridorOptimizer />
                  </ProtectedRoute>
                }
              />
              <Route path="/treasury-risk" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}><TreasuryRiskEngine /></ProtectedRoute>} />
              <Route path="/embedded-banking" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}><EmbeddedBanking /></ProtectedRoute>} />
              <Route path="/sovereign-reporting" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}><SovereignReporting /></ProtectedRoute>} />

              {/* US Interstate Freight AI */}
              <Route path="/analytics/us-interstate-ai" element={<ProtectedRoute allowedRoles={[...OPERATIONS_ROLES, ...FINANCE_ROLES]}><USInterstateFrightAI /></ProtectedRoute>} />
              {/* GCC Trade Corridor AI */}
              <Route path="/analytics/gcc-corridor-ai" element={<ProtectedRoute allowedRoles={[...OPERATIONS_ROLES, ...FINANCE_ROLES]}><GCCTradeCorridorAI /></ProtectedRoute>} />
              {/* Belt & Road Asia Engine */}
              <Route path="/analytics/bri-asia-engine" element={<ProtectedRoute allowedRoles={[...OPERATIONS_ROLES, ...FINANCE_ROLES]}><BeltRoadAsiaEngine /></ProtectedRoute>} />
              {/* Global Freight Intelligence Exchange */}
              <Route path="/analytics/gfix" element={<ProtectedRoute allowedRoles={[...OPERATIONS_ROLES, ...FINANCE_ROLES]}><GlobalFreightIntelligenceExchange /></ProtectedRoute>} />

              {/* System Intelligence Modules */}
              <Route path="/system/freight-intelligence" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, ...OPERATIONS_ROLES, ...FINANCE_ROLES]}><FreightIntelligenceCore /></ProtectedRoute>} />
              <Route path="/system/risk-hedge-engine" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, ...OPERATIONS_ROLES, ...FINANCE_ROLES]}><RiskHedgeEngine /></ProtectedRoute>} />
              <Route path="/system/government-intelligence" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><GovernmentIntelligence /></ProtectedRoute>} />
              <Route path="/system/investor-mode" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, ...FINANCE_ROLES]}><SystemInvestorMode /></ProtectedRoute>} />
              <Route path="/system/pricing-intelligence" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, ...OPERATIONS_ROLES, ...FINANCE_ROLES]}><PricingIntelligenceEngine /></ProtectedRoute>} />
              <Route path="/system/tax-intelligence" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, ...FINANCE_ROLES]}><TaxIntelligenceEngine /></ProtectedRoute>} />
              <Route path="/system/regulatory-mapping" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, ...OPERATIONS_ROLES, ...FINANCE_ROLES]}><RegulatoryMappingAI /></ProtectedRoute>} />
              <Route path="/system/insurance-marketplace" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, ...FINANCE_ROLES]}><InsuranceMarketplace /></ProtectedRoute>} />
              <Route path="/system/freight-financialization" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, ...FINANCE_ROLES]}><FreightFinancialization /></ProtectedRoute>} />
              <Route path="/system/mobility-command" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, ...OPERATIONS_ROLES, ...FINANCE_ROLES]}><MobilityCommandCenter /></ProtectedRoute>} />

              {/* Market Intelligence Engine */}
              <Route path="/market-intelligence" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, ...OPERATIONS_ROLES, ...FINANCE_ROLES, "operations"]}><MarketIntelligenceEngine /></ProtectedRoute>} />

              {/* Finance ERP Modules */}
              <Route path="/chart-of-accounts" element={<ProtectedRoute allowedRoles={[...FINANCE_ROLES]}><ChartOfAccounts /></ProtectedRoute>} />
              <Route path="/tax-engines" element={<ProtectedRoute allowedRoles={[...FINANCE_ROLES]}><TaxEngines /></ProtectedRoute>} />
              <Route path="/financial-statements" element={<ProtectedRoute allowedRoles={[...FINANCE_ROLES]}><FinancialStatements /></ProtectedRoute>} />
              <Route path="/cashflow-forecast" element={<ProtectedRoute allowedRoles={[...FINANCE_ROLES]}><CashflowForecasting /></ProtectedRoute>} />
              <Route path="/financial-intelligence" element={<ProtectedRoute allowedRoles={[...FINANCE_ROLES]}><FinancialIntelligence /></ProtectedRoute>} />
              <Route path="/profitability-engine" element={<ProtectedRoute allowedRoles={[...FINANCE_ROLES, "ops_manager"]}><ProfitabilityEngine /></ProtectedRoute>} />
              <Route path="/revenue-optimization" element={<ProtectedRoute allowedRoles={[...FINANCE_ROLES, "ops_manager"]}><RevenueOptimizationEngine /></ProtectedRoute>} />
              <Route path="/governance-intelligence" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}><GovernanceIntelligence /></ProtectedRoute>} />
              <Route path="/diaspora-trade" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager", "ops_manager"]}><DiasporaTradeEngine /></ProtectedRoute>} />
              <Route path="/pan-african-settlement" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}><PanAfricanSettlement /></ProtectedRoute>} />
              <Route path="/remittance-commerce" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><RemittanceCommerceEngine /></ProtectedRoute>} />
              <Route path="/sme-credit-marketplace" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}><SMECreditMarketplace /></ProtectedRoute>} />
              <Route path="/trade-liquidity-exchange" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><TradeLiquidityExchange /></ProtectedRoute>} />
              <Route path="/stablecoin-settlement" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}><StablecoinSettlement /></ProtectedRoute>} />
              <Route path="/corridor-arbitrage" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}><CorridorArbitrage /></ProtectedRoute>} />
              <Route path="/cbdc-integration" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}><CBDCIntegration /></ProtectedRoute>} />
              <Route path="/digital-asset-hedge" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}><DigitalAssetHedge /></ProtectedRoute>} />
              <Route path="/trade-finance-tokens" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><TradeFinanceTokens /></ProtectedRoute>} />

              <Route path="/kpi-dashboard" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager", "ops_manager"]}><KPIDashboard /></ProtectedRoute>} />
              <Route path="/cfo-dashboard" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><CFODashboard /></ProtectedRoute>} />
              <Route path="/cfo/ap" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager"]}><APWorkspace /></ProtectedRoute>} />
              <Route path="/cfo/ar" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager"]}><ARWorkspace /></ProtectedRoute>} />
              <Route path="/revenue-recognition" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}><RevenueRecognition /></ProtectedRoute>} />
              <Route path="/revenue-activation" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}><RevenueActivationEngine /></ProtectedRoute>} />
              <Route path="/billing-engine" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}><BillingEngine /></ProtectedRoute>} />
              <Route path="/bills" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "finance_manager"]}><Bills /></ProtectedRoute>} />
              <Route path="/finance-reconciliation" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "finance_manager"]}><FinanceReconciliation /></ProtectedRoute>} />
              <Route path="/period-closing" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "finance_manager"]}><PeriodClosing /></ProtectedRoute>} />
              <Route path="/finance-integrations" element={<Navigate to="/erp-integrations" replace />} />
              <Route path="/integration-hub" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager"]}><IntegrationHub /></ProtectedRoute>} />
              <Route path="/fleet-intelligence" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager"]}><DeptFleetIntelligence /></ProtectedRoute>} />
              <Route path="/company/fleet-intelligence" element={<ProtectedRoute lcOnly allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager"]}><FleetIntelligenceEngine /></ProtectedRoute>} />
              <Route path="/fleet-inspection" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><FleetInspectionEngine /></ProtectedRoute>} />
              <Route path="/driver-intelligence" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><DeptDriverIntelligence /></ProtectedRoute>} />
              <Route path="/company/driver-intelligence" element={<ProtectedRoute lcOnly allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><DriverIntelligence /></ProtectedRoute>} />
              <Route path="/iot-telemetry" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><IoTTelemetry /></ProtectedRoute>} />
              <Route path="/revenue-protection" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager"]}><RevenueProtection /></ProtectedRoute>} />
              <Route path="/autonomous-fleet" element={<ProtectedRoute lcOnly allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><AutonomousFleetCommand /></ProtectedRoute>} />
              <Route path="/fuel-intelligence" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager"]}><FuelIntelligence /></ProtectedRoute>} />
              <Route path="/fleet-compliance" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><FleetComplianceHub /></ProtectedRoute>} />
              <Route path="/predictive-maintenance" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><PredictiveMaintenance /></ProtectedRoute>} />
              <Route path="/asset-operations" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "dispatcher", "finance_manager"]}><AssetOperationsControl /></ProtectedRoute>} />
              <Route path="/maintenance-intelligence" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><MaintenanceIntelligence /></ProtectedRoute>} />
              
              <Route path="/maintenance-cost-optimizer" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><MaintenanceCostOptimizer /></ProtectedRoute>} />
              <Route path="/fuel-savings" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "finance_manager"]}><FuelSavingsDashboard /></ProtectedRoute>} />
              <Route path="/revenue-expansion" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "finance_manager"]}><RevenueExpansionEngine /></ProtectedRoute>} />
              <Route path="/autonomous-company" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin"]}><AutonomousCompanyMode /></ProtectedRoute>} />
              <Route path="/executive-command" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin"]}><UnifiedExecutiveLayer /></ProtectedRoute>} />
              <Route path="/ai-board" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin"]}><AIBoardOfDirectors /></ProtectedRoute>} />
              <Route path="/self-expanding-network" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "finance_manager"]}><SelfExpandingNetwork /></ProtectedRoute>} />
              <Route path="/ecosystem-control" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin"]}><EcosystemControl /></ProtectedRoute>} />
              <Route path="/website-generator" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><WebsiteGenerator /></ProtectedRoute>} />
              <Route path="/ai-deal-closer" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><AIDealCloser /></ProtectedRoute>} />
              <Route path="/partnerships-engine" element={<ProtectedRoute allowedRoles={["super_admin","core_founder","core_builder","core_product","core_engineer","internal_team"]}><PartnershipsEngine /></ProtectedRoute>} />
              <Route path="/global-expansion" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><GlobalExpansion /></ProtectedRoute>} />
              <Route path="/monopoly-strategy" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><MonopolyStrategy /></ProtectedRoute>} />
              <Route path="/competitive-intel" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><CompetitiveIntel /></ProtectedRoute>} />
              <Route path="/pricing-dominance" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><PricingDominance /></ProtectedRoute>} />
              <Route path="/warehouse-outbound" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><WarehouseOutbound /></ProtectedRoute>} />
              <Route path="/ai-modules" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin"]}><AIModulesHub /></ProtectedRoute>} />
              <Route path="/system-integrity" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin"]}><SystemIntegrityAuditor /></ProtectedRoute>} />
              <Route path="/workforce" element={<Navigate to="/workforce/my-leave" replace />} />
              <Route path="/workforce/my-leave" element={<ProtectedRoute allowedRoles={[...WORKFORCE_SELF_SERVICE_ROLES]}><MyLeave /></ProtectedRoute>} />
              <Route path="/workforce/team-leave" element={<Navigate to="/workforce/leave-inbox" replace />} />
              <Route path="/workforce/leave-inbox" element={<ProtectedRoute allowedRoles={[...WORKFORCE_APPROVER_ROLES]}><LeaveInbox /></ProtectedRoute>} />
              <Route path="/workforce/sign-in" element={<ProtectedRoute allowedRoles={[...WORKFORCE_SELF_SERVICE_ROLES]}><StaffSignIn /></ProtectedRoute>} />
              <Route path="/workforce/my-kpi" element={<Navigate to="/workforce/my-kpis" replace />} />
              <Route path="/workforce/my-kpis" element={<ProtectedRoute allowedRoles={[...WORKFORCE_SELF_SERVICE_ROLES]}><MyKPI /></ProtectedRoute>} />
              <Route path="/workforce/performance" element={<ProtectedRoute allowedRoles={[...WORKFORCE_MANAGER_ROLES]}><PerformancePanel /></ProtectedRoute>} />
              <Route path="/workforce/team-performance" element={<ProtectedRoute allowedRoles={[...WORKFORCE_MANAGER_ROLES]}><TeamPerformance /></ProtectedRoute>} />
              <Route path="/workforce/my-payslips" element={<ProtectedRoute allowedRoles={[...WORKFORCE_SELF_SERVICE_ROLES]}><MyPayslips /></ProtectedRoute>} />
              <Route path="/workforce/payslips" element={<ProtectedRoute allowedRoles={["admin", "super_admin", "org_admin", "finance_manager"]}><AdminPayslips /></ProtectedRoute>} />
              <Route path="/workforce/payroll-audit" element={<ProtectedRoute allowedRoles={["admin", "super_admin", "finance_manager"]}><PayrollAudit /></ProtectedRoute>} />
              <Route path="/workforce/kpi-targets" element={<ProtectedRoute allowedRoles={["admin", "super_admin", "org_admin"]}><KPITargetCalibration /></ProtectedRoute>} />
              <Route path="/workforce/kpi-audit" element={<ProtectedRoute allowedRoles={["admin", "super_admin"]}><KPIAuditLog /></ProtectedRoute>} />
              <Route path="/ai-workforce" element={<ProtectedRoute lcOnly allowedRoles={[...ADMIN_ROLES, "org_admin"]}><AIWorkforce /></ProtectedRoute>} />
              <Route path="/decision-cockpit" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "finance_manager"]}><DecisionCockpit /></ProtectedRoute>} />
              <Route path="/ai-command-center" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "finance_manager"]}><AICommandCenter /></ProtectedRoute>} />
              <Route path="/developer-dashboard" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><DeveloperDashboard /></ProtectedRoute>} />
              <Route path="/ai-autopilot" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><AIAutopilot /></ProtectedRoute>} />
              <Route path="/decision-center" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "ops_manager"]}><DecisionCenter /></ProtectedRoute>} />
              <Route path="/executive-autopilot" element={<ProtectedRoute allowedRoles={["super_admin", "org_admin"]}><ExecutiveAutopilot /></ProtectedRoute>} />
              <Route path="/reseller-command-center" element={<ProtectedRoute allowedRoles={["super_admin"]}><ResellerCommandCenter /></ProtectedRoute>} />
              <Route path="/reseller-scope-check" element={<ProtectedRoute><ResellerScopeCheck /></ProtectedRoute>} />
              <Route path="/gtm-growth-engine" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><GTMGrowthEngine /></ProtectedRoute>} />
              <Route path="/gtm-brain" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><GTMBrainDashboard osMode="logistics" /></ProtectedRoute>} />
              <Route path="/gtm-brain-logistics" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><GTMBrainDashboard osMode="logistics" /></ProtectedRoute>} />
              <Route path="/gtm-brain-industry" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><GTMBrainDashboard osMode="industry" industryType="fmcg" /></ProtectedRoute>} />
              <Route path="/gtm-brain-fmcg" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><GTMBrainDashboard osMode="industry" industryType="fmcg" /></ProtectedRoute>} />
              <Route path="/gtm-brain-pharma" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><GTMBrainDashboard osMode="industry" industryType="pharma" /></ProtectedRoute>} />
              <Route path="/gtm-brain-liquor" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><GTMBrainDashboard osMode="industry" industryType="liquor" /></ProtectedRoute>} />
              <Route path="/gtm-brain-building" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><GTMBrainDashboard osMode="industry" industryType="building_materials" /></ProtectedRoute>} />
              <Route path="/gtm-brain-cosmetics" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><GTMBrainDashboard osMode="industry" industryType="cosmetics" /></ProtectedRoute>} />
              <Route path="/gtm-brain-agri" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><GTMBrainDashboard osMode="industry" industryType="agri" /></ProtectedRoute>} />
              <Route path="/gtm-brain-auto" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><GTMBrainDashboard osMode="industry" industryType="auto" /></ProtectedRoute>} />
              <Route path="/gtm-brain-bfsi" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><GTMBrainDashboard osMode="industry" industryType="bfsi" /></ProtectedRoute>} />
              <Route path="/gtm-brain-consumer" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><GTMBrainDashboard osMode="industry" industryType="consumer_goods" /></ProtectedRoute>} />
              <Route path="/entity-consolidation" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><EntityConsolidation /></ProtectedRoute>} />
              <Route path="/event-bus" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><EventBusMonitor /></ProtectedRoute>} />

              {/* FMCG OS Routes */}
              {/* FMCG OS Routes - Industry OS only, isolated from Logistics OS */}
              <Route path="/fmcg" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGDashboard /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/sales-kpi" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGSalesKPI /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/sales-intelligence" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><SalesIntelligence /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/rep-intelligence" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGRepIntelligence /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/retailers" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGRetailers /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/journey-planning" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGJourneyPlanning /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/sku-catalog" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGSKUCatalog /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/outlets" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGRetailers /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/beat-plans" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGJourneyPlanning /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/field-visits" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><SalesIntelligence /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/skus" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGSKUCatalog /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/logistics" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGLogistics /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/route-plans" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGRoutePlans /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/deliveries" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGDigitalPOD /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/stock-intelligence" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><StockIntelligence /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/warehouse" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGWarehouseHub /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/procurement" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGProcurement /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/finance" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGFinance /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/reconciliation" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGReconciliation /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/retailer-credit" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><RetailerCredit /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/trade-promotions" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><TradePromotions /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/intelligence" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGIntelligence /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/distributor-index" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><DistributorIndex /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/benchmark" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGBenchmark /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/margin-dashboard" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><MarginDashboard /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/data-lake" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGDataLake /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/distributor-financing" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGDistributorFinancing /></IndustryRoleGuard></ProtectedRoute>} />
              {/* Platform Flywheel Engines */}
              <Route path="/fmcg/retail-credit-network" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGRetailCreditNetwork /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/distributor-marketplace" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGDistributorMarketplace /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/demand-forecasting" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGDemandForecasting /></IndustryRoleGuard></ProtectedRoute>} />
              {/* Governance */}
              <Route path="/fmcg/team-access" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGTeamAccessConsole /></IndustryRoleGuard></ProtectedRoute>} />
              {/* Order & Logistics Integration */}
              <Route path="/fmcg/whatsapp-orders" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGWhatsAppOrders /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/order-to-delivery" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGOrderToDelivery /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/fleet-command" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGFleetCommand /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/outbound-ops" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGOutboundOps /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/distributor-app" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGDistributorApp /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/sales-rep-app" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGSalesRepApp /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/warehouse-handheld" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGWarehouseHandheld /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/fmcg/logistics-command" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager", "operations", "dispatcher"]}><IndustryRoleGuard industryCode="fmcg" requiredPermissions={["view_dashboard"]}><FMCGLogisticsCommand /></IndustryRoleGuard></ProtectedRoute>} />

              {/* FMCG Auth - dedicated auth with role selection */}
              <Route path="/fmcg-auth" element={<Navigate to="/industry/fmcg/auth" replace />} />
              <Route path="/industry/fmcg/auth" element={<FMCGAuth />} />
              {/* Industry FMCG Routes - redirect to dedicated FMCG OS pages */}
              <Route path="/industry/fmcg" element={<Navigate to="/fmcg" replace />} />
              <Route path="/industry/fmcg/sales" element={<Navigate to="/fmcg/sales-intelligence" replace />} />
              <Route path="/industry/fmcg/outlets" element={<Navigate to="/fmcg/retailers" replace />} />
              <Route path="/industry/fmcg/beats" element={<Navigate to="/fmcg/journey-planning" replace />} />
              <Route path="/industry/fmcg/visits" element={<Navigate to="/fmcg/rep-intelligence" replace />} />
              <Route path="/industry/fmcg/catalog" element={<Navigate to="/fmcg/sku-catalog" replace />} />
              <Route path="/industry/fmcg/stock" element={<Navigate to="/fmcg/stock-intelligence" replace />} />
              <Route path="/industry/fmcg/procurement" element={<Navigate to="/fmcg/procurement" replace />} />
              <Route path="/industry/fmcg/logistics" element={<Navigate to="/fmcg/logistics" replace />} />
              <Route path="/industry/fmcg/routes" element={<Navigate to="/fmcg/route-plans" replace />} />
              <Route path="/industry/fmcg/deliveries" element={<Navigate to="/fmcg/deliveries" replace />} />
              <Route path="/industry/fmcg/reconciliation" element={<Navigate to="/fmcg/reconciliation" replace />} />
              <Route path="/industry/fmcg/credit" element={<Navigate to="/fmcg/retailer-credit" replace />} />
              <Route path="/industry/fmcg/promotions" element={<Navigate to="/fmcg/trade-promotions" replace />} />
              <Route path="/industry/fmcg/distributors" element={<Navigate to="/fmcg/distributor-index" replace />} />
              <Route path="/industry/fmcg/benchmark" element={<Navigate to="/fmcg/benchmark" replace />} />
              <Route path="/industry/fmcg/margin" element={<Navigate to="/fmcg/margin-dashboard" replace />} />

              {/* PortoDash ExportTech - Fully isolated from Logistics OS and Industry OS */}
              <Route path="/portodash" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><PortoDashCommandCenter /></ProtectedRoute>} />
              <Route path="/portodash/orders" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><PortoDashOrders /></ProtectedRoute>} />
              <Route path="/portodash/catalog" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><PortoDashCatalog /></ProtectedRoute>} />
              <Route path="/portodash/marketplace" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><PortoDashMarketplace /></ProtectedRoute>} />
              <Route path="/portodash/tracking" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><PortoDashTracking /></ProtectedRoute>} />
              <Route path="/portodash/freight" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><PortoDashFreight /></ProtectedRoute>} />
              <Route path="/portodash/port-logistics" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><PortoDashPortLogistics /></ProtectedRoute>} />
              <Route path="/portodash/documents" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><PortoDashDocuments /></ProtectedRoute>} />
              <Route path="/portodash/compliance" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><PortoDashCompliance /></ProtectedRoute>} />
              <Route path="/portodash/finance" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager"]}><PortoDashFinance /></ProtectedRoute>} />
              <Route path="/portodash/fx" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "finance_manager"]}><PortoDashFX /></ProtectedRoute>} />
              <Route path="/portodash/intelligence" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><PortoDashIntelligence /></ProtectedRoute>} />
              <Route path="/portodash/analytics" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><PortoDashAnalytics /></ProtectedRoute>} />
              <Route path="/portodash/partners" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin"]}><PortoDashPartners /></ProtectedRoute>} />

              {/* Enterprise Control Center */}
              <Route path="/control-center" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager"]}><EnterpriseControlCenter /></ProtectedRoute>} />

              {/* Compliance Monitor */}
              <Route path="/compliance-monitor" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><ComplianceMonitor /></ProtectedRoute>} />

              {/* Distribution Infrastructure */}
              <Route path="/distribution-exchange" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><DistributionExchange /></ProtectedRoute>} />
              <Route path="/adei" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager"]}><ADEIDashboard /></ProtectedRoute>} />
              <Route path="/network-graph" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><DistributionNetworkGraph /></ProtectedRoute>} />
              <Route path="/territory-expansion" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager"]}><TerritoryExpansionEngine /></ProtectedRoute>} />
              <Route path="/distribution-liquidity" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager"]}><DistributionLiquidity /></ProtectedRoute>} />
              <Route path="/trade-finance-network" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager"]}><TradeFinanceNetwork /></ProtectedRoute>} />
              <Route path="/growth-funnel" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]}><GrowthFunnelOS /></ProtectedRoute>} />
              <Route path="/sales-crm" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager"]}><SalesCRM /></ProtectedRoute>} />
              <Route path="/commerce-data-cloud" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager"]}><AfricanCommerceDataCloud /></ProtectedRoute>} />
              <Route path="/embedded-commerce" element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES, "org_admin", "ops_manager", "finance_manager"]}><EmbeddedCommerceLayer /></ProtectedRoute>} />

              {/* Global Trade Graph */}
              <Route path="/trade-graph" element={<ProtectedRoute><TradeGraphOverview /></ProtectedRoute>} />
              <Route path="/trade-graph/corridors" element={<ProtectedRoute><TradeCorridors /></ProtectedRoute>} />
              <Route path="/trade-graph/distribution" element={<ProtectedRoute><DistributionCoverage /></ProtectedRoute>} />
              <Route path="/trade-graph/retail-demand" element={<ProtectedRoute><RetailDemandMap /></ProtectedRoute>} />
              <Route path="/trade-graph/export-flows" element={<ProtectedRoute><ExportFlowMap /></ProtectedRoute>} />
              <Route path="/trade-graph/logistics" element={<ProtectedRoute><LogisticsNetwork /></ProtectedRoute>} />
              <Route path="/trade-graph/ai-engine" element={<ProtectedRoute><TradeAIEngine /></ProtectedRoute>} />

              {/* Liquor OS - Dedicated Auth with Role Selection */}
              <Route path="/industry/liquor/auth" element={<LiquorAuth />} />
              {/* Liquor OS - Dedicated Routes with RBAC */}
              <Route path="/industry/liquor" element={<ProtectedRoute><LiquorDashboard /></ProtectedRoute>} />
              {/* Sales Intelligence - distributors + suppliers */}
              <Route path="/industry/liquor/sales" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_sales_intelligence"]}><LiquorSalesIntelligence /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/outlets" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["manage_retailers", "place_orders"]}><LiquorBarManagement /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/catalog" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_product_catalog"]}><LiquorCaseCatalog /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/deliveries" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_digital_pod"]}><LiquorDigitalPOD /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/logistics" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_delivery_routes", "track_shipments"]}><LiquorDistribution /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/stock" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_inventory"]}><LiquorStockIntelligence /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/credit" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_finance_data", "view_credit_engine"]}><LiquorFinanceCredit /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/reconciliation" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_reconciliation"]}><LiquorFinanceCredit /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/promotions" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_promotions"]}><LiquorTradePromotions /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/distributors" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_distributor_index"]}><LiquorDistributorIndex /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/benchmark" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_benchmarks"]}><LiquorBenchmarking /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/margin" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_margin_protection"]}><LiquorMarginProtection /></LiquorRoleGuard></ProtectedRoute>} />
              {/* Liquor Network Intelligence Graph */}
              <Route path="/industry/liquor/network-map" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_network_map"]}><LiquorRetailNetworkMap /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/retailer-intel" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_retailer_profiles"]}><LiquorRetailerIntelligence /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/heatmaps" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_territory_heatmaps"]}><LiquorTerritoryHeatmaps /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/coverage" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_coverage_analysis"]}><LiquorDistributorCoverage /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/lookalikes" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_outlet_lookalikes"]}><LiquorOutletLookalike /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/brand-intel" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_brand_performance"]}><LiquorBrandPerformance /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/market-share" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_market_share"]}><LiquorMarketShare /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/expansion" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_territory_expansion"]}><LiquorTerritoryExpansion /></LiquorRoleGuard></ProtectedRoute>} />
              {/* Liquor Commerce Exchange */}
              <Route path="/industry/liquor/supplier-market" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["access_supplier_marketplace"]}><LiquorSupplierMarketplace /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/dist-market" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["access_distributor_marketplace"]}><LiquorDistributorMarketplace /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/retailer-order" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["access_retailer_ordering"]}><LiquorRetailerOrdering /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/promo-exchange" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_promotions", "manage_promotions"]}><LiquorTradePromotionExchange /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/order-routing" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_order_routing"]}><LiquorSmartOrderRouting /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/allocations" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["manage_allocations"]}><LiquorAllocationEngine /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/trade-finance" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["access_trade_financing"]}><LiquorTradeFinancing /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/ledger" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_transaction_ledger"]}><LiquorTransactionLedger /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/compliance" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_compliance_engine"]}><LiquorComplianceEngine /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/dist-competition" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_distributor_intel"]}><LiquorDistributorCompetition /></LiquorRoleGuard></ProtectedRoute>} />
              {/* Liquor Revenue Engine Layer */}
              <Route path="/industry/liquor/txn-revenue" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_transaction_revenue"]}><LiquorTransactionRevenue /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/data-intel" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_data_intelligence"]}><LiquorDataIntelligence /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/embedded-finance" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_embedded_finance"]}><LiquorEmbeddedFinance /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/supplier-demand" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_supplier_demand"]}><LiquorSupplierDemand /></LiquorRoleGuard></ProtectedRoute>} />
              {/* Liquor Role Dashboards - org-type gated */}
              <Route path="/industry/liquor/distributor-dash" element={<ProtectedRoute><LiquorRoleGuard allowedOrgTypes={["distributor"]}><LiquorDistributorDashboard /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/retailer-dash" element={<ProtectedRoute><LiquorRoleGuard allowedOrgTypes={["retailer"]}><LiquorRetailerDashboard /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/supplier-dash" element={<ProtectedRoute><LiquorRoleGuard allowedOrgTypes={["supplier"]}><LiquorSupplierDashboard /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/platform-intel" element={<ProtectedRoute><LiquorRoleGuard allowedOrgTypes={["platform"]}><LiquorPlatformIntelligence /></LiquorRoleGuard></ProtectedRoute>} />
              {/* Liquor Compliance Engine */}
              <Route path="/industry/liquor/id-verification" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_id_verification"]}><LiquorIDVerification /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/gov-dashboard" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_government_dashboard"]}><LiquorGovernmentDashboard /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/retailer-compliance" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_retailer_compliance"]}><LiquorRetailerCompliance /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/compliance-audit" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_compliance_audit"]}><LiquorComplianceAudit /></LiquorRoleGuard></ProtectedRoute>} />
              {/* Liquor Enterprise Modules v2 */}
              <Route path="/industry/liquor/account-scoring" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_account_scoring"]}><LiquorAccountScoring /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/demand-forecast" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_demand_forecast"]}><LiquorDemandForecast /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/territory-mgmt" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["manage_territory"]}><LiquorTerritoryManager /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/loyalty" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_retailer_loyalty"]}><LiquorRetailerLoyalty /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/campaign-funding" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["manage_campaign_funding"]}><LiquorCampaignFunding /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/auto-ordering" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_auto_ordering"]}><LiquorAutoOrdering /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/allocation-releases" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_allocation_releases"]}><LiquorAllocationReleases /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/journey" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_org_journey"]}><LiquorOrgJourney /></LiquorRoleGuard></ProtectedRoute>} />
              {/* Security Audit */}
              <Route path="/industry/liquor/security-audit" element={<ProtectedRoute><LiquorRoleGuard allowedRoles={["platform_admin"]}><LiquorSecurityAudit /></LiquorRoleGuard></ProtectedRoute>} />
              {/* Intelligence Brain */}
              <Route path="/industry/liquor/network-graph" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_network_graph"]}><LiquorNetworkGraph /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/inventory-risk" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_inventory_risk"]}><LiquorInventoryRisk /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/brand-trends" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_brand_trends"]}><LiquorBrandTrends /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/credit-risk" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_credit_risk"]}><LiquorCreditRisk /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/promotion-roi" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_promotion_roi"]}><LiquorPromotionROI /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/retailer-growth" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_retailer_growth"]}><LiquorRetailerGrowth /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/ai-recommendations" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_ai_recommendations"]}><LiquorAIRecommendations /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/ai-alerts" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_ai_alerts"]}><LiquorAIAlerts /></LiquorRoleGuard></ProtectedRoute>} />
              {/* Global Expansion Engine */}
              <Route path="/industry/liquor/expansion-dashboard" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_expansion_dashboard"]}><LiquorExpansionDashboard /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/sku-expansion" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_sku_expansion"]}><LiquorSKUExpansion /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/brand-expansion" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_brand_expansion"]}><LiquorBrandExpansion /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/logistics-feasibility" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_logistics_feasibility"]}><LiquorLogisticsFeasibility /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/regulatory-expansion" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_regulatory_expansion"]}><LiquorRegulatoryExpansion /></LiquorRoleGuard></ProtectedRoute>} />
              {/* Demand Signal Harvester */}
              <Route path="/industry/liquor/demand-signals" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_demand_signals"]}><LiquorDemandSignals /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/nightlife-signals" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_nightlife_signals"]}><LiquorNightlifeSignals /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/social-trends" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_social_trends"]}><LiquorSocialTrends /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/tourism-signals" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_tourism_signals"]}><LiquorTourismSignals /></LiquorRoleGuard></ProtectedRoute>} />
              <Route path="/industry/liquor/competitor-intel" element={<ProtectedRoute><LiquorRoleGuard requiredPermissions={["view_competitor_intel"]}><LiquorCompetitorIntel /></LiquorRoleGuard></ProtectedRoute>} />

              {/* Agri OS - Dedicated Routes with RBAC */}
              <Route path="/industry/agri" element={<ProtectedRoute><IndustryDashboard /></ProtectedRoute>} />
              <Route path="/industry/agri/crop-cycle" element={<ProtectedRoute><IndustryRoleGuard industryCode="agri" requiredPermissions={["view_crop_cycle_intelligence"]}><AgriCropCycleIntelligence /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/agri/farm-advisory" element={<ProtectedRoute><IndustryRoleGuard industryCode="agri" requiredPermissions={["view_crop_cycle_intelligence"]}><AgriFarmAdvisory /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/agri/weather" element={<ProtectedRoute><IndustryRoleGuard industryCode="agri" requiredPermissions={["view_weather_intelligence"]}><AgriWeatherIntelligence /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/agri/demand-forecast" element={<ProtectedRoute><IndustryRoleGuard industryCode="agri" requiredPermissions={["view_demand_forecasting"]}><AgriDemandForecast /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/agri/farmer-network" element={<ProtectedRoute><IndustryRoleGuard industryCode="agri" requiredPermissions={["view_farmer_network"]}><AgriFarmerNetwork /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/agri/field-sales" element={<ProtectedRoute><IndustryRoleGuard industryCode="agri" requiredPermissions={["view_territory_analytics"]}><AgriFieldSales /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/agri/supply-logistics" element={<ProtectedRoute><IndustryRoleGuard industryCode="agri" requiredPermissions={["view_delivery_routes", "track_shipments"]}><AgriSupplyLogistics /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/agri/warehouse" element={<ProtectedRoute><IndustryRoleGuard industryCode="agri" requiredPermissions={["view_warehouse_ops", "view_inventory"]}><AgriWarehouse /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/agri/sales" element={<ProtectedRoute><IndustryRoleGuard industryCode="agri" requiredPermissions={["view_sales_intelligence"]}><IndustrySalesIntelligence /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/agri/outlets" element={<ProtectedRoute><IndustryRoleGuard industryCode="agri" requiredPermissions={["view_dealer_network"]}><IndustryOutletManagement /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/agri/catalog" element={<ProtectedRoute><IndustryRoleGuard industryCode="agri" requiredPermissions={["view_product_catalog"]}><IndustryProductCatalog /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/agri/procurement" element={<ProtectedRoute><IndustryRoleGuard industryCode="agri" requiredPermissions={["view_inventory"]}><IndustrySupplyChain /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/agri/credit" element={<ProtectedRoute><IndustryRoleGuard industryCode="agri" requiredPermissions={["view_finance_data"]}><IndustryFinanceCredit /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/agri/reconciliation" element={<ProtectedRoute><IndustryRoleGuard industryCode="agri" requiredPermissions={["view_finance_data"]}><IndustryFinanceCredit /></IndustryRoleGuard></ProtectedRoute>} />

              {/* Pharma OS - Dedicated Routes with RBAC */}
              <Route path="/industry/pharma" element={<ProtectedRoute><IndustryDashboard /></ProtectedRoute>} />
              <Route path="/industry/pharma/prescriptions" element={<ProtectedRoute><IndustryRoleGuard industryCode="pharma" requiredPermissions={["view_prescription_tracking"]}><PharmaPrescriptionIntelligence /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/pharma/batch-tracking" element={<ProtectedRoute><IndustryRoleGuard industryCode="pharma" requiredPermissions={["view_batch_tracking"]}><PharmaDrugBatchTracking /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/pharma/cold-chain" element={<ProtectedRoute><IndustryRoleGuard industryCode="pharma" requiredPermissions={["view_cold_chain_logistics"]}><PharmaColdChain /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/pharma/pharmacy-network" element={<ProtectedRoute><IndustryRoleGuard industryCode="pharma" requiredPermissions={["view_pharmacy_network"]}><PharmaPharmacyNetwork /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/pharma/doctor-network" element={<ProtectedRoute><IndustryRoleGuard industryCode="pharma" requiredPermissions={["view_doctor_network"]}><PharmaDoctorNetwork /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/pharma/compliance" element={<ProtectedRoute><IndustryRoleGuard industryCode="pharma" requiredPermissions={["view_nafdac_compliance"]}><PharmaComplianceHub /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/pharma/med-rep-sales" element={<ProtectedRoute><IndustryRoleGuard industryCode="pharma" requiredPermissions={["view_sales_intelligence"]}><PharmaMedRepSales /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/pharma/warehouse" element={<ProtectedRoute><IndustryRoleGuard industryCode="pharma" requiredPermissions={["view_warehouse_ops"]}><PharmaWarehouse /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/pharma/distribution" element={<ProtectedRoute><IndustryRoleGuard industryCode="pharma" requiredPermissions={["view_delivery_routes"]}><PharmaDistributionLogistics /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/pharma/credit" element={<ProtectedRoute><IndustryRoleGuard industryCode="pharma" requiredPermissions={["view_finance_data"]}><IndustryFinanceCredit /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/pharma/reconciliation" element={<ProtectedRoute><IndustryRoleGuard industryCode="pharma" requiredPermissions={["view_reconciliation"]}><IndustryFinanceCredit /></IndustryRoleGuard></ProtectedRoute>} />

              {/* Building Materials OS */}
              <Route path="/industry/building" element={<ProtectedRoute><IndustryDashboard /></ProtectedRoute>} />
              <Route path="/industry/building/projects" element={<ProtectedRoute><IndustryRoleGuard industryCode="building" requiredPermissions={["view_sales_intelligence"]}><BuildingProjectTracker /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/building/material-planning" element={<ProtectedRoute><IndustryRoleGuard industryCode="building" requiredPermissions={["view_inventory"]}><BuildingMaterialPlanning /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/building/site-delivery" element={<ProtectedRoute><IndustryRoleGuard industryCode="building" requiredPermissions={["view_delivery_routes"]}><BuildingSiteDelivery /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/building/contractors" element={<ProtectedRoute><IndustryRoleGuard industryCode="building" requiredPermissions={["view_dealer_network"]}><BuildingContractorNetwork /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/building/warehouse" element={<ProtectedRoute><IndustryRoleGuard industryCode="building" requiredPermissions={["view_warehouse_ops"]}><BuildingWarehouse /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/building/demand-forecast" element={<ProtectedRoute><IndustryRoleGuard industryCode="building" requiredPermissions={["view_demand_forecasting"]}><BuildingDemandForecast /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/building/procurement" element={<ProtectedRoute><IndustryRoleGuard industryCode="building" requiredPermissions={["view_inventory"]}><BuildingProcurement /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/building/logistics" element={<ProtectedRoute><IndustryRoleGuard industryCode="building" requiredPermissions={["view_delivery_routes"]}><BuildingSupplyLogistics /></IndustryRoleGuard></ProtectedRoute>} />

              {/* Cosmetics OS */}
              <Route path="/industry/cosmetics" element={<ProtectedRoute><IndustryDashboard /></ProtectedRoute>} />
              <Route path="/industry/cosmetics/campaigns" element={<ProtectedRoute><IndustryRoleGuard industryCode="cosmetics" requiredPermissions={["view_sales_intelligence"]}><CosmeticsCampaignManager /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/cosmetics/influencers" element={<ProtectedRoute><IndustryRoleGuard industryCode="cosmetics" requiredPermissions={["view_sales_intelligence"]}><CosmeticsInfluencerEngine /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/cosmetics/retail-promo" element={<ProtectedRoute><IndustryRoleGuard industryCode="cosmetics" requiredPermissions={["view_sales_intelligence"]}><CosmeticsRetailPromo /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/cosmetics/product-launch" element={<ProtectedRoute><IndustryRoleGuard industryCode="cosmetics" requiredPermissions={["view_product_catalog"]}><CosmeticsProductLaunch /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/cosmetics/salons" element={<ProtectedRoute><IndustryRoleGuard industryCode="cosmetics" requiredPermissions={["view_dealer_network"]}><CosmeticsSalonNetwork /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/cosmetics/training" element={<ProtectedRoute><IndustryRoleGuard industryCode="cosmetics" requiredPermissions={["view_sales_intelligence"]}><CosmeticsConsultantTraining /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/cosmetics/warehouse" element={<ProtectedRoute><IndustryRoleGuard industryCode="cosmetics" requiredPermissions={["view_warehouse_ops"]}><CosmeticsWarehouse /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/cosmetics/distribution" element={<ProtectedRoute><IndustryRoleGuard industryCode="cosmetics" requiredPermissions={["view_delivery_routes"]}><CosmeticsDistribution /></IndustryRoleGuard></ProtectedRoute>} />

              {/* BFSI OS */}
              <Route path="/industry/bfsi" element={<ProtectedRoute><IndustryDashboard /></ProtectedRoute>} />
              <Route path="/industry/bfsi/agent-performance" element={<ProtectedRoute><IndustryRoleGuard industryCode="bfsi" requiredPermissions={["view_sales_intelligence"]}><BFSIAgentPerformance /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/bfsi/loans" element={<ProtectedRoute><IndustryRoleGuard industryCode="bfsi" requiredPermissions={["view_sales_intelligence"]}><BFSILoanProcessing /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/bfsi/insurance" element={<ProtectedRoute><IndustryRoleGuard industryCode="bfsi" requiredPermissions={["view_sales_intelligence"]}><BFSIInsuranceManagement /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/bfsi/customer-profiling" element={<ProtectedRoute><IndustryRoleGuard industryCode="bfsi" requiredPermissions={["view_dealer_network"]}><BFSICustomerProfiling /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/bfsi/merchants" element={<ProtectedRoute><IndustryRoleGuard industryCode="bfsi" requiredPermissions={["view_dealer_network"]}><BFSIMerchantNetwork /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/bfsi/portfolio-risk" element={<ProtectedRoute><IndustryRoleGuard industryCode="bfsi" requiredPermissions={["view_finance_data"]}><BFSIPortfolioRisk /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/bfsi/payments" element={<ProtectedRoute><IndustryRoleGuard industryCode="bfsi" requiredPermissions={["view_finance_data"]}><BFSIPaymentOps /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/bfsi/compliance" element={<ProtectedRoute><IndustryRoleGuard industryCode="bfsi" requiredPermissions={["view_sales_intelligence"]}><BFSICompliance /></IndustryRoleGuard></ProtectedRoute>} />

              {/* Auto-Ancillary OS */}
              <Route path="/industry/auto" element={<ProtectedRoute><IndustryDashboard /></ProtectedRoute>} />
              <Route path="/industry/auto/parts-database" element={<ProtectedRoute><IndustryRoleGuard industryCode="auto" requiredPermissions={["view_product_catalog"]}><AutoPartsDatabase /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/auto/workshops" element={<ProtectedRoute><IndustryRoleGuard industryCode="auto" requiredPermissions={["view_dealer_network"]}><AutoWorkshopNetwork /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/auto/mechanics" element={<ProtectedRoute><IndustryRoleGuard industryCode="auto" requiredPermissions={["view_dealer_network"]}><AutoMechanicRegistry /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/auto/recommendations" element={<ProtectedRoute><IndustryRoleGuard industryCode="auto" requiredPermissions={["view_product_catalog"]}><AutoPartsRecommendation /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/auto/fleet-service" element={<ProtectedRoute><IndustryRoleGuard industryCode="auto" requiredPermissions={["view_delivery_routes"]}><AutoFleetService /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/auto/warehouse" element={<ProtectedRoute><IndustryRoleGuard industryCode="auto" requiredPermissions={["view_warehouse_ops"]}><AutoWarehouse /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/auto/distribution" element={<ProtectedRoute><IndustryRoleGuard industryCode="auto" requiredPermissions={["view_delivery_routes"]}><AutoDistribution /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/auto/demand-forecast" element={<ProtectedRoute><IndustryRoleGuard industryCode="auto" requiredPermissions={["view_demand_forecasting"]}><AutoDemandForecast /></IndustryRoleGuard></ProtectedRoute>} />

              {/* Consumer Goods OS */}
              <Route path="/industry/consumer" element={<ProtectedRoute><ConsumerDashboard /></ProtectedRoute>} />
              <Route path="/industry/consumer/sales" element={<ProtectedRoute><IndustryRoleGuard industryCode="consumer" requiredPermissions={["view_sales_intelligence"]}><ConsumerSalesIntelligence /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/consumer/retailers" element={<ProtectedRoute><IndustryRoleGuard industryCode="consumer" requiredPermissions={["view_dealer_network"]}><ConsumerRetailerNetwork /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/consumer/field-sales" element={<ProtectedRoute><IndustryRoleGuard industryCode="consumer" requiredPermissions={["view_territory_analytics"]}><ConsumerFieldSales /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/consumer/warehouse" element={<ProtectedRoute><IndustryRoleGuard industryCode="consumer" requiredPermissions={["view_warehouse_ops"]}><ConsumerWarehouse /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/consumer/logistics" element={<ProtectedRoute><IndustryRoleGuard industryCode="consumer" requiredPermissions={["view_delivery_routes"]}><ConsumerLogistics /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/consumer/promotions" element={<ProtectedRoute><IndustryRoleGuard industryCode="consumer" requiredPermissions={["view_sales_intelligence"]}><ConsumerTradePromo /></IndustryRoleGuard></ProtectedRoute>} />
              <Route path="/industry/consumer/demand-forecast" element={<ProtectedRoute><IndustryRoleGuard industryCode="consumer" requiredPermissions={["view_demand_forecasting"]}><ConsumerDemandForecast /></IndustryRoleGuard></ProtectedRoute>} />

              {/* Industry OS Generator */}
              <Route path="/industry/os-generator" element={<ProtectedRoute><IndustryOSGenerator /></ProtectedRoute>} />

              {/* Industry OS Routes (generic - for non-liquor/agri/pharma verticals) */}
              <Route path="/industry/:industryCode/auth" element={<IndustryAuth />} />
              <Route path="/industry/:industryCode/role-auth" element={<IndustryRoleAuth />} />
              <Route path="/industry/:industryCode" element={<ProtectedRoute><IndustryDashboard /></ProtectedRoute>} />
              <Route path="/industry/:industryCode/sales" element={<ProtectedRoute><IndustrySalesIntelligence /></ProtectedRoute>} />
              <Route path="/industry/:industryCode/outlets" element={<ProtectedRoute><IndustryOutletManagement /></ProtectedRoute>} />
              <Route path="/industry/:industryCode/beats" element={<ProtectedRoute><IndustryBeatPlanning /></ProtectedRoute>} />
              <Route path="/industry/:industryCode/visits" element={<ProtectedRoute><IndustryFieldVisits /></ProtectedRoute>} />
              <Route path="/industry/:industryCode/catalog" element={<ProtectedRoute><IndustryProductCatalog /></ProtectedRoute>} />
              <Route path="/industry/:industryCode/stock" element={<ProtectedRoute><IndustrySupplyChain /></ProtectedRoute>} />
              <Route path="/industry/:industryCode/procurement" element={<ProtectedRoute><IndustrySupplyChain /></ProtectedRoute>} />
              <Route path="/industry/:industryCode/promotions" element={<ProtectedRoute><IndustryTradePromotions /></ProtectedRoute>} />
              <Route path="/industry/:industryCode/credit" element={<ProtectedRoute><IndustryFinanceCredit /></ProtectedRoute>} />
              <Route path="/industry/:industryCode/reconciliation" element={<ProtectedRoute><IndustryFinanceCredit /></ProtectedRoute>} />
              <Route path="/industry/:industryCode/distributors" element={<ProtectedRoute><IndustryDistributorIndex /></ProtectedRoute>} />
              <Route path="/industry/:industryCode/benchmark" element={<ProtectedRoute><IndustryDistributorIndex /></ProtectedRoute>} />
              <Route path="/industry/:industryCode/margin" element={<ProtectedRoute><IndustryDistributorIndex /></ProtectedRoute>} />
              {/* Fallback for any other industry sub-pages */}
              <Route path="/industry/:industryCode/:page" element={<ProtectedRoute><IndustrySubPage /></ProtectedRoute>} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </DeptRouteGuard>
            </OSIsolationGuard>
            </WorkspaceProvider>
          </BrowserRouter>
        </TooltipProvider>
      </DispatchNotificationProvider>
      </RegionProvider>
      <PWAInstallPrompt />
    </AuthProvider>
  </AppErrorBoundary>
);

export default App;
