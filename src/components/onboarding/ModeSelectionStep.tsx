import { motion } from "framer-motion";
import { Truck, Factory, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export type TenantModeChoice = "LOGISTICS_COMPANY" | "LOGISTICS_DEPARTMENT" | "";

interface Props {
  selected: TenantModeChoice;
  onChange: (value: TenantModeChoice) => void;
}

const MODES = [
  {
    id: "LOGISTICS_COMPANY" as const,
    title: "Logistics Company",
    subtitle: "We serve clients & manage fleets (3PL / Haulage)",
    description:
      "Generate revenue from delivery services, manage clients, invoicing, profit per truck, and white-label resale.",
    icon: Truck,
    accent: "primary",
    chips: ["Revenue Focus", "Client Billing", "AI Reseller", "Profit per Route"],
  },
  {
    id: "LOGISTICS_DEPARTMENT" as const,
    title: "Logistics Department",
    subtitle: "We manage logistics internally (FMCG / Manufacturer / Retailer)",
    description:
      "Move goods from warehouse to customer at lowest cost. Track SLA, internal delivery efficiency, and fleet utilization.",
    icon: Factory,
    accent: "infra-purple",
    chips: ["Cost Control", "Warehouse Sync", "SLA Compliance", "No Reseller"],
  },
];

const ModeSelectionStep = ({ selected, onChange }: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">How do you operate logistics?</h2>
        <p className="text-muted-foreground mt-2">
          This choice configures roles, dashboards, and feature access. <strong>It cannot be changed later.</strong>
        </p>
      </div>

      <div className="grid gap-4">
        {MODES.map((m) => {
          const isSelected = selected === m.id;
          return (
            <Card
              key={m.id}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? "border-primary ring-2 ring-primary/20 shadow-lg"
                  : "border-border/50 hover:border-primary/30 hover:shadow-md"
              }`}
              onClick={() => onChange(m.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${isSelected ? "bg-primary/15" : "bg-muted/60"}`}>
                    <m.icon className={`w-6 h-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{m.title}</h3>
                    <p className="text-sm text-primary/80 mt-0.5 font-medium">{m.subtitle}</p>
                    <p className="text-sm text-muted-foreground mt-2">{m.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {m.chips.map((c) => (
                        <span
                          key={c}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-muted/70 text-muted-foreground border border-border/50"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="p-4 rounded-lg bg-muted/50 border border-border/50 text-center">
        <p className="text-xs text-muted-foreground">
          Same engine. Two operating modes. <strong className="text-foreground">No data duplication, full RBAC isolation.</strong>
        </p>
      </div>
    </motion.div>
  );
};

export default ModeSelectionStep;
