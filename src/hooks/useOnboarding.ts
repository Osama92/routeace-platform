import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingState {
  setup_company: boolean;
  setup_vehicles: boolean;
  setup_drivers: boolean;
  setup_pricing: boolean;
  first_order: boolean;
  first_dispatch: boolean;
  first_invoice: boolean;
  zoho_sync: boolean;
  current_step: number;
  dismissed: boolean;
  completed_at: string | null;
}

const ONBOARDING_STEPS = [
  { key: "setup_company", title: "Setup company profile", description: "Add your company details, logo, and bank information" },
  { key: "setup_vehicles", title: "Add vehicles", description: "Register your fleet vehicles" },
  { key: "setup_drivers", title: "Add drivers", description: "Add drivers and assign to vehicles" },
  { key: "setup_pricing", title: "Configure pricing", description: "Set up trip rates and pricing rules" },
  { key: "first_order", title: "Create first order", description: "Create your first delivery order" },
  { key: "first_dispatch", title: "Dispatch", description: "Assign a driver and vehicle to the order" },
  { key: "first_invoice", title: "Generate invoice", description: "Create and send your first invoice" },
  { key: "zoho_sync", title: "Sync to Zoho", description: "Connect and sync with Zoho Books" }
];

const STORAGE_KEY = "routeace_onboarding";

// Use localStorage for onboarding state until table is available
function getStoredOnboarding(userId: string): OnboardingState | null {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function setStoredOnboarding(userId: string, state: OnboardingState) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(state));
  } catch {
    console.error("Failed to store onboarding state");
  }
}

const DEFAULT_STATE: OnboardingState = {
  setup_company: false,
  setup_vehicles: false,
  setup_drivers: false,
  setup_pricing: false,
  first_order: false,
  first_dispatch: false,
  first_invoice: false,
  zoho_sync: false,
  current_step: 1,
  dismissed: false,
  completed_at: null
};

export function useOnboarding() {
  const { user } = useAuth();
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch onboarding state
  const fetchOnboarding = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Use localStorage for now
      const stored = getStoredOnboarding(user.id);
      if (stored) {
        setOnboardingState(stored);
      } else {
        setOnboardingState(DEFAULT_STATE);
        setStoredOnboarding(user.id, DEFAULT_STATE);
      }
    } catch (err) {
      console.error("Error fetching onboarding:", err);
      setOnboardingState(DEFAULT_STATE);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOnboarding();
  }, [fetchOnboarding]);

  // Mark a step as complete
  const completeStep = useCallback(async (stepKey: keyof OnboardingState) => {
    if (!user || !onboardingState) return;

    try {
      const updates: Partial<OnboardingState> = {
        [stepKey]: true,
        current_step: Math.max(
          onboardingState.current_step,
          ONBOARDING_STEPS.findIndex(s => s.key === stepKey) + 2
        )
      };

      // Check if all steps are complete
      const allStepsComplete = ONBOARDING_STEPS.every(
        step => onboardingState[step.key as keyof OnboardingState] || step.key === stepKey
      );

      if (allStepsComplete) {
        updates.completed_at = new Date().toISOString();
      }

      const newState = { ...onboardingState, ...updates };
      setOnboardingState(newState);
      setStoredOnboarding(user.id, newState);
    } catch (err) {
      console.error("Error completing step:", err);
    }
  }, [user, onboardingState]);

  // Dismiss onboarding
  const dismissOnboarding = useCallback(async () => {
    if (!user || !onboardingState) return;

    try {
      const newState = { ...onboardingState, dismissed: true };
      setOnboardingState(newState);
      setStoredOnboarding(user.id, newState);
    } catch (err) {
      console.error("Error dismissing onboarding:", err);
    }
  }, [user, onboardingState]);

  const currentStepIndex = onboardingState?.current_step ? onboardingState.current_step - 1 : 0;
  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const isComplete = onboardingState?.completed_at !== null;
  const showOnboarding = !loading && onboardingState && !onboardingState.dismissed && !isComplete;

  const completedSteps = ONBOARDING_STEPS.filter(
    step => onboardingState?.[step.key as keyof OnboardingState]
  ).length;

  const progress = (completedSteps / ONBOARDING_STEPS.length) * 100;

  return {
    onboardingState,
    loading,
    steps: ONBOARDING_STEPS,
    currentStep,
    currentStepIndex,
    isComplete,
    showOnboarding,
    completedSteps,
    progress,
    completeStep,
    dismissOnboarding,
    refresh: fetchOnboarding
  };
}

export default useOnboarding;
