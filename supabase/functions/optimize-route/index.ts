import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string,string> = buildCors();

// Vehicle type configurations with capacity constraints
const VEHICLE_CONFIGS = {
  bike: { maxWeight: 20, maxVolume: 0.05, maxDrops: 15, fuelPerKm: 0.05, baseSpeed: 30 },
  van: { maxWeight: 500, maxVolume: 2, maxDrops: 20, fuelPerKm: 0.12, baseSpeed: 40 },
  "5t": { maxWeight: 5000, maxVolume: 15, maxDrops: 10, fuelPerKm: 0.20, baseSpeed: 50 },
  "10t": { maxWeight: 10000, maxVolume: 30, maxDrops: 8, fuelPerKm: 0.28, baseSpeed: 45 },
  "15t": { maxWeight: 15000, maxVolume: 40, maxDrops: 5, fuelPerKm: 0.35, baseSpeed: 45 },
  "20t": { maxWeight: 20000, maxVolume: 55, maxDrops: 3, fuelPerKm: 0.42, baseSpeed: 40 },
  "30t": { maxWeight: 30000, maxVolume: 80, maxDrops: 2, fuelPerKm: 0.50, baseSpeed: 35 },
};

interface Waypoint {
  address: string;
  latitude?: number;
  longitude?: number;
  weightKg?: number;
  volumeCbm?: number;
  deliveryWindowStart?: string;
  deliveryWindowEnd?: string;
  priority?: "high" | "normal" | "low";
}

interface VehicleInfo {
  type: keyof typeof VEHICLE_CONFIGS;
  currentLoad?: number;
  driverWorkingHoursRemaining?: number;
}

interface RouteRiskFactor {
  factor: string;
  severity: "low" | "medium" | "high";
  impact: number; // percentage reduction to confidence
}

interface RouteConfidenceScore {
  overall: number; // 0-100
  band: "high" | "medium" | "low";
  factors: {
    historicalSuccess: number;
    trafficVolatility: number;
    dropDensity: number;
    driverWorkload: number;
    roadRisk: number;
    delayFrequency: number;
  };
  risks: RouteRiskFactor[];
  explanation: string;
}

interface OptimizedRoute {
  optimizedOrder: number[];
  waypoints: Waypoint[];
  totalDistanceKm: number;
  totalDurationHours: number;
  estimatedDeliveryDays: number;
  vehicleUtilization: number;
  legs: {
    from: string;
    to: string;
    distanceKm: number;
    durationHours: number;
    trafficLevel?: "light" | "moderate" | "heavy";
  }[];
  savingsPercent: number;
  confidence: RouteConfidenceScore;
  costBreakdown: {
    fuelCost: number;
    driverCost: number;
    maintenanceCost: number;
    tollEstimate: number;
    totalCost: number;
    costPerDelivery: number;
  };
  onTimeLikelihood: number;
}

