import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Table, Presentation } from "lucide-react";
import { exportCSV, exportExcel, exportPDF, type ExportOptions } from "@/utils/exportReport";
import { toast } from "sonner";

interface DashboardExportButtonProps {
  getExportData: () => ExportOptions;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function DashboardExportButton({
  getExportData,
  className,
  variant = "outline",
  size = "sm",
}: DashboardExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    setExporting(true);
    try {
      const options = getExportData();
      if (!options.data || options.data.length === 0) {
        toast.error("No data to export");
        return;
      }

      switch (format) {
        case "csv":
          exportCSV(options);
          toast.success("CSV exported successfully");
          break;
        case "excel":
          exportExcel(options);
          toast.success("Excel exported successfully");
          break;
        case "pdf":
          exportPDF(options);
          toast.success("PDF exported successfully");
          break;
      }
    } catch (err) {
      toast.error("Export failed");
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className} disabled={exporting}>
          <Download className="h-4 w-4 mr-2" />
          {exporting ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="h-4 w-4 mr-2 text-red-500" />
          PDF Report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <Table className="h-4 w-4 mr-2 text-green-500" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <Presentation className="h-4 w-4 mr-2 text-blue-500" />
          CSV Data
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default DashboardExportButton;
