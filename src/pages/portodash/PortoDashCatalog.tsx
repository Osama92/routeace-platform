import PortoDashLayout from "@/components/portodash/PortoDashLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Star, Package, TrendingUp, Globe } from "lucide-react";

const products = [
  { name: "Cashew Nuts (W320)", hs: "0801.31", origin: "Kano, Nigeria", price: "$2,800/T", demand: "High", rating: 4.8, certifications: ["NAFDAC", "ISO 22000", "Fair Trade"] },
  { name: "Sesame Seeds (Natural)", hs: "1207.40", origin: "Benue, Nigeria", price: "$2,600/T", demand: "High", rating: 4.6, certifications: ["NAFDAC", "Organic"] },
  { name: "Shea Butter (Grade A)", hs: "1515.90", origin: "Kwara, Nigeria", price: "$3,400/T", demand: "Medium", rating: 4.5, certifications: ["NAFDAC", "Organic", "USDA"] },
  { name: "Hibiscus Flowers (Dried)", hs: "0902.10", origin: "Jigawa, Nigeria", price: "$3,000/T", demand: "High", rating: 4.7, certifications: ["NAFDAC", "EU Compliant"] },
  { name: "Ginger (Split Dried)", hs: "0910.11", origin: "Kaduna, Nigeria", price: "$2,900/T", demand: "Medium", rating: 4.3, certifications: ["NAFDAC", "ISO"] },
  { name: "Moringa Leaves (Powder)", hs: "1211.90", origin: "Sokoto, Nigeria", price: "$4,200/T", demand: "Growing", rating: 4.4, certifications: ["Organic", "GMP"] },
];

const PortoDashCatalog = () => (
  <PortoDashLayout title="Product Catalog" subtitle="Export-ready product listings with certifications and pricing">
    <div className="flex items-center justify-between mb-6">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search products, HS codes..." className="pl-9 w-80" />
      </div>
      <Button><Plus className="w-4 h-4 mr-2" /> Add Product</Button>
    </div>

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map(p => (
        <Card key={p.name} className="hover:border-primary/20 transition-colors cursor-pointer group">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Star className="w-3 h-3 text-[hsl(var(--warning))] fill-[hsl(var(--warning))]" />
                <span className="font-medium">{p.rating}</span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm">{p.name}</h3>
              <p className="text-xs text-muted-foreground">HS Code: {p.hs} · {p.origin}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-primary">{p.price}</span>
              <Badge variant={p.demand === "High" ? "default" : "secondary"} className="text-[10px]">
                <TrendingUp className="w-2.5 h-2.5 mr-1" /> {p.demand} Demand
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {p.certifications.map(c => (
                <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </PortoDashLayout>
);

export default PortoDashCatalog;
