 /**
  * API Response Validator - Section M (Stability Layer)
  * Validates API responses and provides error prevention
  */
 
 export interface ValidationResult {
   valid: boolean;
   errors: string[];
   data?: any;
 }
 
 /**
  * Validates that a response is a valid JSON object
  */
 export function validateJSONResponse(data: unknown): ValidationResult {
   const errors: string[] = [];
 
   if (data === null || data === undefined) {
     errors.push("Response is null or undefined");
     return { valid: false, errors };
   }
 
   if (typeof data !== "object" || Array.isArray(data)) {
     errors.push("Response must be a single JSON object");
     return { valid: false, errors };
   }
 
   return { valid: true, errors: [], data };
 }
 
 /**
  * Validates required fields exist in response
  */
 export function validateRequiredFields(
   data: Record<string, any>,
   requiredFields: string[]
 ): ValidationResult {
   const errors: string[] = [];
 
   for (const field of requiredFields) {
     if (!(field in data) || data[field] === null || data[field] === undefined) {
       errors.push(`Missing required field: ${field}`);
     }
   }
 
   return { valid: errors.length === 0, errors, data };
 }
 
 /**
  * Validates numeric fields are not negative
  */
 export function validateNonNegativeNumbers(
   data: Record<string, any>,
   numericFields: string[]
 ): ValidationResult {
   const errors: string[] = [];
 
   for (const field of numericFields) {
     if (field in data && typeof data[field] === "number" && data[field] < 0) {
       errors.push(`Field ${field} cannot be negative`);
     }
   }
 
   return { valid: errors.length === 0, errors, data };
 }
 
 /**
  * Prevents divide by zero for calculations
  */
 export function safeDivide(numerator: number, denominator: number, fallback: number = 0): number {
   if (denominator === 0 || !isFinite(denominator)) {
     return fallback;
   }
   const result = numerator / denominator;
   return isFinite(result) ? result : fallback;
 }
 
 /**
  * Validates profit margin calculation
  */
 export function validateProfitMargin(revenue: number, cost: number): ValidationResult {
   const errors: string[] = [];
 
   if (revenue <= 0) {
     errors.push("Revenue must be greater than zero for margin calculation");
     return { valid: false, errors };
   }
 
   const margin = safeDivide(revenue - cost, revenue) * 100;
 
   if (margin < 0) {
     // Flag but don't block - negative margins are valid business data
     console.warn(`Negative profit margin detected: ${margin.toFixed(2)}%`);
   }
 
   return { valid: true, errors: [], data: { margin, revenue, cost } };
 }
 
 /**
  * Cache invalidation helper
  */
 export function createCacheKey(...parts: (string | number)[]): string {
   return parts.join(":");
 }
 
 /**
  * State synchronization helper
  */
 export async function syncStateWithDB<T>(
   localState: T,
   fetchFromDB: () => Promise<T>,
   onMismatch?: (local: T, remote: T) => void
 ): Promise<T> {
   const remoteState = await fetchFromDB();
   
   if (JSON.stringify(localState) !== JSON.stringify(remoteState)) {
     onMismatch?.(localState, remoteState);
     return remoteState;
   }
   
   return localState;
 }
 
 /**
  * Error logging with context
  */
 export function logError(error: Error, context: Record<string, any> = {}): void {
   console.error("[RouteAce Error]", {
     message: error.message,
     stack: error.stack,
     timestamp: new Date().toISOString(),
     ...context,
   });
 }
 
 /**
  * Retry mechanism for failed operations
  */
 export async function withRetry<T>(
   operation: () => Promise<T>,
   maxAttempts: number = 2,
   delayMs: number = 1000
 ): Promise<T> {
   let lastError: Error | null = null;
   
   for (let attempt = 1; attempt <= maxAttempts; attempt++) {
     try {
       return await operation();
     } catch (error) {
       lastError = error as Error;
       logError(lastError, { attempt, maxAttempts });
       
       if (attempt < maxAttempts) {
         await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
       }
     }
   }
   
   throw lastError;
 }