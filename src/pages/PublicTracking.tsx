import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { 
  Package, 
  MapPin,
  Clock,
  CheckCircle,
  Truck,
  Search,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";

const PublicTracking = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const [trackingInput, setTrackingInput] = useState("");
  const [searchToken, setSearchToken] = useState(tokenFromUrl || "");

  // Fetch shipment by token
  const { data: shipment, isLoading } = useQuery({
    queryKey: ["public-tracking", searchToken],
    queryFn: async (): Promise<any> => {
      if (!searchToken) return null;

      // Try dispatch number directly
      const { data, error } = await supabase
        .from("dispatches")
        .select(`
          *,
          customers (company_name),
          delivery_updates (status, created_at, location, notes)
        `)
        .eq("dispatch_number", searchToken)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!searchToken
  });

  const handleSearch = () => {
    setSearchToken(trackingInput);
  };

  const getStatusStep = (status: string) => {
    const steps = ["pending", "assigned", "picked_up", "in_transit", "delivered"];
    return steps.indexOf(status);
  };

  const getStatusIcon = (status: string, currentStatus: string) => {
    const currentStep = getStatusStep(currentStatus);
    const thisStep = getStatusStep(status);
    
    if (thisStep < currentStep) {
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    } else if (thisStep === currentStep) {
      return <Truck className="w-6 h-6 text-primary animate-pulse" />;
    } else {
      return <Clock className="w-6 h-6 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Truck className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-2xl">RouteAce</h1>
              <p className="text-sm text-muted-foreground">Shipment Tracking</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Search Box */}
        <Card className="max-w-2xl mx-auto mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Track Your Shipment</CardTitle>
            <CardDescription>Enter your tracking number or link token</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Enter tracking number (e.g., DSP-20260130-0001)"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="text-lg py-6"
              />
              <Button size="lg" onClick={handleSearch} className="px-8">
                <Search className="w-5 h-5 mr-2" />
                Track
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Searching for shipment...</p>
          </div>
        )}

        {/* Not Found State */}
        {!isLoading && searchToken && !shipment && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">Shipment Not Found</h3>
              <p className="text-muted-foreground">
                We couldn't find a shipment with that tracking number. Please check and try again.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Shipment Details */}
        {shipment && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardDescription>Tracking Number</CardDescription>
                    <CardTitle className="font-mono text-2xl">{shipment.dispatch_number}</CardTitle>
                  </div>
                  <Badge 
                    variant="default" 
                    className="text-lg py-2 px-4 capitalize"
                  >
                    {shipment.status === "delivered" && <CheckCircle className="w-5 h-5 mr-2" />}
                    {shipment.status === "in_transit" && <Truck className="w-5 h-5 mr-2" />}
                    {shipment.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-8 px-4">
                  {["pending", "picked_up", "in_transit", "delivered"].map((step, idx) => (
                    <div key={step} className="flex flex-col items-center">
                      {getStatusIcon(step, shipment.status || "")}
                      <span className="text-xs mt-2 capitalize">{step.replace("_", " ")}</span>
                      {idx < 3 && (
                        <div 
                          className={`absolute w-16 h-0.5 left-1/2 -translate-x-1/2 mt-3
                            ${getStatusStep(shipment.status || "") > idx ? "bg-green-500" : "bg-muted"}`}
                          style={{ marginLeft: "2rem" }}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Route Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">From</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 text-primary mt-0.5" />
                      <p className="font-medium">{shipment.pickup_address}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">To</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 text-green-500 mt-0.5" />
                      <p className="font-medium">{shipment.delivery_address}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tracking History */}
            <Card>
              <CardHeader>
                <CardTitle>Tracking History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shipment.delivery_updates?.sort((a: any, b: any) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  ).map((update: any, idx: number) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        {idx < (shipment.delivery_updates?.length || 0) - 1 && (
                          <div className="w-0.5 h-full bg-border mt-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="font-medium capitalize">{update.status.replace("_", " ")}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(update.created_at), "MMMM d, yyyy 'at' h:mm a")}
                        </p>
                        {update.location && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {update.location}
                          </p>
                        )}
                        {update.notes && (
                          <p className="text-sm mt-1">{update.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Order Created */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Order Created</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(shipment.created_at), "MMMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipment Details */}
            <Card>
              <CardHeader>
                <CardTitle>Shipment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {shipment.cargo_description && (
                    <div>
                      <p className="text-muted-foreground">Description</p>
                      <p className="font-medium">{shipment.cargo_description}</p>
                    </div>
                  )}
                  {shipment.cargo_weight_kg && (
                    <div>
                      <p className="text-muted-foreground">Weight</p>
                      <p className="font-medium">{shipment.cargo_weight_kg} kg</p>
                    </div>
                  )}
                  {shipment.scheduled_delivery && (
                    <div>
                      <p className="text-muted-foreground">Expected Delivery</p>
                      <p className="font-medium">{format(new Date(shipment.scheduled_delivery), "MMMM d, yyyy")}</p>
                    </div>
                  )}
                  {shipment.actual_delivery && (
                    <div>
                      <p className="text-muted-foreground">Delivered</p>
                      <p className="font-medium">{format(new Date(shipment.actual_delivery), "MMMM d, yyyy")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 RouteAce. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicTracking;