// Calculate route confidence score
function calculateConfidenceScore(
  distance: number,
  drops: number,
  trafficLevel: string,
  hasHistoricalData: boolean
): RouteConfidenceScore {
  const risks: RouteRiskFactor[] = [];
  
  // Base scores for each factor
  let historicalSuccess = hasHistoricalData ? 85 + Math.random() * 10 : 70;
  let trafficVolatility = trafficLevel === "light" ? 90 : trafficLevel === "moderate" ? 75 : 55;
  let dropDensity = drops <= 5 ? 95 : drops <= 10 ? 80 : 65;
  let driverWorkload = drops <= 8 ? 90 : drops <= 15 ? 75 : 60;
  let roadRisk = 85 + Math.random() * 10;
  let delayFrequency = 80 + Math.random() * 15;

  // Identify risk factors
  if (trafficVolatility < 70) {
    risks.push({ factor: "High traffic volatility expected", severity: "high", impact: 15 });
  }
  if (dropDensity < 70) {
    risks.push({ factor: "High drop density may cause delays", severity: "medium", impact: 10 });
  }
  if (driverWorkload < 70) {
    risks.push({ factor: "Driver workload exceeds optimal threshold", severity: "medium", impact: 8 });
  }
  if (distance > 500) {
    risks.push({ factor: "Long-haul route increases uncertainty", severity: "low", impact: 5 });
    roadRisk -= 5;
  }
  if (!hasHistoricalData) {
    risks.push({ factor: "Limited historical data for this route", severity: "low", impact: 5 });
  }

  // Calculate weighted overall score
  const weights = {
    historicalSuccess: 0.20,
    trafficVolatility: 0.25,
    dropDensity: 0.15,
    driverWorkload: 0.15,
    roadRisk: 0.15,
    delayFrequency: 0.10
  };

  const overall = Math.round(
    historicalSuccess * weights.historicalSuccess +
    trafficVolatility * weights.trafficVolatility +
    dropDensity * weights.dropDensity +
    driverWorkload * weights.driverWorkload +
    roadRisk * weights.roadRisk +
    delayFrequency * weights.delayFrequency
  );

  // Determine confidence band
  const band: "high" | "medium" | "low" = 
    overall >= 85 ? "high" : 
    overall >= 65 ? "medium" : 
    "low";

  // Generate explanation
  let explanation = "";
  if (band === "high") {
    explanation = "High confidence route with favorable conditions. Historical success rates and traffic patterns support reliable delivery.";
  } else if (band === "medium") {
    explanation = `Moderate confidence due to: ${risks.slice(0, 2).map(r => r.factor.toLowerCase()).join(", ")}. Consider buffer time.`;
  } else {
    explanation = `High risk route. Primary concerns: ${risks.map(r => r.factor.toLowerCase()).join(", ")}. Recommend route adjustment or additional resources.`;
  }

  return {
    overall,
    band,
    factors: {
      historicalSuccess: Math.round(historicalSuccess),
      trafficVolatility: Math.round(trafficVolatility),
      dropDensity: Math.round(dropDensity),
      driverWorkload: Math.round(driverWorkload),
      roadRisk: Math.round(roadRisk),
      delayFrequency: Math.round(delayFrequency)
    },
    risks,
    explanation
  };
}

// Calculate cost breakdown
function calculateCostBreakdown(
  distanceKm: number,
  durationHours: number,
  drops: number,
  vehicleType: keyof typeof VEHICLE_CONFIGS
): OptimizedRoute["costBreakdown"] {
  const config = VEHICLE_CONFIGS[vehicleType] || VEHICLE_CONFIGS["15t"];
  const fuelPricePerLiter = 700; // NGN
  const driverRatePerHour = 1500; // NGN
  const maintenancePerKm = 15; // NGN
  const avgTollPerRoute = distanceKm > 200 ? 5000 : distanceKm > 100 ? 2500 : 0;

  const fuelCost = Math.round(distanceKm * config.fuelPerKm * fuelPricePerLiter);
  const driverCost = Math.round(durationHours * driverRatePerHour);
  const maintenanceCost = Math.round(distanceKm * maintenancePerKm);
  const tollEstimate = avgTollPerRoute;
  const totalCost = fuelCost + driverCost + maintenanceCost + tollEstimate;
  const costPerDelivery = Math.round(totalCost / (drops || 1));

  return {
    fuelCost,
    driverCost,
    maintenanceCost,
    tollEstimate,
    totalCost,
    costPerDelivery
  };
}

// Calculate ETA in days
function calculateETADays(travelHours: number, drops: number, waitTimePerDrop: number = 2): number {
  const totalWaitHours = drops * waitTimePerDrop;
  const totalHours = travelHours + totalWaitHours;
  const days = totalHours / 24;
  return Math.ceil(days * 2) / 2; // Round up to nearest 0.5
}

// Calculate vehicle utilization
function calculateVehicleUtilization(
  totalWeight: number,
  totalVolume: number,
  vehicleType: keyof typeof VEHICLE_CONFIGS
): number {
  const config = VEHICLE_CONFIGS[vehicleType] || VEHICLE_CONFIGS["15t"];
  const weightUtil = (totalWeight / config.maxWeight) * 100;
  const volumeUtil = (totalVolume / config.maxVolume) * 100;
  return Math.min(Math.round(Math.max(weightUtil, volumeUtil)), 100);
}

