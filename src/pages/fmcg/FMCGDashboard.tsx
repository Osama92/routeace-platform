import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { useFMCGRole, FMCG_ROLE_LABELS } from "@/hooks/useFMCGRole";
import { useAuth } from "@/contexts/AuthContext";
import {
  ExecutiveDashboard,
  RSMDashboard,
  ASMDashboard,
  SupervisorDashboard,
  SalesRepDashboard,
  MerchandiserDashboard,
  DistributorDashboard,
  WarehouseDashboard,
  FinanceDashboard,
  LogisticsCoordinatorDashboard,
} from "@/components/fmcg/dashboards";

const ROLE_DASHBOARD_CONFIG: Record<string, { title: string; subtitle: string; Component: React.ComponentType }> = {
  strategic_leadership: { title: "Executive Command Center", subtitle: "C-Suite Distribution Intelligence - Real-Time", Component: ExecutiveDashboard },
  regional_sales_manager: { title: "Regional Command", subtitle: "Regional Sales Performance & Territory Oversight", Component: RSMDashboard },
  area_sales_manager: { title: "Area Operations", subtitle: "Area Sales Execution & Retailer Coverage", Component: ASMDashboard },
  sales_supervisor: { title: "Team Operations", subtitle: "Daily Team Performance & Visit Compliance", Component: SupervisorDashboard },
  sales_representative: { title: "My Territory", subtitle: "Today's Route, Orders & Retail Visits", Component: SalesRepDashboard },
  merchandiser: { title: "Merchandising Hub", subtitle: "Shelf Compliance, Planogram Audits & Stock Checks", Component: MerchandiserDashboard },
  distributor: { title: "Distribution Command", subtitle: "Inventory, Deliveries, Credit & Warehouse Operations", Component: DistributorDashboard },
  warehouse_manager: { title: "Warehouse Operations", subtitle: "Stock Levels, Dispatch Queue & Receiving", Component: WarehouseDashboard },
  finance_manager: { title: "Finance Dashboard", subtitle: "Revenue, Collections, AR Aging & Credit Exposure", Component: FinanceDashboard },
  logistics_coordinator: { title: "Logistics Command", subtitle: "Fleet Tracking, Route Execution & Delivery Status", Component: LogisticsCoordinatorDashboard },
};

const FMCGDashboard = () => {
  const { isSuperAdmin } = useAuth();
  const { fmcgRole } = useFMCGRole();

  // Super admin sees executive view; fallback to executive if role not mapped
  const effectiveRole = isSuperAdmin ? "strategic_leadership" : (fmcgRole || "strategic_leadership");
  const config = ROLE_DASHBOARD_CONFIG[effectiveRole] || ROLE_DASHBOARD_CONFIG.strategic_leadership;
  const { title, subtitle, Component } = config;

  return (
    <FMCGLayout title={title} subtitle={subtitle}>
      <Component />
    </FMCGLayout>
  );
};

export default FMCGDashboard;
