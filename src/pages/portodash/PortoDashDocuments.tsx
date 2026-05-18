import PortoDashLayout from "@/components/portodash/PortoDashLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Upload, CheckCircle, Clock, AlertTriangle, Plus } from "lucide-react";

const documents = [
  { name: "Commercial Invoice - PD-0341", type: "Commercial Invoice", status: "signed", shipment: "Cashew Nuts → Germany", date: "2026-02-18" },
  { name: "Bill of Lading - PD-0341", type: "Bill of Lading", status: "issued", shipment: "Cashew Nuts → Germany", date: "2026-03-05" },
  { name: "Certificate of Origin - PD-0341", type: "Certificate of Origin", status: "approved", shipment: "Cashew Nuts → Germany", date: "2026-02-20" },
  { name: "Packing List - PD-0342", type: "Packing List", status: "draft", shipment: "Sesame Seeds → China", date: "2026-03-02" },
  { name: "Phytosanitary Certificate - PD-0342", type: "Export Permit", status: "pending", shipment: "Sesame Seeds → China", date: "2026-03-04" },
  { name: "Quality Certificate - PD-0343", type: "Quality Certificate", status: "pending", shipment: "Shea Butter → Spain", date: "2026-03-06" },
  { name: "Export License - Shea Butter", type: "Export License", status: "expiring", shipment: "Category License", date: "2026-03-15" },
];

const statusIcon = (s: string) => {
  if (s === "signed" || s === "approved" || s === "issued") return <CheckCircle className="w-4 h-4 text-[hsl(var(--success))]" />;
  if (s === "expiring") return <AlertTriangle className="w-4 h-4 text-destructive" />;
  if (s === "pending") return <Clock className="w-4 h-4 text-[hsl(var(--warning))]" />;
  return <FileText className="w-4 h-4 text-muted-foreground" />;
};

const PortoDashDocuments = () => (
  <PortoDashLayout title="Trade Documents" subtitle="Manage export documentation, certificates, and compliance paperwork">
    <div className="flex items-center justify-between mb-6">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Documents", value: "47", color: "text-foreground" },
          { label: "Pending Review", value: "8", color: "text-[hsl(var(--warning))]" },
          { label: "Expiring Soon", value: "3", color: "text-destructive" },
          { label: "Completed", value: "36", color: "text-[hsl(var(--success))]" },
        ].map(s => (
          <div key={s.label} className="text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-1" /> Upload</Button>
        <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Generate Document</Button>
      </div>
    </div>

    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All Documents</TabsTrigger>
        <TabsTrigger value="invoices">Invoices</TabsTrigger>
        <TabsTrigger value="certificates">Certificates</TabsTrigger>
        <TabsTrigger value="permits">Permits & Licenses</TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-4 space-y-2">
        {documents.map((d, i) => (
          <Card key={i} className="hover:border-primary/10 transition-colors">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {statusIcon(d.status)}
                <div>
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.shipment} · {d.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[10px]">{d.type}</Badge>
                <Badge variant={
                  d.status === "signed" || d.status === "approved" || d.status === "issued" ? "default" :
                  d.status === "expiring" ? "destructive" : "secondary"
                } className="text-[10px] capitalize">{d.status}</Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="w-3.5 h-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
      <TabsContent value="invoices"><p className="text-sm text-muted-foreground p-4">Commercial invoice documents</p></TabsContent>
      <TabsContent value="certificates"><p className="text-sm text-muted-foreground p-4">Quality and origin certificates</p></TabsContent>
      <TabsContent value="permits"><p className="text-sm text-muted-foreground p-4">Export permits and licenses</p></TabsContent>
    </Tabs>
  </PortoDashLayout>
);

export default PortoDashDocuments;
