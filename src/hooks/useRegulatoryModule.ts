/**
 * Regulatory Module Hook
 * 
 * Provides country-specific compliance and regulatory configuration.
 * Falls back to generic rules when country-specific rules don't exist.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RegulatoryModule {
  id: string;
  countryCode: string;
  driverTaxRule: string;
  payrollStructure: string;
  dataPrivacyRule: string;
  transportComplianceRule: string;
  vatLogic: string;
  insuranceRequirement: string;
  fuelRegulation: string;
  carbonReportingRule: string;
  eldRequirement: string;
  customsIntegration: string;
  laborClassification: string;
  maxDrivingHours: number | null;
  restPeriodHours: number | null;
}

function mapRow(row: any): RegulatoryModule {
  return {
    id: row.id,
    countryCode: row.country_code,
    driverTaxRule: row.driver_tax_rule,
    payrollStructure: row.payroll_structure,
    dataPrivacyRule: row.data_privacy_rule,
    transportComplianceRule: row.transport_compliance_rule,
    vatLogic: row.vat_logic,
    insuranceRequirement: row.insurance_requirement,
    fuelRegulation: row.fuel_regulation,
    carbonReportingRule: row.carbon_reporting_rule,
    eldRequirement: row.eld_requirement,
    customsIntegration: row.customs_integration,
    laborClassification: row.labor_classification,
    maxDrivingHours: row.max_driving_hours,
    restPeriodHours: row.rest_period_hours,
  };
}

export function useRegulatoryModule(countryCode: string = 'NG') {
  return useQuery({
    queryKey: ['regulatory-module', countryCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regulatory_modules')
        .select('*')
        .eq('country_code', countryCode)
        .maybeSingle();
      if (error) throw error;
      return data ? mapRow(data) : null;
    },
    staleTime: 1000 * 60 * 30,
  });
}
