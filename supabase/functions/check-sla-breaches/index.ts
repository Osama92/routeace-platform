import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { corsHeaders, validateJWT, checkUserRole } from '../_shared/security.ts';

// Note: This function should ideally be called via scheduled job (pg_cron) 
// rather than HTTP endpoint. When called via HTTP, it requires admin/operations role.

interface SLABreach {
  id: string;
  dispatch_id: string;
  breach_type: string;
  expected_time: string | null;
  actual_time: string | null;
  delay_hours: number | null;
  dispatches: {
    dispatch_number: string;
    customer_id: string;
    customers: {
      company_name: string;
      email: string;
    };
  };
}

async function sendBreachEmail(resend: Resend, breach: SLABreach, recipients: string[]) {
  if (recipients.length === 0) {
    console.log('No email recipients configured, skipping email for breach:', breach.id);
    return;
  }

  const breachTypeLabel = breach.breach_type.replace(/_/g, ' ').toUpperCase();
  const dispatchNumber = breach.dispatches?.dispatch_number || 'N/A';
  const customerName = breach.dispatches?.customers?.company_name || 'N/A';
  const delayHours = breach.delay_hours?.toFixed(1) || '0';

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .alert-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { font-weight: bold; color: #6b7280; }
        .footer { text-align: center; padding: 15px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">⚠️ SLA Breach Alert</h1>
          <p style="margin: 5px 0 0 0;">Automatic Notification</p>
        </div>
        <div class="content">
          <div class="alert-box">
            <strong>Breach Type:</strong> ${breachTypeLabel}<br>
            <strong>Delay:</strong> ${delayHours} hours
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Dispatch Number:</span>
            <span>${dispatchNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Customer:</span>
            <span>${customerName}</span>
          </div>
          ${breach.expected_time ? `
          <div class="detail-row">
            <span class="detail-label">Expected Time:</span>
            <span>${new Date(breach.expected_time).toLocaleString()}</span>
          </div>
          ` : ''}
          ${breach.actual_time ? `
          <div class="detail-row">
            <span class="detail-label">Actual Time:</span>
            <span>${new Date(breach.actual_time).toLocaleString()}</span>
          </div>
          ` : ''}
          
          <p style="margin-top: 20px;">
            This is an automated alert. Please take immediate action to resolve this SLA breach.
          </p>
        </div>
        <div class="footer">
          <p>RouteAce Logistics Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const emailResponse = await resend.emails.send({
      from: 'RouteAce <onboarding@resend.dev>',
      to: recipients,
      subject: `🚨 [AUTO] SLA Breach: ${dispatchNumber} - ${breachTypeLabel}`,
      html: emailHtml,
    });
    console.log(`Email sent for breach ${breach.id}:`, emailResponse);
    return true;
  } catch (error) {
    console.error(`Failed to send email for breach ${breach.id}:`, error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    // Validate JWT and check authorization
    const authHeader = req.headers.get('authorization');
    const jwtResult = await validateJWT(authHeader, supabaseUrl, supabaseAnonKey);
    
    if (!jwtResult.valid || !jwtResult.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - valid authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin or operations role
    const hasPermission = await checkUserRole(
      jwtResult.claims.sub,
      ['admin', 'operations'],
      supabaseUrl,
      supabaseKey
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - admin or operations role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Starting SLA breach check (authorized user)...');

    // Check for overdue invoices
    const { data: overdueResult, error: overdueError } = await supabase.rpc('mark_overdue_invoices');
    
    if (overdueError) {
      console.error('Error marking overdue invoices:', overdueError);
    } else {
      console.log(`Marked ${overdueResult} invoices as overdue`);
    }

    // Check for SLA breaches in dispatches
    const { data: breachResult, error: breachError } = await supabase.rpc('detect_sla_breaches');
    
    if (breachError) {
      console.error('Error detecting SLA breaches:', breachError);
    } else {
      console.log(`Detected ${breachResult} new SLA breaches`);
    }

    // Per-tenant notification config (each org has its own row in `integrations`)
    const orgRecipientsCache = new Map<string, string[]>();
    async function getRecipientsForOrg(orgId: string | null): Promise<string[]> {
      if (!resendApiKey) return [];
      const key = orgId ?? '__none__';
      if (orgRecipientsCache.has(key)) return orgRecipientsCache.get(key)!;
      let q = supabase.from('integrations').select('config, organization_id').eq('type', 'notifications');
      if (orgId) q = q.eq('organization_id', orgId);
      else q = q.is('organization_id', null);
      const { data } = await q.maybeSingle();
      const cfg = (data?.config as Record<string, any> | null) ?? null;
      const adminEmails = Array.isArray(cfg?.admin_emails) ? cfg!.admin_emails : [];
      const slaEmails = Array.isArray(cfg?.sla_notification_emails) ? cfg!.sla_notification_emails : [];
      const leadership = typeof cfg?.leadership_email === 'string' ? [cfg!.leadership_email] : [];
      const support = typeof cfg?.support_email === 'string' ? [cfg!.support_email] : [];
      const recipients = [...new Set([...adminEmails, ...slaEmails, ...leadership, ...support].filter(Boolean))];
      orgRecipientsCache.set(key, recipients);
      return recipients;
    }

    // Get recent unresolved SLA breaches that haven't been emailed
    const { data: unresolvedBreaches, error: breachesError } = await supabase
      .from('sla_breach_alerts')
      .select(`
        id,
        dispatch_id,
        breach_type,
        expected_time,
        actual_time,
        delay_hours,
        alert_sent,
        dispatches(
          dispatch_number,
          organization_id,
          customer_id,
          customers(company_name, email)
        )
      `)
      .eq('is_resolved', false)
      .eq('alert_sent', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (breachesError) {
      console.error('Error fetching unresolved breaches:', breachesError);
    }

    // Send automatic email notifications for new breaches (per-tenant recipients)
    let emailsSent = 0;
    if (resendApiKey && unresolvedBreaches && unresolvedBreaches.length > 0) {
      const resend = new Resend(resendApiKey);

      for (const breach of unresolvedBreaches as unknown as SLABreach[]) {
        const orgId = ((breach as any).dispatches?.organization_id as string | null) ?? null;
        const recipients = await getRecipientsForOrg(orgId);
        if (recipients.length === 0) continue;
        const sent = await sendBreachEmail(resend, breach, recipients);
        if (sent) emailsSent++;
      }

      // Mark alerts as sent
      const breachIds = unresolvedBreaches.map((b: any) => b.id);
      await supabase
        .from('sla_breach_alerts')
        .update({ alert_sent: true })
        .in('id', breachIds);

      console.log(`Sent ${emailsSent} automatic SLA breach emails`);
    } else if (unresolvedBreaches && unresolvedBreaches.length > 0) {
      // Just mark as processed even if no email sent
      const breachIds = unresolvedBreaches.map((b: any) => b.id);
      await supabase
        .from('sla_breach_alerts')
        .update({ alert_sent: true })
        .in('id', breachIds);
      console.log(`Processed ${unresolvedBreaches.length} SLA breaches (no email configured)`);
    }

    // Also check email notification SLA breaches (legacy support)
    const { data: breachedEmails, error: emailError } = await supabase
      .from("email_notifications")
      .select(`
        *,
        dispatches (
          dispatch_number,
          customers (
            company_name,
            contact_name
          )
        )
      `)
      .eq("status", "pending");

    if (emailError) {
      console.error('Error fetching email notifications:', emailError);
    }

    const emailBreachAlerts = [];
    for (const email of breachedEmails || []) {
      if (email.created_at) {
        const createdAt = new Date(email.created_at);
        const now = new Date();
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceCreation > 2) {
          emailBreachAlerts.push({
            id: email.id,
            dispatch_number: (email.dispatches as any)?.dispatch_number,
            customer: (email.dispatches as any)?.customers?.company_name,
            recipient: email.recipient_email,
            hours_pending: Math.round(hoursSinceCreation * 10) / 10,
          });
        }
      }
    }

    if (emailBreachAlerts.length > 0) {
      console.log(`Found ${emailBreachAlerts.length} pending email notifications`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        overdueInvoices: overdueResult || 0,
        newBreaches: breachResult || 0,
        unresolvedAlerts: unresolvedBreaches?.length || 0,
        emailsSent,
        pendingEmails: emailBreachAlerts.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('SLA breach check error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
