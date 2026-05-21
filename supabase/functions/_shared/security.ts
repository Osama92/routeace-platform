// Shared security utilities for edge functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? Deno.env.get('SUPABASE_URL') ?? 'https://routeace.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

export interface JWTClaims {
  sub: string;
  email?: string;
  role?: string;
  exp?: number;
}

export interface ApiKeyValidation {
  valid: boolean;
  keyId?: string;
  partnerId?: string;
  scopes?: string[];
  error?: string;
}

/**
 * Validates JWT token and returns user claims
 * Use for internal authenticated endpoints
 */
export async function validateJWT(
  authHeader: string | null,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{ valid: boolean; claims?: JWTClaims; error?: string }> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid Authorization header' };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data, error } = await supabase.auth.getClaims(token);
    
    if (error || !data?.claims) {
      return { valid: false, error: error?.message || 'Invalid token' };
    }

    return {
      valid: true,
      claims: {
        sub: data.claims.sub as string,
        email: data.claims.email as string | undefined,
        role: data.claims.role as string | undefined,
        exp: data.claims.exp as number | undefined,
      }
    };
  } catch (err) {
    return { valid: false, error: 'Token validation failed' };
  }
}

/**
 * Validates API key for external partner access
 * Use for partner-facing API endpoints
 */
export async function validateApiKey(
  apiKey: string | null,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<ApiKeyValidation> {
  if (!apiKey) {
    return { valid: false, error: 'Missing API key' };
  }

  // API keys should be in format: ra_live_xxxxxxxxxxxx or ra_test_xxxxxxxxxxxx
  if (!apiKey.startsWith('ra_live_') && !apiKey.startsWith('ra_test_')) {
    return { valid: false, error: 'Invalid API key format' };
  }

  const keyPrefix = apiKey.substring(0, 8);
  const keyHash = await hashApiKey(apiKey);

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, partner_id, scopes, is_active, expires_at, rate_limit_per_minute, rate_limit_per_day')
    .eq('key_hash', keyHash)
    .eq('key_prefix', keyPrefix)
    .is('revoked_at', null)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Invalid API key' };
  }

  if (!data.is_active) {
    return { valid: false, error: 'API key is inactive' };
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: 'API key has expired' };
  }

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return {
    valid: true,
    keyId: data.id,
    partnerId: data.partner_id,
    scopes: data.scopes || [],
  };
}

/**
 * Check if request is within rate limits
 */
export async function checkRateLimit(
  apiKeyId: string,
  limitPerMinute: number,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const bucketWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
  const resetAt = new Date(bucketWindow.getTime() + 60000);

  // Atomic upsert: INSERT ... ON CONFLICT DO UPDATE SET request_count = request_count + 1
  // This eliminates the read-then-write TOCTOU race condition.
  const { data, error } = await supabase.rpc('increment_rate_limit_bucket', {
    p_api_key_id: apiKeyId,
    p_bucket_window: bucketWindow.toISOString(),
    p_limit: limitPerMinute,
  });

  if (error) {
    // Fail open on DB error to avoid blocking all requests on infrastructure issues
    console.error('Rate limit check failed', { error });
    return { allowed: true, remaining: 0, resetAt };
  }

  const count: number = data ?? 1;
  if (count > limitPerMinute) {
    return { allowed: false, remaining: 0, resetAt };
  }

  return { allowed: true, remaining: Math.max(0, limitPerMinute - count), resetAt };
}

/**
 * Log API request for auditing
 */
export async function logApiRequest(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  requestIp: string | null,
  userAgent: string | null,
  responseTimeMs: number,
  errorMessage: string | null,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  await supabase.from('api_request_logs').insert({
    api_key_id: apiKeyId,
    endpoint,
    method,
    status_code: statusCode,
    request_ip: requestIp,
    user_agent: userAgent,
    response_time_ms: responseTimeMs,
    error_message: errorMessage,
  });
}

/**
 * Log security event
 */
export async function logSecurityEvent(
  eventType: string,
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null,
  details: Record<string, unknown>,
  severity: 'info' | 'warn' | 'error' | 'critical',
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  await supabase.from('security_events').insert({
    event_type: eventType,
    user_id: userId,
    ip_address: ipAddress,
    user_agent: userAgent,
    details,
    severity,
  });
}

/**
 * Hash API key using SHA-256
 */
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate new API key
 */
export async function generateApiKey(prefix: 'ra_live_' | 'ra_test_' = 'ra_live_'): Promise<{ key: string; hash: string }> {
  const randomBytes = new Uint8Array(24);
  crypto.getRandomValues(randomBytes);
  const randomPart = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const key = `${prefix}${randomPart}`;
  const hash = await hashApiKey(key);
  
  return { key, hash };
}

/**
 * Check if user has required role
 */
export async function checkUserRole(
  userId: string,
  requiredRoles: string[],
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<boolean> {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error || !data) return false;
  
  return requiredRoles.includes(data.role);
}

/**
 * Sanitize input to prevent SQL injection (for dynamic queries)
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/'/g, "''")
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');
}

/**
 * Validate request payload size
 */
export function validatePayloadSize(body: string, maxSizeKB: number = 100): boolean {
  const sizeInBytes = new TextEncoder().encode(body).length;
  return sizeInBytes <= maxSizeKB * 1024;
}
