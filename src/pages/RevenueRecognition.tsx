import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Clock, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const RevenueRecognition = () => {
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<any[]>([]);
  const [deferred, setDeferred] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, dRes] = await Promise.all([
        supabase.from("revenue_contracts").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("deferred_revenue_ledger").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      setContracts(cRes.data || []);
      setDeferred(dRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v: number) => `₦${v.toLocaleString()}`;

  const totalContractValue = contracts.reduce((s, c) => s + (c.total_contract_value || 0), 0);
  const totalDeferred = deferred.reduce((s, d) => s + (d.remaining_deferred || 0), 0);
  const totalRecognized = deferred.reduce((s, d) => s + (d.revenue_recognized || 0), 0);

  return (
    <DashboardLayout title="Revenue Recognition" subtitle="IFRS 15 compliant revenue recognition engine">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Contract Value", value: formatCurrency(totalContractValue), icon: FileText },
          { label: "Revenue Recognized", value: formatCurrency(totalRecognized), icon: CheckCircle },
          { label: "Deferred Revenue", value: formatCurrency(totalDeferred), icon: Clock },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="border-border/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-heading">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="contracts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contracts">Revenue Contracts</TabsTrigger>
          <TabsTrigger value="deferred">Deferred Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Recognition Method</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : contracts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        No revenue contracts yet. Contracts are auto-created from freight and subscription activity.
                      </TableCell>
                    </TableRow>
                  ) : (
                    contracts.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="capitalize">{c.contract_type}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(c.total_contract_value)}</TableCell>
                        <TableCell>{c.currency}</TableCell>
                        <TableCell className="capitalize">{c.revenue_recognition_method?.replace("_", " ")}</TableCell>
                        <TableCell>{c.country}</TableCell>
                        <TableCell>
                          <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(c.start_date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deferred">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount Received</TableHead>
                    <TableHead>Recognized</TableHead>
                    <TableHead>Remaining Deferred</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 4 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : deferred.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        No deferred revenue entries yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    deferred.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-semibold">{formatCurrency(d.amount_received)}</TableCell>
                        <TableCell>{formatCurrency(d.revenue_recognized)}</TableCell>
                        <TableCell className="font-semibold text-amber-500">{formatCurrency(d.remaining_deferred)}</TableCell>
                        <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default RevenueRecognition;
