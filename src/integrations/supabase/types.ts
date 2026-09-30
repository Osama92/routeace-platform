export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_governance_log: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string
          created_at: string | null
          id: string
          new_role: string | null
          os_context: string
          previous_role: string | null
          reason: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id: string
          created_at?: string | null
          id?: string
          new_role?: string | null
          os_context?: string
          previous_role?: string | null
          reason?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string
          created_at?: string | null
          id?: string
          new_role?: string | null
          os_context?: string
          previous_role?: string | null
          reason?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      accident_risk_scores: {
        Row: {
          ai_reasoning: string | null
          created_at: string | null
          dispatch_id: string | null
          dispatch_recommendation: string | null
          driver_behavior_risk: number | null
          driver_id: string
          fatigue_risk: number | null
          id: string
          incident_history_risk: number | null
          load_risk: number | null
          overall_risk_score: number | null
          risk_level: string | null
          route_description: string | null
          route_risk: number | null
          vehicle_condition_risk: number | null
          vehicle_id: string | null
          weather_risk: number | null
        }
        Insert: {
          ai_reasoning?: string | null
          created_at?: string | null
          dispatch_id?: string | null
          dispatch_recommendation?: string | null
          driver_behavior_risk?: number | null
          driver_id: string
          fatigue_risk?: number | null
          id?: string
          incident_history_risk?: number | null
          load_risk?: number | null
          overall_risk_score?: number | null
          risk_level?: string | null
          route_description?: string | null
          route_risk?: number | null
          vehicle_condition_risk?: number | null
          vehicle_id?: string | null
          weather_risk?: number | null
        }
        Update: {
          ai_reasoning?: string | null
          created_at?: string | null
          dispatch_id?: string | null
          dispatch_recommendation?: string | null
          driver_behavior_risk?: number | null
          driver_id?: string
          fatigue_risk?: number | null
          id?: string
          incident_history_risk?: number | null
          load_risk?: number | null
          overall_risk_score?: number | null
          risk_level?: string | null
          route_description?: string | null
          route_risk?: number | null
          vehicle_condition_risk?: number | null
          vehicle_id?: string | null
          weather_risk?: number | null
        }
        Relationships: []
      }
      accounting_ledger: {
        Row: {
          account_name: string
          account_type: string
          created_at: string
          credit: number
          currency_code: string | null
          debit: number
          description: string | null
          entry_date: string
          id: string
          organization_id: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string
        }
        Insert: {
          account_name: string
          account_type: string
          created_at?: string
          credit?: number
          currency_code?: string | null
          debit?: number
          description?: string | null
          entry_date?: string
          id?: string
          organization_id?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type: string
        }
        Update: {
          account_name?: string
          account_type?: string
          created_at?: string
          credit?: number
          currency_code?: string | null
          debit?: number
          description?: string | null
          entry_date?: string
          id?: string
          organization_id?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string
        }
        Relationships: []
      }
      accounts_payable: {
        Row: {
          amount_due: number
          amount_paid: number
          balance: number
          category: string | null
          created_at: string
          created_by: string | null
          currency_code: string | null
          due_date: string | null
          id: string
          notes: string | null
          organization_id: string | null
          posting_date: string
          reference_number: string | null
          status: string
          updated_at: string
          vendor_name: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          balance?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          posting_date?: string
          reference_number?: string | null
          status?: string
          updated_at?: string
          vendor_name: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          balance?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          posting_date?: string
          reference_number?: string | null
          status?: string
          updated_at?: string
          vendor_name?: string
        }
        Relationships: []
      }
      accounts_receivable: {
        Row: {
          amount_due: number
          amount_paid: number
          balance: number
          created_at: string
          currency_code: string | null
          customer_id: string | null
          due_date: string | null
          id: string
          invoice_id: string | null
          organization_id: string | null
          posting_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          balance?: number
          created_at?: string
          currency_code?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_id?: string | null
          organization_id?: string | null
          posting_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          balance?: number
          created_at?: string
          currency_code?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_id?: string | null
          organization_id?: string | null
          posting_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_profiles: {
        Row: {
          address_verified: boolean | null
          bank_verified: boolean | null
          compliance_score: number | null
          country: string
          created_at: string
          financial_trust_score: number | null
          government_id_verified: boolean | null
          id: string
          insurance_status: string | null
          is_active: boolean | null
          rating: number | null
          reliability_score: number | null
          service_type: string
          total_deliveries: number | null
          updated_at: string
          user_id: string | null
          vehicle_registered: boolean | null
          verification_level: string | null
          wallet_id: string | null
        }
        Insert: {
          address_verified?: boolean | null
          bank_verified?: boolean | null
          compliance_score?: number | null
          country: string
          created_at?: string
          financial_trust_score?: number | null
          government_id_verified?: boolean | null
          id?: string
          insurance_status?: string | null
          is_active?: boolean | null
          rating?: number | null
          reliability_score?: number | null
          service_type: string
          total_deliveries?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle_registered?: boolean | null
          verification_level?: string | null
          wallet_id?: string | null
        }
        Update: {
          address_verified?: boolean | null
          bank_verified?: boolean | null
          compliance_score?: number | null
          country?: string
          created_at?: string
          financial_trust_score?: number | null
          government_id_verified?: boolean | null
          id?: string
          insurance_status?: string | null
          is_active?: boolean | null
          rating?: number | null
          reliability_score?: number | null
          service_type?: string
          total_deliveries?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle_registered?: boolean | null
          verification_level?: string | null
          wallet_id?: string | null
        }
        Relationships: []
      }
      agri_input_compliance: {
        Row: {
          batch_approval_number: string | null
          blocked_reason: string | null
          created_at: string
          farm_geo_lat: number | null
          farm_geo_lng: number | null
          id: string
          is_compliant: boolean
          order_id: string | null
          safety_certificate_url: string | null
          verified_by: string | null
        }
        Insert: {
          batch_approval_number?: string | null
          blocked_reason?: string | null
          created_at?: string
          farm_geo_lat?: number | null
          farm_geo_lng?: number | null
          id?: string
          is_compliant?: boolean
          order_id?: string | null
          safety_certificate_url?: string | null
          verified_by?: string | null
        }
        Update: {
          batch_approval_number?: string | null
          blocked_reason?: string | null
          created_at?: string
          farm_geo_lat?: number | null
          farm_geo_lng?: number | null
          id?: string
          is_compliant?: boolean
          order_id?: string | null
          safety_certificate_url?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      agri_team_members: {
        Row: {
          agri_role: string
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agri_role: string
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agri_role?: string
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_credit_transactions: {
        Row: {
          action_id: string
          action_label: string
          balance_after: number
          created_at: string
          credits_consumed: number
          credits_purchased: number
          id: string
          metadata: Json | null
          module_context: string | null
          os_context: string
          user_id: string
        }
        Insert: {
          action_id: string
          action_label: string
          balance_after?: number
          created_at?: string
          credits_consumed?: number
          credits_purchased?: number
          id?: string
          metadata?: Json | null
          module_context?: string | null
          os_context?: string
          user_id: string
        }
        Update: {
          action_id?: string
          action_label?: string
          balance_after?: number
          created_at?: string
          credits_consumed?: number
          credits_purchased?: number
          id?: string
          metadata?: Json | null
          module_context?: string | null
          os_context?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_decision_log: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          decision_type: string
          execution_result: Json | null
          id: string
          input_summary: string | null
          module_key: string
          output_summary: string | null
          overridden_by: string | null
          override_reason: string | null
          was_executed: boolean | null
          was_overridden: boolean | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          decision_type: string
          execution_result?: Json | null
          id?: string
          input_summary?: string | null
          module_key: string
          output_summary?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          was_executed?: boolean | null
          was_overridden?: boolean | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          decision_type?: string
          execution_result?: Json | null
          id?: string
          input_summary?: string | null
          module_key?: string
          output_summary?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          was_executed?: boolean | null
          was_overridden?: boolean | null
        }
        Relationships: []
      }
      ai_employee_actions: {
        Row: {
          action_type: string
          approved_at: string | null
          approved_by: string | null
          confidence_score: number | null
          cost_impact: number | null
          created_at: string | null
          description: string
          employee_id: string | null
          execution_result: Json | null
          id: string
          impact_summary: string | null
          reasoning: string | null
          rejected_reason: string | null
          revenue_impact: number | null
          role_key: string
          status: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          approved_at?: string | null
          approved_by?: string | null
          confidence_score?: number | null
          cost_impact?: number | null
          created_at?: string | null
          description: string
          employee_id?: string | null
          execution_result?: Json | null
          id?: string
          impact_summary?: string | null
          reasoning?: string | null
          rejected_reason?: string | null
          revenue_impact?: number | null
          role_key: string
          status?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          approved_at?: string | null
          approved_by?: string | null
          confidence_score?: number | null
          cost_impact?: number | null
          created_at?: string | null
          description?: string
          employee_id?: string | null
          execution_result?: Json | null
          id?: string
          impact_summary?: string | null
          reasoning?: string | null
          rejected_reason?: string | null
          revenue_impact?: number | null
          role_key?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_employee_actions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_employees: {
        Row: {
          autonomy_mode: string
          confidence_score: number | null
          created_at: string | null
          current_task: string | null
          daily_metrics: Json | null
          display_name: string
          id: string
          last_action_at: string | null
          last_action_summary: string | null
          next_suggested_action: string | null
          performance_level: string | null
          role_key: string
          status: string
          tasks_completed_today: number | null
          tasks_completed_total: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          autonomy_mode?: string
          confidence_score?: number | null
          created_at?: string | null
          current_task?: string | null
          daily_metrics?: Json | null
          display_name: string
          id?: string
          last_action_at?: string | null
          last_action_summary?: string | null
          next_suggested_action?: string | null
          performance_level?: string | null
          role_key: string
          status?: string
          tasks_completed_today?: number | null
          tasks_completed_total?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          autonomy_mode?: string
          confidence_score?: number | null
          created_at?: string | null
          current_task?: string | null
          daily_metrics?: Json | null
          display_name?: string
          id?: string
          last_action_at?: string | null
          last_action_summary?: string | null
          next_suggested_action?: string | null
          performance_level?: string | null
          role_key?: string
          status?: string
          tasks_completed_today?: number | null
          tasks_completed_total?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_expansion_opportunities: {
        Row: {
          confidence_level: number | null
          created_at: string | null
          demand_signals: Json | null
          destination: string | null
          drivers_required: number | null
          estimated_monthly_cost: number | null
          estimated_monthly_revenue: number | null
          estimated_profit_margin: number | null
          fleet_required: number | null
          id: string
          investment_required: number | null
          missed_requests: number | null
          opportunity_type: string | null
          origin: string | null
          recommendation: string | null
          risk_level: string | null
          simulation_results: Json | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence_level?: number | null
          created_at?: string | null
          demand_signals?: Json | null
          destination?: string | null
          drivers_required?: number | null
          estimated_monthly_cost?: number | null
          estimated_monthly_revenue?: number | null
          estimated_profit_margin?: number | null
          fleet_required?: number | null
          id?: string
          investment_required?: number | null
          missed_requests?: number | null
          opportunity_type?: string | null
          origin?: string | null
          recommendation?: string | null
          risk_level?: string | null
          simulation_results?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence_level?: number | null
          created_at?: string | null
          demand_signals?: Json | null
          destination?: string | null
          drivers_required?: number | null
          estimated_monthly_cost?: number | null
          estimated_monthly_revenue?: number | null
          estimated_profit_margin?: number | null
          fleet_required?: number | null
          id?: string
          investment_required?: number | null
          missed_requests?: number | null
          opportunity_type?: string | null
          origin?: string | null
          recommendation?: string | null
          risk_level?: string | null
          simulation_results?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_hiring_recommendations: {
        Row: {
          candidate_score_formula: Json | null
          cost_of_not_hiring: number | null
          created_at: string | null
          current_capacity_pct: number | null
          expected_kpis: string[] | null
          id: string
          projected_improvement_pct: number | null
          recommended_role: string
          responsibilities: string[] | null
          salary_range_max: number | null
          salary_range_min: number | null
          status: string | null
          trigger_reason: string
          urgency: string | null
          user_id: string
        }
        Insert: {
          candidate_score_formula?: Json | null
          cost_of_not_hiring?: number | null
          created_at?: string | null
          current_capacity_pct?: number | null
          expected_kpis?: string[] | null
          id?: string
          projected_improvement_pct?: number | null
          recommended_role: string
          responsibilities?: string[] | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          status?: string | null
          trigger_reason: string
          urgency?: string | null
          user_id: string
        }
        Update: {
          candidate_score_formula?: Json | null
          cost_of_not_hiring?: number | null
          created_at?: string | null
          current_capacity_pct?: number | null
          expected_kpis?: string[] | null
          id?: string
          projected_improvement_pct?: number | null
          recommended_role?: string
          responsibilities?: string[] | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          status?: string | null
          trigger_reason?: string
          urgency?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_learning_logs: {
        Row: {
          accuracy_after: number | null
          accuracy_before: number | null
          adaptation_made: string | null
          created_at: string | null
          data_points_used: number | null
          id: string
          pattern_description: string
          pattern_type: string
          role_key: string
          user_id: string
        }
        Insert: {
          accuracy_after?: number | null
          accuracy_before?: number | null
          adaptation_made?: string | null
          created_at?: string | null
          data_points_used?: number | null
          id?: string
          pattern_description: string
          pattern_type: string
          role_key: string
          user_id: string
        }
        Update: {
          accuracy_after?: number | null
          accuracy_before?: number | null
          adaptation_made?: string | null
          created_at?: string | null
          data_points_used?: number | null
          id?: string
          pattern_description?: string
          pattern_type?: string
          role_key?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_negotiations: {
        Row: {
          counterparty_name: string
          created_at: string | null
          final_price: number | null
          id: string
          initial_quote: number | null
          market_benchmark: number | null
          messages: Json | null
          negotiation_type: string
          route_or_context: string | null
          savings_amount: number | null
          status: string | null
          strategy_notes: string | null
          target_price: number | null
          updated_at: string | null
          user_id: string
          vendor_score: number | null
          walkaway_price: number | null
        }
        Insert: {
          counterparty_name: string
          created_at?: string | null
          final_price?: number | null
          id?: string
          initial_quote?: number | null
          market_benchmark?: number | null
          messages?: Json | null
          negotiation_type: string
          route_or_context?: string | null
          savings_amount?: number | null
          status?: string | null
          strategy_notes?: string | null
          target_price?: number | null
          updated_at?: string | null
          user_id: string
          vendor_score?: number | null
          walkaway_price?: number | null
        }
        Update: {
          counterparty_name?: string
          created_at?: string | null
          final_price?: number | null
          id?: string
          initial_quote?: number | null
          market_benchmark?: number | null
          messages?: Json | null
          negotiation_type?: string
          route_or_context?: string | null
          savings_amount?: number | null
          status?: string | null
          strategy_notes?: string | null
          target_price?: number | null
          updated_at?: string | null
          user_id?: string
          vendor_score?: number | null
          walkaway_price?: number | null
        }
        Relationships: []
      }
      ai_workforce_config: {
        Row: {
          ai_tier: string | null
          approval_preference: string | null
          business_profile: Json | null
          created_at: string | null
          daily_report_channels: string[] | null
          id: string
          onboarding_completed: boolean | null
          system_mode: string | null
          updated_at: string | null
          user_id: string
          voice_preference: string | null
        }
        Insert: {
          ai_tier?: string | null
          approval_preference?: string | null
          business_profile?: Json | null
          created_at?: string | null
          daily_report_channels?: string[] | null
          id?: string
          onboarding_completed?: boolean | null
          system_mode?: string | null
          updated_at?: string | null
          user_id: string
          voice_preference?: string | null
        }
        Update: {
          ai_tier?: string | null
          approval_preference?: string | null
          business_profile?: Json | null
          created_at?: string | null
          daily_report_channels?: string[] | null
          id?: string
          onboarding_completed?: boolean | null
          system_mode?: string | null
          updated_at?: string | null
          user_id?: string
          voice_preference?: string | null
        }
        Relationships: []
      }
      alert_dispatch_log: {
        Row: {
          alert_kind: string
          channel: string
          created_at: string
          delivery_status: string
          error_message: string | null
          id: string
          message: string
          provider: string | null
          provider_response: Json | null
          recipient: string
          recipient_user_id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          subject: string | null
        }
        Insert: {
          alert_kind: string
          channel: string
          created_at?: string
          delivery_status?: string
          error_message?: string | null
          id?: string
          message: string
          provider?: string | null
          provider_response?: Json | null
          recipient: string
          recipient_user_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          subject?: string | null
        }
        Update: {
          alert_kind?: string
          channel?: string
          created_at?: string
          delivery_status?: string
          error_message?: string | null
          id?: string
          message?: string
          provider?: string | null
          provider_response?: Json | null
          recipient?: string
          recipient_user_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      api_contracts: {
        Row: {
          allowed_fields: string[] | null
          api_version: string
          contract_name: string
          created_at: string | null
          endpoint_path: string
          id: string
          is_active: boolean | null
          method: string
          rate_limit_per_minute: number | null
          request_schema: Json
          response_schema: Json
          restricted_fields: string[] | null
          source_os: string
          target_os: string
          updated_at: string | null
        }
        Insert: {
          allowed_fields?: string[] | null
          api_version?: string
          contract_name: string
          created_at?: string | null
          endpoint_path: string
          id?: string
          is_active?: boolean | null
          method?: string
          rate_limit_per_minute?: number | null
          request_schema?: Json
          response_schema?: Json
          restricted_fields?: string[] | null
          source_os: string
          target_os: string
          updated_at?: string | null
        }
        Update: {
          allowed_fields?: string[] | null
          api_version?: string
          contract_name?: string
          created_at?: string | null
          endpoint_path?: string
          id?: string
          is_active?: boolean | null
          method?: string
          rate_limit_per_minute?: number | null
          request_schema?: Json
          response_schema?: Json
          restricted_fields?: string[] | null
          source_os?: string
          target_os?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          partner_id: string | null
          rate_limit_per_day: number | null
          rate_limit_per_minute: number | null
          revoked_at: string | null
          revoked_by: string | null
          scopes: string[] | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          partner_id?: string | null
          rate_limit_per_day?: number | null
          rate_limit_per_minute?: number | null
          revoked_at?: string | null
          revoked_by?: string | null
          scopes?: string[] | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          partner_id?: string | null
          rate_limit_per_day?: number | null
          rate_limit_per_minute?: number | null
          revoked_at?: string | null
          revoked_by?: string | null
          scopes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      api_products: {
        Row: {
          bundled_credits: number | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          product_code: string
          product_name: string
          rate_limit_per_day: number | null
          rate_limit_per_minute: number | null
          requires_plan: string | null
          suggested_retail_price: number | null
          updated_at: string | null
          wholesale_price_per_call: number | null
        }
        Insert: {
          bundled_credits?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          product_code: string
          product_name: string
          rate_limit_per_day?: number | null
          rate_limit_per_minute?: number | null
          requires_plan?: string | null
          suggested_retail_price?: number | null
          updated_at?: string | null
          wholesale_price_per_call?: number | null
        }
        Update: {
          bundled_credits?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          product_code?: string
          product_name?: string
          rate_limit_per_day?: number | null
          rate_limit_per_minute?: number | null
          requires_plan?: string | null
          suggested_retail_price?: number | null
          updated_at?: string | null
          wholesale_price_per_call?: number | null
        }
        Relationships: []
      }
      api_request_logs: {
        Row: {
          api_key_id: string | null
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          method: string
          request_body_size: number | null
          request_ip: string | null
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          method: string
          request_body_size?: number | null
          request_ip?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          method?: string
          request_body_size?: number | null
          request_ip?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_subscriptions: {
        Row: {
          api_key_hash: string | null
          api_key_prefix: string | null
          api_product_id: string | null
          calls_limit_month: number | null
          calls_this_month: number | null
          created_at: string | null
          environment: string | null
          id: string
          is_active: boolean | null
          partner_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          api_key_hash?: string | null
          api_key_prefix?: string | null
          api_product_id?: string | null
          calls_limit_month?: number | null
          calls_this_month?: number | null
          created_at?: string | null
          environment?: string | null
          id?: string
          is_active?: boolean | null
          partner_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key_hash?: string | null
          api_key_prefix?: string | null
          api_product_id?: string | null
          calls_limit_month?: number | null
          calls_this_month?: number | null
          created_at?: string | null
          environment?: string | null
          id?: string
          is_active?: boolean | null
          partner_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_subscriptions_api_product_id_fkey"
            columns: ["api_product_id"]
            isOneToOne: false
            referencedRelation: "api_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_subscriptions_partner_customer_id_fkey"
            columns: ["partner_customer_id"]
            isOneToOne: false
            referencedRelation: "partner_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_delay_predictions: {
        Row: {
          confidence_level: number
          created_at: string
          delay_risk_level: string
          entity_id: string
          entity_type: string
          factors: Json | null
          id: string
          predicted_approval_hours: number
        }
        Insert: {
          confidence_level?: number
          created_at?: string
          delay_risk_level?: string
          entity_id: string
          entity_type: string
          factors?: Json | null
          id?: string
          predicted_approval_hours?: number
        }
        Update: {
          confidence_level?: number
          created_at?: string
          delay_risk_level?: string
          entity_id?: string
          entity_type?: string
          factors?: Json | null
          id?: string
          predicted_approval_hours?: number
        }
        Relationships: []
      }
      approval_policies: {
        Row: {
          approval_levels_required: number | null
          auto_approve_if_below_threshold: boolean | null
          created_at: string | null
          entity_type: string
          id: string
          min_amount_threshold: number | null
          organization_id: string | null
          requires_super_admin_override: boolean | null
          roles_allowed: string[] | null
          updated_at: string | null
        }
        Insert: {
          approval_levels_required?: number | null
          auto_approve_if_below_threshold?: boolean | null
          created_at?: string | null
          entity_type: string
          id?: string
          min_amount_threshold?: number | null
          organization_id?: string | null
          requires_super_admin_override?: boolean | null
          roles_allowed?: string[] | null
          updated_at?: string | null
        }
        Update: {
          approval_levels_required?: number | null
          auto_approve_if_below_threshold?: boolean | null
          created_at?: string | null
          entity_type?: string
          id?: string
          min_amount_threshold?: number | null
          organization_id?: string | null
          requires_super_admin_override?: boolean | null
          roles_allowed?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_risk_scores: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          explainability_summary: string | null
          id: string
          model_version: string | null
          risk_factors: Json
          risk_level: string
          risk_score: number
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          explainability_summary?: string | null
          id?: string
          model_version?: string | null
          risk_factors?: Json
          risk_level?: string
          risk_score?: number
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          explainability_summary?: string | null
          id?: string
          model_version?: string | null
          risk_factors?: Json
          risk_level?: string
          risk_score?: number
        }
        Relationships: []
      }
      approvals: {
        Row: {
          approval_level: number
          approved_by: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          organization_id: string | null
          reason: string | null
          rejected_by: string | null
          requested_by: string | null
          status: string
          super_admin_override: boolean | null
          updated_at: string | null
        }
        Insert: {
          approval_level?: number
          approved_by?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          organization_id?: string | null
          reason?: string | null
          rejected_by?: string | null
          requested_by?: string | null
          status?: string
          super_admin_override?: boolean | null
          updated_at?: string | null
        }
        Update: {
          approval_level?: number
          approved_by?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string | null
          reason?: string | null
          rejected_by?: string | null
          requested_by?: string | null
          status?: string
          super_admin_override?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_payments: {
        Row: {
          amount: number
          ar_id: string | null
          created_at: string
          id: string
          invoice_id: string | null
          notes: string | null
          organization_id: string | null
          payment_date: string
          payment_method: string | null
          payment_reference: string | null
          recorded_by: string | null
        }
        Insert: {
          amount: number
          ar_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          organization_id?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_reference?: string | null
          recorded_by?: string | null
        }
        Update: {
          amount?: number
          ar_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          organization_id?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_reference?: string | null
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_payments_ar_id_fkey"
            columns: ["ar_id"]
            isOneToOne: false
            referencedRelation: "accounts_receivable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_idle_logs: {
        Row: {
          created_at: string
          id: string
          idle_date: string
          logged_by: string | null
          notes: string | null
          organization_id: string
          reason_code: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idle_date: string
          logged_by?: string | null
          notes?: string | null
          organization_id: string
          reason_code: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idle_date?: string
          logged_by?: string | null
          notes?: string | null
          organization_id?: string
          reason_code?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_idle_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_idle_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_maintenance_events: {
        Row: {
          created_at: string
          description: string | null
          end_date: string
          id: string
          logged_by: string | null
          maintenance_type: string
          organization_id: string
          start_date: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          logged_by?: string | null
          maintenance_type?: string
          organization_id: string
          start_date: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          logged_by?: string | null
          maintenance_type?: string
          organization_id?: string
          start_date?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_profitability: {
        Row: {
          asset_id: string
          asset_type: string
          created_at: string
          delivery_revenue: number | null
          depreciation_cost: number | null
          driver_payroll_cost: number | null
          financing_cost: number | null
          fuel_cost: number | null
          id: string
          maintenance_cost: number | null
          net_profit: number | null
          period_end: string
          period_start: string
          profit_margin_percent: number | null
          rental_income: number | null
          total_cost: number | null
          total_revenue: number | null
          trip_fees: number | null
          updated_at: string
        }
        Insert: {
          asset_id: string
          asset_type: string
          created_at?: string
          delivery_revenue?: number | null
          depreciation_cost?: number | null
          driver_payroll_cost?: number | null
          financing_cost?: number | null
          fuel_cost?: number | null
          id?: string
          maintenance_cost?: number | null
          net_profit?: number | null
          period_end: string
          period_start: string
          profit_margin_percent?: number | null
          rental_income?: number | null
          total_cost?: number | null
          total_revenue?: number | null
          trip_fees?: number | null
          updated_at?: string
        }
        Update: {
          asset_id?: string
          asset_type?: string
          created_at?: string
          delivery_revenue?: number | null
          depreciation_cost?: number | null
          driver_payroll_cost?: number | null
          financing_cost?: number | null
          fuel_cost?: number | null
          id?: string
          maintenance_cost?: number | null
          net_profit?: number | null
          period_end?: string
          period_start?: string
          profit_margin_percent?: number | null
          rental_income?: number | null
          total_cost?: number | null
          total_revenue?: number | null
          trip_fees?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      asset_weekly_summaries: {
        Row: {
          computed_at: string | null
          created_at: string
          excess_maintenance_days: number | null
          expected_daily_revenue: number
          id: string
          idle_days: number
          idle_loss: number | null
          is_complete: boolean
          maintenance_days: number
          maintenance_loss: number | null
          organization_id: string
          total_weekly_loss: number | null
          transit_days: number
          trips_completed: number
          updated_at: string
          utilisation_pct: number | null
          vehicle_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          computed_at?: string | null
          created_at?: string
          excess_maintenance_days?: number | null
          expected_daily_revenue?: number
          id?: string
          idle_days?: number
          idle_loss?: number | null
          is_complete?: boolean
          maintenance_days?: number
          maintenance_loss?: number | null
          organization_id: string
          total_weekly_loss?: number | null
          transit_days?: number
          trips_completed?: number
          updated_at?: string
          utilisation_pct?: number | null
          vehicle_id: string
          week_end: string
          week_start: string
        }
        Update: {
          computed_at?: string | null
          created_at?: string
          excess_maintenance_days?: number | null
          expected_daily_revenue?: number
          id?: string
          idle_days?: number
          idle_loss?: number | null
          is_complete?: boolean
          maintenance_days?: number
          maintenance_loss?: number | null
          organization_id?: string
          total_weekly_loss?: number | null
          transit_days?: number
          trips_completed?: number
          updated_at?: string
          utilisation_pct?: number | null
          vehicle_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_weekly_summaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_weekly_summaries_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      async_jobs: {
        Row: {
          attempts: number
          created_at: string
          created_by: string | null
          finished_at: string | null
          id: string
          job_type: string
          last_error: string | null
          max_attempts: number
          organization_id: string | null
          payload: Json
          priority: number
          scheduled_at: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          created_by?: string | null
          finished_at?: string | null
          id?: string
          job_type: string
          last_error?: string | null
          max_attempts?: number
          organization_id?: string | null
          payload?: Json
          priority?: number
          scheduled_at?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          created_by?: string | null
          finished_at?: string | null
          id?: string
          job_type?: string
          last_error?: string | null
          max_attempts?: number
          organization_id?: string | null
          payload?: Json
          priority?: number
          scheduled_at?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      async_jobs_dlq: {
        Row: {
          failure_reason: string | null
          id: string
          job_type: string
          moved_at: string
          organization_id: string | null
          original_job_id: string | null
          payload: Json
        }
        Insert: {
          failure_reason?: string | null
          id?: string
          job_type: string
          moved_at?: string
          organization_id?: string | null
          original_job_id?: string | null
          payload?: Json
        }
        Update: {
          failure_reason?: string | null
          id?: string
          job_type?: string
          moved_at?: string
          organization_id?: string | null
          original_job_id?: string | null
          payload?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          organization_id: string | null
          record_id: string
          table_name: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          record_id: string
          table_name: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          record_id?: string
          table_name?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auto_dispatch_decisions: {
        Row: {
          accident_risk_score: number | null
          approved_at: string | null
          approved_by: string | null
          composite_score: number | null
          created_at: string | null
          decision: string
          dispatch_id: string | null
          driver_id: string
          driver_score: number | null
          execution_status: string | null
          id: string
          metadata: Json | null
          reason: string | null
          route_description: string | null
          route_score: number | null
          updated_at: string | null
          vehicle_health_score: number | null
          vehicle_id: string
        }
        Insert: {
          accident_risk_score?: number | null
          approved_at?: string | null
          approved_by?: string | null
          composite_score?: number | null
          created_at?: string | null
          decision: string
          dispatch_id?: string | null
          driver_id: string
          driver_score?: number | null
          execution_status?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          route_description?: string | null
          route_score?: number | null
          updated_at?: string | null
          vehicle_health_score?: number | null
          vehicle_id: string
        }
        Update: {
          accident_risk_score?: number | null
          approved_at?: string | null
          approved_by?: string | null
          composite_score?: number | null
          created_at?: string | null
          decision?: string
          dispatch_id?: string | null
          driver_id?: string
          driver_score?: number | null
          execution_status?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          route_description?: string | null
          route_score?: number | null
          updated_at?: string | null
          vehicle_health_score?: number | null
          vehicle_id?: string
        }
        Relationships: []
      }
      auto_team_members: {
        Row: {
          auto_role: string
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_role: string
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_role?: string
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      autonomous_company_config: {
        Row: {
          approval_threshold: number | null
          autonomy_level: string | null
          created_at: string | null
          daily_action_count: number | null
          enabled_modules: string[] | null
          id: string
          is_enabled: boolean | null
          last_decision_at: string | null
          organization_id: string | null
          total_savings: number | null
          updated_at: string | null
        }
        Insert: {
          approval_threshold?: number | null
          autonomy_level?: string | null
          created_at?: string | null
          daily_action_count?: number | null
          enabled_modules?: string[] | null
          id?: string
          is_enabled?: boolean | null
          last_decision_at?: string | null
          organization_id?: string | null
          total_savings?: number | null
          updated_at?: string | null
        }
        Update: {
          approval_threshold?: number | null
          autonomy_level?: string | null
          created_at?: string | null
          daily_action_count?: number | null
          enabled_modules?: string[] | null
          id?: string
          is_enabled?: boolean | null
          last_decision_at?: string | null
          organization_id?: string | null
          total_savings?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      autonomous_decisions: {
        Row: {
          action: Json | null
          approved_at: string | null
          approved_by: string | null
          confidence_score: number | null
          created_at: string
          decision_type: string
          executed_at: string | null
          id: string
          impact_summary: string | null
          is_reversible: boolean
          recommendation: Json
          rejected_reason: string | null
          reversal_action: Json | null
          rule_id: string | null
          status: string
          tenant_id: string | null
          trigger_data: Json | null
          trigger_source: string
          updated_at: string
        }
        Insert: {
          action?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          confidence_score?: number | null
          created_at?: string
          decision_type: string
          executed_at?: string | null
          id?: string
          impact_summary?: string | null
          is_reversible?: boolean
          recommendation?: Json
          rejected_reason?: string | null
          reversal_action?: Json | null
          rule_id?: string | null
          status?: string
          tenant_id?: string | null
          trigger_data?: Json | null
          trigger_source: string
          updated_at?: string
        }
        Update: {
          action?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          confidence_score?: number | null
          created_at?: string
          decision_type?: string
          executed_at?: string | null
          id?: string
          impact_summary?: string | null
          is_reversible?: boolean
          recommendation?: Json
          rejected_reason?: string | null
          reversal_action?: Json | null
          rule_id?: string | null
          status?: string
          tenant_id?: string | null
          trigger_data?: Json | null
          trigger_source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "autonomous_decisions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "autonomous_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      autonomous_rules: {
        Row: {
          action_config: Json
          action_type: string
          approval_level: string
          condition: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          module_key: string
          name: string
          requires_approval: boolean
          severity: string
          tenant_id: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          approval_level?: string
          condition?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          module_key: string
          name: string
          requires_approval?: boolean
          severity?: string
          tenant_id?: string | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          approval_level?: string
          condition?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          module_key?: string
          name?: string
          requires_approval?: boolean
          severity?: string
          tenant_id?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      autopilot_actions: {
        Row: {
          action_type: string
          approved_by: string | null
          created_at: string | null
          description: string | null
          executed_by: string | null
          id: string
          module_key: string
          prediction_id: string | null
          result: Json | null
          status: string | null
          title: string
        }
        Insert: {
          action_type: string
          approved_by?: string | null
          created_at?: string | null
          description?: string | null
          executed_by?: string | null
          id?: string
          module_key: string
          prediction_id?: string | null
          result?: Json | null
          status?: string | null
          title: string
        }
        Update: {
          action_type?: string
          approved_by?: string | null
          created_at?: string | null
          description?: string | null
          executed_by?: string | null
          id?: string
          module_key?: string
          prediction_id?: string | null
          result?: Json | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_actions_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "autopilot_predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      autopilot_logs: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          message: string
          metadata: Json | null
          module_key: string
          severity: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          message: string
          metadata?: Json | null
          module_key: string
          severity?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          module_key?: string
          severity?: string | null
        }
        Relationships: []
      }
      autopilot_predictions: {
        Row: {
          actual_value: Json | null
          confidence_score: number | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          module_key: string
          predicted_value: Json | null
          prediction_type: string
          status: string | null
          title: string
        }
        Insert: {
          actual_value?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          module_key: string
          predicted_value?: Json | null
          prediction_type: string
          status?: string | null
          title: string
        }
        Update: {
          actual_value?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          module_key?: string
          predicted_value?: Json | null
          prediction_type?: string
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      autopilot_settings: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          mode: string
          module_key: string
          module_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          mode?: string
          module_key: string
          module_name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          mode?: string
          module_key?: string
          module_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      bfsi_team_members: {
        Row: {
          bfsi_role: string
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bfsi_role: string
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bfsi_role?: string
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bill_items: {
        Row: {
          account: string | null
          amount: number
          bill_id: string
          created_at: string
          customer_id: string | null
          id: string
          item_details: string
          quantity: number
          rate: number
          tonnage: string | null
          vat_type: string
        }
        Insert: {
          account?: string | null
          amount?: number
          bill_id: string
          created_at?: string
          customer_id?: string | null
          id?: string
          item_details?: string
          quantity?: number
          rate?: number
          tonnage?: string | null
          vat_type?: string
        }
        Update: {
          account?: string | null
          amount?: number
          bill_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          item_details?: string
          quantity?: number
          rate?: number
          tonnage?: string | null
          vat_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_accounts: {
        Row: {
          auto_pay_enabled: boolean | null
          billing_currency: string
          billing_email: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          payment_gateway: string | null
          plan_id: string | null
          prepaid_mode: boolean | null
          status: string
          tenant_id: string
          updated_at: string
          wallet_balance: number
        }
        Insert: {
          auto_pay_enabled?: boolean | null
          billing_currency?: string
          billing_email?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_gateway?: string | null
          plan_id?: string | null
          prepaid_mode?: boolean | null
          status?: string
          tenant_id: string
          updated_at?: string
          wallet_balance?: number
        }
        Update: {
          auto_pay_enabled?: boolean | null
          billing_currency?: string
          billing_email?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_gateway?: string | null
          plan_id?: string | null
          prepaid_mode?: boolean | null
          status?: string
          tenant_id?: string
          updated_at?: string
          wallet_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_accounts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          api_amount: number
          billing_account_id: string | null
          billing_period: string
          created_at: string
          currency: string
          due_date: string | null
          id: string
          invoice_number: string
          line_items: Json | null
          paid_at: string | null
          payment_gateway: string | null
          payment_reference: string | null
          status: string
          subscription_amount: number
          tax_amount: number
          total_amount: number
          updated_at: string
          usage_amount: number
        }
        Insert: {
          api_amount?: number
          billing_account_id?: string | null
          billing_period: string
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          line_items?: Json | null
          paid_at?: string | null
          payment_gateway?: string | null
          payment_reference?: string | null
          status?: string
          subscription_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          usage_amount?: number
        }
        Update: {
          api_amount?: number
          billing_account_id?: string | null
          billing_period?: string
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          line_items?: Json | null
          paid_at?: string | null
          payment_gateway?: string | null
          payment_reference?: string | null
          status?: string
          subscription_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          usage_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_billing_account_id_fkey"
            columns: ["billing_account_id"]
            isOneToOne: false
            referencedRelation: "billing_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_payments: {
        Row: {
          amount: number
          billing_account_id: string | null
          billing_invoice_id: string | null
          created_at: string
          currency: string
          gateway_reference: string | null
          id: string
          metadata: Json | null
          paid_at: string | null
          payment_gateway: string | null
          payment_method: string | null
          status: string
        }
        Insert: {
          amount: number
          billing_account_id?: string | null
          billing_invoice_id?: string | null
          created_at?: string
          currency?: string
          gateway_reference?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          status?: string
        }
        Update: {
          amount?: number
          billing_account_id?: string | null
          billing_invoice_id?: string | null
          created_at?: string
          currency?: string
          gateway_reference?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_payments_billing_account_id_fkey"
            columns: ["billing_account_id"]
            isOneToOne: false
            referencedRelation: "billing_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_payments_billing_invoice_id_fkey"
            columns: ["billing_invoice_id"]
            isOneToOne: false
            referencedRelation: "billing_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plans: {
        Row: {
          base_price: number
          billing_cycle: string
          created_at: string
          currency: string
          features: Json | null
          id: string
          included_api_calls: number | null
          included_drops: number | null
          is_active: boolean
          max_users: number | null
          max_vehicles: number | null
          plan_code: string
          plan_name: string
          price_per_api_call: number | null
          price_per_drop: number | null
          pricing_model: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          billing_cycle?: string
          created_at?: string
          currency?: string
          features?: Json | null
          id?: string
          included_api_calls?: number | null
          included_drops?: number | null
          is_active?: boolean
          max_users?: number | null
          max_vehicles?: number | null
          plan_code: string
          plan_name: string
          price_per_api_call?: number | null
          price_per_drop?: number | null
          pricing_model?: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          billing_cycle?: string
          created_at?: string
          currency?: string
          features?: Json | null
          id?: string
          included_api_calls?: number | null
          included_drops?: number | null
          is_active?: boolean
          max_users?: number | null
          max_vehicles?: number | null
          plan_code?: string
          plan_name?: string
          price_per_api_call?: number | null
          price_per_drop?: number | null
          pricing_model?: string
          updated_at?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          adjustment: number | null
          amount: number
          bill_date: string
          bill_number: string
          category: string
          created_at: string
          created_by: string | null
          currency_code: string | null
          discount_percent: number | null
          due_date: string | null
          id: string
          linked_asset_id: string | null
          linked_expense_id: string | null
          notes: string | null
          order_number: string | null
          organization_id: string | null
          paid_at: string | null
          paid_by: string | null
          payment_status: string
          payment_terms: string | null
          subtotal: number | null
          tax_amount: number
          total_amount: number
          updated_at: string
          vendor_name: string
        }
        Insert: {
          adjustment?: number | null
          amount?: number
          bill_date?: string
          bill_number?: string
          category?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          discount_percent?: number | null
          due_date?: string | null
          id?: string
          linked_asset_id?: string | null
          linked_expense_id?: string | null
          notes?: string | null
          order_number?: string | null
          organization_id?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_status?: string
          payment_terms?: string | null
          subtotal?: number | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          vendor_name: string
        }
        Update: {
          adjustment?: number | null
          amount?: number
          bill_date?: string
          bill_number?: string
          category?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          discount_percent?: number | null
          due_date?: string | null
          id?: string
          linked_asset_id?: string | null
          linked_expense_id?: string | null
          notes?: string | null
          order_number?: string | null
          organization_id?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_status?: string
          payment_terms?: string | null
          subtotal?: number | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          vendor_name?: string
        }
        Relationships: []
      }
      blocked_orders: {
        Row: {
          block_type: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          dispatch_id: string | null
          id: string
          reason: string | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          block_type: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          dispatch_id?: string | null
          id?: string
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          block_type?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          dispatch_id?: string | null
          id?: string
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_orders_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_orders_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      board_decisions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          ceo_view: string | null
          cfo_view: string | null
          confidence: number | null
          conflict_summary: string | null
          context: Json | null
          coo_view: string | null
          created_at: string
          created_by: string | null
          cro_growth_view: string | null
          cto_view: string | null
          decision_score: number | null
          final_decision: string | null
          id: string
          question: string
          risk_view: string | null
          scenario_best: string | null
          scenario_expected: string | null
          scenario_worst: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          ceo_view?: string | null
          cfo_view?: string | null
          confidence?: number | null
          conflict_summary?: string | null
          context?: Json | null
          coo_view?: string | null
          created_at?: string
          created_by?: string | null
          cro_growth_view?: string | null
          cto_view?: string | null
          decision_score?: number | null
          final_decision?: string | null
          id?: string
          question: string
          risk_view?: string | null
          scenario_best?: string | null
          scenario_expected?: string | null
          scenario_worst?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          ceo_view?: string | null
          cfo_view?: string | null
          confidence?: number | null
          conflict_summary?: string | null
          context?: Json | null
          coo_view?: string | null
          created_at?: string
          created_by?: string | null
          cro_growth_view?: string | null
          cto_view?: string | null
          decision_score?: number | null
          final_decision?: string | null
          id?: string
          question?: string
          risk_view?: string | null
          scenario_best?: string | null
          scenario_expected?: string | null
          scenario_worst?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      breakdown_alerts: {
        Row: {
          alert_type: string
          channels: string[] | null
          created_at: string | null
          driver_id: string | null
          id: string
          message: string
          metadata: Json | null
          organization_id: string | null
          recipients: Json | null
          sent_status: Json | null
          severity: string | null
          vehicle_id: string | null
        }
        Insert: {
          alert_type: string
          channels?: string[] | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          message: string
          metadata?: Json | null
          organization_id?: string | null
          recipients?: Json | null
          sent_status?: Json | null
          severity?: string | null
          vehicle_id?: string | null
        }
        Update: {
          alert_type?: string
          channels?: string[] | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          organization_id?: string | null
          recipients?: Json | null
          sent_status?: Json | null
          severity?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "breakdown_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      building_team_members: {
        Row: {
          building_role: string
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          building_role: string
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          building_role?: string
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      capital_funding: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          end_date: string | null
          funding_type: string
          id: string
          interest_rate_annual: number | null
          investor_name: string
          investor_type: string | null
          next_payment_date: string | null
          notes: string | null
          organization_id: string | null
          repayment_type: string | null
          start_date: string
          status: string | null
          tenure_months: number | null
          total_repaid: number | null
          updated_at: string | null
          wht_rate: number | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          funding_type: string
          id?: string
          interest_rate_annual?: number | null
          investor_name: string
          investor_type?: string | null
          next_payment_date?: string | null
          notes?: string | null
          organization_id?: string | null
          repayment_type?: string | null
          start_date: string
          status?: string | null
          tenure_months?: number | null
          total_repaid?: number | null
          updated_at?: string | null
          wht_rate?: number | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          funding_type?: string
          id?: string
          interest_rate_annual?: number | null
          investor_name?: string
          investor_type?: string | null
          next_payment_date?: string | null
          notes?: string | null
          organization_id?: string | null
          repayment_type?: string | null
          start_date?: string
          status?: string | null
          tenure_months?: number | null
          total_repaid?: number | null
          updated_at?: string | null
          wht_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "capital_funding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_repayments: {
        Row: {
          created_at: string | null
          due_date: string
          funding_id: string | null
          id: string
          interest_amount: number | null
          net_payable: number
          organization_id: string | null
          paid_amount: number | null
          paid_date: string | null
          payment_number: number
          payment_reference: string | null
          principal_amount: number | null
          status: string | null
          wht_amount: number | null
        }
        Insert: {
          created_at?: string | null
          due_date: string
          funding_id?: string | null
          id?: string
          interest_amount?: number | null
          net_payable: number
          organization_id?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_number: number
          payment_reference?: string | null
          principal_amount?: number | null
          status?: string | null
          wht_amount?: number | null
        }
        Update: {
          created_at?: string | null
          due_date?: string
          funding_id?: string | null
          id?: string
          interest_amount?: number | null
          net_payable?: number
          organization_id?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_number?: number
          payment_reference?: string | null
          principal_amount?: number | null
          status?: string | null
          wht_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "capital_repayments_funding_id_fkey"
            columns: ["funding_id"]
            isOneToOne: false
            referencedRelation: "capital_funding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_repayments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_balance_daily: {
        Row: {
          closing_balance: number
          created_at: string
          id: string
          opening_balance: number
          organization_id: string | null
          snapshot_date: string
          total_inflow: number
          total_outflow: number
        }
        Insert: {
          closing_balance?: number
          created_at?: string
          id?: string
          opening_balance?: number
          organization_id?: string | null
          snapshot_date: string
          total_inflow?: number
          total_outflow?: number
        }
        Update: {
          closing_balance?: number
          created_at?: string
          id?: string
          opening_balance?: number
          organization_id?: string | null
          snapshot_date?: string
          total_inflow?: number
          total_outflow?: number
        }
        Relationships: []
      }
      cash_flow_projections: {
        Row: {
          confidence_score: number | null
          created_at: string
          cumulative_balance: number
          id: string
          net_flow: number
          notes: string | null
          organization_id: string | null
          projected_inflow: number
          projected_outflow: number
          projection_date: string
          source: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          cumulative_balance?: number
          id?: string
          net_flow?: number
          notes?: string | null
          organization_id?: string | null
          projected_inflow?: number
          projected_outflow?: number
          projection_date: string
          source?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          cumulative_balance?: number
          id?: string
          net_flow?: number
          notes?: string | null
          organization_id?: string | null
          projected_inflow?: number
          projected_outflow?: number
          projection_date?: string
          source?: string | null
        }
        Relationships: []
      }
      cash_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          id: string
          organization_id: string | null
          reference_id: string | null
          reference_type: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      cashflow_forecasts: {
        Row: {
          actual_inflow: number | null
          actual_outflow: number | null
          ai_notes: string | null
          category: string
          confidence_score: number | null
          created_at: string | null
          forecast_date: string
          id: string
          organization_id: string | null
          projected_inflow: number | null
          projected_outflow: number | null
          subcategory: string | null
        }
        Insert: {
          actual_inflow?: number | null
          actual_outflow?: number | null
          ai_notes?: string | null
          category: string
          confidence_score?: number | null
          created_at?: string | null
          forecast_date: string
          id?: string
          organization_id?: string | null
          projected_inflow?: number | null
          projected_outflow?: number | null
          subcategory?: string | null
        }
        Update: {
          actual_inflow?: number | null
          actual_outflow?: number | null
          ai_notes?: string | null
          category?: string
          confidence_score?: number | null
          created_at?: string | null
          forecast_date?: string
          id?: string
          organization_id?: string | null
          projected_inflow?: number | null
          projected_outflow?: number | null
          subcategory?: string | null
        }
        Relationships: []
      }
      cbdc_transactions: {
        Row: {
          aml_score: number | null
          amount: number
          cbdc_code: string
          compliance_status: string | null
          corridor: string | null
          created_at: string
          id: string
          issuing_country: string
          programmable_flag: boolean | null
          reference_id: string | null
          settlement_finality: string | null
          tax_tag: string | null
          transaction_status: string | null
          updated_at: string | null
        }
        Insert: {
          aml_score?: number | null
          amount?: number
          cbdc_code: string
          compliance_status?: string | null
          corridor?: string | null
          created_at?: string
          id?: string
          issuing_country: string
          programmable_flag?: boolean | null
          reference_id?: string | null
          settlement_finality?: string | null
          tax_tag?: string | null
          transaction_status?: string | null
          updated_at?: string | null
        }
        Update: {
          aml_score?: number | null
          amount?: number
          cbdc_code?: string
          compliance_status?: string | null
          corridor?: string | null
          created_at?: string
          id?: string
          issuing_country?: string
          programmable_flag?: boolean | null
          reference_id?: string | null
          settlement_finality?: string | null
          tax_tag?: string | null
          transaction_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cfo_audit_log: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ledger_entry_hash: string | null
          metadata: Json | null
          module_key: string
          recommendation: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ledger_entry_hash?: string | null
          metadata?: Json | null
          module_key: string
          recommendation?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ledger_entry_hash?: string | null
          metadata?: Json | null
          module_key?: string
          recommendation?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cfo_brief_log: {
        Row: {
          brief_date: string
          cash_position: number | null
          created_at: string
          error: string | null
          id: string
          payables_total: number | null
          receivables_overdue: number | null
          receivables_total: number | null
          recipient_email: string
          resend_message_id: string | null
          revenue_mtd: number | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          brief_date?: string
          cash_position?: number | null
          created_at?: string
          error?: string | null
          id?: string
          payables_total?: number | null
          receivables_overdue?: number | null
          receivables_total?: number | null
          recipient_email: string
          resend_message_id?: string | null
          revenue_mtd?: number | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          brief_date?: string
          cash_position?: number | null
          created_at?: string
          error?: string | null
          id?: string
          payables_total?: number | null
          receivables_overdue?: number | null
          receivables_total?: number | null
          recipient_email?: string
          resend_message_id?: string | null
          revenue_mtd?: number | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      cfo_brief_log_access_audit: {
        Row: {
          accessed_at: string
          brief_log_id: string
          id: string
          ip_address: string | null
          organization_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accessed_at?: string
          brief_log_id: string
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accessed_at?: string
          brief_log_id?: string
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfo_brief_log_access_audit_brief_log_id_fkey"
            columns: ["brief_log_id"]
            isOneToOne: false
            referencedRelation: "cfo_brief_log"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_group: string | null
          account_name: string
          account_type: string
          created_at: string | null
          currency_code: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          normal_balance: string
          parent_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_code: string
          account_group?: string | null
          account_name: string
          account_type: string
          created_at?: string | null
          currency_code?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          normal_balance?: string
          parent_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_code?: string
          account_group?: string | null
          account_name?: string
          account_type?: string
          created_at?: string | null
          currency_code?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          normal_balance?: string
          parent_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_financial_profiles: {
        Row: {
          avg_margin_percent: number | null
          avg_monthly_revenue: number | null
          created_at: string
          customer_id: string
          id: string
          last_payment_date: string | null
          payment_behavior: string | null
          payment_term_days: number | null
          risk_score: number | null
          total_lifetime_revenue: number | null
          total_outstanding: number | null
          updated_at: string
        }
        Insert: {
          avg_margin_percent?: number | null
          avg_monthly_revenue?: number | null
          created_at?: string
          customer_id: string
          id?: string
          last_payment_date?: string | null
          payment_behavior?: string | null
          payment_term_days?: number | null
          risk_score?: number | null
          total_lifetime_revenue?: number | null
          total_outstanding?: number | null
          updated_at?: string
        }
        Update: {
          avg_margin_percent?: number | null
          avg_monthly_revenue?: number | null
          created_at?: string
          customer_id?: string
          id?: string
          last_payment_date?: string | null
          payment_behavior?: string | null
          payment_term_days?: number | null
          risk_score?: number | null
          total_lifetime_revenue?: number | null
          total_outstanding?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_financial_profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notification_log: {
        Row: {
          attempts: number
          created_at: string
          dispatch_id: string | null
          dispatch_status: string
          error_message: string | null
          from_email: string | null
          from_email_source: string | null
          id: string
          organization_id: string | null
          provider_message_id: string | null
          provider_response: Json | null
          recipient_email: string | null
          success: boolean
          triggered_by: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          dispatch_id?: string | null
          dispatch_status: string
          error_message?: string | null
          from_email?: string | null
          from_email_source?: string | null
          id?: string
          organization_id?: string | null
          provider_message_id?: string | null
          provider_response?: Json | null
          recipient_email?: string | null
          success?: boolean
          triggered_by?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          dispatch_id?: string | null
          dispatch_status?: string
          error_message?: string | null
          from_email?: string | null
          from_email_source?: string | null
          id?: string
          organization_id?: string | null
          provider_message_id?: string | null
          provider_response?: Json | null
          recipient_email?: string | null
          success?: boolean
          triggered_by?: string | null
        }
        Relationships: []
      }
      client_profitability: {
        Row: {
          avg_margin: number | null
          classification: string | null
          client_id: string | null
          created_at: string | null
          id: string
          last_updated: string | null
          late_payment_count: number | null
          late_payment_rate: number | null
          risk_score: number | null
          total_cost: number | null
          total_profit: number | null
          total_revenue: number | null
          total_trips: number | null
        }
        Insert: {
          avg_margin?: number | null
          classification?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          late_payment_count?: number | null
          late_payment_rate?: number | null
          risk_score?: number | null
          total_cost?: number | null
          total_profit?: number | null
          total_revenue?: number | null
          total_trips?: number | null
        }
        Update: {
          avg_margin?: number | null
          classification?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          late_payment_count?: number | null
          late_payment_rate?: number | null
          risk_score?: number | null
          total_cost?: number | null
          total_profit?: number | null
          total_revenue?: number | null
          total_trips?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_profitability_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      collections_reminders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          days_overdue: number
          email_error: string | null
          email_message_id: string | null
          email_sent_at: string | null
          email_status: string | null
          id: string
          idempotency_key: string
          invoice_id: string
          language: string
          organization_id: string
          sms_error: string | null
          sms_message_id: string | null
          sms_sent_at: string | null
          sms_status: string | null
          trigger_reason: string
          web_error: string | null
          web_sent_at: string | null
          web_status: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          days_overdue: number
          email_error?: string | null
          email_message_id?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          id?: string
          idempotency_key: string
          invoice_id: string
          language?: string
          organization_id: string
          sms_error?: string | null
          sms_message_id?: string | null
          sms_sent_at?: string | null
          sms_status?: string | null
          trigger_reason?: string
          web_error?: string | null
          web_sent_at?: string | null
          web_status?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          days_overdue?: number
          email_error?: string | null
          email_message_id?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          id?: string
          idempotency_key?: string
          invoice_id?: string
          language?: string
          organization_id?: string
          sms_error?: string | null
          sms_message_id?: string | null
          sms_sent_at?: string | null
          sms_status?: string | null
          trigger_reason?: string
          web_error?: string | null
          web_sent_at?: string | null
          web_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_identities: {
        Row: {
          badges: string[] | null
          business_name: string
          country_code: string | null
          created_at: string | null
          credit_score: number | null
          delivery_completion_rate: number | null
          dispute_count: number | null
          entity_type: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          organization_id: string | null
          payment_reliability_score: number | null
          rcid: string
          registration_number: string | null
          tax_id: string | null
          trade_volume_total: number | null
          trust_grade: string | null
          trust_score: number | null
          updated_at: string | null
          verification_checks: Json | null
          verification_level: string | null
          verified_at: string | null
        }
        Insert: {
          badges?: string[] | null
          business_name: string
          country_code?: string | null
          created_at?: string | null
          credit_score?: number | null
          delivery_completion_rate?: number | null
          dispute_count?: number | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          organization_id?: string | null
          payment_reliability_score?: number | null
          rcid: string
          registration_number?: string | null
          tax_id?: string | null
          trade_volume_total?: number | null
          trust_grade?: string | null
          trust_score?: number | null
          updated_at?: string | null
          verification_checks?: Json | null
          verification_level?: string | null
          verified_at?: string | null
        }
        Update: {
          badges?: string[] | null
          business_name?: string
          country_code?: string | null
          created_at?: string | null
          credit_score?: number | null
          delivery_completion_rate?: number | null
          dispute_count?: number | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          organization_id?: string | null
          payment_reliability_score?: number | null
          rcid?: string
          registration_number?: string | null
          tax_id?: string | null
          trade_volume_total?: number | null
          trust_grade?: string | null
          trust_score?: number | null
          updated_at?: string | null
          verification_checks?: Json | null
          verification_level?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commerce_identities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_ledger: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          gross_amount: number
          id: string
          paid_at: string | null
          reference_id: string | null
          reseller_amount: number
          reseller_org_id: string | null
          reseller_relationship_id: string | null
          routeace_amount: number
          source_org_id: string
          split_percent_reseller: number
          split_percent_routeace: number
          status: string
          transaction_type: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          gross_amount: number
          id?: string
          paid_at?: string | null
          reference_id?: string | null
          reseller_amount?: number
          reseller_org_id?: string | null
          reseller_relationship_id?: string | null
          routeace_amount?: number
          source_org_id: string
          split_percent_reseller?: number
          split_percent_routeace?: number
          status?: string
          transaction_type: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          gross_amount?: number
          id?: string
          paid_at?: string | null
          reference_id?: string | null
          reseller_amount?: number
          reseller_org_id?: string | null
          reseller_relationship_id?: string | null
          routeace_amount?: number
          source_org_id?: string
          split_percent_reseller?: number
          split_percent_routeace?: number
          status?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_ledger_reseller_org_id_fkey"
            columns: ["reseller_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_reseller_relationship_id_fkey"
            columns: ["reseller_relationship_id"]
            isOneToOne: false
            referencedRelation: "reseller_relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_source_org_id_fkey"
            columns: ["source_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_bank_details: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          created_at: string
          id: string
          organization_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          organization_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_bank_details_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          company_name: string
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          organization_id: string | null
          phone: string | null
          signature_url: string | null
          tagline: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          organization_id?: string | null
          phone?: string | null
          signature_url?: string | null
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          organization_id?: string | null
          phone?: string | null
          signature_url?: string | null
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      competitor_profiles: {
        Row: {
          competitor_name: string
          created_at: string | null
          feature_gaps: Json | null
          id: string
          last_observed_at: string | null
          price_per_unit: number | null
          pricing_model: string | null
          strengths: string[] | null
          threat_level: string | null
          updated_at: string | null
          user_id: string
          weaknesses: string[] | null
          win_strategy: Json | null
        }
        Insert: {
          competitor_name: string
          created_at?: string | null
          feature_gaps?: Json | null
          id?: string
          last_observed_at?: string | null
          price_per_unit?: number | null
          pricing_model?: string | null
          strengths?: string[] | null
          threat_level?: string | null
          updated_at?: string | null
          user_id: string
          weaknesses?: string[] | null
          win_strategy?: Json | null
        }
        Update: {
          competitor_name?: string
          created_at?: string | null
          feature_gaps?: Json | null
          id?: string
          last_observed_at?: string | null
          price_per_unit?: number | null
          pricing_model?: string | null
          strengths?: string[] | null
          threat_level?: string | null
          updated_at?: string | null
          user_id?: string
          weaknesses?: string[] | null
          win_strategy?: Json | null
        }
        Relationships: []
      }
      compliance_registry: {
        Row: {
          certificate_number: string | null
          compliance_type: string
          country_code: string | null
          created_at: string | null
          document_url: string | null
          expiry_date: string | null
          id: string
          issued_date: string | null
          issuing_authority: string | null
          metadata: Json | null
          rcid: string | null
          status: string | null
        }
        Insert: {
          certificate_number?: string | null
          compliance_type: string
          country_code?: string | null
          created_at?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          issuing_authority?: string | null
          metadata?: Json | null
          rcid?: string | null
          status?: string | null
        }
        Update: {
          certificate_number?: string | null
          compliance_type?: string
          country_code?: string | null
          created_at?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          issuing_authority?: string | null
          metadata?: Json | null
          rcid?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_registry_rcid_fkey"
            columns: ["rcid"]
            isOneToOne: false
            referencedRelation: "commerce_identities"
            referencedColumns: ["rcid"]
          },
        ]
      }
      consumer_team_members: {
        Row: {
          consumer_role: string
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          consumer_role: string
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          consumer_role?: string
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      continental_features: {
        Row: {
          config: Json | null
          continent: string | null
          country_code: string | null
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          config?: Json | null
          continent?: string | null
          country_code?: string | null
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          config?: Json | null
          continent?: string | null
          country_code?: string | null
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      coo_ai_alerts: {
        Row: {
          alert_type: string
          confidence_score: number | null
          created_at: string
          escalated_at: string | null
          escalated_to_super_admin: boolean
          financial_impact: number | null
          id: string
          is_read: boolean
          message: string
          organization_id: string | null
          read_at: string | null
          read_by: string | null
          recommended_action: string | null
          reference_id: string | null
          reference_type: string | null
          severity: string
          title: string
        }
        Insert: {
          alert_type: string
          confidence_score?: number | null
          created_at?: string
          escalated_at?: string | null
          escalated_to_super_admin?: boolean
          financial_impact?: number | null
          id?: string
          is_read?: boolean
          message: string
          organization_id?: string | null
          read_at?: string | null
          read_by?: string | null
          recommended_action?: string | null
          reference_id?: string | null
          reference_type?: string | null
          severity?: string
          title: string
        }
        Update: {
          alert_type?: string
          confidence_score?: number | null
          created_at?: string
          escalated_at?: string | null
          escalated_to_super_admin?: boolean
          financial_impact?: number | null
          id?: string
          is_read?: boolean
          message?: string
          organization_id?: string | null
          read_at?: string | null
          read_by?: string | null
          recommended_action?: string | null
          reference_id?: string | null
          reference_type?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "coo_ai_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      core_access_logs: {
        Row: {
          action: string
          core_role: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          resource: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          core_role?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          core_role?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      core_rls_smoke_findings: {
        Row: {
          created_at: string
          error_message: string | null
          expected_max_other_org_rows: number
          id: string
          observed_other_org_rows: number
          observed_total_rows: number
          run_id: string
          scope: string
          status: string
          table_name: string
          test_org_id: string | null
          test_user_email: string | null
          test_user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          expected_max_other_org_rows?: number
          id?: string
          observed_other_org_rows?: number
          observed_total_rows?: number
          run_id: string
          scope: string
          status: string
          table_name: string
          test_org_id?: string | null
          test_user_email?: string | null
          test_user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          expected_max_other_org_rows?: number
          id?: string
          observed_other_org_rows?: number
          observed_total_rows?: number
          run_id?: string
          scope?: string
          status?: string
          table_name?: string
          test_org_id?: string | null
          test_user_email?: string | null
          test_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_rls_smoke_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "core_rls_smoke_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      core_rls_smoke_runs: {
        Row: {
          duration_ms: number | null
          failed: number
          id: string
          notes: string | null
          passed: number
          run_at: string
          total_checks: number
          triggered_by: string | null
        }
        Insert: {
          duration_ms?: number | null
          failed?: number
          id?: string
          notes?: string | null
          passed?: number
          run_at?: string
          total_checks?: number
          triggered_by?: string | null
        }
        Update: {
          duration_ms?: number | null
          failed?: number
          id?: string
          notes?: string | null
          passed?: number
          run_at?: string
          total_checks?: number
          triggered_by?: string | null
        }
        Relationships: []
      }
      core_team_members: {
        Row: {
          core_role: string
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          last_login_at: string | null
          last_seen_at: string | null
          login_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          core_role: string
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_login_at?: string | null
          last_seen_at?: string | null
          login_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          core_role?: string
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_login_at?: string | null
          last_seen_at?: string | null
          login_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cosmetics_team_members: {
        Row: {
          cosmetics_role: string
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cosmetics_role: string
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cosmetics_role?: string
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      country_configs: {
        Row: {
          ai_addon_price: number | null
          annual_free_months: number
          country_code: string
          country_name: string
          created_at: string
          currency_code: string
          currency_symbol: string
          enterprise_price: number
          fx_buffer_percent: number
          growth_price: number
          id: string
          is_active: boolean
          is_default: boolean
          locale: string
          map_fallback_provider: string | null
          map_provider: string
          payment_provider: string
          per_drop_price: number
          requires_ccpa: boolean
          requires_data_localization: boolean
          requires_gdpr: boolean
          route_weight_border: boolean
          route_weight_mountain: boolean
          route_weight_snow: boolean
          route_weight_toll: boolean
          settlement_currency: string
          sla_zones: Json | null
          starter_price: number
          tax_engine_type: string
          updated_at: string
          vat_rate: number
        }
        Insert: {
          ai_addon_price?: number | null
          annual_free_months?: number
          country_code: string
          country_name: string
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          enterprise_price?: number
          fx_buffer_percent?: number
          growth_price?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          locale?: string
          map_fallback_provider?: string | null
          map_provider?: string
          payment_provider?: string
          per_drop_price?: number
          requires_ccpa?: boolean
          requires_data_localization?: boolean
          requires_gdpr?: boolean
          route_weight_border?: boolean
          route_weight_mountain?: boolean
          route_weight_snow?: boolean
          route_weight_toll?: boolean
          settlement_currency?: string
          sla_zones?: Json | null
          starter_price?: number
          tax_engine_type?: string
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          ai_addon_price?: number | null
          annual_free_months?: number
          country_code?: string
          country_name?: string
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          enterprise_price?: number
          fx_buffer_percent?: number
          growth_price?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          locale?: string
          map_fallback_provider?: string | null
          map_provider?: string
          payment_provider?: string
          per_drop_price?: number
          requires_ccpa?: boolean
          requires_data_localization?: boolean
          requires_gdpr?: boolean
          route_weight_border?: boolean
          route_weight_mountain?: boolean
          route_weight_snow?: boolean
          route_weight_toll?: boolean
          settlement_currency?: string
          sla_zones?: Json | null
          starter_price?: number
          tax_engine_type?: string
          updated_at?: string
          vat_rate?: number
        }
        Relationships: []
      }
      cross_role_impacts: {
        Row: {
          created_at: string
          decision_id: string | null
          description: string | null
          id: string
          impact_type: string
          is_resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          source_role: string
          target_role: string
        }
        Insert: {
          created_at?: string
          decision_id?: string | null
          description?: string | null
          id?: string
          impact_type: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          source_role: string
          target_role: string
        }
        Update: {
          created_at?: string
          decision_id?: string | null
          description?: string | null
          id?: string
          impact_type?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          source_role?: string
          target_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_role_impacts_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decision_engine_log"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_cohorts: {
        Row: {
          churn_date: string | null
          cohort_label: string | null
          created_at: string | null
          customer_id: string | null
          first_order_month: string | null
          id: string
          is_churned: boolean | null
          signup_month: string
          total_orders: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          churn_date?: string | null
          cohort_label?: string | null
          created_at?: string | null
          customer_id?: string | null
          first_order_month?: string | null
          id?: string
          is_churned?: boolean | null
          signup_month: string
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          churn_date?: string | null
          cohort_label?: string | null
          created_at?: string | null
          customer_id?: string | null
          first_order_month?: string | null
          id?: string
          is_churned?: boolean | null
          signup_month?: string
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_cohorts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_invite_tokens: {
        Row: {
          created_at: string
          created_by: string
          customer_id: string | null
          email: string
          expires_at: string
          full_name: string | null
          id: string
          organization_id: string
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_id?: string | null
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          organization_id: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_id?: string | null
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          organization_id?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_invite_tokens_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_users: {
        Row: {
          can_download_documents: boolean | null
          can_view_invoices: boolean | null
          created_at: string | null
          customer_id: string
          id: string
          is_primary_contact: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_download_documents?: boolean | null
          can_view_invoices?: boolean | null
          created_at?: string | null
          customer_id: string
          id?: string
          is_primary_contact?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_download_documents?: boolean | null
          can_view_invoices?: boolean | null
          created_at?: string | null
          customer_id?: string
          id?: string
          is_primary_contact?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_users_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          approval_status: string
          city: string | null
          company_name: string
          contact_name: string
          country: string | null
          created_at: string
          created_by: string | null
          email: string
          email_delivery_updates: boolean | null
          email_invoice_reminders: boolean | null
          factory_address: string | null
          factory_lat: number | null
          factory_lng: number | null
          head_office_address: string | null
          head_office_lat: number | null
          head_office_lng: number | null
          id: string
          organization_id: string | null
          phone: string
          preferred_language: string
          state: string | null
          tin_number: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          approval_status?: string
          city?: string | null
          company_name: string
          contact_name: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          email_delivery_updates?: boolean | null
          email_invoice_reminders?: boolean | null
          factory_address?: string | null
          factory_lat?: number | null
          factory_lng?: number | null
          head_office_address?: string | null
          head_office_lat?: number | null
          head_office_lng?: number | null
          id?: string
          organization_id?: string | null
          phone: string
          preferred_language?: string
          state?: string | null
          tin_number?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          approval_status?: string
          city?: string | null
          company_name?: string
          contact_name?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          email_delivery_updates?: boolean | null
          email_invoice_reminders?: boolean | null
          factory_address?: string | null
          factory_lat?: number | null
          factory_lng?: number | null
          head_office_address?: string | null
          head_office_lat?: number | null
          head_office_lng?: number | null
          id?: string
          organization_id?: string | null
          phone?: string
          preferred_language?: string
          state?: string | null
          tin_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_count_items: {
        Row: {
          bin_code: string | null
          counted_at: string | null
          counted_by: string | null
          counted_quantity: number | null
          created_at: string | null
          cycle_count_id: string
          id: string
          sku_code: string
          sku_name: string | null
          system_quantity: number
          variance: number | null
        }
        Insert: {
          bin_code?: string | null
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string | null
          cycle_count_id: string
          id?: string
          sku_code: string
          sku_name?: string | null
          system_quantity?: number
          variance?: number | null
        }
        Update: {
          bin_code?: string | null
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string | null
          cycle_count_id?: string
          id?: string
          sku_code?: string
          sku_name?: string | null
          system_quantity?: number
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cycle_count_items_cycle_count_id_fkey"
            columns: ["cycle_count_id"]
            isOneToOne: false
            referencedRelation: "cycle_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_counts: {
        Row: {
          count_date: string
          count_type: string
          created_at: string | null
          id: string
          initiated_by: string | null
          notes: string | null
          status: string
          updated_at: string | null
          validated_at: string | null
          validated_by: string | null
          warehouse_id: string
        }
        Insert: {
          count_date?: string
          count_type?: string
          created_at?: string | null
          id?: string
          initiated_by?: string | null
          notes?: string | null
          status?: string
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
          warehouse_id: string
        }
        Update: {
          count_date?: string
          count_type?: string
          created_at?: string | null
          id?: string
          initiated_by?: string | null
          notes?: string | null
          status?: string
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_counts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_engine_log: {
        Row: {
          actual_impact: Json | null
          affected_roles: string[] | null
          alternatives: Json | null
          block_reason: string | null
          created_at: string
          decision_type: string
          description: string | null
          executed_at: string | null
          id: string
          impact_customer: number | null
          impact_financial: number | null
          impact_operational: number | null
          impact_system: number | null
          outcome: string | null
          outcome_accuracy: number | null
          predicted_impact: Json | null
          recommendation: string | null
          risk_level: string | null
          risk_score: number | null
          role: string
          status: string | null
          title: string
          total_impact_score: number | null
          updated_at: string
          user_id: string
          was_blocked: boolean | null
        }
        Insert: {
          actual_impact?: Json | null
          affected_roles?: string[] | null
          alternatives?: Json | null
          block_reason?: string | null
          created_at?: string
          decision_type: string
          description?: string | null
          executed_at?: string | null
          id?: string
          impact_customer?: number | null
          impact_financial?: number | null
          impact_operational?: number | null
          impact_system?: number | null
          outcome?: string | null
          outcome_accuracy?: number | null
          predicted_impact?: Json | null
          recommendation?: string | null
          risk_level?: string | null
          risk_score?: number | null
          role: string
          status?: string | null
          title: string
          total_impact_score?: number | null
          updated_at?: string
          user_id: string
          was_blocked?: boolean | null
        }
        Update: {
          actual_impact?: Json | null
          affected_roles?: string[] | null
          alternatives?: Json | null
          block_reason?: string | null
          created_at?: string
          decision_type?: string
          description?: string | null
          executed_at?: string | null
          id?: string
          impact_customer?: number | null
          impact_financial?: number | null
          impact_operational?: number | null
          impact_system?: number | null
          outcome?: string | null
          outcome_accuracy?: number | null
          predicted_impact?: Json | null
          recommendation?: string | null
          risk_level?: string | null
          risk_score?: number | null
          role?: string
          status?: string | null
          title?: string
          total_impact_score?: number | null
          updated_at?: string
          user_id?: string
          was_blocked?: boolean | null
        }
        Relationships: []
      }
      decision_outcomes: {
        Row: {
          after_value: number | null
          before_value: number | null
          created_at: string
          decision_id: string
          id: string
          impact_metric: string | null
          improvement_percent: number | null
          measured_at: string
          notes: string | null
          result_status: string
        }
        Insert: {
          after_value?: number | null
          before_value?: number | null
          created_at?: string
          decision_id: string
          id?: string
          impact_metric?: string | null
          improvement_percent?: number | null
          measured_at?: string
          notes?: string | null
          result_status: string
        }
        Update: {
          after_value?: number | null
          before_value?: number | null
          created_at?: string
          decision_id?: string
          id?: string
          impact_metric?: string | null
          improvement_percent?: number | null
          measured_at?: string
          notes?: string | null
          result_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_outcomes_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "autonomous_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_simulations: {
        Row: {
          cash_impact: number | null
          created_at: string
          executed_at: string | null
          id: string
          input_params: Json
          profit_impact: number | null
          recommendation: string | null
          results: Json | null
          risk_level: string | null
          scenario_name: string
          simulation_type: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cash_impact?: number | null
          created_at?: string
          executed_at?: string | null
          id?: string
          input_params?: Json
          profit_impact?: number | null
          recommendation?: string | null
          results?: Json | null
          risk_level?: string | null
          scenario_name: string
          simulation_type: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cash_impact?: number | null
          created_at?: string
          executed_at?: string | null
          id?: string
          input_params?: Json
          profit_impact?: number | null
          recommendation?: string | null
          results?: Json | null
          risk_level?: string | null
          scenario_name?: string
          simulation_type?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deferred_revenue_ledger: {
        Row: {
          amount_received: number
          contract_id: string | null
          created_at: string
          id: string
          recognition_schedule: Json | null
          remaining_deferred: number
          revenue_recognized: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount_received?: number
          contract_id?: string | null
          created_at?: string
          id?: string
          recognition_schedule?: Json | null
          remaining_deferred?: number
          revenue_recognized?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_received?: number
          contract_id?: string | null
          created_at?: string
          id?: string
          recognition_schedule?: Json | null
          remaining_deferred?: number
          revenue_recognized?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deferred_revenue_ledger_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "revenue_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      delegated_access_sessions: {
        Row: {
          access_scope: string[] | null
          approved_by: string | null
          created_at: string | null
          customer_id: string | null
          ended_at: string | null
          expires_at: string | null
          fields_accessed: string[] | null
          id: string
          pages_viewed: string[] | null
          partner_id: string | null
          reason: string
          requested_by: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          access_scope?: string[] | null
          approved_by?: string | null
          created_at?: string | null
          customer_id?: string | null
          ended_at?: string | null
          expires_at?: string | null
          fields_accessed?: string[] | null
          id?: string
          pages_viewed?: string[] | null
          partner_id?: string | null
          reason: string
          requested_by?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          access_scope?: string[] | null
          approved_by?: string | null
          created_at?: string | null
          customer_id?: string | null
          ended_at?: string | null
          expires_at?: string | null
          fields_accessed?: string[] | null
          id?: string
          pages_viewed?: string[] | null
          partner_id?: string | null
          reason?: string
          requested_by?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delegated_access_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "partner_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegated_access_sessions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_csat_surveys: {
        Row: {
          comment: string | null
          customer_email: string | null
          customer_name: string | null
          dispatch_id: string | null
          expires_at: string
          id: string
          nps: number | null
          organization_id: string
          public_token: string
          rating: number | null
          responded_at: string | null
          sent_at: string
        }
        Insert: {
          comment?: string | null
          customer_email?: string | null
          customer_name?: string | null
          dispatch_id?: string | null
          expires_at?: string
          id?: string
          nps?: number | null
          organization_id: string
          public_token?: string
          rating?: number | null
          responded_at?: string | null
          sent_at?: string
        }
        Update: {
          comment?: string | null
          customer_email?: string | null
          customer_name?: string | null
          dispatch_id?: string | null
          expires_at?: string
          id?: string
          nps?: number | null
          organization_id?: string
          public_token?: string
          rating?: number | null
          responded_at?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_csat_surveys_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_csat_surveys_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_exceptions: {
        Row: {
          assigned_to: string | null
          cost_impact: number | null
          created_at: string
          description: string
          dispatch_id: string | null
          dispatch_number: string | null
          exception_type: string
          id: string
          organization_id: string
          reported_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          sla_impact_hours: number | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          cost_impact?: number | null
          created_at?: string
          description: string
          dispatch_id?: string | null
          dispatch_number?: string | null
          exception_type: string
          id?: string
          organization_id: string
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          sla_impact_hours?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          cost_impact?: number | null
          created_at?: string
          description?: string
          dispatch_id?: string | null
          dispatch_number?: string | null
          exception_type?: string
          id?: string
          organization_id?: string
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          sla_impact_hours?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_exceptions_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_exceptions_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_exceptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_updates: {
        Row: {
          created_at: string
          dispatch_id: string
          email_sent: boolean | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          notes: string | null
          photo_url: string | null
          status: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          dispatch_id: string
          email_sent?: boolean | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          notes?: string | null
          photo_url?: string | null
          status: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          dispatch_id?: string
          email_sent?: boolean | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          notes?: string | null
          photo_url?: string | null
          status?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_updates_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_updates_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_forecasts: {
        Row: {
          actual_demand: number | null
          confidence_score: number | null
          created_at: string | null
          data_sources: string[] | null
          forecast_period: string
          growth_trend: number | null
          id: string
          predicted_demand: number | null
          restock_recommendation: string | null
          seasonality_factor: number | null
          sku_name: string
          territory: string
          updated_at: string | null
          variance_percent: number | null
        }
        Insert: {
          actual_demand?: number | null
          confidence_score?: number | null
          created_at?: string | null
          data_sources?: string[] | null
          forecast_period: string
          growth_trend?: number | null
          id?: string
          predicted_demand?: number | null
          restock_recommendation?: string | null
          seasonality_factor?: number | null
          sku_name: string
          territory: string
          updated_at?: string | null
          variance_percent?: number | null
        }
        Update: {
          actual_demand?: number | null
          confidence_score?: number | null
          created_at?: string | null
          data_sources?: string[] | null
          forecast_period?: string
          growth_trend?: number | null
          id?: string
          predicted_demand?: number | null
          restock_recommendation?: string | null
          seasonality_factor?: number | null
          sku_name?: string
          territory?: string
          updated_at?: string | null
          variance_percent?: number | null
        }
        Relationships: []
      }
      demand_signals: {
        Row: {
          avg_dispatch_delay: number | null
          created_at: string | null
          demand_score: number | null
          hour: number | null
          id: string
          recorded_date: string | null
          request_count: number | null
          route_hash: string
        }
        Insert: {
          avg_dispatch_delay?: number | null
          created_at?: string | null
          demand_score?: number | null
          hour?: number | null
          id?: string
          recorded_date?: string | null
          request_count?: number | null
          route_hash: string
        }
        Update: {
          avg_dispatch_delay?: number | null
          created_at?: string | null
          demand_score?: number | null
          hour?: number | null
          id?: string
          recorded_date?: string | null
          request_count?: number | null
          route_hash?: string
        }
        Relationships: []
      }
      dept_ai_advisor_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
          tokens: number | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
          tokens?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dept_ai_advisor_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dept_ai_advisor_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dept_ai_advisor_threads: {
        Row: {
          context: string | null
          created_at: string
          id: string
          last_message_preview: string | null
          organization_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          last_message_preview?: string | null
          organization_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          last_message_preview?: string | null
          organization_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dept_budgets: {
        Row: {
          budget_amount: number
          budget_period: string
          budget_year: number
          category: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          organization_id: string
          period_label: string
          updated_at: string
        }
        Insert: {
          budget_amount?: number
          budget_period: string
          budget_year: number
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          period_label: string
          updated_at?: string
        }
        Update: {
          budget_amount?: number
          budget_period?: string
          budget_year?: number
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          period_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dept_budgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dept_inventory_doi: {
        Row: {
          avg_daily_usage: number
          current_stock: number
          doi_current: number | null
          doi_maximum: number
          doi_minimum: number
          doi_status: string | null
          id: string
          last_synced_at: string | null
          organization_id: string
          sku_code: string
          sku_name: string | null
          source_system: string | null
          updated_at: string
        }
        Insert: {
          avg_daily_usage?: number
          current_stock?: number
          doi_current?: number | null
          doi_maximum?: number
          doi_minimum?: number
          doi_status?: string | null
          id?: string
          last_synced_at?: string | null
          organization_id: string
          sku_code: string
          sku_name?: string | null
          source_system?: string | null
          updated_at?: string
        }
        Update: {
          avg_daily_usage?: number
          current_stock?: number
          doi_current?: number | null
          doi_maximum?: number
          doi_minimum?: number
          doi_status?: string | null
          id?: string
          last_synced_at?: string | null
          organization_id?: string
          sku_code?: string
          sku_name?: string | null
          source_system?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dept_inventory_doi_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dept_pricing_applications: {
        Row: {
          adjusted_rate_ngn: number
          adjustment_amount: number
          applied_at: string
          base_rate_ngn: number
          dispatch_id: string | null
          id: string
          organization_id: string
          rule_id: string | null
          rule_snapshot: Json | null
        }
        Insert: {
          adjusted_rate_ngn: number
          adjustment_amount: number
          applied_at?: string
          base_rate_ngn: number
          dispatch_id?: string | null
          id?: string
          organization_id: string
          rule_id?: string | null
          rule_snapshot?: Json | null
        }
        Update: {
          adjusted_rate_ngn?: number
          adjustment_amount?: number
          applied_at?: string
          base_rate_ngn?: number
          dispatch_id?: string | null
          id?: string
          organization_id?: string
          rule_id?: string | null
          rule_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dept_pricing_applications_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dept_pricing_applications_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dept_pricing_applications_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "dept_pricing_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      dept_pricing_rules: {
        Row: {
          adjustment_type: string
          adjustment_value: number
          conditions: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          organization_id: string
          priority: number
          rule_name: string
          rule_type: string
          updated_at: string
        }
        Insert: {
          adjustment_type: string
          adjustment_value: number
          conditions?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          priority?: number
          rule_name: string
          rule_type: string
          updated_at?: string
        }
        Update: {
          adjustment_type?: string
          adjustment_value?: number
          conditions?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          priority?: number
          rule_name?: string
          rule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      dept_route_approvals: {
        Row: {
          created_at: string
          destination: string
          estimated_cost: number
          id: string
          justification: string | null
          organization_id: string
          origin: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          route_name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          destination: string
          estimated_cost?: number
          id?: string
          justification?: string | null
          organization_id: string
          origin: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          route_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          destination?: string
          estimated_cost?: number
          id?: string
          justification?: string | null
          organization_id?: string
          origin?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          route_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      diesel_rate_config: {
        Row: {
          created_at: string
          created_by: string | null
          destination: string
          diesel_cost_per_liter: number | null
          diesel_liters_agreed: number
          distance_km: number | null
          id: string
          is_active: boolean | null
          notes: string | null
          origin: string
          route_id: string | null
          route_name: string
          truck_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destination: string
          diesel_cost_per_liter?: number | null
          diesel_liters_agreed: number
          distance_km?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          origin: string
          route_id?: string | null
          route_name: string
          truck_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destination?: string
          diesel_cost_per_liter?: number | null
          diesel_liters_agreed?: number
          distance_km?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          origin?: string
          route_id?: string | null
          route_name?: string
          truck_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diesel_rate_config_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_delay_reasons: {
        Row: {
          category: string
          created_at: string | null
          dispatch_id: string
          id: string
          notes: string | null
          reason: string
          reported_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          dispatch_id: string
          id?: string
          notes?: string | null
          reason: string
          reported_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          dispatch_id?: string
          id?: string
          notes?: string | null
          reason?: string
          reported_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_delay_reasons_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_delay_reasons_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_dropoffs: {
        Row: {
          actual_arrival: string | null
          address: string
          created_at: string | null
          dispatch_id: string | null
          estimated_arrival: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          sequence_order: number
        }
        Insert: {
          actual_arrival?: string | null
          address: string
          created_at?: string | null
          dispatch_id?: string | null
          estimated_arrival?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          sequence_order: number
        }
        Update: {
          actual_arrival?: string | null
          address?: string
          created_at?: string | null
          dispatch_id?: string | null
          estimated_arrival?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          sequence_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_dropoffs_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_dropoffs_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_locks: {
        Row: {
          dispatch_id: string
          expires_at: string
          lock_reason: string
          locked_at: string | null
          locked_by: string | null
        }
        Insert: {
          dispatch_id: string
          expires_at: string
          lock_reason: string
          locked_at?: string | null
          locked_by?: string | null
        }
        Update: {
          dispatch_id?: string
          expires_at?: string
          lock_reason?: string
          locked_at?: string | null
          locked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_locks_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: true
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_locks_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: true
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_plan_items: {
        Row: {
          created_at: string | null
          dispatch_id: string | null
          driver_id: string | null
          estimated_cost: number | null
          estimated_distance_km: number | null
          grouping_reason: string | null
          id: string
          order_id: string | null
          plan_id: string | null
          route_group: string | null
          sequence_order: number | null
          suggested_vehicle_type: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string | null
          dispatch_id?: string | null
          driver_id?: string | null
          estimated_cost?: number | null
          estimated_distance_km?: number | null
          grouping_reason?: string | null
          id?: string
          order_id?: string | null
          plan_id?: string | null
          route_group?: string | null
          sequence_order?: number | null
          suggested_vehicle_type?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string | null
          dispatch_id?: string | null
          driver_id?: string | null
          estimated_cost?: number | null
          estimated_distance_km?: number | null
          grouping_reason?: string | null
          id?: string
          order_id?: string | null
          plan_id?: string | null
          route_group?: string | null
          sequence_order?: number | null
          suggested_vehicle_type?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_plan_items_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_plan_items_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_plan_items_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_plan_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "dispatch_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_plan_items_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_plans: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          plan_number: string
          planned_date: string
          rejection_reason: string | null
          status: string | null
          total_cost: number | null
          total_distance_km: number | null
          total_orders: number | null
          updated_at: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          plan_number: string
          planned_date?: string
          rejection_reason?: string | null
          status?: string | null
          total_cost?: number | null
          total_distance_km?: number | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          plan_number?: string
          planned_date?: string
          rejection_reason?: string | null
          status?: string | null
          total_cost?: number | null
          total_distance_km?: number | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dispatch_safety_gates: {
        Row: {
          created_at: string
          decided_by: string | null
          decision: string
          dispatch_id: string | null
          gate_type: string
          id: string
          inspection_id: string | null
          organization_id: string | null
          override_by: string | null
          override_reason: string | null
          prediction_ids: string[] | null
          reason: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          decided_by?: string | null
          decision: string
          dispatch_id?: string | null
          gate_type: string
          id?: string
          inspection_id?: string | null
          organization_id?: string | null
          override_by?: string | null
          override_reason?: string | null
          prediction_ids?: string[] | null
          reason?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          decided_by?: string | null
          decision?: string
          dispatch_id?: string | null
          gate_type?: string
          id?: string
          inspection_id?: string | null
          organization_id?: string | null
          override_by?: string | null
          override_reason?: string | null
          prediction_ids?: string[] | null
          reason?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_safety_gates_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_safety_gates_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_safety_gates_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "vehicle_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_safety_gates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_safety_gates_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_sla_timers: {
        Row: {
          breached: boolean | null
          breached_at: string | null
          completed_at: string | null
          created_at: string | null
          deadline_at: string
          dispatch_id: string
          id: string
          notification_sent: boolean | null
          started_at: string
          state: string
        }
        Insert: {
          breached?: boolean | null
          breached_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          deadline_at: string
          dispatch_id: string
          id?: string
          notification_sent?: boolean | null
          started_at?: string
          state: string
        }
        Update: {
          breached?: boolean | null
          breached_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          deadline_at?: string
          dispatch_id?: string
          id?: string
          notification_sent?: boolean | null
          started_at?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_sla_timers_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_sla_timers_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_state_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          dispatch_id: string
          from_state: string | null
          id: string
          metadata: Json | null
          reason: string | null
          to_state: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          dispatch_id: string
          from_state?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          to_state: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          dispatch_id?: string
          from_state?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          to_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_state_history_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_state_history_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_state_transitions: {
        Row: {
          allowed_roles: Database["public"]["Enums"]["app_role"][]
          auto_trigger: string | null
          created_at: string | null
          from_state: Database["public"]["Enums"]["dispatch_state"]
          id: string
          requires_reason: boolean | null
          sla_hours: number | null
          to_state: Database["public"]["Enums"]["dispatch_state"]
        }
        Insert: {
          allowed_roles?: Database["public"]["Enums"]["app_role"][]
          auto_trigger?: string | null
          created_at?: string | null
          from_state: Database["public"]["Enums"]["dispatch_state"]
          id?: string
          requires_reason?: boolean | null
          sla_hours?: number | null
          to_state: Database["public"]["Enums"]["dispatch_state"]
        }
        Update: {
          allowed_roles?: Database["public"]["Enums"]["app_role"][]
          auto_trigger?: string | null
          created_at?: string | null
          from_state?: Database["public"]["Enums"]["dispatch_state"]
          id?: string
          requires_reason?: boolean | null
          sla_hours?: number | null
          to_state?: Database["public"]["Enums"]["dispatch_state"]
        }
        Relationships: []
      }
      dispatches: {
        Row: {
          actual_arrival_time: string | null
          actual_delivery: string | null
          actual_delivery_days: number | null
          actual_fuel_liters: number | null
          actual_pickup: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          avg_wait_time_per_drop: number | null
          cargo_description: string | null
          cargo_weight_kg: number | null
          cost: number | null
          created_at: string
          created_by: string | null
          customer_id: string
          delivery_address: string
          delivery_lat: number | null
          delivery_lng: number | null
          dispatch_date: string | null
          dispatch_number: string
          distance_km: number | null
          driver_id: string | null
          estimated_arrival: string | null
          estimated_completion_date: string | null
          estimated_delivery_days: number | null
          estimated_start_date: string | null
          eta_met: boolean | null
          eta_minutes: number | null
          eta_promised: string | null
          external_synced_at: string | null
          fuel_variance: number | null
          id: string
          km_actual: number | null
          km_deviation_pct: number | null
          km_planned: number | null
          load_capacity_pct: number | null
          notes: string | null
          on_time_flag: boolean | null
          organization_id: string | null
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          pod_confirmed: boolean | null
          pod_confirmed_at: string | null
          pod_confirmed_by: string | null
          pod_notes: string | null
          pod_photo_url: string | null
          pod_recipient: string | null
          priority: string | null
          rejection_reason: string | null
          return_distance_km: number | null
          route_id: string | null
          scheduled_delivery: string | null
          scheduled_pickup: string | null
          sequence_followed: boolean | null
          sla_contract_id: string | null
          sla_deadline: string | null
          sla_policy_id: string | null
          sla_risk_score: number | null
          sla_status: string | null
          source_outbound_ids: string[] | null
          status: string | null
          submitted_by: string | null
          suggested_fuel_liters: number | null
          total_distance_km: number | null
          total_drops: number | null
          transporter_id: string | null
          transporter_notified_at: string | null
          unplanned_stops: number | null
          updated_at: string
          vehicle_id: string | null
          vendor_rate_card_id: string | null
        }
        Insert: {
          actual_arrival_time?: string | null
          actual_delivery?: string | null
          actual_delivery_days?: number | null
          actual_fuel_liters?: number | null
          actual_pickup?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avg_wait_time_per_drop?: number | null
          cargo_description?: string | null
          cargo_weight_kg?: number | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivery_address: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          dispatch_date?: string | null
          dispatch_number: string
          distance_km?: number | null
          driver_id?: string | null
          estimated_arrival?: string | null
          estimated_completion_date?: string | null
          estimated_delivery_days?: number | null
          estimated_start_date?: string | null
          eta_met?: boolean | null
          eta_minutes?: number | null
          eta_promised?: string | null
          external_synced_at?: string | null
          fuel_variance?: number | null
          id?: string
          km_actual?: number | null
          km_deviation_pct?: number | null
          km_planned?: number | null
          load_capacity_pct?: number | null
          notes?: string | null
          on_time_flag?: boolean | null
          organization_id?: string | null
          pickup_address: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pod_confirmed?: boolean | null
          pod_confirmed_at?: string | null
          pod_confirmed_by?: string | null
          pod_notes?: string | null
          pod_photo_url?: string | null
          pod_recipient?: string | null
          priority?: string | null
          rejection_reason?: string | null
          return_distance_km?: number | null
          route_id?: string | null
          scheduled_delivery?: string | null
          scheduled_pickup?: string | null
          sequence_followed?: boolean | null
          sla_contract_id?: string | null
          sla_deadline?: string | null
          sla_policy_id?: string | null
          sla_risk_score?: number | null
          sla_status?: string | null
          source_outbound_ids?: string[] | null
          status?: string | null
          submitted_by?: string | null
          suggested_fuel_liters?: number | null
          total_distance_km?: number | null
          total_drops?: number | null
          transporter_id?: string | null
          transporter_notified_at?: string | null
          unplanned_stops?: number | null
          updated_at?: string
          vehicle_id?: string | null
          vendor_rate_card_id?: string | null
        }
        Update: {
          actual_arrival_time?: string | null
          actual_delivery?: string | null
          actual_delivery_days?: number | null
          actual_fuel_liters?: number | null
          actual_pickup?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avg_wait_time_per_drop?: number | null
          cargo_description?: string | null
          cargo_weight_kg?: number | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivery_address?: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          dispatch_date?: string | null
          dispatch_number?: string
          distance_km?: number | null
          driver_id?: string | null
          estimated_arrival?: string | null
          estimated_completion_date?: string | null
          estimated_delivery_days?: number | null
          estimated_start_date?: string | null
          eta_met?: boolean | null
          eta_minutes?: number | null
          eta_promised?: string | null
          external_synced_at?: string | null
          fuel_variance?: number | null
          id?: string
          km_actual?: number | null
          km_deviation_pct?: number | null
          km_planned?: number | null
          load_capacity_pct?: number | null
          notes?: string | null
          on_time_flag?: boolean | null
          organization_id?: string | null
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pod_confirmed?: boolean | null
          pod_confirmed_at?: string | null
          pod_confirmed_by?: string | null
          pod_notes?: string | null
          pod_photo_url?: string | null
          pod_recipient?: string | null
          priority?: string | null
          rejection_reason?: string | null
          return_distance_km?: number | null
          route_id?: string | null
          scheduled_delivery?: string | null
          scheduled_pickup?: string | null
          sequence_followed?: boolean | null
          sla_contract_id?: string | null
          sla_deadline?: string | null
          sla_policy_id?: string | null
          sla_risk_score?: number | null
          sla_status?: string | null
          source_outbound_ids?: string[] | null
          status?: string | null
          submitted_by?: string | null
          suggested_fuel_liters?: number | null
          total_distance_km?: number | null
          total_drops?: number | null
          transporter_id?: string | null
          transporter_notified_at?: string | null
          unplanned_stops?: number | null
          updated_at?: string
          vehicle_id?: string | null
          vendor_rate_card_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatches_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_sla_contract_id_fkey"
            columns: ["sla_contract_id"]
            isOneToOne: false
            referencedRelation: "sla_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_sla_policy_id_fkey"
            columns: ["sla_policy_id"]
            isOneToOne: false
            referencedRelation: "sla_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_vendor_rate_card_id_fkey"
            columns: ["vendor_rate_card_id"]
            isOneToOne: false
            referencedRelation: "vendor_rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_marketplace_profiles: {
        Row: {
          category_expertise: string[] | null
          company_name: string
          country: string
          created_at: string | null
          fleet_size: number | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          monthly_revenue: number | null
          performance_rating: number | null
          region: string | null
          retail_network_size: number | null
          territories_served: string[] | null
          updated_at: string | null
          user_id: string | null
          warehouse_count: number | null
        }
        Insert: {
          category_expertise?: string[] | null
          company_name: string
          country?: string
          created_at?: string | null
          fleet_size?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          monthly_revenue?: number | null
          performance_rating?: number | null
          region?: string | null
          retail_network_size?: number | null
          territories_served?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          warehouse_count?: number | null
        }
        Update: {
          category_expertise?: string[] | null
          company_name?: string
          country?: string
          created_at?: string | null
          fleet_size?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          monthly_revenue?: number | null
          performance_rating?: number | null
          region?: string | null
          retail_network_size?: number | null
          territories_served?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          warehouse_count?: number | null
        }
        Relationships: []
      }
      distributor_partnership_requests: {
        Row: {
          created_at: string | null
          distributor_profile_id: string | null
          id: string
          manufacturer_name: string
          manufacturer_user_id: string
          message: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          distributor_profile_id?: string | null
          id?: string
          manufacturer_name: string
          manufacturer_user_id: string
          message?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          distributor_profile_id?: string | null
          id?: string
          manufacturer_name?: string
          manufacturer_user_id?: string
          message?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distributor_partnership_requests_distributor_profile_id_fkey"
            columns: ["distributor_profile_id"]
            isOneToOne: false
            referencedRelation: "distributor_marketplace_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_behavior_events: {
        Row: {
          created_at: string | null
          description: string | null
          dispatch_id: string | null
          driver_id: string
          event_type: string
          id: string
          location_lat: number | null
          location_lng: number | null
          metadata: Json | null
          severity: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          dispatch_id?: string | null
          driver_id: string
          event_type: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          metadata?: Json | null
          severity?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          dispatch_id?: string | null
          driver_id?: string
          event_type?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          metadata?: Json | null
          severity?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      driver_behavior_scores: {
        Row: {
          brake_acceleration_score: number | null
          created_at: string | null
          delivery_timeliness_score: number | null
          dispatch_tier: string | null
          driver_id: string
          fuel_efficiency_score: number | null
          id: string
          incident_history_score: number | null
          inspection_compliance_score: number | null
          last_calculated_at: string | null
          overall_score: number | null
          route_compliance_score: number | null
          safety_score: number | null
          total_incidents: number | null
          total_trips: number | null
          updated_at: string | null
        }
        Insert: {
          brake_acceleration_score?: number | null
          created_at?: string | null
          delivery_timeliness_score?: number | null
          dispatch_tier?: string | null
          driver_id: string
          fuel_efficiency_score?: number | null
          id?: string
          incident_history_score?: number | null
          inspection_compliance_score?: number | null
          last_calculated_at?: string | null
          overall_score?: number | null
          route_compliance_score?: number | null
          safety_score?: number | null
          total_incidents?: number | null
          total_trips?: number | null
          updated_at?: string | null
        }
        Update: {
          brake_acceleration_score?: number | null
          created_at?: string | null
          delivery_timeliness_score?: number | null
          dispatch_tier?: string | null
          driver_id?: string
          fuel_efficiency_score?: number | null
          id?: string
          incident_history_score?: number | null
          inspection_compliance_score?: number | null
          last_calculated_at?: string | null
          overall_score?: number | null
          route_compliance_score?: number | null
          safety_score?: number | null
          total_incidents?: number | null
          total_trips?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      driver_bonus_config: {
        Row: {
          bonus_amount: number
          bonus_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          metric: string
          threshold: number
          updated_at: string | null
        }
        Insert: {
          bonus_amount: number
          bonus_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metric: string
          threshold: number
          updated_at?: string | null
        }
        Update: {
          bonus_amount?: number
          bonus_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metric?: string
          threshold?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      driver_bonuses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          bonus_type: string
          created_at: string | null
          driver_id: string | null
          id: string
          metrics: Json | null
          period_end: string | null
          period_start: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bonus_type: string
          created_at?: string | null
          driver_id?: string | null
          id?: string
          metrics?: Json | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bonus_type?: string
          created_at?: string | null
          driver_id?: string | null
          id?: string
          metrics?: Json | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_bonuses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_devices: {
        Row: {
          device_id: string
          device_name: string | null
          device_type: string | null
          driver_id: string
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          last_location_lat: number | null
          last_location_lng: number | null
          last_seen_at: string | null
          registered_at: string | null
        }
        Insert: {
          device_id: string
          device_name?: string | null
          device_type?: string | null
          driver_id: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_location_lat?: number | null
          last_location_lng?: number | null
          last_seen_at?: string | null
          registered_at?: string | null
        }
        Update: {
          device_id?: string
          device_name?: string | null
          device_type?: string | null
          driver_id?: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_location_lat?: number | null
          last_location_lng?: number | null
          last_seen_at?: string | null
          registered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_devices_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          document_url: string | null
          driver_id: string
          expiry_date: string | null
          id: string
          is_verified: boolean | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          document_url?: string | null
          driver_id: string
          expiry_date?: string | null
          id?: string
          is_verified?: boolean | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          document_url?: string | null
          driver_id?: string
          expiry_date?: string | null
          id?: string
          is_verified?: boolean | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_insurance_profiles: {
        Row: {
          accident_history_score: number | null
          behavior_score: number | null
          claim_probability: number | null
          claims_history_score: number | null
          created_at: string | null
          driver_id: string
          fatigue_pattern_score: number | null
          id: string
          inspection_failure_score: number | null
          insurance_risk_score: number | null
          last_calculated_at: string | null
          premium_multiplier: number | null
          risk_tier: string | null
          route_violation_score: number | null
          timeliness_risk_score: number | null
          total_claim_amount: number | null
          total_claims: number | null
          updated_at: string | null
        }
        Insert: {
          accident_history_score?: number | null
          behavior_score?: number | null
          claim_probability?: number | null
          claims_history_score?: number | null
          created_at?: string | null
          driver_id: string
          fatigue_pattern_score?: number | null
          id?: string
          inspection_failure_score?: number | null
          insurance_risk_score?: number | null
          last_calculated_at?: string | null
          premium_multiplier?: number | null
          risk_tier?: string | null
          route_violation_score?: number | null
          timeliness_risk_score?: number | null
          total_claim_amount?: number | null
          total_claims?: number | null
          updated_at?: string | null
        }
        Update: {
          accident_history_score?: number | null
          behavior_score?: number | null
          claim_probability?: number | null
          claims_history_score?: number | null
          created_at?: string | null
          driver_id?: string
          fatigue_pattern_score?: number | null
          id?: string
          inspection_failure_score?: number | null
          insurance_risk_score?: number | null
          last_calculated_at?: string | null
          premium_multiplier?: number | null
          risk_tier?: string | null
          route_violation_score?: number | null
          timeliness_risk_score?: number | null
          total_claim_amount?: number | null
          total_claims?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      driver_job_notifications: {
        Row: {
          body: string | null
          created_at: string
          dispatch_id: string | null
          driver_id: string
          expires_at: string | null
          id: string
          organization_id: string
          status: string
          title: string
          updated_at: string
          vehicle_category: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dispatch_id?: string | null
          driver_id: string
          expires_at?: string | null
          id?: string
          organization_id: string
          status?: string
          title: string
          updated_at?: string
          vehicle_category: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dispatch_id?: string | null
          driver_id?: string
          expires_at?: string | null
          id?: string
          organization_id?: string
          status?: string
          title?: string
          updated_at?: string
          vehicle_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_job_notifications_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_salaries: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          dispatch_id: string | null
          driver_id: string
          firs_submission_date: string | null
          gross_amount: number
          id: string
          net_amount: number | null
          notes: string | null
          organization_id: string | null
          period_end: string | null
          period_start: string | null
          remita_rrr: string | null
          remita_status: string | null
          salary_type: string
          status: string | null
          tax_amount: number | null
          taxable_income: number | null
          updated_at: string
          zoho_synced_at: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          dispatch_id?: string | null
          driver_id: string
          firs_submission_date?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number | null
          notes?: string | null
          organization_id?: string | null
          period_end?: string | null
          period_start?: string | null
          remita_rrr?: string | null
          remita_status?: string | null
          salary_type: string
          status?: string | null
          tax_amount?: number | null
          taxable_income?: number | null
          updated_at?: string
          zoho_synced_at?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          dispatch_id?: string | null
          driver_id?: string
          firs_submission_date?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number | null
          notes?: string | null
          organization_id?: string | null
          period_end?: string | null
          period_start?: string | null
          remita_rrr?: string | null
          remita_status?: string | null
          salary_type?: string
          status?: string | null
          tax_amount?: number | null
          taxable_income?: number | null
          updated_at?: string
          zoho_synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_salaries_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_salaries_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_salaries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_salaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_sensitive_details: {
        Row: {
          created_at: string
          driver_id: string
          nin_document_url: string | null
          organization_id: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          nin_document_url?: string | null
          organization_id?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          nin_document_url?: string | null
          organization_id?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_sensitive_details_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          annual_rent_relief: number | null
          base_salary: number | null
          created_at: string
          documents_verified: boolean | null
          driver_type: string | null
          email: string | null
          full_name: string
          id: string
          last_lat: number | null
          last_lng: number | null
          last_location_at: string | null
          license_document_url: string | null
          license_expiry: string | null
          license_number: string | null
          life_insurance: number | null
          nhf_contribution: number | null
          nhis_contribution: number | null
          organization_id: string | null
          partner_id: string | null
          pension_contribution: number | null
          phone: string
          preferred_vehicle_category: string | null
          profile_picture_url: string | null
          rating: number | null
          salary_type: string | null
          status: string | null
          total_trips: number | null
          updated_at: string
          user_id: string | null
          verification_method: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          annual_rent_relief?: number | null
          base_salary?: number | null
          created_at?: string
          documents_verified?: boolean | null
          driver_type?: string | null
          email?: string | null
          full_name: string
          id?: string
          last_lat?: number | null
          last_lng?: number | null
          last_location_at?: string | null
          license_document_url?: string | null
          license_expiry?: string | null
          license_number?: string | null
          life_insurance?: number | null
          nhf_contribution?: number | null
          nhis_contribution?: number | null
          organization_id?: string | null
          partner_id?: string | null
          pension_contribution?: number | null
          phone: string
          preferred_vehicle_category?: string | null
          profile_picture_url?: string | null
          rating?: number | null
          salary_type?: string | null
          status?: string | null
          total_trips?: number | null
          updated_at?: string
          user_id?: string | null
          verification_method?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          annual_rent_relief?: number | null
          base_salary?: number | null
          created_at?: string
          documents_verified?: boolean | null
          driver_type?: string | null
          email?: string | null
          full_name?: string
          id?: string
          last_lat?: number | null
          last_lng?: number | null
          last_location_at?: string | null
          license_document_url?: string | null
          license_expiry?: string | null
          license_number?: string | null
          life_insurance?: number | null
          nhf_contribution?: number | null
          nhis_contribution?: number | null
          organization_id?: string | null
          partner_id?: string | null
          pension_contribution?: number | null
          phone?: string
          preferred_vehicle_category?: string | null
          profile_picture_url?: string | null
          rating?: number | null
          salary_type?: string | null
          status?: string | null
          total_trips?: number | null
          updated_at?: string
          user_id?: string | null
          verification_method?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      drop_performance_metrics: {
        Row: {
          cost_per_drop: number | null
          created_at: string
          driver_productivity_index: number | null
          fleet_roi_percent: number | null
          fuel_leakage_percent: number | null
          id: string
          organization_id: string | null
          period_date: string
          revenue_per_km: number | null
          sla_compliance_percent: number | null
          total_drops: number
          trip_profitability_score: number | null
        }
        Insert: {
          cost_per_drop?: number | null
          created_at?: string
          driver_productivity_index?: number | null
          fleet_roi_percent?: number | null
          fuel_leakage_percent?: number | null
          id?: string
          organization_id?: string | null
          period_date: string
          revenue_per_km?: number | null
          sla_compliance_percent?: number | null
          total_drops?: number
          trip_profitability_score?: number | null
        }
        Update: {
          cost_per_drop?: number | null
          created_at?: string
          driver_productivity_index?: number | null
          fleet_roi_percent?: number | null
          fuel_leakage_percent?: number | null
          id?: string
          organization_id?: string | null
          period_date?: string
          revenue_per_km?: number | null
          sla_compliance_percent?: number | null
          total_drops?: number
          trip_profitability_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drop_performance_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      drop_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          description: string | null
          dispatch_id: string | null
          id: string
          transaction_type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          dispatch_id?: string | null
          id?: string
          transaction_type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          dispatch_id?: string | null
          id?: string
          transaction_type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drop_transactions_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drop_transactions_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drop_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "drop_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      drop_wallets: {
        Row: {
          alert_threshold_percent: number
          balance_drops: number
          created_at: string
          id: string
          is_locked: boolean
          last_recharge_at: string | null
          locked_at: string | null
          organization_id: string
          total_purchased: number
          total_used: number
          updated_at: string
        }
        Insert: {
          alert_threshold_percent?: number
          balance_drops?: number
          created_at?: string
          id?: string
          is_locked?: boolean
          last_recharge_at?: string | null
          locked_at?: string | null
          organization_id: string
          total_purchased?: number
          total_used?: number
          updated_at?: string
        }
        Update: {
          alert_threshold_percent?: number
          balance_drops?: number
          created_at?: string
          id?: string
          is_locked?: boolean
          last_recharge_at?: string | null
          locked_at?: string | null
          organization_id?: string
          total_purchased?: number
          total_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drop_wallets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_pricing_config: {
        Row: {
          availability_multiplier: number | null
          availability_weight: number | null
          base_price: number
          created_at: string | null
          created_by: string | null
          demand_multiplier: number | null
          demand_weight: number | null
          fuel_multiplier: number | null
          fuel_weight: number | null
          id: string
          is_active: boolean | null
          max_multiplier: number | null
          min_multiplier: number | null
          risk_multiplier: number | null
          risk_weight: number | null
          route_id: string | null
          updated_at: string | null
        }
        Insert: {
          availability_multiplier?: number | null
          availability_weight?: number | null
          base_price: number
          created_at?: string | null
          created_by?: string | null
          demand_multiplier?: number | null
          demand_weight?: number | null
          fuel_multiplier?: number | null
          fuel_weight?: number | null
          id?: string
          is_active?: boolean | null
          max_multiplier?: number | null
          min_multiplier?: number | null
          risk_multiplier?: number | null
          risk_weight?: number | null
          route_id?: string | null
          updated_at?: string | null
        }
        Update: {
          availability_multiplier?: number | null
          availability_weight?: number | null
          base_price?: number
          created_at?: string | null
          created_by?: string | null
          demand_multiplier?: number | null
          demand_weight?: number | null
          fuel_multiplier?: number | null
          fuel_weight?: number | null
          id?: string
          is_active?: boolean | null
          max_multiplier?: number | null
          min_multiplier?: number | null
          risk_multiplier?: number | null
          risk_weight?: number | null
          route_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dynamic_pricing_config_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_connections: {
        Row: {
          ai_reasoning: string | null
          connection_type: string
          created_at: string | null
          estimated_value: number | null
          id: string
          match_score: number | null
          node_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_reasoning?: string | null
          connection_type: string
          created_at?: string | null
          estimated_value?: number | null
          id?: string
          match_score?: number | null
          node_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_reasoning?: string | null
          connection_type?: string
          created_at?: string | null
          estimated_value?: number | null
          id?: string
          match_score?: number | null
          node_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_connections_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_nodes: {
        Row: {
          capabilities: string[] | null
          category: string | null
          contact_info: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          node_type: string
          region: string | null
          trust_score: number | null
          updated_at: string | null
        }
        Insert: {
          capabilities?: string[] | null
          category?: string | null
          contact_info?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          node_type: string
          region?: string | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Update: {
          capabilities?: string[] | null
          category?: string | null
          contact_info?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          node_type?: string
          region?: string | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ecosystem_vendor_rankings: {
        Row: {
          composite_score: number | null
          computed_at: string | null
          id: string
          node_id: string | null
          price_score: number | null
          quality_score: number | null
          rank_position: number | null
          reliability_score: number | null
          service_category: string
          total_jobs: number | null
        }
        Insert: {
          composite_score?: number | null
          computed_at?: string | null
          id?: string
          node_id?: string | null
          price_score?: number | null
          quality_score?: number | null
          rank_position?: number | null
          reliability_score?: number | null
          service_category: string
          total_jobs?: number | null
        }
        Update: {
          composite_score?: number | null
          computed_at?: string | null
          id?: string
          node_id?: string | null
          price_score?: number | null
          quality_score?: number | null
          rank_position?: number | null
          reliability_score?: number | null
          service_category?: string
          total_jobs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_vendor_rankings_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_rate_limits: {
        Row: {
          bucket: string
          count: number
          identifier: string
          window_start: string
        }
        Insert: {
          bucket: string
          count?: number
          identifier: string
          window_start?: string
        }
        Update: {
          bucket?: string
          count?: number
          identifier?: string
          window_start?: string
        }
        Relationships: []
      }
      edit_requests: {
        Row: {
          approved_by: string | null
          changed_fields: string[] | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          modified_data: Json
          organization_id: string | null
          original_data: Json
          reason: string | null
          requested_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          changed_fields?: string[] | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          modified_data: Json
          organization_id?: string | null
          original_data: Json
          reason?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          changed_fields?: string[] | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          modified_data?: Json
          organization_id?: string | null
          original_data?: Json
          reason?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edit_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_activity_log: {
        Row: {
          cc_recipients: string[] | null
          created_at: string
          dispatch_id: string | null
          email_notification_id: string | null
          id: string
          invoice_id: string | null
          original_recipient: string
          related_entity_id: string | null
          related_entity_type: string | null
          sender_email: string | null
          sent_at: string
          subject: string
        }
        Insert: {
          cc_recipients?: string[] | null
          created_at?: string
          dispatch_id?: string | null
          email_notification_id?: string | null
          id?: string
          invoice_id?: string | null
          original_recipient: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          sender_email?: string | null
          sent_at?: string
          subject: string
        }
        Update: {
          cc_recipients?: string[] | null
          created_at?: string
          dispatch_id?: string | null
          email_notification_id?: string | null
          id?: string
          invoice_id?: string | null
          original_recipient?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          sender_email?: string | null
          sent_at?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_activity_log_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_activity_log_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_activity_log_email_notification_id_fkey"
            columns: ["email_notification_id"]
            isOneToOne: false
            referencedRelation: "email_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_activity_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notifications: {
        Row: {
          body: string | null
          created_at: string
          dispatch_id: string | null
          error_message: string | null
          id: string
          notification_type: string | null
          recipient_email: string
          recipient_type: string
          sent_at: string | null
          sent_by: string | null
          sla_deadline: string | null
          sla_met: boolean | null
          sla_response_time_minutes: number | null
          status: string | null
          subject: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dispatch_id?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string | null
          recipient_email: string
          recipient_type: string
          sent_at?: string | null
          sent_by?: string | null
          sla_deadline?: string | null
          sla_met?: boolean | null
          sla_response_time_minutes?: number | null
          status?: string | null
          subject: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dispatch_id?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string | null
          recipient_email?: string
          recipient_type?: string
          sent_at?: string | null
          sent_by?: string | null
          sla_deadline?: string | null
          sla_met?: boolean | null
          sla_response_time_minutes?: number | null
          status?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_notifications_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_notifications_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_template_configs: {
        Row: {
          brand_color: string | null
          created_at: string
          enabled: boolean
          id: string
          intro_text: string | null
          language: string
          logo_url: string | null
          organization_id: string
          outro_text: string | null
          sms_template: string | null
          subject_override: string | null
          support_email: string | null
          template_key: string
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          intro_text?: string | null
          language?: string
          logo_url?: string | null
          organization_id: string
          outro_text?: string | null
          sms_template?: string | null
          subject_override?: string | null
          support_email?: string | null
          template_key: string
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          intro_text?: string | null
          language?: string
          logo_url?: string | null
          organization_id?: string
          outro_text?: string | null
          sms_template?: string | null
          subject_override?: string | null
          support_email?: string | null
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_template: string
          created_at: string | null
          id: string
          is_active: boolean | null
          subject_template: string
          template_name: string
          template_type: string
          updated_at: string | null
          updated_by: string | null
          variables: Json | null
        }
        Insert: {
          body_template: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          subject_template: string
          template_name: string
          template_type: string
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json | null
        }
        Update: {
          body_template?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          subject_template?: string
          template_name?: string
          template_type?: string
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      enterprise_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_role: string | null
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          diff_keys: string[] | null
          domain: string
          id: string
          occurred_at: string
          organization_id: string | null
          reason: string | null
          record_id: string | null
          source: string
          table_name: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          diff_keys?: string[] | null
          domain: string
          id?: string
          occurred_at?: string
          organization_id?: string | null
          reason?: string | null
          record_id?: string | null
          source?: string
          table_name: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          diff_keys?: string[] | null
          domain?: string
          id?: string
          occurred_at?: string
          organization_id?: string | null
          reason?: string | null
          record_id?: string | null
          source?: string
          table_name?: string
        }
        Relationships: []
      }
      enterprise_deals: {
        Row: {
          ai_confidence: number | null
          approved_by: string | null
          company_name: string
          created_at: string | null
          deal_probability: string | null
          deal_stage: string | null
          estimated_monthly_loss: number | null
          estimated_value: number | null
          fleet_size: number | null
          id: string
          industry: string | null
          objection_responses: Json | null
          recommended_pitch: string | null
          recommended_structure: Json | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          approved_by?: string | null
          company_name: string
          created_at?: string | null
          deal_probability?: string | null
          deal_stage?: string | null
          estimated_monthly_loss?: number | null
          estimated_value?: number | null
          fleet_size?: number | null
          id?: string
          industry?: string | null
          objection_responses?: Json | null
          recommended_pitch?: string | null
          recommended_structure?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          approved_by?: string | null
          company_name?: string
          created_at?: string | null
          deal_probability?: string | null
          deal_stage?: string | null
          estimated_monthly_loss?: number | null
          estimated_value?: number | null
          fleet_size?: number | null
          id?: string
          industry?: string | null
          objection_responses?: Json | null
          recommended_pitch?: string | null
          recommended_structure?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      erp_connections: {
        Row: {
          connected_by: string | null
          created_at: string
          environment: string
          expires_at: string | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          last_sync_direction: string | null
          metadata: Json
          oauth_state: string | null
          organization_id: string
          provider: string
          realm_id: string | null
          refresh_expires_at: string | null
          scope: string | null
          secrets_vault_id: string | null
          status: string
          token_type: string | null
          updated_at: string
        }
        Insert: {
          connected_by?: string | null
          created_at?: string
          environment?: string
          expires_at?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          last_sync_direction?: string | null
          metadata?: Json
          oauth_state?: string | null
          organization_id: string
          provider: string
          realm_id?: string | null
          refresh_expires_at?: string | null
          scope?: string | null
          secrets_vault_id?: string | null
          status?: string
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          connected_by?: string | null
          created_at?: string
          environment?: string
          expires_at?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          last_sync_direction?: string | null
          metadata?: Json
          oauth_state?: string | null
          organization_id?: string
          provider?: string
          realm_id?: string | null
          refresh_expires_at?: string | null
          scope?: string | null
          secrets_vault_id?: string | null
          status?: string
          token_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_sync_log: {
        Row: {
          direction: string
          entity: string
          error: string | null
          id: string
          local_id: string | null
          organization_id: string
          payload_summary: Json | null
          provider: string
          remote_id: string | null
          run_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          direction: string
          entity: string
          error?: string | null
          id?: string
          local_id?: string | null
          organization_id: string
          payload_summary?: Json | null
          provider: string
          remote_id?: string | null
          run_at?: string
          status: string
          triggered_by?: string | null
        }
        Update: {
          direction?: string
          entity?: string
          error?: string | null
          id?: string
          local_id?: string | null
          organization_id?: string
          payload_summary?: Json | null
          provider?: string
          remote_id?: string | null
          run_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_sync_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_processing_log: {
        Row: {
          action_taken: string | null
          created_at: string | null
          error_details: string | null
          event_id: string | null
          id: string
          processing_time_ms: number | null
          processor_os: string
          result_status: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          error_details?: string | null
          event_id?: string | null
          id?: string
          processing_time_ms?: number | null
          processor_os: string
          result_status?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          error_details?: string | null
          event_id?: string | null
          id?: string
          processing_time_ms?: number | null
          processor_os?: string
          result_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_processing_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "platform_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_subscriptions: {
        Row: {
          created_at: string | null
          event_type: string
          filter_conditions: Json | null
          id: string
          is_active: boolean | null
          subscriber_os: string
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          filter_conditions?: Json | null
          id?: string
          is_active?: boolean | null
          subscriber_os: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          filter_conditions?: Json | null
          id?: string
          is_active?: boolean | null
          subscriber_os?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      exchange_demand_listings: {
        Row: {
          buyer_name: string
          commodity: string
          contact_email: string | null
          created_at: string | null
          delivery_window: string | null
          destination: string
          id: string
          is_verified: boolean | null
          listed_by: string | null
          quantity_tonnes: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          buyer_name: string
          commodity: string
          contact_email?: string | null
          created_at?: string | null
          delivery_window?: string | null
          destination: string
          id?: string
          is_verified?: boolean | null
          listed_by?: string | null
          quantity_tonnes?: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          buyer_name?: string
          commodity?: string
          contact_email?: string | null
          created_at?: string | null
          delivery_window?: string | null
          destination?: string
          id?: string
          is_verified?: boolean | null
          listed_by?: string | null
          quantity_tonnes?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      exchange_logistics_listings: {
        Row: {
          capacity_tonnes: number | null
          created_at: string | null
          departure_schedule: string | null
          id: string
          is_available: boolean | null
          listed_by: string | null
          operator_name: string | null
          route: string
          updated_at: string | null
          vehicle_type: string | null
        }
        Insert: {
          capacity_tonnes?: number | null
          created_at?: string | null
          departure_schedule?: string | null
          id?: string
          is_available?: boolean | null
          listed_by?: string | null
          operator_name?: string | null
          route: string
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Update: {
          capacity_tonnes?: number | null
          created_at?: string | null
          departure_schedule?: string | null
          id?: string
          is_available?: boolean | null
          listed_by?: string | null
          operator_name?: string | null
          route?: string
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      exchange_supply_listings: {
        Row: {
          certification: string | null
          commodity: string
          contact_email: string | null
          contact_name: string | null
          created_at: string | null
          currency: string | null
          expires_at: string | null
          id: string
          listed_by: string | null
          location: string
          packaging: string | null
          price_per_tonne: number | null
          quantity_tonnes: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          certification?: string | null
          commodity: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          listed_by?: string | null
          location: string
          packaging?: string | null
          price_per_tonne?: number | null
          quantity_tonnes?: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          certification?: string | null
          commodity?: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          listed_by?: string | null
          location?: string
          packaging?: string | null
          price_per_tonne?: number | null
          quantity_tonnes?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      exchange_trade_matches: {
        Row: {
          completed_at: string | null
          created_at: string | null
          demand_listing_id: string | null
          id: string
          match_status: string | null
          matched_at: string | null
          progress_percent: number | null
          supply_listing_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          demand_listing_id?: string | null
          id?: string
          match_status?: string | null
          matched_at?: string | null
          progress_percent?: number | null
          supply_listing_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          demand_listing_id?: string | null
          id?: string
          match_status?: string | null
          matched_at?: string | null
          progress_percent?: number | null
          supply_listing_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_trade_matches_demand_listing_id_fkey"
            columns: ["demand_listing_id"]
            isOneToOne: false
            referencedRelation: "exchange_demand_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_trade_matches_supply_listing_id_fkey"
            columns: ["supply_listing_id"]
            isOneToOne: false
            referencedRelation: "exchange_supply_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_warehouse_listings: {
        Row: {
          capacity_description: string | null
          created_at: string | null
          id: string
          is_available: boolean | null
          listed_by: string | null
          location: string
          rate_description: string | null
          updated_at: string | null
          utilization_percent: number | null
          warehouse_type: string | null
        }
        Insert: {
          capacity_description?: string | null
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          listed_by?: string | null
          location: string
          rate_description?: string | null
          updated_at?: string | null
          utilization_percent?: number | null
          warehouse_type?: string | null
        }
        Update: {
          capacity_description?: string | null
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          listed_by?: string | null
          location?: string
          rate_description?: string | null
          updated_at?: string | null
          utilization_percent?: number | null
          warehouse_type?: string | null
        }
        Relationships: []
      }
      execution_outcomes: {
        Row: {
          created_at: string
          currency: string | null
          decision_id: string | null
          error_details: string | null
          healing_details: string | null
          id: string
          outcome_type: string
          risk_description: string | null
          risk_prevented: boolean | null
          rollback_performed: boolean | null
          self_healed: boolean | null
          task_id: string | null
          tenant_id: string | null
          time_saved_minutes: number | null
          value_impact_amount: number | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          decision_id?: string | null
          error_details?: string | null
          healing_details?: string | null
          id?: string
          outcome_type?: string
          risk_description?: string | null
          risk_prevented?: boolean | null
          rollback_performed?: boolean | null
          self_healed?: boolean | null
          task_id?: string | null
          tenant_id?: string | null
          time_saved_minutes?: number | null
          value_impact_amount?: number | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          decision_id?: string | null
          error_details?: string | null
          healing_details?: string | null
          id?: string
          outcome_type?: string
          risk_description?: string | null
          risk_prevented?: boolean | null
          rollback_performed?: boolean | null
          self_healed?: boolean | null
          task_id?: string | null
          tenant_id?: string | null
          time_saved_minutes?: number | null
          value_impact_amount?: number | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "execution_outcomes_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "autonomous_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_outcomes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "execution_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_tasks: {
        Row: {
          assigned_role: string
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          decision_id: string | null
          description: string | null
          failed_reason: string | null
          id: string
          is_rollback_possible: boolean | null
          payload: Json | null
          priority_score: number | null
          result: Json | null
          risk_level: string | null
          rolled_back_at: string | null
          started_at: string | null
          status: string
          target_module: string
          task_type: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_role: string
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          decision_id?: string | null
          description?: string | null
          failed_reason?: string | null
          id?: string
          is_rollback_possible?: boolean | null
          payload?: Json | null
          priority_score?: number | null
          result?: Json | null
          risk_level?: string | null
          rolled_back_at?: string | null
          started_at?: string | null
          status?: string
          target_module: string
          task_type?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_role?: string
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          decision_id?: string | null
          description?: string | null
          failed_reason?: string | null
          id?: string
          is_rollback_possible?: boolean | null
          payload?: Json | null
          priority_score?: number | null
          result?: Json | null
          risk_level?: string | null
          rolled_back_at?: string | null
          started_at?: string | null
          status?: string
          target_module?: string
          task_type?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_tasks_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "autonomous_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      expansion_targets: {
        Row: {
          approved_by: string | null
          city: string | null
          composite_score: number | null
          country: string | null
          created_at: string | null
          demand_score: number | null
          ease_of_entry: number | null
          entry_strategy: Json | null
          id: string
          inefficiency_score: number | null
          market_name: string
          recommended_segment: string | null
          revenue_potential: number | null
          roadmap: Json | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          city?: string | null
          composite_score?: number | null
          country?: string | null
          created_at?: string | null
          demand_score?: number | null
          ease_of_entry?: number | null
          entry_strategy?: Json | null
          id?: string
          inefficiency_score?: number | null
          market_name: string
          recommended_segment?: string | null
          revenue_potential?: number | null
          roadmap?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_by?: string | null
          city?: string | null
          composite_score?: number | null
          country?: string | null
          created_at?: string | null
          demand_score?: number | null
          ease_of_entry?: number | null
          entry_strategy?: Json | null
          id?: string
          inefficiency_score?: number | null
          market_name?: string
          recommended_segment?: string | null
          revenue_potential?: number | null
          roadmap?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          category: Database["public"]["Enums"]["expense_category"]
          cogs_vendor_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string
          dispatch_id: string | null
          driver_id: string | null
          expense_date: string
          id: string
          is_cogs: boolean | null
          is_recurring: boolean | null
          notes: string | null
          organization_id: string | null
          receipt_url: string | null
          rejection_reason: string | null
          submitted_by: string | null
          updated_at: string
          vehicle_id: string | null
          vendor_id: string | null
          zoho_expense_id: string | null
          zoho_synced_at: string | null
        }
        Insert: {
          amount: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category: Database["public"]["Enums"]["expense_category"]
          cogs_vendor_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description: string
          dispatch_id?: string | null
          driver_id?: string | null
          expense_date?: string
          id?: string
          is_cogs?: boolean | null
          is_recurring?: boolean | null
          notes?: string | null
          organization_id?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          submitted_by?: string | null
          updated_at?: string
          vehicle_id?: string | null
          vendor_id?: string | null
          zoho_expense_id?: string | null
          zoho_synced_at?: string | null
        }
        Update: {
          amount?: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          cogs_vendor_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string
          dispatch_id?: string | null
          driver_id?: string | null
          expense_date?: string
          id?: string
          is_cogs?: boolean | null
          is_recurring?: boolean | null
          notes?: string | null
          organization_id?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          submitted_by?: string | null
          updated_at?: string
          vehicle_id?: string | null
          vendor_id?: string | null
          zoho_expense_id?: string | null
          zoho_synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_cogs_vendor_id_fkey"
            columns: ["cogs_vendor_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      export_aggregations: {
        Row: {
          contract_id: string | null
          created_at: string
          currency: string
          id: string
          product_type: string
          quantity_kg: number
          status: string
          supplier_name: string
          supplier_verified: boolean | null
          unit_price: number
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          product_type: string
          quantity_kg?: number
          status?: string
          supplier_name: string
          supplier_verified?: boolean | null
          unit_price?: number
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          product_type?: string
          quantity_kg?: number
          status?: string
          supplier_name?: string
          supplier_verified?: boolean | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "export_aggregations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "export_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      export_contracts: {
        Row: {
          buyer_country: string
          buyer_name: string
          buyer_verified: boolean | null
          compliance_status: string | null
          contract_value: number
          created_at: string
          currency: string
          exporter_of_record: string | null
          id: string
          operator_id: string | null
          product_type: string
          quantity_kg: number
          status: string
          updated_at: string
        }
        Insert: {
          buyer_country: string
          buyer_name: string
          buyer_verified?: boolean | null
          compliance_status?: string | null
          contract_value?: number
          created_at?: string
          currency?: string
          exporter_of_record?: string | null
          id?: string
          operator_id?: string | null
          product_type: string
          quantity_kg?: number
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_country?: string
          buyer_name?: string
          buyer_verified?: boolean | null
          compliance_status?: string | null
          contract_value?: number
          created_at?: string
          currency?: string
          exporter_of_record?: string | null
          id?: string
          operator_id?: string | null
          product_type?: string
          quantity_kg?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      external_order_sources: {
        Row: {
          api_key_hash: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          source_config: Json | null
          source_name: string
          source_type: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_key_hash?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          source_config?: Json | null
          source_name: string
          source_type: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_key_hash?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          source_config?: Json | null
          source_name?: string
          source_type?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      factoring_transactions: {
        Row: {
          advance_rate: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          fee_amount: number
          fee_rate: number
          funded_at: string | null
          id: string
          invoice_amount: number
          invoice_id: string
          net_proceeds: number
          status: string
        }
        Insert: {
          advance_rate?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          fee_amount: number
          fee_rate?: number
          funded_at?: string | null
          id?: string
          invoice_amount: number
          invoice_id: string
          net_proceeds: number
          status?: string
        }
        Update: {
          advance_rate?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          fee_amount?: number
          fee_rate?: number
          funded_at?: string | null
          id?: string
          invoice_amount?: number
          invoice_id?: string
          net_proceeds?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "factoring_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factoring_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      fiat_conversion_log: {
        Row: {
          amount_token: number
          conversion_rate: number
          created_at: string | null
          fiat_amount: number
          fiat_currency: string
          fx_gain_loss: number | null
          id: string
          liquidity_provider: string | null
          original_token: string
          spread: number | null
          status: string | null
          transaction_id: string | null
          treasury_impact: string | null
        }
        Insert: {
          amount_token: number
          conversion_rate: number
          created_at?: string | null
          fiat_amount: number
          fiat_currency: string
          fx_gain_loss?: number | null
          id?: string
          liquidity_provider?: string | null
          original_token: string
          spread?: number | null
          status?: string | null
          transaction_id?: string | null
          treasury_impact?: string | null
        }
        Update: {
          amount_token?: number
          conversion_rate?: number
          created_at?: string | null
          fiat_amount?: number
          fiat_currency?: string
          fx_gain_loss?: number | null
          id?: string
          liquidity_provider?: string | null
          original_token?: string
          spread?: number | null
          status?: string | null
          transaction_id?: string | null
          treasury_impact?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiat_conversion_log_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "stablecoin_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_anomaly_events: {
        Row: {
          anomaly_type: string
          created_at: string
          description: string | null
          id: string
          impacted_value: number | null
          investigated_by: string | null
          organization_id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          resolution: string | null
          resolved_at: string | null
          severity: string
          source_system: string | null
          status: string
        }
        Insert: {
          anomaly_type: string
          created_at?: string
          description?: string | null
          id?: string
          impacted_value?: number | null
          investigated_by?: string | null
          organization_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          source_system?: string | null
          status?: string
        }
        Update: {
          anomaly_type?: string
          created_at?: string
          description?: string | null
          id?: string
          impacted_value?: number | null
          investigated_by?: string | null
          organization_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          source_system?: string | null
          status?: string
        }
        Relationships: []
      }
      finance_approval_requests: {
        Row: {
          amount: number | null
          approved_by: string | null
          created_at: string
          currency: string | null
          decided_at: string | null
          description: string | null
          evidence_notes: string | null
          id: string
          linked_entity_id: string | null
          linked_entity_type: string | null
          organization_id: string | null
          request_type: string
          requested_by: string
          status: string
        }
        Insert: {
          amount?: number | null
          approved_by?: string | null
          created_at?: string
          currency?: string | null
          decided_at?: string | null
          description?: string | null
          evidence_notes?: string | null
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          organization_id?: string | null
          request_type: string
          requested_by: string
          status?: string
        }
        Update: {
          amount?: number | null
          approved_by?: string | null
          created_at?: string
          currency?: string | null
          decided_at?: string | null
          description?: string | null
          evidence_notes?: string | null
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          organization_id?: string | null
          request_type?: string
          requested_by?: string
          status?: string
        }
        Relationships: []
      }
      finance_periods: {
        Row: {
          close_checklist: Json | null
          created_at: string
          id: string
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          organization_id: string | null
          period_end: string
          period_label: string
          period_start: string
          status: string
          unresolved_exceptions: number | null
        }
        Insert: {
          close_checklist?: Json | null
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          organization_id?: string | null
          period_end: string
          period_label: string
          period_start: string
          status?: string
          unresolved_exceptions?: number | null
        }
        Update: {
          close_checklist?: Json | null
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          organization_id?: string | null
          period_end?: string
          period_label?: string
          period_start?: string
          status?: string
          unresolved_exceptions?: number | null
        }
        Relationships: []
      }
      finance_reconciliation: {
        Row: {
          amount: number | null
          created_at: string
          discrepancy: number | null
          entity_id: string
          entity_type: string
          id: string
          match_confidence: number | null
          match_status: string
          matched_amount: number | null
          matched_by: string | null
          matched_entity_id: string | null
          matched_entity_type: string | null
          notes: string | null
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          discrepancy?: number | null
          entity_id: string
          entity_type: string
          id?: string
          match_confidence?: number | null
          match_status?: string
          matched_amount?: number | null
          matched_by?: string | null
          matched_entity_id?: string | null
          matched_entity_type?: string | null
          notes?: string | null
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          discrepancy?: number | null
          entity_id?: string
          entity_type?: string
          id?: string
          match_confidence?: number | null
          match_status?: string
          matched_amount?: number | null
          matched_by?: string | null
          matched_entity_id?: string | null
          matched_entity_type?: string | null
          notes?: string | null
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      financial_audit_log: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      financial_close_periods: {
        Row: {
          adjustment_count: number | null
          checklist_completed: Json | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          notes: string | null
          period_end: string
          period_name: string
          period_start: string
          status: string
          trial_balance_balanced: boolean | null
        }
        Insert: {
          adjustment_count?: number | null
          checklist_completed?: Json | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period_end: string
          period_name: string
          period_start: string
          status?: string
          trial_balance_balanced?: boolean | null
        }
        Update: {
          adjustment_count?: number | null
          checklist_completed?: Json | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_name?: string
          period_start?: string
          status?: string
          trial_balance_balanced?: boolean | null
        }
        Relationships: []
      }
      financial_targets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cogs_input_type: string | null
          cogs_target: number
          created_at: string
          created_by: string | null
          expense_input_type: string | null
          expense_target: number
          id: string
          notes: string | null
          organization_id: string | null
          profit_input_type: string | null
          profit_target: number
          rejection_reason: string | null
          revenue_target: number
          status: string
          target_month: number | null
          target_type: string
          target_year: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cogs_input_type?: string | null
          cogs_target?: number
          created_at?: string
          created_by?: string | null
          expense_input_type?: string | null
          expense_target?: number
          id?: string
          notes?: string | null
          organization_id?: string | null
          profit_input_type?: string | null
          profit_target?: number
          rejection_reason?: string | null
          revenue_target?: number
          status?: string
          target_month?: number | null
          target_type: string
          target_year: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cogs_input_type?: string | null
          cogs_target?: number
          created_at?: string
          created_by?: string | null
          expense_input_type?: string | null
          expense_target?: number
          id?: string
          notes?: string | null
          organization_id?: string | null
          profit_input_type?: string | null
          profit_target?: number
          rejection_reason?: string | null
          revenue_target?: number
          status?: string
          target_month?: number | null
          target_type?: string
          target_year?: number
          updated_at?: string
        }
        Relationships: []
      }
      fleet_availability_log: {
        Row: {
          availability_pct: number | null
          available_count: number
          created_at: string
          id: string
          log_date: string
          maintenance_count: number
          on_trip_count: number
          organization_id: string
          total_vehicles: number
        }
        Insert: {
          availability_pct?: number | null
          available_count?: number
          created_at?: string
          id?: string
          log_date?: string
          maintenance_count?: number
          on_trip_count?: number
          organization_id: string
          total_vehicles?: number
        }
        Update: {
          availability_pct?: number | null
          available_count?: number
          created_at?: string
          id?: string
          log_date?: string
          maintenance_count?: number
          on_trip_count?: number
          organization_id?: string
          total_vehicles?: number
        }
        Relationships: [
          {
            foreignKeyName: "fleet_availability_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_downtime_log: {
        Row: {
          created_at: string
          downtime_reason: string | null
          hours_available: number | null
          hours_down: number | null
          id: string
          is_available: boolean
          log_date: string
          logged_by: string | null
          maintenance_order_id: string | null
          notes: string | null
          organization_id: string | null
          vehicle_id: string | null
          vehicle_plate: string
        }
        Insert: {
          created_at?: string
          downtime_reason?: string | null
          hours_available?: number | null
          hours_down?: number | null
          id?: string
          is_available?: boolean
          log_date?: string
          logged_by?: string | null
          maintenance_order_id?: string | null
          notes?: string | null
          organization_id?: string | null
          vehicle_id?: string | null
          vehicle_plate: string
        }
        Update: {
          created_at?: string
          downtime_reason?: string | null
          hours_available?: number | null
          hours_down?: number | null
          id?: string
          is_available?: boolean
          log_date?: string
          logged_by?: string | null
          maintenance_order_id?: string | null
          notes?: string | null
          organization_id?: string | null
          vehicle_id?: string | null
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_downtime_log_maintenance_order_id_fkey"
            columns: ["maintenance_order_id"]
            isOneToOne: false
            referencedRelation: "fleet_maintenance_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_downtime_log_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "fmcg_fleet_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_driver_scores: {
        Row: {
          created_at: string
          deliveries_completed: number | null
          deliveries_on_time: number | null
          distance_km: number | null
          driver_name: string
          driver_user_id: string | null
          dvir_completed: boolean | null
          first_attempt_success: number | null
          fuel_consumed_liters: number | null
          harsh_braking_count: number | null
          hos_compliant: boolean | null
          id: string
          idle_minutes: number | null
          overall_score: number | null
          rapid_accel_count: number | null
          route_deviation_km: number | null
          score_date: string
          speeding_count: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          deliveries_completed?: number | null
          deliveries_on_time?: number | null
          distance_km?: number | null
          driver_name: string
          driver_user_id?: string | null
          dvir_completed?: boolean | null
          first_attempt_success?: number | null
          fuel_consumed_liters?: number | null
          harsh_braking_count?: number | null
          hos_compliant?: boolean | null
          id?: string
          idle_minutes?: number | null
          overall_score?: number | null
          rapid_accel_count?: number | null
          route_deviation_km?: number | null
          score_date?: string
          speeding_count?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          deliveries_completed?: number | null
          deliveries_on_time?: number | null
          distance_km?: number | null
          driver_name?: string
          driver_user_id?: string | null
          dvir_completed?: boolean | null
          first_attempt_success?: number | null
          fuel_consumed_liters?: number | null
          harsh_braking_count?: number | null
          hos_compliant?: boolean | null
          id?: string
          idle_minutes?: number | null
          overall_score?: number | null
          rapid_accel_count?: number | null
          route_deviation_km?: number | null
          score_date?: string
          speeding_count?: number | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_driver_scores_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "fmcg_fleet_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_kpi_snapshots: {
        Row: {
          accident_rate: number | null
          avg_load_factor_pct: number | null
          carbon_per_km: number | null
          cost_per_delivery: number | null
          cost_per_km: number | null
          created_at: string
          days_available: number | null
          days_down: number | null
          driver_behavior_score: number | null
          dvir_compliance_pct: number | null
          empty_miles_pct: number | null
          first_attempt_success_pct: number | null
          fuel_cost: number | null
          hos_compliance_pct: number | null
          id: string
          idle_time_pct: number | null
          maintenance_cost: number | null
          mtbf_hours: number | null
          mttr_hours: number | null
          on_time_delivery_pct: number | null
          pm_compliance_pct: number | null
          repeat_repair_pct: number | null
          route_deviation_rate: number | null
          scheduled_vs_unscheduled_ratio: number | null
          scope: string
          scope_ref: string | null
          snapshot_date: string
          total_cost_ownership: number | null
          uptime_pct: number | null
          utilization_rate_pct: number | null
          vehicle_id: string | null
        }
        Insert: {
          accident_rate?: number | null
          avg_load_factor_pct?: number | null
          carbon_per_km?: number | null
          cost_per_delivery?: number | null
          cost_per_km?: number | null
          created_at?: string
          days_available?: number | null
          days_down?: number | null
          driver_behavior_score?: number | null
          dvir_compliance_pct?: number | null
          empty_miles_pct?: number | null
          first_attempt_success_pct?: number | null
          fuel_cost?: number | null
          hos_compliance_pct?: number | null
          id?: string
          idle_time_pct?: number | null
          maintenance_cost?: number | null
          mtbf_hours?: number | null
          mttr_hours?: number | null
          on_time_delivery_pct?: number | null
          pm_compliance_pct?: number | null
          repeat_repair_pct?: number | null
          route_deviation_rate?: number | null
          scheduled_vs_unscheduled_ratio?: number | null
          scope?: string
          scope_ref?: string | null
          snapshot_date?: string
          total_cost_ownership?: number | null
          uptime_pct?: number | null
          utilization_rate_pct?: number | null
          vehicle_id?: string | null
        }
        Update: {
          accident_rate?: number | null
          avg_load_factor_pct?: number | null
          carbon_per_km?: number | null
          cost_per_delivery?: number | null
          cost_per_km?: number | null
          created_at?: string
          days_available?: number | null
          days_down?: number | null
          driver_behavior_score?: number | null
          dvir_compliance_pct?: number | null
          empty_miles_pct?: number | null
          first_attempt_success_pct?: number | null
          fuel_cost?: number | null
          hos_compliance_pct?: number | null
          id?: string
          idle_time_pct?: number | null
          maintenance_cost?: number | null
          mtbf_hours?: number | null
          mttr_hours?: number | null
          on_time_delivery_pct?: number | null
          pm_compliance_pct?: number | null
          repeat_repair_pct?: number | null
          route_deviation_rate?: number | null
          scheduled_vs_unscheduled_ratio?: number | null
          scope?: string
          scope_ref?: string | null
          snapshot_date?: string
          total_cost_ownership?: number | null
          uptime_pct?: number | null
          utilization_rate_pct?: number | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_kpi_snapshots_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "fmcg_fleet_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_maintenance_orders: {
        Row: {
          assigned_technician: string | null
          assigned_to_user_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          downtime_hours: number | null
          failure_type: string | null
          id: string
          is_repeat_repair: boolean | null
          labor_cost: number | null
          notes: string | null
          order_type: string
          organization_id: string | null
          parts_cost: number | null
          parts_ordered_at: string | null
          parts_received_at: string | null
          priority: string
          repair_hours: number | null
          root_cause: string | null
          sla_breached_at: string | null
          sla_due_at: string | null
          started_at: string | null
          status: string
          total_cost: number | null
          updated_at: string
          vehicle_id: string | null
          vehicle_plate: string
          workshop_state: string
        }
        Insert: {
          assigned_technician?: string | null
          assigned_to_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          downtime_hours?: number | null
          failure_type?: string | null
          id?: string
          is_repeat_repair?: boolean | null
          labor_cost?: number | null
          notes?: string | null
          order_type?: string
          organization_id?: string | null
          parts_cost?: number | null
          parts_ordered_at?: string | null
          parts_received_at?: string | null
          priority?: string
          repair_hours?: number | null
          root_cause?: string | null
          sla_breached_at?: string | null
          sla_due_at?: string | null
          started_at?: string | null
          status?: string
          total_cost?: number | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_plate: string
          workshop_state?: string
        }
        Update: {
          assigned_technician?: string | null
          assigned_to_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          downtime_hours?: number | null
          failure_type?: string | null
          id?: string
          is_repeat_repair?: boolean | null
          labor_cost?: number | null
          notes?: string | null
          order_type?: string
          organization_id?: string | null
          parts_cost?: number | null
          parts_ordered_at?: string | null
          parts_received_at?: string | null
          priority?: string
          repair_hours?: number | null
          root_cause?: string | null
          sla_breached_at?: string | null
          sla_due_at?: string | null
          started_at?: string | null
          status?: string
          total_cost?: number | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_plate?: string
          workshop_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_maintenance_orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "fmcg_fleet_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_ai_tasks: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          impact_score: number | null
          priority: string | null
          source: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          impact_score?: number | null
          priority?: string | null
          source?: string
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          impact_score?: number | null
          priority?: string | null
          source?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fm_performance_scores: {
        Row: {
          automation_level: number | null
          cash_flow_health: number | null
          created_at: string | null
          decision_accuracy: number | null
          execution_score: number | null
          id: string
          rank_level: string | null
          risk_score: number | null
          score_date: string
          total_score: number | null
          user_id: string
          workflow_efficiency: number | null
        }
        Insert: {
          automation_level?: number | null
          cash_flow_health?: number | null
          created_at?: string | null
          decision_accuracy?: number | null
          execution_score?: number | null
          id?: string
          rank_level?: string | null
          risk_score?: number | null
          score_date?: string
          total_score?: number | null
          user_id: string
          workflow_efficiency?: number | null
        }
        Update: {
          automation_level?: number | null
          cash_flow_health?: number | null
          created_at?: string | null
          decision_accuracy?: number | null
          execution_score?: number | null
          id?: string
          rank_level?: string | null
          risk_score?: number | null
          score_date?: string
          total_score?: number | null
          user_id?: string
          workflow_efficiency?: number | null
        }
        Relationships: []
      }
      fm_transformation_days: {
        Row: {
          category: string
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          day_number: number
          id: string
          impact_score: number | null
          started_at: string | null
          task_description: string | null
          task_title: string
          time_spent_minutes: number | null
          user_id: string
          week_number: number | null
        }
        Insert: {
          category?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          day_number: number
          id?: string
          impact_score?: number | null
          started_at?: string | null
          task_description?: string | null
          task_title: string
          time_spent_minutes?: number | null
          user_id: string
          week_number?: number | null
        }
        Update: {
          category?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          day_number?: number
          id?: string
          impact_score?: number | null
          started_at?: string | null
          task_description?: string | null
          task_title?: string
          time_spent_minutes?: number | null
          user_id?: string
          week_number?: number | null
        }
        Relationships: []
      }
      fmcg_beat_plans: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          id: string
          industry_code: string | null
          is_active: boolean | null
          outlet_ids: string[] | null
          plan_name: string
          sales_rep_id: string | null
          tenant_id: string | null
          territory: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          id?: string
          industry_code?: string | null
          is_active?: boolean | null
          outlet_ids?: string[] | null
          plan_name: string
          sales_rep_id?: string | null
          tenant_id?: string | null
          territory?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          id?: string
          industry_code?: string | null
          is_active?: boolean | null
          outlet_ids?: string[] | null
          plan_name?: string
          sales_rep_id?: string | null
          tenant_id?: string | null
          territory?: string | null
        }
        Relationships: []
      }
      fmcg_benchmark_index: {
        Row: {
          country: string
          id: string
          industry_code: string | null
          metric_name: string
          metric_value: number | null
          percentile_25: number | null
          percentile_50: number | null
          percentile_75: number | null
          period_end: string | null
          period_start: string | null
          sample_size: number | null
          updated_at: string | null
        }
        Insert: {
          country: string
          id?: string
          industry_code?: string | null
          metric_name: string
          metric_value?: number | null
          percentile_25?: number | null
          percentile_50?: number | null
          percentile_75?: number | null
          period_end?: string | null
          period_start?: string | null
          sample_size?: number | null
          updated_at?: string | null
        }
        Update: {
          country?: string
          id?: string
          industry_code?: string | null
          metric_name?: string
          metric_value?: number | null
          percentile_25?: number | null
          percentile_50?: number | null
          percentile_75?: number | null
          period_end?: string | null
          period_start?: string | null
          sample_size?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fmcg_deliveries: {
        Row: {
          arrival_time: string | null
          completion_time: string | null
          created_at: string | null
          delay_reason: string | null
          delay_risk_score: number | null
          dispatch_time: string | null
          driver_id: string | null
          geofence_confirmed: boolean | null
          id: string
          industry_code: string | null
          order_id: string | null
          photo_proof_url: string | null
          qr_validated: boolean | null
          receipt_hash: string | null
          route_plan_id: string | null
          signature_url: string | null
          status: string | null
          tenant_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          arrival_time?: string | null
          completion_time?: string | null
          created_at?: string | null
          delay_reason?: string | null
          delay_risk_score?: number | null
          dispatch_time?: string | null
          driver_id?: string | null
          geofence_confirmed?: boolean | null
          id?: string
          industry_code?: string | null
          order_id?: string | null
          photo_proof_url?: string | null
          qr_validated?: boolean | null
          receipt_hash?: string | null
          route_plan_id?: string | null
          signature_url?: string | null
          status?: string | null
          tenant_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          arrival_time?: string | null
          completion_time?: string | null
          created_at?: string | null
          delay_reason?: string | null
          delay_risk_score?: number | null
          dispatch_time?: string | null
          driver_id?: string | null
          geofence_confirmed?: boolean | null
          id?: string
          industry_code?: string | null
          order_id?: string | null
          photo_proof_url?: string | null
          qr_validated?: boolean | null
          receipt_hash?: string | null
          route_plan_id?: string | null
          signature_url?: string | null
          status?: string | null
          tenant_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fmcg_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "fmcg_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      fmcg_distributors: {
        Row: {
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          credit_limit: number | null
          delivery_compliance_pct: number | null
          distributor_name: string
          email: string | null
          fill_rate: number | null
          id: string
          industry_code: string | null
          is_active: boolean | null
          margin_leakage_pct: number | null
          outstanding_balance: number | null
          payment_speed_days: number | null
          performance_index: number | null
          promo_execution_score: number | null
          region: string | null
          risk_band: string | null
          tenant_id: string | null
          territory_coverage_pct: number | null
        }
        Insert: {
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          credit_limit?: number | null
          delivery_compliance_pct?: number | null
          distributor_name: string
          email?: string | null
          fill_rate?: number | null
          id?: string
          industry_code?: string | null
          is_active?: boolean | null
          margin_leakage_pct?: number | null
          outstanding_balance?: number | null
          payment_speed_days?: number | null
          performance_index?: number | null
          promo_execution_score?: number | null
          region?: string | null
          risk_band?: string | null
          tenant_id?: string | null
          territory_coverage_pct?: number | null
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          credit_limit?: number | null
          delivery_compliance_pct?: number | null
          distributor_name?: string
          email?: string | null
          fill_rate?: number | null
          id?: string
          industry_code?: string | null
          is_active?: boolean | null
          margin_leakage_pct?: number | null
          outstanding_balance?: number | null
          payment_speed_days?: number | null
          performance_index?: number | null
          promo_execution_score?: number | null
          region?: string | null
          risk_band?: string | null
          tenant_id?: string | null
          territory_coverage_pct?: number | null
        }
        Relationships: []
      }
      fmcg_field_returns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          items_count: number | null
          notes: string | null
          outlet_id: string | null
          outlet_name: string
          reason: string
          sales_rep_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          items_count?: number | null
          notes?: string | null
          outlet_id?: string | null
          outlet_name: string
          reason: string
          sales_rep_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          items_count?: number | null
          notes?: string | null
          outlet_id?: string | null
          outlet_name?: string
          reason?: string
          sales_rep_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fmcg_field_returns_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "fmcg_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      fmcg_field_visits: {
        Row: {
          beat_plan_id: string | null
          check_in_at: string | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_out_at: string | null
          competitor_prices: Json | null
          created_at: string | null
          distance_from_outlet_m: number | null
          id: string
          industry_code: string | null
          is_valid_visit: boolean | null
          outlet_id: string | null
          photo_urls: string[] | null
          sales_rep_id: string | null
          tenant_id: string | null
          visit_notes: string | null
        }
        Insert: {
          beat_plan_id?: string | null
          check_in_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_at?: string | null
          competitor_prices?: Json | null
          created_at?: string | null
          distance_from_outlet_m?: number | null
          id?: string
          industry_code?: string | null
          is_valid_visit?: boolean | null
          outlet_id?: string | null
          photo_urls?: string[] | null
          sales_rep_id?: string | null
          tenant_id?: string | null
          visit_notes?: string | null
        }
        Update: {
          beat_plan_id?: string | null
          check_in_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_at?: string | null
          competitor_prices?: Json | null
          created_at?: string | null
          distance_from_outlet_m?: number | null
          id?: string
          industry_code?: string | null
          is_valid_visit?: boolean | null
          outlet_id?: string | null
          photo_urls?: string[] | null
          sales_rep_id?: string | null
          tenant_id?: string | null
          visit_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fmcg_field_visits_beat_plan_id_fkey"
            columns: ["beat_plan_id"]
            isOneToOne: false
            referencedRelation: "fmcg_beat_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fmcg_field_visits_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "fmcg_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      fmcg_fleet_tracking: {
        Row: {
          assigned_route: string | null
          created_at: string | null
          current_lat: number | null
          current_lng: number | null
          current_status: string | null
          driver_name: string | null
          driver_phone: string | null
          fuel_level_pct: number | null
          id: string
          is_active: boolean | null
          last_maintenance: string | null
          next_maintenance: string | null
          total_deliveries_today: number | null
          total_km_today: number | null
          updated_at: string | null
          vehicle_plate: string
          vehicle_type: string | null
          warehouse_id: string | null
        }
        Insert: {
          assigned_route?: string | null
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          current_status?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          fuel_level_pct?: number | null
          id?: string
          is_active?: boolean | null
          last_maintenance?: string | null
          next_maintenance?: string | null
          total_deliveries_today?: number | null
          total_km_today?: number | null
          updated_at?: string | null
          vehicle_plate: string
          vehicle_type?: string | null
          warehouse_id?: string | null
        }
        Update: {
          assigned_route?: string | null
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          current_status?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          fuel_level_pct?: number | null
          id?: string
          is_active?: boolean | null
          last_maintenance?: string | null
          next_maintenance?: string | null
          total_deliveries_today?: number | null
          total_km_today?: number | null
          updated_at?: string | null
          vehicle_plate?: string
          vehicle_type?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fmcg_fleet_tracking_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      fmcg_order_items: {
        Row: {
          delivered_qty: number | null
          id: string
          line_total: number | null
          order_id: string | null
          quantity: number | null
          sku_id: string | null
          unit_price: number | null
          variance_qty: number | null
        }
        Insert: {
          delivered_qty?: number | null
          id?: string
          line_total?: number | null
          order_id?: string | null
          quantity?: number | null
          sku_id?: string | null
          unit_price?: number | null
          variance_qty?: number | null
        }
        Update: {
          delivered_qty?: number | null
          id?: string
          line_total?: number | null
          order_id?: string | null
          quantity?: number | null
          sku_id?: string | null
          unit_price?: number | null
          variance_qty?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fmcg_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "fmcg_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fmcg_order_items_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "fmcg_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      fmcg_orders: {
        Row: {
          created_at: string | null
          delivery_priority: number | null
          delivery_status: string | null
          id: string
          industry_code: string | null
          order_date: string | null
          order_number: string | null
          outlet_id: string | null
          sales_rep_id: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tenant_id: string | null
          total_amount: number | null
        }
        Insert: {
          created_at?: string | null
          delivery_priority?: number | null
          delivery_status?: string | null
          id?: string
          industry_code?: string | null
          order_date?: string | null
          order_number?: string | null
          outlet_id?: string | null
          sales_rep_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tenant_id?: string | null
          total_amount?: number | null
        }
        Update: {
          created_at?: string | null
          delivery_priority?: number | null
          delivery_status?: string | null
          id?: string
          industry_code?: string | null
          order_date?: string | null
          order_number?: string | null
          outlet_id?: string | null
          sales_rep_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tenant_id?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fmcg_orders_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "fmcg_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      fmcg_outlets: {
        Row: {
          address: string | null
          assigned_sales_rep: string | null
          churn_risk_score: number | null
          city: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          engagement_score: number | null
          gps_verified: boolean | null
          id: string
          industry_code: string | null
          last_order_at: string | null
          last_visit_at: string | null
          lat: number | null
          lng: number | null
          outlet_name: string
          outlet_type: string | null
          state: string | null
          tenant_id: string | null
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          assigned_sales_rep?: string | null
          churn_risk_score?: number | null
          city?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          engagement_score?: number | null
          gps_verified?: boolean | null
          id?: string
          industry_code?: string | null
          last_order_at?: string | null
          last_visit_at?: string | null
          lat?: number | null
          lng?: number | null
          outlet_name: string
          outlet_type?: string | null
          state?: string | null
          tenant_id?: string | null
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          assigned_sales_rep?: string | null
          churn_risk_score?: number | null
          city?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          engagement_score?: number | null
          gps_verified?: boolean | null
          id?: string
          industry_code?: string | null
          last_order_at?: string | null
          last_visit_at?: string | null
          lat?: number | null
          lng?: number | null
          outlet_name?: string
          outlet_type?: string | null
          state?: string | null
          tenant_id?: string | null
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fmcg_reconciliation: {
        Row: {
          created_at: string | null
          delivered_qty: number | null
          delivery_id: string | null
          id: string
          industry_code: string | null
          invoice_generated: boolean | null
          invoice_id: string | null
          margin_impact: number | null
          order_id: string | null
          ordered_qty: number | null
          reconciled_at: string | null
          resolution_notes: string | null
          resolution_status: string | null
          tenant_id: string | null
          variance_qty: number | null
          variance_value: number | null
        }
        Insert: {
          created_at?: string | null
          delivered_qty?: number | null
          delivery_id?: string | null
          id?: string
          industry_code?: string | null
          invoice_generated?: boolean | null
          invoice_id?: string | null
          margin_impact?: number | null
          order_id?: string | null
          ordered_qty?: number | null
          reconciled_at?: string | null
          resolution_notes?: string | null
          resolution_status?: string | null
          tenant_id?: string | null
          variance_qty?: number | null
          variance_value?: number | null
        }
        Update: {
          created_at?: string | null
          delivered_qty?: number | null
          delivery_id?: string | null
          id?: string
          industry_code?: string | null
          invoice_generated?: boolean | null
          invoice_id?: string | null
          margin_impact?: number | null
          order_id?: string | null
          ordered_qty?: number | null
          reconciled_at?: string | null
          resolution_notes?: string | null
          resolution_status?: string | null
          tenant_id?: string | null
          variance_qty?: number | null
          variance_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fmcg_reconciliation_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "fmcg_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fmcg_reconciliation_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "fmcg_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      fmcg_retailer_credit: {
        Row: {
          created_at: string | null
          credit_limit: number | null
          current_balance: number | null
          default_probability: number | null
          id: string
          industry_code: string | null
          last_assessed: string | null
          order_frequency_score: number | null
          outlet_id: string | null
          payment_timeliness_score: number | null
          recommended_terms: string | null
          return_rate: number | null
          risk_band: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          default_probability?: number | null
          id?: string
          industry_code?: string | null
          last_assessed?: string | null
          order_frequency_score?: number | null
          outlet_id?: string | null
          payment_timeliness_score?: number | null
          recommended_terms?: string | null
          return_rate?: number | null
          risk_band?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          default_probability?: number | null
          id?: string
          industry_code?: string | null
          last_assessed?: string | null
          order_frequency_score?: number | null
          outlet_id?: string | null
          payment_timeliness_score?: number | null
          recommended_terms?: string | null
          return_rate?: number | null
          risk_band?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fmcg_retailer_credit_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "fmcg_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      fmcg_route_plans: {
        Row: {
          actual_distance_km: number | null
          actual_fuel_cost: number | null
          created_at: string | null
          driver_id: string | null
          fuel_cost_estimate: number | null
          id: string
          optimization_score: number | null
          planned_distance_km: number | null
          planned_outlets: string[] | null
          route_date: string | null
          route_name: string
          status: string | null
          tenant_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          actual_distance_km?: number | null
          actual_fuel_cost?: number | null
          created_at?: string | null
          driver_id?: string | null
          fuel_cost_estimate?: number | null
          id?: string
          optimization_score?: number | null
          planned_distance_km?: number | null
          planned_outlets?: string[] | null
          route_date?: string | null
          route_name: string
          status?: string | null
          tenant_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          actual_distance_km?: number | null
          actual_fuel_cost?: number | null
          created_at?: string | null
          driver_id?: string | null
          fuel_cost_estimate?: number | null
          id?: string
          optimization_score?: number | null
          planned_distance_km?: number | null
          planned_outlets?: string[] | null
          route_date?: string | null
          route_name?: string
          status?: string | null
          tenant_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      fmcg_skus: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          industry_code: string | null
          is_active: boolean | null
          sku_code: string
          sku_name: string
          subcategory: string | null
          tenant_id: string | null
          unit_cost: number | null
          unit_price: number | null
          weight_kg: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          industry_code?: string | null
          is_active?: boolean | null
          sku_code: string
          sku_name: string
          subcategory?: string | null
          tenant_id?: string | null
          unit_cost?: number | null
          unit_price?: number | null
          weight_kg?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          industry_code?: string | null
          is_active?: boolean | null
          sku_code?: string
          sku_name?: string
          subcategory?: string | null
          tenant_id?: string | null
          unit_cost?: number | null
          unit_price?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      fmcg_stock_levels: {
        Row: {
          current_qty: number | null
          id: string
          industry_code: string | null
          last_updated: string | null
          max_capacity: number | null
          recommended_restock_qty: number | null
          reorder_point: number | null
          sku_id: string | null
          stockout_prob_3d: number | null
          stockout_prob_7d: number | null
          tenant_id: string | null
          urgency_score: number | null
          warehouse_id: string | null
        }
        Insert: {
          current_qty?: number | null
          id?: string
          industry_code?: string | null
          last_updated?: string | null
          max_capacity?: number | null
          recommended_restock_qty?: number | null
          reorder_point?: number | null
          sku_id?: string | null
          stockout_prob_3d?: number | null
          stockout_prob_7d?: number | null
          tenant_id?: string | null
          urgency_score?: number | null
          warehouse_id?: string | null
        }
        Update: {
          current_qty?: number | null
          id?: string
          industry_code?: string | null
          last_updated?: string | null
          max_capacity?: number | null
          recommended_restock_qty?: number | null
          reorder_point?: number | null
          sku_id?: string | null
          stockout_prob_3d?: number | null
          stockout_prob_7d?: number | null
          tenant_id?: string | null
          urgency_score?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fmcg_stock_levels_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "fmcg_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      fmcg_team_members: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          fmcg_role: string
          id: string
          is_active: boolean | null
          organization_id: string | null
          territory: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          fmcg_role?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          territory?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          fmcg_role?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          territory?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fmcg_trade_promotions: {
        Row: {
          actual_roi: number | null
          actual_uplift_pct: number | null
          created_at: string | null
          discount_pct: number | null
          end_date: string | null
          id: string
          industry_code: string | null
          inventory_strain_score: number | null
          margin_erosion_pct: number | null
          predicted_roi: number | null
          predicted_uplift_pct: number | null
          promo_name: string
          promo_type: string | null
          start_date: string | null
          status: string | null
          target_regions: string[] | null
          target_skus: string[] | null
          tenant_id: string | null
        }
        Insert: {
          actual_roi?: number | null
          actual_uplift_pct?: number | null
          created_at?: string | null
          discount_pct?: number | null
          end_date?: string | null
          id?: string
          industry_code?: string | null
          inventory_strain_score?: number | null
          margin_erosion_pct?: number | null
          predicted_roi?: number | null
          predicted_uplift_pct?: number | null
          promo_name: string
          promo_type?: string | null
          start_date?: string | null
          status?: string | null
          target_regions?: string[] | null
          target_skus?: string[] | null
          tenant_id?: string | null
        }
        Update: {
          actual_roi?: number | null
          actual_uplift_pct?: number | null
          created_at?: string | null
          discount_pct?: number | null
          end_date?: string | null
          id?: string
          industry_code?: string | null
          inventory_strain_score?: number | null
          margin_erosion_pct?: number | null
          predicted_roi?: number | null
          predicted_uplift_pct?: number | null
          promo_name?: string
          promo_type?: string | null
          start_date?: string | null
          status?: string | null
          target_regions?: string[] | null
          target_skus?: string[] | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      fraud_detection_events: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          entity_id: string
          entity_type: string
          evidence: Json | null
          financial_impact: number | null
          fraud_type: string
          id: string
          investigated_by: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          entity_id: string
          entity_type: string
          evidence?: Json | null
          financial_impact?: number | null
          fraud_type: string
          id?: string
          investigated_by?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          entity_id?: string
          entity_type?: string
          evidence?: Json | null
          financial_impact?: number | null
          fraud_type?: string
          id?: string
          investigated_by?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fraud_flags: {
        Row: {
          confidence_score: number
          created_at: string
          dismissed_by: string | null
          entity_id: string
          entity_type: string
          explanation: string | null
          flag_status: string
          fraud_type: string
          id: string
          trigger_source: string | null
          updated_at: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          dismissed_by?: string | null
          entity_id: string
          entity_type: string
          explanation?: string | null
          flag_status?: string
          fraud_type: string
          id?: string
          trigger_source?: string | null
          updated_at?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          dismissed_by?: string | null
          entity_id?: string
          entity_type?: string
          explanation?: string | null
          flag_status?: string
          fraud_type?: string
          id?: string
          trigger_source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      freight_performance_notes: {
        Row: {
          corridor_risk_index: number | null
          created_at: string
          currency: string | null
          dispatch_id: string | null
          escrow_locked: boolean | null
          id: string
          insurance_coverage: number | null
          investor_type: string | null
          maturity_date: string | null
          note_value: number
          shipment_id: string | null
          status: string | null
          updated_at: string
          vendor_credit_score: number | null
          yield_rate: number | null
        }
        Insert: {
          corridor_risk_index?: number | null
          created_at?: string
          currency?: string | null
          dispatch_id?: string | null
          escrow_locked?: boolean | null
          id?: string
          insurance_coverage?: number | null
          investor_type?: string | null
          maturity_date?: string | null
          note_value?: number
          shipment_id?: string | null
          status?: string | null
          updated_at?: string
          vendor_credit_score?: number | null
          yield_rate?: number | null
        }
        Update: {
          corridor_risk_index?: number | null
          created_at?: string
          currency?: string | null
          dispatch_id?: string | null
          escrow_locked?: boolean | null
          id?: string
          insurance_coverage?: number | null
          investor_type?: string | null
          maturity_date?: string | null
          note_value?: number
          shipment_id?: string | null
          status?: string | null
          updated_at?: string
          vendor_credit_score?: number | null
          yield_rate?: number | null
        }
        Relationships: []
      }
      fuel_baselines: {
        Row: {
          avg_km_per_litre: number
          created_at: string
          id: string
          idle_fuel_per_hour: number
          load_factor_empty: number
          load_factor_full: number
          load_factor_half: number
          route_factor_highway: number
          route_factor_mixed: number
          route_factor_urban: number
          tenant_id: string | null
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          avg_km_per_litre?: number
          created_at?: string
          id?: string
          idle_fuel_per_hour?: number
          load_factor_empty?: number
          load_factor_full?: number
          load_factor_half?: number
          route_factor_highway?: number
          route_factor_mixed?: number
          route_factor_urban?: number
          tenant_id?: string | null
          updated_at?: string
          vehicle_type: string
        }
        Update: {
          avg_km_per_litre?: number
          created_at?: string
          id?: string
          idle_fuel_per_hour?: number
          load_factor_empty?: number
          load_factor_full?: number
          load_factor_half?: number
          route_factor_highway?: number
          route_factor_mixed?: number
          route_factor_urban?: number
          tenant_id?: string | null
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      fuel_events: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          cost_per_litre: number | null
          created_at: string
          created_by: string | null
          dispatch_id: string | null
          driver_id: string | null
          flag_reason: string | null
          flagged: boolean | null
          fuel_station: string | null
          gps_lat: number | null
          gps_lng: number | null
          gps_location_name: string | null
          id: string
          litres_issued: number
          receipt_url: string | null
          tenant_id: string | null
          total_cost: number | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          cost_per_litre?: number | null
          created_at?: string
          created_by?: string | null
          dispatch_id?: string | null
          driver_id?: string | null
          flag_reason?: string | null
          flagged?: boolean | null
          fuel_station?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          gps_location_name?: string | null
          id?: string
          litres_issued: number
          receipt_url?: string | null
          tenant_id?: string | null
          total_cost?: number | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          cost_per_litre?: number | null
          created_at?: string
          created_by?: string | null
          dispatch_id?: string | null
          driver_id?: string | null
          flag_reason?: string | null
          flagged?: boolean | null
          fuel_station?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          gps_location_name?: string | null
          id?: string
          litres_issued?: number
          receipt_url?: string | null
          tenant_id?: string | null
          total_cost?: number | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_events_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_events_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_fraud_flags: {
        Row: {
          created_at: string
          description: string | null
          dispatch_id: string | null
          driver_id: string | null
          evidence: Json | null
          fraud_type: string
          fuel_event_id: string | null
          id: string
          investigated_at: string | null
          investigated_by: string | null
          resolution: string | null
          resolved_at: string | null
          severity: string
          status: string
          tenant_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          dispatch_id?: string | null
          driver_id?: string | null
          evidence?: Json | null
          fraud_type: string
          fuel_event_id?: string | null
          id?: string
          investigated_at?: string | null
          investigated_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          tenant_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          dispatch_id?: string | null
          driver_id?: string | null
          evidence?: Json | null
          fraud_type?: string
          fuel_event_id?: string | null
          id?: string
          investigated_at?: string | null
          investigated_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          tenant_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_fraud_flags_fuel_event_id_fkey"
            columns: ["fuel_event_id"]
            isOneToOne: false
            referencedRelation: "fuel_events"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_index: {
        Row: {
          country_code: string
          created_at: string | null
          effective_date: string | null
          fuel_price_per_liter: number
          fuel_type: string | null
          id: string
          source: string | null
        }
        Insert: {
          country_code?: string
          created_at?: string | null
          effective_date?: string | null
          fuel_price_per_liter: number
          fuel_type?: string | null
          id?: string
          source?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          effective_date?: string | null
          fuel_price_per_liter?: number
          fuel_type?: string | null
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      fuel_investigations: {
        Row: {
          action_taken: string | null
          ai_conclusion: string | null
          cost_impact: number | null
          created_at: string | null
          dispatch_id: string | null
          driver_behavior_factors: Json | null
          driver_id: string | null
          expected_fuel_litres: number | null
          fraud_classification: string | null
          id: string
          investigated_by: string | null
          investigation_status: string | null
          issued_fuel_litres: number | null
          maintenance_factors: Json | null
          root_causes: Json | null
          updated_at: string | null
          variance_litres: number | null
          variance_percent: number | null
          vehicle_id: string | null
        }
        Insert: {
          action_taken?: string | null
          ai_conclusion?: string | null
          cost_impact?: number | null
          created_at?: string | null
          dispatch_id?: string | null
          driver_behavior_factors?: Json | null
          driver_id?: string | null
          expected_fuel_litres?: number | null
          fraud_classification?: string | null
          id?: string
          investigated_by?: string | null
          investigation_status?: string | null
          issued_fuel_litres?: number | null
          maintenance_factors?: Json | null
          root_causes?: Json | null
          updated_at?: string | null
          variance_litres?: number | null
          variance_percent?: number | null
          vehicle_id?: string | null
        }
        Update: {
          action_taken?: string | null
          ai_conclusion?: string | null
          cost_impact?: number | null
          created_at?: string | null
          dispatch_id?: string | null
          driver_behavior_factors?: Json | null
          driver_id?: string | null
          expected_fuel_litres?: number | null
          fraud_classification?: string | null
          id?: string
          investigated_by?: string | null
          investigation_status?: string | null
          issued_fuel_litres?: number | null
          maintenance_factors?: Json | null
          root_causes?: Json | null
          updated_at?: string | null
          variance_litres?: number | null
          variance_percent?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      fuel_logs: {
        Row: {
          cost_per_litre: number | null
          created_at: string
          driver_id: string | null
          flag_reason: string | null
          fuel_station: string | null
          fuel_type: string | null
          id: string
          is_flagged: boolean
          km_per_litre: number | null
          km_since_last_fill: number | null
          litres_dispensed: number
          log_date: string
          logged_by: string
          odometer_reading: number
          organization_id: string
          receipt_number: string | null
          total_cost: number | null
          vehicle_id: string
        }
        Insert: {
          cost_per_litre?: number | null
          created_at?: string
          driver_id?: string | null
          flag_reason?: string | null
          fuel_station?: string | null
          fuel_type?: string | null
          id?: string
          is_flagged?: boolean
          km_per_litre?: number | null
          km_since_last_fill?: number | null
          litres_dispensed: number
          log_date?: string
          logged_by: string
          odometer_reading: number
          organization_id: string
          receipt_number?: string | null
          total_cost?: number | null
          vehicle_id: string
        }
        Update: {
          cost_per_litre?: number | null
          created_at?: string
          driver_id?: string | null
          flag_reason?: string | null
          fuel_station?: string | null
          fuel_type?: string | null
          id?: string
          is_flagged?: boolean
          km_per_litre?: number | null
          km_since_last_fill?: number | null
          litres_dispensed?: number
          log_date?: string
          logged_by?: string
          odometer_reading?: number
          organization_id?: string
          receipt_number?: string | null
          total_cost?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_risk_scores: {
        Row: {
          ai_insights: string[] | null
          created_at: string
          driver_history_score: number | null
          driver_id: string
          fuel_request_pattern_score: number | null
          id: string
          idling_score: number | null
          overall_score: number
          risk_level: string
          route_deviation_score: number | null
          tenant_id: string | null
          updated_at: string
          variance_score: number | null
        }
        Insert: {
          ai_insights?: string[] | null
          created_at?: string
          driver_history_score?: number | null
          driver_id: string
          fuel_request_pattern_score?: number | null
          id?: string
          idling_score?: number | null
          overall_score?: number
          risk_level?: string
          route_deviation_score?: number | null
          tenant_id?: string | null
          updated_at?: string
          variance_score?: number | null
        }
        Update: {
          ai_insights?: string[] | null
          created_at?: string
          driver_history_score?: number | null
          driver_id?: string
          fuel_request_pattern_score?: number | null
          id?: string
          idling_score?: number | null
          overall_score?: number
          risk_level?: string
          route_deviation_score?: number | null
          tenant_id?: string | null
          updated_at?: string
          variance_score?: number | null
        }
        Relationships: []
      }
      fuel_savings_ledger: {
        Row: {
          cost_saved: number | null
          created_at: string | null
          drivers_flagged: number | null
          fraud_blocked_count: number | null
          fraud_blocked_value: number | null
          id: string
          litres_recovered: number | null
          notes: string | null
          organization_id: string | null
          payback_days: number | null
          period_end: string
          period_start: string
          vehicles_optimized: number | null
        }
        Insert: {
          cost_saved?: number | null
          created_at?: string | null
          drivers_flagged?: number | null
          fraud_blocked_count?: number | null
          fraud_blocked_value?: number | null
          id?: string
          litres_recovered?: number | null
          notes?: string | null
          organization_id?: string | null
          payback_days?: number | null
          period_end: string
          period_start: string
          vehicles_optimized?: number | null
        }
        Update: {
          cost_saved?: number | null
          created_at?: string | null
          drivers_flagged?: number | null
          fraud_blocked_count?: number | null
          fraud_blocked_value?: number | null
          id?: string
          litres_recovered?: number | null
          notes?: string | null
          organization_id?: string | null
          payback_days?: number | null
          period_end?: string
          period_start?: string
          vehicles_optimized?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_savings_ledger_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_suggestions: {
        Row: {
          average_actual_fuel: number | null
          created_at: string | null
          delivery_address: string
          id: string
          pickup_address: string
          tonnage_category: string | null
          trip_count: number | null
          updated_at: string | null
          vehicle_type: string | null
        }
        Insert: {
          average_actual_fuel?: number | null
          created_at?: string | null
          delivery_address: string
          id?: string
          pickup_address: string
          tonnage_category?: string | null
          trip_count?: number | null
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Update: {
          average_actual_fuel?: number | null
          created_at?: string | null
          delivery_address?: string
          id?: string
          pickup_address?: string
          tonnage_category?: string | null
          trip_count?: number | null
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      fuel_variance_reports: {
        Row: {
          actual_fuel_litres: number | null
          classification: string
          created_at: string
          dispatch_id: string | null
          distance_km: number | null
          driver_id: string | null
          expected_fuel_litres: number | null
          id: string
          idle_fuel_litres: number | null
          idle_hours: number | null
          load_factor_used: number | null
          load_weight_kg: number | null
          route_factor_used: number | null
          route_type: string | null
          tenant_id: string | null
          variance_litres: number | null
          variance_percent: number | null
          vehicle_id: string | null
        }
        Insert: {
          actual_fuel_litres?: number | null
          classification?: string
          created_at?: string
          dispatch_id?: string | null
          distance_km?: number | null
          driver_id?: string | null
          expected_fuel_litres?: number | null
          id?: string
          idle_fuel_litres?: number | null
          idle_hours?: number | null
          load_factor_used?: number | null
          load_weight_kg?: number | null
          route_factor_used?: number | null
          route_type?: string | null
          tenant_id?: string | null
          variance_litres?: number | null
          variance_percent?: number | null
          vehicle_id?: string | null
        }
        Update: {
          actual_fuel_litres?: number | null
          classification?: string
          created_at?: string
          dispatch_id?: string | null
          distance_km?: number | null
          driver_id?: string | null
          expected_fuel_litres?: number | null
          id?: string
          idle_fuel_litres?: number | null
          idle_hours?: number | null
          load_factor_used?: number | null
          load_weight_kg?: number | null
          route_factor_used?: number | null
          route_type?: string | null
          tenant_id?: string | null
          variance_litres?: number | null
          variance_percent?: number | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_variance_reports_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_variance_reports_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_repatriation_log: {
        Row: {
          amount_ngn: number
          amount_usd: number
          bank_name: string | null
          contract_id: string | null
          created_at: string
          fx_rate: number
          id: string
          operator_id: string | null
          repatriated_at: string | null
          status: string
        }
        Insert: {
          amount_ngn: number
          amount_usd: number
          bank_name?: string | null
          contract_id?: string | null
          created_at?: string
          fx_rate: number
          id?: string
          operator_id?: string | null
          repatriated_at?: string | null
          status?: string
        }
        Update: {
          amount_ngn?: number
          amount_usd?: number
          bank_name?: string | null
          contract_id?: string | null
          created_at?: string
          fx_rate?: number
          id?: string
          operator_id?: string | null
          repatriated_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fx_repatriation_log_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "export_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      global_regions: {
        Row: {
          base_price_multiplier: number
          calling_code: string | null
          cash_on_delivery_enabled: boolean
          continent: string
          country_code: string
          country_name: string
          created_at: string
          currency_code: string
          currency_name: string
          currency_symbol: string
          default_language: string
          flag_emoji: string | null
          fx_buffer_percent: number
          id: string
          informal_workforce_mode: boolean
          is_active: boolean
          is_priority_market: boolean
          launch_phase: number | null
          low_bandwidth_mode: boolean
          map_fallback_provider: string | null
          map_provider: string
          offline_mode_priority: boolean
          payment_fallback_gateway: string | null
          payment_gateway: string
          purchasing_power_index: number
          requires_carbon_reporting: boolean
          requires_ccpa: boolean
          requires_data_localization: boolean
          requires_eld: boolean
          requires_gdpr: boolean
          road_quality_score: number | null
          route_weight_border: boolean
          route_weight_congestion: boolean
          route_weight_mountain: boolean
          route_weight_snow: boolean
          route_weight_toll: boolean
          settlement_currency: string
          sub_region: string | null
          tax_engine_type: string | null
          terrain_type: string | null
          timezone: string
          updated_at: string
          vat_rate: number
          vat_type: string | null
        }
        Insert: {
          base_price_multiplier?: number
          calling_code?: string | null
          cash_on_delivery_enabled?: boolean
          continent: string
          country_code: string
          country_name: string
          created_at?: string
          currency_code?: string
          currency_name?: string
          currency_symbol?: string
          default_language?: string
          flag_emoji?: string | null
          fx_buffer_percent?: number
          id?: string
          informal_workforce_mode?: boolean
          is_active?: boolean
          is_priority_market?: boolean
          launch_phase?: number | null
          low_bandwidth_mode?: boolean
          map_fallback_provider?: string | null
          map_provider?: string
          offline_mode_priority?: boolean
          payment_fallback_gateway?: string | null
          payment_gateway?: string
          purchasing_power_index?: number
          requires_carbon_reporting?: boolean
          requires_ccpa?: boolean
          requires_data_localization?: boolean
          requires_eld?: boolean
          requires_gdpr?: boolean
          road_quality_score?: number | null
          route_weight_border?: boolean
          route_weight_congestion?: boolean
          route_weight_mountain?: boolean
          route_weight_snow?: boolean
          route_weight_toll?: boolean
          settlement_currency?: string
          sub_region?: string | null
          tax_engine_type?: string | null
          terrain_type?: string | null
          timezone?: string
          updated_at?: string
          vat_rate?: number
          vat_type?: string | null
        }
        Update: {
          base_price_multiplier?: number
          calling_code?: string | null
          cash_on_delivery_enabled?: boolean
          continent?: string
          country_code?: string
          country_name?: string
          created_at?: string
          currency_code?: string
          currency_name?: string
          currency_symbol?: string
          default_language?: string
          flag_emoji?: string | null
          fx_buffer_percent?: number
          id?: string
          informal_workforce_mode?: boolean
          is_active?: boolean
          is_priority_market?: boolean
          launch_phase?: number | null
          low_bandwidth_mode?: boolean
          map_fallback_provider?: string | null
          map_provider?: string
          offline_mode_priority?: boolean
          payment_fallback_gateway?: string | null
          payment_gateway?: string
          purchasing_power_index?: number
          requires_carbon_reporting?: boolean
          requires_ccpa?: boolean
          requires_data_localization?: boolean
          requires_eld?: boolean
          requires_gdpr?: boolean
          road_quality_score?: number | null
          route_weight_border?: boolean
          route_weight_congestion?: boolean
          route_weight_mountain?: boolean
          route_weight_snow?: boolean
          route_weight_toll?: boolean
          settlement_currency?: string
          sub_region?: string | null
          tax_engine_type?: string | null
          terrain_type?: string | null
          timezone?: string
          updated_at?: string
          vat_rate?: number
          vat_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_regions_default_language_fkey"
            columns: ["default_language"]
            isOneToOne: false
            referencedRelation: "supported_languages"
            referencedColumns: ["code"]
          },
        ]
      }
      global_shipments: {
        Row: {
          created_at: string
          currency: string | null
          customs_status: string | null
          description: string | null
          destination_country: string
          destination_logistics_partner: string | null
          duty_estimate: number | null
          escrow_wallet_id: string | null
          id: string
          insurance_status: string | null
          origin_country: string
          origin_logistics_partner: string | null
          receiver_address: string | null
          receiver_name: string | null
          receiver_phone: string | null
          risk_score: number | null
          sender_user_id: string | null
          status: string | null
          total_landed_cost: number | null
          total_value: number | null
          tracking_number: string | null
          updated_at: string
          vat_estimate: number | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          customs_status?: string | null
          description?: string | null
          destination_country: string
          destination_logistics_partner?: string | null
          duty_estimate?: number | null
          escrow_wallet_id?: string | null
          id?: string
          insurance_status?: string | null
          origin_country: string
          origin_logistics_partner?: string | null
          receiver_address?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          risk_score?: number | null
          sender_user_id?: string | null
          status?: string | null
          total_landed_cost?: number | null
          total_value?: number | null
          tracking_number?: string | null
          updated_at?: string
          vat_estimate?: number | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          customs_status?: string | null
          description?: string | null
          destination_country?: string
          destination_logistics_partner?: string | null
          duty_estimate?: number | null
          escrow_wallet_id?: string | null
          id?: string
          insurance_status?: string | null
          origin_country?: string
          origin_logistics_partner?: string | null
          receiver_address?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          risk_score?: number | null
          sender_user_id?: string | null
          status?: string | null
          total_landed_cost?: number | null
          total_value?: number | null
          tracking_number?: string | null
          updated_at?: string
          vat_estimate?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      global_tax_rules: {
        Row: {
          country_code: string
          created_at: string
          effective_date: string
          expiry_date: string | null
          id: string
          is_active: boolean
          rate: number
          rules_json: Json
          tax_name: string
          tax_type: string
          updated_at: string
        }
        Insert: {
          country_code: string
          created_at?: string
          effective_date?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          rate?: number
          rules_json?: Json
          tax_name: string
          tax_type: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          effective_date?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          rate?: number
          rules_json?: Json
          tax_name?: string
          tax_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      governance_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          ai_confidence: number | null
          ai_initiated: boolean | null
          autonomy_mode: string | null
          created_at: string | null
          decision: string
          id: string
          metadata: Json | null
          module_key: string
          override_by: string | null
          override_reason: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          ai_confidence?: number | null
          ai_initiated?: boolean | null
          autonomy_mode?: string | null
          created_at?: string | null
          decision: string
          id?: string
          metadata?: Json | null
          module_key: string
          override_by?: string | null
          override_reason?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          ai_confidence?: number | null
          ai_initiated?: boolean | null
          autonomy_mode?: string | null
          created_at?: string | null
          decision?: string
          id?: string
          metadata?: Json | null
          module_key?: string
          override_by?: string | null
          override_reason?: string | null
        }
        Relationships: []
      }
      governance_policies: {
        Row: {
          ai_allowed: boolean | null
          ai_can_execute: boolean | null
          approval_type: string
          autonomy_mode: string
          created_at: string | null
          created_by: string | null
          escalation_role: string | null
          id: string
          is_active: boolean | null
          module_key: string
          module_name: string
          os_context: string
          risk_threshold: number | null
          updated_at: string | null
          value_threshold: number | null
        }
        Insert: {
          ai_allowed?: boolean | null
          ai_can_execute?: boolean | null
          approval_type?: string
          autonomy_mode?: string
          created_at?: string | null
          created_by?: string | null
          escalation_role?: string | null
          id?: string
          is_active?: boolean | null
          module_key: string
          module_name: string
          os_context?: string
          risk_threshold?: number | null
          updated_at?: string | null
          value_threshold?: number | null
        }
        Update: {
          ai_allowed?: boolean | null
          ai_can_execute?: boolean | null
          approval_type?: string
          autonomy_mode?: string
          created_at?: string | null
          created_by?: string | null
          escalation_role?: string | null
          id?: string
          is_active?: boolean | null
          module_key?: string
          module_name?: string
          os_context?: string
          risk_threshold?: number | null
          updated_at?: string | null
          value_threshold?: number | null
        }
        Relationships: []
      }
      growth_lead_signals: {
        Row: {
          assigned_to: string | null
          created_at: string
          estimated_monthly_value: number | null
          id: string
          notes: string | null
          opportunity_score: number
          pain_signals: Json | null
          recommended_pitch: string | null
          region: string | null
          segment: string | null
          source: string | null
          status: string
          target_name: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          estimated_monthly_value?: number | null
          id?: string
          notes?: string | null
          opportunity_score?: number
          pain_signals?: Json | null
          recommended_pitch?: string | null
          region?: string | null
          segment?: string | null
          source?: string | null
          status?: string
          target_name: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          estimated_monthly_value?: number | null
          id?: string
          notes?: string | null
          opportunity_score?: number
          pain_signals?: Json | null
          recommended_pitch?: string | null
          region?: string | null
          segment?: string | null
          source?: string | null
          status?: string
          target_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      growth_referral_triggers: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name: string | null
          id: string
          performance_metric: string | null
          performance_value: number | null
          recommended_reward: string | null
          status: string
          trigger_reason: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          performance_metric?: string | null
          performance_value?: number | null
          recommended_reward?: string | null
          status?: string
          trigger_reason: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          performance_metric?: string | null
          performance_value?: number | null
          recommended_reward?: string | null
          status?: string
          trigger_reason?: string
        }
        Relationships: []
      }
      gtm_campaign_insights: {
        Row: {
          ad_type: string | null
          campaign_end: string | null
          campaign_id: string | null
          campaign_name: string
          campaign_start: string | null
          city: string | null
          clicks: number | null
          conversions: number | null
          country: string | null
          created_at: string
          ctr: number | null
          currency: string | null
          engagement_score: number | null
          id: string
          impressions: number | null
          industry_type: string
          landing_page_url: string | null
          leads_generated: number | null
          notes: string | null
          organization_id: string | null
          os_context: string
          platform: string
          region: string | null
          spend: number | null
          state: string | null
          target_audience: string | null
          updated_at: string
        }
        Insert: {
          ad_type?: string | null
          campaign_end?: string | null
          campaign_id?: string | null
          campaign_name: string
          campaign_start?: string | null
          city?: string | null
          clicks?: number | null
          conversions?: number | null
          country?: string | null
          created_at?: string
          ctr?: number | null
          currency?: string | null
          engagement_score?: number | null
          id?: string
          impressions?: number | null
          industry_type?: string
          landing_page_url?: string | null
          leads_generated?: number | null
          notes?: string | null
          organization_id?: string | null
          os_context?: string
          platform?: string
          region?: string | null
          spend?: number | null
          state?: string | null
          target_audience?: string | null
          updated_at?: string
        }
        Update: {
          ad_type?: string | null
          campaign_end?: string | null
          campaign_id?: string | null
          campaign_name?: string
          campaign_start?: string | null
          city?: string | null
          clicks?: number | null
          conversions?: number | null
          country?: string | null
          created_at?: string
          ctr?: number | null
          currency?: string | null
          engagement_score?: number | null
          id?: string
          impressions?: number | null
          industry_type?: string
          landing_page_url?: string | null
          leads_generated?: number | null
          notes?: string | null
          organization_id?: string | null
          os_context?: string
          platform?: string
          region?: string | null
          spend?: number | null
          state?: string | null
          target_audience?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gtm_conversations: {
        Row: {
          channel: string | null
          entity_id: string | null
          id: string
          industry_type: string | null
          last_message_at: string | null
          opportunity_id: string | null
          organization_id: string | null
          started_at: string | null
          status: string | null
          supply_node_id: string | null
        }
        Insert: {
          channel?: string | null
          entity_id?: string | null
          id?: string
          industry_type?: string | null
          last_message_at?: string | null
          opportunity_id?: string | null
          organization_id?: string | null
          started_at?: string | null
          status?: string | null
          supply_node_id?: string | null
        }
        Update: {
          channel?: string | null
          entity_id?: string | null
          id?: string
          industry_type?: string | null
          last_message_at?: string | null
          opportunity_id?: string | null
          organization_id?: string | null
          started_at?: string | null
          status?: string | null
          supply_node_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gtm_conversations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "gtm_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_conversations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "gtm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_conversations_supply_node_id_fkey"
            columns: ["supply_node_id"]
            isOneToOne: false
            referencedRelation: "gtm_supply_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      gtm_credit_txns: {
        Row: {
          action_label: string | null
          action_type: string
          balance_after: number | null
          created_at: string
          credits_consumed: number | null
          credits_purchased: number | null
          id: string
          industry_type: string
          metadata: Json | null
          os_context: string
          reference_id: string | null
          reference_type: string | null
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          action_label?: string | null
          action_type: string
          balance_after?: number | null
          created_at?: string
          credits_consumed?: number | null
          credits_purchased?: number | null
          id?: string
          industry_type?: string
          metadata?: Json | null
          os_context?: string
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          action_label?: string | null
          action_type?: string
          balance_after?: number | null
          created_at?: string
          credits_consumed?: number | null
          credits_purchased?: number | null
          id?: string
          industry_type?: string
          metadata?: Json | null
          os_context?: string
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gtm_credit_txns_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "gtm_credit_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      gtm_credit_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          industry_type: string
          is_active: boolean | null
          last_topped_up_at: string | null
          organization_id: string | null
          os_context: string
          total_consumed: number
          total_purchased: number
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          industry_type?: string
          is_active?: boolean | null
          last_topped_up_at?: string | null
          organization_id?: string | null
          os_context?: string
          total_consumed?: number
          total_purchased?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          industry_type?: string
          is_active?: boolean | null
          last_topped_up_at?: string | null
          organization_id?: string | null
          os_context?: string
          total_consumed?: number
          total_purchased?: number
          updated_at?: string
        }
        Relationships: []
      }
      gtm_demand_supply_matches: {
        Row: {
          capacity_score: number | null
          created_at: string | null
          geo_proximity_score: number | null
          historical_score: number | null
          id: string
          industry_type: string | null
          match_reason: string | null
          match_score: number | null
          opportunity_id: string
          organization_id: string | null
          performance_score: number | null
          response_speed_score: number | null
          service_fit_score: number | null
          status: string | null
          supply_node_id: string
        }
        Insert: {
          capacity_score?: number | null
          created_at?: string | null
          geo_proximity_score?: number | null
          historical_score?: number | null
          id?: string
          industry_type?: string | null
          match_reason?: string | null
          match_score?: number | null
          opportunity_id: string
          organization_id?: string | null
          performance_score?: number | null
          response_speed_score?: number | null
          service_fit_score?: number | null
          status?: string | null
          supply_node_id: string
        }
        Update: {
          capacity_score?: number | null
          created_at?: string | null
          geo_proximity_score?: number | null
          historical_score?: number | null
          id?: string
          industry_type?: string | null
          match_reason?: string | null
          match_score?: number | null
          opportunity_id?: string
          organization_id?: string | null
          performance_score?: number | null
          response_speed_score?: number | null
          service_fit_score?: number | null
          status?: string | null
          supply_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gtm_demand_supply_matches_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "gtm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_demand_supply_matches_supply_node_id_fkey"
            columns: ["supply_node_id"]
            isOneToOne: false
            referencedRelation: "gtm_supply_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      gtm_entities: {
        Row: {
          city: string | null
          contact_info: Json | null
          country: string | null
          created_at: string | null
          entity_type: string | null
          estimated_scale: string | null
          id: string
          industry: string | null
          industry_type: string | null
          location: string | null
          name: string
          organization_id: string | null
          os_context: string | null
          source_origin: string | null
          state: string | null
        }
        Insert: {
          city?: string | null
          contact_info?: Json | null
          country?: string | null
          created_at?: string | null
          entity_type?: string | null
          estimated_scale?: string | null
          id?: string
          industry?: string | null
          industry_type?: string | null
          location?: string | null
          name: string
          organization_id?: string | null
          os_context?: string | null
          source_origin?: string | null
          state?: string | null
        }
        Update: {
          city?: string | null
          contact_info?: Json | null
          country?: string | null
          created_at?: string | null
          entity_type?: string | null
          estimated_scale?: string | null
          id?: string
          industry?: string | null
          industry_type?: string | null
          location?: string | null
          name?: string
          organization_id?: string | null
          os_context?: string | null
          source_origin?: string | null
          state?: string | null
        }
        Relationships: []
      }
      gtm_intent_classifications: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          intent_type: string
          reasoning: string | null
          signal_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          intent_type?: string
          reasoning?: string | null
          signal_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          intent_type?: string
          reasoning?: string | null
          signal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gtm_intent_classifications_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "gtm_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      gtm_intent_scores: {
        Row: {
          created_at: string | null
          entity_id: string | null
          factors: Json | null
          id: string
          score: number | null
          signal_id: string | null
          tier: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          factors?: Json | null
          id?: string
          score?: number | null
          signal_id?: string | null
          tier?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          factors?: Json | null
          id?: string
          score?: number | null
          signal_id?: string | null
          tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gtm_intent_scores_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "gtm_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_intent_scores_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "gtm_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      gtm_meetings: {
        Row: {
          created_at: string | null
          created_by: string | null
          entity_id: string | null
          id: string
          industry_type: string | null
          notes: string | null
          opportunity_id: string | null
          organization_id: string | null
          scheduled_time: string
          status: string | null
          supply_node_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          entity_id?: string | null
          id?: string
          industry_type?: string | null
          notes?: string | null
          opportunity_id?: string | null
          organization_id?: string | null
          scheduled_time: string
          status?: string | null
          supply_node_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          entity_id?: string | null
          id?: string
          industry_type?: string | null
          notes?: string | null
          opportunity_id?: string | null
          organization_id?: string | null
          scheduled_time?: string
          status?: string | null
          supply_node_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gtm_meetings_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "gtm_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_meetings_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "gtm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_meetings_supply_node_id_fkey"
            columns: ["supply_node_id"]
            isOneToOne: false
            referencedRelation: "gtm_supply_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      gtm_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          sender_name: string | null
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender_name?: string | null
          sender_type?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender_name?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "gtm_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "gtm_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      gtm_opportunities: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          created_at: string | null
          description: string | null
          entity_id: string | null
          estimated_value: number | null
          geo_location: string | null
          id: string
          industry: string | null
          industry_type: string | null
          opportunity_type: string | null
          organization_id: string | null
          os_context: string | null
          priority: string | null
          search_query_id: string | null
          signal_id: string | null
          stage: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          estimated_value?: number | null
          geo_location?: string | null
          id?: string
          industry?: string | null
          industry_type?: string | null
          opportunity_type?: string | null
          organization_id?: string | null
          os_context?: string | null
          priority?: string | null
          search_query_id?: string | null
          signal_id?: string | null
          stage?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          estimated_value?: number | null
          geo_location?: string | null
          id?: string
          industry?: string | null
          industry_type?: string | null
          opportunity_type?: string | null
          organization_id?: string | null
          os_context?: string | null
          priority?: string | null
          search_query_id?: string | null
          signal_id?: string | null
          stage?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gtm_opportunities_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "gtm_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_opportunities_search_query_id_fkey"
            columns: ["search_query_id"]
            isOneToOne: false
            referencedRelation: "gtm_search_queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_opportunities_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "gtm_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      gtm_product_signals: {
        Row: {
          city: string | null
          competitor_mention: string | null
          country: string | null
          created_at: string
          demand_level: string | null
          id: string
          industry_type: string
          is_stockout: boolean | null
          metadata: Json | null
          organization_id: string | null
          os_context: string
          price_sensitivity: string | null
          product_category: string | null
          product_name: string
          raw_content: string | null
          region: string | null
          sentiment_score: number | null
          signal_source: string | null
          signal_type: string
          sku_code: string | null
          state: string | null
          updated_at: string
          volume_indicator: number | null
        }
        Insert: {
          city?: string | null
          competitor_mention?: string | null
          country?: string | null
          created_at?: string
          demand_level?: string | null
          id?: string
          industry_type?: string
          is_stockout?: boolean | null
          metadata?: Json | null
          organization_id?: string | null
          os_context?: string
          price_sensitivity?: string | null
          product_category?: string | null
          product_name: string
          raw_content?: string | null
          region?: string | null
          sentiment_score?: number | null
          signal_source?: string | null
          signal_type?: string
          sku_code?: string | null
          state?: string | null
          updated_at?: string
          volume_indicator?: number | null
        }
        Update: {
          city?: string | null
          competitor_mention?: string | null
          country?: string | null
          created_at?: string
          demand_level?: string | null
          id?: string
          industry_type?: string
          is_stockout?: boolean | null
          metadata?: Json | null
          organization_id?: string | null
          os_context?: string
          price_sensitivity?: string | null
          product_category?: string | null
          product_name?: string
          raw_content?: string | null
          region?: string | null
          sentiment_score?: number | null
          signal_source?: string | null
          signal_type?: string
          sku_code?: string | null
          state?: string | null
          updated_at?: string
          volume_indicator?: number | null
        }
        Relationships: []
      }
      gtm_search_queries: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          geo_location: string | null
          id: string
          industry_type: string | null
          intent_type: string | null
          is_processed: boolean | null
          organization_id: string | null
          os_context: string | null
          platform: string | null
          query_text: string
          state: string | null
          user_identifier: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          geo_location?: string | null
          id?: string
          industry_type?: string | null
          intent_type?: string | null
          is_processed?: boolean | null
          organization_id?: string | null
          os_context?: string | null
          platform?: string | null
          query_text: string
          state?: string | null
          user_identifier?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          geo_location?: string | null
          id?: string
          industry_type?: string | null
          intent_type?: string | null
          is_processed?: boolean | null
          organization_id?: string | null
          os_context?: string | null
          platform?: string | null
          query_text?: string
          state?: string | null
          user_identifier?: string | null
        }
        Relationships: []
      }
      gtm_signals: {
        Row: {
          author_handle: string | null
          author_metadata: Json | null
          content: string
          created_at: string | null
          created_by: string | null
          geo_lat: number | null
          geo_lng: number | null
          geo_location: string | null
          id: string
          industry_tag: string | null
          industry_type: string | null
          is_processed: boolean | null
          keyword: string | null
          organization_id: string | null
          os_context: string | null
          raw_payload: Json | null
          source_platform: string | null
          source_type: string
        }
        Insert: {
          author_handle?: string | null
          author_metadata?: Json | null
          content: string
          created_at?: string | null
          created_by?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          geo_location?: string | null
          id?: string
          industry_tag?: string | null
          industry_type?: string | null
          is_processed?: boolean | null
          keyword?: string | null
          organization_id?: string | null
          os_context?: string | null
          raw_payload?: Json | null
          source_platform?: string | null
          source_type?: string
        }
        Update: {
          author_handle?: string | null
          author_metadata?: Json | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          geo_location?: string | null
          id?: string
          industry_tag?: string | null
          industry_type?: string | null
          is_processed?: boolean | null
          keyword?: string | null
          organization_id?: string | null
          os_context?: string | null
          raw_payload?: Json | null
          source_platform?: string | null
          source_type?: string
        }
        Relationships: []
      }
      gtm_supply_nodes: {
        Row: {
          avg_response_minutes: number | null
          business_name: string
          capacity: Json | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          delivery_success_rate: number | null
          geo_coverage: Json | null
          historical_conversion_rate: number | null
          id: string
          industry: string | null
          industry_type: string | null
          is_active: boolean | null
          node_type: string
          organization_id: string | null
          os_context: string | null
          rating: number | null
          service_capabilities: Json | null
          sla_compliance_rate: number | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          avg_response_minutes?: number | null
          business_name: string
          capacity?: Json | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_success_rate?: number | null
          geo_coverage?: Json | null
          historical_conversion_rate?: number | null
          id?: string
          industry?: string | null
          industry_type?: string | null
          is_active?: boolean | null
          node_type?: string
          organization_id?: string | null
          os_context?: string | null
          rating?: number | null
          service_capabilities?: Json | null
          sla_compliance_rate?: number | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          avg_response_minutes?: number | null
          business_name?: string
          capacity?: Json | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_success_rate?: number | null
          geo_coverage?: Json | null
          historical_conversion_rate?: number | null
          id?: string
          industry?: string | null
          industry_type?: string | null
          is_active?: boolean | null
          node_type?: string
          organization_id?: string | null
          os_context?: string | null
          rating?: number | null
          service_capabilities?: Json | null
          sla_compliance_rate?: number | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      historical_invoice_data: {
        Row: {
          amount_not_vatable: number | null
          amount_vatable: number | null
          customer_id: string | null
          customer_name: string
          customer_payment_status: string | null
          delivery_location: string | null
          driver_name: string | null
          drop_point: string | null
          due_date: string | null
          extra_dropoff_cost: number | null
          extra_dropoffs: number | null
          gross_profit: number | null
          id: string
          imported_at: string
          imported_by: string | null
          invoice_date: string | null
          invoice_number: string | null
          invoice_paid_date: string | null
          invoice_status: string | null
          km_covered: number | null
          notes: string | null
          num_deliveries: number | null
          payment_receipt_date: string | null
          payment_terms_days: number | null
          period_month: number
          period_year: number
          pickup_location: string | null
          profit_margin: number | null
          route: string | null
          route_cluster: string | null
          source_file: string | null
          sub_total: number | null
          tonnage: string | null
          tonnage_loaded: number | null
          total_cost: number | null
          total_revenue: number | null
          total_vendor_cost: number | null
          transaction_date: string | null
          transaction_type: string | null
          trips_count: number | null
          truck_number: string | null
          truck_type: string | null
          vat_amount: number | null
          vendor_bill_number: string | null
          vendor_id: string | null
          vendor_invoice_status: string | null
          vendor_name: string | null
          waybill_numbers: string[] | null
          week_num: number | null
          wht_status: string | null
        }
        Insert: {
          amount_not_vatable?: number | null
          amount_vatable?: number | null
          customer_id?: string | null
          customer_name: string
          customer_payment_status?: string | null
          delivery_location?: string | null
          driver_name?: string | null
          drop_point?: string | null
          due_date?: string | null
          extra_dropoff_cost?: number | null
          extra_dropoffs?: number | null
          gross_profit?: number | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_paid_date?: string | null
          invoice_status?: string | null
          km_covered?: number | null
          notes?: string | null
          num_deliveries?: number | null
          payment_receipt_date?: string | null
          payment_terms_days?: number | null
          period_month: number
          period_year: number
          pickup_location?: string | null
          profit_margin?: number | null
          route?: string | null
          route_cluster?: string | null
          source_file?: string | null
          sub_total?: number | null
          tonnage?: string | null
          tonnage_loaded?: number | null
          total_cost?: number | null
          total_revenue?: number | null
          total_vendor_cost?: number | null
          transaction_date?: string | null
          transaction_type?: string | null
          trips_count?: number | null
          truck_number?: string | null
          truck_type?: string | null
          vat_amount?: number | null
          vendor_bill_number?: string | null
          vendor_id?: string | null
          vendor_invoice_status?: string | null
          vendor_name?: string | null
          waybill_numbers?: string[] | null
          week_num?: number | null
          wht_status?: string | null
        }
        Update: {
          amount_not_vatable?: number | null
          amount_vatable?: number | null
          customer_id?: string | null
          customer_name?: string
          customer_payment_status?: string | null
          delivery_location?: string | null
          driver_name?: string | null
          drop_point?: string | null
          due_date?: string | null
          extra_dropoff_cost?: number | null
          extra_dropoffs?: number | null
          gross_profit?: number | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_paid_date?: string | null
          invoice_status?: string | null
          km_covered?: number | null
          notes?: string | null
          num_deliveries?: number | null
          payment_receipt_date?: string | null
          payment_terms_days?: number | null
          period_month?: number
          period_year?: number
          pickup_location?: string | null
          profit_margin?: number | null
          route?: string | null
          route_cluster?: string | null
          source_file?: string | null
          sub_total?: number | null
          tonnage?: string | null
          tonnage_loaded?: number | null
          total_cost?: number | null
          total_revenue?: number | null
          total_vendor_cost?: number | null
          transaction_date?: string | null
          transaction_type?: string | null
          trips_count?: number | null
          truck_number?: string | null
          truck_type?: string | null
          vat_amount?: number | null
          vendor_bill_number?: string | null
          vendor_id?: string | null
          vendor_invoice_status?: string | null
          vendor_name?: string | null
          waybill_numbers?: string[] | null
          week_num?: number | null
          wht_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historical_invoice_data_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_invoice_data_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      immutable_financial_ledger: {
        Row: {
          action_type: string
          actor_user_id: string | null
          amount: number | null
          created_at: string
          currency_code: string | null
          description: string | null
          entry_hash: string
          id: string
          metadata: Json | null
          module: string
          previous_hash: string | null
          reference_id: string | null
          reference_type: string | null
          sequence_number: number
          tenant_id: string | null
        }
        Insert: {
          action_type: string
          actor_user_id?: string | null
          amount?: number | null
          created_at?: string
          currency_code?: string | null
          description?: string | null
          entry_hash: string
          id?: string
          metadata?: Json | null
          module: string
          previous_hash?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sequence_number?: number
          tenant_id?: string | null
        }
        Update: {
          action_type?: string
          actor_user_id?: string | null
          amount?: number | null
          created_at?: string
          currency_code?: string | null
          description?: string | null
          entry_hash?: string
          id?: string
          metadata?: Json | null
          module?: string
          previous_hash?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sequence_number?: number
          tenant_id?: string | null
        }
        Relationships: []
      }
      inbound_receipts: {
        Row: {
          created_at: string
          created_by: string | null
          discrepancy_notes: string | null
          expected_date: string | null
          id: string
          organization_id: string
          purchase_order_ref: string | null
          receipt_number: string
          received_by: string | null
          received_date: string | null
          received_items: number | null
          status: string
          supplier_name: string
          total_items: number | null
          updated_at: string
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discrepancy_notes?: string | null
          expected_date?: string | null
          id?: string
          organization_id: string
          purchase_order_ref?: string | null
          receipt_number?: string
          received_by?: string | null
          received_date?: string | null
          received_items?: number | null
          status?: string
          supplier_name: string
          total_items?: number | null
          updated_at?: string
          warehouse_id?: string | null
          warehouse_name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discrepancy_notes?: string | null
          expected_date?: string | null
          id?: string
          organization_id?: string
          purchase_order_ref?: string | null
          receipt_number?: string
          received_by?: string | null
          received_date?: string | null
          received_items?: number | null
          status?: string
          supplier_name?: string
          total_items?: number | null
          updated_at?: string
          warehouse_id?: string | null
          warehouse_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      industries: {
        Row: {
          code: string
          color_primary: string | null
          color_secondary: string | null
          created_at: string
          description: string | null
          display_name: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          code: string
          color_primary?: string | null
          color_secondary?: string | null
          created_at?: string
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          code?: string
          color_primary?: string | null
          color_secondary?: string | null
          created_at?: string
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      industry_entitlements: {
        Row: {
          ai_credits_total: number
          ai_credits_used: number
          api_access_enabled: boolean
          conversation_intelligence: boolean
          created_at: string
          custom_objects_enabled: boolean
          enabled_ai_tools: string[]
          enabled_modules: string[]
          id: string
          industry_vertical: string
          max_ai_credits_monthly: number
          max_users: number
          monthly_price_per_user: number
          offline_mode_level: string
          organization_id: string | null
          plan_tier: string
          pricing_currency: string
          sandbox_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_credits_total?: number
          ai_credits_used?: number
          api_access_enabled?: boolean
          conversation_intelligence?: boolean
          created_at?: string
          custom_objects_enabled?: boolean
          enabled_ai_tools?: string[]
          enabled_modules?: string[]
          id?: string
          industry_vertical?: string
          max_ai_credits_monthly?: number
          max_users?: number
          monthly_price_per_user?: number
          offline_mode_level?: string
          organization_id?: string | null
          plan_tier?: string
          pricing_currency?: string
          sandbox_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_credits_total?: number
          ai_credits_used?: number
          api_access_enabled?: boolean
          conversation_intelligence?: boolean
          created_at?: string
          custom_objects_enabled?: boolean
          enabled_ai_tools?: string[]
          enabled_modules?: string[]
          id?: string
          industry_vertical?: string
          max_ai_credits_monthly?: number
          max_users?: number
          monthly_price_per_user?: number
          offline_mode_level?: string
          organization_id?: string | null
          plan_tier?: string
          pricing_currency?: string
          sandbox_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "industry_entitlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_kpis: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          industry_code: string
          is_active: boolean | null
          kpi_key: string
          kpi_name: string
          target_value: number | null
          unit: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          industry_code: string
          is_active?: boolean | null
          kpi_key: string
          kpi_name: string
          target_value?: number | null
          unit?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          industry_code?: string
          is_active?: boolean | null
          kpi_key?: string
          kpi_name?: string
          target_value?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "industry_kpis_industry_code_fkey"
            columns: ["industry_code"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["code"]
          },
        ]
      }
      industry_tenants: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          industry_code: string
          is_active: boolean | null
          organization_id: string | null
          tenant_name: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          industry_code: string
          is_active?: boolean | null
          organization_id?: string | null
          tenant_name: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          industry_code?: string
          is_active?: boolean | null
          organization_id?: string | null
          tenant_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "industry_tenants_industry_code_fkey"
            columns: ["industry_code"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "industry_tenants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_claims_predictions: {
        Row: {
          claim_probability: number | null
          confidence_score: number | null
          created_at: string | null
          currency: string | null
          entity_id: string
          entity_type: string
          id: string
          predicted_claim_amount: number | null
          recommendation: string | null
          risk_factors: Json | null
          time_horizon_days: number | null
        }
        Insert: {
          claim_probability?: number | null
          confidence_score?: number | null
          created_at?: string | null
          currency?: string | null
          entity_id: string
          entity_type: string
          id?: string
          predicted_claim_amount?: number | null
          recommendation?: string | null
          risk_factors?: Json | null
          time_horizon_days?: number | null
        }
        Update: {
          claim_probability?: number | null
          confidence_score?: number | null
          created_at?: string | null
          currency?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          predicted_claim_amount?: number | null
          recommendation?: string | null
          risk_factors?: Json | null
          time_horizon_days?: number | null
        }
        Relationships: []
      }
      integration_configs: {
        Row: {
          auth_method: string
          auto_sync_enabled: boolean
          client_id: string | null
          config: Json
          created_at: string
          created_by: string | null
          id: string
          instance_url: string | null
          integration_type: string
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_status: string | null
          last_synced_at: string | null
          organization_id: string
          provider: string | null
          secrets_vault_id: string | null
          sync_cursor: Json | null
          sync_interval_seconds: number
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          auth_method?: string
          auto_sync_enabled?: boolean
          client_id?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          instance_url?: string | null
          integration_type: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          organization_id: string
          provider?: string | null
          secrets_vault_id?: string | null
          sync_cursor?: Json | null
          sync_interval_seconds?: number
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          auth_method?: string
          auto_sync_enabled?: boolean
          client_id?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          instance_url?: string | null
          integration_type?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          organization_id?: string
          provider?: string | null
          secrets_vault_id?: string | null
          sync_cursor?: Json | null
          sync_interval_seconds?: number
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_oauth_states: {
        Row: {
          code_verifier: string | null
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          organization_id: string
          provider: string
          redirect_after: string | null
          state: string
          user_id: string
        }
        Insert: {
          code_verifier?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          organization_id: string
          provider: string
          redirect_after?: string | null
          state: string
          user_id: string
        }
        Update: {
          code_verifier?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          organization_id?: string
          provider?: string
          redirect_after?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      integration_sync_log: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          organization_id: string
          payload_summary: Json | null
          provider: string
          records_processed: number | null
          started_at: string
          status: string
          sync_type: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          organization_id: string
          payload_summary?: Json | null
          provider: string
          records_processed?: number | null
          started_at?: string
          status: string
          sync_type: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string
          payload_summary?: Json | null
          provider?: string
          records_processed?: number | null
          started_at?: string
          status?: string
          sync_type?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      integrations: {
        Row: {
          config: Json | null
          created_at: string
          created_by: string | null
          id: string
          is_enabled: boolean | null
          last_sync_at: string | null
          name: string
          organization_id: string | null
          secrets_vault_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_enabled?: boolean | null
          last_sync_at?: string | null
          name: string
          organization_id?: string | null
          secrets_vault_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_enabled?: boolean | null
          last_sync_at?: string | null
          name?: string
          organization_id?: string | null
          secrets_vault_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_access_logs: {
        Row: {
          accessed_at: string
          id: string
          internal_count: number | null
          metadata: Json | null
          module: string
          organization_id: string | null
          ownership_scope: string | null
          record_count: number | null
          route: string | null
          third_party_count: number | null
          user_email: string | null
          user_id: string
          view_scope: string
        }
        Insert: {
          accessed_at?: string
          id?: string
          internal_count?: number | null
          metadata?: Json | null
          module: string
          organization_id?: string | null
          ownership_scope?: string | null
          record_count?: number | null
          route?: string | null
          third_party_count?: number | null
          user_email?: string | null
          user_id: string
          view_scope: string
        }
        Update: {
          accessed_at?: string
          id?: string
          internal_count?: number | null
          metadata?: Json | null
          module?: string
          organization_id?: string | null
          ownership_scope?: string | null
          record_count?: number | null
          route?: string | null
          third_party_count?: number | null
          user_email?: string | null
          user_id?: string
          view_scope?: string
        }
        Relationships: []
      }
      intercompany_transactions: {
        Row: {
          amount: number
          buyer_entity_id: string | null
          created_at: string
          currency: string
          elimination_status: string | null
          id: string
          seller_entity_id: string | null
          transaction_type: string
        }
        Insert: {
          amount?: number
          buyer_entity_id?: string | null
          created_at?: string
          currency?: string
          elimination_status?: string | null
          id?: string
          seller_entity_id?: string | null
          transaction_type?: string
        }
        Update: {
          amount?: number
          buyer_entity_id?: string | null
          created_at?: string
          currency?: string
          elimination_status?: string | null
          id?: string
          seller_entity_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "intercompany_transactions_buyer_entity_id_fkey"
            columns: ["buyer_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercompany_transactions_seller_entity_id_fkey"
            columns: ["seller_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reconciliations: {
        Row: {
          created_at: string | null
          discrepancies_found: number | null
          id: string
          misplaced: number | null
          notes: string | null
          overages: number | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_date: string
          shortages: number | null
          status: string
          total_skus_checked: number | null
          warehouse_id: string
        }
        Insert: {
          created_at?: string | null
          discrepancies_found?: number | null
          id?: string
          misplaced?: number | null
          notes?: string | null
          overages?: number | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date?: string
          shortages?: number | null
          status?: string
          total_skus_checked?: number | null
          warehouse_id: string
        }
        Update: {
          created_at?: string | null
          discrepancies_found?: number | null
          id?: string
          misplaced?: number | null
          notes?: string | null
          overages?: number | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date?: string
          shortages?: number | null
          status?: string
          total_skus_checked?: number | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reconciliations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_access_logs: {
        Row: {
          access_type: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          nda_acknowledged: boolean | null
          resource_accessed: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          access_type?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          nda_acknowledged?: boolean | null
          resource_accessed?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          nda_acknowledged?: boolean | null
          resource_accessed?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      investor_assessments: {
        Row: {
          ai_narrative: string | null
          cash_runway_months: number | null
          created_at: string
          growth_rate_pct: number | null
          id: string
          organization_id: string | null
          readiness_score: number
          recommended_action: string | null
          recommended_raise_amount: number | null
          revenue_multiple: number | null
          stage: string | null
          strengths: Json | null
          target_investors: Json | null
          use_of_funds: Json | null
          valuation_high: number | null
          valuation_low: number | null
          weaknesses: Json | null
        }
        Insert: {
          ai_narrative?: string | null
          cash_runway_months?: number | null
          created_at?: string
          growth_rate_pct?: number | null
          id?: string
          organization_id?: string | null
          readiness_score?: number
          recommended_action?: string | null
          recommended_raise_amount?: number | null
          revenue_multiple?: number | null
          stage?: string | null
          strengths?: Json | null
          target_investors?: Json | null
          use_of_funds?: Json | null
          valuation_high?: number | null
          valuation_low?: number | null
          weaknesses?: Json | null
        }
        Update: {
          ai_narrative?: string | null
          cash_runway_months?: number | null
          created_at?: string
          growth_rate_pct?: number | null
          id?: string
          organization_id?: string | null
          readiness_score?: number
          recommended_action?: string | null
          recommended_raise_amount?: number | null
          revenue_multiple?: number | null
          stage?: string | null
          strengths?: Json | null
          target_investors?: Json | null
          use_of_funds?: Json | null
          valuation_high?: number | null
          valuation_low?: number | null
          weaknesses?: Json | null
        }
        Relationships: []
      }
      investor_metrics: {
        Row: {
          created_at: string | null
          data_source: string | null
          id: string
          known_limitations: string | null
          metric_date: string
          metric_formula: string | null
          metric_type: string
          metric_value: number
          update_frequency: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_source?: string | null
          id?: string
          known_limitations?: string | null
          metric_date: string
          metric_formula?: string | null
          metric_type: string
          metric_value: number
          update_frequency?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_source?: string | null
          id?: string
          known_limitations?: string | null
          metric_date?: string
          metric_formula?: string | null
          metric_type?: string
          metric_value?: number
          update_frequency?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoice_line_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          dispatch_id: string | null
          dropoff_address: string | null
          id: string
          invoice_id: string
          item_type: string
          line_total: number | null
          quantity: number
          rate: number | null
          sequence_order: number
          tonnage: string | null
          unit_price: number
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          dispatch_id?: string | null
          dropoff_address?: string | null
          id?: string
          invoice_id: string
          item_type?: string
          line_total?: number | null
          quantity?: number
          rate?: number | null
          sequence_order?: number
          tonnage?: string | null
          unit_price?: number
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          dispatch_id?: string | null
          dropoff_address?: string | null
          id?: string
          invoice_id?: string
          item_type?: string
          line_total?: number | null
          quantity?: number
          rate?: number | null
          sequence_order?: number
          tonnage?: string | null
          unit_price?: number
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          amount_paid: number | null
          approval_status: string | null
          auto_generated: boolean
          balance_due: number | null
          created_at: string
          created_by: string | null
          currency_code: string | null
          customer_id: string
          dispatch_id: string | null
          due_date: string | null
          first_approved_at: string | null
          first_approver_id: string | null
          id: string
          invoice_date: string | null
          invoice_number: string
          invoice_prefix: string | null
          invoice_sequence: number | null
          is_locked: boolean | null
          is_posted: boolean | null
          lock_type: string | null
          locked_at: string | null
          locked_by: string | null
          locked_reason: string | null
          notes: string | null
          organization_id: string | null
          paid_date: string | null
          payment_terms: string | null
          posted_at: string | null
          posted_by: string | null
          rejection_reason: string | null
          second_approved_at: string | null
          second_approver_id: string | null
          shipping_charge: number | null
          shipping_vat_amount: number | null
          shipping_vat_rate: number | null
          sla_breach_record_id: string | null
          sla_insurance_coverage: number | null
          sla_penalty_amount: number | null
          status: string | null
          status_updated_at: string | null
          submitted_by: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_type: string | null
          total_amount: number
          updated_at: string
          vendor_rate_card_id: string | null
          zoho_invoice_id: string | null
          zoho_synced_at: string | null
        }
        Insert: {
          amount: number
          amount_paid?: number | null
          approval_status?: string | null
          auto_generated?: boolean
          balance_due?: number | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          customer_id: string
          dispatch_id?: string | null
          due_date?: string | null
          first_approved_at?: string | null
          first_approver_id?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number: string
          invoice_prefix?: string | null
          invoice_sequence?: number | null
          is_locked?: boolean | null
          is_posted?: boolean | null
          lock_type?: string | null
          locked_at?: string | null
          locked_by?: string | null
          locked_reason?: string | null
          notes?: string | null
          organization_id?: string | null
          paid_date?: string | null
          payment_terms?: string | null
          posted_at?: string | null
          posted_by?: string | null
          rejection_reason?: string | null
          second_approved_at?: string | null
          second_approver_id?: string | null
          shipping_charge?: number | null
          shipping_vat_amount?: number | null
          shipping_vat_rate?: number | null
          sla_breach_record_id?: string | null
          sla_insurance_coverage?: number | null
          sla_penalty_amount?: number | null
          status?: string | null
          status_updated_at?: string | null
          submitted_by?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_type?: string | null
          total_amount: number
          updated_at?: string
          vendor_rate_card_id?: string | null
          zoho_invoice_id?: string | null
          zoho_synced_at?: string | null
        }
        Update: {
          amount?: number
          amount_paid?: number | null
          approval_status?: string | null
          auto_generated?: boolean
          balance_due?: number | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string
          dispatch_id?: string | null
          due_date?: string | null
          first_approved_at?: string | null
          first_approver_id?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          invoice_prefix?: string | null
          invoice_sequence?: number | null
          is_locked?: boolean | null
          is_posted?: boolean | null
          lock_type?: string | null
          locked_at?: string | null
          locked_by?: string | null
          locked_reason?: string | null
          notes?: string | null
          organization_id?: string | null
          paid_date?: string | null
          payment_terms?: string | null
          posted_at?: string | null
          posted_by?: string | null
          rejection_reason?: string | null
          second_approved_at?: string | null
          second_approver_id?: string | null
          shipping_charge?: number | null
          shipping_vat_amount?: number | null
          shipping_vat_rate?: number | null
          sla_breach_record_id?: string | null
          sla_insurance_coverage?: number | null
          sla_penalty_amount?: number | null
          status?: string | null
          status_updated_at?: string | null
          submitted_by?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_type?: string | null
          total_amount?: number
          updated_at?: string
          vendor_rate_card_id?: string | null
          zoho_invoice_id?: string | null
          zoho_synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sla_breach_record_id_fkey"
            columns: ["sla_breach_record_id"]
            isOneToOne: false
            referencedRelation: "sla_breach_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_rate_card_id_fkey"
            columns: ["vendor_rate_card_id"]
            isOneToOne: false
            referencedRelation: "vendor_rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_allowlist: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          ip_address: unknown
          is_active?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          created_at: string | null
          credit: number | null
          currency_code: string | null
          debit: number | null
          description: string | null
          entry_date: string
          entry_number: string | null
          id: string
          organization_id: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          status: string | null
        }
        Insert: {
          account_code?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          credit?: number | null
          currency_code?: string | null
          debit?: number | null
          description?: string | null
          entry_date?: string
          entry_number?: string | null
          id?: string
          organization_id?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
        }
        Update: {
          account_code?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          credit?: number | null
          currency_code?: string | null
          debit?: number | null
          description?: string | null
          entry_date?: string
          entry_number?: string | null
          id?: string
          organization_id?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_audit_log: {
        Row: {
          actual_value: number
          computed_at: string
          computed_by: string | null
          formula: string | null
          id: string
          inputs: Json
          metric_key: string
          organization_id: string | null
          performance_pct: number
          period_end: string
          period_start: string
          role_tag: string
          snapshot_id: string | null
          source_module: string
          target_value: number
          user_id: string
        }
        Insert: {
          actual_value: number
          computed_at?: string
          computed_by?: string | null
          formula?: string | null
          id?: string
          inputs?: Json
          metric_key: string
          organization_id?: string | null
          performance_pct: number
          period_end: string
          period_start: string
          role_tag: string
          snapshot_id?: string | null
          source_module: string
          target_value: number
          user_id: string
        }
        Update: {
          actual_value?: number
          computed_at?: string
          computed_by?: string | null
          formula?: string | null
          id?: string
          inputs?: Json
          metric_key?: string
          organization_id?: string | null
          performance_pct?: number
          period_end?: string
          period_start?: string
          role_tag?: string
          snapshot_id?: string | null
          source_module?: string
          target_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_audit_log_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "kpi_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_cache: {
        Row: {
          computed_at: string
          expires_at: string | null
          id: string
          metric_key: string
          organization_id: string
          scope: string
          scope_ref: string | null
          value: number
        }
        Insert: {
          computed_at?: string
          expires_at?: string | null
          id?: string
          metric_key: string
          organization_id: string
          scope?: string
          scope_ref?: string | null
          value?: number
        }
        Update: {
          computed_at?: string
          expires_at?: string | null
          id?: string
          metric_key?: string
          organization_id?: string
          scope?: string
          scope_ref?: string | null
          value?: number
        }
        Relationships: []
      }
      kpi_definitions: {
        Row: {
          created_at: string
          default_target: number
          description: string | null
          direction: string
          id: string
          is_active: boolean
          label: string
          metric_key: string
          source_module: string
          unit: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          default_target?: number
          description?: string | null
          direction?: string
          id?: string
          is_active?: boolean
          label: string
          metric_key: string
          source_module: string
          unit?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          default_target?: number
          description?: string | null
          direction?: string
          id?: string
          is_active?: boolean
          label?: string
          metric_key?: string
          source_module?: string
          unit?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      kpi_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          organization_id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          reference_id: string | null
          source_module: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          organization_id: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          reference_id?: string | null
          source_module?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          organization_id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          reference_id?: string | null
          source_module?: string | null
        }
        Relationships: []
      }
      kpi_metrics: {
        Row: {
          calculated_at: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          period_end: string
          period_start: string
          role: string
          target_value: number | null
          unit: string | null
        }
        Insert: {
          calculated_at?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          metric_value?: number
          period_end: string
          period_start: string
          role: string
          target_value?: number | null
          unit?: string | null
        }
        Update: {
          calculated_at?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          metric_value?: number
          period_end?: string
          period_start?: string
          role?: string
          target_value?: number | null
          unit?: string | null
        }
        Relationships: []
      }
      kpi_period_snapshots: {
        Row: {
          created_at: string
          id: string
          kpi_category: string
          kpi_name: string
          metadata: Json | null
          period_end: string
          period_start: string
          period_type: string
          previous_period_value: number | null
          tenant_id: string | null
          value: number
          variance_absolute: number | null
          variance_percentage: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          kpi_category?: string
          kpi_name: string
          metadata?: Json | null
          period_end: string
          period_start: string
          period_type: string
          previous_period_value?: number | null
          tenant_id?: string | null
          value?: number
          variance_absolute?: number | null
          variance_percentage?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          kpi_category?: string
          kpi_name?: string
          metadata?: Json | null
          period_end?: string
          period_start?: string
          period_type?: string
          previous_period_value?: number | null
          tenant_id?: string | null
          value?: number
          variance_absolute?: number | null
          variance_percentage?: number | null
        }
        Relationships: []
      }
      kpi_recommendations: {
        Row: {
          action_type: string
          adopted_at: string | null
          created_at: string
          dismissed_at: string | null
          id: string
          metric_key: string
          organization_id: string | null
          outcome_at: string | null
          outcome_pct: number | null
          performance_pct: number
          recommendation: string
          role_tag: string
          severity: string
          signals: Json
          snapshot_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type?: string
          adopted_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          metric_key: string
          organization_id?: string | null
          outcome_at?: string | null
          outcome_pct?: number | null
          performance_pct?: number
          recommendation: string
          role_tag: string
          severity: string
          signals?: Json
          snapshot_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          adopted_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          metric_key?: string
          organization_id?: string | null
          outcome_at?: string | null
          outcome_pct?: number | null
          performance_pct?: number
          recommendation?: string
          role_tag?: string
          severity?: string
          signals?: Json
          snapshot_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_recommendations_metric_key_fkey"
            columns: ["metric_key"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["metric_key"]
          },
          {
            foreignKeyName: "kpi_recommendations_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "kpi_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_role_assignments: {
        Row: {
          created_at: string
          id: string
          metric_key: string
          role_tag: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_key: string
          role_tag: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_key?: string
          role_tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_role_assignments_metric_key_fkey"
            columns: ["metric_key"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["metric_key"]
          },
        ]
      }
      kpi_snapshots: {
        Row: {
          actual_value: number
          computed_at: string
          id: string
          metric_key: string
          organization_id: string | null
          performance_pct: number
          period_end: string
          period_start: string
          period_type: string
          role_tag: string
          status: string
          target_value: number
          user_id: string
        }
        Insert: {
          actual_value?: number
          computed_at?: string
          id?: string
          metric_key: string
          organization_id?: string | null
          performance_pct?: number
          period_end: string
          period_start: string
          period_type?: string
          role_tag: string
          status?: string
          target_value?: number
          user_id: string
        }
        Update: {
          actual_value?: number
          computed_at?: string
          id?: string
          metric_key?: string
          organization_id?: string | null
          performance_pct?: number
          period_end?: string
          period_start?: string
          period_type?: string
          role_tag?: string
          status?: string
          target_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_snapshots_metric_key_fkey"
            columns: ["metric_key"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["metric_key"]
          },
        ]
      }
      kpi_target_overrides: {
        Row: {
          created_at: string
          id: string
          metric_key: string
          notes: string | null
          organization_id: string | null
          role_tag: string
          set_by: string | null
          target_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_key: string
          notes?: string | null
          organization_id?: string | null
          role_tag: string
          set_by?: string | null
          target_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_key?: string
          notes?: string | null
          organization_id?: string | null
          role_tag?: string
          set_by?: string | null
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_target_overrides_metric_key_fkey"
            columns: ["metric_key"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["metric_key"]
          },
        ]
      }
      language_packs: {
        Row: {
          created_at: string
          id: string
          key: string
          language_code: string
          namespace: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          language_code: string
          namespace?: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          language_code?: string
          namespace?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "language_packs_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "supported_languages"
            referencedColumns: ["code"]
          },
        ]
      }
      lc_access_audit_log: {
        Row: {
          attempted_org_id: string | null
          blocked: boolean
          created_at: string
          details: Json | null
          id: string
          operation: string
          table_name: string
          user_id: string | null
          user_org_id: string | null
        }
        Insert: {
          attempted_org_id?: string | null
          blocked?: boolean
          created_at?: string
          details?: Json | null
          id?: string
          operation: string
          table_name: string
          user_id?: string | null
          user_org_id?: string | null
        }
        Update: {
          attempted_org_id?: string | null
          blocked?: boolean
          created_at?: string
          details?: Json | null
          id?: string
          operation?: string
          table_name?: string
          user_id?: string | null
          user_org_id?: string | null
        }
        Relationships: []
      }
      ld_complaints: {
        Row: {
          complaint_date: string
          complaint_type: string
          created_at: string
          customer_name: string
          description: string
          dispatch_id: string | null
          id: string
          logged_by: string
          organization_id: string
          priority: string
          rating: number | null
          resolution_note: string | null
          resolved_at: string | null
          sla_breached: boolean
          sla_due_at: string | null
          sla_hours: number
          status: string
          updated_at: string
        }
        Insert: {
          complaint_date?: string
          complaint_type: string
          created_at?: string
          customer_name: string
          description: string
          dispatch_id?: string | null
          id?: string
          logged_by: string
          organization_id: string
          priority?: string
          rating?: number | null
          resolution_note?: string | null
          resolved_at?: string | null
          sla_breached?: boolean
          sla_due_at?: string | null
          sla_hours?: number
          status?: string
          updated_at?: string
        }
        Update: {
          complaint_date?: string
          complaint_type?: string
          created_at?: string
          customer_name?: string
          description?: string
          dispatch_id?: string | null
          id?: string
          logged_by?: string
          organization_id?: string
          priority?: string
          rating?: number | null
          resolution_note?: string | null
          resolved_at?: string | null
          sla_breached?: boolean
          sla_due_at?: string | null
          sla_hours?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ld_complaints_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ld_complaints_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ld_complaints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ld_dqi_records: {
        Row: {
          created_at: string
          damage_description: string | null
          damage_type: string
          damaged_volume_kg: number
          dispatch_id: string
          dqi_ppm: number | null
          id: string
          logged_by: string
          occurred_at: string
          organization_id: string
          record_date: string
          total_volume_kg: number
        }
        Insert: {
          created_at?: string
          damage_description?: string | null
          damage_type?: string
          damaged_volume_kg?: number
          dispatch_id: string
          dqi_ppm?: number | null
          id?: string
          logged_by: string
          occurred_at?: string
          organization_id: string
          record_date?: string
          total_volume_kg?: number
        }
        Update: {
          created_at?: string
          damage_description?: string | null
          damage_type?: string
          damaged_volume_kg?: number
          dispatch_id?: string
          dqi_ppm?: number | null
          id?: string
          logged_by?: string
          occurred_at?: string
          organization_id?: string
          record_date?: string
          total_volume_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "ld_dqi_records_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ld_dqi_records_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ld_dqi_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ld_peak_periods: {
        Row: {
          capacity_plan: string | null
          created_at: string
          end_date: string
          expected_volume_multiplier: number
          id: string
          logged_by: string
          notes: string | null
          organization_id: string
          period_name: string
          start_date: string
          status: string
        }
        Insert: {
          capacity_plan?: string | null
          created_at?: string
          end_date: string
          expected_volume_multiplier?: number
          id?: string
          logged_by: string
          notes?: string | null
          organization_id: string
          period_name: string
          start_date: string
          status?: string
        }
        Update: {
          capacity_plan?: string | null
          created_at?: string
          end_date?: string
          expected_volume_multiplier?: number
          id?: string
          logged_by?: string
          notes?: string | null
          organization_id?: string
          period_name?: string
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ld_peak_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ld_refusals: {
        Row: {
          created_at: string
          dispatch_id: string
          id: string
          logged_by: string
          modulated: boolean
          modulation_action: string | null
          notes: string | null
          organization_id: string
          reason_bucket: string
          refusal_date: string
          sku_description: string | null
          volume_refused_kg: number | null
        }
        Insert: {
          created_at?: string
          dispatch_id: string
          id?: string
          logged_by: string
          modulated?: boolean
          modulation_action?: string | null
          notes?: string | null
          organization_id: string
          reason_bucket: string
          refusal_date?: string
          sku_description?: string | null
          volume_refused_kg?: number | null
        }
        Update: {
          created_at?: string
          dispatch_id?: string
          id?: string
          logged_by?: string
          modulated?: boolean
          modulation_action?: string | null
          notes?: string | null
          organization_id?: string
          reason_bucket?: string
          refusal_date?: string
          sku_description?: string | null
          volume_refused_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ld_refusals_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ld_refusals_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ld_refusals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ld_risk_register: {
        Row: {
          created_at: string
          id: string
          impact: number
          likelihood: number
          logged_by: string
          mitigation_plan: string | null
          organization_id: string
          owner: string | null
          review_date: string | null
          risk_category: string
          risk_description: string | null
          risk_level: string | null
          risk_score: number | null
          risk_title: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          impact?: number
          likelihood?: number
          logged_by: string
          mitigation_plan?: string | null
          organization_id: string
          owner?: string | null
          review_date?: string | null
          risk_category: string
          risk_description?: string | null
          risk_level?: string | null
          risk_score?: number | null
          risk_title: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          impact?: number
          likelihood?: number
          logged_by?: string
          mitigation_plan?: string | null
          organization_id?: string
          owner?: string | null
          review_date?: string | null
          risk_category?: string
          risk_description?: string | null
          risk_level?: string | null
          risk_score?: number | null
          risk_title?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ld_risk_register_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ld_sop_meetings: {
        Row: {
          action_items: Json | null
          attendees: string[] | null
          created_at: string
          id: string
          kpis_reviewed: string[] | null
          logged_by: string
          meeting_date: string
          meeting_type: string
          next_meeting_date: string | null
          notes: string | null
          organization_id: string
          red_kpis: string[] | null
        }
        Insert: {
          action_items?: Json | null
          attendees?: string[] | null
          created_at?: string
          id?: string
          kpis_reviewed?: string[] | null
          logged_by: string
          meeting_date?: string
          meeting_type?: string
          next_meeting_date?: string | null
          notes?: string | null
          organization_id: string
          red_kpis?: string[] | null
        }
        Update: {
          action_items?: Json | null
          attendees?: string[] | null
          created_at?: string
          id?: string
          kpis_reviewed?: string[] | null
          logged_by?: string
          meeting_date?: string
          meeting_type?: string
          next_meeting_date?: string | null
          notes?: string | null
          organization_id?: string
          red_kpis?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ld_sop_meetings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ld_transporter_jobs: {
        Row: {
          accepted_at: string | null
          agreed_rate: number | null
          assigned_at: string
          created_at: string
          current_location: string | null
          delivered_at: string | null
          dispatch_id: string
          dispute_reason: string | null
          id: string
          location_updated_at: string | null
          organization_id: string
          pickup_confirmed_at: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pod_notes: string | null
          pod_photo_url: string | null
          pod_uploaded_at: string | null
          status: string
          transporter_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          agreed_rate?: number | null
          assigned_at?: string
          created_at?: string
          current_location?: string | null
          delivered_at?: string | null
          dispatch_id: string
          dispute_reason?: string | null
          id?: string
          location_updated_at?: string | null
          organization_id: string
          pickup_confirmed_at?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pod_notes?: string | null
          pod_photo_url?: string | null
          pod_uploaded_at?: string | null
          status?: string
          transporter_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          agreed_rate?: number | null
          assigned_at?: string
          created_at?: string
          current_location?: string | null
          delivered_at?: string | null
          dispatch_id?: string
          dispute_reason?: string | null
          id?: string
          location_updated_at?: string | null
          organization_id?: string
          pickup_confirmed_at?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pod_notes?: string | null
          pod_photo_url?: string | null
          pod_uploaded_at?: string | null
          status?: string
          transporter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ld_transporter_jobs_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ld_transporter_jobs_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ld_transporter_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ld_transporter_jobs_transporter_id_fkey"
            columns: ["transporter_id"]
            isOneToOne: false
            referencedRelation: "ld_transporters"
            referencedColumns: ["id"]
          },
        ]
      }
      ld_transporters: {
        Row: {
          added_by: string | null
          approved_at: string | null
          approved_by: string | null
          cac_document_url: string | null
          cac_number: string | null
          company_name: string
          contact_email: string | null
          contact_name: string
          coverage_areas: string | null
          created_at: string
          email: string | null
          id: string
          insurance_document_url: string | null
          letter_of_intent_url: string | null
          mou_document_url: string | null
          notes: string | null
          onboarding_status: string
          organization_id: string
          partner_id: string | null
          phone: string
          rates_proposal_url: string | null
          rejection_reason: string | null
          self_registered: boolean
          truck_photos_urls: string[] | null
          updated_at: string
          user_id: string | null
          vehicle_count: number | null
          vehicle_types: string[] | null
        }
        Insert: {
          added_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          cac_document_url?: string | null
          cac_number?: string | null
          company_name: string
          contact_email?: string | null
          contact_name: string
          coverage_areas?: string | null
          created_at?: string
          email?: string | null
          id?: string
          insurance_document_url?: string | null
          letter_of_intent_url?: string | null
          mou_document_url?: string | null
          notes?: string | null
          onboarding_status?: string
          organization_id: string
          partner_id?: string | null
          phone: string
          rates_proposal_url?: string | null
          rejection_reason?: string | null
          self_registered?: boolean
          truck_photos_urls?: string[] | null
          updated_at?: string
          user_id?: string | null
          vehicle_count?: number | null
          vehicle_types?: string[] | null
        }
        Update: {
          added_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          cac_document_url?: string | null
          cac_number?: string | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string
          coverage_areas?: string | null
          created_at?: string
          email?: string | null
          id?: string
          insurance_document_url?: string | null
          letter_of_intent_url?: string | null
          mou_document_url?: string | null
          notes?: string | null
          onboarding_status?: string
          organization_id?: string
          partner_id?: string | null
          phone?: string
          rates_proposal_url?: string | null
          rejection_reason?: string | null
          self_registered?: boolean
          truck_photos_urls?: string[] | null
          updated_at?: string
          user_id?: string | null
          vehicle_count?: number | null
          vehicle_types?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ld_transporters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ld_transporters_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          leave_request_id: string | null
          new_state: Json | null
          old_state: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          leave_request_id?: string | null
          new_state?: Json | null
          old_state?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          leave_request_id?: string | null
          new_state?: Json | null
          old_state?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_audit_log_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          allocated_days: number
          created_at: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          organization_id: string | null
          pending_days: number
          updated_at: string
          used_days: number
          user_id: string
          year: number
        }
        Insert: {
          allocated_days?: number
          created_at?: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          organization_id?: string | null
          pending_days?: number
          updated_at?: string
          used_days?: number
          user_id: string
          year?: number
        }
        Update: {
          allocated_days?: number
          created_at?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          organization_id?: string | null
          pending_days?: number
          updated_at?: string
          used_days?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_policies: {
        Row: {
          allow_admin_override: boolean
          annual_pay_rate: number
          auto_approve_low_impact: boolean
          created_at: string
          default_annual_days: number
          default_emergency_days: number
          default_sick_days: number
          emergency_pay_rate: number
          id: string
          organization_id: string | null
          sick_pay_rate: number
          updated_at: string
        }
        Insert: {
          allow_admin_override?: boolean
          annual_pay_rate?: number
          auto_approve_low_impact?: boolean
          created_at?: string
          default_annual_days?: number
          default_emergency_days?: number
          default_sick_days?: number
          emergency_pay_rate?: number
          id?: string
          organization_id?: string | null
          sick_pay_rate?: number
          updated_at?: string
        }
        Update: {
          allow_admin_override?: boolean
          annual_pay_rate?: number
          auto_approve_low_impact?: boolean
          created_at?: string
          default_annual_days?: number
          default_emergency_days?: number
          default_sick_days?: number
          emergency_pay_rate?: number
          id?: string
          organization_id?: string | null
          sick_pay_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_reassignment_suggestions: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          leave_request_id: string
          resource_id: string
          resource_label: string | null
          resource_type: string
          status: string
          suggested_assignee_id: string | null
          suggested_assignee_label: string | null
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          leave_request_id: string
          resource_id: string
          resource_label?: string | null
          resource_type: string
          status?: string
          suggested_assignee_id?: string | null
          suggested_assignee_label?: string | null
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          leave_request_id?: string
          resource_id?: string
          resource_label?: string | null
          resource_type?: string
          status?: string
          suggested_assignee_id?: string | null
          suggested_assignee_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_reassignment_suggestions_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          active_dispatches_count: number | null
          admin_override: boolean
          created_at: string
          end_date: string
          id: string
          impact_details: Json | null
          impact_level: Database["public"]["Enums"]["leave_impact_level"] | null
          leave_type: Database["public"]["Enums"]["leave_type"]
          open_tickets_count: number | null
          organization_id: string | null
          override_reason: string | null
          reason: string
          reassignment_confirmed: boolean
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          total_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active_dispatches_count?: number | null
          admin_override?: boolean
          created_at?: string
          end_date: string
          id?: string
          impact_details?: Json | null
          impact_level?:
            | Database["public"]["Enums"]["leave_impact_level"]
            | null
          leave_type: Database["public"]["Enums"]["leave_type"]
          open_tickets_count?: number | null
          organization_id?: string | null
          override_reason?: string | null
          reason: string
          reassignment_confirmed?: boolean
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          total_days: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active_dispatches_count?: number | null
          admin_override?: boolean
          created_at?: string
          end_date?: string
          id?: string
          impact_details?: Json | null
          impact_level?:
            | Database["public"]["Enums"]["leave_impact_level"]
            | null
          leave_type?: Database["public"]["Enums"]["leave_type"]
          open_tickets_count?: number | null
          organization_id?: string | null
          override_reason?: string | null
          reason?: string
          reassignment_confirmed?: boolean
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          total_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_entities: {
        Row: {
          base_currency: string
          consolidation_method: string | null
          country: string
          created_at: string
          entity_name: string
          functional_currency: string
          id: string
          is_active: boolean | null
          ownership_percentage: number | null
          parent_entity_id: string | null
          reporting_standard: string | null
          updated_at: string
        }
        Insert: {
          base_currency?: string
          consolidation_method?: string | null
          country?: string
          created_at?: string
          entity_name: string
          functional_currency?: string
          id?: string
          is_active?: boolean | null
          ownership_percentage?: number | null
          parent_entity_id?: string | null
          reporting_standard?: string | null
          updated_at?: string
        }
        Update: {
          base_currency?: string
          consolidation_method?: string | null
          country?: string
          created_at?: string
          entity_name?: string
          functional_currency?: string
          id?: string
          is_active?: boolean | null
          ownership_percentage?: number | null
          parent_entity_id?: string | null
          reporting_standard?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_entities_parent_entity_id_fkey"
            columns: ["parent_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      liquor_age_rules: {
        Row: {
          country_code: string
          created_at: string
          id: string
          is_active: boolean | null
          minimum_age: number
          state_code: string | null
        }
        Insert: {
          country_code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          minimum_age?: number
          state_code?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          minimum_age?: number
          state_code?: string | null
        }
        Relationships: []
      }
      liquor_age_verification_log: {
        Row: {
          age_at_sale: number | null
          consent_captured: boolean
          created_at: string
          dob_extracted: string | null
          id: string
          id_photo_url: string | null
          is_blocked: boolean
          is_verified: boolean
          order_id: string | null
          outlet_id: string | null
          verified_by: string | null
        }
        Insert: {
          age_at_sale?: number | null
          consent_captured?: boolean
          created_at?: string
          dob_extracted?: string | null
          id?: string
          id_photo_url?: string | null
          is_blocked?: boolean
          is_verified?: boolean
          order_id?: string | null
          outlet_id?: string | null
          verified_by?: string | null
        }
        Update: {
          age_at_sale?: number | null
          consent_captured?: boolean
          created_at?: string
          dob_extracted?: string | null
          id?: string
          id_photo_url?: string | null
          is_blocked?: boolean
          is_verified?: boolean
          order_id?: string | null
          outlet_id?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      liquor_age_verifications: {
        Row: {
          calculated_age: number | null
          capture_method: string | null
          cashier_user_id: string | null
          country_code: string
          created_at: string
          customer_name: string
          date_of_birth: string
          id: string
          id_image_url: string | null
          id_number: string
          id_type: string
          minimum_age: number
          organization_id: string | null
          retailer_id: string | null
          sale_blocked: boolean | null
          verification_status: string
        }
        Insert: {
          calculated_age?: number | null
          capture_method?: string | null
          cashier_user_id?: string | null
          country_code?: string
          created_at?: string
          customer_name: string
          date_of_birth: string
          id?: string
          id_image_url?: string | null
          id_number: string
          id_type: string
          minimum_age?: number
          organization_id?: string | null
          retailer_id?: string | null
          sale_blocked?: boolean | null
          verification_status?: string
        }
        Update: {
          calculated_age?: number | null
          capture_method?: string | null
          cashier_user_id?: string | null
          country_code?: string
          created_at?: string
          customer_name?: string
          date_of_birth?: string
          id?: string
          id_image_url?: string | null
          id_number?: string
          id_type?: string
          minimum_age?: number
          organization_id?: string | null
          retailer_id?: string | null
          sale_blocked?: boolean | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "liquor_age_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquor_age_verifications_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      liquor_compliance_audit: {
        Row: {
          age_verification_id: string | null
          cashier_user_id: string | null
          country_code: string | null
          created_at: string
          failure_reason: string | null
          id: string
          license_verification_id: string | null
          order_reference: string | null
          organization_id: string | null
          region: string | null
          retailer_id: string | null
          verification_result: string
        }
        Insert: {
          age_verification_id?: string | null
          cashier_user_id?: string | null
          country_code?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          license_verification_id?: string | null
          order_reference?: string | null
          organization_id?: string | null
          region?: string | null
          retailer_id?: string | null
          verification_result: string
        }
        Update: {
          age_verification_id?: string | null
          cashier_user_id?: string | null
          country_code?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          license_verification_id?: string | null
          order_reference?: string | null
          organization_id?: string | null
          region?: string | null
          retailer_id?: string | null
          verification_result?: string
        }
        Relationships: [
          {
            foreignKeyName: "liquor_compliance_audit_age_verification_id_fkey"
            columns: ["age_verification_id"]
            isOneToOne: false
            referencedRelation: "liquor_age_verifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquor_compliance_audit_license_verification_id_fkey"
            columns: ["license_verification_id"]
            isOneToOne: false
            referencedRelation: "liquor_license_verifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquor_compliance_audit_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquor_compliance_audit_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      liquor_license_verifications: {
        Row: {
          auto_blocked: boolean | null
          created_at: string
          expiry_date: string | null
          id: string
          issued_date: string | null
          license_document_url: string | null
          license_number: string | null
          license_type: string
          organization_id: string | null
          retailer_id: string | null
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          auto_blocked?: boolean | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          license_document_url?: string | null
          license_number?: string | null
          license_type: string
          organization_id?: string | null
          retailer_id?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          auto_blocked?: boolean | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          license_document_url?: string | null
          license_number?: string | null
          license_type?: string
          organization_id?: string | null
          retailer_id?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liquor_license_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquor_license_verifications_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      liquor_team_members: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean | null
          liquor_role: string
          organization_id: string | null
          territory: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          liquor_role?: string
          organization_id?: string | null
          territory?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          liquor_role?: string
          organization_id?: string | null
          territory?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      loan_lenders: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          lender_type: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          lender_type?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          lender_type?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_lenders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          annual_interest_rate: number
          created_at: string
          created_by: string | null
          id: string
          lender_id: string
          organization_id: string
          principal_amount: number
          start_date: string
          status: string
          tenure_months: number
          updated_at: string
          wht_rate: number
        }
        Insert: {
          annual_interest_rate?: number
          created_at?: string
          created_by?: string | null
          id?: string
          lender_id: string
          organization_id: string
          principal_amount: number
          start_date: string
          status?: string
          tenure_months: number
          updated_at?: string
          wht_rate?: number
        }
        Update: {
          annual_interest_rate?: number
          created_at?: string
          created_by?: string | null
          id?: string
          lender_id?: string
          organization_id?: string
          principal_amount?: number
          start_date?: string
          status?: string
          tenure_months?: number
          updated_at?: string
          wht_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "loans_lender_id_fkey"
            columns: ["lender_id"]
            isOneToOne: false
            referencedRelation: "loan_lenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_alert_config: {
        Row: {
          alert_type: string
          created_at: string
          days_threshold: number | null
          id: string
          is_active: boolean | null
          mileage_threshold: number | null
          updated_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          days_threshold?: number | null
          id?: string
          is_active?: boolean | null
          mileage_threshold?: number | null
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          days_threshold?: number | null
          id?: string
          is_active?: boolean | null
          mileage_threshold?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_cost_analysis: {
        Row: {
          ai_recommendation: string | null
          created_at: string | null
          downtime_cost: number | null
          downtime_hours: number | null
          id: string
          organization_id: string | null
          period_end: string
          period_start: string
          preventive_spend: number | null
          projected_savings: number | null
          reactive_spend: number | null
          recommended_action: string | null
          roi_score: number | null
          vehicle_id: string | null
        }
        Insert: {
          ai_recommendation?: string | null
          created_at?: string | null
          downtime_cost?: number | null
          downtime_hours?: number | null
          id?: string
          organization_id?: string | null
          period_end: string
          period_start: string
          preventive_spend?: number | null
          projected_savings?: number | null
          reactive_spend?: number | null
          recommended_action?: string | null
          roi_score?: number | null
          vehicle_id?: string | null
        }
        Update: {
          ai_recommendation?: string | null
          created_at?: string | null
          downtime_cost?: number | null
          downtime_hours?: number | null
          id?: string
          organization_id?: string | null
          period_end?: string
          period_start?: string
          preventive_spend?: number | null
          projected_savings?: number | null
          reactive_spend?: number | null
          recommended_action?: string | null
          roi_score?: number | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_cost_analysis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_decisions: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          confidence_score: number
          created_at: string
          decision_type: string
          executed_at: string | null
          id: string
          metadata: Json
          reasoning: string | null
          recommended_action: string | null
          rejected_reason: string | null
          related_inspection_id: string | null
          related_prediction_id: string | null
          related_work_order_id: string | null
          triggered_by: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          confidence_score?: number
          created_at?: string
          decision_type: string
          executed_at?: string | null
          id?: string
          metadata?: Json
          reasoning?: string | null
          recommended_action?: string | null
          rejected_reason?: string | null
          related_inspection_id?: string | null
          related_prediction_id?: string | null
          related_work_order_id?: string | null
          triggered_by?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          confidence_score?: number
          created_at?: string
          decision_type?: string
          executed_at?: string | null
          id?: string
          metadata?: Json
          reasoning?: string | null
          recommended_action?: string | null
          rejected_reason?: string | null
          related_inspection_id?: string | null
          related_prediction_id?: string | null
          related_work_order_id?: string | null
          triggered_by?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      maintenance_predictions: {
        Row: {
          auto_blocked: boolean | null
          component: string
          confidence_score: number | null
          created_at: string
          failure_probability: number
          id: string
          predicted_failure_date: string | null
          recommended_action: string | null
          resolved_at: string | null
          resolved_by: string | null
          risk_factors: Json | null
          updated_at: string
          urgency: string
          vehicle_id: string
        }
        Insert: {
          auto_blocked?: boolean | null
          component: string
          confidence_score?: number | null
          created_at?: string
          failure_probability: number
          id?: string
          predicted_failure_date?: string | null
          recommended_action?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_factors?: Json | null
          updated_at?: string
          urgency?: string
          vehicle_id: string
        }
        Update: {
          auto_blocked?: boolean | null
          component?: string
          confidence_score?: number | null
          created_at?: string
          failure_probability?: number
          id?: string
          predicted_failure_date?: string | null
          recommended_action?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_factors?: Json | null
          updated_at?: string
          urgency?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_predictions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedules: {
        Row: {
          actual_cost: number | null
          blocks_dispatch: boolean | null
          completed_at: string | null
          component_type: string | null
          created_at: string | null
          created_by: string | null
          estimated_cost: number | null
          id: string
          notes: string | null
          prediction_id: string | null
          priority: string | null
          schedule_status: string | null
          scheduled_date: string
          service_type: string
          updated_at: string | null
          vehicle_id: string
          vendor_id: string | null
        }
        Insert: {
          actual_cost?: number | null
          blocks_dispatch?: boolean | null
          completed_at?: string | null
          component_type?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          prediction_id?: string | null
          priority?: string | null
          schedule_status?: string | null
          scheduled_date: string
          service_type: string
          updated_at?: string | null
          vehicle_id: string
          vendor_id?: string | null
        }
        Update: {
          actual_cost?: number | null
          blocks_dispatch?: boolean | null
          completed_at?: string | null
          component_type?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          prediction_id?: string | null
          priority?: string | null
          schedule_status?: string | null
          scheduled_date?: string
          service_type?: string
          updated_at?: string | null
          vehicle_id?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      margin_protection_rules: {
        Row: {
          action_on_breach: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          min_margin_percent: number | null
          rule_name: string
        }
        Insert: {
          action_on_breach?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_margin_percent?: number | null
          rule_name: string
        }
        Update: {
          action_on_breach?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_margin_percent?: number | null
          rule_name?: string
        }
        Relationships: []
      }
      mfa_requirements: {
        Row: {
          created_at: string | null
          hardware_token_id: string | null
          id: string
          last_verified_at: string | null
          mfa_enabled: boolean | null
          mfa_method: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hardware_token_id?: string | null
          id?: string
          last_verified_at?: string | null
          mfa_enabled?: boolean | null
          mfa_method?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          hardware_token_id?: string | null
          id?: string
          last_verified_at?: string | null
          mfa_enabled?: boolean | null
          mfa_method?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      monopoly_strategies: {
        Row: {
          approved_by: string | null
          competitor_displacement: Json | null
          created_at: string | null
          dominance_score: number | null
          id: string
          lock_in_strategies: Json | null
          market_players_count: number | null
          market_region: string
          network_expansion: Json | null
          priority_targets: Json | null
          status: string | null
          total_market_value: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          competitor_displacement?: Json | null
          created_at?: string | null
          dominance_score?: number | null
          id?: string
          lock_in_strategies?: Json | null
          market_players_count?: number | null
          market_region: string
          network_expansion?: Json | null
          priority_targets?: Json | null
          status?: string | null
          total_market_value?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_by?: string | null
          competitor_displacement?: Json | null
          created_at?: string | null
          dominance_score?: number | null
          id?: string
          lock_in_strategies?: Json | null
          market_players_count?: number | null
          market_region?: string
          network_expansion?: Json | null
          priority_targets?: Json | null
          status?: string | null
          total_market_value?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      onboarding_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          step_id: string
          step_name: string
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          step_id: string
          step_name: string
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          step_id?: string
          step_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      operational_kpi_snapshots: {
        Row: {
          active_clients: number | null
          avg_cost_per_km: number | null
          created_at: string | null
          id: string
          mom_growth_pct: number | null
          on_time_deliveries: number | null
          otd_rate: number | null
          period_type: string
          previous_period_revenue: number | null
          revenue: number | null
          snapshot_date: string
          total_deliveries: number | null
          total_dispatches: number | null
        }
        Insert: {
          active_clients?: number | null
          avg_cost_per_km?: number | null
          created_at?: string | null
          id?: string
          mom_growth_pct?: number | null
          on_time_deliveries?: number | null
          otd_rate?: number | null
          period_type?: string
          previous_period_revenue?: number | null
          revenue?: number | null
          snapshot_date?: string
          total_deliveries?: number | null
          total_dispatches?: number | null
        }
        Update: {
          active_clients?: number | null
          avg_cost_per_km?: number | null
          created_at?: string | null
          id?: string
          mom_growth_pct?: number | null
          on_time_deliveries?: number | null
          otd_rate?: number | null
          period_type?: string
          previous_period_revenue?: number | null
          revenue?: number | null
          snapshot_date?: string
          total_deliveries?: number | null
          total_dispatches?: number | null
        }
        Relationships: []
      }
      ops_sops: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          status: string
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
          version?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      order_delivery_tracking: {
        Row: {
          created_at: string | null
          customer_id: string | null
          delivered_at: string | null
          delivery_slot: string | null
          dispatched_at: string | null
          driver_name: string | null
          epod_method: string | null
          epod_verified: boolean | null
          id: string
          in_transit_at: string | null
          loaded_at: string | null
          notes: string | null
          order_received_at: string | null
          order_reference: string
          outlet_name: string | null
          picking_completed_at: string | null
          picking_started_at: string | null
          picklist_created_at: string | null
          pod_captured_at: string | null
          stage: string
          staging_completed_at: string | null
          total_items: number | null
          total_value: number | null
          updated_at: string | null
          vehicle_plate: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          delivery_slot?: string | null
          dispatched_at?: string | null
          driver_name?: string | null
          epod_method?: string | null
          epod_verified?: boolean | null
          id?: string
          in_transit_at?: string | null
          loaded_at?: string | null
          notes?: string | null
          order_received_at?: string | null
          order_reference: string
          outlet_name?: string | null
          picking_completed_at?: string | null
          picking_started_at?: string | null
          picklist_created_at?: string | null
          pod_captured_at?: string | null
          stage?: string
          staging_completed_at?: string | null
          total_items?: number | null
          total_value?: number | null
          updated_at?: string | null
          vehicle_plate?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          delivery_slot?: string | null
          dispatched_at?: string | null
          driver_name?: string | null
          epod_method?: string | null
          epod_verified?: boolean | null
          id?: string
          in_transit_at?: string | null
          loaded_at?: string | null
          notes?: string | null
          order_received_at?: string | null
          order_reference?: string
          outlet_name?: string | null
          picking_completed_at?: string | null
          picking_started_at?: string | null
          picklist_created_at?: string | null
          pod_captured_at?: string | null
          stage?: string
          staging_completed_at?: string | null
          total_items?: number | null
          total_value?: number | null
          updated_at?: string | null
          vehicle_plate?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_delivery_tracking_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      order_inbox: {
        Row: {
          converted_customer_id: string | null
          converted_dispatch_id: string | null
          created_at: string
          id: string
          parsed_cargo_description: string | null
          parsed_contact_email: string | null
          parsed_contact_phone: string | null
          parsed_customer_name: string | null
          parsed_delivery_address: string | null
          parsed_pickup_address: string | null
          processed_at: string | null
          processed_by: string | null
          raw_data: Json
          received_at: string
          rejection_reason: string | null
          source_channel: string | null
          source_id: string | null
          source_type: string
          status: string
        }
        Insert: {
          converted_customer_id?: string | null
          converted_dispatch_id?: string | null
          created_at?: string
          id?: string
          parsed_cargo_description?: string | null
          parsed_contact_email?: string | null
          parsed_contact_phone?: string | null
          parsed_customer_name?: string | null
          parsed_delivery_address?: string | null
          parsed_pickup_address?: string | null
          processed_at?: string | null
          processed_by?: string | null
          raw_data: Json
          received_at?: string
          rejection_reason?: string | null
          source_channel?: string | null
          source_id?: string | null
          source_type: string
          status?: string
        }
        Update: {
          converted_customer_id?: string | null
          converted_dispatch_id?: string | null
          created_at?: string
          id?: string
          parsed_cargo_description?: string | null
          parsed_contact_email?: string | null
          parsed_contact_phone?: string | null
          parsed_customer_name?: string | null
          parsed_delivery_address?: string | null
          parsed_pickup_address?: string | null
          processed_at?: string | null
          processed_by?: string | null
          raw_data?: Json
          received_at?: string
          rejection_reason?: string | null
          source_channel?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_inbox_converted_customer_id_fkey"
            columns: ["converted_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_inbox_converted_dispatch_id_fkey"
            columns: ["converted_dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_inbox_converted_dispatch_id_fkey"
            columns: ["converted_dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_inbox_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "external_order_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          dispatch_id: string | null
          height_cm: number | null
          id: string
          item_name: string
          length_cm: number | null
          order_id: string | null
          quantity: number | null
          special_handling: string | null
          volume_cbm: number | null
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          created_at?: string | null
          dispatch_id?: string | null
          height_cm?: number | null
          id?: string
          item_name: string
          length_cm?: number | null
          order_id?: string | null
          quantity?: number | null
          special_handling?: string | null
          volume_cbm?: number | null
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          created_at?: string | null
          dispatch_id?: string | null
          height_cm?: number | null
          id?: string
          item_name?: string
          length_cm?: number | null
          order_id?: string | null
          quantity?: number | null
          special_handling?: string | null
          volume_cbm?: number | null
          weight_kg?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_inbox"
            referencedColumns: ["id"]
          },
        ]
      }
      order_source_analytics: {
        Row: {
          avg_processing_time_minutes: number | null
          conversion_rate: number | null
          created_at: string
          id: string
          orders_converted: number | null
          orders_received: number | null
          orders_rejected: number | null
          period_date: string
          source_id: string | null
          source_type: string
        }
        Insert: {
          avg_processing_time_minutes?: number | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          orders_converted?: number | null
          orders_received?: number | null
          orders_rejected?: number | null
          period_date: string
          source_id?: string | null
          source_type: string
        }
        Update: {
          avg_processing_time_minutes?: number | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          orders_converted?: number | null
          orders_received?: number | null
          orders_rejected?: number | null
          period_date?: string
          source_id?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_source_analytics_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "external_order_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      org_pricing_settings: {
        Row: {
          created_at: string
          default_driver_allowance: number
          default_levies: number
          default_maintenance: number
          default_vehicle: string
          diesel_rate: number
          id: string
          max_multiplier: number
          min_multiplier: number
          organization_id: string
          petrol_rate: number
          target_margin_pct: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          default_driver_allowance?: number
          default_levies?: number
          default_maintenance?: number
          default_vehicle?: string
          diesel_rate?: number
          id?: string
          max_multiplier?: number
          min_multiplier?: number
          organization_id: string
          petrol_rate?: number
          target_margin_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          default_driver_allowance?: number
          default_levies?: number
          default_maintenance?: number
          default_vehicle?: string
          diesel_rate?: number
          id?: string
          max_multiplier?: number
          min_multiplier?: number
          organization_id?: string
          petrol_rate?: number
          target_margin_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_pricing_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          is_owner: boolean
          joined_at: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          suspended_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          is_owner?: boolean
          joined_at?: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          suspended_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          is_owner?: boolean
          joined_at?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          suspended_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          last_payment_at: string | null
          monthly_amount: number | null
          next_billing_at: string | null
          partner_id: string | null
          payment_method: string | null
          started_at: string | null
          status: string | null
          tier_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_payment_at?: string | null
          monthly_amount?: number | null
          next_billing_at?: string | null
          partner_id?: string | null
          payment_method?: string | null
          started_at?: string | null
          status?: string | null
          tier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_payment_at?: string | null
          monthly_amount?: number | null
          next_billing_at?: string | null
          partner_id?: string | null
          payment_method?: string | null
          started_at?: string | null
          status?: string | null
          tier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "partner_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          business_type: string | null
          country: string | null
          country_code: string
          created_at: string
          currency: string | null
          custom_branding: Json | null
          dept_erp_system: string | null
          dept_industry: string | null
          dept_plan: string | null
          dept_team_size: number | null
          fleet_size: string | null
          id: string
          industry: string | null
          is_active: boolean
          max_reseller_licenses: number | null
          name: string
          owner_user_id: string
          paystack_customer_code: string | null
          reseller_lock_until: string | null
          reseller_org_id: string | null
          reseller_price: number | null
          slug: string | null
          subscription_expires_at: string | null
          subscription_status: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          tenant_mode: string
          updated_at: string
          vehicle_quota: number
          white_label_enabled: boolean
        }
        Insert: {
          business_type?: string | null
          country?: string | null
          country_code?: string
          created_at?: string
          currency?: string | null
          custom_branding?: Json | null
          dept_erp_system?: string | null
          dept_industry?: string | null
          dept_plan?: string | null
          dept_team_size?: number | null
          fleet_size?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          max_reseller_licenses?: number | null
          name: string
          owner_user_id: string
          paystack_customer_code?: string | null
          reseller_lock_until?: string | null
          reseller_org_id?: string | null
          reseller_price?: number | null
          slug?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          tenant_mode?: string
          updated_at?: string
          vehicle_quota?: number
          white_label_enabled?: boolean
        }
        Update: {
          business_type?: string | null
          country?: string | null
          country_code?: string
          created_at?: string
          currency?: string | null
          custom_branding?: Json | null
          dept_erp_system?: string | null
          dept_industry?: string | null
          dept_plan?: string | null
          dept_team_size?: number | null
          fleet_size?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          max_reseller_licenses?: number | null
          name?: string
          owner_user_id?: string
          paystack_customer_code?: string | null
          reseller_lock_until?: string | null
          reseller_org_id?: string | null
          reseller_price?: number | null
          slug?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          tenant_mode?: string
          updated_at?: string
          vehicle_quota?: number
          white_label_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "organizations_reseller_org_id_fkey"
            columns: ["reseller_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_requests: {
        Row: {
          converted_at: string | null
          created_at: string
          created_by: string
          customer_id_external: string | null
          customer_name: string | null
          destination_address: string
          goods_description: string | null
          id: string
          internal_stakeholder: string | null
          linked_dispatch_id: string | null
          notes: string | null
          organization_id: string | null
          origin_address: string
          picklist_number: string | null
          pod_confirmed_at: string | null
          pod_confirmed_by: string | null
          pod_status: string
          pod_uploaded_at: string | null
          pod_uploaded_by: string | null
          pod_uploaded_url: string | null
          priority: string
          request_direction: string
          request_number: string
          requested_date: string
          sku: string | null
          source: string
          status: string
          total_volume_m3: number | null
          total_weight_kg: number | null
          transporter_id: string | null
          transporter_notified_at: string | null
          updated_at: string
          warehouse_id: string | null
          warehouse_name: string
          waybill_number: string | null
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          created_by: string
          customer_id_external?: string | null
          customer_name?: string | null
          destination_address: string
          goods_description?: string | null
          id?: string
          internal_stakeholder?: string | null
          linked_dispatch_id?: string | null
          notes?: string | null
          organization_id?: string | null
          origin_address: string
          picklist_number?: string | null
          pod_confirmed_at?: string | null
          pod_confirmed_by?: string | null
          pod_status?: string
          pod_uploaded_at?: string | null
          pod_uploaded_by?: string | null
          pod_uploaded_url?: string | null
          priority?: string
          request_direction?: string
          request_number?: string
          requested_date: string
          sku?: string | null
          source?: string
          status?: string
          total_volume_m3?: number | null
          total_weight_kg?: number | null
          transporter_id?: string | null
          transporter_notified_at?: string | null
          updated_at?: string
          warehouse_id?: string | null
          warehouse_name: string
          waybill_number?: string | null
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          created_by?: string
          customer_id_external?: string | null
          customer_name?: string | null
          destination_address?: string
          goods_description?: string | null
          id?: string
          internal_stakeholder?: string | null
          linked_dispatch_id?: string | null
          notes?: string | null
          organization_id?: string | null
          origin_address?: string
          picklist_number?: string | null
          pod_confirmed_at?: string | null
          pod_confirmed_by?: string | null
          pod_status?: string
          pod_uploaded_at?: string | null
          pod_uploaded_by?: string | null
          pod_uploaded_url?: string | null
          priority?: string
          request_direction?: string
          request_number?: string
          requested_date?: string
          sku?: string | null
          source?: string
          status?: string
          total_volume_m3?: number | null
          total_weight_kg?: number | null
          transporter_id?: string | null
          transporter_notified_at?: string | null
          updated_at?: string
          warehouse_id?: string | null
          warehouse_name?: string
          waybill_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_requests_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pan_african_settlement_ledger: {
        Row: {
          aml_score: number | null
          amount: number
          compliance_status: string | null
          corridor_id: string | null
          created_at: string
          created_by: string | null
          destination_currency: string
          destination_wallet: string
          fx_rate_locked: number | null
          id: string
          liquidity_source: string | null
          net_settlement_batch_id: string | null
          origin_currency: string
          origin_wallet: string
          reference_id: string | null
          reference_type: string | null
          risk_score: number | null
          sanctions_clear: boolean | null
          settlement_status: string
          updated_at: string
        }
        Insert: {
          aml_score?: number | null
          amount?: number
          compliance_status?: string | null
          corridor_id?: string | null
          created_at?: string
          created_by?: string | null
          destination_currency?: string
          destination_wallet: string
          fx_rate_locked?: number | null
          id?: string
          liquidity_source?: string | null
          net_settlement_batch_id?: string | null
          origin_currency?: string
          origin_wallet: string
          reference_id?: string | null
          reference_type?: string | null
          risk_score?: number | null
          sanctions_clear?: boolean | null
          settlement_status?: string
          updated_at?: string
        }
        Update: {
          aml_score?: number | null
          amount?: number
          compliance_status?: string | null
          corridor_id?: string | null
          created_at?: string
          created_by?: string | null
          destination_currency?: string
          destination_wallet?: string
          fx_rate_locked?: number | null
          id?: string
          liquidity_source?: string | null
          net_settlement_batch_id?: string | null
          origin_currency?: string
          origin_wallet?: string
          reference_id?: string | null
          reference_type?: string | null
          risk_score?: number | null
          sanctions_clear?: boolean | null
          settlement_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_accounts: {
        Row: {
          billing_model: string
          commission_rate: number | null
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          partner_type: string
          payout_balance: number | null
          total_downstream_tenants: number | null
          total_mrr: number | null
          updated_at: string | null
          user_id: string
          wholesale_discount_percent: number | null
        }
        Insert: {
          billing_model?: string
          commission_rate?: number | null
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          partner_type?: string
          payout_balance?: number | null
          total_downstream_tenants?: number | null
          total_mrr?: number | null
          updated_at?: string | null
          user_id: string
          wholesale_discount_percent?: number | null
        }
        Update: {
          billing_model?: string
          commission_rate?: number | null
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          partner_type?: string
          payout_balance?: number | null
          total_downstream_tenants?: number | null
          total_mrr?: number | null
          updated_at?: string | null
          user_id?: string
          wholesale_discount_percent?: number | null
        }
        Relationships: []
      }
      partner_commissions: {
        Row: {
          commission_amount: number | null
          commission_rate: number | null
          created_at: string | null
          customer_id: string | null
          gross_revenue: number | null
          id: string
          paid_at: string | null
          partner_id: string
          period_end: string
          period_start: string
          status: string | null
        }
        Insert: {
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          customer_id?: string | null
          gross_revenue?: number | null
          id?: string
          paid_at?: string | null
          partner_id: string
          period_end: string
          period_start: string
          status?: string | null
        }
        Update: {
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          customer_id?: string | null
          gross_revenue?: number | null
          id?: string
          paid_at?: string | null
          partner_id?: string
          period_end?: string
          period_start?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_commissions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "partner_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_customers: {
        Row: {
          activation_date: string | null
          ai_credits_used: number | null
          billing_ownership: string
          churn_risk_score: number | null
          company_name: string
          contact_email: string | null
          contact_name: string | null
          country: string | null
          created_at: string | null
          dispatches_this_month: number | null
          id: string
          monthly_bill: number | null
          operating_type: string
          partner_id: string
          plan_tier: string
          status: string
          tenant_user_id: string | null
          updated_at: string | null
          vehicles_count: number | null
        }
        Insert: {
          activation_date?: string | null
          ai_credits_used?: number | null
          billing_ownership?: string
          churn_risk_score?: number | null
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string | null
          dispatches_this_month?: number | null
          id?: string
          monthly_bill?: number | null
          operating_type?: string
          partner_id: string
          plan_tier?: string
          status?: string
          tenant_user_id?: string | null
          updated_at?: string | null
          vehicles_count?: number | null
        }
        Update: {
          activation_date?: string | null
          ai_credits_used?: number | null
          billing_ownership?: string
          churn_risk_score?: number | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string | null
          dispatches_this_month?: number | null
          id?: string
          monthly_bill?: number | null
          operating_type?: string
          partner_id?: string
          plan_tier?: string
          status?: string
          tenant_user_id?: string | null
          updated_at?: string | null
          vehicles_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_customers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invoices: {
        Row: {
          ai_credits_amount: number | null
          api_usage_amount: number | null
          created_at: string | null
          customer_id: string | null
          due_date: string | null
          dunning_attempts: number | null
          id: string
          invoice_number: string
          paid_at: string | null
          partner_id: string | null
          partner_share: number | null
          payment_method: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          platform_share: number | null
          status: string | null
          subscription_amount: number | null
          tax_amount: number | null
          total_amount: number | null
          usage_amount: number | null
        }
        Insert: {
          ai_credits_amount?: number | null
          api_usage_amount?: number | null
          created_at?: string | null
          customer_id?: string | null
          due_date?: string | null
          dunning_attempts?: number | null
          id?: string
          invoice_number: string
          paid_at?: string | null
          partner_id?: string | null
          partner_share?: number | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          platform_share?: number | null
          status?: string | null
          subscription_amount?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          usage_amount?: number | null
        }
        Update: {
          ai_credits_amount?: number | null
          api_usage_amount?: number | null
          created_at?: string | null
          customer_id?: string | null
          due_date?: string | null
          dunning_attempts?: number | null
          id?: string
          invoice_number?: string
          paid_at?: string | null
          partner_id?: string | null
          partner_share?: number | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          platform_share?: number | null
          status?: string | null
          subscription_amount?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          usage_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "partner_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payouts: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          net_payout: number | null
          notes: string | null
          partner_id: string | null
          payout_method: string | null
          payout_reference: string | null
          period_end: string | null
          period_start: string | null
          processed_at: string | null
          reserve_holdback: number | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          net_payout?: number | null
          notes?: string | null
          partner_id?: string | null
          payout_method?: string | null
          payout_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          reserve_holdback?: number | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          net_payout?: number | null
          notes?: string | null
          partner_id?: string | null
          payout_method?: string | null
          payout_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          reserve_holdback?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_payouts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_risk_events: {
        Row: {
          created_at: string | null
          customer_id: string | null
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          partner_id: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          partner_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          partner_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_risk_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "partner_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_risk_events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_sensitive_details: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          created_at: string
          director_nin: string | null
          organization_id: string
          partner_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          director_nin?: string | null
          organization_id: string
          partner_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          director_nin?: string | null
          organization_id?: string
          partner_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_sensitive_details_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_support_sessions: {
        Row: {
          approved_at: string | null
          created_at: string | null
          customer_id: string
          expires_at: string | null
          id: string
          pages_viewed: string[] | null
          partner_id: string
          requested_by: string
          revoked_at: string | null
          scope_modules: string[] | null
          status: string | null
        }
        Insert: {
          approved_at?: string | null
          created_at?: string | null
          customer_id: string
          expires_at?: string | null
          id?: string
          pages_viewed?: string[] | null
          partner_id: string
          requested_by: string
          revoked_at?: string | null
          scope_modules?: string[] | null
          status?: string | null
        }
        Update: {
          approved_at?: string | null
          created_at?: string | null
          customer_id?: string
          expires_at?: string | null
          id?: string
          pages_viewed?: string[] | null
          partner_id?: string
          requested_by?: string
          revoked_at?: string | null
          scope_modules?: string[] | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_support_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "partner_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_support_sessions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_tiers: {
        Row: {
          created_at: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          monthly_price: number | null
          name: string
          rate_limit_per_day: number
          rate_limit_per_minute: number
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number | null
          name: string
          rate_limit_per_day?: number
          rate_limit_per_minute?: number
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number | null
          name?: string
          rate_limit_per_day?: number
          rate_limit_per_minute?: number
        }
        Relationships: []
      }
      partner_webhooks: {
        Row: {
          created_at: string | null
          events: string[]
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_response_status: number | null
          last_triggered_at: string | null
          partner_id: string
          secrets_vault_id: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          events?: string[]
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_response_status?: number | null
          last_triggered_at?: string | null
          partner_id: string
          secrets_vault_id?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          events?: string[]
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_response_status?: number | null
          last_triggered_at?: string | null
          partner_id?: string
          secrets_vault_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_webhooks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          cac_number: string | null
          city: string | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string
          country: string | null
          created_at: string
          created_by: string | null
          director_name: string | null
          director_phone: string | null
          id: string
          is_verified: boolean | null
          notes: string | null
          organization_id: string | null
          partner_type: string
          rejection_reason: string | null
          state: string | null
          tier_id: string | null
          tin_number: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          cac_number?: string | null
          city?: string | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          director_name?: string | null
          director_phone?: string | null
          id?: string
          is_verified?: boolean | null
          notes?: string | null
          organization_id?: string | null
          partner_type: string
          rejection_reason?: string | null
          state?: string | null
          tier_id?: string | null
          tin_number?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          cac_number?: string | null
          city?: string | null
          company_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          director_name?: string | null
          director_phone?: string | null
          id?: string
          is_verified?: boolean | null
          notes?: string | null
          organization_id?: string | null
          partner_type?: string
          rejection_reason?: string | null
          state?: string | null
          tier_id?: string | null
          tin_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "partner_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_opportunities: {
        Row: {
          approved_by: string | null
          cost_savings: number | null
          created_at: string | null
          estimated_revenue: number | null
          fleet_operator_id: string | null
          id: string
          match_reason: string | null
          match_score: number | null
          partner_name: string
          partner_type: string
          proposal_text: string | null
          route_context: string | null
          shipper_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          cost_savings?: number | null
          created_at?: string | null
          estimated_revenue?: number | null
          fleet_operator_id?: string | null
          id?: string
          match_reason?: string | null
          match_score?: number | null
          partner_name: string
          partner_type: string
          proposal_text?: string | null
          route_context?: string | null
          shipper_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_by?: string | null
          cost_savings?: number | null
          created_at?: string | null
          estimated_revenue?: number | null
          fleet_operator_id?: string | null
          id?: string
          match_reason?: string | null
          match_score?: number | null
          partner_name?: string
          partner_type?: string
          proposal_text?: string | null
          route_context?: string | null
          shipper_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      parts_inventory: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          last_restocked_at: string | null
          part_category: string
          part_name: string
          quantity_in_stock: number | null
          reorder_level: number | null
          supplier_name: string | null
          unit_cost: number | null
          updated_at: string | null
          warehouse_location: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          last_restocked_at?: string | null
          part_category: string
          part_name: string
          quantity_in_stock?: number | null
          reorder_level?: number | null
          supplier_name?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          warehouse_location?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          last_restocked_at?: string | null
          part_category?: string
          part_name?: string
          quantity_in_stock?: number | null
          reorder_level?: number | null
          supplier_name?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          warehouse_location?: string | null
        }
        Relationships: []
      }
      parts_orders: {
        Row: {
          actual_cost: number | null
          created_at: string | null
          currency: string | null
          estimated_cost: number | null
          id: string
          notes: string | null
          order_status: string | null
          ordered_by: string | null
          part_category: string
          part_name: string
          predicted_need_date: string | null
          prediction_id: string | null
          quantity: number | null
          supplier_name: string | null
          triggered_by: string | null
          updated_at: string | null
          urgency: string | null
          vehicle_id: string
        }
        Insert: {
          actual_cost?: number | null
          created_at?: string | null
          currency?: string | null
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          order_status?: string | null
          ordered_by?: string | null
          part_category: string
          part_name: string
          predicted_need_date?: string | null
          prediction_id?: string | null
          quantity?: number | null
          supplier_name?: string | null
          triggered_by?: string | null
          updated_at?: string | null
          urgency?: string | null
          vehicle_id: string
        }
        Update: {
          actual_cost?: number | null
          created_at?: string | null
          currency?: string | null
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          order_status?: string | null
          ordered_by?: string | null
          part_category?: string
          part_name?: string
          predicted_need_date?: string | null
          prediction_id?: string | null
          quantity?: number | null
          supplier_name?: string | null
          triggered_by?: string | null
          updated_at?: string | null
          urgency?: string | null
          vehicle_id?: string
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          config: Json | null
          created_at: string
          display_name: string
          gateway_code: string
          id: string
          is_active: boolean
          supported_currencies: string[]
          supports_mobile_money: boolean
          supports_per_drop_billing: boolean
          supports_subscriptions: boolean
          webhook_path: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          display_name: string
          gateway_code: string
          id?: string
          is_active?: boolean
          supported_currencies?: string[]
          supports_mobile_money?: boolean
          supports_per_drop_billing?: boolean
          supports_subscriptions?: boolean
          webhook_path?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          display_name?: string
          gateway_code?: string
          id?: string
          is_active?: boolean
          supported_currencies?: string[]
          supports_mobile_money?: boolean
          supports_per_drop_billing?: boolean
          supports_subscriptions?: boolean
          webhook_path?: string | null
        }
        Relationships: []
      }
      payout_approvals: {
        Row: {
          amount: number
          created_at: string | null
          finance_approved_at: string | null
          finance_approved_by: string | null
          finance_notes: string | null
          id: string
          org_admin_approved_at: string | null
          org_admin_approved_by: string | null
          org_admin_notes: string | null
          organization_id: string | null
          payout_type: string
          reference_id: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          finance_approved_at?: string | null
          finance_approved_by?: string | null
          finance_notes?: string | null
          id?: string
          org_admin_approved_at?: string | null
          org_admin_approved_by?: string | null
          org_admin_notes?: string | null
          organization_id?: string | null
          payout_type: string
          reference_id: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          finance_approved_at?: string | null
          finance_approved_by?: string | null
          finance_notes?: string | null
          id?: string
          org_admin_approved_at?: string | null
          org_admin_approved_by?: string | null
          org_admin_notes?: string | null
          organization_id?: string | null
          payout_type?: string
          reference_id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payout_cycles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          cycle_type: string
          dispute_reason: string | null
          driver_count: number
          id: string
          organization_id: string | null
          period_end: string
          period_start: string
          processed_at: string | null
          status: string
          total_bonuses: number
          total_deductions: number
          total_gross: number
          total_net: number
          total_tax: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          cycle_type?: string
          dispute_reason?: string | null
          driver_count?: number
          id?: string
          organization_id?: string | null
          period_end: string
          period_start: string
          processed_at?: string | null
          status?: string
          total_bonuses?: number
          total_deductions?: number
          total_gross?: number
          total_net?: number
          total_tax?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          cycle_type?: string
          dispute_reason?: string | null
          driver_count?: number
          id?: string
          organization_id?: string | null
          period_end?: string
          period_start?: string
          processed_at?: string | null
          status?: string
          total_bonuses?: number
          total_deductions?: number
          total_gross?: number
          total_net?: number
          total_tax?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_cycles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_audit_findings: {
        Row: {
          anomaly_score: number
          category: string
          detail: Json
          detected_at: string
          id: string
          message: string
          resolved_at: string | null
          resolved_by: string | null
          resolved_note: string | null
          severity: string
          staff_id: string | null
          staff_salary_id: string
        }
        Insert: {
          anomaly_score?: number
          category: string
          detail?: Json
          detected_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_note?: string | null
          severity: string
          staff_id?: string | null
          staff_salary_id: string
        }
        Update: {
          anomaly_score?: number
          category?: string
          detail?: Json
          detected_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_note?: string | null
          severity?: string
          staff_id?: string | null
          staff_salary_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_audit_findings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_audit_findings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_audit_findings_staff_salary_id_fkey"
            columns: ["staff_salary_id"]
            isOneToOne: false
            referencedRelation: "staff_salaries"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_audit_runs: {
        Row: {
          clean_count: number
          created_at: string
          critical_count: number
          id: string
          prevented_amount: number
          rows_checked: number
          triggered_by: string | null
          warning_count: number
        }
        Insert: {
          clean_count?: number
          created_at?: string
          critical_count?: number
          id?: string
          prevented_amount?: number
          rows_checked?: number
          triggered_by?: string | null
          warning_count?: number
        }
        Update: {
          clean_count?: number
          created_at?: string
          critical_count?: number
          id?: string
          prevented_amount?: number
          rows_checked?: number
          triggered_by?: string | null
          warning_count?: number
        }
        Relationships: []
      }
      payroll_reconciliation: {
        Row: {
          created_at: string
          id: string
          is_reconciled: boolean | null
          ledger_gross: number | null
          ledger_net: number | null
          ledger_tax: number | null
          notes: string | null
          period_month: number
          period_year: number
          reconciled_at: string | null
          reconciled_by: string | null
          total_gross: number
          total_net: number
          total_tax: number
          variance_gross: number | null
          variance_net: number | null
          variance_tax: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_reconciled?: boolean | null
          ledger_gross?: number | null
          ledger_net?: number | null
          ledger_tax?: number | null
          notes?: string | null
          period_month: number
          period_year: number
          reconciled_at?: string | null
          reconciled_by?: string | null
          total_gross?: number
          total_net?: number
          total_tax?: number
          variance_gross?: number | null
          variance_net?: number | null
          variance_tax?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_reconciled?: boolean | null
          ledger_gross?: number | null
          ledger_net?: number | null
          ledger_tax?: number | null
          notes?: string | null
          period_month?: number
          period_year?: number
          reconciled_at?: string | null
          reconciled_by?: string | null
          total_gross?: number
          total_net?: number
          total_tax?: number
          variance_gross?: number | null
          variance_net?: number | null
          variance_tax?: number | null
        }
        Relationships: []
      }
      payslip_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          payslip_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          payslip_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          payslip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslip_audit_log_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "payslips"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          created_at: string
          currency_code: string
          deductions: Json
          download_count: number
          earnings: Json
          generated_by: string | null
          gross_amount: number
          id: string
          last_downloaded_at: string | null
          net_amount: number
          organization_id: string | null
          pay_date: string
          payment_reference: string | null
          payslip_number: string
          period_end: string | null
          period_start: string | null
          staff_email: string | null
          staff_id: string
          staff_name: string
          staff_role: string | null
          staff_salary_id: string
          tax_amount: number
        }
        Insert: {
          created_at?: string
          currency_code?: string
          deductions?: Json
          download_count?: number
          earnings?: Json
          generated_by?: string | null
          gross_amount?: number
          id?: string
          last_downloaded_at?: string | null
          net_amount?: number
          organization_id?: string | null
          pay_date?: string
          payment_reference?: string | null
          payslip_number: string
          period_end?: string | null
          period_start?: string | null
          staff_email?: string | null
          staff_id: string
          staff_name: string
          staff_role?: string | null
          staff_salary_id: string
          tax_amount?: number
        }
        Update: {
          created_at?: string
          currency_code?: string
          deductions?: Json
          download_count?: number
          earnings?: Json
          generated_by?: string | null
          gross_amount?: number
          id?: string
          last_downloaded_at?: string | null
          net_amount?: number
          organization_id?: string | null
          pay_date?: string
          payment_reference?: string | null
          payslip_number?: string
          period_end?: string | null
          period_start?: string | null
          staff_email?: string | null
          staff_id?: string
          staff_name?: string
          staff_role?: string | null
          staff_salary_id?: string
          tax_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payslips_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_staff_salary_id_fkey"
            columns: ["staff_salary_id"]
            isOneToOne: true
            referencedRelation: "staff_salaries"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_obligations: {
        Row: {
          allocation_percentage: number | null
          completion_percentage: number | null
          contract_id: string
          created_at: string
          deferred_revenue: number | null
          description: string
          fulfillment_status: string | null
          id: string
          recognized_revenue: number | null
          standalone_selling_price: number | null
        }
        Insert: {
          allocation_percentage?: number | null
          completion_percentage?: number | null
          contract_id: string
          created_at?: string
          deferred_revenue?: number | null
          description: string
          fulfillment_status?: string | null
          id?: string
          recognized_revenue?: number | null
          standalone_selling_price?: number | null
        }
        Update: {
          allocation_percentage?: number | null
          completion_percentage?: number | null
          contract_id?: string
          created_at?: string
          deferred_revenue?: number | null
          description?: string
          fulfillment_status?: string | null
          id?: string
          recognized_revenue?: number | null
          standalone_selling_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_obligations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "revenue_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      period_closings: {
        Row: {
          checklist: Json | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          net_profit: number | null
          notes: string | null
          period_end: string
          period_label: string
          period_start: string
          period_type: string
          status: string
          total_expenses: number | null
          total_revenue: number | null
          updated_at: string
        }
        Insert: {
          checklist?: Json | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          net_profit?: number | null
          notes?: string | null
          period_end: string
          period_label: string
          period_start: string
          period_type?: string
          status?: string
          total_expenses?: number | null
          total_revenue?: number | null
          updated_at?: string
        }
        Update: {
          checklist?: Json | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          net_profit?: number | null
          notes?: string | null
          period_end?: string
          period_label?: string
          period_start?: string
          period_type?: string
          status?: string
          total_expenses?: number | null
          total_revenue?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      pharma_team_members: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean | null
          pharma_role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          pharma_role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          pharma_role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      picklist_items: {
        Row: {
          bin_code: string | null
          created_at: string | null
          id: string
          picked_at: string | null
          picked_by: string | null
          picklist_id: string
          quantity_picked: number | null
          quantity_requested: number
          sku_code: string
          sku_name: string | null
          status: string
        }
        Insert: {
          bin_code?: string | null
          created_at?: string | null
          id?: string
          picked_at?: string | null
          picked_by?: string | null
          picklist_id: string
          quantity_picked?: number | null
          quantity_requested: number
          sku_code: string
          sku_name?: string | null
          status?: string
        }
        Update: {
          bin_code?: string | null
          created_at?: string | null
          id?: string
          picked_at?: string | null
          picked_by?: string | null
          picklist_id?: string
          quantity_picked?: number | null
          quantity_requested?: number
          sku_code?: string
          sku_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "picklist_items_picklist_id_fkey"
            columns: ["picklist_id"]
            isOneToOne: false
            referencedRelation: "picklists"
            referencedColumns: ["id"]
          },
        ]
      }
      picklists: {
        Row: {
          assigned_picker_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          order_reference: string | null
          outlet_name: string | null
          pick_type: string
          picklist_number: string
          priority: string
          started_at: string | null
          status: string
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          assigned_picker_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          order_reference?: string | null
          outlet_name?: string | null
          pick_type?: string
          picklist_number: string
          priority?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          assigned_picker_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          order_reference?: string | null
          outlet_name?: string | null
          pick_type?: string
          picklist_number?: string
          priority?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "picklists_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_analytics: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          metric_key: string
          metric_type: string
          metric_value: number
          recorded_at: string | null
          tenant_hash: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_key: string
          metric_type: string
          metric_value?: number
          recorded_at?: string | null
          tenant_hash?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_key?: string
          metric_type?: string
          metric_value?: number
          recorded_at?: string | null
          tenant_hash?: string | null
        }
        Relationships: []
      }
      platform_audit_log: {
        Row: {
          actor_email: string | null
          actor_role: string | null
          actor_user_id: string | null
          event_class: string
          id: string
          message: string
          occurred_at: string
          organization_id: string | null
          payload: Json
          resource: string | null
          severity: string
          source: string
          tenant_mode: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          event_class: string
          id?: string
          message: string
          occurred_at?: string
          organization_id?: string | null
          payload?: Json
          resource?: string | null
          severity?: string
          source?: string
          tenant_mode?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          event_class?: string
          id?: string
          message?: string
          occurred_at?: string
          organization_id?: string | null
          payload?: Json
          resource?: string | null
          severity?: string
          source?: string
          tenant_mode?: string | null
        }
        Relationships: []
      }
      platform_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          performed_by: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          performed_by?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          performed_by?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      platform_events: {
        Row: {
          created_at: string
          created_by: string | null
          error_message: string | null
          event_type: string
          event_version: number
          id: string
          max_retries: number | null
          payload: Json
          processed_at: string | null
          resource_id: string
          resource_type: string
          restricted_fields: string[] | null
          retry_count: number | null
          source_os: string
          status: string
          target_os: string
          tenant_id: string | null
          visible_fields: string[] | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          event_type: string
          event_version?: number
          id?: string
          max_retries?: number | null
          payload?: Json
          processed_at?: string | null
          resource_id: string
          resource_type: string
          restricted_fields?: string[] | null
          retry_count?: number | null
          source_os: string
          status?: string
          target_os: string
          tenant_id?: string | null
          visible_fields?: string[] | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          event_type?: string
          event_version?: number
          id?: string
          max_retries?: number | null
          payload?: Json
          processed_at?: string | null
          resource_id?: string
          resource_type?: string
          restricted_fields?: string[] | null
          retry_count?: number | null
          source_os?: string
          status?: string
          target_os?: string
          tenant_id?: string | null
          visible_fields?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_feature_flags: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          flag_key: string
          id: string
          organization_id: string | null
          rollout_pct: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          flag_key: string
          id?: string
          organization_id?: string | null
          rollout_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          flag_key?: string
          id?: string
          organization_id?: string | null
          rollout_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_owners: {
        Row: {
          added_at: string
          notes: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      predictive_forecasts: {
        Row: {
          confidence_score: number
          created_at: string
          entity_id: string | null
          entity_type: string
          factors: Json | null
          forecast_period: string
          forecast_type: string
          id: string
          predicted_value: number
          risk_level: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          entity_id?: string | null
          entity_type: string
          factors?: Json | null
          forecast_period: string
          forecast_type: string
          id?: string
          predicted_value: number
          risk_level?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          factors?: Json | null
          forecast_period?: string
          forecast_type?: string
          id?: string
          predicted_value?: number
          risk_level?: string
        }
        Relationships: []
      }
      pricing_adjustments: {
        Row: {
          base_price: number | null
          created_at: string | null
          demand_multiplier: number | null
          fuel_multiplier: number | null
          id: string
          is_auto_pricing: boolean | null
          last_updated: string | null
          margin_target: number | null
          minimum_price: number | null
          recommended_price: number | null
          route_hash: string
          vehicle_type: string | null
        }
        Insert: {
          base_price?: number | null
          created_at?: string | null
          demand_multiplier?: number | null
          fuel_multiplier?: number | null
          id?: string
          is_auto_pricing?: boolean | null
          last_updated?: string | null
          margin_target?: number | null
          minimum_price?: number | null
          recommended_price?: number | null
          route_hash: string
          vehicle_type?: string | null
        }
        Update: {
          base_price?: number | null
          created_at?: string | null
          demand_multiplier?: number | null
          fuel_multiplier?: number | null
          id?: string
          is_auto_pricing?: boolean | null
          last_updated?: string | null
          margin_target?: number | null
          minimum_price?: number | null
          recommended_price?: number | null
          route_hash?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      pricing_recommendations: {
        Row: {
          approved_by: string | null
          bundle_suggestions: Json | null
          churn_risk: number | null
          cost_savings_delivered: number | null
          created_at: string | null
          current_price: number | null
          customer_id: string | null
          customer_segment: string
          dependency_score: number | null
          id: string
          price_change_pct: number | null
          reasoning: string | null
          recommended_price: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          bundle_suggestions?: Json | null
          churn_risk?: number | null
          cost_savings_delivered?: number | null
          created_at?: string | null
          current_price?: number | null
          customer_id?: string | null
          customer_segment: string
          dependency_score?: number | null
          id?: string
          price_change_pct?: number | null
          reasoning?: string | null
          recommended_price?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_by?: string | null
          bundle_suggestions?: Json | null
          churn_risk?: number | null
          cost_savings_delivered?: number | null
          created_at?: string | null
          current_price?: number | null
          customer_id?: string | null
          customer_segment?: string
          dependency_score?: number | null
          id?: string
          price_change_pct?: number | null
          reasoning?: string | null
          recommended_price?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      product_metrics: {
        Row: {
          api_calls: number | null
          average_session_duration_minutes: number | null
          created_at: string | null
          daily_active_users: number | null
          error_count: number | null
          feature_usage: Json | null
          id: string
          metric_date: string
          total_dispatches: number | null
          total_invoices_raised: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          api_calls?: number | null
          average_session_duration_minutes?: number | null
          created_at?: string | null
          daily_active_users?: number | null
          error_count?: number | null
          feature_usage?: Json | null
          id?: string
          metric_date: string
          total_dispatches?: number | null
          total_invoices_raised?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          api_calls?: number | null
          average_session_duration_minutes?: number | null
          created_at?: string | null
          daily_active_users?: number | null
          error_count?: number | null
          feature_usage?: Json | null
          id?: string
          metric_date?: string
          total_dispatches?: number | null
          total_invoices_raised?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profile_picture_upload_audit: {
        Row: {
          action: string
          created_at: string
          error_category: string | null
          error_code: string | null
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          outcome: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          error_category?: string | null
          error_code?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          outcome: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          error_category?: string | null
          error_code?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          outcome?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          country_code: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          region_mode: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          teleprompter_completed: boolean | null
          teleprompter_step: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          region_mode?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          teleprompter_completed?: boolean | null
          teleprompter_step?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          region_mode?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          teleprompter_completed?: boolean | null
          teleprompter_step?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          last_seen_at: string
          organization_id: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          organization_id?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          organization_id?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_change_recipients: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          api_key_id: string | null
          bucket_window: string
          id: string
          request_count: number | null
        }
        Insert: {
          api_key_id?: string | null
          bucket_window: string
          id?: string
          request_count?: number | null
        }
        Update: {
          api_key_id?: string | null
          bucket_window?: string
          id?: string
          request_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_limit_buckets_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_batches: {
        Row: {
          batch_type: string
          comparison_system: string
          completed_at: string | null
          created_at: string
          due_date: string | null
          exception_count: number | null
          id: string
          matched_count: number | null
          matched_value: number | null
          notes: string | null
          organization_id: string | null
          owner_id: string | null
          source_system: string
          status: string
          total_records: number | null
          unmatched_count: number | null
          unmatched_value: number | null
        }
        Insert: {
          batch_type?: string
          comparison_system: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          exception_count?: number | null
          id?: string
          matched_count?: number | null
          matched_value?: number | null
          notes?: string | null
          organization_id?: string | null
          owner_id?: string | null
          source_system: string
          status?: string
          total_records?: number | null
          unmatched_count?: number | null
          unmatched_value?: number | null
        }
        Update: {
          batch_type?: string
          comparison_system?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          exception_count?: number | null
          id?: string
          matched_count?: number | null
          matched_value?: number | null
          notes?: string | null
          organization_id?: string | null
          owner_id?: string | null
          source_system?: string
          status?: string
          total_records?: number | null
          unmatched_count?: number | null
          unmatched_value?: number | null
        }
        Relationships: []
      }
      reconciliation_items: {
        Row: {
          created_at: string | null
          dispatched_qty: number
          id: string
          investigation_status: string | null
          physical_qty: number
          reconciliation_id: string
          returned_qty: number
          sku_code: string
          sku_name: string | null
          system_qty: number
          variance: number | null
          variance_type: string | null
        }
        Insert: {
          created_at?: string | null
          dispatched_qty?: number
          id?: string
          investigation_status?: string | null
          physical_qty?: number
          reconciliation_id: string
          returned_qty?: number
          sku_code: string
          sku_name?: string | null
          system_qty?: number
          variance?: number | null
          variance_type?: string | null
        }
        Update: {
          created_at?: string | null
          dispatched_qty?: number
          id?: string
          investigation_status?: string | null
          physical_qty?: number
          reconciliation_id?: string
          returned_qty?: number
          sku_code?: string
          sku_name?: string | null
          system_qty?: number
          variance?: number | null
          variance_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_items_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "inventory_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_modules: {
        Row: {
          carbon_reporting_rule: string | null
          country_code: string
          created_at: string
          customs_integration: string | null
          data_privacy_rule: string | null
          driver_tax_rule: string | null
          eld_requirement: string | null
          fuel_regulation: string | null
          id: string
          insurance_requirement: string | null
          is_active: boolean
          labor_classification: string | null
          max_driving_hours: number | null
          notes: string | null
          payroll_structure: string | null
          rest_period_hours: number | null
          transport_compliance_rule: string | null
          updated_at: string
          vat_logic: string | null
        }
        Insert: {
          carbon_reporting_rule?: string | null
          country_code: string
          created_at?: string
          customs_integration?: string | null
          data_privacy_rule?: string | null
          driver_tax_rule?: string | null
          eld_requirement?: string | null
          fuel_regulation?: string | null
          id?: string
          insurance_requirement?: string | null
          is_active?: boolean
          labor_classification?: string | null
          max_driving_hours?: number | null
          notes?: string | null
          payroll_structure?: string | null
          rest_period_hours?: number | null
          transport_compliance_rule?: string | null
          updated_at?: string
          vat_logic?: string | null
        }
        Update: {
          carbon_reporting_rule?: string | null
          country_code?: string
          created_at?: string
          customs_integration?: string | null
          data_privacy_rule?: string | null
          driver_tax_rule?: string | null
          eld_requirement?: string | null
          fuel_regulation?: string | null
          id?: string
          insurance_requirement?: string | null
          is_active?: boolean
          labor_classification?: string | null
          max_driving_hours?: number | null
          notes?: string | null
          payroll_structure?: string | null
          rest_period_hours?: number | null
          transport_compliance_rule?: string | null
          updated_at?: string
          vat_logic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_modules_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: true
            referencedRelation: "global_regions"
            referencedColumns: ["country_code"]
          },
        ]
      }
      regulatory_rules: {
        Row: {
          country: string
          created_at: string
          enforcement_action: string
          id: string
          industry: string
          is_active: boolean | null
          regulation_code: string
          regulation_name: string
          requirement_list: Json
          updated_at: string
        }
        Insert: {
          country?: string
          created_at?: string
          enforcement_action?: string
          id?: string
          industry: string
          is_active?: boolean | null
          regulation_code: string
          regulation_name: string
          requirement_list?: Json
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          enforcement_action?: string
          id?: string
          industry?: string
          is_active?: boolean | null
          regulation_code?: string
          regulation_name?: string
          requirement_list?: Json
          updated_at?: string
        }
        Relationships: []
      }
      remittance_wallets: {
        Row: {
          aml_status: string | null
          amount: number
          commerce_trigger_id: string | null
          commerce_trigger_type: string | null
          created_at: string
          currency: string
          destination_currency: string
          escrow_flag: boolean | null
          fx_rate: number | null
          id: string
          linked_trade_contract: string | null
          logistics_partner: string | null
          merchant_id: string | null
          purpose_code: string
          receiver_country: string
          remittance_id: string
          risk_score: number | null
          sender_country: string
          sender_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          aml_status?: string | null
          amount?: number
          commerce_trigger_id?: string | null
          commerce_trigger_type?: string | null
          created_at?: string
          currency?: string
          destination_currency?: string
          escrow_flag?: boolean | null
          fx_rate?: number | null
          id?: string
          linked_trade_contract?: string | null
          logistics_partner?: string | null
          merchant_id?: string | null
          purpose_code?: string
          receiver_country: string
          remittance_id?: string
          risk_score?: number | null
          sender_country: string
          sender_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          aml_status?: string | null
          amount?: number
          commerce_trigger_id?: string | null
          commerce_trigger_type?: string | null
          created_at?: string
          currency?: string
          destination_currency?: string
          escrow_flag?: boolean | null
          fx_rate?: number | null
          id?: string
          linked_trade_contract?: string | null
          logistics_partner?: string | null
          merchant_id?: string | null
          purpose_code?: string
          receiver_country?: string
          remittance_id?: string
          risk_score?: number | null
          sender_country?: string
          sender_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      reseller_access_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          org_id: string | null
          outcome: string
          table_name: string
          target_org_id: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          org_id?: string | null
          outcome: string
          table_name: string
          target_org_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          org_id?: string | null
          outcome?: string
          table_name?: string
          target_org_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      reseller_client_locks: {
        Row: {
          client_email: string
          client_org_id: string | null
          created_at: string
          id: string
          locked_until: string
          reseller_org_id: string | null
        }
        Insert: {
          client_email: string
          client_org_id?: string | null
          created_at?: string
          id?: string
          locked_until: string
          reseller_org_id?: string | null
        }
        Update: {
          client_email?: string
          client_org_id?: string | null
          created_at?: string
          id?: string
          locked_until?: string
          reseller_org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_client_locks_client_org_id_fkey"
            columns: ["client_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_client_locks_reseller_org_id_fkey"
            columns: ["reseller_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_payouts: {
        Row: {
          amount: number
          bank_details: Json | null
          created_at: string
          currency: string
          id: string
          payout_reference: string | null
          period_end: string
          period_start: string
          processed_at: string | null
          reseller_org_id: string
          status: string
        }
        Insert: {
          amount: number
          bank_details?: Json | null
          created_at?: string
          currency?: string
          id?: string
          payout_reference?: string | null
          period_end: string
          period_start: string
          processed_at?: string | null
          reseller_org_id: string
          status?: string
        }
        Update: {
          amount?: number
          bank_details?: Json | null
          created_at?: string
          currency?: string
          id?: string
          payout_reference?: string | null
          period_end?: string
          period_start?: string
          processed_at?: string | null
          reseller_org_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_payouts_reseller_org_id_fkey"
            columns: ["reseller_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_price_floors: {
        Row: {
          floor_price_ngn: number
          floor_price_usd: number
          id: string
          tier: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          floor_price_ngn?: number
          floor_price_usd?: number
          id?: string
          tier: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          floor_price_ngn?: number
          floor_price_usd?: number
          id?: string
          tier?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      reseller_relationships: {
        Row: {
          client_org_id: string
          commission_rate: number
          created_at: string
          custom_pricing: Json | null
          id: string
          is_active: boolean
          parent_reseller_id: string | null
          reseller_org_id: string
          routeace_commission_rate: number
          updated_at: string
        }
        Insert: {
          client_org_id: string
          commission_rate?: number
          created_at?: string
          custom_pricing?: Json | null
          id?: string
          is_active?: boolean
          parent_reseller_id?: string | null
          reseller_org_id: string
          routeace_commission_rate?: number
          updated_at?: string
        }
        Update: {
          client_org_id?: string
          commission_rate?: number
          created_at?: string
          custom_pricing?: Json | null
          id?: string
          is_active?: boolean
          parent_reseller_id?: string | null
          reseller_org_id?: string
          routeace_commission_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_relationships_client_org_id_fkey"
            columns: ["client_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_relationships_parent_reseller_id_fkey"
            columns: ["parent_reseller_id"]
            isOneToOne: false
            referencedRelation: "reseller_relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_relationships_reseller_org_id_fkey"
            columns: ["reseller_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_sales: {
        Row: {
          client_id: string | null
          commission_amount: number
          commission_rate: number
          created_at: string | null
          id: string
          invoice_number: string | null
          reseller_id: string | null
          routeace_share: number
          sale_amount: number
          sale_date: string | null
          sale_type: string
          status: string | null
        }
        Insert: {
          client_id?: string | null
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          id?: string
          invoice_number?: string | null
          reseller_id?: string | null
          routeace_share: number
          sale_amount: number
          sale_date?: string | null
          sale_type: string
          status?: string | null
        }
        Update: {
          client_id?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          invoice_number?: string | null
          reseller_id?: string | null
          routeace_share?: number
          sale_amount?: number
          sale_date?: string | null
          sale_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_sales_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "white_label_resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      retail_credit_scores: {
        Row: {
          available_credit: number | null
          created_at: string | null
          credit_limit: number | null
          credit_score: number | null
          credit_tier: string | null
          id: string
          last_assessed_at: string | null
          outstanding_balance: number | null
          payment_history_score: number | null
          purchase_velocity_score: number | null
          retailer_id: string | null
          retailer_name: string
          store_stability_score: number | null
          territory: string | null
          territory_demand_score: number | null
          updated_at: string | null
        }
        Insert: {
          available_credit?: number | null
          created_at?: string | null
          credit_limit?: number | null
          credit_score?: number | null
          credit_tier?: string | null
          id?: string
          last_assessed_at?: string | null
          outstanding_balance?: number | null
          payment_history_score?: number | null
          purchase_velocity_score?: number | null
          retailer_id?: string | null
          retailer_name: string
          store_stability_score?: number | null
          territory?: string | null
          territory_demand_score?: number | null
          updated_at?: string | null
        }
        Update: {
          available_credit?: number | null
          created_at?: string | null
          credit_limit?: number | null
          credit_score?: number | null
          credit_tier?: string | null
          id?: string
          last_assessed_at?: string | null
          outstanding_balance?: number | null
          payment_history_score?: number | null
          purchase_velocity_score?: number | null
          retailer_id?: string | null
          retailer_name?: string
          store_stability_score?: number | null
          territory?: string | null
          territory_demand_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      revenue_channels: {
        Row: {
          channel_name: string
          channel_type: string | null
          conversion_rate: number | null
          created_at: string | null
          customer_acquisition_cost: number | null
          id: string
          period_end: string | null
          period_start: string | null
          total_orders: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          channel_name: string
          channel_type?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          customer_acquisition_cost?: number | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          channel_name?: string
          channel_type?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          customer_acquisition_cost?: number | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      revenue_contracts: {
        Row: {
          contract_type: string
          country: string | null
          created_at: string
          currency: string
          end_date: string | null
          id: string
          performance_obligation_type: string | null
          revenue_recognition_method: string | null
          start_date: string
          status: string
          tax_jurisdiction: string | null
          tenant_id: string | null
          total_contract_value: number
          updated_at: string
        }
        Insert: {
          contract_type?: string
          country?: string | null
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          performance_obligation_type?: string | null
          revenue_recognition_method?: string | null
          start_date: string
          status?: string
          tax_jurisdiction?: string | null
          tenant_id?: string | null
          total_contract_value?: number
          updated_at?: string
        }
        Update: {
          contract_type?: string
          country?: string | null
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          performance_obligation_type?: string | null
          revenue_recognition_method?: string | null
          start_date?: string
          status?: string
          tax_jurisdiction?: string | null
          tenant_id?: string | null
          total_contract_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      revenue_expansion_signals: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          confidence: number | null
          created_at: string | null
          customer_id: string | null
          id: string
          opportunity_value: number | null
          organization_id: string | null
          reasoning: string | null
          recommended_action: string | null
          signal_type: string
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          confidence?: number | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          opportunity_value?: number | null
          organization_id?: string | null
          reasoning?: string | null
          recommended_action?: string | null
          signal_type: string
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          confidence?: number | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          opportunity_value?: number | null
          organization_id?: string | null
          reasoning?: string | null
          recommended_action?: string | null
          signal_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_expansion_signals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_loss_analysis: {
        Row: {
          analysis_period: string
          created_at: string | null
          currency: string | null
          delay_loss: number | null
          downtime_loss: number | null
          fuel_loss: number | null
          id: string
          idle_loss: number | null
          period_end: string
          period_start: string
          recommendations: Json | null
          route_loss: number | null
          top_loss_drivers: Json | null
          top_loss_routes: Json | null
          top_loss_vehicles: Json | null
          total_loss_amount: number | null
        }
        Insert: {
          analysis_period: string
          created_at?: string | null
          currency?: string | null
          delay_loss?: number | null
          downtime_loss?: number | null
          fuel_loss?: number | null
          id?: string
          idle_loss?: number | null
          period_end: string
          period_start: string
          recommendations?: Json | null
          route_loss?: number | null
          top_loss_drivers?: Json | null
          top_loss_routes?: Json | null
          top_loss_vehicles?: Json | null
          total_loss_amount?: number | null
        }
        Update: {
          analysis_period?: string
          created_at?: string | null
          currency?: string | null
          delay_loss?: number | null
          downtime_loss?: number | null
          fuel_loss?: number | null
          id?: string
          idle_loss?: number | null
          period_end?: string
          period_start?: string
          recommendations?: Json | null
          route_loss?: number | null
          top_loss_drivers?: Json | null
          top_loss_routes?: Json | null
          top_loss_vehicles?: Json | null
          total_loss_amount?: number | null
        }
        Relationships: []
      }
      revenue_loss_events: {
        Row: {
          action_taken: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          detected_at: string | null
          entity_id: string
          entity_type: string
          estimated_loss_amount: number
          id: string
          loss_type: string
          metadata: Json | null
          recommended_action: string | null
          resolved_at: string | null
          severity: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          detected_at?: string | null
          entity_id: string
          entity_type: string
          estimated_loss_amount?: number
          id?: string
          loss_type: string
          metadata?: Json | null
          recommended_action?: string | null
          resolved_at?: string | null
          severity?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          detected_at?: string | null
          entity_id?: string
          entity_type?: string
          estimated_loss_amount?: number
          id?: string
          loss_type?: string
          metadata?: Json | null
          recommended_action?: string | null
          resolved_at?: string | null
          severity?: string | null
        }
        Relationships: []
      }
      revenue_snapshots: {
        Row: {
          active_accounts: number
          api_revenue: number
          arpu: number
          created_at: string
          currency: string
          id: string
          mrr: number
          snapshot_date: string
          total_revenue: number
          usage_revenue: number
        }
        Insert: {
          active_accounts?: number
          api_revenue?: number
          arpu?: number
          created_at?: string
          currency?: string
          id?: string
          mrr?: number
          snapshot_date: string
          total_revenue?: number
          usage_revenue?: number
        }
        Update: {
          active_accounts?: number
          api_revenue?: number
          arpu?: number
          created_at?: string
          currency?: string
          id?: string
          mrr?: number
          snapshot_date?: string
          total_revenue?: number
          usage_revenue?: number
        }
        Relationships: []
      }
      role_ai_tasks: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          impact_score: number | null
          priority: string | null
          role: string
          source: string
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          impact_score?: number | null
          priority?: string | null
          role: string
          source?: string
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          impact_score?: number | null
          priority?: string | null
          role?: string
          source?: string
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_change_requests: {
        Row: {
          created_at: string | null
          id: string
          previous_role: string | null
          reason: string | null
          requested_by: string
          requested_role: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          previous_role?: string | null
          reason?: string | null
          requested_by: string
          requested_role: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          previous_role?: string | null
          reason?: string | null
          requested_by?: string
          requested_role?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      role_hierarchy: {
        Row: {
          child_role: string
          created_at: string | null
          id: string
          os_context: string
          parent_role: string
        }
        Insert: {
          child_role: string
          created_at?: string | null
          id?: string
          os_context?: string
          parent_role: string
        }
        Update: {
          child_role?: string
          created_at?: string | null
          id?: string
          os_context?: string
          parent_role?: string
        }
        Relationships: []
      }
      role_leave_defaults: {
        Row: {
          annual_days: number
          created_at: string
          emergency_days: number
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          sick_days: number
          updated_at: string
        }
        Insert: {
          annual_days?: number
          created_at?: string
          emergency_days?: number
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          sick_days?: number
          updated_at?: string
        }
        Update: {
          annual_days?: number
          created_at?: string
          emergency_days?: number
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          sick_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_leave_defaults_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_performance_scores: {
        Row: {
          automation_level: number | null
          created_at: string
          decision_accuracy: number | null
          execution_score: number | null
          id: string
          kpi_breakdown: Json | null
          rank_level: string | null
          risk_score: number | null
          role: string
          role_kpi_score: number | null
          score_date: string
          total_score: number | null
          updated_at: string
          user_id: string
          workflow_efficiency: number | null
        }
        Insert: {
          automation_level?: number | null
          created_at?: string
          decision_accuracy?: number | null
          execution_score?: number | null
          id?: string
          kpi_breakdown?: Json | null
          rank_level?: string | null
          risk_score?: number | null
          role: string
          role_kpi_score?: number | null
          score_date?: string
          total_score?: number | null
          updated_at?: string
          user_id: string
          workflow_efficiency?: number | null
        }
        Update: {
          automation_level?: number | null
          created_at?: string
          decision_accuracy?: number | null
          execution_score?: number | null
          id?: string
          kpi_breakdown?: Json | null
          rank_level?: string | null
          risk_score?: number | null
          role?: string
          role_kpi_score?: number | null
          score_date?: string
          total_score?: number | null
          updated_at?: string
          user_id?: string
          workflow_efficiency?: number | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          allowed: boolean | null
          created_at: string | null
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          allowed?: boolean | null
          created_at?: string | null
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          allowed?: boolean | null
          created_at?: string | null
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      role_transformation_days: {
        Row: {
          category: string
          completed: boolean | null
          completed_at: string | null
          created_at: string
          day_number: number
          id: string
          impact_score: number | null
          role: string
          task_description: string | null
          task_title: string
          time_spent_minutes: number | null
          user_id: string
          week_number: number
        }
        Insert: {
          category?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          day_number: number
          id?: string
          impact_score?: number | null
          role: string
          task_description?: string | null
          task_title: string
          time_spent_minutes?: number | null
          user_id: string
          week_number: number
        }
        Update: {
          category?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          day_number?: number
          id?: string
          impact_score?: number | null
          role?: string
          task_description?: string | null
          task_title?: string
          time_spent_minutes?: number | null
          user_id?: string
          week_number?: number
        }
        Relationships: []
      }
      route_blacklist: {
        Row: {
          blacklist_reason: string
          blacklisted_at: string | null
          blacklisted_by: string | null
          created_at: string | null
          destination: string | null
          id: string
          is_active: boolean | null
          loss_amount: number | null
          origin: string | null
          review_date: string | null
          route_id: string | null
          route_name: string | null
        }
        Insert: {
          blacklist_reason: string
          blacklisted_at?: string | null
          blacklisted_by?: string | null
          created_at?: string | null
          destination?: string | null
          id?: string
          is_active?: boolean | null
          loss_amount?: number | null
          origin?: string | null
          review_date?: string | null
          route_id?: string | null
          route_name?: string | null
        }
        Update: {
          blacklist_reason?: string
          blacklisted_at?: string | null
          blacklisted_by?: string | null
          created_at?: string | null
          destination?: string | null
          id?: string
          is_active?: boolean | null
          loss_amount?: number | null
          origin?: string | null
          review_date?: string | null
          route_id?: string | null
          route_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_blacklist_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_clusters: {
        Row: {
          bundling_score: number | null
          center_lat: number | null
          center_lng: number | null
          cluster_name: string
          cluster_type: string
          confidence_percent: number | null
          created_at: string
          estimated_fuel_savings_percent: number | null
          estimated_time_savings_minutes: number | null
          id: string
          metadata: Json | null
          order_count: number
          organization_id: string | null
          profit_impact_amount: number | null
          radius_km: number | null
          status: string
          updated_at: string
          vehicle_type_recommended: string | null
        }
        Insert: {
          bundling_score?: number | null
          center_lat?: number | null
          center_lng?: number | null
          cluster_name: string
          cluster_type: string
          confidence_percent?: number | null
          created_at?: string
          estimated_fuel_savings_percent?: number | null
          estimated_time_savings_minutes?: number | null
          id?: string
          metadata?: Json | null
          order_count?: number
          organization_id?: string | null
          profit_impact_amount?: number | null
          radius_km?: number | null
          status?: string
          updated_at?: string
          vehicle_type_recommended?: string | null
        }
        Update: {
          bundling_score?: number | null
          center_lat?: number | null
          center_lng?: number | null
          cluster_name?: string
          cluster_type?: string
          confidence_percent?: number | null
          created_at?: string
          estimated_fuel_savings_percent?: number | null
          estimated_time_savings_minutes?: number | null
          id?: string
          metadata?: Json | null
          order_count?: number
          organization_id?: string | null
          profit_impact_amount?: number | null
          radius_km?: number | null
          status?: string
          updated_at?: string
          vehicle_type_recommended?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_clusters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      route_plans: {
        Row: {
          alternate_routes: Json | null
          cost_efficiency_score: number | null
          created_at: string | null
          created_by: string | null
          destination_address: string
          destination_lat: number | null
          destination_lng: number | null
          distance_km: number | null
          driver_time_cost: number | null
          estimated_fuel_cost: number | null
          id: string
          maintenance_cost: number | null
          name: string
          origin_address: string
          origin_lat: number | null
          origin_lng: number | null
          override_reason: string | null
          risk_premium: number | null
          risk_score: number | null
          selected_route_index: number | null
          time_efficiency_score: number | null
          toll_fees: number | null
          total_cost: number | null
          updated_at: string | null
          waypoints: Json | null
        }
        Insert: {
          alternate_routes?: Json | null
          cost_efficiency_score?: number | null
          created_at?: string | null
          created_by?: string | null
          destination_address: string
          destination_lat?: number | null
          destination_lng?: number | null
          distance_km?: number | null
          driver_time_cost?: number | null
          estimated_fuel_cost?: number | null
          id?: string
          maintenance_cost?: number | null
          name: string
          origin_address: string
          origin_lat?: number | null
          origin_lng?: number | null
          override_reason?: string | null
          risk_premium?: number | null
          risk_score?: number | null
          selected_route_index?: number | null
          time_efficiency_score?: number | null
          toll_fees?: number | null
          total_cost?: number | null
          updated_at?: string | null
          waypoints?: Json | null
        }
        Update: {
          alternate_routes?: Json | null
          cost_efficiency_score?: number | null
          created_at?: string | null
          created_by?: string | null
          destination_address?: string
          destination_lat?: number | null
          destination_lng?: number | null
          distance_km?: number | null
          driver_time_cost?: number | null
          estimated_fuel_cost?: number | null
          id?: string
          maintenance_cost?: number | null
          name?: string
          origin_address?: string
          origin_lat?: number | null
          origin_lng?: number | null
          override_reason?: string | null
          risk_premium?: number | null
          risk_score?: number | null
          selected_route_index?: number | null
          time_efficiency_score?: number | null
          toll_fees?: number | null
          total_cost?: number | null
          updated_at?: string | null
          waypoints?: Json | null
        }
        Relationships: []
      }
      route_profitability_metrics: {
        Row: {
          avg_cost: number | null
          avg_margin: number | null
          avg_profit: number | null
          avg_revenue: number | null
          created_at: string | null
          demand_score: number | null
          destination: string | null
          id: string
          last_updated: string | null
          origin: string | null
          route_hash: string
          total_trips: number | null
        }
        Insert: {
          avg_cost?: number | null
          avg_margin?: number | null
          avg_profit?: number | null
          avg_revenue?: number | null
          created_at?: string | null
          demand_score?: number | null
          destination?: string | null
          id?: string
          last_updated?: string | null
          origin?: string | null
          route_hash: string
          total_trips?: number | null
        }
        Update: {
          avg_cost?: number | null
          avg_margin?: number | null
          avg_profit?: number | null
          avg_revenue?: number | null
          created_at?: string | null
          demand_score?: number | null
          destination?: string | null
          id?: string
          last_updated?: string | null
          origin?: string | null
          route_hash?: string
          total_trips?: number | null
        }
        Relationships: []
      }
      route_risk_register: {
        Row: {
          created_at: string
          driver_id: string | null
          id: string
          incident_count: number | null
          last_incident_date: string | null
          mitigation_plan: string | null
          reported_at: string
          reported_by: string | null
          risk_description: string
          risk_level: string
          route_name: string
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          driver_id?: string | null
          id?: string
          incident_count?: number | null
          last_incident_date?: string | null
          mitigation_plan?: string | null
          reported_at?: string
          reported_by?: string | null
          risk_description: string
          risk_level: string
          route_name: string
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          driver_id?: string | null
          id?: string
          incident_count?: number | null
          last_incident_date?: string | null
          mitigation_plan?: string | null
          reported_at?: string
          reported_by?: string | null
          risk_description?: string
          risk_level?: string
          route_name?: string
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_risk_register_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_risk_register_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      route_waypoints: {
        Row: {
          address: string
          created_at: string
          distance_from_previous_km: number | null
          duration_from_previous_hours: number | null
          id: string
          latitude: number | null
          location_name: string
          longitude: number | null
          route_id: string
          sequence_order: number
          sla_hours: number | null
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          distance_from_previous_km?: number | null
          duration_from_previous_hours?: number | null
          id?: string
          latitude?: number | null
          location_name: string
          longitude?: number | null
          route_id: string
          sequence_order?: number
          sla_hours?: number | null
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          distance_from_previous_km?: number | null
          duration_from_previous_hours?: number | null
          id?: string
          latitude?: number | null
          location_name?: string
          longitude?: number | null
          route_id?: string
          sequence_order?: number
          sla_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_waypoints_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string
          created_by: string | null
          destination: string
          destination_lat: number | null
          destination_lng: number | null
          distance_km: number | null
          estimated_duration_hours: number | null
          id: string
          is_active: boolean | null
          name: string
          origin: string
          origin_lat: number | null
          origin_lng: number | null
          updated_at: string
          waypoints: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destination: string
          destination_lat?: number | null
          destination_lng?: number | null
          distance_km?: number | null
          estimated_duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          origin: string
          origin_lat?: number | null
          origin_lng?: number | null
          updated_at?: string
          waypoints?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destination?: string
          destination_lat?: number | null
          destination_lng?: number | null
          distance_km?: number | null
          estimated_duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          origin?: string
          origin_lat?: number | null
          origin_lng?: number | null
          updated_at?: string
          waypoints?: Json | null
        }
        Relationships: []
      }
      sales_accounts: {
        Row: {
          account_name: string
          account_type: string | null
          address: string | null
          assigned_rep: string | null
          city: string | null
          commerce_identity_id: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          credit_limit: number | null
          geo_lat: number | null
          geo_lng: number | null
          id: string
          industry_code: string | null
          is_active: boolean | null
          last_order_at: string | null
          parent_account_id: string | null
          payment_terms: string | null
          state: string | null
          tenant_id: string | null
          territory: string | null
          tier: string | null
          total_orders: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_type?: string | null
          address?: string | null
          assigned_rep?: string | null
          city?: string | null
          commerce_identity_id?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          industry_code?: string | null
          is_active?: boolean | null
          last_order_at?: string | null
          parent_account_id?: string | null
          payment_terms?: string | null
          state?: string | null
          tenant_id?: string | null
          territory?: string | null
          tier?: string | null
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_type?: string | null
          address?: string | null
          assigned_rep?: string | null
          city?: string | null
          commerce_identity_id?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          industry_code?: string | null
          is_active?: boolean | null
          last_order_at?: string | null
          parent_account_id?: string | null
          payment_terms?: string | null
          state?: string | null
          tenant_id?: string | null
          territory?: string | null
          tier?: string | null
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "sales_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_activities: {
        Row: {
          account_id: string | null
          activity_date: string | null
          activity_type: string
          contact_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          geo_lat: number | null
          geo_lng: number | null
          id: string
          is_completed: boolean | null
          lead_id: string | null
          next_action: string | null
          next_action_date: string | null
          opportunity_id: string | null
          outcome: string | null
          performed_by: string | null
          subject: string
          tenant_id: string | null
        }
        Insert: {
          account_id?: string | null
          activity_date?: string | null
          activity_type?: string
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          is_completed?: boolean | null
          lead_id?: string | null
          next_action?: string | null
          next_action_date?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          performed_by?: string | null
          subject: string
          tenant_id?: string | null
        }
        Update: {
          account_id?: string | null
          activity_date?: string | null
          activity_type?: string
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          is_completed?: boolean | null
          lead_id?: string | null
          next_action?: string | null
          next_action_date?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          performed_by?: string | null
          subject?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_activities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "sales_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "sales_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sales_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "sales_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_call_logs: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          duration_minutes: number | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          notes: string | null
          order_value: number | null
          orders_placed: number | null
          outlet_name: string | null
          rep_id: string | null
          rep_name: string | null
          visit_type: string | null
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          notes?: string | null
          order_value?: number | null
          orders_placed?: number | null
          outlet_name?: string | null
          rep_id?: string | null
          rep_name?: string | null
          visit_type?: string | null
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          notes?: string | null
          order_value?: number | null
          orders_placed?: number | null
          outlet_name?: string | null
          rep_id?: string | null
          rep_name?: string | null
          visit_type?: string | null
        }
        Relationships: []
      }
      sales_contacts: {
        Row: {
          account_id: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_primary: boolean | null
          lead_id: string | null
          notes: string | null
          phone: string | null
          role: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean | null
          lead_id?: string | null
          notes?: string | null
          phone?: string | null
          role?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean | null
          lead_id?: string | null
          notes?: string | null
          phone?: string | null
          role?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "sales_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sales_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_forecasts: {
        Row: {
          actual_value: number | null
          best_case_value: number | null
          committed_value: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          forecast_month: number | null
          forecast_period: string
          forecast_quarter: number | null
          forecast_year: number
          id: string
          notes: string | null
          pipeline_value: number | null
          rep_id: string | null
          tenant_id: string | null
          territory_id: string | null
          updated_at: string | null
          weighted_value: number | null
        }
        Insert: {
          actual_value?: number | null
          best_case_value?: number | null
          committed_value?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          forecast_month?: number | null
          forecast_period: string
          forecast_quarter?: number | null
          forecast_year: number
          id?: string
          notes?: string | null
          pipeline_value?: number | null
          rep_id?: string | null
          tenant_id?: string | null
          territory_id?: string | null
          updated_at?: string | null
          weighted_value?: number | null
        }
        Update: {
          actual_value?: number | null
          best_case_value?: number | null
          committed_value?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          forecast_month?: number | null
          forecast_period?: string
          forecast_quarter?: number | null
          forecast_year?: number
          id?: string
          notes?: string | null
          pipeline_value?: number | null
          rep_id?: string | null
          tenant_id?: string | null
          territory_id?: string | null
          updated_at?: string | null
          weighted_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_forecasts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_forecasts_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "sales_territories"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_leads: {
        Row: {
          assigned_to: string | null
          company_name: string
          contact_name: string
          contact_title: string | null
          converted_at: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          email: string | null
          expected_value: number | null
          first_response_at: string | null
          id: string
          industry: string | null
          industry_code: string | null
          lost_reason: string | null
          notes: string | null
          phone: string | null
          qualified_at: string | null
          score: number | null
          sla_response_due: string | null
          source: string | null
          source_detail: string | null
          stage: string | null
          tenant_id: string | null
          territory: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_name: string
          contact_name: string
          contact_title?: string | null
          converted_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          email?: string | null
          expected_value?: number | null
          first_response_at?: string | null
          id?: string
          industry?: string | null
          industry_code?: string | null
          lost_reason?: string | null
          notes?: string | null
          phone?: string | null
          qualified_at?: string | null
          score?: number | null
          sla_response_due?: string | null
          source?: string | null
          source_detail?: string | null
          stage?: string | null
          tenant_id?: string | null
          territory?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_name?: string
          contact_name?: string
          contact_title?: string | null
          converted_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          email?: string | null
          expected_value?: number | null
          first_response_at?: string | null
          id?: string
          industry?: string | null
          industry_code?: string | null
          lost_reason?: string | null
          notes?: string | null
          phone?: string | null
          qualified_at?: string | null
          score?: number | null
          sla_response_due?: string | null
          source?: string | null
          source_detail?: string | null
          stage?: string | null
          tenant_id?: string | null
          territory?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_opportunities: {
        Row: {
          account_id: string | null
          actual_close_date: string | null
          amount: number | null
          assigned_to: string | null
          competitor: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          deal_risk: string | null
          expected_close_date: string | null
          id: string
          industry_code: string | null
          lead_id: string | null
          loss_reason: string | null
          notes: string | null
          opportunity_name: string
          probability: number | null
          stage: string | null
          tenant_id: string | null
          territory: string | null
          updated_at: string | null
          win_reason: string | null
        }
        Insert: {
          account_id?: string | null
          actual_close_date?: string | null
          amount?: number | null
          assigned_to?: string | null
          competitor?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deal_risk?: string | null
          expected_close_date?: string | null
          id?: string
          industry_code?: string | null
          lead_id?: string | null
          loss_reason?: string | null
          notes?: string | null
          opportunity_name: string
          probability?: number | null
          stage?: string | null
          tenant_id?: string | null
          territory?: string | null
          updated_at?: string | null
          win_reason?: string | null
        }
        Update: {
          account_id?: string | null
          actual_close_date?: string | null
          amount?: number | null
          assigned_to?: string | null
          competitor?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deal_risk?: string | null
          expected_close_date?: string | null
          id?: string
          industry_code?: string | null
          lead_id?: string | null
          loss_reason?: string | null
          notes?: string | null
          opportunity_name?: string
          probability?: number | null
          stage?: string | null
          tenant_id?: string | null
          territory?: string | null
          updated_at?: string | null
          win_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_opportunities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "sales_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sales_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_quotas: {
        Row: {
          achieved_amount: number | null
          attainment_percent: number | null
          created_at: string | null
          currency: string | null
          id: string
          rep_id: string | null
          target_amount: number | null
          target_month: number | null
          target_period: string | null
          target_quarter: number | null
          target_year: number
          tenant_id: string | null
          territory_id: string | null
          updated_at: string | null
        }
        Insert: {
          achieved_amount?: number | null
          attainment_percent?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          rep_id?: string | null
          target_amount?: number | null
          target_month?: number | null
          target_period?: string | null
          target_quarter?: number | null
          target_year: number
          tenant_id?: string | null
          territory_id?: string | null
          updated_at?: string | null
        }
        Update: {
          achieved_amount?: number | null
          attainment_percent?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          rep_id?: string | null
          target_amount?: number | null
          target_month?: number | null
          target_period?: string | null
          target_quarter?: number | null
          target_year?: number
          tenant_id?: string | null
          territory_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_quotas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotas_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "sales_territories"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_quote_items: {
        Row: {
          created_at: string | null
          discount_percent: number | null
          id: string
          line_total: number | null
          notes: string | null
          product_name: string
          quantity: number | null
          quote_id: string | null
          sku_code: string | null
          sort_order: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          discount_percent?: number | null
          id?: string
          line_total?: number | null
          notes?: string | null
          product_name: string
          quantity?: number | null
          quote_id?: string | null
          sku_code?: string | null
          sort_order?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          discount_percent?: number | null
          id?: string
          line_total?: number | null
          notes?: string | null
          product_name?: string
          quantity?: number | null
          quote_id?: string | null
          sku_code?: string | null
          sort_order?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "sales_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_quotes: {
        Row: {
          account_id: string | null
          approved_at: string | null
          approved_by: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          opportunity_id: string | null
          quote_number: string
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tenant_id: string | null
          total_amount: number | null
          updated_at: string | null
          valid_until: string | null
          version: number | null
        }
        Insert: {
          account_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          quote_number: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tenant_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
          valid_until?: string | null
          version?: number | null
        }
        Update: {
          account_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          quote_number?: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tenant_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
          valid_until?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_quotes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "sales_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "sales_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "sales_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_territories: {
        Row: {
          account_count: number | null
          assigned_manager: string | null
          country: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          parent_territory_id: string | null
          quota_amount: number | null
          quota_currency: string | null
          region: string | null
          tenant_id: string | null
          territory_name: string
          updated_at: string | null
        }
        Insert: {
          account_count?: number | null
          assigned_manager?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          parent_territory_id?: string | null
          quota_amount?: number | null
          quota_currency?: string | null
          region?: string | null
          tenant_id?: string | null
          territory_name: string
          updated_at?: string | null
        }
        Update: {
          account_count?: number | null
          assigned_manager?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          parent_territory_id?: string | null
          quota_amount?: number | null
          quota_currency?: string | null
          region?: string | null
          tenant_id?: string | null
          territory_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_territories_parent_territory_id_fkey"
            columns: ["parent_territory_id"]
            isOneToOne: false
            referencedRelation: "sales_territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_territories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_versions: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          description: string | null
          id: string
          is_reversible: boolean | null
          rollback_sql: string | null
          status: string | null
          version: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          description?: string | null
          id?: string
          is_reversible?: boolean | null
          rollback_sql?: string | null
          status?: string | null
          version: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          description?: string | null
          id?: string
          is_reversible?: boolean | null
          rollback_sql?: string | null
          status?: string | null
          version?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sensor_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          auto_action_taken: string | null
          created_at: string | null
          id: string
          message: string
          resolved_at: string | null
          sensor_type: string
          severity: string | null
          threshold_value: number | null
          value_recorded: number | null
          vehicle_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          auto_action_taken?: string | null
          created_at?: string | null
          id?: string
          message: string
          resolved_at?: string | null
          sensor_type: string
          severity?: string | null
          threshold_value?: number | null
          value_recorded?: number | null
          vehicle_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          auto_action_taken?: string | null
          created_at?: string | null
          id?: string
          message?: string
          resolved_at?: string | null
          sensor_type?: string
          severity?: string | null
          threshold_value?: number | null
          value_recorded?: number | null
          vehicle_id?: string
        }
        Relationships: []
      }
      sensor_thresholds: {
        Row: {
          auto_action: string | null
          created_at: string | null
          critical_max: number | null
          critical_min: number | null
          id: string
          is_active: boolean | null
          max_safe_value: number | null
          min_safe_value: number | null
          sensor_type: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          auto_action?: string | null
          created_at?: string | null
          critical_max?: number | null
          critical_min?: number | null
          id?: string
          is_active?: boolean | null
          max_safe_value?: number | null
          min_safe_value?: number | null
          sensor_type: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_action?: string | null
          created_at?: string | null
          critical_max?: number | null
          critical_min?: number | null
          id?: string
          is_active?: boolean | null
          max_safe_value?: number | null
          min_safe_value?: number | null
          sensor_type?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      session_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_read: boolean | null
          is_resolved: boolean | null
          message: string
          resolved_at: string | null
          resolved_by: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_alerts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_obligations: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          batch_id: string | null
          created_at: string
          currency: string
          customer_tenant_id: string | null
          failed_reason: string | null
          id: string
          net_payable: number | null
          obligation_type: string
          organization_id: string | null
          paid_at: string | null
          partner_id: string | null
          reserve_amount: number | null
          source_invoice_id: string | null
          source_payment_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: string | null
          created_at?: string
          currency?: string
          customer_tenant_id?: string | null
          failed_reason?: string | null
          id?: string
          net_payable?: number | null
          obligation_type: string
          organization_id?: string | null
          paid_at?: string | null
          partner_id?: string | null
          reserve_amount?: number | null
          source_invoice_id?: string | null
          source_payment_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: string | null
          created_at?: string
          currency?: string
          customer_tenant_id?: string | null
          failed_reason?: string | null
          id?: string
          net_payable?: number | null
          obligation_type?: string
          organization_id?: string | null
          paid_at?: string | null
          partner_id?: string | null
          reserve_amount?: number | null
          source_invoice_id?: string | null
          source_payment_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_obligations_customer_tenant_id_fkey"
            columns: ["customer_tenant_id"]
            isOneToOne: false
            referencedRelation: "partner_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_obligations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      shelf_audits: {
        Row: {
          audit_date: string | null
          audit_type: string
          compliance_score: number | null
          created_at: string | null
          id: string
          issues_found: Json | null
          merchandiser_id: string | null
          notes: string | null
          outlet_name: string
          photo_urls: string[] | null
          sku_visibility: Json | null
        }
        Insert: {
          audit_date?: string | null
          audit_type?: string
          compliance_score?: number | null
          created_at?: string | null
          id?: string
          issues_found?: Json | null
          merchandiser_id?: string | null
          notes?: string | null
          outlet_name: string
          photo_urls?: string[] | null
          sku_visibility?: Json | null
        }
        Update: {
          audit_date?: string | null
          audit_type?: string
          compliance_score?: number | null
          created_at?: string | null
          id?: string
          issues_found?: Json | null
          merchandiser_id?: string | null
          notes?: string | null
          outlet_name?: string
          photo_urls?: string[] | null
          sku_visibility?: Json | null
        }
        Relationships: []
      }
      side_hustle_trips: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          delivery_address: string
          driver_id: string
          driver_net_amount: number
          id: string
          notes: string | null
          organization_id: string | null
          owner_override_amount: number | null
          owner_override_percent: number | null
          pickup_address: string
          platform_commission_amount: number
          platform_commission_percent: number
          revenue: number
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          delivery_address: string
          driver_id: string
          driver_net_amount?: number
          id?: string
          notes?: string | null
          organization_id?: string | null
          owner_override_amount?: number | null
          owner_override_percent?: number | null
          pickup_address: string
          platform_commission_amount?: number
          platform_commission_percent?: number
          revenue?: number
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          delivery_address?: string
          driver_id?: string
          driver_net_amount?: number
          id?: string
          notes?: string | null
          organization_id?: string | null
          owner_override_amount?: number | null
          owner_override_percent?: number | null
          pickup_address?: string
          platform_commission_amount?: number
          platform_commission_percent?: number
          revenue?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "side_hustle_trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "side_hustle_trips_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_breach_alerts: {
        Row: {
          actual_time: string | null
          alert_sent: boolean | null
          breach_type: string
          created_at: string
          delay_hours: number | null
          dispatch_id: string
          expected_time: string | null
          id: string
          is_resolved: boolean | null
          notes: string | null
          organization_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          waypoint_id: string | null
        }
        Insert: {
          actual_time?: string | null
          alert_sent?: boolean | null
          breach_type: string
          created_at?: string
          delay_hours?: number | null
          dispatch_id: string
          expected_time?: string | null
          id?: string
          is_resolved?: boolean | null
          notes?: string | null
          organization_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          waypoint_id?: string | null
        }
        Update: {
          actual_time?: string | null
          alert_sent?: boolean | null
          breach_type?: string
          created_at?: string
          delay_hours?: number | null
          dispatch_id?: string
          expected_time?: string | null
          id?: string
          is_resolved?: boolean | null
          notes?: string | null
          organization_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          waypoint_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_breach_alerts_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_breach_alerts_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_breach_alerts_waypoint_id_fkey"
            columns: ["waypoint_id"]
            isOneToOne: false
            referencedRelation: "route_waypoints"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_breach_records: {
        Row: {
          actual_completion: string | null
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          breach_status: string | null
          created_at: string | null
          customer_id: string | null
          days_breached: number | null
          dispatch_id: string | null
          flagged_at: string | null
          flagged_by: string | null
          grace_period_applied: boolean | null
          id: string
          insurance_coverage_applied: number | null
          insurance_policy_id: string | null
          invoice_id: string | null
          invoice_line_item_id: string | null
          net_penalty_after_insurance: number | null
          organization_id: string | null
          penalty_per_day: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          route_id: string | null
          sla_contract_id: string | null
          sla_deadline: string
          sla_policy_id: string | null
          total_penalty: number | null
          updated_at: string | null
        }
        Insert: {
          actual_completion?: string | null
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          breach_status?: string | null
          created_at?: string | null
          customer_id?: string | null
          days_breached?: number | null
          dispatch_id?: string | null
          flagged_at?: string | null
          flagged_by?: string | null
          grace_period_applied?: boolean | null
          id?: string
          insurance_coverage_applied?: number | null
          insurance_policy_id?: string | null
          invoice_id?: string | null
          invoice_line_item_id?: string | null
          net_penalty_after_insurance?: number | null
          organization_id?: string | null
          penalty_per_day?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          route_id?: string | null
          sla_contract_id?: string | null
          sla_deadline: string
          sla_policy_id?: string | null
          total_penalty?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_completion?: string | null
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          breach_status?: string | null
          created_at?: string | null
          customer_id?: string | null
          days_breached?: number | null
          dispatch_id?: string | null
          flagged_at?: string | null
          flagged_by?: string | null
          grace_period_applied?: boolean | null
          id?: string
          insurance_coverage_applied?: number | null
          insurance_policy_id?: string | null
          invoice_id?: string | null
          invoice_line_item_id?: string | null
          net_penalty_after_insurance?: number | null
          organization_id?: string | null
          penalty_per_day?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          route_id?: string | null
          sla_contract_id?: string | null
          sla_deadline?: string
          sla_policy_id?: string | null
          total_penalty?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_breach_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_breach_records_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_breach_records_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_breach_records_insurance_policy_id_fkey"
            columns: ["insurance_policy_id"]
            isOneToOne: false
            referencedRelation: "sla_insurance_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_breach_records_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_breach_records_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_breach_records_sla_contract_id_fkey"
            columns: ["sla_contract_id"]
            isOneToOne: false
            referencedRelation: "sla_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_breach_records_sla_policy_id_fkey"
            columns: ["sla_policy_id"]
            isOneToOne: false
            referencedRelation: "sla_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_contracts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          contract_name: string
          contract_number: string
          contract_pdf_url: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          dispute_resolution_clause: string | null
          effective_date: string
          expiry_date: string | null
          force_majeure_exclusions: string[] | null
          grace_period_hours: number | null
          id: string
          max_penalty_cap: number | null
          organization_id: string | null
          penalty_per_day: number
          signed_at: string | null
          signed_by: string | null
          sla_duration_days: number
          status: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          contract_name: string
          contract_number: string
          contract_pdf_url?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          dispute_resolution_clause?: string | null
          effective_date: string
          expiry_date?: string | null
          force_majeure_exclusions?: string[] | null
          grace_period_hours?: number | null
          id?: string
          max_penalty_cap?: number | null
          organization_id?: string | null
          penalty_per_day?: number
          signed_at?: string | null
          signed_by?: string | null
          sla_duration_days: number
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          contract_name?: string
          contract_number?: string
          contract_pdf_url?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          dispute_resolution_clause?: string | null
          effective_date?: string
          expiry_date?: string | null
          force_majeure_exclusions?: string[] | null
          grace_period_hours?: number | null
          id?: string
          max_penalty_cap?: number | null
          organization_id?: string | null
          penalty_per_day?: number
          signed_at?: string | null
          signed_by?: string | null
          sla_duration_days?: number
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_insurance_policies: {
        Row: {
          coverage_amount_max: number
          coverage_days_max: number
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          exclusions: string[] | null
          id: string
          insurance_fee_type: string | null
          insurance_fee_value: number
          is_active: boolean | null
          policy_name: string
          policy_type: string
          sla_contract_id: string | null
          updated_at: string | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          coverage_amount_max: number
          coverage_days_max?: number
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          exclusions?: string[] | null
          id?: string
          insurance_fee_type?: string | null
          insurance_fee_value: number
          is_active?: boolean | null
          policy_name: string
          policy_type: string
          sla_contract_id?: string | null
          updated_at?: string | null
          valid_from: string
          valid_until?: string | null
        }
        Update: {
          coverage_amount_max?: number
          coverage_days_max?: number
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          exclusions?: string[] | null
          id?: string
          insurance_fee_type?: string | null
          insurance_fee_value?: number
          is_active?: boolean | null
          policy_name?: string
          policy_type?: string
          sla_contract_id?: string | null
          updated_at?: string | null
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_insurance_policies_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_insurance_policies_sla_contract_id_fkey"
            columns: ["sla_contract_id"]
            isOneToOne: false
            referencedRelation: "sla_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_policies: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          grace_period_hours: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          max_penalty_cap: number | null
          name: string
          organization_id: string | null
          penalty_per_day: number | null
          sla_duration_days: number
          state: string | null
          updated_at: string | null
          zone: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          grace_period_hours?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_penalty_cap?: number | null
          name: string
          organization_id?: string | null
          penalty_per_day?: number | null
          sla_duration_days?: number
          state?: string | null
          updated_at?: string | null
          zone: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          grace_period_hours?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_penalty_cap?: number | null
          name?: string
          organization_id?: string | null
          penalty_per_day?: number | null
          sla_duration_days?: number
          state?: string | null
          updated_at?: string | null
          zone?: string
        }
        Relationships: []
      }
      sla_risk_notifications: {
        Row: {
          acknowledged_at: string | null
          ai_recommendation: string | null
          breach_prevented: boolean | null
          created_at: string | null
          customer_id: string | null
          dispatch_id: string | null
          id: string
          mitigation_action_taken: string | null
          notification_content: string | null
          notification_sent_at: string | null
          notification_status: string | null
          notification_type: string
          risk_factors: Json | null
          risk_level: string
          risk_score: number
        }
        Insert: {
          acknowledged_at?: string | null
          ai_recommendation?: string | null
          breach_prevented?: boolean | null
          created_at?: string | null
          customer_id?: string | null
          dispatch_id?: string | null
          id?: string
          mitigation_action_taken?: string | null
          notification_content?: string | null
          notification_sent_at?: string | null
          notification_status?: string | null
          notification_type: string
          risk_factors?: Json | null
          risk_level: string
          risk_score: number
        }
        Update: {
          acknowledged_at?: string | null
          ai_recommendation?: string | null
          breach_prevented?: boolean | null
          created_at?: string | null
          customer_id?: string | null
          dispatch_id?: string | null
          id?: string
          mitigation_action_taken?: string | null
          notification_content?: string | null
          notification_sent_at?: string | null
          notification_status?: string | null
          notification_type?: string
          risk_factors?: Json | null
          risk_level?: string
          risk_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "sla_risk_notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_risk_notifications_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_risk_notifications_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_settings: {
        Row: {
          description: string | null
          id: string
          organization_id: string | null
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          organization_id?: string | null
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          organization_id?: string | null
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      smart_matching_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          final_results: Json | null
          id: string
          partial_results: Json | null
          progress_percentage: number | null
          request_payload: Json | null
          role: string | null
          status: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          final_results?: Json | null
          id?: string
          partial_results?: Json | null
          progress_percentage?: number | null
          request_payload?: Json | null
          role?: string | null
          status?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          final_results?: Json | null
          id?: string
          partial_results?: Json | null
          progress_percentage?: number | null
          request_payload?: Json | null
          role?: string | null
          status?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      smart_matching_metrics: {
        Row: {
          avg_execution_time_ms: number | null
          failure_rate: number | null
          id: string
          recorded_at: string
          region: string | null
          role_type: string | null
          successful_requests: number | null
          total_requests: number | null
        }
        Insert: {
          avg_execution_time_ms?: number | null
          failure_rate?: number | null
          id?: string
          recorded_at?: string
          region?: string | null
          role_type?: string | null
          successful_requests?: number | null
          total_requests?: number | null
        }
        Update: {
          avg_execution_time_ms?: number | null
          failure_rate?: number | null
          id?: string
          recorded_at?: string
          region?: string | null
          role_type?: string | null
          successful_requests?: number | null
          total_requests?: number | null
        }
        Relationships: []
      }
      sme_credit_profiles: {
        Row: {
          business_id: string | null
          business_name: string
          cashflow_stability_index: number | null
          corridor_stability_index: number | null
          country: string
          created_at: string
          created_by: string | null
          credit_score: number | null
          cross_border_frequency: number | null
          default_probability: number | null
          delivery_reliability: number | null
          eligible_limit: number | null
          freight_history_score: number | null
          id: string
          insurance_claims_count: number | null
          insurance_coverage_ratio: number | null
          last_assessed_at: string | null
          payment_consistency: number | null
          status: string | null
          trade_volume: number | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          business_name: string
          cashflow_stability_index?: number | null
          corridor_stability_index?: number | null
          country: string
          created_at?: string
          created_by?: string | null
          credit_score?: number | null
          cross_border_frequency?: number | null
          default_probability?: number | null
          delivery_reliability?: number | null
          eligible_limit?: number | null
          freight_history_score?: number | null
          id?: string
          insurance_claims_count?: number | null
          insurance_coverage_ratio?: number | null
          last_assessed_at?: string | null
          payment_consistency?: number | null
          status?: string | null
          trade_volume?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          business_name?: string
          cashflow_stability_index?: number | null
          corridor_stability_index?: number | null
          country?: string
          created_at?: string
          created_by?: string | null
          credit_score?: number | null
          cross_border_frequency?: number | null
          default_probability?: number | null
          delivery_reliability?: number | null
          eligible_limit?: number | null
          freight_history_score?: number | null
          id?: string
          insurance_claims_count?: number | null
          insurance_coverage_ratio?: number | null
          last_assessed_at?: string | null
          payment_consistency?: number | null
          status?: string | null
          trade_volume?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      sop_owd_reports: {
        Row: {
          analysis_date: string
          compliance_gaps: Json | null
          created_at: string
          created_by: string | null
          dependency_violations: Json | null
          id: string
          logic_flow_issues: Json | null
          missing_steps: Json | null
          overall_status: string
          recommendations: string | null
          redundant_tasks: Json | null
          sop_id: string
          step_statuses: Json | null
        }
        Insert: {
          analysis_date?: string
          compliance_gaps?: Json | null
          created_at?: string
          created_by?: string | null
          dependency_violations?: Json | null
          id?: string
          logic_flow_issues?: Json | null
          missing_steps?: Json | null
          overall_status?: string
          recommendations?: string | null
          redundant_tasks?: Json | null
          sop_id: string
          step_statuses?: Json | null
        }
        Update: {
          analysis_date?: string
          compliance_gaps?: Json | null
          created_at?: string
          created_by?: string | null
          dependency_violations?: Json | null
          id?: string
          logic_flow_issues?: Json | null
          missing_steps?: Json | null
          overall_status?: string
          recommendations?: string | null
          redundant_tasks?: Json | null
          sop_id?: string
          step_statuses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sop_owd_reports_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "ops_sops"
            referencedColumns: ["id"]
          },
        ]
      }
      sovereign_report_snapshots: {
        Row: {
          currency: string
          export_format: string | null
          generated_at: string
          generated_by: string | null
          id: string
          ifrs_compliant: boolean | null
          ipsas_compliant: boolean | null
          organization_id: string | null
          report_data: Json
          report_period: string
          report_type: string
        }
        Insert: {
          currency?: string
          export_format?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          ifrs_compliant?: boolean | null
          ipsas_compliant?: boolean | null
          organization_id?: string | null
          report_data?: Json
          report_period: string
          report_type: string
        }
        Update: {
          currency?: string
          export_format?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          ifrs_compliant?: boolean | null
          ipsas_compliant?: boolean | null
          organization_id?: string | null
          report_data?: Json
          report_period?: string
          report_type?: string
        }
        Relationships: []
      }
      stablecoin_business_wallets: {
        Row: {
          auto_convert_currency: string | null
          auto_convert_enabled: boolean | null
          blockchain_network: string
          business_id: string | null
          created_at: string | null
          custody_provider: string | null
          id: string
          is_active: boolean | null
          linked_bank_account: string | null
          supported_tokens: string[] | null
          tenant_id: string | null
          treasury_policy_id: string | null
          updated_at: string | null
          wallet_address: string
        }
        Insert: {
          auto_convert_currency?: string | null
          auto_convert_enabled?: boolean | null
          blockchain_network?: string
          business_id?: string | null
          created_at?: string | null
          custody_provider?: string | null
          id?: string
          is_active?: boolean | null
          linked_bank_account?: string | null
          supported_tokens?: string[] | null
          tenant_id?: string | null
          treasury_policy_id?: string | null
          updated_at?: string | null
          wallet_address: string
        }
        Update: {
          auto_convert_currency?: string | null
          auto_convert_enabled?: boolean | null
          blockchain_network?: string
          business_id?: string | null
          created_at?: string | null
          custody_provider?: string | null
          id?: string
          is_active?: boolean | null
          linked_bank_account?: string | null
          supported_tokens?: string[] | null
          tenant_id?: string | null
          treasury_policy_id?: string | null
          updated_at?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      stablecoin_compliance_log: {
        Row: {
          capital_controls_flag: boolean | null
          check_type: string
          created_at: string | null
          details: Json | null
          id: string
          jurisdiction: string | null
          reporting_threshold_triggered: boolean | null
          result: string
          tax_implications: string | null
          transaction_id: string | null
        }
        Insert: {
          capital_controls_flag?: boolean | null
          check_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          jurisdiction?: string | null
          reporting_threshold_triggered?: boolean | null
          result: string
          tax_implications?: string | null
          transaction_id?: string | null
        }
        Update: {
          capital_controls_flag?: boolean | null
          check_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          jurisdiction?: string | null
          reporting_threshold_triggered?: boolean | null
          result?: string
          tax_implications?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stablecoin_compliance_log_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "stablecoin_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      stablecoin_corridors: {
        Row: {
          arbitrage_flag: boolean | null
          created_at: string
          destination_country: string
          fx_equivalent_rate: number | null
          id: string
          last_updated: string | null
          liquidity_depth: number | null
          offramp_rate: number | null
          onramp_rate: number | null
          origin_country: string
          spread_percentage: number | null
          stablecoin_symbol: string
          volatility_index: number | null
        }
        Insert: {
          arbitrage_flag?: boolean | null
          created_at?: string
          destination_country: string
          fx_equivalent_rate?: number | null
          id?: string
          last_updated?: string | null
          liquidity_depth?: number | null
          offramp_rate?: number | null
          onramp_rate?: number | null
          origin_country: string
          spread_percentage?: number | null
          stablecoin_symbol: string
          volatility_index?: number | null
        }
        Update: {
          arbitrage_flag?: boolean | null
          created_at?: string
          destination_country?: string
          fx_equivalent_rate?: number | null
          id?: string
          last_updated?: string | null
          liquidity_depth?: number | null
          offramp_rate?: number | null
          onramp_rate?: number | null
          origin_country?: string
          spread_percentage?: number | null
          stablecoin_symbol?: string
          volatility_index?: number | null
        }
        Relationships: []
      }
      stablecoin_transactions: {
        Row: {
          aml_flag: string | null
          aml_risk_score: number | null
          amount: number
          block_number: number | null
          blockchain_network: string
          created_at: string | null
          exchange_source: string | null
          fiat_conversion_rate: number | null
          gas_fee: number | null
          id: string
          institutional_wallet: boolean | null
          linked_entity_id: string | null
          linked_entity_type: string | null
          linked_invoice_id: string | null
          mixer_exposure: boolean | null
          review_notes: string | null
          reviewed_by: string | null
          sanctions_check_status: string | null
          sender_country_estimated: string | null
          settlement_status: string | null
          stablecoin_type: string
          tenant_id: string | null
          transaction_hash: string
          updated_at: string | null
          wallet_address_receiver: string
          wallet_address_sender: string
          wallet_age_days: number | null
          wallet_risk_score: number | null
        }
        Insert: {
          aml_flag?: string | null
          aml_risk_score?: number | null
          amount?: number
          block_number?: number | null
          blockchain_network?: string
          created_at?: string | null
          exchange_source?: string | null
          fiat_conversion_rate?: number | null
          gas_fee?: number | null
          id?: string
          institutional_wallet?: boolean | null
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          linked_invoice_id?: string | null
          mixer_exposure?: boolean | null
          review_notes?: string | null
          reviewed_by?: string | null
          sanctions_check_status?: string | null
          sender_country_estimated?: string | null
          settlement_status?: string | null
          stablecoin_type?: string
          tenant_id?: string | null
          transaction_hash: string
          updated_at?: string | null
          wallet_address_receiver: string
          wallet_address_sender: string
          wallet_age_days?: number | null
          wallet_risk_score?: number | null
        }
        Update: {
          aml_flag?: string | null
          aml_risk_score?: number | null
          amount?: number
          block_number?: number | null
          blockchain_network?: string
          created_at?: string | null
          exchange_source?: string | null
          fiat_conversion_rate?: number | null
          gas_fee?: number | null
          id?: string
          institutional_wallet?: boolean | null
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          linked_invoice_id?: string | null
          mixer_exposure?: boolean | null
          review_notes?: string | null
          reviewed_by?: string | null
          sanctions_check_status?: string | null
          sender_country_estimated?: string | null
          settlement_status?: string | null
          stablecoin_type?: string
          tenant_id?: string | null
          transaction_hash?: string
          updated_at?: string | null
          wallet_address_receiver?: string
          wallet_address_sender?: string
          wallet_age_days?: number | null
          wallet_risk_score?: number | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          annual_rent_relief: number | null
          base_salary: number | null
          created_at: string
          created_by: string | null
          department: string | null
          email: string | null
          employment_type: string
          full_name: string
          hire_date: string | null
          id: string
          job_title: string
          life_insurance: number | null
          nhf_contribution: number | null
          nhis_contribution: number | null
          organization_id: string | null
          partner_id: string | null
          pension_contribution: number | null
          phone: string | null
          salary_type: string
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          annual_rent_relief?: number | null
          base_salary?: number | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          employment_type?: string
          full_name: string
          hire_date?: string | null
          id?: string
          job_title: string
          life_insurance?: number | null
          nhf_contribution?: number | null
          nhis_contribution?: number | null
          organization_id?: string | null
          partner_id?: string | null
          pension_contribution?: number | null
          phone?: string | null
          salary_type?: string
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          annual_rent_relief?: number | null
          base_salary?: number | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          employment_type?: string
          full_name?: string
          hire_date?: string | null
          id?: string
          job_title?: string
          life_insurance?: number | null
          nhf_contribution?: number | null
          nhis_contribution?: number | null
          organization_id?: string | null
          partner_id?: string | null
          pension_contribution?: number | null
          phone?: string | null
          salary_type?: string
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_kpi_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          metadata: Json | null
          metric_key: string
          metric_label: string | null
          metric_value: number
          organization_id: string | null
          role_tag: string | null
          source: string | null
          staff_id: string | null
          target_value: number | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_date?: string
          id?: string
          metadata?: Json | null
          metric_key: string
          metric_label?: string | null
          metric_value?: number
          organization_id?: string | null
          role_tag?: string | null
          source?: string | null
          staff_id?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          metadata?: Json | null
          metric_key?: string
          metric_label?: string | null
          metric_value?: number
          organization_id?: string | null
          role_tag?: string | null
          source?: string | null
          staff_id?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_kpi_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_kpi_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_performance_scores: {
        Row: {
          ai_summary: string | null
          attendance_score: number | null
          computed_by: string | null
          created_at: string
          gaps: Json | null
          id: string
          organization_id: string | null
          period_end: string
          period_start: string
          period_type: string
          productivity_score: number | null
          quality_score: number | null
          recommendations: Json | null
          score: number
          staff_id: string | null
          strengths: Json | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          attendance_score?: number | null
          computed_by?: string | null
          created_at?: string
          gaps?: Json | null
          id?: string
          organization_id?: string | null
          period_end: string
          period_start: string
          period_type?: string
          productivity_score?: number | null
          quality_score?: number | null
          recommendations?: Json | null
          score?: number
          staff_id?: string | null
          strengths?: Json | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          attendance_score?: number | null
          computed_by?: string | null
          created_at?: string
          gaps?: Json | null
          id?: string
          organization_id?: string | null
          period_end?: string
          period_start?: string
          period_type?: string
          productivity_score?: number | null
          quality_score?: number | null
          recommendations?: Json | null
          score?: number
          staff_id?: string | null
          strengths?: Json | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_performance_scores_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_performance_scores_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_salaries: {
        Row: {
          created_at: string
          created_by: string | null
          firs_submission_date: string | null
          gross_amount: number
          id: string
          net_amount: number | null
          notes: string | null
          organization_id: string | null
          period_end: string | null
          period_start: string | null
          remita_rrr: string | null
          remita_status: string | null
          salary_type: string
          staff_id: string
          status: string | null
          tax_amount: number | null
          taxable_income: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          firs_submission_date?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number | null
          notes?: string | null
          organization_id?: string | null
          period_end?: string | null
          period_start?: string | null
          remita_rrr?: string | null
          remita_status?: string | null
          salary_type: string
          staff_id: string
          status?: string | null
          tax_amount?: number | null
          taxable_income?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          firs_submission_date?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number | null
          notes?: string | null
          organization_id?: string | null
          period_end?: string | null
          period_start?: string | null
          remita_rrr?: string | null
          remita_status?: string | null
          salary_type?: string
          staff_id?: string
          status?: string | null
          tax_amount?: number | null
          taxable_income?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_salaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_salaries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_salaries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_sensitive_details: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          created_at: string
          organization_id: string | null
          staff_id: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          organization_id?: string | null
          staff_id: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          organization_id?: string | null
          staff_id?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_sensitive_details_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_sensitive_details_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_signins: {
        Row: {
          created_at: string
          device_info: Json | null
          id: string
          notes: string | null
          organization_id: string | null
          selfie_url: string | null
          signin_at: string | null
          signin_date: string
          signin_lat: number | null
          signin_lng: number | null
          signout_at: string | null
          signout_lat: number | null
          signout_lng: number | null
          staff_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          selfie_url?: string | null
          signin_at?: string | null
          signin_date?: string
          signin_lat?: number | null
          signin_lng?: number | null
          signout_at?: string | null
          signout_lat?: number | null
          signout_lng?: number | null
          staff_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          selfie_url?: string | null
          signin_at?: string | null
          signin_date?: string
          signin_lat?: number | null
          signin_lng?: number | null
          signout_at?: string | null
          signout_lat?: number | null
          signout_lng?: number | null
          staff_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_signins_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_signins_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          amount: number
          billing_cycle: string | null
          created_at: string
          currency: string
          gateway_response: Json | null
          id: string
          next_billing_date: string | null
          organization_id: string
          paid_at: string | null
          payment_channel: string | null
          payment_reference: string | null
          plan_name: string
          status: string
        }
        Insert: {
          amount: number
          billing_cycle?: string | null
          created_at?: string
          currency?: string
          gateway_response?: Json | null
          id?: string
          next_billing_date?: string | null
          organization_id: string
          paid_at?: string | null
          payment_channel?: string | null
          payment_reference?: string | null
          plan_name: string
          status?: string
        }
        Update: {
          amount?: number
          billing_cycle?: string | null
          created_at?: string
          currency?: string
          gateway_response?: Json | null
          id?: string
          next_billing_date?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_channel?: string | null
          payment_reference?: string | null
          plan_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          api_access: boolean
          created_at: string
          currency: string
          features: Json
          id: string
          is_active: boolean
          max_users: number | null
          max_vehicles: number | null
          name: string
          price_monthly: number
          price_yearly: number | null
          reseller_enabled: boolean
          tier: Database["public"]["Enums"]["subscription_tier"]
          white_label_enabled: boolean
        }
        Insert: {
          api_access?: boolean
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_users?: number | null
          max_vehicles?: number | null
          name: string
          price_monthly: number
          price_yearly?: number | null
          reseller_enabled?: boolean
          tier: Database["public"]["Enums"]["subscription_tier"]
          white_label_enabled?: boolean
        }
        Update: {
          api_access?: boolean
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_users?: number | null
          max_vehicles?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          reseller_enabled?: boolean
          tier?: Database["public"]["Enums"]["subscription_tier"]
          white_label_enabled?: boolean
        }
        Relationships: []
      }
      super_admin_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      support_csat_audit: {
        Row: {
          comment: string | null
          csat_pct: number
          csat_rating: number
          id: string
          organization_id: string
          submitted_at: string
          submitter_ip: string | null
          ticket_id: string
          user_agent: string | null
        }
        Insert: {
          comment?: string | null
          csat_pct: number
          csat_rating: number
          id?: string
          organization_id: string
          submitted_at?: string
          submitter_ip?: string | null
          ticket_id: string
          user_agent?: string | null
        }
        Update: {
          comment?: string | null
          csat_pct?: number
          csat_rating?: number
          id?: string
          organization_id?: string
          submitted_at?: string
          submitter_ip?: string | null
          ticket_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_csat_audit_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          organization_id: string
          size_bytes: number | null
          storage_path: string
          ticket_id: string
          uploaded_by: string | null
          uploaded_via: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          organization_id: string
          size_bytes?: number | null
          storage_path: string
          ticket_id: string
          uploaded_by?: string | null
          uploaded_via?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          organization_id?: string
          size_bytes?: number | null
          storage_path?: string
          ticket_id?: string
          uploaded_by?: string | null
          uploaded_via?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_audit: {
        Row: {
          actor_id: string | null
          actor_label: string | null
          created_at: string
          event_type: string
          from_value: string | null
          id: string
          meta: Json | null
          organization_id: string
          ticket_id: string
          to_value: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          event_type: string
          from_value?: string | null
          id?: string
          meta?: Json | null
          organization_id: string
          ticket_id: string
          to_value?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          event_type?: string
          from_value?: string | null
          id?: string
          meta?: Json | null
          organization_id?: string
          ticket_id?: string
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_audit_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_internal: boolean
          message: string
          sender: string
          sent_by: string | null
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          sender: string
          sent_by?: string | null
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          sender?: string
          sent_by?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assignee: string | null
          channel: string
          complainant_email: string | null
          complainant_phone: string | null
          created_at: string
          created_by: string | null
          csat: number | null
          csat_link_expires_at: string | null
          csat_link_sent_at: string | null
          csat_reminder_sent_at: string | null
          csat_submitted_at: string | null
          customer_name: string
          dispatch_id: string | null
          first_response_at: string | null
          id: string
          order_id: string | null
          organization_id: string | null
          priority: string
          public_token: string
          ref: string
          resolution_notes: string | null
          resolved_at: string | null
          sla_deadline: string
          status: string
          subject: string
          submitted_via: string
          tag: string
          ticket_category: string | null
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          channel: string
          complainant_email?: string | null
          complainant_phone?: string | null
          created_at?: string
          created_by?: string | null
          csat?: number | null
          csat_link_expires_at?: string | null
          csat_link_sent_at?: string | null
          csat_reminder_sent_at?: string | null
          csat_submitted_at?: string | null
          customer_name: string
          dispatch_id?: string | null
          first_response_at?: string | null
          id?: string
          order_id?: string | null
          organization_id?: string | null
          priority?: string
          public_token?: string
          ref?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          sla_deadline?: string
          status?: string
          subject: string
          submitted_via?: string
          tag?: string
          ticket_category?: string | null
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          channel?: string
          complainant_email?: string | null
          complainant_phone?: string | null
          created_at?: string
          created_by?: string | null
          csat?: number | null
          csat_link_expires_at?: string | null
          csat_link_sent_at?: string | null
          csat_reminder_sent_at?: string | null
          csat_submitted_at?: string | null
          customer_name?: string
          dispatch_id?: string | null
          first_response_at?: string | null
          id?: string
          order_id?: string | null
          organization_id?: string | null
          priority?: string
          public_token?: string
          ref?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          sla_deadline?: string
          status?: string
          subject?: string
          submitted_via?: string
          tag?: string
          ticket_category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supported_languages: {
        Row: {
          code: string
          coverage_percent: number
          created_at: string
          direction: string
          is_active: boolean
          name: string
          native_name: string
        }
        Insert: {
          code: string
          coverage_percent?: number
          created_at?: string
          direction?: string
          is_active?: boolean
          name: string
          native_name: string
        }
        Update: {
          code?: string
          coverage_percent?: number
          created_at?: string
          direction?: string
          is_active?: boolean
          name?: string
          native_name?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      suspense_cases: {
        Row: {
          assigned_to: string | null
          case_type: string
          created_at: string
          currency: string | null
          customer_id: string | null
          id: string
          impacted_value: number | null
          organization_id: string | null
          partner_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resulting_ledger_entry_id: string | null
          root_cause: string | null
          severity: string
          sla_due_date: string | null
          source_system: string | null
          status: string
        }
        Insert: {
          assigned_to?: string | null
          case_type: string
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          id?: string
          impacted_value?: number | null
          organization_id?: string | null
          partner_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resulting_ledger_entry_id?: string | null
          root_cause?: string | null
          severity?: string
          sla_due_date?: string | null
          source_system?: string | null
          status?: string
        }
        Update: {
          assigned_to?: string | null
          case_type?: string
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          id?: string
          impacted_value?: number | null
          organization_id?: string | null
          partner_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resulting_ledger_entry_id?: string | null
          root_cause?: string | null
          severity?: string
          sla_due_date?: string | null
          source_system?: string | null
          status?: string
        }
        Relationships: []
      }
      target_approvals: {
        Row: {
          approver_id: string
          comments: string | null
          created_at: string
          id: string
          status: string
          target_id: string
          updated_at: string
        }
        Insert: {
          approver_id: string
          comments?: string | null
          created_at?: string
          id?: string
          status?: string
          target_id: string
          updated_at?: string
        }
        Update: {
          approver_id?: string
          comments?: string | null
          created_at?: string
          id?: string
          status?: string
          target_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "target_approvals_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "financial_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_filing_reports: {
        Row: {
          country_code: string
          created_at: string | null
          filing_deadline: string | null
          id: string
          net_vat_payable: number | null
          notes: string | null
          period_end: string
          period_start: string
          status: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_input_vat: number | null
          total_output_vat: number | null
          updated_at: string | null
        }
        Insert: {
          country_code?: string
          created_at?: string | null
          filing_deadline?: string | null
          id?: string
          net_vat_payable?: number | null
          notes?: string | null
          period_end: string
          period_start: string
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_input_vat?: number | null
          total_output_vat?: number | null
          updated_at?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          filing_deadline?: string | null
          id?: string
          net_vat_payable?: number | null
          notes?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_input_vat?: number | null
          total_output_vat?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tax_ledger: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          direction: string
          id: string
          period: string | null
          related_id: string | null
          related_type: string | null
          status: string | null
          tax_rate_applied: number | null
          tax_type: string
          vendor_name: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          description?: string | null
          direction: string
          id?: string
          period?: string | null
          related_id?: string | null
          related_type?: string | null
          status?: string | null
          tax_rate_applied?: number | null
          tax_type: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          direction?: string
          id?: string
          period?: string | null
          related_id?: string | null
          related_type?: string | null
          status?: string | null
          tax_rate_applied?: number | null
          tax_type?: string
          vendor_name?: string | null
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          country_code: string
          created_at: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean | null
          rate_percentage: number
          tax_name: string
          tax_type: string
        }
        Insert: {
          country_code: string
          created_at?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          rate_percentage: number
          tax_name: string
          tax_type: string
        }
        Update: {
          country_code?: string
          created_at?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          rate_percentage?: number
          tax_name?: string
          tax_type?: string
        }
        Relationships: []
      }
      tax_remittances: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          organization_id: string | null
          period_end: string
          period_start: string
          receipt_url: string | null
          reference_number: string | null
          remittance_type: string
          remitted_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          period_end: string
          period_start: string
          receipt_url?: string | null
          reference_number?: string | null
          remittance_type: string
          remitted_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          period_end?: string
          period_start?: string
          receipt_url?: string | null
          reference_number?: string | null
          remittance_type?: string
          remitted_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_remittances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_access_requests: {
        Row: {
          approved_by: string | null
          created_at: string | null
          id: string
          manager_user_id: string | null
          os_context: string
          rejected_by: string | null
          rejection_reason: string | null
          requested_role: string
          requester_email: string | null
          requester_name: string | null
          requester_user_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          id?: string
          manager_user_id?: string | null
          os_context?: string
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_role: string
          requester_email?: string | null
          requester_name?: string | null
          requester_user_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          id?: string
          manager_user_id?: string | null
          os_context?: string
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_role?: string
          requester_email?: string | null
          requester_name?: string | null
          requester_user_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tenant_billing_ledger: {
        Row: {
          billing_period: string
          billing_type: string
          created_at: string
          currency: string
          drop_fee_rate: number
          drop_fee_total: number
          drops: number
          gross_amount: number
          id: string
          monthly_fee: number
          net_tenant_charge: number
          reseller_amount: number
          reseller_id: string | null
          routeace_cut_amount: number
          routeace_cut_percent: number
          status: string
          tenant_id: string
          total_with_vat: number
          updated_at: string
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          billing_period: string
          billing_type?: string
          created_at?: string
          currency?: string
          drop_fee_rate?: number
          drop_fee_total?: number
          drops?: number
          gross_amount?: number
          id?: string
          monthly_fee?: number
          net_tenant_charge?: number
          reseller_amount?: number
          reseller_id?: string | null
          routeace_cut_amount?: number
          routeace_cut_percent?: number
          status?: string
          tenant_id: string
          total_with_vat?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          billing_period?: string
          billing_type?: string
          created_at?: string
          currency?: string
          drop_fee_rate?: number
          drop_fee_total?: number
          drops?: number
          gross_amount?: number
          id?: string
          monthly_fee?: number
          net_tenant_charge?: number
          reseller_amount?: number
          reseller_id?: string | null
          routeace_cut_amount?: number
          routeace_cut_percent?: number
          status?: string
          tenant_id?: string
          total_with_vat?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_billing_ledger_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_billing_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_config: {
        Row: {
          admin_phone: string | null
          ai_auto_purchase: boolean | null
          ai_autonomy_mode: string
          ai_budget_cap: number | null
          ai_credits_rollover: number | null
          ai_credits_total: number | null
          ai_credits_used: number | null
          billing_currency: string | null
          billing_cycle: string | null
          branch_count: number | null
          business_email: string | null
          company_name: string
          company_size: string | null
          country: string | null
          created_at: string | null
          dept_erp_system: string | null
          dept_industry: string | null
          dept_operating_regions: string | null
          dept_plan: string | null
          dept_team_size: number | null
          dept_warehouse_count: string | null
          dispatch_approval_required: boolean | null
          enable_website_builder: boolean
          enabled_modules: Json | null
          fleet_count: number | null
          high_value_dispatch_threshold: number | null
          id: string
          maintenance_logging_required: boolean | null
          max_api_calls: number | null
          max_branches: number | null
          max_integrations: number | null
          max_monthly_dispatches: number | null
          max_users: number | null
          max_vehicles: number | null
          mode_locked_at: string | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_step: number | null
          operating_cities: string[] | null
          operating_model: string
          ops_can_add_drivers: boolean | null
          ops_can_add_fleet: boolean | null
          ops_can_add_maintenance: boolean | null
          ops_can_add_vehicles: boolean | null
          ops_can_approve_dispatch: boolean | null
          ops_can_connect_integrations: boolean | null
          ops_can_create_dispatch: boolean | null
          ops_can_edit_customers: boolean | null
          ops_can_generate_waybill: boolean | null
          ops_can_manage_order_inbox: boolean | null
          ops_can_see_billing: boolean | null
          ops_can_see_finance: boolean | null
          order_channels: string[] | null
          organization_id: string | null
          ownership_type: string | null
          plan_started_at: string | null
          plan_tier: string
          show_demo_previews: boolean
          tax_id: string | null
          tenant_mode: string
          updated_at: string | null
          user_id: string
          uses_warehouse_dispatch: boolean
          vehicle_classes: string[] | null
          vehicle_count: number | null
          waybill_auto_generate: boolean | null
        }
        Insert: {
          admin_phone?: string | null
          ai_auto_purchase?: boolean | null
          ai_autonomy_mode?: string
          ai_budget_cap?: number | null
          ai_credits_rollover?: number | null
          ai_credits_total?: number | null
          ai_credits_used?: number | null
          billing_currency?: string | null
          billing_cycle?: string | null
          branch_count?: number | null
          business_email?: string | null
          company_name?: string
          company_size?: string | null
          country?: string | null
          created_at?: string | null
          dept_erp_system?: string | null
          dept_industry?: string | null
          dept_operating_regions?: string | null
          dept_plan?: string | null
          dept_team_size?: number | null
          dept_warehouse_count?: string | null
          dispatch_approval_required?: boolean | null
          enable_website_builder?: boolean
          enabled_modules?: Json | null
          fleet_count?: number | null
          high_value_dispatch_threshold?: number | null
          id?: string
          maintenance_logging_required?: boolean | null
          max_api_calls?: number | null
          max_branches?: number | null
          max_integrations?: number | null
          max_monthly_dispatches?: number | null
          max_users?: number | null
          max_vehicles?: number | null
          mode_locked_at?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_step?: number | null
          operating_cities?: string[] | null
          operating_model?: string
          ops_can_add_drivers?: boolean | null
          ops_can_add_fleet?: boolean | null
          ops_can_add_maintenance?: boolean | null
          ops_can_add_vehicles?: boolean | null
          ops_can_approve_dispatch?: boolean | null
          ops_can_connect_integrations?: boolean | null
          ops_can_create_dispatch?: boolean | null
          ops_can_edit_customers?: boolean | null
          ops_can_generate_waybill?: boolean | null
          ops_can_manage_order_inbox?: boolean | null
          ops_can_see_billing?: boolean | null
          ops_can_see_finance?: boolean | null
          order_channels?: string[] | null
          organization_id?: string | null
          ownership_type?: string | null
          plan_started_at?: string | null
          plan_tier?: string
          show_demo_previews?: boolean
          tax_id?: string | null
          tenant_mode?: string
          updated_at?: string | null
          user_id: string
          uses_warehouse_dispatch?: boolean
          vehicle_classes?: string[] | null
          vehicle_count?: number | null
          waybill_auto_generate?: boolean | null
        }
        Update: {
          admin_phone?: string | null
          ai_auto_purchase?: boolean | null
          ai_autonomy_mode?: string
          ai_budget_cap?: number | null
          ai_credits_rollover?: number | null
          ai_credits_total?: number | null
          ai_credits_used?: number | null
          billing_currency?: string | null
          billing_cycle?: string | null
          branch_count?: number | null
          business_email?: string | null
          company_name?: string
          company_size?: string | null
          country?: string | null
          created_at?: string | null
          dept_erp_system?: string | null
          dept_industry?: string | null
          dept_operating_regions?: string | null
          dept_plan?: string | null
          dept_team_size?: number | null
          dept_warehouse_count?: string | null
          dispatch_approval_required?: boolean | null
          enable_website_builder?: boolean
          enabled_modules?: Json | null
          fleet_count?: number | null
          high_value_dispatch_threshold?: number | null
          id?: string
          maintenance_logging_required?: boolean | null
          max_api_calls?: number | null
          max_branches?: number | null
          max_integrations?: number | null
          max_monthly_dispatches?: number | null
          max_users?: number | null
          max_vehicles?: number | null
          mode_locked_at?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_step?: number | null
          operating_cities?: string[] | null
          operating_model?: string
          ops_can_add_drivers?: boolean | null
          ops_can_add_fleet?: boolean | null
          ops_can_add_maintenance?: boolean | null
          ops_can_add_vehicles?: boolean | null
          ops_can_approve_dispatch?: boolean | null
          ops_can_connect_integrations?: boolean | null
          ops_can_create_dispatch?: boolean | null
          ops_can_edit_customers?: boolean | null
          ops_can_generate_waybill?: boolean | null
          ops_can_manage_order_inbox?: boolean | null
          ops_can_see_billing?: boolean | null
          ops_can_see_finance?: boolean | null
          order_channels?: string[] | null
          organization_id?: string | null
          ownership_type?: string | null
          plan_started_at?: string | null
          plan_tier?: string
          show_demo_previews?: boolean
          tax_id?: string | null
          tenant_mode?: string
          updated_at?: string | null
          user_id?: string
          uses_warehouse_dispatch?: boolean
          vehicle_classes?: string[] | null
          vehicle_count?: number | null
          waybill_auto_generate?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_isolation_findings: {
        Row: {
          attempted_action: string
          created_at: string
          detail: string | null
          id: string
          observed_rows: number | null
          run_id: string | null
          source_org: string | null
          status: string
          surface: string
          table_or_resource: string
          target_org: string | null
        }
        Insert: {
          attempted_action: string
          created_at?: string
          detail?: string | null
          id?: string
          observed_rows?: number | null
          run_id?: string | null
          source_org?: string | null
          status: string
          surface: string
          table_or_resource: string
          target_org?: string | null
        }
        Update: {
          attempted_action?: string
          created_at?: string
          detail?: string | null
          id?: string
          observed_rows?: number | null
          run_id?: string | null
          source_org?: string | null
          status?: string
          surface?: string
          table_or_resource?: string
          target_org?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_isolation_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "tenant_isolation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_isolation_runs: {
        Row: {
          duration_ms: number | null
          failed: number
          id: string
          notes: string | null
          passed: number
          run_at: string
          total_probes: number
        }
        Insert: {
          duration_ms?: number | null
          failed?: number
          id?: string
          notes?: string | null
          passed?: number
          run_at?: string
          total_probes?: number
        }
        Update: {
          duration_ms?: number | null
          failed?: number
          id?: string
          notes?: string | null
          passed?: number
          run_at?: string
          total_probes?: number
        }
        Relationships: []
      }
      tenant_website_leads: {
        Row: {
          created_at: string | null
          id: string
          lead_company: string | null
          lead_email: string | null
          lead_name: string | null
          lead_phone: string | null
          message: string | null
          service_interest: string | null
          source_page: string | null
          status: string | null
          user_id: string
          website_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_company?: string | null
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          message?: string | null
          service_interest?: string | null
          source_page?: string | null
          status?: string | null
          user_id: string
          website_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_company?: string | null
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          message?: string | null
          service_interest?: string | null
          source_page?: string | null
          status?: string | null
          user_id?: string
          website_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_website_leads_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "tenant_websites"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_website_pages: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          is_published: boolean | null
          page_type: string
          seo_meta: Json | null
          slug: string
          title: string
          updated_at: string | null
          user_id: string
          website_id: string | null
        }
        Insert: {
          content?: Json
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          page_type: string
          seo_meta?: Json | null
          slug: string
          title: string
          updated_at?: string | null
          user_id: string
          website_id?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          page_type?: string
          seo_meta?: Json | null
          slug?: string
          title?: string
          updated_at?: string | null
          user_id?: string
          website_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_website_pages_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "tenant_websites"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_websites: {
        Row: {
          ai_generated_at: string | null
          brand_style: string | null
          cities_served: string[] | null
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string | null
          custom_domain: string | null
          fleet_size: number | null
          id: string
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          organization_id: string | null
          primary_color: string | null
          published_at: string | null
          seo_keywords: string[] | null
          services: string[] | null
          status: string | null
          subdomain: string | null
          tagline: string | null
          target_clients: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_generated_at?: string | null
          brand_style?: string | null
          cities_served?: string[] | null
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string | null
          custom_domain?: string | null
          fleet_size?: number | null
          id?: string
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          organization_id?: string | null
          primary_color?: string | null
          published_at?: string | null
          seo_keywords?: string[] | null
          services?: string[] | null
          status?: string | null
          subdomain?: string | null
          tagline?: string | null
          target_clients?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_generated_at?: string | null
          brand_style?: string | null
          cities_served?: string[] | null
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string | null
          custom_domain?: string | null
          fleet_size?: number | null
          id?: string
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          organization_id?: string | null
          primary_color?: string | null
          published_at?: string | null
          seo_keywords?: string[] | null
          services?: string[] | null
          status?: string | null
          subdomain?: string | null
          tagline?: string | null
          target_clients?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tracking_tokens: {
        Row: {
          created_at: string
          dispatch_id: string
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          created_at?: string
          dispatch_id: string
          expires_at?: string
          id?: string
          token?: string
        }
        Update: {
          created_at?: string
          dispatch_id?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_tokens_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: true
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_tokens_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: true
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_contracts: {
        Row: {
          contract_type: string
          created_at: string | null
          currency: string | null
          effective_date: string | null
          expiry_date: string | null
          id: string
          metadata: Json | null
          party_a_rcid: string | null
          party_b_rcid: string | null
          signed_by_a_at: string | null
          signed_by_b_at: string | null
          status: string | null
          terms: Json | null
          title: string
          total_value: number | null
          updated_at: string | null
        }
        Insert: {
          contract_type: string
          created_at?: string | null
          currency?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          metadata?: Json | null
          party_a_rcid?: string | null
          party_b_rcid?: string | null
          signed_by_a_at?: string | null
          signed_by_b_at?: string | null
          status?: string | null
          terms?: Json | null
          title: string
          total_value?: number | null
          updated_at?: string | null
        }
        Update: {
          contract_type?: string
          created_at?: string | null
          currency?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          metadata?: Json | null
          party_a_rcid?: string | null
          party_b_rcid?: string | null
          signed_by_a_at?: string | null
          signed_by_b_at?: string | null
          status?: string | null
          terms?: Json | null
          title?: string
          total_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_contracts_party_a_rcid_fkey"
            columns: ["party_a_rcid"]
            isOneToOne: false
            referencedRelation: "commerce_identities"
            referencedColumns: ["rcid"]
          },
          {
            foreignKeyName: "trade_contracts_party_b_rcid_fkey"
            columns: ["party_b_rcid"]
            isOneToOne: false
            referencedRelation: "commerce_identities"
            referencedColumns: ["rcid"]
          },
        ]
      }
      trade_disputes: {
        Row: {
          amount_in_dispute: number | null
          complainant_rcid: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          dispute_type: string
          evidence: Json | null
          id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          respondent_rcid: string | null
          status: string | null
          trust_impact: number | null
          updated_at: string | null
        }
        Insert: {
          amount_in_dispute?: number | null
          complainant_rcid?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          dispute_type: string
          evidence?: Json | null
          id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          respondent_rcid?: string | null
          status?: string | null
          trust_impact?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_in_dispute?: number | null
          complainant_rcid?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          dispute_type?: string
          evidence?: Json | null
          id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          respondent_rcid?: string | null
          status?: string | null
          trust_impact?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_disputes_complainant_rcid_fkey"
            columns: ["complainant_rcid"]
            isOneToOne: false
            referencedRelation: "commerce_identities"
            referencedColumns: ["rcid"]
          },
          {
            foreignKeyName: "trade_disputes_respondent_rcid_fkey"
            columns: ["respondent_rcid"]
            isOneToOne: false
            referencedRelation: "commerce_identities"
            referencedColumns: ["rcid"]
          },
        ]
      }
      trade_finance_tokens: {
        Row: {
          amount: number | null
          asset_type: string
          corridor: string | null
          created_at: string
          id: string
          insurance_backed: boolean | null
          investor_class: string | null
          issuance_status: string | null
          linked_freight_contract: string | null
          maturity_date: string | null
          regulatory_tag: string | null
          risk_score: number | null
          token_id: string
          updated_at: string | null
          yield_rate: number | null
        }
        Insert: {
          amount?: number | null
          asset_type?: string
          corridor?: string | null
          created_at?: string
          id?: string
          insurance_backed?: boolean | null
          investor_class?: string | null
          issuance_status?: string | null
          linked_freight_contract?: string | null
          maturity_date?: string | null
          regulatory_tag?: string | null
          risk_score?: number | null
          token_id: string
          updated_at?: string | null
          yield_rate?: number | null
        }
        Update: {
          amount?: number | null
          asset_type?: string
          corridor?: string | null
          created_at?: string
          id?: string
          insurance_backed?: boolean | null
          investor_class?: string | null
          issuance_status?: string | null
          linked_freight_contract?: string | null
          maturity_date?: string | null
          regulatory_tag?: string | null
          risk_score?: number | null
          token_id?: string
          updated_at?: string | null
          yield_rate?: number | null
        }
        Relationships: []
      }
      trade_history_ledger: {
        Row: {
          amount: number | null
          counterparty_rcid: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          dispute_id: string | null
          id: string
          metadata: Json | null
          performance_rating: number | null
          rcid: string | null
          status: string | null
          transaction_type: string
        }
        Insert: {
          amount?: number | null
          counterparty_rcid?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          dispute_id?: string | null
          id?: string
          metadata?: Json | null
          performance_rating?: number | null
          rcid?: string | null
          status?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number | null
          counterparty_rcid?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          dispute_id?: string | null
          id?: string
          metadata?: Json | null
          performance_rating?: number | null
          rcid?: string | null
          status?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_history_ledger_rcid_fkey"
            columns: ["rcid"]
            isOneToOne: false
            referencedRelation: "commerce_identities"
            referencedColumns: ["rcid"]
          },
        ]
      }
      trade_liquidity_exchange: {
        Row: {
          asset_id: string
          asset_name: string
          asset_type: string
          backing_entity_id: string | null
          backing_entity_type: string | null
          created_at: string
          created_by: string | null
          duration_days: number | null
          id: string
          insurance_backing: boolean | null
          insurance_coverage: number | null
          investor_class: string | null
          liquidity_depth: number | null
          maturity_date: string | null
          origin_corridor: string | null
          principal_amount: number
          risk_score: number | null
          status: string
          updated_at: string
          yield_rate: number | null
        }
        Insert: {
          asset_id?: string
          asset_name: string
          asset_type?: string
          backing_entity_id?: string | null
          backing_entity_type?: string | null
          created_at?: string
          created_by?: string | null
          duration_days?: number | null
          id?: string
          insurance_backing?: boolean | null
          insurance_coverage?: number | null
          investor_class?: string | null
          liquidity_depth?: number | null
          maturity_date?: string | null
          origin_corridor?: string | null
          principal_amount?: number
          risk_score?: number | null
          status?: string
          updated_at?: string
          yield_rate?: number | null
        }
        Update: {
          asset_id?: string
          asset_name?: string
          asset_type?: string
          backing_entity_id?: string | null
          backing_entity_type?: string | null
          created_at?: string
          created_by?: string | null
          duration_days?: number | null
          id?: string
          insurance_backing?: boolean | null
          insurance_coverage?: number | null
          investor_class?: string | null
          liquidity_depth?: number | null
          maturity_date?: string | null
          origin_corridor?: string | null
          principal_amount?: number
          risk_score?: number | null
          status?: string
          updated_at?: string
          yield_rate?: number | null
        }
        Relationships: []
      }
      trade_verifications: {
        Row: {
          created_at: string
          documents: Json | null
          entity_name: string
          entity_type: string
          id: string
          score: number | null
          status: string
          updated_at: string
          verification_type: string
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          documents?: Json | null
          entity_name: string
          entity_type: string
          id?: string
          score?: number | null
          status?: string
          updated_at?: string
          verification_type: string
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          documents?: Json | null
          entity_name?: string
          entity_type?: string
          id?: string
          score?: number | null
          status?: string
          updated_at?: string
          verification_type?: string
          verified_by?: string | null
        }
        Relationships: []
      }
      transporter_billing_records: {
        Row: {
          billing_month: string
          created_at: string
          deduct_from_transporter: boolean
          drop_charge: number
          drop_count: number
          id: string
          organization_id: string
          status: string
          total_charge: number | null
          transporter_id: string
          vehicle_charge: number
          vehicle_count: number
        }
        Insert: {
          billing_month: string
          created_at?: string
          deduct_from_transporter?: boolean
          drop_charge?: number
          drop_count?: number
          id?: string
          organization_id: string
          status?: string
          total_charge?: number | null
          transporter_id: string
          vehicle_charge?: number
          vehicle_count?: number
        }
        Update: {
          billing_month?: string
          created_at?: string
          deduct_from_transporter?: boolean
          drop_charge?: number
          drop_count?: number
          id?: string
          organization_id?: string
          status?: string
          total_charge?: number | null
          transporter_id?: string
          vehicle_charge?: number
          vehicle_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "transporter_billing_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transporter_billing_records_transporter_id_fkey"
            columns: ["transporter_id"]
            isOneToOne: false
            referencedRelation: "ld_transporters"
            referencedColumns: ["id"]
          },
        ]
      }
      transporter_invite_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          link_type: string
          max_uses: number | null
          organization_id: string
          token: string
          uses_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link_type?: string
          max_uses?: number | null
          organization_id: string
          token?: string
          uses_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link_type?: string
          max_uses?: number | null
          organization_id?: string
          token?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "transporter_invite_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_digital_exposure: {
        Row: {
          asset_type: string
          created_at: string
          exposure_percentage: number | null
          hedge_ratio: number | null
          id: string
          last_rebalanced: string | null
          recommended_action: string | null
          risk_score: number | null
          tenant_id: string | null
          updated_at: string | null
          volatility_index: number | null
        }
        Insert: {
          asset_type: string
          created_at?: string
          exposure_percentage?: number | null
          hedge_ratio?: number | null
          id?: string
          last_rebalanced?: string | null
          recommended_action?: string | null
          risk_score?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          volatility_index?: number | null
        }
        Update: {
          asset_type?: string
          created_at?: string
          exposure_percentage?: number | null
          hedge_ratio?: number | null
          id?: string
          last_rebalanced?: string | null
          recommended_action?: string | null
          risk_score?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          volatility_index?: number | null
        }
        Relationships: []
      }
      treasury_risk_logs: {
        Row: {
          ai_recommendation: string | null
          created_at: string
          fraud_indicators: Json
          id: string
          liquidity_flags: Json
          operational_flags: Json
          reviewed_at: string | null
          reviewed_by: string | null
          risk_category: string
          risk_score: number
          transfer_id: string | null
        }
        Insert: {
          ai_recommendation?: string | null
          created_at?: string
          fraud_indicators?: Json
          id?: string
          liquidity_flags?: Json
          operational_flags?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_category: string
          risk_score: number
          transfer_id?: string | null
        }
        Update: {
          ai_recommendation?: string | null
          created_at?: string
          fraud_indicators?: Json
          id?: string
          liquidity_flags?: Json
          operational_flags?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_category?: string
          risk_score?: number
          transfer_id?: string | null
        }
        Relationships: []
      }
      treasury_risk_scores: {
        Row: {
          assessment_date: string
          cash_runway_months: number | null
          corridor_risk_score: number | null
          counterparty_risk_score: number | null
          created_at: string
          created_by: string | null
          data_inputs: Json | null
          debt_service_coverage_ratio: number | null
          default_probability_percent: number | null
          fx_exposure_percent: number | null
          fx_risk_score: number | null
          id: string
          liquidity_coverage_ratio: number | null
          liquidity_risk_score: number | null
          mitigation_suggestions: Json | null
          organization_id: string | null
          overall_risk_score: number
          revenue_concentration_ratio: number | null
          risk_category: string
        }
        Insert: {
          assessment_date?: string
          cash_runway_months?: number | null
          corridor_risk_score?: number | null
          counterparty_risk_score?: number | null
          created_at?: string
          created_by?: string | null
          data_inputs?: Json | null
          debt_service_coverage_ratio?: number | null
          default_probability_percent?: number | null
          fx_exposure_percent?: number | null
          fx_risk_score?: number | null
          id?: string
          liquidity_coverage_ratio?: number | null
          liquidity_risk_score?: number | null
          mitigation_suggestions?: Json | null
          organization_id?: string | null
          overall_risk_score?: number
          revenue_concentration_ratio?: number | null
          risk_category?: string
        }
        Update: {
          assessment_date?: string
          cash_runway_months?: number | null
          corridor_risk_score?: number | null
          counterparty_risk_score?: number | null
          created_at?: string
          created_by?: string | null
          data_inputs?: Json | null
          debt_service_coverage_ratio?: number | null
          default_probability_percent?: number | null
          fx_exposure_percent?: number | null
          fx_risk_score?: number | null
          id?: string
          liquidity_coverage_ratio?: number | null
          liquidity_risk_score?: number | null
          mitigation_suggestions?: Json | null
          organization_id?: string | null
          overall_risk_score?: number
          revenue_concentration_ratio?: number | null
          risk_category?: string
        }
        Relationships: []
      }
      treasury_stress_index: {
        Row: {
          ap_pressure: number | null
          ar_pressure: number | null
          created_at: string
          current_ratio: number | null
          factors: Json | null
          fx_exposure: number | null
          id: string
          liquidity_ratio: number | null
          runway_days: number | null
          stress_score: number
          tenant_id: string | null
        }
        Insert: {
          ap_pressure?: number | null
          ar_pressure?: number | null
          created_at?: string
          current_ratio?: number | null
          factors?: Json | null
          fx_exposure?: number | null
          id?: string
          liquidity_ratio?: number | null
          runway_days?: number | null
          stress_score?: number
          tenant_id?: string | null
        }
        Update: {
          ap_pressure?: number | null
          ar_pressure?: number | null
          created_at?: string
          current_ratio?: number | null
          factors?: Json | null
          fx_exposure?: number | null
          id?: string
          liquidity_ratio?: number | null
          runway_days?: number | null
          stress_score?: number
          tenant_id?: string | null
        }
        Relationships: []
      }
      trip_profitability: {
        Row: {
          created_at: string | null
          customer_id: string | null
          dispatch_id: string
          driver_cost: number | null
          driver_id: string | null
          fuel_cost: number | null
          id: string
          loading_cost: number | null
          maintenance_cost: number | null
          margin_percent: number | null
          other_cost: number | null
          period_month: number | null
          period_year: number | null
          profit: number | null
          revenue: number | null
          route_key: string | null
          third_party_cost: number | null
          toll_cost: number | null
          total_cost: number | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          dispatch_id: string
          driver_cost?: number | null
          driver_id?: string | null
          fuel_cost?: number | null
          id?: string
          loading_cost?: number | null
          maintenance_cost?: number | null
          margin_percent?: number | null
          other_cost?: number | null
          period_month?: number | null
          period_year?: number | null
          profit?: number | null
          revenue?: number | null
          route_key?: string | null
          third_party_cost?: number | null
          toll_cost?: number | null
          total_cost?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          dispatch_id?: string
          driver_cost?: number | null
          driver_id?: string | null
          fuel_cost?: number | null
          id?: string
          loading_cost?: number | null
          maintenance_cost?: number | null
          margin_percent?: number | null
          other_cost?: number | null
          period_month?: number | null
          period_year?: number | null
          profit?: number | null
          revenue?: number | null
          route_key?: string | null
          third_party_cost?: number | null
          toll_cost?: number | null
          total_cost?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_profitability_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_profitability_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: true
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_profitability_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: true
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_profitability_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_profitability_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_rate_config: {
        Row: {
          created_at: string | null
          customer_id: string | null
          description: string | null
          driver_type: string | null
          id: string
          is_net: boolean | null
          partner_id: string | null
          pickup_location: string | null
          rate_amount: number
          route_id: string | null
          truck_type: string
          updated_at: string | null
          zone: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          driver_type?: string | null
          id?: string
          is_net?: boolean | null
          partner_id?: string | null
          pickup_location?: string | null
          rate_amount?: number
          route_id?: string | null
          truck_type: string
          updated_at?: string | null
          zone: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          driver_type?: string | null
          id?: string
          is_net?: boolean | null
          partner_id?: string | null
          pickup_location?: string | null
          rate_amount?: number
          route_id?: string | null
          truck_type?: string
          updated_at?: string | null
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_rate_config_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_rate_config_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_rate_config_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_rate_history: {
        Row: {
          change_type: string
          changed_by: string | null
          changed_by_email: string | null
          created_at: string
          customer_id: string | null
          driver_type: string | null
          id: string
          new_rate_amount: number
          notes: string | null
          old_rate_amount: number | null
          partner_id: string | null
          rate_config_id: string | null
          truck_type: string
          zone: string
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          customer_id?: string | null
          driver_type?: string | null
          id?: string
          new_rate_amount: number
          notes?: string | null
          old_rate_amount?: number | null
          partner_id?: string | null
          rate_config_id?: string | null
          truck_type: string
          zone: string
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          customer_id?: string | null
          driver_type?: string | null
          id?: string
          new_rate_amount?: number
          notes?: string | null
          old_rate_amount?: number | null
          partner_id?: string | null
          rate_config_id?: string | null
          truck_type?: string
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_rate_history_rate_config_id_fkey"
            columns: ["rate_config_id"]
            isOneToOne: false
            referencedRelation: "trip_rate_config"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_wait_tracking: {
        Row: {
          arrival_timestamp: string
          created_at: string
          customer_id: string | null
          dispatch_id: string | null
          exit_timestamp: string | null
          id: string
          loading_timestamp: string | null
          site_name: string | null
          updated_at: string
          vehicle_id: string | null
          wait_hours: number | null
          wait_reason: string | null
          wait_status: string
        }
        Insert: {
          arrival_timestamp: string
          created_at?: string
          customer_id?: string | null
          dispatch_id?: string | null
          exit_timestamp?: string | null
          id?: string
          loading_timestamp?: string | null
          site_name?: string | null
          updated_at?: string
          vehicle_id?: string | null
          wait_hours?: number | null
          wait_reason?: string | null
          wait_status?: string
        }
        Update: {
          arrival_timestamp?: string
          created_at?: string
          customer_id?: string | null
          dispatch_id?: string | null
          exit_timestamp?: string | null
          id?: string
          loading_timestamp?: string | null
          site_name?: string | null
          updated_at?: string
          vehicle_id?: string | null
          wait_hours?: number | null
          wait_reason?: string | null
          wait_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_wait_tracking_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_wait_tracking_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_wait_tracking_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_wait_tracking_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_badges: {
        Row: {
          badge_name: string
          badge_type: string
          criteria_met: Json | null
          earned_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          rcid: string | null
        }
        Insert: {
          badge_name: string
          badge_type: string
          criteria_met?: Json | null
          earned_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          rcid?: string | null
        }
        Update: {
          badge_name?: string
          badge_type?: string
          criteria_met?: Json | null
          earned_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          rcid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trust_badges_rcid_fkey"
            columns: ["rcid"]
            isOneToOne: false
            referencedRelation: "commerce_identities"
            referencedColumns: ["rcid"]
          },
        ]
      }
      usage_events: {
        Row: {
          billing_account_id: string | null
          billing_period: string | null
          created_at: string
          currency: string
          event_type: string
          id: string
          metadata: Json | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          total_cost: number | null
          unit_price: number
        }
        Insert: {
          billing_account_id?: string | null
          billing_period?: string | null
          created_at?: string
          currency?: string
          event_type: string
          id?: string
          metadata?: Json | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number | null
          unit_price?: number
        }
        Update: {
          billing_account_id?: string | null
          billing_period?: string | null
          created_at?: string
          currency?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_billing_account_id_fkey"
            columns: ["billing_account_id"]
            isOneToOne: false
            referencedRelation: "billing_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_meter_events: {
        Row: {
          id: string
          metadata: Json
          meter_key: string
          organization_id: string
          quantity: number
          recorded_at: string
          reference_id: string | null
          source: string | null
          unit: string
        }
        Insert: {
          id?: string
          metadata?: Json
          meter_key: string
          organization_id: string
          quantity?: number
          recorded_at?: string
          reference_id?: string | null
          source?: string | null
          unit?: string
        }
        Update: {
          id?: string
          metadata?: Json
          meter_key?: string
          organization_id?: string
          quantity?: number
          recorded_at?: string
          reference_id?: string | null
          source?: string | null
          unit?: string
        }
        Relationships: []
      }
      user_access_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_role: string | null
          new_status: string | null
          performed_by: string
          previous_role: string | null
          previous_status: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_role?: string | null
          new_status?: string | null
          performed_by: string
          previous_role?: string | null
          previous_status?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_role?: string | null
          new_status?: string | null
          performed_by?: string
          previous_role?: string | null
          previous_status?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          current_page: string | null
          id: string
          last_active_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_page?: string | null
          id?: string
          last_active_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_page?: string | null
          id?: string
          last_active_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          id: string
          ip_address: string | null
          login_at: string | null
          logout_at: string | null
          session_duration_minutes: number | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          login_at?: string | null
          logout_at?: string | null
          session_duration_minutes?: number | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          login_at?: string | null
          logout_at?: string | null
          session_duration_minutes?: number | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vat_rules: {
        Row: {
          country: string
          country_name: string
          created_at: string
          default_rate: number
          id: string
          is_active: boolean | null
          reporting_frequency: string | null
          reverse_charge_flag: boolean | null
          zero_rated_flag: boolean | null
        }
        Insert: {
          country: string
          country_name: string
          created_at?: string
          default_rate?: number
          id?: string
          is_active?: boolean | null
          reporting_frequency?: string | null
          reverse_charge_flag?: boolean | null
          zero_rated_flag?: boolean | null
        }
        Update: {
          country?: string
          country_name?: string
          created_at?: string
          default_rate?: number
          id?: string
          is_active?: boolean | null
          reporting_frequency?: string | null
          reverse_charge_flag?: boolean | null
          zero_rated_flag?: boolean | null
        }
        Relationships: []
      }
      vat_transactions: {
        Row: {
          amount: number
          country_code: string
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          description: string | null
          id: string
          period_month: number | null
          period_year: number | null
          reference_id: string | null
          reference_type: string
          transaction_type: string
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          amount?: number
          country_code?: string
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          description?: string | null
          id?: string
          period_month?: number | null
          period_year?: number | null
          reference_id?: string | null
          reference_type: string
          transaction_type: string
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          amount?: number
          country_code?: string
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          description?: string | null
          id?: string
          period_month?: number | null
          period_year?: number | null
          reference_id?: string | null
          reference_type?: string
          transaction_type?: string
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: []
      }
      vehicle_checklist_items: {
        Row: {
          category: string
          checklist_id: string
          condition: string
          id: string
          is_safety_critical: boolean
          item_name: string
          notes: string | null
          photo_url: string | null
        }
        Insert: {
          category: string
          checklist_id: string
          condition?: string
          id?: string
          is_safety_critical?: boolean
          item_name: string
          notes?: string | null
          photo_url?: string | null
        }
        Update: {
          category?: string
          checklist_id?: string
          condition?: string
          id?: string
          is_safety_critical?: boolean
          item_name?: string
          notes?: string | null
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "vehicle_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_checklists: {
        Row: {
          checklist_date: string
          checklist_type: string
          completed_at: string | null
          created_at: string
          dispatch_blocked: boolean
          driver_id: string | null
          fuel_level_pct: number | null
          id: string
          notes: string | null
          odometer_reading: number | null
          organization_id: string
          overall_result: string
          safety_critical_fail: boolean
          submitted_by: string
          vehicle_id: string | null
        }
        Insert: {
          checklist_date?: string
          checklist_type: string
          completed_at?: string | null
          created_at?: string
          dispatch_blocked?: boolean
          driver_id?: string | null
          fuel_level_pct?: number | null
          id?: string
          notes?: string | null
          odometer_reading?: number | null
          organization_id: string
          overall_result?: string
          safety_critical_fail?: boolean
          submitted_by: string
          vehicle_id?: string | null
        }
        Update: {
          checklist_date?: string
          checklist_type?: string
          completed_at?: string | null
          created_at?: string
          dispatch_blocked?: boolean
          driver_id?: string | null
          fuel_level_pct?: number | null
          id?: string
          notes?: string | null
          odometer_reading?: number | null
          organization_id?: string
          overall_result?: string
          safety_critical_fail?: boolean
          submitted_by?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_checklists_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_checklists_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_documents: {
        Row: {
          alert_sent: boolean | null
          created_at: string
          document_name: string
          document_type: string
          document_url: string | null
          expiry_date: string | null
          id: string
          is_verified: boolean | null
          updated_at: string
          vehicle_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          alert_sent?: boolean | null
          created_at?: string
          document_name: string
          document_type: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          is_verified?: boolean | null
          updated_at?: string
          vehicle_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          alert_sent?: boolean | null
          created_at?: string
          document_name?: string
          document_type?: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          is_verified?: boolean | null
          updated_at?: string
          vehicle_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_fines: {
        Row: {
          action_taken: string | null
          created_at: string
          deducted_from_driver: boolean
          driver_id: string | null
          fine_amount: number
          fine_date: string
          fine_reference: string | null
          fine_type: string
          id: string
          issuing_authority: string | null
          location: string | null
          logged_by: string
          notes: string | null
          organization_id: string
          paid_by: string | null
          payment_status: string
          vehicle_id: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          deducted_from_driver?: boolean
          driver_id?: string | null
          fine_amount?: number
          fine_date?: string
          fine_reference?: string | null
          fine_type: string
          id?: string
          issuing_authority?: string | null
          location?: string | null
          logged_by: string
          notes?: string | null
          organization_id: string
          paid_by?: string | null
          payment_status?: string
          vehicle_id: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          deducted_from_driver?: boolean
          driver_id?: string | null
          fine_amount?: number
          fine_date?: string
          fine_reference?: string | null
          fine_type?: string
          id?: string
          issuing_authority?: string | null
          location?: string | null
          logged_by?: string
          notes?: string | null
          organization_id?: string
          paid_by?: string | null
          payment_status?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_fines_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_fines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_fines_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_grounding: {
        Row: {
          created_at: string
          ground_reason: string
          grounded_at: string
          grounded_by: string | null
          id: string
          is_active: boolean
          release_notes: string | null
          released_at: string | null
          released_by: string | null
          severity: string
          triggered_by_decision_id: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          ground_reason: string
          grounded_at?: string
          grounded_by?: string | null
          id?: string
          is_active?: boolean
          release_notes?: string | null
          released_at?: string | null
          released_by?: string | null
          severity?: string
          triggered_by_decision_id?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          ground_reason?: string
          grounded_at?: string
          grounded_by?: string | null
          id?: string
          is_active?: boolean
          release_notes?: string | null
          released_at?: string | null
          released_by?: string | null
          severity?: string
          triggered_by_decision_id?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_grounding_triggered_by_decision_id_fkey"
            columns: ["triggered_by_decision_id"]
            isOneToOne: false
            referencedRelation: "maintenance_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_health_components: {
        Row: {
          component_status: string | null
          component_type: string
          created_at: string | null
          flagged_count: number | null
          health_score: number | null
          id: string
          injector_inefficiency_factor: number
          is_injector_critical: boolean
          last_injector_service_date: string | null
          last_inspection_notes: string | null
          last_serviced_date: string | null
          service_interval_months: number | null
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          component_status?: string | null
          component_type: string
          created_at?: string | null
          flagged_count?: number | null
          health_score?: number | null
          id?: string
          injector_inefficiency_factor?: number
          is_injector_critical?: boolean
          last_injector_service_date?: string | null
          last_inspection_notes?: string | null
          last_serviced_date?: string | null
          service_interval_months?: number | null
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          component_status?: string | null
          component_type?: string
          created_at?: string | null
          flagged_count?: number | null
          health_score?: number | null
          id?: string
          injector_inefficiency_factor?: number
          is_injector_critical?: boolean
          last_injector_service_date?: string | null
          last_inspection_notes?: string | null
          last_serviced_date?: string | null
          service_interval_months?: number | null
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: []
      }
      vehicle_incidents: {
        Row: {
          actual_repair_cost: number | null
          amount_recovered: number | null
          closed_at: string | null
          created_at: string
          deducted_from_driver: boolean
          description: string
          driver_id: string | null
          driver_liable: boolean | null
          id: string
          incident_date: string
          incident_type: string
          insurance_claim_number: string | null
          insurance_paid: number | null
          location: string | null
          logged_by: string
          notes: string | null
          organization_id: string
          police_report_number: string | null
          repair_cost_estimate: number | null
          severity: string
          status: string
          third_party_involved: boolean
          vehicle_id: string
        }
        Insert: {
          actual_repair_cost?: number | null
          amount_recovered?: number | null
          closed_at?: string | null
          created_at?: string
          deducted_from_driver?: boolean
          description: string
          driver_id?: string | null
          driver_liable?: boolean | null
          id?: string
          incident_date?: string
          incident_type: string
          insurance_claim_number?: string | null
          insurance_paid?: number | null
          location?: string | null
          logged_by: string
          notes?: string | null
          organization_id: string
          police_report_number?: string | null
          repair_cost_estimate?: number | null
          severity?: string
          status?: string
          third_party_involved?: boolean
          vehicle_id: string
        }
        Update: {
          actual_repair_cost?: number | null
          amount_recovered?: number | null
          closed_at?: string | null
          created_at?: string
          deducted_from_driver?: boolean
          description?: string
          driver_id?: string | null
          driver_liable?: boolean | null
          id?: string
          incident_date?: string
          incident_type?: string
          insurance_claim_number?: string | null
          insurance_paid?: number | null
          location?: string | null
          logged_by?: string
          notes?: string | null
          organization_id?: string
          police_report_number?: string | null
          repair_cost_estimate?: number | null
          severity?: string
          status?: string
          third_party_involved?: boolean
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_incidents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_incidents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_inspection_items: {
        Row: {
          category: string
          condition: string
          created_at: string
          id: string
          inspection_id: string
          is_safety_critical: boolean | null
          item_name: string
          notes: string | null
          photo_url: string | null
        }
        Insert: {
          category: string
          condition?: string
          created_at?: string
          id?: string
          inspection_id: string
          is_safety_critical?: boolean | null
          item_name: string
          notes?: string | null
          photo_url?: string | null
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          id?: string
          inspection_id?: string
          is_safety_critical?: boolean | null
          item_name?: string
          notes?: string | null
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "vehicle_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_inspections: {
        Row: {
          blocked_dispatch: boolean | null
          completed_at: string | null
          created_at: string
          dispatch_id: string | null
          driver_id: string | null
          id: string
          inspection_type: string
          inspector_id: string | null
          inspector_notes: string | null
          organization_id: string | null
          overall_score: number | null
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          blocked_dispatch?: boolean | null
          completed_at?: string | null
          created_at?: string
          dispatch_id?: string | null
          driver_id?: string | null
          id?: string
          inspection_type: string
          inspector_id?: string | null
          inspector_notes?: string | null
          organization_id?: string | null
          overall_score?: number | null
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          blocked_dispatch?: boolean | null
          completed_at?: string | null
          created_at?: string
          dispatch_id?: string | null
          driver_id?: string | null
          id?: string
          inspection_type?: string
          inspector_id?: string | null
          inspector_notes?: string | null
          organization_id?: string | null
          overall_score?: number | null
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_inspections_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_maintenance_records: {
        Row: {
          cost: number | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          maintenance_type: string
          next_maintenance_date: string | null
          next_maintenance_km: number | null
          notes: string | null
          odometer_reading: number | null
          parts_replaced: Json | null
          performed_at: string
          performed_by: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          maintenance_type: string
          next_maintenance_date?: string | null
          next_maintenance_km?: number | null
          notes?: string | null
          odometer_reading?: number | null
          parts_replaced?: Json | null
          performed_at?: string
          performed_by?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          maintenance_type?: string
          next_maintenance_date?: string | null
          next_maintenance_km?: number | null
          notes?: string | null
          odometer_reading?: number | null
          parts_replaced?: Json | null
          performed_at?: string
          performed_by?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_mileage_tracking: {
        Row: {
          created_at: string
          gps_distance_km: number | null
          id: string
          notes: string | null
          odometer_reading: number
          reading_date: string
          reading_source: string | null
          recorded_by: string | null
          trip_count: number | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          gps_distance_km?: number | null
          id?: string
          notes?: string | null
          odometer_reading: number
          reading_date?: string
          reading_source?: string | null
          recorded_by?: string | null
          trip_count?: number | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          gps_distance_km?: number | null
          id?: string
          notes?: string | null
          odometer_reading?: number
          reading_date?: string
          reading_source?: string | null
          recorded_by?: string | null
          trip_count?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_mileage_tracking_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_repairs: {
        Row: {
          cost: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          mileage_at_repair: number | null
          notes: string | null
          performed_by: string | null
          repair_date: string
          repair_type: string
          vehicle_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          mileage_at_repair?: number | null
          notes?: string | null
          performed_by?: string | null
          repair_date?: string
          repair_type: string
          vehicle_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          mileage_at_repair?: number | null
          notes?: string | null
          performed_by?: string | null
          repair_date?: string
          repair_type?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_repairs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_sensor_readings: {
        Row: {
          created_at: string | null
          id: string
          is_anomaly: boolean | null
          location_lat: number | null
          location_lng: number | null
          metadata: Json | null
          recorded_at: string | null
          sensor_type: string
          unit: string | null
          value: number
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_anomaly?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          metadata?: Json | null
          recorded_at?: string | null
          sensor_type: string
          unit?: string | null
          value: number
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_anomaly?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          metadata?: Json | null
          recorded_at?: string | null
          sensor_type?: string
          unit?: string | null
          value?: number
          vehicle_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          capacity_kg: number | null
          created_at: string
          current_fuel_level: number | null
          current_mileage: number | null
          current_odometer: number | null
          expected_daily_revenue: number | null
          fuel_type: string | null
          health_score: number | null
          id: string
          image_url: string | null
          last_maintenance: string | null
          last_service_km: number | null
          lifetime_km: number | null
          make: string | null
          max_drops_per_route: number | null
          max_volume_cbm: number | null
          max_weight_kg: number | null
          model: string | null
          monthly_km: number | null
          next_maintenance: string | null
          organization_id: string | null
          ownership_type: string | null
          partner_id: string | null
          registration_number: string
          status: string | null
          truck_category: string | null
          truck_type: string | null
          updated_at: string
          vehicle_category: string
          vehicle_type: string
          weekly_km: number | null
          year: number | null
        }
        Insert: {
          capacity_kg?: number | null
          created_at?: string
          current_fuel_level?: number | null
          current_mileage?: number | null
          current_odometer?: number | null
          expected_daily_revenue?: number | null
          fuel_type?: string | null
          health_score?: number | null
          id?: string
          image_url?: string | null
          last_maintenance?: string | null
          last_service_km?: number | null
          lifetime_km?: number | null
          make?: string | null
          max_drops_per_route?: number | null
          max_volume_cbm?: number | null
          max_weight_kg?: number | null
          model?: string | null
          monthly_km?: number | null
          next_maintenance?: string | null
          organization_id?: string | null
          ownership_type?: string | null
          partner_id?: string | null
          registration_number: string
          status?: string | null
          truck_category?: string | null
          truck_type?: string | null
          updated_at?: string
          vehicle_category?: string
          vehicle_type: string
          weekly_km?: number | null
          year?: number | null
        }
        Update: {
          capacity_kg?: number | null
          created_at?: string
          current_fuel_level?: number | null
          current_mileage?: number | null
          current_odometer?: number | null
          expected_daily_revenue?: number | null
          fuel_type?: string | null
          health_score?: number | null
          id?: string
          image_url?: string | null
          last_maintenance?: string | null
          last_service_km?: number | null
          lifetime_km?: number | null
          make?: string | null
          max_drops_per_route?: number | null
          max_volume_cbm?: number | null
          max_weight_kg?: number | null
          model?: string | null
          monthly_km?: number | null
          next_maintenance?: string | null
          organization_id?: string | null
          ownership_type?: string | null
          partner_id?: string | null
          registration_number?: string
          status?: string | null
          truck_category?: string | null
          truck_type?: string | null
          updated_at?: string
          vehicle_category?: string
          vehicle_type?: string
          weekly_km?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_auto_invoice_log: {
        Row: {
          dispatch_id: string
          generated_at: string
          invoice_id: string | null
          organization_id: string
        }
        Insert: {
          dispatch_id: string
          generated_at?: string
          invoice_id?: string | null
          organization_id: string
        }
        Update: {
          dispatch_id?: string
          generated_at?: string
          invoice_id?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_auto_invoice_log_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: true
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_auto_invoice_log_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: true
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_auto_invoice_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_credit_ratings: {
        Row: {
          claim_frequency: number | null
          corridor_risk_index: number | null
          created_at: string
          credit_score: number
          damage_rate: number | null
          eligible_for_freight_finance: boolean | null
          escrow_hold_days: number | null
          factors: Json | null
          fraud_flags_count: number | null
          id: string
          invoice_accuracy: number | null
          on_time_delivery_rate: number | null
          payout_speed_tier: string | null
          updated_at: string
          vendor_id: string | null
          vendor_name: string
        }
        Insert: {
          claim_frequency?: number | null
          corridor_risk_index?: number | null
          created_at?: string
          credit_score?: number
          damage_rate?: number | null
          eligible_for_freight_finance?: boolean | null
          escrow_hold_days?: number | null
          factors?: Json | null
          fraud_flags_count?: number | null
          id?: string
          invoice_accuracy?: number | null
          on_time_delivery_rate?: number | null
          payout_speed_tier?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_name: string
        }
        Update: {
          claim_frequency?: number | null
          corridor_risk_index?: number | null
          created_at?: string
          credit_score?: number
          damage_rate?: number | null
          eligible_for_freight_finance?: boolean | null
          escrow_hold_days?: number | null
          factors?: Json | null
          fraud_flags_count?: number | null
          id?: string
          invoice_accuracy?: number | null
          on_time_delivery_rate?: number | null
          payout_speed_tier?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string
        }
        Relationships: []
      }
      vendor_invoices: {
        Row: {
          amount: number | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          currency: string | null
          extracted_dispatches: string[] | null
          extracted_waybills: string[] | null
          finance_email_sent_at: string | null
          finance_email_to: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          match_details: Json | null
          match_score: number | null
          match_status: string
          matched_dispatch_ids: string[] | null
          matched_waybill_ids: string[] | null
          notes: string | null
          organization_id: string
          parsed_data: Json | null
          partner_id: string
          pdf_path: string | null
          pdf_url: string
          rejection_reason: string | null
          updated_at: string
          uploaded_by: string | null
          uploaded_via: string
        }
        Insert: {
          amount?: number | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string | null
          extracted_dispatches?: string[] | null
          extracted_waybills?: string[] | null
          finance_email_sent_at?: string | null
          finance_email_to?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          match_details?: Json | null
          match_score?: number | null
          match_status?: string
          matched_dispatch_ids?: string[] | null
          matched_waybill_ids?: string[] | null
          notes?: string | null
          organization_id: string
          parsed_data?: Json | null
          partner_id: string
          pdf_path?: string | null
          pdf_url: string
          rejection_reason?: string | null
          updated_at?: string
          uploaded_by?: string | null
          uploaded_via?: string
        }
        Update: {
          amount?: number | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string | null
          extracted_dispatches?: string[] | null
          extracted_waybills?: string[] | null
          finance_email_sent_at?: string | null
          finance_email_to?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          match_details?: Json | null
          match_score?: number | null
          match_status?: string
          matched_dispatch_ids?: string[] | null
          matched_waybill_ids?: string[] | null
          notes?: string | null
          organization_id?: string
          parsed_data?: Json | null
          partner_id?: string
          pdf_path?: string | null
          pdf_url?: string
          rejection_reason?: string | null
          updated_at?: string
          uploaded_by?: string | null
          uploaded_via?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_partners: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avg_rating: number | null
          avg_turnaround_hours: number | null
          business_name: string
          compliance_score: number | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          id: string
          insurance_expiry: string | null
          is_active: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          onboarding_status: string | null
          organization_id: string | null
          registration_number: string | null
          rejection_reason: string | null
          service_categories: string[] | null
          service_locations: string[] | null
          total_jobs_completed: number | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avg_rating?: number | null
          avg_turnaround_hours?: number | null
          business_name: string
          compliance_score?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          insurance_expiry?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          onboarding_status?: string | null
          organization_id?: string | null
          registration_number?: string | null
          rejection_reason?: string | null
          service_categories?: string[] | null
          service_locations?: string[] | null
          total_jobs_completed?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avg_rating?: number | null
          avg_turnaround_hours?: number | null
          business_name?: string
          compliance_score?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          insurance_expiry?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          onboarding_status?: string | null
          organization_id?: string | null
          registration_number?: string | null
          rejection_reason?: string | null
          service_categories?: string[] | null
          service_locations?: string[] | null
          total_jobs_completed?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_partners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_payables: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          dispatch_id: string | null
          due_date: string | null
          expense_id: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          organization_id: string | null
          paid_amount: number | null
          paid_date: string | null
          partner_id: string
          payment_reference: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          dispatch_id?: string | null
          due_date?: string | null
          expense_id?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          organization_id?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          partner_id: string
          payment_reference?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          dispatch_id?: string | null
          due_date?: string | null
          expense_id?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          organization_id?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          partner_id?: string
          payment_reference?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payables_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payables_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payables_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payables_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_performance_snapshots: {
        Row: {
          actuals_summary: Json
          balance_summary: Json
          created_at: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          id: string
          snapshot_month: number
          snapshot_week: number
          snapshot_year: number
          targets_summary: Json
          vendor_id: string
        }
        Insert: {
          actuals_summary?: Json
          balance_summary?: Json
          created_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          snapshot_month: number
          snapshot_week: number
          snapshot_year: number
          targets_summary?: Json
          vendor_id: string
        }
        Update: {
          actuals_summary?: Json
          balance_summary?: Json
          created_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          snapshot_month?: number
          snapshot_week?: number
          snapshot_year?: number
          targets_summary?: Json
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_performance_snapshots_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_rate_cards: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          rate_ngn: number
          route_from: string
          route_to: string
          sla_days: number
          special_terms: string | null
          status: string
          updated_at: string
          uploaded_by: string | null
          valid_from: string
          valid_until: string | null
          vehicle_type: string
          vendor_id: string | null
          vendor_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          rate_ngn: number
          route_from: string
          route_to: string
          sla_days?: number
          special_terms?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          valid_from?: string
          valid_until?: string | null
          vehicle_type: string
          vendor_id?: string | null
          vendor_name: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          rate_ngn?: number
          route_from?: string
          route_to?: string
          sla_days?: number
          special_terms?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          valid_from?: string
          valid_until?: string | null
          vehicle_type?: string
          vendor_id?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_rate_cards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_rate_comparisons: {
        Row: {
          ai_model: string | null
          ai_recommendation: string | null
          alternatives: Json
          cheapest_rate_ngn: number
          cheapest_vendor_id: string | null
          created_at: string
          created_by: string | null
          dispatch_id: string | null
          id: string
          organization_id: string
          route_from: string
          route_to: string
          vehicle_type: string
        }
        Insert: {
          ai_model?: string | null
          ai_recommendation?: string | null
          alternatives?: Json
          cheapest_rate_ngn: number
          cheapest_vendor_id?: string | null
          created_at?: string
          created_by?: string | null
          dispatch_id?: string | null
          id?: string
          organization_id: string
          route_from: string
          route_to: string
          vehicle_type: string
        }
        Update: {
          ai_model?: string | null
          ai_recommendation?: string | null
          alternatives?: Json
          cheapest_rate_ngn?: number
          cheapest_vendor_id?: string | null
          created_at?: string
          created_by?: string | null
          dispatch_id?: string | null
          id?: string
          organization_id?: string
          route_from?: string
          route_to?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_rate_comparisons_cheapest_vendor_id_fkey"
            columns: ["cheapest_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_rate_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_rate_comparisons_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_rate_comparisons_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_user_id: string
          id: string
          overall_rating: number | null
          parts_quality_rating: number | null
          price_fairness_rating: number | null
          reliability_rating: number | null
          schedule_id: string | null
          vendor_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_user_id: string
          id?: string
          overall_rating?: number | null
          parts_quality_rating?: number | null
          price_fairness_rating?: number | null
          reliability_rating?: number | null
          schedule_id?: string | null
          vendor_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_user_id?: string
          id?: string
          overall_rating?: number | null
          parts_quality_rating?: number | null
          price_fairness_rating?: number | null
          reliability_rating?: number | null
          schedule_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_ratings_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_ratings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_services: {
        Row: {
          category: string
          created_at: string | null
          currency: string | null
          description: string | null
          estimated_hours: number | null
          id: string
          is_active: boolean | null
          price_max: number | null
          price_min: number | null
          service_name: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean | null
          price_max?: number | null
          price_min?: number | null
          service_name: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean | null
          price_max?: number | null
          price_min?: number | null
          service_name?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_services_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_truck_actuals: {
        Row: {
          created_at: string | null
          dispatch_id: string | null
          id: string
          target_id: string
          trips_count: number | null
          week_number: number
        }
        Insert: {
          created_at?: string | null
          dispatch_id?: string | null
          id?: string
          target_id: string
          trips_count?: number | null
          week_number: number
        }
        Update: {
          created_at?: string | null
          dispatch_id?: string | null
          id?: string
          target_id?: string
          trips_count?: number | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendor_truck_actuals_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_truck_actuals_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_truck_actuals_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "vendor_truck_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_truck_targets: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          target_month: number
          target_trips: number
          target_year: number
          truck_type: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          target_month: number
          target_trips?: number
          target_year: number
          truck_type: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          target_month?: number
          target_trips?: number
          target_year?: number
          truck_type?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_truck_targets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_yearly_targets: {
        Row: {
          cost_per_delivery_target: number | null
          cost_per_kg_target: number | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          organization_id: string
          otd_target_percent: number | null
          target_year: number
          trucks_deployed_target: number | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          cost_per_delivery_target?: number | null
          cost_per_kg_target?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          otd_target_percent?: number | null
          target_year: number
          trucks_deployed_target?: number | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          cost_per_delivery_target?: number | null
          cost_per_kg_target?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          otd_target_percent?: number | null
          target_year?: number
          trucks_deployed_target?: number | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_yearly_targets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          balance_after: number
          balance_before: number
          created_at: string
          created_by: string | null
          description: string | null
          fraud_risk_score: number | null
          id: string
          reference_id: string | null
          reference_type: string | null
          requires_approval: boolean | null
          status: string
          transaction_type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          balance_after?: number
          balance_before?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          fraud_risk_score?: number | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          requires_approval?: boolean | null
          status?: string
          transaction_type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          balance_after?: number
          balance_before?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          fraud_risk_score?: number | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          requires_approval?: boolean | null
          status?: string
          transaction_type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          aml_flagged: boolean | null
          balance: number
          created_at: string
          currency: string
          daily_limit: number | null
          id: string
          kyc_verified: boolean | null
          owner_id: string | null
          owner_type: string
          status: string
          updated_at: string
          wallet_name: string
          wallet_type: string
        }
        Insert: {
          aml_flagged?: boolean | null
          balance?: number
          created_at?: string
          currency?: string
          daily_limit?: number | null
          id?: string
          kyc_verified?: boolean | null
          owner_id?: string | null
          owner_type?: string
          status?: string
          updated_at?: string
          wallet_name: string
          wallet_type: string
        }
        Update: {
          aml_flagged?: boolean | null
          balance?: number
          created_at?: string
          currency?: string
          daily_limit?: number | null
          id?: string
          kyc_verified?: boolean | null
          owner_id?: string | null
          owner_type?: string
          status?: string
          updated_at?: string
          wallet_name?: string
          wallet_type?: string
        }
        Relationships: []
      }
      warehouse_bins: {
        Row: {
          bin_code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_occupied: boolean | null
          max_capacity_units: number | null
          position: string | null
          rack: string | null
          shelf: string | null
          zone_id: string
        }
        Insert: {
          bin_code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_occupied?: boolean | null
          max_capacity_units?: number | null
          position?: string | null
          rack?: string | null
          shelf?: string | null
          zone_id: string
        }
        Update: {
          bin_code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_occupied?: boolean | null
          max_capacity_units?: number | null
          position?: string | null
          rack?: string | null
          shelf?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_bins_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "warehouse_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_inventory: {
        Row: {
          batch_number: string | null
          bin_id: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          last_counted_at: string | null
          quantity_available: number | null
          quantity_on_hand: number
          quantity_reserved: number
          sku_code: string
          sku_name: string | null
          unit_of_measure: string | null
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          batch_number?: string | null
          bin_id?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          last_counted_at?: string | null
          quantity_available?: number | null
          quantity_on_hand?: number
          quantity_reserved?: number
          sku_code: string
          sku_name?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          batch_number?: string | null
          bin_id?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          last_counted_at?: string | null
          quantity_available?: number | null
          quantity_on_hand?: number
          quantity_reserved?: number
          sku_code?: string
          sku_name?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_inventory_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "warehouse_bins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_inventory_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_return_items: {
        Row: {
          condition: string
          created_at: string | null
          disposition: string | null
          id: string
          quantity: number
          return_id: string
          sku_code: string
          sku_name: string | null
        }
        Insert: {
          condition?: string
          created_at?: string | null
          disposition?: string | null
          id?: string
          quantity?: number
          return_id: string
          sku_code: string
          sku_name?: string | null
        }
        Update: {
          condition?: string
          created_at?: string | null
          disposition?: string | null
          id?: string
          quantity?: number
          return_id?: string
          sku_code?: string
          sku_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "warehouse_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_returns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          classification: string | null
          created_at: string | null
          id: string
          inspected_at: string | null
          inspected_by: string | null
          notes: string | null
          outlet_name: string | null
          requested_by: string | null
          return_category: string
          return_number: string
          source_type: string | null
          status: string
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          classification?: string | null
          created_at?: string | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          notes?: string | null
          outlet_name?: string | null
          requested_by?: string | null
          return_category?: string
          return_number: string
          source_type?: string | null
          status?: string
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          classification?: string | null
          created_at?: string | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          notes?: string | null
          outlet_name?: string | null
          requested_by?: string | null
          return_category?: string
          return_number?: string
          source_type?: string | null
          status?: string
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_returns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_zones: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          temperature_controlled: boolean | null
          warehouse_id: string
          zone_name: string
          zone_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          temperature_controlled?: boolean | null
          warehouse_id: string
          zone_name: string
          zone_type?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          temperature_controlled?: boolean | null
          warehouse_id?: string
          zone_name?: string
          zone_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_zones_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          capacity_sqm: number | null
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          location: string | null
          longitude: number | null
          manager_user_id: string | null
          name: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          capacity_sqm?: number | null
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          manager_user_id?: string | null
          name: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          capacity_sqm?: number | null
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          manager_user_id?: string | null
          name?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      waybill_items: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string
          delivered_at: string | null
          delivery_address: string
          id: string
          item_description: string | null
          notes: string | null
          phone: string | null
          sequence_order: number | null
          signature_url: string | null
          waybill_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_name: string
          delivered_at?: string | null
          delivery_address: string
          id?: string
          item_description?: string | null
          notes?: string | null
          phone?: string | null
          sequence_order?: number | null
          signature_url?: string | null
          waybill_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string
          delivered_at?: string | null
          delivery_address?: string
          id?: string
          item_description?: string | null
          notes?: string | null
          phone?: string | null
          sequence_order?: number | null
          signature_url?: string | null
          waybill_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waybill_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waybill_items_waybill_id_fkey"
            columns: ["waybill_id"]
            isOneToOne: false
            referencedRelation: "waybills"
            referencedColumns: ["id"]
          },
        ]
      }
      waybill_templates: {
        Row: {
          created_at: string
          file_path: string
          format: string
          id: string
          is_default: boolean
          name: string
          organization_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_path: string
          format: string
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string
          format?: string
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      waybills: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          customer_name: string | null
          delivery_address: string | null
          dispatch_id: string | null
          driver_id: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          organization_id: string | null
          plan_id: string | null
          pod_status: string
          printed_at: string | null
          route_summary: string | null
          status: string | null
          total_drops: number | null
          transporter_id: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          uploaded_waybill_url: string | null
          vehicle_id: string | null
          waybill_number: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          customer_name?: string | null
          delivery_address?: string | null
          dispatch_id?: string | null
          driver_id?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          organization_id?: string | null
          plan_id?: string | null
          pod_status?: string
          printed_at?: string | null
          route_summary?: string | null
          status?: string | null
          total_drops?: number | null
          transporter_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          uploaded_waybill_url?: string | null
          vehicle_id?: string | null
          waybill_number: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          customer_name?: string | null
          delivery_address?: string | null
          dispatch_id?: string | null
          driver_id?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          organization_id?: string | null
          plan_id?: string | null
          pod_status?: string
          printed_at?: string | null
          route_summary?: string | null
          status?: string | null
          total_drops?: number | null
          transporter_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          uploaded_waybill_url?: string | null
          vehicle_id?: string | null
          waybill_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "waybills_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_dead_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waybills_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waybills_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waybills_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "dispatch_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waybills_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempt_number: number | null
          created_at: string | null
          delivered_at: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          webhook_id: string | null
        }
        Insert: {
          attempt_number?: number | null
          created_at?: string | null
          delivered_at?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id?: string | null
        }
        Update: {
          attempt_number?: number | null
          created_at?: string | null
          delivered_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "partner_webhooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "partner_webhooks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_orders: {
        Row: {
          ai_confidence: number | null
          created_at: string | null
          error_message: string | null
          extraction_status: string
          id: string
          outlet_name: string | null
          processed_at: string | null
          processed_by: string | null
          raw_message: string
          sales_order_id: string | null
          sender_name: string | null
          sender_phone: string | null
          structured_order: Json | null
          warehouse_id: string | null
        }
        Insert: {
          ai_confidence?: number | null
          created_at?: string | null
          error_message?: string | null
          extraction_status?: string
          id?: string
          outlet_name?: string | null
          processed_at?: string | null
          processed_by?: string | null
          raw_message: string
          sales_order_id?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          structured_order?: Json | null
          warehouse_id?: string | null
        }
        Update: {
          ai_confidence?: number | null
          created_at?: string | null
          error_message?: string | null
          extraction_status?: string
          id?: string
          outlet_name?: string | null
          processed_at?: string | null
          processed_by?: string | null
          raw_message?: string
          sales_order_id?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          structured_order?: Json | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      white_label_config: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          apply_to_customer_portal: boolean | null
          apply_to_emails: boolean | null
          apply_to_invoices: boolean | null
          apply_to_reports: boolean | null
          apply_to_tracking: boolean | null
          brand_name: string
          brand_suffix: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          monthly_cost: number | null
          organization_id: string | null
          primary_color: string | null
          secondary_color: string | null
          show_powered_by: boolean | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          apply_to_customer_portal?: boolean | null
          apply_to_emails?: boolean | null
          apply_to_invoices?: boolean | null
          apply_to_reports?: boolean | null
          apply_to_tracking?: boolean | null
          brand_name: string
          brand_suffix?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          monthly_cost?: number | null
          organization_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_powered_by?: boolean | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          apply_to_customer_portal?: boolean | null
          apply_to_emails?: boolean | null
          apply_to_invoices?: boolean | null
          apply_to_reports?: boolean | null
          apply_to_tracking?: boolean | null
          brand_name?: string
          brand_suffix?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          monthly_cost?: number | null
          organization_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_powered_by?: boolean | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      white_label_resellers: {
        Row: {
          api_access_tier: string | null
          commission_rate: number | null
          created_at: string | null
          id: string
          onboarded_by: string | null
          parent_reseller_id: string | null
          reseller_code: string
          reseller_name: string
          status: string | null
          total_commission: number | null
          total_sales: number | null
          updated_at: string | null
        }
        Insert: {
          api_access_tier?: string | null
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          onboarded_by?: string | null
          parent_reseller_id?: string | null
          reseller_code: string
          reseller_name: string
          status?: string | null
          total_commission?: number | null
          total_sales?: number | null
          updated_at?: string | null
        }
        Update: {
          api_access_tier?: string | null
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          onboarded_by?: string | null
          parent_reseller_id?: string | null
          reseller_code?: string
          reseller_name?: string
          status?: string | null
          total_commission?: number | null
          total_sales?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "white_label_resellers_parent_reseller_id_fkey"
            columns: ["parent_reseller_id"]
            isOneToOne: false
            referencedRelation: "white_label_resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          assigned_to: string | null
          category: string
          checklist_id: string | null
          created_at: string
          description: string | null
          due_by: string | null
          external_cost: number | null
          id: string
          labour_cost: number | null
          organization_id: string
          parts_cost: number | null
          priority: string
          raised_by: string
          resolution_notes: string | null
          resolved_at: string | null
          sla_breached: boolean
          status: string
          title: string
          total_cost: number | null
          updated_at: string
          vehicle_id: string
          work_order_number: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          checklist_id?: string | null
          created_at?: string
          description?: string | null
          due_by?: string | null
          external_cost?: number | null
          id?: string
          labour_cost?: number | null
          organization_id: string
          parts_cost?: number | null
          priority?: string
          raised_by: string
          resolution_notes?: string | null
          resolved_at?: string | null
          sla_breached?: boolean
          status?: string
          title: string
          total_cost?: number | null
          updated_at?: string
          vehicle_id: string
          work_order_number?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          checklist_id?: string | null
          created_at?: string
          description?: string | null
          due_by?: string | null
          external_cost?: number | null
          id?: string
          labour_cost?: number | null
          organization_id?: string
          parts_cost?: number | null
          priority?: string
          raised_by?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          sla_breached?: boolean
          status?: string
          title?: string
          total_cost?: number | null
          updated_at?: string
          vehicle_id?: string
          work_order_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "vehicle_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_integrity_checks: {
        Row: {
          checked_at: string
          details: Json
          id: string
          organization_id: string | null
          status: string
          workflow_key: string
        }
        Insert: {
          checked_at?: string
          details?: Json
          id?: string
          organization_id?: string | null
          status: string
          workflow_key: string
        }
        Update: {
          checked_at?: string
          details?: Json
          id?: string
          organization_id?: string | null
          status?: string
          workflow_key?: string
        }
        Relationships: []
      }
      workforce_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          organization_id: string | null
          pin_confirmed: boolean
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          organization_id?: string | null
          pin_confirmed?: boolean
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          organization_id?: string | null
          pin_confirmed?: boolean
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      zoho_sync_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          records_failed: number | null
          records_synced: number | null
          started_at: string
          status: string | null
          sync_type: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          records_failed?: number | null
          records_synced?: number | null
          started_at?: string
          status?: string | null
          sync_type: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          records_failed?: number | null
          records_synced?: number | null
          started_at?: string
          status?: string | null
          sync_type?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      company_settings_branding: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string | null
          email: string | null
          id: string | null
          logo_url: string | null
          organization_id: string | null
          phone: string | null
          signature_url: string | null
          tagline: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          logo_url?: string | null
          organization_id?: string | null
          phone?: string | null
          signature_url?: string | null
          tagline?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          logo_url?: string | null
          organization_id?: string | null
          phone?: string | null
          signature_url?: string | null
          tagline?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dispatch_dead_states: {
        Row: {
          created_at: string | null
          dispatch_number: string | null
          hours_in_state: number | null
          id: string | null
          is_stale: boolean | null
          sla_hours: number | null
          status: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      integration_configs_public: {
        Row: {
          auto_sync_enabled: boolean | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          instance_url: string | null
          integration_type: string | null
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_status: string | null
          last_synced_at: string | null
          organization_id: string | null
          provider: string | null
          sync_interval_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          auto_sync_enabled?: boolean | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          instance_url?: string | null
          integration_type?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          organization_id?: string | null
          provider?: string | null
          sync_interval_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_sync_enabled?: boolean | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          instance_url?: string | null
          integration_type?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          organization_id?: string | null
          provider?: string | null
          sync_interval_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_webhooks_public: {
        Row: {
          created_at: string | null
          events: string[] | null
          failure_count: number | null
          id: string | null
          is_active: boolean | null
          last_response_status: number | null
          last_triggered_at: string | null
          partner_id: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          events?: string[] | null
          failure_count?: number | null
          id?: string | null
          is_active?: boolean | null
          last_response_status?: number | null
          last_triggered_at?: string | null
          partner_id?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          events?: string[] | null
          failure_count?: number | null
          id?: string | null
          is_active?: boolean | null
          last_response_status?: number | null
          last_triggered_at?: string | null
          partner_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_webhooks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_directory: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          employment_type: string | null
          full_name: string | null
          hire_date: string | null
          id: string | null
          job_title: string | null
          organization_id: string | null
          partner_id: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          employment_type?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string | null
          job_title?: string | null
          organization_id?: string | null
          partner_id?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          employment_type?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string | null
          job_title?: string | null
          organization_id?: string | null
          partner_id?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _invoke_send_transactional_email: {
        Args: {
          _idempotency_key: string
          _organization_id: string
          _recipient: string
          _template: string
          _template_data: Json
        }
        Returns: undefined
      }
      _lc_user_org: { Args: never; Returns: string }
      add_public_ticket_message: {
        Args: { p_message: string; p_token: string }
        Returns: string
      }
      adopt_recommendation: { Args: { p_id: string }; Returns: undefined }
      append_ledger_entry: {
        Args: {
          p_action_type: string
          p_amount?: number
          p_currency?: string
          p_description?: string
          p_metadata?: Json
          p_module: string
          p_reference_id?: string
          p_reference_type?: string
          p_tenant_id?: string
        }
        Returns: {
          entry_hash: string
          id: string
          sequence_number: number
        }[]
      }
      approve_user_profile: { Args: { p_user_id: string }; Returns: boolean }
      assert_no_open_rls_policies: {
        Args: never
        Returns: {
          policy_name: string
          qual: string
          reason: string
          schema_name: string
          table_name: string
        }[]
      }
      audit_pending_payroll: { Args: never; Returns: Json }
      audit_staff_salary: { Args: { p_salary_id: string }; Returns: Json }
      bump_rate_limit: {
        Args: {
          p_bucket: string
          p_identifier: string
          p_window_seconds: number
        }
        Returns: {
          out_count: number
          out_window_start: string
        }[]
      }
      calculate_commission: {
        Args: { p_gross_amount: number; p_reseller_rate?: number }
        Returns: {
          reseller_amount: number
          routeace_amount: number
        }[]
      }
      calculate_sla_deadline: {
        Args: { p_dispatch_date: string; p_sla_duration_days: number }
        Returns: string
      }
      calculate_sla_risk_score: {
        Args: { p_dispatch_id: string }
        Returns: number
      }
      caller_org_ids: { Args: never; Returns: string[] }
      caller_rcids: { Args: never; Returns: string[] }
      can_manage_organization: {
        Args: { _actor_id: string; _organization_id: string }
        Returns: boolean
      }
      can_manage_user_profile: {
        Args: { _actor_id: string; _target_user_id: string }
        Returns: boolean
      }
      check_single_tenant_mode: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      check_super_admin_ip: {
        Args: { _ip_address: unknown; _user_id: string }
        Returns: boolean
      }
      compute_user_kpis: {
        Args: {
          p_period_end?: string
          p_period_start?: string
          p_user_id: string
        }
        Returns: Json
      }
      create_initial_super_admin: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      current_user_email: { Args: never; Returns: string }
      current_user_in_org: { Args: { _org: string }; Returns: boolean }
      current_vendor_partner_id: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      dept_cost_centre_summary: {
        Args: { p_end?: string; p_start?: string }
        Returns: Json
      }
      detect_sla_breaches: { Args: never; Returns: number }
      dismiss_recommendation: { Args: { p_id: string }; Returns: undefined }
      emit_kpi_event: {
        Args: { _event_key: string; _organization_id: string; _payload?: Json }
        Returns: string
      }
      enqueue_async_job: {
        Args: {
          _job_type: string
          _max_attempts?: number
          _organization_id?: string
          _payload?: Json
          _priority?: number
          _scheduled_at?: string
        }
        Returns: string
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_leave_balance: {
        Args: { p_org_id: string; p_user_id: string; p_year: number }
        Returns: undefined
      }
      evaluate_feature_flag: {
        Args: { _flag_key: string; _organization_id?: string }
        Returns: Json
      }
      evaluate_feature_flags: {
        Args: { _flag_keys: string[]; _organization_id?: string }
        Returns: Json
      }
      execute_dispatch_transition: {
        Args: {
          p_dispatch_id: string
          p_metadata?: Json
          p_new_state: string
          p_reason?: string
          p_user_id: string
        }
        Returns: Json
      }
      force_approve_user_profile: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      generate_recommendations: { Args: { p_user_id: string }; Returns: Json }
      generate_transporter_billing: {
        Args: { p_billing_month?: string }
        Returns: {
          drop_charge: number
          org_id: string
          total_charge: number
          transporter_id: string
          vehicle_charge: number
        }[]
      }
      get_core_role: { Args: { _user_id: string }; Returns: string }
      get_customer_invite_by_token: {
        Args: { _token: string }
        Returns: {
          customer_id: string
          email: string
          expires_at: string
          full_name: string
          id: string
          organization_id: string
          used_at: string
        }[]
      }
      get_delivery_csat_context: {
        Args: { p_token: string }
        Returns: {
          already_rated: boolean
          customer_name: string
          dispatch_number: string
          expired: boolean
          organization_name: string
        }[]
      }
      get_erp_connection_secrets: {
        Args: { _connection_id: string }
        Returns: Json
      }
      get_integration_config_secrets: {
        Args: { _integration_config_id: string }
        Returns: Json
      }
      get_integration_secrets: {
        Args: { _integration_id: string }
        Returns: Json
      }
      get_org_member_identities: {
        Args: { _user_ids: string[] }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      get_partner_webhook_secret: {
        Args: { _webhook_id: string }
        Returns: string
      }
      get_public_org_by_slug: {
        Args: { p_slug: string }
        Returns: {
          id: string
          name: string
          slug: string
        }[]
      }
      get_public_ticket_messages: {
        Args: { p_token: string }
        Returns: {
          created_at: string
          message: string
          sender: string
        }[]
      }
      get_public_ticket_status: {
        Args: { p_token: string }
        Returns: {
          created_at: string
          csat: number
          csat_link_expires_at: string
          csat_pct: number
          organization_name: string
          priority: string
          ref: string
          resolved_at: string
          status: string
          subject: string
          updated_at: string
        }[]
      }
      get_queue_health_snapshot: { Args: never; Returns: Json }
      get_tenant_isolation_audit: {
        Args: never
        Returns: {
          has_indirect_link: boolean
          has_organization_id: boolean
          has_tenant_id: boolean
          has_user_id: boolean
          policy_count: number
          rls_enabled: boolean
          table_name: string
          verdict: string
        }[]
      }
      get_user_organization: { Args: { p_user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in_org: {
        Args: {
          _org_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      is_core_team: { Args: { _user_id: string }; Returns: boolean }
      is_customer_user_for_customer: {
        Args: { _customer_id: string; _user_id: string }
        Returns: boolean
      }
      is_customer_user_for_dispatch: {
        Args: { _dispatch_id: string; _user_id: string }
        Returns: boolean
      }
      is_elevated_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_finance_manager: { Args: { _user_id: string }; Returns: boolean }
      is_internal_team: { Args: { _user_id: string }; Returns: boolean }
      is_ops_manager: { Args: { _user_id: string }; Returns: boolean }
      is_org_admin: { Args: { _user_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member_of: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_owner: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: boolean
      }
      is_platform_owner: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_valid_driver_profile_picture_object: {
        Args: { _bucket_id: string; _metadata: Json; _name: string }
        Returns: boolean
      }
      is_valid_profile_picture_object: {
        Args: { _bucket_id: string; _metadata: Json; _name: string }
        Returns: boolean
      }
      kpi_performance_pct: {
        Args: { p_actual: number; p_direction: string; p_target: number }
        Returns: number
      }
      log_cfo_brief_access: {
        Args: { _agent?: string; _brief_id: string; _ip?: string }
        Returns: string
      }
      log_control_center_kpi: {
        Args: {
          p_actual: number
          p_formula?: string
          p_inputs?: Json
          p_metric_key: string
          p_period_end: string
          p_period_start: string
          p_role_tag?: string
          p_source_module: string
          p_target: number
        }
        Returns: string
      }
      log_platform_event: {
        Args: {
          p_event_class: string
          p_message: string
          p_organization_id?: string
          p_payload?: Json
          p_resource?: string
          p_severity?: string
          p_source?: string
          p_tenant_mode?: string
        }
        Returns: string
      }
      log_profile_picture_upload_event: {
        Args: {
          _action: string
          _error_code?: string
          _error_message?: string
          _file_size_bytes?: number
          _mime_type?: string
          _outcome: string
        }
        Returns: undefined
      }
      mark_csat_reminder_sent: {
        Args: { p_ticket_id: string }
        Returns: undefined
      }
      mark_overdue_invoices: { Args: never; Returns: number }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      profile_picture_error_category: {
        Args: { _message: string }
        Returns: string
      }
      rate_delivery_csat: {
        Args: {
          p_comment?: string
          p_nps?: number
          p_rating: number
          p_token: string
        }
        Returns: Json
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_intel_scope_violation: {
        Args: {
          p_attempted_module: string
          p_details?: Json
          p_route: string
          p_view_scope: string
        }
        Returns: string
      }
      record_payslip_download: {
        Args: { p_payslip_id: string }
        Returns: undefined
      }
      record_usage_meter: {
        Args: {
          _metadata?: Json
          _meter_key: string
          _organization_id: string
          _quantity: number
        }
        Returns: string
      }
      record_workflow_check: {
        Args: {
          _details?: Json
          _organization_id?: string
          _status: string
          _workflow_key: string
        }
        Returns: string
      }
      refresh_my_kpis: { Args: never; Returns: Json }
      refresh_staff_status_for_user: {
        Args: { _organization_id?: string; _user_id: string }
        Returns: undefined
      }
      resolve_kpi_target: {
        Args: { p_metric_key: string; p_org_id: string; p_role_tag: string }
        Returns: number
      }
      rollup_org_performance: {
        Args: {
          p_organization_id?: string
          p_period_end?: string
          p_period_start?: string
        }
        Returns: {
          avg_score: number
          green_count: number
          organization_id: string
          red_count: number
          role_tag: string
          user_count: number
          yellow_count: number
        }[]
      }
      rollup_team_performance: {
        Args: {
          p_organization_id?: string
          p_period_end?: string
          p_period_start?: string
          p_role_tag?: string
        }
        Returns: {
          composite_score: number
          green_count: number
          kpi_count: number
          organization_id: string
          red_count: number
          role_tag: string
          user_id: string
          yellow_count: number
        }[]
      }
      run_predeploy_readiness_check: { Args: never; Returns: Json }
      run_rls_smoke_tests: { Args: never; Returns: string }
      run_tenant_isolation_suite: { Args: never; Returns: string }
      set_erp_connection_secrets: {
        Args: { _connection_id: string; _secrets: Json }
        Returns: undefined
      }
      set_erp_connection_secrets_service: {
        Args: { _connection_id: string; _secrets: Json }
        Returns: undefined
      }
      set_integration_config_secrets: {
        Args: { _integration_config_id: string; _secrets: Json }
        Returns: undefined
      }
      set_integration_config_secrets_service: {
        Args: { _integration_config_id: string; _secrets: Json }
        Returns: undefined
      }
      set_integration_secrets: {
        Args: { _integration_id: string; _secrets: Json }
        Returns: undefined
      }
      set_partner_webhook_secret: {
        Args: { _secret: string; _webhook_id: string }
        Returns: undefined
      }
      set_user_leave_allocation: {
        Args: {
          p_allocated_days: number
          p_leave_type: Database["public"]["Enums"]["leave_type"]
          p_year?: number
          target_user_id: string
        }
        Returns: undefined
      }
      slugify: { Args: { p_text: string }; Returns: string }
      submit_public_support_ticket:
        | {
            Args: {
              p_channel?: string
              p_complainant_email: string
              p_complainant_name: string
              p_complainant_phone?: string
              p_message: string
              p_order_id?: string
              p_org_slug: string
              p_subject: string
              p_tag?: string
            }
            Returns: {
              public_token: string
              ticket_id: string
              ticket_ref: string
            }[]
          }
        | {
            Args: {
              p_attachments?: Json
              p_channel?: string
              p_complainant_email: string
              p_complainant_name: string
              p_complainant_phone?: string
              p_message: string
              p_order_id?: string
              p_org_slug: string
              p_subject: string
              p_tag?: string
            }
            Returns: {
              public_token: string
              ticket_ref: string
            }[]
          }
      submit_support_csat: {
        Args: {
          p_comment?: string
          p_ip?: string
          p_rating: number
          p_token: string
          p_user_agent?: string
        }
        Returns: Json
      }
      support_breached_tickets: {
        Args: { p_org_id: string }
        Returns: {
          id: string
          minutes_overdue: number
          ref: string
          sla_deadline: string
          status: string
          subject: string
        }[]
      }
      support_center_agents: {
        Args: { p_org_id: string }
        Returns: {
          avg_handle_seconds: number
          csat_avg: number
          full_name: string
          role: string
          tickets_today: number
          user_id: string
        }[]
      }
      support_center_kpis: {
        Args: { p_from?: string; p_org_id: string; p_to?: string }
        Returns: Json
      }
      support_export_data: {
        Args: { p_from?: string; p_org_id: string; p_to?: string }
        Returns: {
          channel: string
          complainant_email: string
          created_at: string
          csat: number
          csat_pct: number
          csat_submitted_at: string
          customer_name: string
          dispatch_number: string
          driver_name: string
          nps_band: string
          order_id: string
          priority: string
          ref: string
          resolution_minutes: number
          resolved_at: string
          route_id: string
          sla_deadline: string
          sla_met: boolean
          status: string
          subject: string
          tag: string
          transporter_name: string
        }[]
      }
      support_pending_csat_reminders: {
        Args: never
        Returns: {
          complainant_email: string
          customer_name: string
          organization_id: string
          public_token: string
          ref: string
          resolved_at: string
          subject: string
          ticket_id: string
        }[]
      }
      support_ticket_audit_list: {
        Args: { p_ticket_id: string }
        Returns: {
          actor_label: string
          created_at: string
          event_type: string
          from_value: string
          meta: Json
          to_value: string
        }[]
      }
      validate_dispatch_transition: {
        Args: {
          p_dispatch_id: string
          p_new_state: string
          p_reason?: string
          p_user_id: string
        }
        Returns: Json
      }
      validate_storage_object_paths: {
        Args: never
        Returns: {
          bucket_id: string
          issue: string
          object_name: string
          owner: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "operations"
        | "support"
        | "dispatcher"
        | "driver"
        | "super_admin"
        | "org_admin"
        | "ops_manager"
        | "finance_manager"
        | "customer"
        | "internal_team"
        | "core_founder"
        | "core_builder"
        | "core_product"
        | "core_engineer"
        | "core_cofounder"
        | "core_analyst"
      dispatch_state:
        | "created"
        | "pending_approval"
        | "approved"
        | "assigned"
        | "enroute"
        | "picked_up"
        | "in_transit"
        | "delivered"
        | "closed"
        | "invoiced"
        | "cancelled"
      expense_category:
        | "fuel"
        | "maintenance"
        | "driver_salary"
        | "insurance"
        | "tolls"
        | "parking"
        | "repairs"
        | "administrative"
        | "marketing"
        | "utilities"
        | "rent"
        | "equipment"
        | "other"
        | "cogs"
      leave_impact_level: "low" | "medium" | "high"
      leave_status:
        | "pending"
        | "pending_super_admin"
        | "approved"
        | "rejected"
        | "cancelled"
        | "modification_requested"
      leave_type: "annual" | "sick" | "emergency"
      subscription_tier: "starter" | "professional" | "enterprise"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "operations",
        "support",
        "dispatcher",
        "driver",
        "super_admin",
        "org_admin",
        "ops_manager",
        "finance_manager",
        "customer",
        "internal_team",
        "core_founder",
        "core_builder",
        "core_product",
        "core_engineer",
        "core_cofounder",
        "core_analyst",
      ],
      dispatch_state: [
        "created",
        "pending_approval",
        "approved",
        "assigned",
        "enroute",
        "picked_up",
        "in_transit",
        "delivered",
        "closed",
        "invoiced",
        "cancelled",
      ],
      expense_category: [
        "fuel",
        "maintenance",
        "driver_salary",
        "insurance",
        "tolls",
        "parking",
        "repairs",
        "administrative",
        "marketing",
        "utilities",
        "rent",
        "equipment",
        "other",
        "cogs",
      ],
      leave_impact_level: ["low", "medium", "high"],
      leave_status: [
        "pending",
        "pending_super_admin",
        "approved",
        "rejected",
        "cancelled",
        "modification_requested",
      ],
      leave_type: ["annual", "sick", "emergency"],
      subscription_tier: ["starter", "professional", "enterprise"],
    },
  },
} as const
