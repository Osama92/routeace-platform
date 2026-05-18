/**
 * EntitlementGate - Universal entitlement enforcement component.
 * 
 * Wraps any feature/button/page and checks plan + role + credits + OS.
 * Shows upgrade prompt when denied. Never shows broken buttons.
 */
import React from "react";
import { useEntitlementEngine } from "@/hooks/useEntitlementEngine";
import { UpgradePrompt } from "./UpgradePrompt";
import type { PlatformProduct } from "@/lib/entitlements/engine";

interface EntitlementGateProps {
  /** Required plan tier */
  requiredPlan?: string;
  /** Required AI action (checks credits) */
  aiAction?: string;
  /** Allowed roles */
  allowedRoles?: string[];
  /** Feature OS boundary check */
  featureOS?: PlatformProduct;
  currentOS?: PlatformProduct;
  /** Usage resource check */
  usageResource?: string;
  usageCurrent?: number;
  /** Custom feature label for upgrade prompt */
  featureLabel?: string;
  /** Hide entirely vs show upgrade prompt */
  hideWhenDenied?: boolean;
  /** Custom fallback */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function EntitlementGate({
  requiredPlan,
  aiAction,
  allowedRoles,
  featureOS,
  currentOS,
  usageResource,
  usageCurrent,
  featureLabel,
  hideWhenDenied = false,
  fallback,
  children,
}: EntitlementGateProps) {
  const engine = useEntitlementEngine();

  if (engine.isLoading) return null;

  // Plan + role check
  if (requiredPlan) {
    const result = engine.checkFeature(requiredPlan, allowedRoles);
    if (!result.allowed) {
      if (hideWhenDenied) return null;
      if (fallback) return <>{fallback}</>;
      return (
        <UpgradePrompt
          reason={result.reason!}
          message={result.message!}
          upgradeTo={result.upgradeTo}
          featureLabel={featureLabel}
        />
      );
    }
  }

  // AI credit check
  if (aiAction) {
    const result = engine.checkAI(aiAction);
    if (!result.allowed) {
      if (hideWhenDenied) return null;
      if (fallback) return <>{fallback}</>;
      return (
        <UpgradePrompt
          reason={result.reason!}
          message={result.message!}
          upgradeTo={result.upgradeTo}
          creditsNeeded={result.creditsNeeded}
          creditsAvailable={result.creditsAvailable}
          featureLabel={featureLabel}
        />
      );
    }
  }

  // OS boundary check
  if (featureOS && currentOS) {
    const result = engine.checkOS(featureOS, currentOS);
    if (!result.allowed) {
      if (hideWhenDenied) return null;
      return null; // OS violations are silently hidden
    }
  }

  // Usage limit check
  if (usageResource && usageCurrent !== undefined) {
    const result = engine.checkUsage(usageResource, usageCurrent);
    if (!result.allowed) {
      if (hideWhenDenied) return null;
      if (fallback) return <>{fallback}</>;
      return (
        <UpgradePrompt
          reason={result.reason!}
          message={result.message!}
          featureLabel={featureLabel}
        />
      );
    }
  }

  return <>{children}</>;
}

/**
 * EntitlementButton - Wraps a button and disables/hides when not entitled.
 */
export function EntitlementButton({
  requiredPlan,
  aiAction,
  featureLabel,
  children,
  onClick,
  className,
  ...props
}: {
  requiredPlan?: string;
  aiAction?: string;
  featureLabel?: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const engine = useEntitlementEngine();

  let denied = false;
  let denyMessage = "";

  if (requiredPlan) {
    const result = engine.checkFeature(requiredPlan);
    if (!result.allowed) {
      denied = true;
      denyMessage = result.message || "Upgrade required";
    }
  }

  if (!denied && aiAction) {
    const result = engine.checkAI(aiAction);
    if (!result.allowed) {
      denied = true;
      denyMessage = result.message || "Insufficient credits";
    }
  }

  if (denied) {
    return (
      <button
        className={`relative opacity-60 cursor-not-allowed ${className || ""}`}
        disabled
        title={denyMessage}
        {...props}
      >
        {children}
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
      </button>
    );
  }

  return (
    <button className={className} onClick={onClick} {...props}>
      {children}
    </button>
  );
}

export default EntitlementGate;
