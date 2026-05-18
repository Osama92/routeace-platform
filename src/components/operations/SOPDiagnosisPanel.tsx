 import { useState } from "react";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Progress } from "@/components/ui/progress";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
 } from "@/components/ui/dialog";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { useAuth } from "@/contexts/AuthContext";
 import {
 FileSearch,
 CheckCircle,
 AlertTriangle,
 XCircle,
 RefreshCw,
 Download,
 FileText,
 ListChecks,
 ArrowRight,
 Loader2,
 } from "lucide-react";
 import { format } from "date-fns";
 
 interface OWDReport {
 id: string;
 sop_id: string;
 analysis_date: string;
 overall_status: "valid" | "needs_update" | "critical_blocker";
 missing_steps: any[];
 logic_flow_issues: any[];
 dependency_violations: any[];
 compliance_gaps: any[];
 redundant_tasks: any[];
 step_statuses: any[];
 recommendations: string | null;
 }
 
 interface SOPWithOWD {
 id: string;
 title: string;
 category: string;
 status: string;
 content: string;
 version: string;
 updated_at: string;
 sop_owd_reports: OWDReport[];
 }
 
 /**
  * SOP Diagnosis Panel - Section B
  * Auto-generates Operational Work Diagnosis (OWD) reports for SOPs
  */
 const SOPDiagnosisPanel = () => {
 const { toast } = useToast();
 const { user } = useAuth();
 const queryClient = useQueryClient();
 const [selectedSOP, setSelectedSOP] = useState<SOPWithOWD | null>(null);
 const [analyzing, setAnalyzing] = useState<string | null>(null);
 
 // Fetch SOPs with their OWD reports
 const { data: sops, isLoading } = useQuery({
   queryKey: ["sops-with-owd"],
   queryFn: async () => {
     const { data, error } = await supabase
       .from("ops_sops")
       .select(`
         *,
         sop_owd_reports (*)
       `)
       .order("category", { ascending: true })
       .order("title", { ascending: true });
 
     if (error) throw error;
     return data as SOPWithOWD[];
   },
 });
 
 // Analyze SOP and generate OWD report
 const analyzeMutation = useMutation({
   mutationFn: async (sop: SOPWithOWD) => {
     setAnalyzing(sop.id);
     
     // Parse SOP content and analyze
     const analysis = analyzeSOPContent(sop.content, sop.title);
     
     // Insert the OWD report
     const { error } = await supabase.from("sop_owd_reports").insert({
       sop_id: sop.id,
       overall_status: analysis.overallStatus,
       missing_steps: analysis.missingSteps,
       logic_flow_issues: analysis.logicFlowIssues,
       dependency_violations: analysis.dependencyViolations,
       compliance_gaps: analysis.complianceGaps,
       redundant_tasks: analysis.redundantTasks,
       step_statuses: analysis.stepStatuses,
       recommendations: analysis.recommendations,
       created_by: user?.id,
     });
 
     if (error) throw error;
     return analysis;
   },
   onSuccess: () => {
     queryClient.invalidateQueries({ queryKey: ["sops-with-owd"] });
     toast({ title: "Analysis Complete", description: "OWD report generated successfully" });
     setAnalyzing(null);
   },
   onError: (error: Error) => {
     toast({ title: "Analysis Failed", description: error.message, variant: "destructive" });
     setAnalyzing(null);
   },
 });
 
 // Simple SOP content analysis (in production, this could use AI)
 const analyzeSOPContent = (content: string, title: string) => {
   const lines = content.split("\n").filter(l => l.trim());
   const steps = lines.filter(l => /^\d+[\.\)]\s/.test(l.trim()) || /^step\s*\d/i.test(l.trim()));
   
   const missingSteps: any[] = [];
   const logicFlowIssues: any[] = [];
   const dependencyViolations: any[] = [];
   const complianceGaps: any[] = [];
   const redundantTasks: any[] = [];
   const stepStatuses: any[] = [];
 
   // Check for common issues
   if (steps.length < 3) {
     missingSteps.push({ issue: "Less than 3 steps defined", severity: "warning" });
   }
 
   if (!content.toLowerCase().includes("safety") && !content.toLowerCase().includes("caution")) {
     complianceGaps.push({ issue: "No safety considerations mentioned", severity: "warning" });
   }
 
   if (!content.toLowerCase().includes("verify") && !content.toLowerCase().includes("confirm")) {
     logicFlowIssues.push({ issue: "No verification step found", severity: "info" });
   }
 
   // Check for duplicate content
   const uniqueLines = new Set(lines.map(l => l.toLowerCase().trim()));
   if (uniqueLines.size < lines.length * 0.9) {
     redundantTasks.push({ issue: "Possible duplicate content detected", severity: "info" });
   }
 
   // Generate step statuses
   steps.forEach((step, idx) => {
     stepStatuses.push({
       step: idx + 1,
       content: step.substring(0, 50) + (step.length > 50 ? "..." : ""),
       status: "valid",
     });
   });
 
   // Determine overall status
   let overallStatus: "valid" | "needs_update" | "critical_blocker" = "valid";
   if (missingSteps.length > 0 || complianceGaps.length > 0) {
     overallStatus = "needs_update";
   }
   if (dependencyViolations.length > 0) {
     overallStatus = "critical_blocker";
   }
 
   // Generate recommendations
   const recommendations = [
     missingSteps.length > 0 ? "Consider adding more detailed steps" : null,
     complianceGaps.length > 0 ? "Add safety and compliance considerations" : null,
     logicFlowIssues.length > 0 ? "Include verification checkpoints" : null,
     redundantTasks.length > 0 ? "Review and consolidate duplicate content" : null,
   ].filter(Boolean).join(". ");
 
   return {
     overallStatus,
     missingSteps,
     logicFlowIssues,
     dependencyViolations,
     complianceGaps,
     redundantTasks,
     stepStatuses,
     recommendations: recommendations || "SOP meets all requirements",
   };
 };
 
 const getStatusIcon = (status: string) => {
   switch (status) {
     case "valid": return <CheckCircle className="w-4 h-4 text-green-500" />;
     case "needs_update": return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
     case "critical_blocker": return <XCircle className="w-4 h-4 text-red-500" />;
     default: return <FileSearch className="w-4 h-4 text-muted-foreground" />;
   }
 };
 
 const getStatusBadge = (status: string) => {
   switch (status) {
     case "valid": return <Badge className="bg-green-500/15 text-green-600">Valid</Badge>;
     case "needs_update": return <Badge className="bg-yellow-500/15 text-yellow-600">Needs Update</Badge>;
     case "critical_blocker": return <Badge className="bg-red-500/15 text-red-600">Critical Blocker</Badge>;
     default: return <Badge variant="secondary">Not Analyzed</Badge>;
   }
 };
 
 const latestOWD = (sop: SOPWithOWD) => {
   if (!sop.sop_owd_reports?.length) return null;
   return sop.sop_owd_reports.sort((a, b) => 
     new Date(b.analysis_date).getTime() - new Date(a.analysis_date).getTime()
   )[0];
 };
 
 const exportPDF = (sop: SOPWithOWD) => {
   const owd = latestOWD(sop);
   if (!owd) return;
   
   // Simple text export (in production, use jsPDF)
   const content = `
 OWD REPORT - ${sop.title}
 Generated: ${format(new Date(owd.analysis_date), "PPP")}
 Status: ${owd.overall_status}
 
 MISSING STEPS: ${owd.missing_steps.length}
 LOGIC FLOW ISSUES: ${owd.logic_flow_issues.length}
 DEPENDENCY VIOLATIONS: ${owd.dependency_violations.length}
 COMPLIANCE GAPS: ${owd.compliance_gaps.length}
 REDUNDANT TASKS: ${owd.redundant_tasks.length}
 
 RECOMMENDATIONS:
 ${owd.recommendations || "None"}
   `.trim();
   
   const blob = new Blob([content], { type: "text/plain" });
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = `OWD-${sop.title.replace(/\s+/g, "-")}.txt`;
   a.click();
   URL.revokeObjectURL(url);
   
   toast({ title: "Exported", description: "OWD report downloaded" });
 };
 
 if (isLoading) {
   return (
     <Card>
       <CardContent className="flex items-center justify-center py-12">
         <Loader2 className="w-6 h-6 animate-spin text-primary" />
       </CardContent>
     </Card>
   );
 }
 
 return (
   <div className="space-y-6">
     <div className="flex items-center justify-between">
       <div>
         <h3 className="text-lg font-heading font-semibold flex items-center gap-2">
           <FileSearch className="w-5 h-5 text-primary" />
           Operational Work Diagnosis (OWD)
         </h3>
         <p className="text-sm text-muted-foreground">
           Automated SOP analysis and compliance checking
         </p>
       </div>
       <Button
         variant="outline"
         onClick={() => {
           sops?.forEach(sop => {
             if (!analyzing) analyzeMutation.mutate(sop);
           });
         }}
         disabled={!!analyzing}
       >
         <RefreshCw className={`w-4 h-4 mr-2 ${analyzing ? "animate-spin" : ""}`} />
         Analyze All
       </Button>
     </div>
 
     {/* Summary Cards */}
     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
       <Card>
         <CardContent className="p-4">
           <div className="flex items-center gap-3">
             <CheckCircle className="w-5 h-5 text-green-500" />
             <div>
               <p className="text-2xl font-bold">
                 {sops?.filter(s => latestOWD(s)?.overall_status === "valid").length || 0}
               </p>
               <p className="text-xs text-muted-foreground">Valid SOPs</p>
             </div>
           </div>
         </CardContent>
       </Card>
       <Card>
         <CardContent className="p-4">
           <div className="flex items-center gap-3">
             <AlertTriangle className="w-5 h-5 text-yellow-500" />
             <div>
               <p className="text-2xl font-bold">
                 {sops?.filter(s => latestOWD(s)?.overall_status === "needs_update").length || 0}
               </p>
               <p className="text-xs text-muted-foreground">Needs Update</p>
             </div>
           </div>
         </CardContent>
       </Card>
       <Card>
         <CardContent className="p-4">
           <div className="flex items-center gap-3">
             <XCircle className="w-5 h-5 text-red-500" />
             <div>
               <p className="text-2xl font-bold">
                 {sops?.filter(s => latestOWD(s)?.overall_status === "critical_blocker").length || 0}
               </p>
               <p className="text-xs text-muted-foreground">Critical Blockers</p>
             </div>
           </div>
         </CardContent>
       </Card>
       <Card>
         <CardContent className="p-4">
           <div className="flex items-center gap-3">
             <FileText className="w-5 h-5 text-muted-foreground" />
             <div>
               <p className="text-2xl font-bold">
                 {sops?.filter(s => !latestOWD(s)).length || 0}
               </p>
               <p className="text-xs text-muted-foreground">Not Analyzed</p>
             </div>
           </div>
         </CardContent>
       </Card>
     </div>
 
     {/* SOP List with OWD Status */}
     <Card>
       <CardHeader>
         <CardTitle className="text-sm">SOP Diagnosis Results</CardTitle>
         <CardDescription>Click on any SOP to view detailed analysis</CardDescription>
       </CardHeader>
       <CardContent>
         <ScrollArea className="h-96">
           <div className="space-y-2">
             {sops?.map((sop) => {
               const owd = latestOWD(sop);
               const issueCount = owd ? (
                 owd.missing_steps.length + 
                 owd.logic_flow_issues.length + 
                 owd.dependency_violations.length + 
                 owd.compliance_gaps.length + 
                 owd.redundant_tasks.length
               ) : 0;
 
               return (
                 <div
                   key={sop.id}
                   className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                   onClick={() => setSelectedSOP(sop)}
                 >
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       {getStatusIcon(owd?.overall_status || "")}
                       <div>
                         <p className="font-medium">{sop.title}</p>
                         <p className="text-xs text-muted-foreground">
                           {sop.category} • v{sop.version}
                         </p>
                       </div>
                     </div>
                     <div className="flex items-center gap-2">
                       {owd && (
                         <>
                           {getStatusBadge(owd.overall_status)}
                           {issueCount > 0 && (
                             <Badge variant="outline">{issueCount} issues</Badge>
                           )}
                         </>
                       )}
                       {!owd && (
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={(e) => {
                             e.stopPropagation();
                             analyzeMutation.mutate(sop);
                           }}
                           disabled={analyzing === sop.id}
                         >
                           {analyzing === sop.id ? (
                             <Loader2 className="w-3 h-3 animate-spin" />
                           ) : (
                             <>Analyze</>
                           )}
                         </Button>
                       )}
                       <ArrowRight className="w-4 h-4 text-muted-foreground" />
                     </div>
                   </div>
                 </div>
               );
             })}
           </div>
         </ScrollArea>
       </CardContent>
     </Card>
 
     {/* Detail Dialog */}
     <Dialog open={!!selectedSOP} onOpenChange={() => setSelectedSOP(null)}>
       <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <ListChecks className="w-5 h-5" />
             OWD Report: {selectedSOP?.title}
           </DialogTitle>
           <DialogDescription>
             {selectedSOP && latestOWD(selectedSOP) && (
               <>Analyzed on {format(new Date(latestOWD(selectedSOP)!.analysis_date), "PPP")}</>
             )}
           </DialogDescription>
         </DialogHeader>
 
         {selectedSOP && latestOWD(selectedSOP) && (
           <div className="space-y-4">
             {/* Status */}
             <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
               <div className="flex items-center gap-3">
                 {getStatusIcon(latestOWD(selectedSOP)!.overall_status)}
                 <span className="font-medium">Overall Status</span>
               </div>
               {getStatusBadge(latestOWD(selectedSOP)!.overall_status)}
             </div>
 
             {/* Issue Categories */}
             <div className="grid grid-cols-2 gap-3">
               {[
                 { label: "Missing Steps", data: latestOWD(selectedSOP)!.missing_steps, color: "text-red-500" },
                 { label: "Logic Flow Issues", data: latestOWD(selectedSOP)!.logic_flow_issues, color: "text-yellow-500" },
                 { label: "Dependency Violations", data: latestOWD(selectedSOP)!.dependency_violations, color: "text-red-600" },
                 { label: "Compliance Gaps", data: latestOWD(selectedSOP)!.compliance_gaps, color: "text-orange-500" },
                 { label: "Redundant Tasks", data: latestOWD(selectedSOP)!.redundant_tasks, color: "text-blue-500" },
               ].map((cat) => (
                 <div key={cat.label} className="p-3 rounded-lg bg-secondary/30 border">
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-sm font-medium">{cat.label}</span>
                     <Badge variant={cat.data.length > 0 ? "destructive" : "secondary"}>
                       {cat.data.length}
                     </Badge>
                   </div>
                   {cat.data.length > 0 && (
                     <div className="space-y-1">
                       {cat.data.slice(0, 3).map((issue: any, idx: number) => (
                         <p key={idx} className="text-xs text-muted-foreground">
                           • {issue.issue}
                         </p>
                       ))}
                     </div>
                   )}
                 </div>
               ))}
             </div>
 
             {/* Recommendations */}
             {latestOWD(selectedSOP)!.recommendations && (
               <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                 <p className="text-sm font-medium mb-2">Recommendations</p>
                 <p className="text-sm text-muted-foreground">
                   {latestOWD(selectedSOP)!.recommendations}
                 </p>
               </div>
             )}
 
             {/* Actions */}
             <div className="flex justify-end gap-2 pt-4 border-t">
               <Button
                 variant="outline"
                 onClick={() => exportPDF(selectedSOP)}
               >
                 <Download className="w-4 h-4 mr-2" />
                 Export PDF
               </Button>
               <Button
                 onClick={() => {
                   analyzeMutation.mutate(selectedSOP);
                 }}
                 disabled={!!analyzing}
               >
                 <RefreshCw className={`w-4 h-4 mr-2 ${analyzing ? "animate-spin" : ""}`} />
                 Re-Analyze
               </Button>
             </div>
           </div>
         )}
 
         {selectedSOP && !latestOWD(selectedSOP) && (
           <div className="text-center py-8">
             <FileSearch className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
             <p className="text-muted-foreground mb-4">This SOP has not been analyzed yet</p>
             <Button onClick={() => analyzeMutation.mutate(selectedSOP)} disabled={!!analyzing}>
               {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
               Run Analysis
             </Button>
           </div>
         )}
       </DialogContent>
     </Dialog>
   </div>
 );
 };
 
 export default SOPDiagnosisPanel;