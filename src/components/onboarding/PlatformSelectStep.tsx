import { motion } from "framer-motion";
import { Truck, Store, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export type PlatformChoice = "logistics" | "industry" | "";

interface Props {
  selected: PlatformChoice;
  onChange: (value: PlatformChoice) => void;
}

const PLATFORMS = [
  {
    id: "logistics" as const,
    title: "Logistics Operator OS",
    description: "Fleet management, dispatch, tracking, driver ops, and transport execution.",
    icon: Truck,
    examples: "Haulage companies, bike delivery, courier services, last-mile operators",
    color: "primary",
  },
  {
    id: "industry" as const,
    title: "Industry Distribution OS",
    description: "Sales force automation, distributor management, outlet coverage, and trade execution.",
    icon: Store,
    examples: "FMCG, Pharma, Cosmetics, Agri-inputs, Building Materials, Auto Ancillary",
    color: "infra-purple",
  },
];

const PlatformSelectStep = ({ selected, onChange }: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Layers className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Which platform do you need?</h2>
        <p className="text-muted-foreground mt-2">
          RouteAce runs two independent operating systems. Choose the one that fits your business.
        </p>
      </div>

      <div className="grid gap-4">
        {PLATFORMS.map((p) => {
          const isSelected = selected === p.id;
          return (
            <Card
              key={p.id}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? "border-primary ring-2 ring-primary/20 shadow-lg"
                  : "border-border/50 hover:border-primary/30 hover:shadow-md"
              }`}
              onClick={() => onChange(p.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${isSelected ? "bg-primary/15" : "bg-muted/60"}`}>
                    <p.icon className={`w-6 h-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{p.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                    <p className="text-xs text-muted-foreground/70 mt-2 italic">
                      For: {p.examples}
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                  }`}>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="p-4 rounded-lg bg-muted/50 border border-border/50 text-center">
        <p className="text-xs text-muted-foreground">
          Each platform operates independently with <strong className="text-foreground">full data isolation</strong>. 
          You can add the other platform later.
        </p>
      </div>
    </motion.div>
  );
};

export default PlatformSelectStep;
