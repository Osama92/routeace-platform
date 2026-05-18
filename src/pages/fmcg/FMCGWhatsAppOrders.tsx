import { useState } from "react";
import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  MessageCircle, Bot, CheckCircle2, AlertTriangle, Clock,
  Package, ShoppingCart, ArrowRight, Sparkles, Phone,
} from "lucide-react";
import { toast } from "sonner";

const sampleOrders = [
  {
    id: "WA-001", sender: "+234 801 234 5678", senderName: "Mrs. Adebayo", outlet: "Adebayo Mini Mart",
    raw: "Good morning, I need 5 cartons Peak Milk 400g, 10 packs Indomie Chicken 70g, 3 crates Coca-Cola 50cl. Please deliver today.",
    status: "extracted", confidence: 94,
    items: [
      { sku: "SKU-0012", name: "Peak Milk 400g", qty: 5, unit: "cartons" },
      { sku: "SKU-0034", name: "Indomie Chicken 70g", qty: 10, unit: "packs" },
      { sku: "SKU-0078", name: "Coca-Cola 50cl PET", qty: 3, unit: "crates" },
    ],
    time: "08:42 AM",
  },
  {
    id: "WA-002", sender: "+234 803 456 7890", senderName: "Alhaji Garba", outlet: "Garba General Store",
    raw: "send me 20 bags Golden Penny Flour 1kg and 8 cartons Dano milk. Also 15 packs of Maggi cubes",
    status: "extracted", confidence: 87,
    items: [
      { sku: "SKU-0056", name: "Golden Penny Flour 1kg", qty: 20, unit: "bags" },
      { sku: "SKU-0091", name: "Dano Cool Cow 360g", qty: 8, unit: "cartons" },
      { sku: "SKU-0102", name: "Maggi Star Cubes", qty: 15, unit: "packs" },
    ],
    time: "09:15 AM",
  },
  {
    id: "WA-003", sender: "+234 905 678 1234", senderName: "Mama Nkechi", outlet: "Nkechi Store",
    raw: "pls bring indomie 2 ctns, milo 5, peak tin 10",
    status: "review_needed", confidence: 62,
    items: [
      { sku: "SKU-0034", name: "Indomie Chicken 70g", qty: 2, unit: "cartons" },
      { sku: "SKU-UNKNOWN", name: "Milo (size unclear)", qty: 5, unit: "?" },
      { sku: "SKU-0012", name: "Peak Milk (variant unclear)", qty: 10, unit: "tins?" },
    ],
    time: "09:38 AM",
  },
  {
    id: "WA-004", sender: "+234 812 345 6789", senderName: "Mr. Okafor", outlet: "Okafor Supermarket",
    raw: "I want to place a big order tomorrow. Will send the list later.",
    status: "no_order", confidence: 15,
    items: [],
    time: "10:05 AM",
  },
];

const stats = [
  { label: "Messages Today", value: "24", icon: MessageCircle, color: "text-primary" },
  { label: "Orders Extracted", value: "18", icon: ShoppingCart, color: "text-emerald-600" },
  { label: "Needs Review", value: "4", icon: AlertTriangle, color: "text-orange-600" },
  { label: "Avg Confidence", value: "89%", icon: Bot, color: "text-blue-600" },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  extracted: { label: "AI Extracted", variant: "default" },
  review_needed: { label: "Needs Review", variant: "secondary" },
  no_order: { label: "No Order Detected", variant: "outline" },
  confirmed: { label: "Confirmed", variant: "default" },
};

const FMCGWhatsAppOrders = () => {
  const [selectedOrder, setSelectedOrder] = useState<string | null>("WA-001");
  const selected = sampleOrders.find((o) => o.id === selectedOrder);

  const handleConfirm = (id: string) => {
    toast.success(`Order ${id} confirmed and sent to warehouse picklist`);
  };

  return (
    <FMCGLayout title="WhatsApp Order Ingestion" subtitle="AI-powered order extraction from WhatsApp messages">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6 flex items-center gap-4">
              <s.icon className={`w-8 h-8 ${s.color}`} />
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Message Queue */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">Incoming Messages</h3>
          {sampleOrders.map((order) => (
            <Card
              key={order.id}
              className={`cursor-pointer transition-all hover:shadow-md ${selectedOrder === order.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => setSelectedOrder(order.id)}
            >
              <CardContent className="pt-4 pb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{order.senderName}</p>
                      <p className="text-xs text-muted-foreground">{order.sender}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{order.time}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{order.raw}</p>
                <div className="flex items-center justify-between">
                  <Badge variant={statusConfig[order.status].variant}>{statusConfig[order.status].label}</Badge>
                  {order.confidence > 0 && (
                    <span className={`text-xs font-medium ${order.confidence >= 80 ? "text-emerald-600" : order.confidence >= 60 ? "text-orange-600" : "text-destructive"}`}>
                      {order.confidence}% confidence
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Extraction Detail */}
        <div className="lg:col-span-3">
          {selected ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> AI Extraction - {selected.id}</CardTitle>
                  <Badge variant={statusConfig[selected.status].variant}>{statusConfig[selected.status].label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Raw message */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Original Message</p>
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-sm italic">"{selected.raw}"</p>
                    <p className="text-xs text-muted-foreground mt-1">- {selected.senderName} ({selected.outlet})</p>
                  </div>
                </div>

                {/* Confidence */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">AI Confidence</span>
                    <span className="font-medium">{selected.confidence}%</span>
                  </div>
                  <Progress value={selected.confidence} className="h-2" />
                </div>

                {/* Extracted Items */}
                {selected.items.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Extracted Line Items</p>
                    <div className="space-y-2">
                      {selected.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                          <Package className="w-5 h-5 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{item.qty}</p>
                            <p className="text-xs text-muted-foreground">{item.unit}</p>
                          </div>
                          {item.sku === "SKU-UNKNOWN" && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Bot className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No order items detected in this message</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  {selected.status === "extracted" && (
                    <Button className="flex-1" onClick={() => handleConfirm(selected.id)}>
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm & Send to Picklist
                    </Button>
                  )}
                  {selected.status === "review_needed" && (
                    <>
                      <Button variant="outline" className="flex-1">Edit Items</Button>
                      <Button className="flex-1" onClick={() => handleConfirm(selected.id)}>
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm After Review
                      </Button>
                    </>
                  )}
                  {selected.status === "no_order" && (
                    <Button variant="outline" className="flex-1">Mark as Non-Order</Button>
                  )}
                </div>

                {/* Pipeline */}
                {selected.items.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Order Pipeline</p>
                    <div className="flex items-center gap-2 text-xs">
                      {["WhatsApp Received", "AI Extraction", "Human Review", "Sales Order", "Picklist", "Dispatch"].map((step, i) => (
                        <div key={step} className="flex items-center gap-1">
                          <div className={`px-2 py-1 rounded ${i <= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{step}</div>
                          {i < 5 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Select a message to view extraction details</p>
            </Card>
          )}
        </div>
      </div>
    </FMCGLayout>
  );
};

export default FMCGWhatsAppOrders;
