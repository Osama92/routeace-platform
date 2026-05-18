import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, File } from "lucide-react";
import { exportReport, type ExportOptions } from "@/utils/exportReport";
import { useToast } from "@/hooks/use-toast";

interface Props {
  options: Omit<ExportOptions, "filename"> & { filename?: string };
  disabled?: boolean;
}

export default function ExportDropdown({ options, disabled }: Props) {
  const { toast } = useToast();
  const filename = options.filename || options.title.toLowerCase().replace(/\s+/g, "-");

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    if (!options.data.length) {
      toast({ title: "No data to export", description: "There is no data available for the selected period.", variant: "destructive" });
      return;
    }
    exportReport(format, { ...options, filename });
    toast({ title: "Export complete", description: `${options.title} exported as ${format.toUpperCase()}` });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-1.5">
          <Download className="w-4 h-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <File className="w-4 h-4 mr-2" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="w-4 h-4 mr-2" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
