import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import useTenantMode from "@/hooks/useTenantMode";
import {
  Inbox, Search, Globe, Smartphone, FileText, MessageSquare,
  Clock, CheckCircle, XCircle, ArrowRight, Plus, Instagram,
} from "lucide-react";
import { format } from "date-fns";

interface OrderItem {
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
}

const SOURCE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  whatsapp: Smartphone,
  website: Globe,
  google_form: FileText,
  api: Globe,
  manual: FileText,
  instagram: Instagram,
  customer_portal: Globe,
};

const SOURCE_COLORS: Record<string, string> = {
  whatsapp: "bg-green-500/10 text-green-600",
  website: "bg-blue-500/10 text-blue-600",
  api: "bg-purple-500/10 text-purple-600",
  manual: "bg-muted text-foreground",
  instagram: "bg-pink-500/10 text-pink-600",
  customer_portal: "bg-teal-500/10 text-teal-600",
};

/**
 * Multi-source order intake panel for Operations Manager.
 * Shows orders from all channels: Portal, API, WhatsApp, Instagram, Manual.
 */
const OrderIntakeEngine = () => {
  const { toast } = useToast();
  const { isDepartment } = useTenantMode();
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const SOURCES = isDepartment
    ? ["whatsapp", "website", "api", "manual"]
    : ["whatsapp", "website", "api", "manual", "instagram", "customer_portal"];

  const { data: orders, isLoading } = useQuery({
    queryKey: ["order-intake", sourceFilter],
    queryFn: async () => {
      let query = supabase
        .from("order_inbox")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(100);

      if (sourceFilter !== "all") {
        query = query.eq("source_type", sourceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OrderItem[];
    },
  });

  const filtered = orders?.filter((o) =>
    !searchTerm ||
    o.parsed_customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.parsed_pickup_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.parsed_delivery_address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingOrders = filtered?.filter((o) => o.status === "pending") || [];
  const convertedOrders = filtered?.filter((o) => o.status === "converted") || [];
  const rejectedOrders = filtered?.filter((o) => o.status === "rejected") || [];

  const sourceCounts = orders?.reduce((acc, o) => {
    acc[o.source_type] = (acc[o.source_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const getIcon = (src: string) => {
    const Icon = SOURCE_ICONS[src] || Globe;
    return <Icon className="w-4 h-4" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "converted": return <Badge className="bg-green-500/15 text-green-600 border-0"><CheckCircle className="w-3 h-3 mr-1" />Converted</Badge>;
      case "rejected": return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderOrderList = (list: OrderItem[], emptyMsg: string) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      );
    }
    if (!list.length) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{emptyMsg}</p>
        </div>
      );
    }
    return (
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {list.map((order) => (
            <div key={order.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${SOURCE_COLORS[order.source_type] || "bg-muted"}`}>
                    {getIcon(order.source_type)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{order.parsed_customer_name || "Unknown Customer"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {order.parsed_pickup_address?.substring(0, 25)}... → {order.parsed_delivery_address?.substring(0, 25)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {getStatusBadge(order.status)}
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(order.received_at), "MMM d, HH:mm")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="space-y-4">
      {/* Source Channel Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {SOURCES.map((src) => (
          <Card
            key={src}
            className={`cursor-pointer transition-colors ${sourceFilter === src ? "ring-2 ring-primary" : ""}`}
            onClick={() => setSourceFilter(sourceFilter === src ? "all" : src)}
          >
            <CardContent className="p-3 flex items-center gap-2">
              <div className={`p-1.5 rounded ${SOURCE_COLORS[src] || "bg-muted"}`}>
                {getIcon(src)}
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{sourceCounts[src] || 0}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{src.replace("_", " ")}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search orders by customer, pickup, or delivery..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabbed Order Lists */}
      <Card>
        <Tabs defaultValue="pending">
          <CardHeader className="pb-0">
            <TabsList>
              <TabsTrigger value="pending">
                Pending
                {pendingOrders.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{pendingOrders.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="converted">Converted</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            <TabsContent value="pending">{renderOrderList(pendingOrders, "No pending orders")}</TabsContent>
            <TabsContent value="converted">{renderOrderList(convertedOrders, "No converted orders")}</TabsContent>
            <TabsContent value="rejected">{renderOrderList(rejectedOrders, "No rejected orders")}</TabsContent>
            <TabsContent value="all">{renderOrderList(filtered || [], "No orders found")}</TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default OrderIntakeEngine;
