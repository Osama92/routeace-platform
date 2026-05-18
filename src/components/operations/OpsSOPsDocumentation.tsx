import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import usePermissions from "@/hooks/usePermissions";
import { FileText, Plus, Book, CheckCircle, Clock, Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface SOP {
  id: string;
  title: string;
  category: string;
  content: string;
  version: string;
  status: "draft" | "active" | "archived";
  created_by: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  "Loading Procedures",
  "Delivery Protocols",
  "Safety Guidelines",
  "Vehicle Maintenance",
  "Emergency Response",
  "Customer Service",
  "Documentation",
  "Fuel Management",
];

const OpsSOPsDocumentation = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOpsManager, isSuperAdmin, isOrgAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSOP, setEditingSOP] = useState<SOP | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "archived">("draft");

  const canEdit = isOpsManager || isSuperAdmin;
  const canView = isOpsManager || isSuperAdmin || isOrgAdmin;

  // Fetch SOPs
  const { data: sops, isLoading } = useQuery({
    queryKey: ["ops-sops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_sops")
        .select("*")
        .order("category", { ascending: true })
        .order("title", { ascending: true });

      if (error) throw error;
      return data as SOP[];
    },
    enabled: canView,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (isEdit: boolean) => {
      const version = isEdit && editingSOP 
        ? `${parseFloat(editingSOP.version) + 0.1}`.slice(0, 3)
        : "1.0";

      const payload = {
        title,
        category,
        content,
        status,
        version,
        created_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      if (isEdit && editingSOP) {
        const { error } = await supabase
          .from("ops_sops")
          .update(payload)
          .eq("id", editingSOP.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ops_sops").insert({
          ...payload,
          created_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops-sops"] });
      toast({ title: "Success", description: editingSOP ? "SOP updated" : "SOP created" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ops_sops").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops-sops"] });
      toast({ title: "Success", description: "SOP deleted" });
    },
  });

  const handleOpenDialog = (sop?: SOP) => {
    if (sop) {
      setEditingSOP(sop);
      setTitle(sop.title);
      setCategory(sop.category);
      setContent(sop.content);
      setStatus(sop.status);
    } else {
      setEditingSOP(null);
      setTitle("");
      setCategory("");
      setContent("");
      setStatus("draft");
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSOP(null);
  };

  const filteredSOPs = sops?.filter(
    (sop) =>
      sop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sop.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sop.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by category
  const groupedSOPs = filteredSOPs?.reduce((acc, sop) => {
    if (!acc[sop.category]) acc[sop.category] = [];
    acc[sop.category].push(sop);
    return acc;
  }, {} as Record<string, SOP[]>);

  if (!canView) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">You don't have permission to view SOPs</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-heading font-semibold flex items-center gap-2">
            <Book className="w-5 h-5 text-primary" />
            Operations SOPs
          </h3>
          <p className="text-sm text-muted-foreground">
            Standard Operating Procedures for logistics operations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search SOPs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          {canEdit && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add SOP
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{sops?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total SOPs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-success" />
              <div>
                <p className="text-2xl font-bold">{sops?.filter(s => s.status === "active").length || 0}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-warning" />
              <div>
                <p className="text-2xl font-bold">{sops?.filter(s => s.status === "draft").length || 0}</p>
                <p className="text-xs text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Book className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{Object.keys(groupedSOPs || {}).length}</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SOPs by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">SOP Documentation</CardTitle>
          <CardDescription>Organized by operational category</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : Object.keys(groupedSOPs || {}).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No SOPs found. {canEdit && "Create your first SOP to get started."}
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {Object.entries(groupedSOPs || {}).map(([category, categorySOPs]) => (
                <AccordionItem key={category} value={category} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="font-medium">{category}</span>
                      <Badge variant="secondary">{categorySOPs.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {categorySOPs.map((sop) => (
                        <div
                          key={sop.id}
                          className="p-4 rounded-lg bg-secondary/30 border border-border/50"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium">{sop.title}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={sop.status === "active" ? "default" : "secondary"}>
                                  {sop.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">v{sop.version}</span>
                                <span className="text-xs text-muted-foreground">
                                  Updated {format(new Date(sop.updated_at), "MMM d, yyyy")}
                                </span>
                              </div>
                            </div>
                            {canEdit && (
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(sop)}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteMutation.mutate(sop.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {sop.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSOP ? "Edit SOP" : "Create New SOP"}</DialogTitle>
            <DialogDescription>
              Document standard operating procedures for your team
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="SOP title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                placeholder="Write the SOP content here. Use numbered steps for procedures..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate(!!editingSOP)}
              disabled={!title || !category || !content}
            >
              {editingSOP ? "Update SOP" : "Create SOP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OpsSOPsDocumentation;
