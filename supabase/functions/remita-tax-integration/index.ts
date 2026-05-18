import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string,string> = buildCors();

// Remita API Configuration
// Note: These would need to be configured with actual Remita API credentials
const REMITA_API_URL = Deno.env.get('REMITA_API_URL') || 'https://login.remita.net/remita/exapp/api/v1/send/api';
const REMITA_MERCHANT_ID = Deno.env.get('REMITA_MERCHANT_ID');
const REMITA_API_KEY = Deno.env.get('REMITA_API_KEY');
const REMITA_SERVICE_TYPE_ID = Deno.env.get('REMITA_SERVICE_TYPE_ID'); // PAYE service type

interface RemitaRRRRequest {
  serviceTypeId: string;
  amount: number;
  orderId: string;
  payerName: string;
  payerEmail: string;
  payerPhone: string;
  description: string;
}

interface TaxFilingData {
  driver_id: string;
  driver_name: string;
  tin: string;
  total_gross: number;
  total_tax: number;
  period_year: number;
}

// Generate RRR (Remita Retrieval Reference) for PAYE tax payment
async function generateRRR(requestData: RemitaRRRRequest): Promise<{ rrr: string; status: string } | null> {
  if (!REMITA_MERCHANT_ID || !REMITA_API_KEY) {
    console.error('Missing Remita credentials');
    return null;
  }

  try {
    // Generate hash for authentication (in production, use proper hashing)
    const timestamp = Date.now().toString();
    
    const payload = {
      serviceTypeId: requestData.serviceTypeId || REMITA_SERVICE_TYPE_ID,
      amount: requestData.amount,
      orderId: requestData.orderId,
      payerName: requestData.payerName,
      payerEmail: requestData.payerEmail,
      payerPhone: requestData.payerPhone,
      description: requestData.description,
    };

    const response = await fetch(`${REMITA_API_URL}/echannelsvc/merchant/api/paymentinit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `remitaConsumerKey=${REMITA_MERCHANT_ID},remitaConsumerToken=${REMITA_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Remita RRR generation error:', errorText);
      return null;
    }

    const result = await response.json();
    
    if (result.statuscode === '025' || result.RRR) {
      return {
        rrr: result.RRR,
        status: 'generated',
      };
    }

    console.error('Remita RRR generation failed:', result);
    return null;
  } catch (error) {
    console.error('Remita API error:', error);
    return null;
  }
}

// Check payment status for an RRR
async function checkPaymentStatus(rrr: string): Promise<{ status: string; amount?: number; paymentDate?: string } | null> {
  if (!REMITA_MERCHANT_ID || !REMITA_API_KEY) {
    console.error('Missing Remita credentials');
    return null;
  }

  try {
    const response = await fetch(
      `${REMITA_API_URL}/echannelsvc/${REMITA_MERCHANT_ID}/${rrr}/status.reg`,
      {
        headers: {
          'Authorization': `remitaConsumerKey=${REMITA_MERCHANT_ID},remitaConsumerToken=${REMITA_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    
    return {
      status: result.status || 'unknown',
      amount: result.amount,
      paymentDate: result.transactiontime,
    };
  } catch (error) {
    console.error('Remita status check error:', error);
    return null;
  }
}

serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // JWT Authentication - only admin/finance_manager can use Remita tax integration
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { data: roleRow } = await authedClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    const role = (roleRow as any)?.role as string | undefined;
    if (!role || !new Set(['admin', 'finance_manager', 'super_admin', 'org_admin']).has(role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden - admin or finance_manager role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();
    console.log('Remita Tax Integration request:', { action });

    let result: any = { success: true };

    switch (action) {
      case 'check_configuration': {
        // Check if Remita is properly configured
        result.configured = !!(REMITA_MERCHANT_ID && REMITA_API_KEY && REMITA_SERVICE_TYPE_ID);
        result.missing = [];
        if (!REMITA_MERCHANT_ID) result.missing.push('REMITA_MERCHANT_ID');
        if (!REMITA_API_KEY) result.missing.push('REMITA_API_KEY');
        if (!REMITA_SERVICE_TYPE_ID) result.missing.push('REMITA_SERVICE_TYPE_ID');
        break;
      }

      case 'generate_rrr': {
        const { salaryId, taxData } = params as { salaryId: string; taxData: TaxFilingData };
        
        if (!taxData) {
          throw new Error('Tax data is required');
        }

        const orderId = `PAYE-${taxData.driver_id}-${Date.now()}`;
        
        const rrrResult = await generateRRR({
          serviceTypeId: REMITA_SERVICE_TYPE_ID || '',
          amount: taxData.total_tax,
          orderId,
          payerName: 'RouteAce Logistics Ltd',
          payerEmail: 'accounts@routeace.com',
          payerPhone: '+2340000000000',
          description: `PAYE Tax for ${taxData.driver_name} - ${taxData.period_year}`,
        });

        if (rrrResult) {
          // Update salary record with RRR
          if (salaryId) {
            await supabase
              .from('driver_salaries')
              .update({
                remita_rrr: rrrResult.rrr,
                remita_status: 'pending_payment',
              })
              .eq('id', salaryId);
          }
          
          result.rrr = rrrResult.rrr;
          result.status = rrrResult.status;
        } else {
          result.success = false;
          result.error = 'Failed to generate RRR. Check Remita configuration.';
        }
        break;
      }

      case 'check_payment': {
        const { rrr, salaryId } = params;
        
        if (!rrr) {
          throw new Error('RRR is required');
        }

        const paymentStatus = await checkPaymentStatus(rrr);
        
        if (paymentStatus) {
          // Update salary record if paid
          if (salaryId && paymentStatus.status === 'PAID') {
            await supabase
              .from('driver_salaries')
              .update({
                remita_status: 'paid',
                firs_submission_date: new Date().toISOString(),
              })
              .eq('id', salaryId);
          }
          
          result.payment_status = paymentStatus;
        } else {
          result.success = false;
          result.error = 'Failed to check payment status';
        }
        break;
      }

      case 'submit_filing': {
        const { year, taxRecords } = params as { year: number; taxRecords: TaxFilingData[] };
        
        // In a real implementation, this would submit to FIRS via Remita's tax filing API
        // For now, we'll simulate the submission
        
        const submissionId = `FIRS-${year}-${Date.now()}`;
        
        // Log the submission
        console.log(`Tax filing submission for year ${year}:`, taxRecords);
        
        result.submission_id = submissionId;
        result.records_submitted = taxRecords.length;
        result.total_tax = taxRecords.reduce((sum, r) => sum + r.total_tax, 0);
        result.message = 'Tax filing submission recorded. Generate RRR for individual payments.';
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Remita Tax Integration error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
