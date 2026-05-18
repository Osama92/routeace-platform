import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  MapPin,
  Phone,
  User,
  Camera,
  Shield,
  CreditCard,
  FileText,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

interface DropoffPoint {
  address: string;
  lat?: number;
  lng?: number;
  contactName: string;
  contactPhone: string;
  notes: string;
}

interface OrderFormData {
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  pickupContactName: string;
  pickupContactPhone: string;
  cargoDescription: string;
  cargoWeightKg: string;
  estimatedValue: string;
  dropoffs: DropoffPoint[];
  specialInstructions: string;
}

interface DriverVerification {
  driverPlateNumber: string;
  driverNIN: string;
  driverPhotoUrl: string;
}

const BASE_FEE_PER_KM = 150; // Naira per km - would come from company settings

const CustomerOrderForm = ({ onOrderCreated }: { onOrderCreated?: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"details" | "verification" | "payment" | "terms" | "complete">("details");
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [formData, setFormData] = useState<OrderFormData>({
    pickupAddress: "",
    pickupContactName: "",
    pickupContactPhone: "",
    cargoDescription: "",
    cargoWeightKg: "",
    estimatedValue: "",
    dropoffs: [{ address: "", contactName: "", contactPhone: "", notes: "" }],
    specialInstructions: "",
  });

  const [driverVerification, setDriverVerification] = useState<DriverVerification>({
    driverPlateNumber: "",
    driverNIN: "",
    driverPhotoUrl: "",
  });

  // Fetch customer info
  const { data: customerInfo } = useQuery({
    queryKey: ["customer-info", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("customer_users")
        .select(`*, customers (id, company_name, contact_name, email, phone)`)
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Fetch company terms
  const { data: companySettings } = useQuery({
    queryKey: ["company-settings-terms"],
    queryFn: async () => {
      const { data } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .single();
      return data;
    },
  });

  const addDropoff = () => {
    setFormData((prev) => ({
      ...prev,
      dropoffs: [...prev.dropoffs, { address: "", contactName: "", contactPhone: "", notes: "" }],
    }));
  };

  const removeDropoff = (index: number) => {
    if (formData.dropoffs.length > 1) {
      setFormData((prev) => ({
        ...prev,
        dropoffs: prev.dropoffs.filter((_, i) => i !== index),
      }));
    }
  };

  const updateDropoff = (index: number, field: keyof DropoffPoint, value: string | number | undefined) => {
    setFormData((prev) => ({
      ...prev,
      dropoffs: prev.dropoffs.map((d, i) => (i === index ? { ...d, [field]: value } : d)),
    }));
  };

  const calculateEstimate = async () => {
    if (!formData.pickupAddress || formData.dropoffs.every((d) => !d.address)) {
      toast({
        title: "Missing Addresses",
        description: "Please enter pickup and at least one dropoff address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Call distance calculation
      const { data, error } = await supabase.functions.invoke("calculate-route-distance", {
        body: {
          origin: {
            address: formData.pickupAddress,
            latitude: formData.pickupLat,
            longitude: formData.pickupLng,
          },
          destination: {
            address: formData.dropoffs[formData.dropoffs.length - 1].address,
            latitude: formData.dropoffs[formData.dropoffs.length - 1].lat,
            longitude: formData.dropoffs[formData.dropoffs.length - 1].lng,
          },
          waypoints: formData.dropoffs.slice(0, -1).map((d) => ({
            address: d.address,
            latitude: d.lat,
            longitude: d.lng,
          })),
        },
      });

      if (error) throw error;

      const totalKm = data?.total_distance_km || 50; // Fallback estimate
      const cost = Math.round(totalKm * BASE_FEE_PER_KM);
      setEstimatedCost(cost);

      toast({
        title: "Estimate Ready",
        description: `Estimated cost: ₦${cost.toLocaleString()} for ${Math.round(totalKm)} km`,
      });
    } catch (error) {
      // Use fallback calculation
      const fallbackKm = 30;
      const cost = fallbackKm * BASE_FEE_PER_KM;
      setEstimatedCost(cost);
      toast({
        title: "Estimate (Approximate)",
        description: `Estimated cost: ₦${cost.toLocaleString()}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!termsAccepted) {
      toast({
        title: "Terms Required",
        description: "Please accept the terms and conditions",
        variant: "destructive",
      });
      return;
    }

    if (!customerInfo?.customer_id) {
      toast({
        title: "Error",
        description: "Customer account not found",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create order in inbox for operations manager
      const orderData = {
        source_channel: "customer_portal",
        status: "new",
        raw_payload: JSON.stringify({
          pickup: {
            address: formData.pickupAddress,
            lat: formData.pickupLat,
            lng: formData.pickupLng,
            contact: formData.pickupContactName,
            phone: formData.pickupContactPhone,
          },
          dropoffs: formData.dropoffs,
          cargo: {
            description: formData.cargoDescription,
            weight_kg: parseFloat(formData.cargoWeightKg) || 0,
            value: parseFloat(formData.estimatedValue) || 0,
          },
          specialInstructions: formData.specialInstructions,
          driverVerification: {
            requirePlatePhoto: true,
            requireNIN: true,
          },
          estimatedCost,
          termsAccepted: true,
          termsAcceptedAt: new Date().toISOString(),
        }),
        parsed_customer_name: customerInfo.customers?.company_name,
        parsed_pickup_address: formData.pickupAddress,
        parsed_delivery_address: formData.dropoffs[0]?.address,
        parsed_cargo_description: formData.cargoDescription,
        parsed_weight_kg: parseFloat(formData.cargoWeightKg) || null,
        converted_customer_id: customerInfo.customer_id,
        created_by: user?.id,
      };

      const { error } = await supabase.from("order_inbox").insert([orderData] as any);

      if (error) throw error;

      toast({
        title: "Order Submitted",
        description: "Your order has been sent to operations for processing",
      });

      setStep("complete");
      onOrderCreated?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderDetailsStep = () => (
    <div className="space-y-6">
      {/* Pickup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-success" />
            Pickup Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pickup Address</Label>
            <AddressAutocomplete
              value={formData.pickupAddress}
              onChange={(v) => setFormData((p) => ({ ...p, pickupAddress: v }))}
              onPlaceSelect={(place) =>
                setFormData((p) => ({
                  ...p,
                  pickupAddress: place.formattedAddress,
                  pickupLat: place.lat,
                  pickupLng: place.lng,
                }))
              }
              placeholder="Enter pickup location"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input
                value={formData.pickupContactName}
                onChange={(e) => setFormData((p) => ({ ...p, pickupContactName: e.target.value }))}
                placeholder="Name at pickup"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input
                value={formData.pickupContactPhone}
                onChange={(e) => setFormData((p) => ({ ...p, pickupContactPhone: e.target.value }))}
                placeholder="+234..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dropoff Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-destructive" />
              Delivery Points
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addDropoff}>
              <Plus className="w-4 h-4 mr-1" />
              Add Stop
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.dropoffs.map((dropoff, i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">Stop {i + 1}</Badge>
                {formData.dropoffs.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeDropoff(i)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
              <AddressAutocomplete
                value={dropoff.address}
                onChange={(v) => updateDropoff(i, "address", v)}
                onPlaceSelect={(place) => {
                  updateDropoff(i, "address", place.formattedAddress);
                  updateDropoff(i, "lat", place.lat);
                  updateDropoff(i, "lng", place.lng);
                }}
                placeholder="Delivery address"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={dropoff.contactName}
                  onChange={(e) => updateDropoff(i, "contactName", e.target.value)}
                  placeholder="Recipient name"
                />
                <Input
                  value={dropoff.contactPhone}
                  onChange={(e) => updateDropoff(i, "contactPhone", e.target.value)}
                  placeholder="Phone number"
                />
              </div>
              <Textarea
                value={dropoff.notes}
                onChange={(e) => updateDropoff(i, "notes", e.target.value)}
                placeholder="Delivery instructions (optional)"
                rows={2}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cargo Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Cargo Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.cargoDescription}
              onChange={(e) => setFormData((p) => ({ ...p, cargoDescription: e.target.value }))}
              placeholder="What are you sending?"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                value={formData.cargoWeightKg}
                onChange={(e) => setFormData((p) => ({ ...p, cargoWeightKg: e.target.value }))}
                placeholder="Estimated weight"
              />
            </div>
            <div className="space-y-2">
              <Label>Value (₦)</Label>
              <Input
                type="number"
                value={formData.estimatedValue}
                onChange={(e) => setFormData((p) => ({ ...p, estimatedValue: e.target.value }))}
                placeholder="Cargo value"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Special Instructions</Label>
            <Textarea
              value={formData.specialInstructions}
              onChange={(e) => setFormData((p) => ({ ...p, specialInstructions: e.target.value }))}
              placeholder="Any special handling requirements"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Estimate Section */}
      <Card className={estimatedCost ? "border-success" : ""}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Estimated Cost</p>
              {estimatedCost ? (
                <p className="text-2xl font-bold text-success">₦{estimatedCost.toLocaleString()}</p>
              ) : (
                <p className="text-muted-foreground">Calculate to see estimate</p>
              )}
            </div>
            <Button onClick={calculateEstimate} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get Estimate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={() => setStep("verification")}
        disabled={!estimatedCost || !formData.pickupAddress || !formData.dropoffs[0]?.address}
      >
        Continue to Driver Verification
      </Button>
    </div>
  );

  const renderVerificationStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Driver Verification Requirements
          </CardTitle>
          <CardDescription>
            For your security, we require driver verification before pickup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-info/10 border border-info/20 rounded-lg p-4 text-sm">
            <p className="font-medium mb-2">Before handing over your goods:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Take a photo of the driver's vehicle plate number</li>
              <li>Record the driver's NIN or ID number</li>
              <li>Verify the driver matches the assigned driver details</li>
              <li>Only hand over goods after verification is complete</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="p-4 border rounded-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Vehicle Plate Photo</p>
                <p className="text-sm text-muted-foreground">Required at pickup</p>
              </div>
              <Badge variant="secondary">Required</Badge>
            </div>
            <div className="p-4 border rounded-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Driver NIN/ID Verification</p>
                <p className="text-sm text-muted-foreground">Required at pickup</p>
              </div>
              <Badge variant="secondary">Required</Badge>
            </div>
          </div>

          <div className="flex items-start gap-2 p-4 bg-warning/10 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Important Security Notice</p>
              <p className="text-muted-foreground">
                Never hand over goods without completing driver verification. Our system will notify you with driver details before pickup.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button variant="outline" onClick={() => setStep("details")} className="flex-1">
          Back
        </Button>
        <Button onClick={() => setStep("terms")} className="flex-1">
          Continue to Terms
        </Button>
      </div>
    </div>
  );

  const renderTermsStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Terms & Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-[300px] overflow-y-auto p-4 bg-muted/50 rounded-lg text-sm">
            <h4 className="font-medium mb-2">Delivery Service Terms</h4>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>All goods must be properly packaged for transport.</li>
              <li>Prohibited items include hazardous materials, illegal goods, and perishables without proper packaging.</li>
              <li>The customer is responsible for accurate address information.</li>
              <li>Delivery times are estimates and may vary due to traffic or weather conditions.</li>
              <li>Insurance coverage applies as per declared value at time of booking.</li>
              <li>Claims for damaged goods must be filed within 24 hours of delivery.</li>
              <li>Driver verification is mandatory before goods handover.</li>
              <li>Payment is required before dispatch confirmation.</li>
              <li>Cancellation fees may apply for orders cancelled after driver assignment.</li>
              <li>RouteAce is not liable for goods lost due to customer providing incorrect information.</li>
            </ol>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(c) => setTermsAccepted(c === true)}
            />
            <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
              I have read and agree to the Terms & Conditions. I understand the driver verification requirements and will not hand over goods without proper verification.
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pickup</span>
            <span className="text-right max-w-[60%] truncate">{formData.pickupAddress}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dropoffs</span>
            <span>{formData.dropoffs.length} stop(s)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cargo</span>
            <span>{formData.cargoDescription || "N/A"}</span>
          </div>
          <div className="border-t pt-3 flex justify-between text-lg font-bold">
            <span>Estimated Total</span>
            <span className="text-success">₦{estimatedCost?.toLocaleString() || 0}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button variant="outline" onClick={() => setStep("verification")} className="flex-1">
          Back
        </Button>
        <Button
          onClick={handleSubmitOrder}
          disabled={!termsAccepted || loading}
          className="flex-1"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Submit Order
        </Button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <Card className="text-center py-8">
      <CardContent className="space-y-4">
        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h3 className="text-xl font-bold">Order Submitted!</h3>
        <p className="text-muted-foreground">
          Your order has been sent to our operations team. You will receive updates as your delivery progresses.
        </p>
        <div className="pt-4">
          <Button
            onClick={() => {
              setStep("details");
              setFormData({
                pickupAddress: "",
                pickupContactName: "",
                pickupContactPhone: "",
                cargoDescription: "",
                cargoWeightKg: "",
                estimatedValue: "",
                dropoffs: [{ address: "", contactName: "", contactPhone: "", notes: "" }],
                specialInstructions: "",
              });
              setEstimatedCost(null);
              setTermsAccepted(false);
            }}
          >
            Create Another Order
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {["details", "verification", "terms", "complete"].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : ["details", "verification", "terms", "complete"].indexOf(step) > i
                  ? "bg-success text-success-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            {i < 3 && <div className="w-8 h-0.5 bg-muted" />}
          </div>
        ))}
      </div>

      {step === "details" && renderDetailsStep()}
      {step === "verification" && renderVerificationStep()}
      {step === "terms" && renderTermsStep()}
      {step === "complete" && renderCompleteStep()}
    </div>
  );
};

export default CustomerOrderForm;
