 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { CheckCircle, X } from "lucide-react";
 
 interface TierFeatures {
 dispatch: boolean;
 operations?: boolean;
 reports?: boolean;
 basic_reports?: boolean;
 max_vehicles: number;
 integrations: boolean | string[];
 role_customization?: boolean;
 analytics?: boolean;
 }
 
 interface SubscriptionTierCardProps {
 name: string;
 price: number;
 features: TierFeatures;
 maxUsers: number;
 isActive?: boolean;
 isCurrent?: boolean;
 onSelect?: () => void;
 }
 
 /**
  * Subscription Tier Card - Section I
  * Displays subscription tier information
  */
 const SubscriptionTierCard = ({ 
 name, 
 price, 
 features, 
 maxUsers, 
 isActive = true,
 isCurrent = false,
 onSelect 
 }: SubscriptionTierCardProps) => {
 const isProfessional = name.toLowerCase() === "professional";
 const isEnterprise = name.toLowerCase() === "enterprise";
 
 const featureList = [
   { label: "Dispatch Management", included: features.dispatch },
   { label: "Operations Tools", included: features.operations || false },
   { label: "Reports & Analytics", included: features.reports || features.basic_reports || false },
   { label: `Up to ${features.max_vehicles === -1 ? "Unlimited" : features.max_vehicles} vehicles`, included: true },
   { label: `${maxUsers === -1 ? "Unlimited" : maxUsers} team member${maxUsers !== 1 ? "s" : ""}`, included: true },
   { label: "Zoho/QuickBooks Integration", included: Array.isArray(features.integrations) },
   { label: "WhatsApp Order Ingestion", included: isEnterprise },
   { label: "Website Order Integration", included: isEnterprise },
   { label: "Role Customization", included: features.role_customization || false },
   { label: "Advanced Analytics", included: features.analytics || false },
 ];
 
 return (
   <Card className={`relative ${isProfessional ? "border-primary shadow-lg" : ""} ${isCurrent ? "ring-2 ring-primary" : ""}`}>
     {isProfessional && (
       <div className="absolute -top-3 left-1/2 -translate-x-1/2">
         <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
       </div>
     )}
     {isCurrent && (
       <div className="absolute -top-3 right-4">
         <Badge variant="outline">Current Plan</Badge>
       </div>
     )}
     
     <CardHeader className="text-center pb-4">
       <CardTitle className="text-xl">{name}</CardTitle>
       <CardDescription>
         {name === "Starter" && "Perfect for getting started"}
         {name === "Professional" && "For growing businesses"}
         {name === "Enterprise" && "For large operations"}
       </CardDescription>
       <div className="pt-4">
         <span className="text-4xl font-bold">
           {price === 0 ? "Free" : `₦${price.toLocaleString()}`}
         </span>
         {price > 0 && <span className="text-muted-foreground">/month</span>}
         {price > 0 && <p className="text-xs text-muted-foreground mt-1">VAT exclusive</p>}
       </div>
     </CardHeader>
     
     <CardContent className="space-y-4">
       <ul className="space-y-3">
         {featureList.map((feature, idx) => (
           <li key={idx} className="flex items-center gap-2 text-sm">
             {feature.included ? (
               <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
             ) : (
               <X className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
             )}
             <span className={feature.included ? "" : "text-muted-foreground/50"}>
               {feature.label}
             </span>
           </li>
         ))}
       </ul>
       
       <Button 
         className="w-full" 
         variant={isProfessional ? "default" : "outline"}
         disabled={!isActive || isCurrent}
         onClick={onSelect}
       >
         {isCurrent ? "Current Plan" : price === 0 ? "Get Started" : "Upgrade"}
       </Button>
     </CardContent>
   </Card>
 );
 };
 
 export default SubscriptionTierCard;