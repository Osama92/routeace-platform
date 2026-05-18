import { motion } from "framer-motion";
import { Truck, Package, RefreshCw, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type LogisticsModelType = "haulage" | "multidrop" | "hybrid" | "";

export interface LogisticsTypeData {
  operationType: LogisticsModelType;
  vehicleCount: string;
  vehicleTypes: string;
  operatingRegions: string;
  monthlyDeliveries: string;
  avgStopsPerRoute: string;
  deliveryFrequency: string;
  avgDeliveryDistance: string;
}

interface Props {
  data: LogisticsTypeData;
  onChange: (data: LogisticsTypeData) => void;
}

const OPERATION_TYPES = [
  {
    key: "haulage" as const,
    icon: Truck,
    title: "Haulage Operations",
    emoji: "🚛",
    description: "Long-distance transport, inter-city freight, full truckloads",
    features: ["Load planning", "Long-haul tracking", "Trip management"],
    pricing: "₦5,000/mo per vehicle",
  },
  {
    key: "multidrop" as const,
    icon: Package,
    title: "Multidrop Delivery",
    emoji: "📦",
    description: "Urban delivery, multiple stops per route, last-mile",
    features: ["AI route optimization", "Stop sequencing", "Delivery batching"],
    pricing: "₦50/drop + 500 AI credits",
  },
  {
    key: "hybrid" as const,
    icon: RefreshCw,
    title: "Hybrid Logistics",
    emoji: "🔁",
    description: "Both haulage and multidrop operations",
    features: ["All haulage + multidrop features", "Flexible fleet allocation"],
    pricing: "₦5,000/vehicle/mo + ₦50/drop",
  },
];

const VEHICLE_TYPE_OPTIONS = [
  "Heavy Trucks (15T+)",
  "Medium Trucks (5-15T)",
  "Light Trucks / Vans",
  "Bikes / Motorcycles",
  "Mixed Fleet",
];

const DELIVERY_FREQ = [
  "Daily",
  "2-3 times per week",
  "Weekly",
  "On-demand",
];

const LogisticsTypeStep = ({ data, onChange }: Props) => {
  const update = (partial: Partial<LogisticsTypeData>) =>
    onChange({ ...data, ...partial });

  // Auto-detect model from avg stops
  const detectModel = (stops: string): LogisticsModelType => {
    const n = parseInt(stops, 10);
    if (isNaN(n)) return data.operationType;
    if (n <= 2) return "haulage";
    if (n >= 5) return "multidrop";
    return "hybrid";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Step 1: Business Type Selection */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">What type of logistics operation do you run?</h2>
        <p className="text-muted-foreground mt-2">
          This determines your features, dashboards, and pricing model
        </p>
      </div>

      <div className="grid gap-4">
        {OPERATION_TYPES.map((op) => {
          const selected = data.operationType === op.key;
          return (
            <Card
              key={op.key}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                selected ? "border-2 border-primary bg-primary/5 shadow-md" : "border-border"
              }`}
              onClick={() => update({ operationType: op.key })}
            >
              <CardContent className="flex items-start gap-4 p-4">
                <div className={`p-3 rounded-xl ${selected ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <op.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{op.emoji}</span>
                    <CardTitle className="text-base">{op.title}</CardTitle>
                    {selected && <CheckCircle2 className="w-5 h-5 text-primary ml-auto flex-shrink-0" />}
                  </div>
                  <CardDescription className="mt-1">{op.description}</CardDescription>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {op.features.map((f) => (
                      <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {f}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-primary font-medium mt-2">{op.pricing}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Step 2: Fleet Information */}
      {data.operationType && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 pt-4 border-t"
        >
          <h3 className="font-semibold text-lg">Fleet Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Number of Vehicles</Label>
              <Input
                type="number"
                placeholder="e.g. 10"
                value={data.vehicleCount}
                onChange={(e) => update({ vehicleCount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Vehicle Types</Label>
              <Select value={data.vehicleTypes} onValueChange={(v) => update({ vehicleTypes: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Operating Regions</Label>
              <Input
                placeholder="e.g. Lagos, Abuja, Kano"
                value={data.operatingRegions}
                onChange={(e) => update({ operatingRegions: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Deliveries</Label>
              <Input
                type="number"
                placeholder="e.g. 500"
                value={data.monthlyDeliveries}
                onChange={(e) => update({ monthlyDeliveries: e.target.value })}
              />
            </div>
          </div>

          {/* Step 3: Delivery Model Detection */}
          <h3 className="font-semibold text-lg pt-2">Delivery Model</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Avg Stops per Route</Label>
              <Input
                type="number"
                placeholder="e.g. 8"
                value={data.avgStopsPerRoute}
                onChange={(e) => {
                  const stops = e.target.value;
                  const detected = detectModel(stops);
                  update({ avgStopsPerRoute: stops, operationType: detected });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Delivery Frequency</Label>
              <Select value={data.deliveryFrequency} onValueChange={(v) => update({ deliveryFrequency: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {DELIVERY_FREQ.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Avg Distance (km)</Label>
              <Input
                type="number"
                placeholder="e.g. 150"
                value={data.avgDeliveryDistance}
                onChange={(e) => update({ avgDeliveryDistance: e.target.value })}
              />
            </div>
          </div>

          {/* Auto-detection feedback */}
          <div className="p-3 rounded-lg bg-muted/50 border text-sm">
            <span className="font-medium">Detected model: </span>
            <span className="text-primary font-semibold capitalize">{data.operationType}</span>
            {" - "}
            <span className="text-muted-foreground">
              {data.operationType === "haulage" && "Optimized for long-haul transport with trip-based tracking."}
              {data.operationType === "multidrop" && "Optimized for urban delivery with AI route optimization."}
              {data.operationType === "hybrid" && "Full feature set for combined haulage + delivery operations."}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default LogisticsTypeStep;
