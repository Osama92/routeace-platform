import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Search, Trash2 } from "lucide-react";
import type { SKU, Outlet } from "@/hooks/useFieldSales";

interface CartItem {
  sku_id: string;
  sku_name: string;
  sku_code: string;
  quantity: number;
  unit_price: number;
}

interface Props {
  skus: SKU[];
  outlets: Outlet[];
  selectedOutletId?: string;
  onSubmitOrder: (outletId: string, items: { sku_id: string; quantity: number; unit_price: number }[], status: "draft" | "confirmed") => Promise<any>;
}

const OrderCaptureTab = ({ skus, outlets, selectedOutletId, onSubmitOrder }: Props) => {
  const [outletId, setOutletId] = useState(selectedOutletId || "");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredSKUs = skus.filter(s =>
    s.sku_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.sku_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (sku: SKU) => {
    const existing = cart.find(c => c.sku_id === sku.id);
    if (existing) {
      setCart(cart.map(c => c.sku_id === sku.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { sku_id: sku.id, sku_name: sku.sku_name, sku_code: sku.sku_code, quantity: 1, unit_price: sku.unit_price || 0 }]);
    }
    setSearchTerm("");
  };

  const updateQty = (skuId: string, qty: number) => {
    if (qty <= 0) { setCart(cart.filter(c => c.sku_id !== skuId)); return; }
    setCart(cart.map(c => c.sku_id === skuId ? { ...c, quantity: qty } : c));
  };

  const removeItem = (skuId: string) => setCart(cart.filter(c => c.sku_id !== skuId));

  const subtotal = cart.reduce((s, c) => s + c.quantity * c.unit_price, 0);
  const tax = subtotal * 0.075;
  const total = subtotal + tax;

  const handleSubmit = async (status: "draft" | "confirmed") => {
    if (!outletId) return;
    if (cart.length === 0) return;
    setSubmitting(true);
    await onSubmitOrder(outletId, cart.map(c => ({ sku_id: c.sku_id, quantity: c.quantity, unit_price: c.unit_price })), status);
    setCart([]);
    setSubmitting(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Order Capture</CardTitle>
        <Badge variant="secondary">{cart.length} items</Badge>
      </CardHeader>
      <CardContent>
        {/* Outlet selector */}
        <div className="mb-4">
          <Select value={outletId} onValueChange={setOutletId}>
            <SelectTrigger><SelectValue placeholder="Select outlet..." /></SelectTrigger>
            <SelectContent>
              {outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.outlet_name} - {o.address || "N/A"}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* SKU search + add */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search SKU by name or code..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          {searchTerm && filteredSKUs.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredSKUs.slice(0, 8).map(sku => (
                <button key={sku.id} className="w-full text-left px-4 py-2 hover:bg-accent text-sm flex justify-between" onClick={() => addToCart(sku)}>
                  <span>{sku.sku_name} <span className="text-muted-foreground">({sku.sku_code})</span></span>
                  <span className="font-medium">₦{(sku.unit_price || 0).toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart items */}
        {cart.length > 0 ? (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">SKU</th><th className="pb-2 pr-4">Unit Price</th><th className="pb-2 pr-4 text-center">Qty</th><th className="pb-2 pr-4 text-right">Total</th><th className="pb-2"></th>
              </tr></thead>
              <tbody>
                {cart.map(item => (
                  <tr key={item.sku_id} className="border-b">
                    <td className="py-3 pr-4 font-medium">{item.sku_name}<br /><span className="text-xs text-muted-foreground">{item.sku_code}</span></td>
                    <td className="py-3 pr-4">₦{item.unit_price.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-center">
                      <Input type="number" value={item.quantity} min={1} className="w-20 mx-auto text-center" onChange={e => updateQty(item.sku_id, parseInt(e.target.value) || 0)} />
                    </td>
                    <td className="py-3 pr-4 text-right font-bold">₦{(item.quantity * item.unit_price).toLocaleString()}</td>
                    <td className="py-3"><Button size="sm" variant="ghost" onClick={() => removeItem(item.sku_id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">Search and add SKUs to start building an order.</p>
        )}

        {/* Totals */}
        {cart.length > 0 && (
          <div className="flex justify-between items-center p-4 rounded-lg bg-muted/50">
            <div>
              <p className="text-xs text-muted-foreground">Subtotal: ₦{subtotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">VAT (7.5%): ₦{Math.round(tax).toLocaleString()}</p>
              <p className="text-2xl font-bold">₦{Math.round(total).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" disabled={submitting || !outletId} onClick={() => handleSubmit("draft")}>Save Draft</Button>
              <Button disabled={submitting || !outletId} onClick={() => handleSubmit("confirmed")}>{submitting ? "Submitting..." : "Submit Order"}</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderCaptureTab;
