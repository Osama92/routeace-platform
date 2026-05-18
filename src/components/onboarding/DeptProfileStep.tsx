import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Factory } from "lucide-react";

export interface DeptProfileData {
  companyName: string;
  industryType: string;
  erpSystem: string;
  erpSystemOther?: string;
  teamSize: string;
  operatingRegions: string;
  warehouseCount: string;
}

interface Props {
  data: DeptProfileData;
  onChange: (d: DeptProfileData) => void;
}

const INDUSTRY_OPTIONS = [
  "FMCG",
  "Manufacturing",
  "Oil & Gas",
  "Retail",
  "Pharmaceutical",
  "Agriculture",
  "Other",
];

const ERP_OPTIONS = [
  "SAP",
  "Oracle",
  "Microsoft Dynamics",
  "Sage",
  "Odoo",
  "None",
  "Other",
];

const WAREHOUSE_OPTIONS = ["1", "2-5", "6-10", "10+"];

const DeptProfileStep = ({ data, onChange }: Props) => {
  const update = (patch: Partial<DeptProfileData>) => onChange({ ...data, ...patch });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Factory className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Tell us about your logistics operation</h2>
        <p className="text-muted-foreground mt-2">
          This configures your department's workflows and integrations
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label>Industry Type *</Label>
            <Select value={data.industryType} onValueChange={(v) => update({ industryType: v })}>
              <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
              <SelectContent>
                {INDUSTRY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>ERP / WMS System</Label>
            <Select value={data.erpSystem} onValueChange={(v) => update({ erpSystem: v })}>
              <SelectTrigger><SelectValue placeholder="Select your ERP / WMS" /></SelectTrigger>
              <SelectContent>
                {ERP_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            {data.erpSystem === "Other" && (
              <Input
                placeholder="Specify your ERP / WMS"
                value={data.erpSystemOther ?? ""}
                onChange={(e) => update({ erpSystemOther: e.target.value })}
              />
            )}
            <p className="text-xs text-muted-foreground">
              We'll configure your integration layer accordingly
            </p>
          </div>

          <div className="space-y-2">
            <Label>How many team members will actively use RouteAce? *</Label>
            <Input
              type="number"
              min={3}
              placeholder="e.g. 12"
              value={data.teamSize}
              onChange={(e) => update({ teamSize: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              This determines your plan recommendation
            </p>
          </div>

          <div className="space-y-2">
            <Label>Operating Regions</Label>
            <Input
              placeholder="e.g. Lagos, Abuja, Port Harcourt"
              value={data.operatingRegions}
              onChange={(e) => update({ operatingRegions: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Number of Warehouses / Distribution Centres</Label>
            <Select value={data.warehouseCount} onValueChange={(v) => update({ warehouseCount: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {WAREHOUSE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DeptProfileStep;
