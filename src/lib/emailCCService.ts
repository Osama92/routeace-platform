 import { supabase } from "@/integrations/supabase/client";
 
 interface EmailCCConfig {
   orgAdminEmail?: string;
   superAdminEmail?: string;
 }
 
 /**
  * Email CC Service - Section E
  * Automatically adds CC recipients and logs email activity
  */
 export async function sendEmailWithCC(params: {
   recipientEmail: string;
   subject: string;
   body: string;
   notificationType: string;
   dispatchId?: string;
   invoiceId?: string;
   relatedEntityType?: string;
   relatedEntityId?: string;
 }) {
   // Get org admin and super admin emails for CC
   const ccConfig = await getEmailCCConfig();
   const ccRecipients: string[] = [];
   
   if (ccConfig.orgAdminEmail) {
     ccRecipients.push(ccConfig.orgAdminEmail);
   }
   if (ccConfig.superAdminEmail) {
     ccRecipients.push(ccConfig.superAdminEmail);
   }
 
   // Log email activity
   await supabase.from("email_activity_log").insert({
     original_recipient: params.recipientEmail,
     cc_recipients: ccRecipients,
     subject: params.subject,
     related_entity_type: params.relatedEntityType,
     related_entity_id: params.relatedEntityId,
     dispatch_id: params.dispatchId,
     invoice_id: params.invoiceId,
     sent_at: new Date().toISOString(),
   });
 
   // Return CC list for edge function to use
   return {
     ccRecipients,
     logged: true,
   };
 }
 
 async function getEmailCCConfig(): Promise<EmailCCConfig> {
   const config: EmailCCConfig = {};
 
   // Get org admin email
   const { data: orgAdmins } = await supabase
     .from("user_roles")
     .select("user_id")
     .eq("role", "org_admin")
     .limit(1);
 
   if (orgAdmins?.[0]) {
     const { data: profile } = await supabase
       .from("profiles")
       .select("email")
       .eq("id", orgAdmins[0].user_id)
       .single();
     
     if (profile?.email) {
       config.orgAdminEmail = profile.email;
     }
   }
 
   // Get super admin email
   const { data: superAdmins } = await supabase
     .from("user_roles")
     .select("user_id")
     .eq("role", "super_admin")
     .limit(1);
 
   if (superAdmins?.[0]) {
     const { data: profile } = await supabase
       .from("profiles")
       .select("email")
       .eq("id", superAdmins[0].user_id)
       .single();
     
     if (profile?.email) {
       config.superAdminEmail = profile.email;
     }
   }
 
   return config;
 }
 
 export async function getEmailActivityLog(filters?: {
   dispatchId?: string;
   invoiceId?: string;
   startDate?: Date;
   endDate?: Date;
 }) {
   let query = supabase
     .from("email_activity_log")
     .select("*")
     .order("sent_at", { ascending: false })
     .limit(100);
 
   if (filters?.dispatchId) {
     query = query.eq("dispatch_id", filters.dispatchId);
   }
   if (filters?.invoiceId) {
     query = query.eq("invoice_id", filters.invoiceId);
   }
   if (filters?.startDate) {
     query = query.gte("sent_at", filters.startDate.toISOString());
   }
   if (filters?.endDate) {
     query = query.lte("sent_at", filters.endDate.toISOString());
   }
 
   const { data, error } = await query;
   if (error) throw error;
   return data;
 }