import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, FileText, Download, TrendingDown } from "lucide-react";

interface PAYEResult {
  grossAnnual: number;
  cra: number;
  pension: number;
  nhf: number;
  nhis: number;
  totalDeductions: number;
  taxableIncome: number;
  bands: { label: string; range: string; rate: string; taxable: number; tax: number }[];
  annualPAYE: number;
  monthlyPAYE: number;
}

const TAX_BANDS = [
  { min: 0, max: 800_000, rate: 0, label: "Tax Free" },
  { min: 800_000, max: 3_000_000, rate: 0.15, label: "15% Band" },
  { min: 3_000_000, max: 12_000_000, rate: 0.18, label: "18% Band" },
  { min: 12_000_000, max: 25_000_000, rate: 0.21, label: "21% Band" },
  { min: 25_000_000, max: 50_000_000, rate: 0.23, label: "23% Band" },
  { min: 50_000_000, max: Infinity, rate: 0.25, label: "25% Band" },
];

function computePAYE(
  basicMonthly: number,
  housingMonthly: number,
  transportMonthly: number,
  otherMonthly: number,
  nhisMonthly: number
): PAYEResult {
  const basicAnnual = basicMonthly * 12;
  const housingAnnual = housingMonthly * 12;
  const transportAnnual = transportMonthly * 12;
  const otherAnnual = otherMonthly * 12;
  const grossAnnual = basicAnnual + housingAnnual + transportAnnual + otherAnnual;

  // CRA = max(200000, 1% of gross) + 20% of gross
  const craFixed = Math.max(200_000, grossAnnual * 0.01);
  const cra = craFixed + grossAnnual * 0.20;

  // Pension = 8% of (basic + housing + transport)
  const pension = (basicAnnual + housingAnnual + transportAnnual) * 0.08;

  // NHF = 2.5% of basic
  const nhf = basicAnnual * 0.025;

  // NHIS
  const nhis = nhisMonthly * 12;

  const totalDeductions = cra + pension + nhf + nhis;
  const taxableIncome = Math.max(0, grossAnnual - totalDeductions);

  // Apply progressive bands
  let remaining = taxableIncome;
  const bands = TAX_BANDS.map((band) => {
    const width = band.max === Infinity ? Infinity : band.max - band.min;
    const taxable = Math.min(Math.max(0, remaining), width);
    const tax = taxable * band.rate;
    remaining -= taxable;
    return {
      label: band.label,
      range: band.max === Infinity ? `Above ₦${(band.min / 1_000_000).toFixed(0)}M` : `₦${(band.min / 1_000_000).toFixed(1)}M – ₦${(band.max / 1_000_000).toFixed(1)}M`,
      rate: `${(band.rate * 100).toFixed(0)}%`,
      taxable,
      tax,
    };
  });

  const annualPAYE = bands.reduce((s, b) => s + b.tax, 0);
  const monthlyPAYE = annualPAYE / 12;

  return { grossAnnual, cra, pension, nhf, nhis, totalDeductions, taxableIncome, bands, annualPAYE, monthlyPAYE };
}

const fmt = (n: number) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PAYECalculator() {
  const [basic, setBasic] = useState("250000");
  const [housing, setHousing] = useState("100000");
  const [transport, setTransport] = useState("50000");
  const [other, setOther] = useState("50000");
  const [nhis, setNhis] = useState("0");
  const [result, setResult] = useState<PAYEResult | null>(null);

  const calculate = () => {
    const r = computePAYE(
      parseFloat(basic) || 0,
      parseFloat(housing) || 0,
      parseFloat(transport) || 0,
      parseFloat(other) || 0,
      parseFloat(nhis) || 0
    );
    setResult(r);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            PAYE Calculator - NRS 2025
          </h2>
          <p className="text-sm text-muted-foreground">Nigeria Revenue Service compliant progressive tax computation</p>
        </div>
        <Badge variant="outline" className="text-xs">NRS 2025 Tax Bands</Badge>
      </div>

      <div className="p-3 rounded-lg border border-dashed bg-muted/30 text-xs text-muted-foreground">
        Sample values pre-filled. Update with your employee's actual salary components.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Employee Monthly Income</CardTitle>
            <CardDescription>Enter monthly values - annual computed automatically</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Basic Salary (Monthly)</Label>
                <Input type="number" value={basic} onChange={(e) => setBasic(e.target.value)} placeholder="250,000" />
              </div>
              <div>
                <Label className="text-xs">Housing Allowance</Label>
                <Input type="number" value={housing} onChange={(e) => setHousing(e.target.value)} placeholder="100,000" />
              </div>
              <div>
                <Label className="text-xs">Transport Allowance</Label>
                <Input type="number" value={transport} onChange={(e) => setTransport(e.target.value)} placeholder="50,000" />
              </div>
              <div>
                <Label className="text-xs">Other Allowances</Label>
                <Input type="number" value={other} onChange={(e) => setOther(e.target.value)} placeholder="50,000" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">NHIS Contribution (Monthly)</Label>
                <Input type="number" value={nhis} onChange={(e) => setNhis(e.target.value)} placeholder="0" />
              </div>
            </div>
            <Button onClick={calculate} className="w-full">
              <Calculator className="w-4 h-4 mr-2" /> Compute PAYE
            </Button>
          </CardContent>
        </Card>

        {/* Summary */}
        {result && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-primary" /> Tax Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Gross Annual Income</p>
                  <p className="font-bold text-foreground">{fmt(result.grossAnnual)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total Deductions</p>
                  <p className="font-bold text-foreground">{fmt(result.totalDeductions)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Taxable Income</p>
                  <p className="font-bold text-foreground">{fmt(result.taxableIncome)}</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-muted-foreground">Monthly PAYE</p>
                  <p className="font-bold text-primary text-lg">{fmt(result.monthlyPAYE)}</p>
                </div>
              </div>

              <div className="border-t pt-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">CRA</span><span>{fmt(result.cra)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pension (8%)</span><span>{fmt(result.pension)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">NHF (2.5%)</span><span>{fmt(result.nhf)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">NHIS</span><span>{fmt(result.nhis)}</span></div>
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Annual PAYE</span><span>{fmt(result.annualPAYE)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tax Band Breakdown */}
      {result && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" /> Progressive Tax Band Breakdown
            </CardTitle>
            <CardDescription>NRS 2025 progressive rates applied sequentially</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Band</TableHead>
                  <TableHead>Income Range</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="text-right">Taxable Amount</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.bands.map((band) => (
                  <TableRow key={band.label}>
                    <TableCell className="font-medium">{band.label}</TableCell>
                    <TableCell className="text-muted-foreground">{band.range}</TableCell>
                    <TableCell>
                      <Badge variant={band.rate === "0%" ? "secondary" : "default"} className="text-xs">{band.rate}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{fmt(band.taxable)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(band.tax)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell colSpan={4}>Total Annual PAYE</TableCell>
                  <TableCell className="text-right text-primary">{fmt(result.annualPAYE)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
