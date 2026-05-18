import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  corsHeaders, 
  validateApiKey, 
  checkRateLimit, 
  logApiRequest,
  logSecurityEvent,
  generateApiKey,
  validateJWT,
  checkUserRole,
  validatePayloadSize,
} from "../_shared/security.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

serve(async (req) => {
  const startTime = Date.now();
  const requestIp = req.headers.get('x-forwarded-for')?.split(',')[0] || null;
  const userAgent = req.headers.get('user-agent');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/partner-api', '');
  
  try {
    // Validate payload size (100KB max)
    const body = await req.text();
    if (body && !validatePayloadSize(body, 100)) {
      return new Response(
        JSON.stringify({ error: 'Payload too large', max_size_kb: 100 }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for API key authentication (for partner endpoints)
    const apiKey = req.headers.get('x-api-key');
    const authHeader = req.headers.get('authorization');

    // Admin endpoints require JWT auth
    if (path.startsWith('/admin')) {
      return await handleAdminEndpoints(req, path, body, authHeader, requestIp, userAgent, startTime);
    }

    // Partner endpoints require API key
    if (!apiKey) {
      await logSecurityEvent(
        'unauthorized_access',
        null,
        requestIp,
        userAgent,
        { path, reason: 'Missing API key' },
        'warn',
        supabaseUrl,
        supabaseServiceKey
      );
      
      return new Response(
        JSON.stringify({ error: 'API key required', header: 'x-api-key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate API key
    const keyValidation = await validateApiKey(apiKey, supabaseUrl, supabaseServiceKey);
    
    if (!keyValidation.valid) {
      await logSecurityEvent(
        'invalid_api_key',
        null,
        requestIp,
        userAgent,
        { path, error: keyValidation.error },
        'warn',
        supabaseUrl,
        supabaseServiceKey
      );
      
      return new Response(
        JSON.stringify({ error: keyValidation.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(
      keyValidation.keyId!,
      60, // 60 requests per minute default
      supabaseUrl,
      supabaseServiceKey
    );

    if (!rateLimit.allowed) {
      await logSecurityEvent(
        'rate_limit_exceeded',
        null,
        requestIp,
        userAgent,
        { api_key_id: keyValidation.keyId, path },
        'warn',
        supabaseUrl,
        supabaseServiceKey
      );

      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          retry_after: Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000),
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
          } 
        }
      );
    }

    // Route to appropriate handler
    let response: Response;
    
    switch (true) {
      case path === '/tracking' && req.method === 'GET':
        response = await handleTrackingLookup(url, keyValidation.scopes!);
        break;
      
      case path === '/dispatches' && req.method === 'GET':
        response = await handleDispatchesList(url, keyValidation.partnerId!, keyValidation.scopes!);
        break;
      
      case path === '/dispatches' && req.method === 'POST':
        response = await handleCreateDispatch(body, keyValidation.partnerId!, keyValidation.scopes!);
        break;
      
      case path === '/invoices' && req.method === 'GET':
        response = await handleInvoicesList(url, keyValidation.partnerId!, keyValidation.scopes!);
        break;
      
      case path === '/health':
        response = new Response(
          JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        break;
      
      default:
        response = new Response(
          JSON.stringify({ error: 'Not found', path }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Log the request
    const responseTime = Date.now() - startTime;
    await logApiRequest(
      keyValidation.keyId!,
      path,
      req.method,
      response.status,
      requestIp,
      userAgent,
      responseTime,
      response.status >= 400 ? await response.clone().text() : null,
      supabaseUrl,
      supabaseServiceKey
    );

    // Add rate limit headers
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimit.resetAt.toISOString());

    return response;

  } catch (err) {
    const error = err as Error;
    console.error('Partner API error:', error);
    
    await logSecurityEvent(
      'api_error',
      null,
      requestIp,
      userAgent,
      { path, error: error.message || 'Unknown error' },
      'error',
      supabaseUrl,
      supabaseServiceKey
    );

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Admin endpoints (JWT authenticated)
async function handleAdminEndpoints(
  req: Request,
  path: string,
  body: string,
  authHeader: string | null,
  requestIp: string | null,
  userAgent: string | null,
  startTime: number
): Promise<Response> {
  // Validate JWT
  const jwtValidation = await validateJWT(authHeader, supabaseUrl, supabaseAnonKey);
  
  if (!jwtValidation.valid) {
    return new Response(
      JSON.stringify({ error: jwtValidation.error }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check admin role
  const isAdmin = await checkUserRole(jwtValidation.claims!.sub, ['admin'], supabaseUrl, supabaseServiceKey);
  
  if (!isAdmin) {
    await logSecurityEvent(
      'unauthorized_admin_access',
      jwtValidation.claims!.sub,
      requestIp,
      userAgent,
      { path, role_required: 'admin' },
      'warn',
      supabaseUrl,
      supabaseServiceKey
    );
    
    return new Response(
      JSON.stringify({ error: 'Admin role required' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Handle admin routes
  switch (true) {
    case path === '/admin/keys' && req.method === 'GET':
      // List API keys
      const { data: keys, error: keysError } = await supabase
        .from('api_keys')
        .select('id, partner_id, key_prefix, name, scopes, is_active, expires_at, last_used_at, created_at')
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (keysError) {
        return new Response(
          JSON.stringify({ error: keysError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ keys }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    case path === '/admin/keys' && req.method === 'POST':
      // Create new API key
      const createData = JSON.parse(body);
      
      if (!createData.partner_id || !createData.name) {
        return new Response(
          JSON.stringify({ error: 'partner_id and name are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { key, hash } = await generateApiKey(createData.is_test ? 'ra_test_' : 'ra_live_');
      
      const { data: newKey, error: createError } = await supabase
        .from('api_keys')
        .insert({
          partner_id: createData.partner_id,
          key_hash: hash,
          key_prefix: key.substring(0, 8),
          name: createData.name,
          scopes: createData.scopes || ['dispatch:read', 'tracking:read'],
          rate_limit_per_minute: createData.rate_limit_per_minute || 60,
          rate_limit_per_day: createData.rate_limit_per_day || 10000,
          expires_at: createData.expires_at || null,
          created_by: jwtValidation.claims!.sub,
        })
        .select('id, name, key_prefix, scopes')
        .single();

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return the full key ONLY once at creation
      return new Response(
        JSON.stringify({ 
          message: 'API key created. Store this key securely - it will not be shown again.',
          api_key: key,
          key_id: newKey.id,
          scopes: newKey.scopes,
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    case path.startsWith('/admin/keys/') && req.method === 'DELETE':
      // Revoke API key
      const keyId = path.split('/')[3];
      
      const { error: revokeError } = await supabase
        .from('api_keys')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: jwtValidation.claims!.sub,
        })
        .eq('id', keyId);

      if (revokeError) {
        return new Response(
          JSON.stringify({ error: revokeError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ message: 'API key revoked' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    case path === '/admin/logs' && req.method === 'GET':
      // Get recent API request logs
      const { data: logs, error: logsError } = await supabase
        .from('api_request_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) {
        return new Response(
          JSON.stringify({ error: logsError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ logs }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    case path === '/admin/security-events' && req.method === 'GET':
      // Get security events
      const { data: events, error: eventsError } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (eventsError) {
        return new Response(
          JSON.stringify({ error: eventsError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ events }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    default:
      return new Response(
        JSON.stringify({ error: 'Admin endpoint not found', path }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
  }
}

// Partner endpoint handlers
async function handleTrackingLookup(url: URL, scopes: string[]): Promise<Response> {
  if (!scopes.includes('tracking:read')) {
    return new Response(
      JSON.stringify({ error: 'Scope tracking:read required' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = url.searchParams.get('token');
  const dispatchNumber = url.searchParams.get('dispatch_number');

  if (!token && !dispatchNumber) {
    return new Response(
      JSON.stringify({ error: 'token or dispatch_number query parameter required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  let dispatchId: string | null = null;

  if (token) {
    const { data: tokenData } = await supabase
      .from('tracking_tokens')
      .select('dispatch_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    dispatchId = tokenData?.dispatch_id || null;
  }

  if (dispatchNumber && !dispatchId) {
    const { data: dispatchData } = await supabase
      .from('dispatches')
      .select('id')
      .eq('dispatch_number', dispatchNumber)
      .single();
    
    dispatchId = dispatchData?.id || null;
  }

  if (!dispatchId) {
    return new Response(
      JSON.stringify({ error: 'Shipment not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get dispatch with latest updates
  const { data: dispatch } = await supabase
    .from('dispatches')
    .select(`
      dispatch_number,
      status,
      pickup_address,
      delivery_address,
      scheduled_pickup,
      scheduled_delivery,
      actual_pickup,
      actual_delivery,
      delivery_updates (
        status,
        location,
        created_at
      )
    `)
    .eq('id', dispatchId)
    .single();

  if (!dispatch) {
    return new Response(
      JSON.stringify({ error: 'Shipment not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ tracking: dispatch }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleDispatchesList(url: URL, partnerId: string, scopes: string[]): Promise<Response> {
  if (!scopes.includes('dispatch:read')) {
    return new Response(
      JSON.stringify({ error: 'Scope dispatch:read required' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const status = url.searchParams.get('status');

  let query = supabase
    .from('dispatches')
    .select(`
      id,
      dispatch_number,
      status,
      pickup_address,
      delivery_address,
      scheduled_pickup,
      scheduled_delivery,
      actual_pickup,
      actual_delivery,
      created_at
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by partner's drivers
  const { data: driverIds } = await supabase
    .from('drivers')
    .select('id')
    .eq('partner_id', partnerId);

  if (driverIds && driverIds.length > 0) {
    query = query.in('driver_id', driverIds.map(d => d.id));
  } else {
    // Partner has no drivers, return empty
    return new Response(
      JSON.stringify({ dispatches: [], total: 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ dispatches: data, total: count || data.length }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCreateDispatch(body: string, partnerId: string, scopes: string[]): Promise<Response> {
  if (!scopes.includes('dispatch:write')) {
    return new Response(
      JSON.stringify({ error: 'Scope dispatch:write required' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Parse and validate request body
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate required fields
  const required = ['customer_id', 'pickup_address', 'delivery_address'];
  const missing = required.filter(f => !data[f]);
  
  if (missing.length > 0) {
    return new Response(
      JSON.stringify({ error: `Missing required fields: ${missing.join(', ')}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify customer exists
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .eq('id', data.customer_id)
    .single();

  if (customerError || !customer) {
    return new Response(
      JSON.stringify({ error: 'Invalid customer_id' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create dispatch
  const { data: dispatch, error: createError } = await supabase
    .from('dispatches')
    .insert({
      customer_id: data.customer_id,
      pickup_address: data.pickup_address,
      delivery_address: data.delivery_address,
      scheduled_pickup: data.scheduled_pickup || null,
      scheduled_delivery: data.scheduled_delivery || null,
      cargo_description: data.cargo_description || null,
      cargo_weight_kg: data.cargo_weight_kg || null,
      notes: data.notes || null,
      priority: data.priority || 'normal',
      status: 'pending',
      approval_status: 'pending',
    })
    .select('id, dispatch_number, status')
    .single();

  if (createError) {
    return new Response(
      JSON.stringify({ error: createError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      message: 'Dispatch created successfully',
      dispatch,
    }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleInvoicesList(url: URL, partnerId: string, scopes: string[]): Promise<Response> {
  if (!scopes.includes('invoice:read')) {
    return new Response(
      JSON.stringify({ error: 'Scope invoice:read required' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  // Get invoices for dispatches assigned to partner's drivers
  const { data: driverIds } = await supabase
    .from('drivers')
    .select('id')
    .eq('partner_id', partnerId);

  if (!driverIds || driverIds.length === 0) {
    return new Response(
      JSON.stringify({ invoices: [], total: 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get dispatches for these drivers
  const { data: dispatchIds } = await supabase
    .from('dispatches')
    .select('id')
    .in('driver_id', driverIds.map(d => d.id));

  if (!dispatchIds || dispatchIds.length === 0) {
    return new Response(
      JSON.stringify({ invoices: [], total: 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      amount,
      total_amount,
      status,
      due_date,
      created_at
    `)
    .in('dispatch_id', dispatchIds.map(d => d.id))
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ invoices: data, total: data.length }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
