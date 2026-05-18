 import { useState } from "react";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Input } from "@/components/ui/input";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
 } from "@/components/ui/dialog";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { useAuth } from "@/contexts/AuthContext";
 import {
 Inbox,
 MessageSquare,
 Globe,
 Smartphone,
 FileText,
 CheckCircle,
 XCircle,
 Clock,
 ArrowRight,
 RefreshCw,
 Plus,
 TrendingUp,
 Search,
 } from "lucide-react";
 import { format } from "date-fns";
 
 interface InboxOrder {
 id: string;
 source_type: string;
 source_channel: string | null;
 parsed_customer_name: string | null;
 parsed_pickup_address: string | null;
 parsed_delivery_address: string | null;
 parsed_contact_phone: string | null;
 parsed_contact_email: string | null;
 parsed_cargo_description: string | null;
 status: string;
 received_at: string;
 raw_data: any;
 }
 
 interface SourceAnalytics {
 id: string;
 source_type: string;
 period_date: string;
 orders_received: number;
 orders_converted: number;
 conversion_rate: number;
 }
 
 const SOURCE_ICONS: Record<string, any> = {
 whatsapp: Smartphone,
 website: Globe,
 google_form: FileText,
 wordpress: Globe,
 api: Globe,
 landing_page: Globe,
 };
 
 /**
  * Order Inbox Panel - Sections K & L
  * Multi-channel order ingestion and management
  */
 const OrderInboxPanel = () => {
 const { toast } = useToast();
 const { user } = useAuth();
 const queryClient = useQueryClient();
 const [searchTerm, setSearchTerm] = useState("");
 const [selectedOrder, setSelectedOrder] = useState<InboxOrder | null>(null);
 const [activeTab, setActiveTab] = useState("pending");
 
 // Fetch inbox orders
 const { data: orders, isLoading } = useQuery({
   queryKey: ["order-inbox", activeTab],
   queryFn: async () => {
     let query = supabase
       .from("order_inbox")
       .select("*")
       .order("received_at", { ascending: false })
       .limit(100);
 
     if (activeTab !== "all") {
       query = query.eq("status", activeTab);
     }
 
     const { data, error } = await query;
     if (error) throw error;
     return data as InboxOrder[];
   },
 });
 
 // Fetch source analytics
 const { data: analytics } = useQuery({
   queryKey: ["order-source-analytics"],
   queryFn: async () => {
     const { data, error } = await supabase
       .from("order_source_analytics")
       .select("*")
       .order("period_date", { ascending: false })
       .limit(30);
 
     if (error) throw error;
     return data as SourceAnalytics[];
   },
 });
 
 // Convert order to dispatch
 const convertMutation = useMutation({
   mutationFn: async (order: InboxOrder) => {
     // First, create or find customer
     let customerId: string | null = null;
     
     if (order.parsed_customer_name) {
       const { data: existingCustomer } = await supabase
         .from("customers")
         .select("id")
         .eq("company_name", order.parsed_customer_name)
         .single();
 
       if (existingCustomer) {
         customerId = existingCustomer.id;
       } else {
         const { data: newCustomer, error } = await supabase
           .from("customers")
           .insert({
             company_name: order.parsed_customer_name,
             contact_name: order.parsed_customer_name,
             email: order.parsed_contact_email || `${Date.now()}@placeholder.com`,
             phone: order.parsed_contact_phone || "N/A",
           })
           .select()
           .single();
 
         if (error) throw error;
         customerId = newCustomer.id;
       }
     }
 
     if (!customerId) throw new Error("Could not create customer");
 
     // Create dispatch
     const dispatchNumber = `DSP-${format(new Date(), "yyyyMMdd")}-${crypto.randomUUID().replace(/-/g, "").substring(0, 4).toUpperCase()}`;
     
     const { data: dispatch, error: dispatchError } = await supabase
       .from("dispatches")
       .insert({
         dispatch_number: dispatchNumber,
         customer_id: customerId,
         pickup_address: order.parsed_pickup_address || "TBD",
         delivery_address: order.parsed_delivery_address || "TBD",
         cargo_description: order.parsed_cargo_description,
         status: "pending",
         created_by: user?.id,
       })
       .select()
       .single();
 
     if (dispatchError) throw dispatchError;
 
     // Update order inbox status
     const { error: updateError } = await supabase
       .from("order_inbox")
       .update({
         status: "converted",
         converted_dispatch_id: dispatch.id,
         converted_customer_id: customerId,
         processed_by: user?.id,
         processed_at: new Date().toISOString(),
       })
       .eq("id", order.id);
 
     if (updateError) throw updateError;
 
     return dispatch;
   },
   onSuccess: () => {
     queryClient.invalidateQueries({ queryKey: ["order-inbox"] });
     toast({ title: "Success", description: "Order converted to dispatch" });
     setSelectedOrder(null);
   },
   onError: (error: Error) => {
     toast({ title: "Error", description: error.message, variant: "destructive" });
   },
 });
 
 // Reject order
 const rejectMutation = useMutation({
   mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
     const { error } = await supabase
       .from("order_inbox")
       .update({
         status: "rejected",
         rejection_reason: reason,
         processed_by: user?.id,
         processed_at: new Date().toISOString(),
       })
       .eq("id", orderId);
 
     if (error) throw error;
   },
   onSuccess: () => {
     queryClient.invalidateQueries({ queryKey: ["order-inbox"] });
     toast({ title: "Order Rejected" });
     setSelectedOrder(null);
   },
 });
 
 const getSourceIcon = (sourceType: string) => {
   const Icon = SOURCE_ICONS[sourceType] || Globe;
   return <Icon className="w-4 h-4" />;
 };
 
 const getStatusBadge = (status: string) => {
   switch (status) {
     case "pending": return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
     case "converted": return <Badge className="bg-green-500/15 text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Converted</Badge>;
     case "rejected": return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
     case "processing": return <Badge className="bg-blue-500/15 text-blue-600">Processing</Badge>;
     default: return <Badge variant="secondary">{status}</Badge>;
   }
 };
 
 // Calculate analytics summaries
 const channelStats = orders?.reduce((acc, o) => {
   acc[o.source_type] = (acc[o.source_type] || 0) + 1;
   return acc;
 }, {} as Record<string, number>) || {};
 
 const filteredOrders = orders?.filter(o => 
   !searchTerm || 
   o.parsed_customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
   o.parsed_pickup_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
   o.parsed_delivery_address?.toLowerCase().includes(searchTerm.toLowerCase())
 );
 
 const pendingCount = orders?.filter(o => o.status === "pending").length || 0;
 
 return (
   <div className="space-y-6">
     <div className="flex items-center justify-between">
       <div>
         <h3 className="text-lg font-heading font-semibold flex items-center gap-2">
           <Inbox className="w-5 h-5 text-primary" />
           Order Inbox
         </h3>
         <p className="text-sm text-muted-foreground">
           Multi-channel order ingestion from websites, WhatsApp, and APIs
         </p>
       </div>
       <div className="flex items-center gap-2">
         <div className="relative">
           <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
           <Input
             placeholder="Search orders..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="pl-9 w-64"
           />
         </div>
         <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["order-inbox"] })}>
           <RefreshCw className="w-4 h-4" />
         </Button>
       </div>
     </div>
 
     {/* Channel Stats */}
     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
       {Object.entries(channelStats).map(([channel, count]) => (
         <Card key={channel}>
           <CardContent className="p-3">
             <div className="flex items-center gap-2">
               {getSourceIcon(channel)}
               <div>
                 <p className="text-lg font-bold">{count}</p>
                 <p className="text-xs text-muted-foreground capitalize">{channel.replace("_", " ")}</p>
               </div>
             </div>
           </CardContent>
         </Card>
       ))}
       {pendingCount > 0 && (
         <Card className="border-yellow-500/30 bg-yellow-500/5">
           <CardContent className="p-3">
             <div className="flex items-center gap-2">
               <Clock className="w-4 h-4 text-yellow-500" />
               <div>
                 <p className="text-lg font-bold text-yellow-600">{pendingCount}</p>
                 <p className="text-xs text-muted-foreground">Pending</p>
               </div>
             </div>
           </CardContent>
         </Card>
       )}
     </div>
 
     {/* Orders List */}
     <Card>
       <CardHeader>
         <Tabs value={activeTab} onValueChange={setActiveTab}>
           <TabsList>
             <TabsTrigger value="pending">Pending</TabsTrigger>
             <TabsTrigger value="converted">Converted</TabsTrigger>
             <TabsTrigger value="rejected">Rejected</TabsTrigger>
             <TabsTrigger value="all">All</TabsTrigger>
           </TabsList>
         </Tabs>
       </CardHeader>
       <CardContent>
         {isLoading ? (
           <div className="flex items-center justify-center py-12">
             <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
           </div>
         ) : (
           <ScrollArea className="h-96">
             <div className="space-y-2">
               {filteredOrders?.map((order) => (
                 <div
                   key={order.id}
                   className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                   onClick={() => setSelectedOrder(order)}
                 >
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-lg ${
                         order.source_type === "whatsapp" ? "bg-green-500/10" : "bg-blue-500/10"
                       }`}>
                         {getSourceIcon(order.source_type)}
                       </div>
                       <div>
                         <p className="font-medium">{order.parsed_customer_name || "Unknown Customer"}</p>
                         <p className="text-sm text-muted-foreground">
                           {order.parsed_pickup_address?.substring(0, 30)}... → {order.parsed_delivery_address?.substring(0, 30)}...
                         </p>
                       </div>
                     </div>
                     <div className="flex items-center gap-3">
                       {getStatusBadge(order.status)}
                       <span className="text-xs text-muted-foreground">
                         {format(new Date(order.received_at), "MMM d, HH:mm")}
                       </span>
                       <ArrowRight className="w-4 h-4 text-muted-foreground" />
                     </div>
                   </div>
                 </div>
               ))}
               {(!filteredOrders || filteredOrders.length === 0) && (
                 <div className="text-center py-12 text-muted-foreground">
                   <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
                   <p>No orders in this category</p>
                 </div>
               )}
             </div>
           </ScrollArea>
         )}
       </CardContent>
     </Card>
 
     {/* Order Detail Dialog */}
     <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
       <DialogContent className="max-w-lg">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             {selectedOrder && getSourceIcon(selectedOrder.source_type)}
             Order Details
           </DialogTitle>
           <DialogDescription>
             Received {selectedOrder && format(new Date(selectedOrder.received_at), "PPp")}
           </DialogDescription>
         </DialogHeader>
 
         {selectedOrder && (
           <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <p className="text-xs text-muted-foreground">Customer</p>
                 <p className="font-medium">{selectedOrder.parsed_customer_name || "-"}</p>
               </div>
               <div>
                 <p className="text-xs text-muted-foreground">Contact</p>
                 <p className="font-medium">{selectedOrder.parsed_contact_phone || selectedOrder.parsed_contact_email || "-"}</p>
               </div>
             </div>
             
             <div>
               <p className="text-xs text-muted-foreground">Pickup</p>
               <p className="text-sm">{selectedOrder.parsed_pickup_address || "-"}</p>
             </div>
             
             <div>
               <p className="text-xs text-muted-foreground">Delivery</p>
               <p className="text-sm">{selectedOrder.parsed_delivery_address || "-"}</p>
             </div>
 
             <div>
               <p className="text-xs text-muted-foreground">Cargo</p>
               <p className="text-sm">{selectedOrder.parsed_cargo_description || "-"}</p>
             </div>
 
             <div className="flex items-center gap-2">
               <span className="text-xs text-muted-foreground">Status:</span>
               {getStatusBadge(selectedOrder.status)}
             </div>
           </div>
         )}
 
         {selectedOrder?.status === "pending" && (
           <DialogFooter className="gap-2">
             <Button
               variant="outline"
               onClick={() => rejectMutation.mutate({ orderId: selectedOrder.id, reason: "Manual rejection" })}
             >
               <XCircle className="w-4 h-4 mr-2" />
               Reject
             </Button>
             <Button onClick={() => convertMutation.mutate(selectedOrder)}>
               <CheckCircle className="w-4 h-4 mr-2" />
               Convert to Dispatch
             </Button>
           </DialogFooter>
         )}
       </DialogContent>
     </Dialog>
   </div>
 );
 };
 
 export default OrderInboxPanel;