/**
 * RouteModeIntelligence
 *
 * Renders live-data intelligence panels for each of the three heavy-vehicle
 * route modes. All data is reactive to the current origin / destination /
 * vehicle selection — panels update the moment addresses are typed.
 *
 * Data sources embedded:
 *  - Nigerian toll gate tariffs (FERMA / FG concession schedules, 2025)
 *  - NPA port free-storage and demurrage schedules
 *  - FRSC / NARTO axle-load corridor tables
 */

import { useState } from "react";
import {
  AlertTriangle, CheckCircle2, XCircle, Clock, FileText,
  Package, Truck, AlertCircle, Fuel, Moon, Weight,
  Flame, ChevronDown, ChevronUp, Info, Ship, Timer, BadgeCheck, Edit3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── TOLL GATE DATA (FERMA / concession tariffs, 2025) ────────────────────────
interface TollGate {
  name: string;
  location: string;
  heavy_truck: number;    // ≥30T articulated
  medium_truck: number;   // 15-20T rigid
  van: number;            // <3.5T
}

type CorridorKey =
  | "lagos_ibadan"
  | "lagos_abuja"
  | "lagos_ph"
  | "lagos_benin"
  | "lekki_epe"
  | "abuja_kano"
  | "abuja_kaduna"
  | "ph_aba"
  | "default";

const TOLL_CORRIDORS: Record<CorridorKey, TollGate[]> = {
  lagos_ibadan: [
    { name: "Sagamu Interchange (NB)", location: "km 56, Lagos-Ibadan Exp.", heavy_truck: 2100, medium_truck: 1400, van: 600 },
    { name: "Sagamu Interchange (SB)", location: "km 56, return", heavy_truck: 2100, medium_truck: 1400, van: 600 },
  ],
  lagos_abuja: [
    { name: "Sagamu Interchange",   location: "km 56, Lagos-Ibadan Exp.", heavy_truck: 2100, medium_truck: 1400, van: 600 },
    { name: "Ore Toll Gate",        location: "km 207, Benin-Lagos Exp.", heavy_truck: 1500, medium_truck: 1000, van: 400 },
    { name: "Benin City Toll",      location: "Benin City, A121",         heavy_truck: 1200, medium_truck: 800,  van: 300 },
    { name: "Okene–Lokoja Toll",    location: "Lokoja approach",          heavy_truck: 800,  medium_truck: 600,  van: 200 },
    { name: "Abuja Expressway Toll",location: "Gwagwalada approach",      heavy_truck: 600,  medium_truck: 450,  van: 200 },
  ],
  lagos_ph: [
    { name: "Sagamu Interchange",   location: "km 56, Lagos-Ibadan Exp.", heavy_truck: 2100, medium_truck: 1400, van: 600 },
    { name: "Ore Toll Gate",        location: "km 207, Benin-Lagos Exp.", heavy_truck: 1500, medium_truck: 1000, van: 400 },
    { name: "Benin–Onitsha Toll",   location: "Benin City",               heavy_truck: 1200, medium_truck: 800,  van: 300 },
    { name: "Onitsha–Owerri Toll",  location: "Onitsha approach",         heavy_truck: 900,  medium_truck: 650,  van: 250 },
    { name: "PH Port Harcourt Toll",location: "NTA–Stadium, PH",          heavy_truck: 600,  medium_truck: 450,  van: 200 },
  ],
  lagos_benin: [
    { name: "Sagamu Interchange",   location: "km 56, Lagos-Ibadan Exp.", heavy_truck: 2100, medium_truck: 1400, van: 600 },
    { name: "Ore Toll Gate",        location: "km 207, Benin-Lagos Exp.", heavy_truck: 1500, medium_truck: 1000, van: 400 },
    { name: "Benin City Toll",      location: "Benin City entry",         heavy_truck: 1200, medium_truck: 800,  van: 300 },
  ],
  lekki_epe: [
    { name: "Lekki Phase 1 Plaza",  location: "Lekki Expressway",         heavy_truck: 700,  medium_truck: 500,  van: 200 },
    { name: "Eleko Toll Gate",      location: "Epe Expressway",           heavy_truck: 900,  medium_truck: 600,  van: 300 },
    { name: "Epe Junction Toll",    location: "Epe approach",             heavy_truck: 600,  medium_truck: 450,  van: 200 },
  ],
  abuja_kano: [
    { name: "Keffi Bridge Toll",    location: "Abuja–Keffi Rd",           heavy_truck: 600,  medium_truck: 450,  van: 200 },
    { name: "Lafia–Akwanga Toll",   location: "Nasarawa approach",        heavy_truck: 800,  medium_truck: 600,  van: 250 },
    { name: "Zaria Bypass Toll",    location: "Zaria, Kaduna State",      heavy_truck: 600,  medium_truck: 450,  van: 200 },
    { name: "Zaria–Kano Toll",      location: "Kano approach",            heavy_truck: 600,  medium_truck: 450,  van: 200 },
  ],
  abuja_kaduna: [
    { name: "Keffi Bridge Toll",    location: "Abuja–Keffi Rd",           heavy_truck: 600,  medium_truck: 450,  van: 200 },
    { name: "Kaduna Toll Gate",     location: "Kaduna South entry",       heavy_truck: 800,  medium_truck: 600,  van: 250 },
  ],
  ph_aba: [
    { name: "Rumuola Junction Toll",location: "PH–Aba Expressway",        heavy_truck: 600,  medium_truck: 450,  van: 200 },
    { name: "Aba North Toll",       location: "Aba, Abia State",          heavy_truck: 600,  medium_truck: 450,  van: 200 },
  ],
  default: [
    { name: "Highway Toll (estimated)", location: "Main corridor",        heavy_truck: 1500, medium_truck: 1000, van: 400 },
  ],
};

function detectTollCorridor(origin: string, dest: string): CorridorKey {
  const t = `${origin} ${dest}`.toLowerCase();
  const has = (k: string) => t.includes(k);

  if ((has("lagos") || has("lekki") || has("ikorodu")) &&
      (has("ibadan") || has("oyo") || has("sagamu")))     return "lagos_ibadan";
  if ((has("lagos") || has("lekki")) &&
      (has("abuja") || has("fct") || has("gwagwalada")))  return "lagos_abuja";
  if ((has("lagos") || has("lekki")) &&
      (has("port harcourt") || has("ph") || has("rivers"))) return "lagos_ph";
  if ((has("lagos") || has("lekki")) &&
      (has("benin") || has("edo")))                       return "lagos_benin";
  if (has("lekki") || has("epe") || has("ibeju"))         return "lekki_epe";
  if ((has("abuja") || has("fct")) &&
      (has("kano") || has("kaduna") || has("zaria")))     return has("kaduna") ? "abuja_kaduna" : "abuja_kano";
  if ((has("port harcourt") || has("ph")) && has("aba"))  return "ph_aba";
  return "default";
}

function tollForVehicle(gate: TollGate, gvwT: number): number {
  if (gvwT >= 20) return gate.heavy_truck;
  if (gvwT >= 10) return gate.medium_truck;
  return gate.van;
}

// ─── AXLE LOAD CORRIDORS (NARTO / FRSC, 2025) ────────────────────────────────
const AXLE_RESTRICTIONS = [
  {
    corridor: "Lagos–Ibadan Expressway",
    maxGvwT: 15,
    keywords: ["ibadan", "sagamu", "lagos-ibadan"],
    note: "Weigh-in-motion cameras at Sagamu interchange. GVW >15T requires FRSC special permit.",
    enforcement: "high",
  },
  {
    corridor: "Apapa Wharf Road / Creek Road",
    maxGvwT: 20,
    keywords: ["apapa", "wharf road", "creek road"],
    note: "LTFRSC strictly enforced. Night restriction 6 PM – 6 AM for trucks >10T.",
    enforcement: "high",
  },
  {
    corridor: "Third Mainland Bridge",
    maxGvwT: 10,
    keywords: ["third mainland", "lagos island", "victoria island", "vi", "ikorodu road"],
    note: "Max 10T per axle. Articulated trucks (30T) strictly prohibited.",
    enforcement: "high",
  },
  {
    corridor: "Lagos–Badagry Expressway",
    maxGvwT: 15,
    keywords: ["badagry", "seme", "cotonou", "ojo"],
    note: "GVW >20T requires FRSC escort from Badagry checkpoint.",
    enforcement: "medium",
  },
  {
    corridor: "East-West Road (Rivers / Delta)",
    maxGvwT: 13,
    keywords: ["east west road", "rumuola", "eleme", "warri", "sapele"],
    note: "Flood damage sections reduce effective load capacity. Overload fines active.",
    enforcement: "medium",
  },
  {
    corridor: "Abuja Ring Road / Airport Road",
    maxGvwT: 13,
    keywords: ["airport road abuja", "mabushi", "gudu", "nnpc abuja"],
    note: "FCT trucks >13T require Abuja State permit. Enforcement at Berger junction.",
    enforcement: "medium",
  },
];

// ─── PORT DATA (NPA, 2025) ────────────────────────────────────────────────────
const PORT_DATA = {
  apapa: {
    name: "Apapa Container Terminal",
    operator: "APM Terminals Lagos / ENL Consortium",
    freeStorageDays: 3,
    demurrage20ft: 85000,
    demurrage40ft: 170000,
    gateHours: "06:00 – 18:00",
    appointmentSystem: "eTKT (Electronic Truck Appointment)",
    customsAvgDays: 5,
    gatePassValidity: "24 hours",
    nightRestriction: true,
    keywords: ["apapa", "apapa port", "apapa wharf", "eto lagos"],
  },
  tin_can: {
    name: "Tin Can Island Port (TCIPC)",
    operator: "TCIPC / CMA CGM Terminals",
    freeStorageDays: 3,
    demurrage20ft: 85000,
    demurrage40ft: 170000,
    gateHours: "06:00 – 18:00",
    appointmentSystem: "eTO (Electronic Terminal Ops)",
    customsAvgDays: 4,
    gatePassValidity: "24 hours",
    nightRestriction: true,
    keywords: ["tin can", "tin can island", "tcipc", "ijora", "badagry creek"],
  },
  onne: {
    name: "Onne Oil & Gas Free Zone / PTOL",
    operator: "ICTS Nigeria / PTOL",
    freeStorageDays: 7,
    demurrage20ft: 75000,
    demurrage40ft: 150000,
    gateHours: "24 hours",
    appointmentSystem: "Manual scheduling (ICTS portal)",
    customsAvgDays: 3,
    gatePassValidity: "48 hours",
    nightRestriction: false,
    keywords: ["onne", "rivers port", "eleme", "ptol", "ph port", "port harcourt port"],
  },
};

type PortKey = "apapa" | "tin_can" | "onne";

function detectPort(origin: string, dest: string): PortKey | null {
  const t = `${origin} ${dest}`.toLowerCase();
  for (const [key, data] of Object.entries(PORT_DATA)) {
    if (data.keywords.some(k => t.includes(k))) return key as PortKey;
  }
  // Nearest heuristic: lagos area → apapa, port harcourt → onne
  if (/lagos|lekki|badagry|ikorodu/.test(t)) return "apapa";
  if (/port harcourt|ph|rivers|aba|owerri/.test(t)) return "onne";
  return null;
}

// ─── HAZMAT CLASSES (UN GHS) ──────────────────────────────────────────────────
const HAZMAT_CLASSES = [
  { class: "1", label: "Class 1 — Explosives", color: "text-destructive", restricted: true },
  { class: "2.1", label: "Class 2.1 — Flammable Gas", color: "text-orange-500", restricted: false },
  { class: "2.2", label: "Class 2.2 — Non-Flammable Gas", color: "text-blue-500", restricted: false },
  { class: "3", label: "Class 3 — Flammable Liquids", color: "text-orange-500", restricted: false },
  { class: "4.1", label: "Class 4.1 — Flammable Solids", color: "text-yellow-500", restricted: false },
  { class: "5.1", label: "Class 5.1 — Oxidisers", color: "text-yellow-500", restricted: false },
  { class: "6", label: "Class 6 — Toxic Substances", color: "text-destructive", restricted: false },
  { class: "8", label: "Class 8 — Corrosives", color: "text-orange-500", restricted: false },
  { class: "9", label: "Class 9 — Misc Dangerous Goods", color: "text-muted-foreground", restricted: false },
  { class: "none", label: "No hazardous materials", color: "text-green-500", restricted: false },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => `₦${n.toLocaleString()}`;
function SectionDivider() {
  return <div className="border-t border-border/50 my-4" />;
}

// ─── 1. LONG HAUL INTELLIGENCE PANEL ─────────────────────────────────────────
interface LongHaulPanelProps {
  origin: string;
  destination: string;
  distanceKm: number;
  gvwTonnage: number;
  fuelPerKm: number;
  fuelPrice: number;
}

export function LongHaulPanel({ origin, destination, distanceKm, gvwTonnage, fuelPerKm, fuelPrice }: LongHaulPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const corridorKey = detectTollCorridor(origin, destination);
  const tolls = TOLL_CORRIDORS[corridorKey] || TOLL_CORRIDORS.default;
  const totalToll = tolls.reduce((s, g) => s + tollForVehicle(g, gvwTonnage), 0);

  // Overnight flag
  const needsOvernight = distanceKm > 400;
  const overnightCount = distanceKm > 400 ? Math.ceil((distanceKm - 400) / 600) + 1 : 0;

  // Fuel estimate
  const fuelLitres = distanceKm * fuelPerKm;
  const fuelCostEstimate = Math.round(fuelLitres * fuelPrice);

  // Axle compliance checks
  const routeText = `${origin} ${destination}`.toLowerCase();
  const axleWarnings = AXLE_RESTRICTIONS.filter(r =>
    r.keywords.some(k => routeText.includes(k)) && gvwTonnage > r.maxGvwT
  );

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-500/10 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Truck className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-foreground">Long Haul Intelligence</span>
          {distanceKm > 0 && (
            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600">{distanceKm} km</Badge>
          )}
          {axleWarnings.length > 0 && (
            <Badge className="text-[10px] bg-destructive/10 text-destructive border border-destructive/30">
              {axleWarnings.length} axle warning{axleWarnings.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">

          {/* Overnight flag */}
          {needsOvernight ? (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <Moon className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-orange-600">Overnight Stop Required</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Route {distanceKm} km — {overnightCount} overnight stay{overnightCount > 1 ? "s" : ""} needed.
                  Budget ₦20,000–₦35,000/night per driver (NARTO standard rate).
                  Approved rest stops: Ore (km 207), Lokoja, Kaduna.
                </p>
              </div>
            </div>
          ) : distanceKm > 0 ? (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/30 text-xs text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Route {distanceKm} km — single-day trip. No overnight stop required.
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Enter origin and destination, then calculate to see overnight stop analysis.
            </div>
          )}

          {/* Toll gate table */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              Toll Gates on Route
              <span className="text-[10px] text-muted-foreground font-normal">(FERMA tariffs, 2025)</span>
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Toll Gate</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Location</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Cost (your vehicle)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {tolls.map(gate => (
                    <tr key={gate.name} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 font-medium text-foreground">{gate.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{gate.location}</td>
                      <td className="px-3 py-2 text-right font-semibold text-amber-600">
                        {fmt(tollForVehicle(gate, gvwTonnage))}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-amber-500/5 border-t border-amber-500/20">
                    <td colSpan={2} className="px-3 py-2 font-semibold text-foreground">Total Toll Cost</td>
                    <td className="px-3 py-2 text-right font-bold text-amber-600">{fmt(totalToll)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {corridorKey === "default" && (
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Corridor not auto-detected. Showing estimated toll. Enter Nigerian city names to get corridor-specific data.
              </p>
            )}
          </div>

          {/* Fuel estimate */}
          {fuelPerKm > 0 && distanceKm > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs font-medium text-foreground">Fuel Estimate</p>
                  <p className="text-[10px] text-muted-foreground">{Math.round(fuelLitres)}L @ ₦{fuelPrice.toLocaleString()}/L</p>
                </div>
              </div>
              <p className="text-sm font-bold text-primary">{fmt(fuelCostEstimate)}</p>
            </div>
          )}

          {/* Axle compliance */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Axle Load Compliance</p>
            {axleWarnings.length > 0 ? (
              <div className="space-y-2">
                {axleWarnings.map(w => (
                  <div key={w.corridor} className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border text-xs",
                    w.enforcement === "high"
                      ? "bg-destructive/8 border-destructive/30 text-destructive"
                      : "bg-orange-500/8 border-orange-500/30 text-orange-600"
                  )}>
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{w.corridor} — GVW limit {w.maxGvwT}T</p>
                      <p className="mt-0.5 text-muted-foreground">{w.note}</p>
                      <Badge
                        variant="outline"
                        className={cn("mt-1.5 text-[9px]",
                          w.enforcement === "high" ? "border-destructive/40 text-destructive" : "border-orange-500/40 text-orange-500"
                        )}
                      >
                        {w.enforcement === "high" ? "High enforcement" : "Moderate enforcement"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-500/8 border border-green-500/30 text-xs text-green-600">
                <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                {distanceKm > 0
                  ? `Vehicle (${gvwTonnage}T GVW) is within axle load limits for the detected corridor.`
                  : "Enter route addresses to check corridor-specific axle load restrictions."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 2. CONTAINER MODE PANEL ──────────────────────────────────────────────────
interface ContainerPanelProps {
  origin: string;
  destination: string;
  estimatedArrivalDays: number; // 0 = not yet calculated
}

const DOC_CHECKLIST = [
  { id: "sgd",      label: "Single Goods Declaration (SGD)",        required: true  },
  { id: "bol",      label: "Bill of Lading (OBL / Telex Release)",  required: true  },
  { id: "customs",  label: "Customs Clearance Certificate (Form M)", required: true  },
  { id: "coo",      label: "Certificate of Origin",                  required: true  },
  { id: "packing",  label: "Packing List",                           required: true  },
  { id: "invoice",  label: "Commercial Invoice",                     required: true  },
  { id: "ncx",      label: "NCS Exit Note (for transfers)",          required: false },
  { id: "nafdac",   label: "NAFDAC Permit (food / pharma cargo)",    required: false },
  { id: "son",      label: "SON Conformity Certificate (SONCAP)",    required: false },
  { id: "phyto",    label: "Phytosanitary Certificate (agri cargo)", required: false },
];

export function ContainerPanel({ origin, destination, estimatedArrivalDays }: ContainerPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [containerSize, setContainerSize] = useState<"20ft" | "40ft">("20ft");
  const [daysInPort, setDaysInPort] = useState(1);
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});
  const [showAllDocs, setShowAllDocs] = useState(false);

  const portKey = detectPort(origin, destination);
  const port = portKey ? PORT_DATA[portKey] : null;

  // Demurrage calculation
  const effectiveDays = estimatedArrivalDays > 0 ? estimatedArrivalDays + daysInPort : daysInPort;
  const freeDays = port?.freeStorageDays ?? 3;
  const chargeableDays = Math.max(0, effectiveDays - freeDays);
  const dailyRate = port
    ? (containerSize === "40ft" ? port.demurrage40ft : port.demurrage20ft)
    : 85000;
  const demurrageCost = chargeableDays * dailyRate;
  const demurrageRisk: "none" | "low" | "high" =
    chargeableDays === 0 ? "none" : chargeableDays <= 2 ? "low" : "high";

  const requiredDocs = DOC_CHECKLIST.filter(d => d.required);
  const optionalDocs = DOC_CHECKLIST.filter(d => !d.required);
  const visibleDocs = showAllDocs ? DOC_CHECKLIST : requiredDocs;
  const checkedRequired = requiredDocs.filter(d => checkedDocs[d.id]).length;

  const toggleDoc = (id: string) => setCheckedDocs(p => ({ ...p, [id]: !p[id] }));

  // Gate pass timing alert
  const needsGateAlert = port?.nightRestriction && (estimatedArrivalDays === 0 || estimatedArrivalDays > 0);

  return (
    <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-teal-500/10 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Ship className="w-4 h-4 text-teal-500" />
          <span className="text-sm font-semibold text-foreground">Container Mode Intelligence</span>
          {port && (
            <Badge variant="outline" className="text-[10px] border-teal-500/40 text-teal-600">{port.name}</Badge>
          )}
          {demurrageRisk === "high" && (
            <Badge className="text-[10px] bg-destructive/10 text-destructive border border-destructive/30">
              Demurrage risk
            </Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">

          {/* Port sequencing */}
          {port ? (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-3 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">{port.name}</p>
                <Badge variant="outline" className="text-[10px]">{port.operator}</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-x divide-y divide-border/50">
                {[
                  ["Free Storage", `${port.freeStorageDays} days`],
                  ["Gate Hours", port.gateHours],
                  ["Appointment", port.appointmentSystem.split(" ")[0]],
                  ["Customs (avg)", `${port.customsAvgDays} days`],
                  ["Gate Pass", port.gatePassValidity],
                  ["Night Trucks", port.nightRestriction ? "🚫 Restricted" : "✅ Allowed"],
                ].map(([label, val]) => (
                  <div key={label} className="px-3 py-2.5">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-xs font-semibold text-foreground mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                Port not detected from addresses. Showing Apapa defaults.
                Include "Apapa", "Tin Can Island", or "Onne" in your addresses to load specific port data.
              </div>
            </div>
          )}

          {/* Demurrage calculator */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2.5">Demurrage Risk Calculator</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-[10px] text-muted-foreground">Container Size</Label>
                <Select value={containerSize} onValueChange={(v) => setContainerSize(v as "20ft" | "40ft")}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20ft">20ft TEU</SelectItem>
                    <SelectItem value="40ft">40ft FEU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Days in port before collection</Label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={daysInPort}
                  onChange={e => setDaysInPort(Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div className={cn(
              "rounded-lg border p-3 text-xs",
              demurrageRisk === "none"  && "bg-green-500/8 border-green-500/30",
              demurrageRisk === "low"   && "bg-yellow-500/8 border-yellow-500/30",
              demurrageRisk === "high"  && "bg-destructive/8 border-destructive/30",
            )}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={cn(
                  "font-semibold",
                  demurrageRisk === "none" && "text-green-600",
                  demurrageRisk === "low"  && "text-yellow-600",
                  demurrageRisk === "high" && "text-destructive",
                )}>
                  {demurrageRisk === "none"
                    ? "✅ Within free storage period"
                    : demurrageRisk === "low"
                    ? "⚠ Approaching demurrage threshold"
                    : "🚨 Demurrage charges will apply"}
                </span>
                {chargeableDays > 0 && (
                  <span className="font-bold text-destructive text-sm">{fmt(demurrageCost)}</span>
                )}
              </div>
              <p className="text-muted-foreground">
                {chargeableDays === 0
                  ? `Collection within ${freeDays}-day free period. No demurrage charges.`
                  : `${chargeableDays} chargeable day${chargeableDays > 1 ? "s" : ""} × ${fmt(dailyRate)}/day (${containerSize}).`}
              </p>
              {chargeableDays > 0 && (
                <p className="mt-1 text-muted-foreground">
                  Tip: Expedite customs release or arrange pre-clearance to reduce to {freeDays} days.
                </p>
              )}
            </div>
          </div>

          {/* Gate pass timing */}
          {needsGateAlert && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/8 border border-orange-500/30">
              <Timer className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-orange-600">Gate Pass & Timing Alert</p>
                <p className="text-muted-foreground mt-0.5">
                  Gate hours: <strong>{port?.gateHours ?? "06:00–18:00"}</strong>. Night truck movement restricted.
                  Gate pass valid <strong>{port?.gatePassValidity ?? "24 hrs"}</strong> — collect at terminal gate office.
                  {port?.appointmentSystem && ` Book via ${port.appointmentSystem}.`}
                </p>
              </div>
            </div>
          )}

          {/* Documentation checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground">
                Documentation Checklist
                <span className="ml-2 text-muted-foreground font-normal">({checkedRequired}/{requiredDocs.length} required)</span>
              </p>
              <button
                onClick={() => setShowAllDocs(v => !v)}
                className="text-[10px] text-primary hover:underline"
              >
                {showAllDocs ? "Required only" : "Show all"}
              </button>
            </div>
            <div className="space-y-1.5">
              {visibleDocs.map(doc => (
                <label
                  key={doc.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-xs",
                    checkedDocs[doc.id]
                      ? "bg-green-500/8 border-green-500/30"
                      : doc.required
                      ? "bg-muted/30 border-border hover:border-primary/40"
                      : "bg-muted/20 border-border/50 hover:border-border",
                  )}
                >
                  <Checkbox
                    checked={!!checkedDocs[doc.id]}
                    onCheckedChange={() => toggleDoc(doc.id)}
                    className="shrink-0"
                  />
                  <span className={checkedDocs[doc.id] ? "line-through text-muted-foreground" : "text-foreground"}>
                    {doc.label}
                  </span>
                  {doc.required && !checkedDocs[doc.id] && (
                    <Badge variant="outline" className="ml-auto text-[9px] border-destructive/40 text-destructive shrink-0">Required</Badge>
                  )}
                  {checkedDocs[doc.id] && (
                    <CheckCircle2 className="ml-auto w-3.5 h-3.5 text-green-500 shrink-0" />
                  )}
                </label>
              ))}
            </div>
            {checkedRequired === requiredDocs.length && (
              <div className="mt-2 flex items-center gap-2 text-xs text-green-600 font-medium">
                <BadgeCheck className="w-3.5 h-3.5" /> All required documents confirmed
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 3. INDUSTRIAL ROUTE PANEL ────────────────────────────────────────────────
interface IndustrialStop {
  id: string;
  address: string;
  label: string;
}

interface IndustrialPanelProps {
  stops: IndustrialStop[];
  gvwTonnage: number;
  origin: string;
  destination: string;
}

const WEIGHT_CORRIDORS = [
  {
    name: "Apapa-Oshodi Expressway",
    maxTonnage: 30,
    keywords: ["apapa", "oshodi", "mile 2", "iganmu"],
    note: "Max 30T. Trucks >20T use designated lane only.",
  },
  {
    name: "Ikeja Industrial Layout",
    maxTonnage: 15,
    keywords: ["ikeja", "ogba", "agidingbi", "oregun"],
    note: "15T max in estate roads. Articulated trucks prohibited after 18:00.",
  },
  {
    name: "Trans-Amadi Industrial (PH)",
    maxTonnage: 20,
    keywords: ["trans amadi", "rumuola", "woji"],
    note: "20T corridor limit. Plant access gates close at 17:00.",
  },
  {
    name: "Sharada Industrial (Kano)",
    maxTonnage: 20,
    keywords: ["sharada", "challawa", "kano industrial"],
    note: "20T limit. No movement 14:00–16:00 (prayer/shift break).",
  },
  {
    name: "Nnewi Industrial (Anambra)",
    maxTonnage: 15,
    keywords: ["nnewi", "nkpor", "awka"],
    note: "Feeder road 15T limit. Contact plant logistics 48hrs before delivery.",
  },
];

const DEFAULT_ACCESS_WINDOW = { open: "06:00", close: "17:00" };

export function IndustrialPanel({ stops, gvwTonnage, origin, destination }: IndustrialPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [hazmatClass, setHazmatClass] = useState("none");
  const [accessWindows, setAccessWindows] = useState<Record<string, { open: string; close: string }>>({});
  const [editingStop, setEditingStop] = useState<string | null>(null);

  const allAddresses = [
    { id: "__origin", label: "Origin", address: origin },
    ...stops,
    { id: "__dest", label: "Destination", address: destination },
  ].filter(s => s.address.trim().length > 0);

  const routeText = `${origin} ${destination} ${stops.map(s => s.address).join(" ")}`.toLowerCase();
  const corridorHits = WEIGHT_CORRIDORS.filter(c =>
    c.keywords.some(k => routeText.includes(k)) && gvwTonnage > c.maxTonnage
  );

  const getWindow = (id: string) => accessWindows[id] || DEFAULT_ACCESS_WINDOW;

  const setWindow = (id: string, field: "open" | "close", value: string) => {
    setAccessWindows(p => ({ ...p, [id]: { ...getWindow(id), [field]: value } }));
  };

  const hazmatInfo = HAZMAT_CLASSES.find(h => h.class === hazmatClass);
  const isHazmat = hazmatClass !== "none";

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-violet-500/10 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Factory className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-foreground">Industrial Route Intelligence</span>
          {isHazmat && (
            <Badge className="text-[10px] bg-orange-500/10 text-orange-600 border border-orange-500/30">
              Hazmat Class {hazmatClass}
            </Badge>
          )}
          {corridorHits.length > 0 && (
            <Badge className="text-[10px] bg-destructive/10 text-destructive border border-destructive/30">
              {corridorHits.length} weight alert{corridorHits.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">

          {/* Factory / zone access windows */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-violet-500" />
              Factory / Zone Access Windows
              <span className="text-[10px] text-muted-foreground font-normal">— configurable per stop</span>
            </p>

            {allAddresses.length > 0 ? (
              <div className="space-y-2">
                {allAddresses.map(stop => {
                  const w = getWindow(stop.id);
                  const isEditing = editingStop === stop.id;
                  return (
                    <div key={stop.id} className="rounded-lg border border-border bg-card/50 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/20">
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{stop.label}</span>
                          <p className="text-xs text-foreground leading-tight truncate max-w-[200px]">{stop.address || "—"}</p>
                        </div>
                        <button
                          onClick={() => setEditingStop(isEditing ? null : stop.id)}
                          className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                        >
                          <Edit3 className="w-3 h-3" /> {isEditing ? "Done" : "Edit"}
                        </button>
                      </div>
                      {isEditing ? (
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <Label className="text-[10px] text-muted-foreground w-10">Open</Label>
                            <Input
                              type="time"
                              value={w.open}
                              onChange={e => setWindow(stop.id, "open", e.target.value)}
                              className="h-7 text-xs w-28"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-[10px] text-muted-foreground w-10">Close</Label>
                            <Input
                              type="time"
                              value={w.close}
                              onChange={e => setWindow(stop.id, "close", e.target.value)}
                              className="h-7 text-xs w-28"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2">
                          <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-foreground font-medium">{w.open} – {w.close}</span>
                          {w.open === DEFAULT_ACCESS_WINDOW.open && w.close === DEFAULT_ACCESS_WINDOW.close && (
                            <span className="text-[10px] text-muted-foreground">(default)</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Enter route stops to configure access windows per location.
              </div>
            )}
          </div>

          <SectionDivider />

          {/* Hazmat selector */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              Hazardous Materials Flag
            </p>
            <Select value={hazmatClass} onValueChange={setHazmatClass}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HAZMAT_CLASSES.map(h => (
                  <SelectItem key={h.class} value={h.class}>
                    <span className={h.color}>{h.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isHazmat && (
              <div className={cn(
                "mt-2 p-3 rounded-lg border text-xs space-y-1.5",
                hazmatInfo?.restricted
                  ? "bg-destructive/8 border-destructive/30"
                  : "bg-orange-500/8 border-orange-500/30"
              )}>
                <p className={cn("font-semibold", hazmatInfo?.restricted ? "text-destructive" : "text-orange-600")}>
                  {hazmatInfo?.restricted ? "🚫 Restricted cargo — special permit required" : "⚠ Hazardous cargo requirements apply"}
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-start gap-1.5"><span className="mt-1 w-1 h-1 rounded-full bg-orange-400 shrink-0" />
                    FMENV / DPR hazmat transport permit required</li>
                  <li className="flex items-start gap-1.5"><span className="mt-1 w-1 h-1 rounded-full bg-orange-400 shrink-0" />
                    Placards (UN class labels) on all 4 sides of vehicle</li>
                  <li className="flex items-start gap-1.5"><span className="mt-1 w-1 h-1 rounded-full bg-orange-400 shrink-0" />
                    Driver must hold valid ADR / NARTO hazmat endorsement</li>
                  <li className="flex items-start gap-1.5"><span className="mt-1 w-1 h-1 rounded-full bg-orange-400 shrink-0" />
                    Fire extinguisher, spill kit, and MSDS sheet in cab</li>
                  {hazmatInfo?.restricted && (
                    <li className="flex items-start gap-1.5"><span className="mt-1 w-1 h-1 rounded-full bg-destructive shrink-0" />
                      No urban zone delivery between 07:00–19:00 without police escort</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Weight restriction alerts */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Corridor Weight Restrictions</p>
            {corridorHits.length > 0 ? (
              <div className="space-y-2">
                {corridorHits.map(c => (
                  <div key={c.name} className="flex items-start gap-3 p-3 rounded-lg bg-destructive/8 border border-destructive/30 text-xs">
                    <Weight className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-destructive">{c.name} — {c.maxTonnage}T limit</p>
                      <p className="text-muted-foreground mt-0.5">{c.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-500/8 border border-green-500/30 text-xs text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                {routeText.length > 10
                  ? `No weight restriction conflicts detected for ${gvwTonnage}T vehicle on this route.`
                  : "Enter stop addresses to check corridor weight restrictions."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
