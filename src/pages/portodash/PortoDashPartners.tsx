import PortoDashLayout from "@/components/portodash/PortoDashLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Star, CheckCircle, Globe, Truck, Building2, MessageSquare, Plus } from "lucide-react";

const partners = [
  { name: "Lagos Freight Services Ltd", type: "Freight Forwarder", country: "Nigeria", services: ["Ocean Freight", "Documentation", "Customs"], verified: true, score: 92, shipments: 34 },
  { name: "West Africa Clearing Agents", type: "Customs Broker", country: "Nigeria", services: ["Customs Clearance", "Inspections", "Permits"], verified: true, score: 88, shipments: 28 },
  { name: "Pan-African Logistics Co.", type: "Logistics Provider", country: "Ghana/Nigeria", services: ["Warehousing", "Trucking", "Container Handling"], verified: true, score: 85, shipments: 19 },
  { name: "GlobalTrade Insurance", type: "Insurance Provider", country: "Nigeria", services: ["Marine Cargo", "Credit Insurance", "Political Risk"], verified: true, score: 90, shipments: 0 },
  { name: "NEXIM Bank", type: "Trade Finance", country: "Nigeria", services: ["Export Credit", "Pre-Export Finance", "Guarantees"], verified: true, score: 96, shipments: 0 },
  { name: "Bureau Veritas Nigeria", type: "Quality Assurance", country: "Nigeria", services: ["Product Testing", "Certification", "Inspection"], verified: true, score: 94, shipments: 0 },
];

const typeIcons: Record<string, typeof Truck> = {
  "Freight Forwarder": Truck,
  "Customs Broker": Building2,
  "Logistics Provider": Truck,
  "Insurance Provider": Building2,
  "Trade Finance": Building2,
  "Quality Assurance": CheckCircle,
};

const PortoDashPartners = () => (
  <PortoDashLayout title="Partner Network" subtitle="Manage logistics partners, customs brokers, and service providers">
    <div className="flex items-center justify-between mb-6">
      <div className="flex gap-2">
        {["All", "Freight", "Customs", "Finance", "Insurance", "QA"].map(f => (
          <Button key={f} variant={f === "All" ? "default" : "outline"} size="sm" className="text-xs">{f}</Button>
        ))}
      </div>
      <Button><Plus className="w-4 h-4 mr-2" /> Add Partner</Button>
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      {partners.map(p => {
        const Icon = typeIcons[p.type] || Users;
        return (
          <Card key={p.name} className="hover:border-primary/10 transition-colors">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-info" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{p.name}</h3>
                      {p.verified && <CheckCircle className="w-3.5 h-3.5 text-[hsl(var(--success))]" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.type} · {p.country}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-[hsl(var(--warning))] fill-[hsl(var(--warning))]" />
                  <span className="text-xs font-medium">{p.score}%</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {p.services.map(s => (
                  <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                {p.shipments > 0 && (
                  <span className="text-xs text-muted-foreground">{p.shipments} shipments completed</span>
                )}
                <Button variant="ghost" size="sm" className="ml-auto text-xs">
                  <MessageSquare className="w-3 h-3 mr-1" /> Contact
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  </PortoDashLayout>
);

export default PortoDashPartners;
