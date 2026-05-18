import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string,string> = buildCors();

interface SMSPayload {
  phoneNumbers: string[];
  message: string;
  type?: string;
}

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // JWT Authentication - validate user is logged in
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    
    const { data: userData, error: userErr } = await authedClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Role check - only admin/operations/support can send SMS
    const { data: roleRow } = await authedClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    
    const role = (roleRow as any)?.role as string | undefined;
    const allowedRoles = new Set(['admin', 'operations', 'support']);
    if (!role || !allowedRoles.has(role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden - insufficient permissions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Resolve sender's organization for scoping/audit
    const { data: callerMembership } = await authedClient
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    const callerOrgId = (callerMembership as any)?.organization_id;
    if (!callerOrgId) {
      return new Response(
        JSON.stringify({ success: false, error: 'No active organisation membership' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const apiKey = Deno.env.get('AFRICASTALKING_API_KEY');
    const username = Deno.env.get('AFRICASTALKING_USERNAME');

    if (!apiKey || !username) {
      console.error('Africa\'s Talking credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'SMS service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const payload: SMSPayload = await req.json();
    console.log('Processing SMS notification:', { 
      recipientCount: payload.phoneNumbers?.length, 
      type: payload.type,
      messageLength: payload.message?.length,
      userId: userData.user.id,
    });

    if (!payload.phoneNumbers || payload.phoneNumbers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No phone numbers provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!payload.message) {
      return new Response(
        JSON.stringify({ success: false, error: 'No message provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Format phone numbers (ensure they start with +)
    const formattedNumbers = payload.phoneNumbers
      .filter(Boolean)
      .map(num => {
        const cleaned = num.replace(/\s/g, '');
        if (cleaned.startsWith('+')) return cleaned;
        if (cleaned.startsWith('234')) return `+${cleaned}`;
        if (cleaned.startsWith('0')) return `+234${cleaned.slice(1)}`;
        return `+234${cleaned}`;
      });

    if (formattedNumbers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No valid phone numbers after formatting' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('SMS send requested', {
      orgId: callerOrgId,
      role,
      recipientCount: formattedNumbers.length,
      type: payload.type,
    });
    console.log('Sending SMS to:', formattedNumbers);

    // Africa's Talking API endpoint
    const atUrl = 'https://api.africastalking.com/version1/messaging';
    
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('to', formattedNumbers.join(','));
    formData.append('message', payload.message);
    formData.append('from', 'RouteAce'); // Short code or sender ID

    const smsResponse = await fetch(atUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': apiKey,
      },
      body: formData.toString(),
    });

    const smsResult = await smsResponse.json();
    console.log('Africa\'s Talking response:', smsResult);

    if (!smsResponse.ok) {
      throw new Error(smsResult.message || 'Failed to send SMS');
    }

    // Log SMS to database for tracking
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Log each SMS recipient
    const logEntries = formattedNumbers.map(phone => ({
      recipient_email: phone, // Reusing email_notifications table
      recipient_type: 'sms',
      notification_type: payload.type || 'sms_alert',
      subject: 'SMS Notification',
      body: payload.message,
      status: 'sent',
      sent_at: new Date().toISOString(),
    }));

    await supabase.from('email_notifications').insert(logEntries);

    return new Response(
      JSON.stringify({ 
        success: true, 
        result: smsResult,
        recipientCount: formattedNumbers.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
