import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowRight, Users, Package, Cog, BarChart3, UserCheck } from "lucide-react";

export interface SIPOCData {
  suppliers: { name: string; kpiLink?: string }[];
  inputs: { name: string; kpiLink?: string }[];
  process: { step: string; kpiLink?: string }[];
  outputs: { name: string; kpiLink?: string }[];
  customers: { name: string; kpiLink?: string }[];
}

interface SIPOCDiagramProps {
  data: SIPOCData;
  industry?: string;
}

const COLUMNS = [
  { key: "suppliers", title: "Suppliers", icon: Users, color: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300" },
  { key: "inputs", title: "Inputs", icon: Package, color: "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300" },
  { key: "process", title: "Process", icon: Cog, color: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300" },
  { key: "outputs", title: "Outputs", icon: BarChart3, color: "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300" },
  { key: "customers", title: "Customers", icon: UserCheck, color: "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300" },
] as const;

export function generateLogisticsSIPOC(): SIPOCData {
  return {
    suppliers: [
      { name: "Own Drivers", kpiLink: "Driver Productivity" },
      { name: "Vendor Drivers / 3PL", kpiLink: "Vendor On-Time %" },
      { name: "Fuel Stations", kpiLink: "Fuel Cost/km" },
      { name: "Vehicle Dealers / Lessors", kpiLink: "Fleet Utilization" },
      { name: "Insurance Providers", kpiLink: "SLA Coverage" },
    ],
    inputs: [
      { name: "Vehicles (Trucks, Bikes, Vans)", kpiLink: "Fleet Utilization %" },
      { name: "Customer Orders", kpiLink: "Revenue per Drop" },
      { name: "Capital / Funding", kpiLink: "Cash Runway (months)" },
      { name: "Route Data & Intelligence", kpiLink: "Route Confidence Score" },
      { name: "Diesel / Fuel", kpiLink: "Fuel Variance %" },
    ],
    process: [
      { step: "1. Order Intake", kpiLink: "Order Volume" },
      { step: "2. Route Optimization", kpiLink: "Margin per Route" },
      { step: "3. Dispatch & Assignment", kpiLink: "Dispatch Speed (hrs)" },
      { step: "4. In-Transit Tracking", kpiLink: "On-Time %" },
      { step: "5. Delivery & POD", kpiLink: "SLA Rate %" },
      { step: "6. Invoicing & Billing", kpiLink: "Invoice Accuracy %" },
      { step: "7. Payment Collection", kpiLink: "DSO (Days)" },
      { step: "8. Payroll & Settlement", kpiLink: "Payroll Accuracy" },
    ],
    outputs: [
      { name: "Delivered Goods (POD)", kpiLink: "On-Time Delivery %" },
      { name: "Invoices", kpiLink: "Revenue" },
      { name: "SLA Compliance Reports", kpiLink: "SLA Breach %" },
      { name: "Profit & Loss Data", kpiLink: "Net Margin %" },
      { name: "Driver Performance Data", kpiLink: "Trips/Driver/Week" },
    ],
    customers: [
      { name: "Enterprise Clients", kpiLink: "Customer Retention" },
      { name: "End Recipients", kpiLink: "Delivery Satisfaction" },
      { name: "Internal Finance Team", kpiLink: "Reconciliation Accuracy" },
      { name: "Investors / Board", kpiLink: "Revenue Growth %" },
    ],
  };
}

const SIPOCDiagram = ({ data, industry }: SIPOCDiagramProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cog className="w-5 h-5" />
          SIPOC Process Map
          {industry && <Badge variant="outline" className="ml-2">{industry}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2">
          {COLUMNS.map((col, colIdx) => {
            const items = col.key === "process"
              ? data.process.map(p => ({ name: p.step, kpiLink: p.kpiLink }))
              : data[col.key];

            return (
              <motion.div
                key={col.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: colIdx * 0.1 }}
                className="flex flex-col"
              >
                {/* Column Header */}
                <div className={`rounded-t-lg p-2 text-center border ${col.color} font-semibold text-xs uppercase tracking-wider`}>
                  <col.icon className="w-4 h-4 mx-auto mb-1" />
                  {col.title}
                </div>
                {/* Items */}
                <div className="border border-t-0 rounded-b-lg p-2 flex-1 space-y-1.5 bg-card">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className="text-xs p-1.5 rounded bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <p className="font-medium">{item.name}</p>
                      {item.kpiLink && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          KPI: {item.kpiLink}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {/* Arrow between columns */}
                {colIdx < 4 && (
                  <div className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Flow arrows for mobile */}
        <div className="flex md:hidden justify-center mt-4 gap-1">
          {COLUMNS.map((col, i) => (
            <div key={col.key} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="font-medium">{col.title[0]}</span>
              {i < 4 && <ArrowRight className="w-3 h-3" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SIPOCDiagram;
