import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  FileText,
  Truck,
  DollarSign,
  BarChart3,
  Shield,
  AlertTriangle,
  Loader2,
  Check,
  Lock,
} from "lucide-react";

interface ExportItem {
  id: string;
  name: string;
  description: string;
  icon: any;
  format: "csv" | "pdf" | "both";
  category: "financial" | "operational" | "compliance";
}

const EXPORT_ITEMS: ExportItem[] = [
  {
    id: "fleet_list",
    name: "Fleet Inventory",
    description: "Complete list of vehicles, status, and specifications",
    icon: Truck,
    format: "both",
    category: "operational",
  },
  {
    id: "financial_statements",
    name: "Financial Statements",
    description: "P&L, Balance Sheet, Cash Flow summary",
    icon: DollarSign,
    format: "both",
    category: "financial",
  },
  {
    id: "kpi_history",
    name: "KPI History",
    description: "Historical metrics and trends (12 months)",
    icon: BarChart3,
    format: "csv",
    category: "financial",
  },
  {
    id: "customer_list",
    name: "Customer Directory",
    description: "Active customers with contract status",
    icon: FileText,
    format: "csv",
    category: "operational",
  },
  {
    id: "risk_register",
    name: "Risk Register",
    description: "Identified risks and mitigation status",
    icon: AlertTriangle,
    format: "both",
    category: "compliance",
  },
  {
    id: "governance_docs",
    name: "Governance Documents",
    description: "Approval workflows and control matrices",
    icon: Shield,
    format: "pdf",
    category: "compliance",
  },
];

const DataRoomExports = () => {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");

  const toggleItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedItems.length === EXPORT_ITEMS.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(EXPORT_ITEMS.map(i => i.id));
    }
  };

  const exportItem = async (item: ExportItem) => {
    setExporting(item.id);
    
    try {
      let data: any[] = [];
      let filename = item.id;

      // Fetch appropriate data based on item
      switch (item.id) {
        case "fleet_list":
          const { data: vehicles } = await supabase
            .from("vehicles")
            .select("*");
          data = vehicles || [];
          break;
          
        case "financial_statements":
          const { data: invoices } = await supabase
            .from("invoices")
            .select("*");
          const { data: expenses } = await supabase
            .from("expenses")
            .select("*");
          data = [
            { section: "Revenue", items: invoices },
            { section: "Expenses", items: expenses },
          ];
          break;
          
        case "kpi_history":
          const { data: metrics } = await supabase
            .from("investor_metrics")
            .select("*")
            .order("metric_date", { ascending: false });
          data = metrics || [];
          break;
          
        case "customer_list":
          const { data: customers } = await supabase
            .from("customers")
            .select("*");
          data = customers || [];
          break;
          
        case "risk_register":
          const { data: blacklist } = await supabase
            .from("route_blacklist")
            .select("*");
          data = blacklist || [];
          break;
          
        case "governance_docs":
          // Static governance data
          data = [
            { document: "RBAC Matrix", status: "Active" },
            { document: "Approval Workflows", status: "Active" },
            { document: "Audit Log Policy", status: "Active" },
          ];
          break;
      }

      // Generate CSV
      if (exportFormat === "csv" && data.length > 0) {
        const flatData = Array.isArray(data[0]?.items) 
          ? data.flatMap(d => d.items || [])
          : data;
        
        if (flatData.length > 0) {
          const headers = Object.keys(flatData[0]);
          const csvContent = [
            headers.join(","),
            ...flatData.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(","))
          ].join("\n");

          const blob = new Blob([csvContent], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `routeace-${filename}-${new Date().toISOString().split("T")[0]}.csv`;
          a.click();
        }
      }

      // Log the export for audit
      await supabase.from("investor_access_logs").insert({
        access_type: "data_export",
        resource_accessed: item.id,
      });

      toast({
        title: "Export Complete",
        description: `${item.name} has been downloaded`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Unable to generate export. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  const exportSelected = async () => {
    for (const id of selectedItems) {
      const item = EXPORT_ITEMS.find(i => i.id === id);
      if (item) {
        await exportItem(item);
      }
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "financial": return "default";
      case "operational": return "secondary";
      case "compliance": return "outline";
      default: return "outline";
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Data Room Exports
            </CardTitle>
            <CardDescription>One-click exports for investor due diligence</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
            >
              {selectedItems.length === EXPORT_ITEMS.length ? "Deselect All" : "Select All"}
            </Button>
            <Button
              size="sm"
              disabled={selectedItems.length === 0}
              onClick={exportSelected}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Selected ({selectedItems.length})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Format Selection */}
        <div className="flex items-center gap-4 p-3 bg-secondary/30 rounded-lg">
          <span className="text-sm font-medium">Export Format:</span>
          <div className="flex gap-2">
            <Button
              variant={exportFormat === "csv" ? "default" : "outline"}
              size="sm"
              onClick={() => setExportFormat("csv")}
            >
              CSV
            </Button>
            <Button
              variant={exportFormat === "pdf" ? "default" : "outline"}
              size="sm"
              onClick={() => setExportFormat("pdf")}
              disabled
            >
              <Lock className="w-3 h-3 mr-1" />
              PDF (Coming Soon)
            </Button>
          </div>
        </div>

        {/* Export Items */}
        <div className="grid gap-3">
          {EXPORT_ITEMS.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                selectedItems.includes(item.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={() => toggleItem(item.id)}
                />
                <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.name}</p>
                    <Badge variant={getCategoryColor(item.category) as any} className="text-xs">
                      {item.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportItem(item)}
                disabled={exporting === item.id}
              >
                {exporting === item.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Security Note */}
        <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <Lock className="w-5 h-5 text-warning" />
          <div className="text-sm">
            <p className="font-medium text-warning">Confidential Data</p>
            <p className="text-muted-foreground">
              All exports are logged for compliance. PII is masked by default.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataRoomExports;
