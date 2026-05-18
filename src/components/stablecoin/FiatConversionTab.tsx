import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRightLeft } from "lucide-react";

const conversionHistory = [
  { token: "USDT", amount: 25000, fiat: "NGN", rate: 1580.50, fiatAmt: 39512500, provider: "Regulated OTC", gl: 125000 },
  { token: "USDC", amount: 8500, fiat: "NGN", rate: 1578.25, fiatAmt: 13415125, provider: "Liquidity Pool", gl: -42000 },
  { token: "EURC", amount: 15000, fiat: "GBP", rate: 0.856, fiatAmt: 12840, provider: "FX Provider", gl: 320 },
];

const FiatConversionTab = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <Card className="lg:col-span-2">
      <CardHeader><CardTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" />Conversion History</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>→ Fiat</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Fiat Amount</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>FX G/L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conversionHistory.map((c, i) => (
              <TableRow key={i}>
                <TableCell><Badge variant="outline">{c.token}</Badge></TableCell>
                <TableCell className="text-right">${c.amount.toLocaleString()}</TableCell>
                <TableCell>{c.fiat}</TableCell>
                <TableCell className="text-right">{c.rate}</TableCell>
                <TableCell className="text-right font-semibold">{c.fiatAmt.toLocaleString()}</TableCell>
                <TableCell className="text-sm">{c.provider}</TableCell>
                <TableCell className={c.gl >= 0 ? "text-emerald-500" : "text-destructive"}>{c.gl >= 0 ? "+" : ""}{c.gl.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>Conversion Policy</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground">Default Conversion</label>
          <Select defaultValue="auto">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto-Convert</SelectItem>
              <SelectItem value="hold">Hold Stablecoin</SelectItem>
              <SelectItem value="partial">Partial (50/50)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Target Currency</label>
          <Select defaultValue="NGN">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
              <SelectItem value="USD">USD - US Dollar</SelectItem>
              <SelectItem value="GBP">GBP - British Pound</SelectItem>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
              <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Max Spread Tolerance</label>
          <Input defaultValue="0.5%" />
        </div>
        <Button className="w-full">Save Policy</Button>
      </CardContent>
    </Card>
  </div>
);

export default FiatConversionTab;
