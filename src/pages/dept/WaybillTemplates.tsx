import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Upload, Star, Trash2, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const FORMAT_FROM_EXT: Record<string, string> = {
  pdf: "pdf", jpg: "jpg", jpeg: "jpg", png: "png",
  xlsx: "xlsx", xls: "xlsx", docx: "docx", doc: "docx",
};

export default function WaybillTemplates() {
  const { organizationId, user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data } = await supabase
      .from("waybill_templates" as any)
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    setTemplates((data ?? []) as any[]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [organizationId]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !organizationId || !user) {
      toast.error("Pick a file first");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const format = FORMAT_FROM_EXT[ext];
    if (!format) {
      toast.error("Unsupported file. Use PDF, JPG, PNG, XLSX or DOCX.");
      return;
    }
    setUploading(true);
    try {
      const path = `${organizationId}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("waybill-templates").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const ins = await supabase.from("waybill_templates" as any).insert({
        organization_id: organizationId,
        name: name || file.name,
        format,
        file_path: path,
        uploaded_by: user.id,
      } as any);
      if (ins.error) throw ins.error;
      toast.success("Template uploaded");
      setName("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const setDefault = async (id: string) => {
    if (!organizationId) return;
    await supabase.from("waybill_templates" as any).update({ is_default: false }).eq("organization_id", organizationId);
    const { error } = await supabase.from("waybill_templates" as any).update({ is_default: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Default template updated");
    load();
  };

  const remove = async (t: any) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    await supabase.storage.from("waybill-templates").remove([t.file_path]);
    const { error } = await supabase.from("waybill_templates" as any).delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Template deleted");
    load();
  };

  const download = async (t: any) => {
    const { data, error } = await supabase.storage.from("waybill-templates").createSignedUrl(t.file_path, 60);
    if (error || !data?.signedUrl) return toast.error("Could not get download link");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <DashboardLayout title="Waybill Templates">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><FileText className="h-7 w-7" />Waybill Templates</h1>
          <p className="text-muted-foreground">Upload your own waybill designs (JPG, PNG, PDF, Excel, Word). The default template will be used by the Waybill Engine.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Upload New Template</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Template name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Branded NG Waybill v2" />
              </div>
              <div>
                <Label>File (PDF / JPG / PNG / XLSX / DOCX)</Label>
                <Input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.docx,.doc" />
              </div>
            </div>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saved Templates</CardTitle>
            <CardDescription>The starred template is used by default in the Waybill Engine.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Name</TableHead><TableHead>Format</TableHead><TableHead>Default</TableHead><TableHead>Uploaded</TableHead><TableHead></TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline" /></TableCell></TableRow>
                ) : templates.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No templates yet. Upload your first one above.</TableCell></TableRow>
                ) : templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell><Badge variant="outline" className="uppercase">{t.format}</Badge></TableCell>
                    <TableCell>{t.is_default ? <Badge>Default</Badge> : "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => download(t)}><Download className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setDefault(t.id)} disabled={t.is_default}><Star className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(t)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