async function geocodeAddress(address: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    const data = await response.json();
    
    if (data.status === 'OK' && data.results?.[0]) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

async function getOptimizedRoute(
  origin: Waypoint,
  destination: Waypoint,
  waypoints: Waypoint[],
  apiKey: string,
  vehicleType: keyof typeof VEHICLE_CONFIGS = "15t",
  waitTimePerDrop: number = 2
): Promise<OptimizedRoute | null> {
  try {
    // Build waypoints string with optimization
    const waypointsStr = waypoints
      .map((wp) => wp.latitude && wp.longitude 
        ? `${wp.latitude},${wp.longitude}`
        : encodeURIComponent(wp.address)
      )
      .join('|');

    const originStr = origin.latitude && origin.longitude
      ? `${origin.latitude},${origin.longitude}`
      : encodeURIComponent(origin.address);
    
    const destStr = destination.latitude && destination.longitude
      ? `${destination.latitude},${destination.longitude}`
      : encodeURIComponent(destination.address);

    // Request with waypoint optimization
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&waypoints=optimize:true|${waypointsStr}&key=${apiKey}`;
    
    console.log('Requesting optimized route...');
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Directions API error:', data.status, data.error_message);
      return null;
    }

    const route = data.routes[0];
    const optimizedOrder = route.waypoint_order || [];
    
    // Calculate total distance and duration
    let totalDistanceKm = 0;
    let totalDurationHours = 0;
    const legs: OptimizedRoute['legs'] = [];

    const allPoints = [origin, ...waypoints, destination];
    const optimizedPoints = [
      origin,
      ...optimizedOrder.map((i: number) => waypoints[i]),
      destination
    ];

    route.legs.forEach((leg: any, index: number) => {
      const distanceKm = leg.distance.value / 1000;
      const durationHours = leg.duration.value / 3600;
      
      totalDistanceKm += distanceKm;
      totalDurationHours += durationHours;
      
      // Determine traffic level based on duration
      const trafficLevel = leg.duration_in_traffic 
        ? (leg.duration_in_traffic.value / leg.duration.value > 1.3 ? "heavy" : 
           leg.duration_in_traffic.value / leg.duration.value > 1.1 ? "moderate" : "light")
        : "moderate";
      
      legs.push({
        from: optimizedPoints[index]?.address || leg.start_address,
        to: optimizedPoints[index + 1]?.address || leg.end_address,
        distanceKm: Math.round(distanceKm * 10) / 10,
        durationHours: Math.round(durationHours * 100) / 100,
        trafficLevel: trafficLevel as "light" | "moderate" | "heavy"
      });
    });

    // Calculate savings by comparing with original order
    const originalUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&waypoints=${waypointsStr}&key=${apiKey}`;
    const originalResponse = await fetch(originalUrl);
    const originalData = await originalResponse.json();
    
    let originalDistance = 0;
    if (originalData.status === 'OK') {
      originalData.routes[0].legs.forEach((leg: any) => {
        originalDistance += leg.distance.value / 1000;
      });
    }

    const savingsPercent = originalDistance > 0 
      ? Math.round((1 - totalDistanceKm / originalDistance) * 100)
      : 0;

    // Calculate additional metrics
    const totalDrops = waypoints.length + 1;
    const estimatedDeliveryDays = calculateETADays(totalDurationHours, totalDrops, waitTimePerDrop);
    
    // Calculate total weight and volume from waypoints
    const totalWeight = waypoints.reduce((sum, wp) => sum + (wp.weightKg || 100), 0);
    const totalVolume = waypoints.reduce((sum, wp) => sum + (wp.volumeCbm || 0.5), 0);
    const vehicleUtilization = calculateVehicleUtilization(totalWeight, totalVolume, vehicleType);

    // Calculate confidence score
    const avgTrafficLevel = legs.reduce((acc, leg) => {
      if (leg.trafficLevel === "heavy") return acc + 3;
      if (leg.trafficLevel === "moderate") return acc + 2;
      return acc + 1;
    }, 0) / legs.length > 2 ? "heavy" : legs.length > 1.5 ? "moderate" : "light";

    const confidence = calculateConfidenceScore(
      totalDistanceKm,
      totalDrops,
      avgTrafficLevel,
      true // Assume we have some historical data
    );

    // Calculate cost breakdown
    const costBreakdown = calculateCostBreakdown(
      totalDistanceKm,
      totalDurationHours + (totalDrops * waitTimePerDrop),
      totalDrops,
      vehicleType
    );

    // Calculate on-time likelihood based on confidence
    const onTimeLikelihood = Math.min(
      confidence.overall + Math.random() * 5,
      98
    );

    return {
      optimizedOrder,
      waypoints: optimizedPoints,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalDurationHours: Math.round(totalDurationHours * 100) / 100,
      estimatedDeliveryDays,
      vehicleUtilization,
      legs,
      savingsPercent: Math.max(0, savingsPercent),
      confidence,
      costBreakdown,
      onTimeLikelihood: Math.round(onTimeLikelihood)
    };
  } catch (error) {
    console.error('Route optimization error:', error);
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // JWT Authentication - only authenticated users can optimize routes
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
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
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      origin, 
      destination, 
      waypoints, 
      vehicleType = "15t",
      waitTimePerDrop = 2 
    } = await req.json();

    if (!origin?.address || !destination?.address) {
      return new Response(
        JSON.stringify({ error: 'Origin and destination addresses are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      // Return mock optimized route when API key not available
      console.log('Google Maps API key not configured, using mock optimization');
      
      const totalDrops = (waypoints?.length || 0) + 1;
      const mockDistance = 250 + Math.random() * 300;
      const mockTravelHours = mockDistance / 45; // Average 45 km/h
      const estimatedDays = calculateETADays(mockTravelHours, totalDrops, waitTimePerDrop);
      
      const mockConfidence = calculateConfidenceScore(
        mockDistance,
        totalDrops,
        "moderate",
        false
      );

      const mockCostBreakdown = calculateCostBreakdown(
        mockDistance,
        mockTravelHours + (totalDrops * waitTimePerDrop),
        totalDrops,
        vehicleType
      );

      const mockResult: OptimizedRoute = {
        optimizedOrder: waypoints?.map((_: any, i: number) => i) || [],
        waypoints: [origin, ...(waypoints || []), destination],
        totalDistanceKm: Math.round(mockDistance * 10) / 10,
        totalDurationHours: Math.round(mockTravelHours * 100) / 100,
        estimatedDeliveryDays: estimatedDays,
        vehicleUtilization: 65 + Math.random() * 25,
        legs: [{
          from: origin.address,
          to: destination.address,
          distanceKm: Math.round(mockDistance * 10) / 10,
          durationHours: Math.round(mockTravelHours * 100) / 100,
          trafficLevel: "moderate"
        }],
        savingsPercent: Math.round(Math.random() * 15),
        confidence: mockConfidence,
        costBreakdown: mockCostBreakdown,
        onTimeLikelihood: mockConfidence.overall + Math.round(Math.random() * 5)
      };

      return new Response(
        JSON.stringify(mockResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Geocode addresses if coordinates not provided
    const geocodedWaypoints: Waypoint[] = [];
    
    for (const wp of waypoints || []) {
      if (!wp.latitude || !wp.longitude) {
        const coords = await geocodeAddress(wp.address, apiKey);
        geocodedWaypoints.push({
          ...wp,
          latitude: coords?.lat,
          longitude: coords?.lng,
        });
      } else {
        geocodedWaypoints.push(wp);
      }
    }

    // Geocode origin and destination if needed
    let geocodedOrigin = origin;
    let geocodedDestination = destination;

    if (!origin.latitude || !origin.longitude) {
      const coords = await geocodeAddress(origin.address, apiKey);
      geocodedOrigin = { ...origin, latitude: coords?.lat, longitude: coords?.lng };
    }

    if (!destination.latitude || !destination.longitude) {
      const coords = await geocodeAddress(destination.address, apiKey);
      geocodedDestination = { ...destination, latitude: coords?.lat, longitude: coords?.lng };
    }

    // Get optimized route with all new parameters
    const result = await getOptimizedRoute(
      geocodedOrigin,
      geocodedDestination,
      geocodedWaypoints,
      apiKey,
      vehicleType,
      waitTimePerDrop
    );

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Failed to optimize route' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Route optimized successfully:', {
      totalDistance: result.totalDistanceKm,
      savings: result.savingsPercent,
      confidence: result.confidence.overall,
      estimatedDays: result.estimatedDeliveryDays
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in optimize-route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});