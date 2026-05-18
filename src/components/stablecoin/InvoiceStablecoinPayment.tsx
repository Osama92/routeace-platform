import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Coins, Copy, CheckCircle, Shield, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";

interface InvoiceStablecoinPaymentProps {
  open: boolean;
  onClose: () => void;
  invoiceNumber: string;
  totalAmount: number;
  currency?: string;
}

const WALLET_ADDRESSES: Record<string, string> = {
  ethereum: "0x9876...ef01",
  tron: "T7Hx...8nRq",
  polygon: "0x3456...7890",
  bnb: "0xABCD...5678",
};

const SUPPORTED_TOKENS = ["USDT", "USDC", "EURC"];

const InvoiceStablecoinPayment = ({ open, onClose, invoiceNumber, totalAmount, currency = "USD" }: InvoiceStablecoinPaymentProps) => {
  const [selectedNetwork, setSelectedNetwork] = useState("ethereum");
  const [selectedToken, setSelectedToken] = useState("USDT");
  const [status, setStatus] = useState<"awaiting" | "confirming" | "aml_check" | "settled">("awaiting");

  const walletAddress = WALLET_ADDRESSES[selectedNetwork] || WALLET_ADDRESSES.ethereum;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    toast.success("Wallet address copied");
  };

  const simulatePayment = () => {
    setStatus("confirming");
    setTimeout(() => setStatus("aml_check"), 2000);
    setTimeout(() => setStatus("settled"), 4000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Pay with Stablecoin
          </DialogTitle>
          <DialogDescription>Invoice {invoiceNumber} - ${totalAmount.toLocaleString()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Network & Token Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Network</label>
              <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="tron">Tron</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="bnb">BNB Chain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Token</label>
              <Select value={selectedToken} onValueChange={setSelectedToken}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_TOKENS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* QR Code Placeholder */}
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <QrCode className="h-24 w-24 text-muted-foreground mb-3" />
              <p className="text-xs text-muted-foreground">Scan to pay {selectedToken} on {selectedNetwork}</p>
            </CardContent>
          </Card>

          {/* Wallet Address */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <code className="text-xs flex-1 truncate">{walletAddress}</code>
            <Button variant="ghost" size="icon" onClick={handleCopyAddress}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <Separator />

          {/* Payment Status Flow */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {status === "awaiting" ? (
                <Badge variant="secondary">⏳ Awaiting Payment</Badge>
              ) : (
                <Badge className="bg-emerald-500/10 text-emerald-500"><CheckCircle className="h-3 w-3 mr-1" />Payment Detected</Badge>
              )}
            </div>
            {status === "confirming" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Awaiting blockchain confirmation...
              </div>
            )}
            {status === "aml_check" && (
              <div className="flex items-center gap-2 text-sm text-amber-500">
                <Shield className="h-4 w-4" /> Running AML & compliance checks...
              </div>
            )}
            {status === "settled" && (
              <div className="flex items-center gap-2 text-sm text-emerald-500">
                <CheckCircle className="h-4 w-4" /> Settlement complete - posted to ERP
              </div>
            )}
          </div>

          {/* Demo button */}
          {status === "awaiting" && (
            <Button onClick={simulatePayment} className="w-full" variant="outline">
              Simulate Payment (Demo)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceStablecoinPayment;
