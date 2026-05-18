import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileText, Globe, Shield, CheckCircle, AlertTriangle, XCircle, Eye, Lock } from "lucide-react";

export interface StablecoinTransaction {
  id: string;
  hash: string;
  sender: string;
  receiver: string;
  token: string;
  network: string;
  amount: number;
  riskScore: number;
  amlFlag: string;
  status: string;
  country: string;
  walletAge: number;
  exchangeSource: string;
}

export const getRiskBadge = (score: number) => {
  if (score <= 30) return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Low ({score})</Badge>;
  if (score <= 60) return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Medium ({score})</Badge>;
  if (score <= 80) return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">High ({score})</Badge>;
  return <Badge variant="destructive">Critical ({score})</Badge>;
};

export const getStatusBadge = (status: string) => {
  switch (status) {
    case "settled": return <Badge className="bg-emerald-500/10 text-emerald-500"><CheckCircle className="h-3 w-3 mr-1" />Settled</Badge>;
    case "pending_review": return <Badge className="bg-amber-500/10 text-amber-500"><Eye className="h-3 w-3 mr-1" />Review</Badge>;
    case "frozen": return <Badge variant="destructive"><Lock className="h-3 w-3 mr-1" />Frozen</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
};

export const getAmlBadge = (flag: string) => {
  switch (flag) {
    case "clear": return <Badge className="bg-emerald-500/10 text-emerald-500"><Shield className="h-3 w-3 mr-1" />Clear</Badge>;
    case "review": return <Badge className="bg-amber-500/10 text-amber-500"><AlertTriangle className="h-3 w-3 mr-1" />Review</Badge>;
    case "flagged": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Flagged</Badge>;
    default: return <Badge variant="secondary">{flag}</Badge>;
  }
};

interface TransactionLogTabProps {
  transactions: StablecoinTransaction[];
}

const TransactionLogTab = ({ transactions }: TransactionLogTabProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = transactions.filter(tx =>
    !searchQuery || tx.hash.toLowerCase().includes(searchQuery.toLowerCase()) || tx.sender.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Stablecoin Transaction Log</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by hash or wallet..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 w-64" />
            </div>
            <Button variant="outline" size="sm">Export</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tx Hash</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>Network</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Sender</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>AML</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(tx => (
              <TableRow key={tx.id}>
                <TableCell className="font-mono text-xs">{tx.hash}</TableCell>
                <TableCell><Badge variant="outline">{tx.token}</Badge></TableCell>
                <TableCell className="text-sm">{tx.network}</TableCell>
                <TableCell className="text-right font-semibold">${tx.amount.toLocaleString()}</TableCell>
                <TableCell className="font-mono text-xs">{tx.sender}</TableCell>
                <TableCell><div className="flex items-center gap-1"><Globe className="h-3 w-3" />{tx.country}</div></TableCell>
                <TableCell>{getRiskBadge(tx.riskScore)}</TableCell>
                <TableCell>{getAmlBadge(tx.amlFlag)}</TableCell>
                <TableCell>{getStatusBadge(tx.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TransactionLogTab;
