 import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { Separator } from "@/components/ui/separator";
 import { 
 Truck, 
 User, 
 Clock, 
 MapPin, 
 FileText, 
 Image,
 Phone,
 Download,
 CheckCircle
 } from "lucide-react";
 import { format } from "date-fns";
 
 interface DeliveryUpdate {
 status: string;
 created_at: string;
 location: string | null;
 notes: string | null;
 photo_url?: string | null;
 }
 
 interface Dispatch {
 id: string;
 dispatch_number: string;
 status: string | null;
 pickup_address: string;
 delivery_address: string;
 cargo_description: string | null;
 scheduled_delivery: string | null;
 actual_delivery: string | null;
 drivers: {
   full_name: string;
   phone: string;
 } | null;
 delivery_updates: DeliveryUpdate[];
 }
 
 interface Invoice {
 id: string;
 invoice_number: string;
 total_amount: number;
 status: string;
 due_date: string | null;
 }
 
 interface DeliveryDetailsModalProps {
 dispatch: Dispatch | null;
 invoice?: Invoice | null;
 open: boolean;
 onOpenChange: (open: boolean) => void;
 }
 
 /**
  * Delivery Details Modal - Section F
  * Shows delivery details, driver info, ETA, proof of delivery, and invoice summary
  */
 const DeliveryDetailsModal = ({ dispatch, invoice, open, onOpenChange }: DeliveryDetailsModalProps) => {
 if (!dispatch) return null;
 
 const getStatusBadge = (status: string) => {
   switch (status) {
     case "delivered": 
       return <Badge className="bg-green-500/15 text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Delivered</Badge>;
     case "in_transit": 
       return <Badge className="bg-blue-500/15 text-blue-600"><Truck className="w-3 h-3 mr-1" />In Transit</Badge>;
     case "picked_up": 
       return <Badge className="bg-yellow-500/15 text-yellow-600">Picked Up</Badge>;
     default: 
       return <Badge variant="secondary">{status}</Badge>;
   }
 };
 
 // Calculate ETA
 const eta = dispatch.scheduled_delivery 
   ? format(new Date(dispatch.scheduled_delivery), "PPp")
   : "Not scheduled";
 
 // Find proof of delivery (last photo)
 const proofOfDelivery = dispatch.delivery_updates?.find(u => u.photo_url);
 
 return (
   <Dialog open={open} onOpenChange={onOpenChange}>
     <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
       <DialogHeader>
         <div className="flex items-center justify-between">
           <DialogTitle className="flex items-center gap-2">
             <Truck className="w-5 h-5 text-primary" />
             Delivery Details
           </DialogTitle>
           {getStatusBadge(dispatch.status || "pending")}
         </div>
         <DialogDescription>
           Tracking: {dispatch.dispatch_number}
         </DialogDescription>
       </DialogHeader>
 
       <div className="space-y-6">
         {/* Driver Info */}
         {dispatch.drivers && (
           <div className="p-4 rounded-lg bg-muted/50">
             <p className="text-sm font-medium mb-3 flex items-center gap-2">
               <User className="w-4 h-4" />
               Assigned Driver
             </p>
             <div className="flex items-center justify-between">
               <div>
                 <p className="font-medium">{dispatch.drivers.full_name}</p>
                 <p className="text-sm text-muted-foreground flex items-center gap-1">
                   <Phone className="w-3 h-3" />
                   {dispatch.drivers.phone}
                 </p>
               </div>
               <Button size="sm" variant="outline" asChild>
                 <a href={`tel:${dispatch.drivers.phone}`}>
                   <Phone className="w-4 h-4" />
                 </a>
               </Button>
             </div>
           </div>
         )}
 
         {/* ETA */}
         <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm text-muted-foreground">Estimated Delivery</p>
               <p className="font-medium text-lg">{eta}</p>
             </div>
             <Clock className="w-6 h-6 text-blue-500" />
           </div>
         </div>
 
         {/* Route */}
         <div className="space-y-3">
           <p className="text-sm font-medium">Route</p>
           <div className="space-y-2">
             <div className="flex items-start gap-3">
               <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5" />
               <div>
                 <p className="text-xs text-muted-foreground">Pickup</p>
                 <p className="text-sm">{dispatch.pickup_address}</p>
               </div>
             </div>
             <div className="ml-1.5 border-l-2 border-dashed border-muted h-4" />
             <div className="flex items-start gap-3">
               <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5" />
               <div>
                 <p className="text-xs text-muted-foreground">Delivery</p>
                 <p className="text-sm">{dispatch.delivery_address}</p>
               </div>
             </div>
           </div>
         </div>
 
         {/* Cargo */}
         {dispatch.cargo_description && (
           <div>
             <p className="text-sm font-medium mb-2">Cargo</p>
             <p className="text-sm text-muted-foreground">{dispatch.cargo_description}</p>
           </div>
         )}
 
         <Separator />
 
         {/* Proof of Delivery */}
         {dispatch.status === "delivered" && (
           <div>
             <p className="text-sm font-medium mb-3 flex items-center gap-2">
               <Image className="w-4 h-4" />
               Proof of Delivery
             </p>
             {proofOfDelivery?.photo_url ? (
               <div className="rounded-lg overflow-hidden border">
                 <img 
                   src={proofOfDelivery.photo_url} 
                   alt="Proof of delivery" 
                   className="w-full h-48 object-cover"
                 />
                 <div className="p-2 bg-muted/50 text-xs text-muted-foreground">
                   {format(new Date(proofOfDelivery.created_at), "PPp")}
                 </div>
               </div>
             ) : (
               <div className="p-4 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
                 <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                 Delivered on {dispatch.actual_delivery && format(new Date(dispatch.actual_delivery), "PPp")}
               </div>
             )}
           </div>
         )}
 
         {/* Tracking History */}
         {dispatch.delivery_updates && dispatch.delivery_updates.length > 0 && (
           <div>
             <p className="text-sm font-medium mb-3">Tracking History</p>
             <div className="space-y-2 max-h-40 overflow-y-auto">
               {dispatch.delivery_updates.map((update, idx) => (
                 <div key={idx} className="flex items-start gap-3 text-sm">
                   <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                   <div className="flex-1">
                     <p className="capitalize">{update.status.replace("_", " ")}</p>
                     {update.location && <p className="text-xs text-muted-foreground">{update.location}</p>}
                   </div>
                   <span className="text-xs text-muted-foreground">
                     {format(new Date(update.created_at), "MMM d, HH:mm")}
                   </span>
                 </div>
               ))}
             </div>
           </div>
         )}
 
         <Separator />
 
         {/* Invoice Summary */}
         {invoice && (
           <div className="p-4 rounded-lg border">
             <p className="text-sm font-medium mb-3 flex items-center gap-2">
               <FileText className="w-4 h-4" />
               Invoice Summary
             </p>
             <div className="space-y-2">
               <div className="flex items-center justify-between text-sm">
                 <span className="text-muted-foreground">Invoice #</span>
                 <span className="font-mono">{invoice.invoice_number}</span>
               </div>
               <div className="flex items-center justify-between text-sm">
                 <span className="text-muted-foreground">Amount</span>
                 <span className="font-medium">₦{invoice.total_amount.toLocaleString()}</span>
               </div>
               <div className="flex items-center justify-between text-sm">
                 <span className="text-muted-foreground">Status</span>
                 <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                   {invoice.status}
                 </Badge>
               </div>
               {invoice.due_date && (
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-muted-foreground">Due</span>
                   <span>{format(new Date(invoice.due_date), "MMM d, yyyy")}</span>
                 </div>
               )}
             </div>
             <Button variant="outline" size="sm" className="w-full mt-3">
               <Download className="w-4 h-4 mr-2" />
               Download Invoice
             </Button>
           </div>
         )}
       </div>
     </DialogContent>
   </Dialog>
 );
 };
 
 export default DeliveryDetailsModal;