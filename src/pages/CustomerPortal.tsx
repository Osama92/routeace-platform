import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import useWhiteLabel from "@/hooks/useWhiteLabel";
import DeliveryDetailsModal from "@/components/customer/DeliveryDetailsModal";
import CustomerOrderForm from "@/components/customer/CustomerOrderForm";
import DeliveryRatingDialog from "@/components/customer/DeliveryRatingDialog";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import {
  Package, FileText, MapPin, Clock, CheckCircle, Truck, Download,
  Search, LogOut, ChevronRight, Home, ArrowLeft, Plus, QrCode,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import DashboardLayout from "@/components/layout/DashboardLayout";

const CustomerPortal = () => {
  const { user, signOut, userRole } = useAuth();
  const isStaffView = !!userRole && userRole !== "customer";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const wl = useWhiteLabel();
  const wlActive = wl.isEnabled && wl.applyToCustomerPortal;
  const portalBrandName = wlActive ? (wl.brandSuffix ? `${wl.brandName} ${wl.brandSuffix}` : wl.brandName) : "RouteAce";
  const portalLogoUrl = wlActive ? wl.logoUrl : null;
  const portalShowPoweredBy = wlActive && wl.showPoweredBy;
  const [activeTab, setActiveTab] = useState("tracking");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Fetch customer info
  const { data: customerInfo } = useQuery({
    queryKey: ["customer-info", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("customer_users")
        .select(`*, customers (id, company_name, contact_name, email)`)
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch shipments
  const { data: shipments } = useQuery({
    queryKey: ["customer-shipments", customerInfo?.customer_id],
    queryFn: async () => {
      if (!customerInfo?.customer_id) return [];
      const { data, error } = await supabase
        .from("dispatches")
        .select(`*, drivers (full_name, phone), delivery_updates (status, created_at, location)`)
        .eq("customer_id", customerInfo.customer_id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!customerInfo?.customer_id,
  });

  // Fetch invoices
  const { data: invoices } = useQuery({
    queryKey: ["customer-invoices", customerInfo?.customer_id],
    queryFn: async () => {
      if (!customerInfo?.customer_id) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("customer_id", customerInfo.customer_id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!customerInfo?.customer_id,
  });

  // Track specific shipment
  const { data: trackedShipment } = useQuery({
    queryKey: ["track-shipment", trackingNumber],
    queryFn: async () => {
      if (!trackingNumber) return null;
      const { data, error } = await supabase
        .from("dispatches")
        .select(`*, drivers (full_name, phone), delivery_updates (status, created_at, location, notes)`)
        .eq("dispatch_number", trackingNumber)
        .single();
      if (error) return null;
      return data;
    },
    enabled: trackingNumber.length > 5,
  });

  // ─── Exit Portal (proper session termination) ───────────────────────────────
  const handleExitPortal = async () => {
    try {
      await signOut();
      // Clear any cached query state
      queryClient.clear();
      // Redirect to landing / login
      navigate("/access-hub", { replace: true });
      toast({ title: "Signed out", description: "You have been safely logged out of the portal." });
    } catch (err) {
      console.error("Sign out error:", err);
      // Force navigation even if signOut throws
      navigate("/access-hub", { replace: true });
    }
  };

  // ─── Home button (role-aware redirect) ─────────────────────────────────────
  const handleHomeClick = () => {
    // Customers should stay in portal; redirect to root only if session is active
    if (user) {
      navigate("/customer-portal");
    } else {
      navigate("/access-hub", { replace: true });
    }
  };

  // ─── Generate Waybill PDF ───────────────────────────────────────────────────
  const downloadWaybill = async (shipment: any) => {
    setDownloadingId(shipment.id);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const w = 210;
      const margin = 15;

      // Header bar
      doc.setFillColor(31, 120, 110); // brand teal
      doc.rect(0, 0, w, 30, "F");
      doc.setTextColor(240, 255, 250);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("RouteAce - Digital Delivery Waybill", margin, 13);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Secure · Verified · QR-Authenticated", margin, 22);

      // Dispatch number & QR placeholder
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Dispatch: ${shipment.dispatch_number}`, margin, 42);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${format(new Date(), "MMM d, yyyy HH:mm")}`, margin, 50);

      // QR code box (placeholder - integrate real QR lib for prod)
      doc.setDrawColor(200, 200, 200);
      doc.rect(w - margin - 32, 35, 32, 32);
      doc.setFontSize(6);
      doc.setTextColor(150);
      doc.text("QR CODE", w - margin - 24, 53);
      doc.text(shipment.dispatch_number, w - margin - 30, 60);

      // Divider
      doc.setDrawColor(20, 184, 166);
      doc.line(margin, 55, w - margin, 55);

      // Route section
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Route Information", margin, 65);

      const rows = [
        ["Origin", shipment.pickup_address || "-"],
        ["Destination", shipment.delivery_address || "-"],
        ["Status", (shipment.status || "-").toUpperCase()],
        ["Scheduled Delivery", shipment.scheduled_delivery ? format(new Date(shipment.scheduled_delivery), "MMM d, yyyy") : "-"],
        ["Actual Delivery", shipment.actual_delivery ? format(new Date(shipment.actual_delivery), "MMM d, yyyy HH:mm") : "Pending"],
        ["Distance", shipment.distance_km ? `${shipment.distance_km} km` : "-"],
        ["Cargo Description", shipment.cargo_description || "-"],
        ["Cargo Weight", shipment.cargo_weight_kg ? `${shipment.cargo_weight_kg} kg` : "-"],
      ];

      let y = 73;
      doc.setFontSize(9);
      rows.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80);
        doc.text(label, margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.text(String(value).substring(0, 80), 65, y);
        y += 8;
      });

      // Driver section
      y += 4;
      doc.setDrawColor(220);
      doc.line(margin, y, w - margin, y);
      y += 8;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Driver & Vehicle", margin, y);
      y += 8;
      doc.setFontSize(9);
      const driverRows = [
        ["Driver Name", shipment.drivers?.full_name || "Not assigned"],
        ["Driver Phone", shipment.drivers?.phone || "-"],
        ["Vehicle", shipment.vehicle_id || "-"],
      ];
      driverRows.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80);
        doc.text(label, margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.text(String(value), 65, y);
        y += 7;
      });

      // POD Signature box
      y += 8;
      doc.setDrawColor(220);
      doc.line(margin, y, w - margin, y);
      y += 8;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Proof of Delivery (POD)", margin, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text("Recipient Signature:", margin, y);
      doc.setDrawColor(180);
      doc.rect(margin, y + 3, 80, 20);
      doc.text("Date Received:", 110, y);
      doc.rect(110, y + 3, 60, 20);
      y += 30;

      // Footer
      doc.setFillColor(245, 245, 245);
      doc.rect(0, 277, w, 20, "F");
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`RouteAce Logistics Intelligence Platform  ·  Waybill ID: ${shipment.dispatch_number}  ·  routeace.app`, margin, 288);

      doc.save(`waybill-${shipment.dispatch_number}.pdf`);
      toast({ title: "Waybill Downloaded", description: `waybill-${shipment.dispatch_number}.pdf saved.` });
    } catch (err) {
      console.error("PDF error:", err);
      toast({ title: "Download Failed", description: "Could not generate PDF. Please try again.", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "in_transit": return <Truck className="w-4 h-4 text-blue-500" />;
      case "picked_up": return <Package className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case "delivered": return "default";
      case "in_transit": return "default";
      case "picked_up": return "secondary";
      case "pending": return "secondary";
      default: return "secondary";
    }
  };

  const navItems = [
    { id: "tracking", label: "My Shipments", icon: Package },
    { id: "create", label: "New Order", icon: Plus },
    { id: "invoices", label: "Invoices", icon: FileText },
    { id: "history", label: "Delivery History", icon: CheckCircle },
  ];

  const portalBody = (
    <>
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Welcome{customerInfo?.customers?.contact_name ? `, ${customerInfo.customers.contact_name}` : ""}</h2>
              <p className="text-xs text-muted-foreground">Manage your shipments, orders and invoices</p>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-2">
          <nav className="flex items-center gap-2 text-sm">
            <button
              onClick={handleHomeClick}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Home className="w-3 h-3" />
              Home
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <span className="font-medium text-foreground">Customer Portal</span>
            {activeTab !== "tracking" && (
              <>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <span className="capitalize text-muted-foreground">{activeTab}</span>
              </>
            )}
          </nav>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Quick Track */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Track Your Shipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter tracking number (e.g., DSP-20260130-0001)"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="max-w-md"
              />
              <Button>Track</Button>
            </div>

            {trackedShipment && (
              <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-mono text-sm text-muted-foreground">{trackedShipment.dispatch_number}</p>
                    <p className="font-medium text-lg text-foreground">{trackedShipment.cargo_description || "Shipment"}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant={getStatusColor(trackedShipment.status || "")} className="capitalize">
                      {getStatusIcon(trackedShipment.status || "")}
                      <span className="ml-1">{trackedShipment.status}</span>
                    </Badge>
                    {(trackedShipment.status === "delivered" || trackedShipment.status === "closed") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadWaybill(trackedShipment)}
                        disabled={downloadingId === trackedShipment.id}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Waybill PDF
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">From</p>
                    <p className="flex items-center gap-1 text-foreground">
                      <MapPin className="w-3 h-3" />
                      {trackedShipment.pickup_address?.split(",")[0]}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">To</p>
                    <p className="flex items-center gap-1 text-foreground">
                      <MapPin className="w-3 h-3" />
                      {trackedShipment.delivery_address?.split(",")[0]}
                    </p>
                  </div>
                </div>
                {trackedShipment.delivery_updates && trackedShipment.delivery_updates.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="font-medium mb-2 text-foreground">Tracking History</p>
                    <div className="space-y-2">
                      {trackedShipment.delivery_updates.map((update: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <span className="text-muted-foreground">{format(new Date(update.created_at), "MMM d, HH:mm")}</span>
                          <span className="capitalize text-foreground">{update.status}</span>
                          {update.location && <span className="text-muted-foreground">- {update.location}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">

          {/* Create Order */}
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Create New Order</CardTitle>
                <CardDescription>Submit a delivery request to our operations team</CardDescription>
              </CardHeader>
              <CardContent>
                <CustomerOrderForm
                  onOrderCreated={() => {
                    queryClient.invalidateQueries({ queryKey: ["customer-shipments"] });
                    setActiveTab("tracking");
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Shipments */}
          <TabsContent value="tracking">
            <Card>
              <CardHeader>
                <CardTitle>Active Shipments</CardTitle>
                <CardDescription>Track your current and recent deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shipments?.filter(s => s.status !== "delivered").map((shipment) => (
                    <div
                      key={shipment.id}
                      className="p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => { setSelectedDelivery(shipment); setDetailsModalOpen(true); }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(shipment.status || "")}
                          <div>
                            <p className="font-mono text-sm text-foreground">{shipment.dispatch_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {shipment.scheduled_delivery && format(new Date(shipment.scheduled_delivery), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <Badge variant={getStatusColor(shipment.status || "")} className="capitalize">
                          {shipment.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{shipment.pickup_address?.split(",")[0]} → {shipment.delivery_address?.split(",")[0]}</span>
                      </div>
                      {shipment.drivers && (
                        <p className="text-sm mt-2 text-foreground">
                          Driver: <span className="font-medium">{shipment.drivers.full_name}</span>
                        </p>
                      )}
                    </div>
                  ))}
                  {(!shipments || shipments.filter(s => s.status !== "delivered").length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No active shipments</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices */}
          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>View and download your invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices?.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                        <TableCell>{format(new Date(invoice.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell className="font-medium">₦{(invoice.total_amount || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!invoices || invoices.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No invoices found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery History with Waybill Download */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Delivery History</CardTitle>
                <CardDescription>View and download waybills for completed deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking #</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Delivered</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Waybill</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments?.filter(s => s.status === "delivered" || s.status === "closed").map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-mono text-xs">{shipment.dispatch_number}</TableCell>
                        <TableCell className="text-sm">
                          {shipment.pickup_address?.split(",")[0]} → {shipment.delivery_address?.split(",")[0]}
                        </TableCell>
                        <TableCell className="text-sm">
                          {shipment.actual_delivery && format(new Date(shipment.actual_delivery), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Delivered
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadWaybill(shipment)}
                              disabled={downloadingId === shipment.id}
                              className="flex items-center gap-1"
                            >
                              {downloadingId === shipment.id ? (
                                <><span className="w-3 h-3 animate-spin rounded-full border border-muted-foreground border-t-foreground" />Generating…</>
                              ) : (
                                <><Download className="w-3 h-3" />PDF</>
                              )}
                            </Button>
                            {shipment.organization_id && (
                              <DeliveryRatingDialog
                                dispatchId={shipment.id}
                                organizationId={shipment.organization_id}
                                customerEmail={customerInfo?.customers?.email}
                                customerName={customerInfo?.customers?.contact_name}
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!shipments || shipments.filter(s => s.status === "delivered" || s.status === "closed").length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No completed deliveries yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <DeliveryDetailsModal
        dispatch={selectedDelivery}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
      />
    </>
  );

  if (isStaffView) {
    return (
      <DashboardLayout title="Customer Portal" subtitle="Customer-facing experience (read-only preview)">
        {portalBody}
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Customer Portal Sidebar (isolated - no cross-tenant nav) */}
      <aside className="fixed left-0 top-0 h-screen w-[260px] border-r border-border bg-card flex flex-col z-40">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            {portalLogoUrl ? (
              <img src={portalLogoUrl} alt={portalBrandName} className="h-10 max-w-[40px] object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-base text-foreground">{portalBrandName}</h1>
              <p className="text-xs text-muted-foreground">Customer Portal</p>
            </div>
          </div>
          {customerInfo?.customers?.company_name && (
            <div className="mt-3 px-2 py-2 rounded-md bg-muted/50">
              <p className="text-xs font-medium text-foreground truncate">{customerInfo.customers.company_name}</p>
              {customerInfo.customers.contact_name && (
                <p className="text-[10px] text-muted-foreground truncate">{customerInfo.customers.contact_name}</p>
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleExitPortal}>
            <LogOut className="w-4 h-4 mr-2" />
            Exit Portal
          </Button>
          {portalShowPoweredBy && (
            <p className="text-[10px] text-muted-foreground text-center">Powered by RouteAce</p>
          )}
        </div>
      </aside>

      <div className="ml-[260px]">
        {portalBody}
      </div>
    </div>
  );
};

export default CustomerPortal;
