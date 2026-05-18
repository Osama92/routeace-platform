import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, ArrowLeftRight, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const EntityConsolidation = () => {
  const [loading, setLoading] = useState(true);
  const [entities, setEntities] = useState<any[]>([]);
  const [interco, setInterco] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eRes, iRes] = await Promise.all([
        supabase.from("legal_entities").select("*").order("created_at", { ascending: false }),
        supabase.from("intercompany_transactions").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      setEntities(eRes.data || []);
      setInterco(iRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Multi-Entity Consolidation" subtitle="IFRS-compliant group financial consolidation engine">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Legal Entities", value: entities.length, icon: Building2 },
          { label: "Intercompany Txns", value: interco.length, icon: ArrowLeftRight },
          { label: "Countries", value: [...new Set(entities.map(e => e.country))].length, icon: Globe },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="border-border/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><item.icon className="w-4 h-4 text-primary" /></div>
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

      <Tabs defaultValue="entities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="entities">Legal Entities</TabsTrigger>
          <TabsTrigger value="intercompany">Intercompany</TabsTrigger>
        </TabsList>

        <TabsContent value="entities">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Base Currency</TableHead>
                    <TableHead>Consolidation</TableHead>
                    <TableHead>Ownership %</TableHead>
                    <TableHead>Standard</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>
                    ))
                  ) : entities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        No legal entities configured. Add your holding company and subsidiaries to begin consolidation.
                      </TableCell>
                    </TableRow>
                  ) : (
                    entities.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-semibold">{e.entity_name}</TableCell>
                        <TableCell>{e.country}</TableCell>
                        <TableCell>{e.base_currency}</TableCell>
                        <TableCell className="capitalize">{e.consolidation_method}</TableCell>
                        <TableCell>{e.ownership_percentage}%</TableCell>
                        <TableCell>{e.reporting_standard}</TableCell>
                        <TableCell><Badge variant={e.is_active ? "default" : "secondary"}>{e.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intercompany">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Elimination Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>
                    ))
                  ) : interco.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No intercompany transactions recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    interco.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="capitalize">{t.transaction_type}</TableCell>
                        <TableCell className="font-semibold">₦{(t.amount || 0).toLocaleString()}</TableCell>
                        <TableCell>{t.currency}</TableCell>
                        <TableCell>
                          <Badge variant={t.elimination_status === "eliminated" ? "default" : "outline"} className="capitalize">
                            {t.elimination_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
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

export default EntityConsolidation;
