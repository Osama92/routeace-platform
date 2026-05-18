import PortoDashLayout from "@/components/portodash/PortoDashLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, Ship, DollarSign, Clock, Star, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

const carriers = [
  { name: "Maersk Line", type: "Ocean Freight", routes: "West Africa → EU, Asia", rate: "$1,200/TEU", transit: "18-25 days", rating: 4.8, reliability: "98%" },
  { name: "MSC Mediterranean", type: "Ocean Freight", routes: "Lagos → Hamburg, Rotterdam", rate: "$1,150/TEU", transit: "20-28 days", rating: 4.6, reliability: "96%" },
  { name: "CMA CGM", type: "Ocean Freight", routes: "West Africa → Global", rate: "$1,300/TEU", transit: "16-22 days", rating: 4.7, reliability: "97%" },
  { name: "Ethiopian Airlines Cargo", type: "Air Freight", routes: "Lagos → Dubai, EU Hubs", rate: "$4.50/kg", transit: "2-4 days", rating: 4.5, reliability: "94%" },
  { name: "DHL Global Forwarding", type: "Multimodal", routes: "Global Coverage", rate: "Custom Quote", transit: "Varies", rating: 4.4, reliability: "95%" },
];

const bookings = [
  { id: "FB-0891", carrier: "Maersk Line", container: "40ft HC", route: "Lagos → Hamburg", departure: "2026-03-15", cost: "$2,400", status: "confirmed" },
  { id: "FB-0892", carrier: "CMA CGM", container: "20ft STD", route: "Apapa → Shanghai", departure: "2026-03-18", cost: "$1,300", status: "pending" },
];

const PortoDashFreight = () => (
  <PortoDashLayout title="Freight Booking" subtitle="Compare rates, book carriers, and manage shipment logistics">
    {/* Carrier Comparison */}
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Ship className="w-4 h-4 text-primary" /> Carrier Network
          </CardTitle>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search carriers..." className="pl-9 w-64" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {carriers.map(c => (
            <div key={c.name} className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/20 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                  {c.type === "Air Freight" ? <Truck className="w-5 h-5 text-info" /> : <Ship className="w-5 h-5 text-info" />}
                </div>
                <div>
                  <p className="font-semibold text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.type} · {c.routes}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="font-medium text-primary">{c.rate}</p>
                  <p className="text-[10px] text-muted-foreground">Rate</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">{c.transit}</p>
                  <p className="text-[10px] text-muted-foreground">Transit</p>
                </div>
                <div className="text-center flex items-center gap-1">
                  <Star className="w-3 h-3 text-[hsl(var(--warning))] fill-[hsl(var(--warning))]" />
                  <span className="font-medium">{c.rating}</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">{c.reliability}</Badge>
                <Button size="sm" variant="outline">Book</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Active Bookings */}
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Active Bookings</CardTitle>
          <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Booking</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {bookings.map(b => (
          <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
            <div>
              <p className="font-semibold text-sm">{b.carrier} - {b.container}</p>
              <p className="text-xs text-muted-foreground">{b.id} · {b.route}</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <Clock className="w-3 h-3" /> {b.departure}
              </div>
              <p className="font-medium">{b.cost}</p>
              <Badge variant={b.status === "confirmed" ? "default" : "secondary"} className="capitalize">{b.status}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  </PortoDashLayout>
);

export default PortoDashFreight;
