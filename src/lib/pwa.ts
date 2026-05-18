// PWA + web-push registration.
// HARD RULES:
//   - Never register a SW in an iframe.
//   - Never register in non-production builds.
// In any blocked context, actively unregister any pre-existing SW.

import { supabase } from "@/integrations/supabase/client";

function isInIframe(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}

function canRegister(): boolean {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (isInIframe()) return false;
  return true;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  if (!canRegister()) {
    // Clean up any previously-registered SW so preview iframes don't serve stale content.
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch { /* ignore */ }
    return null;
  }

  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (e) {
    console.warn("[pwa] SW registration failed:", e);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function enablePushNotifications(): Promise<{ ok: boolean; reason?: string }> {
  if (!canRegister()) return { ok: false, reason: "Push is disabled in preview/iframe contexts" };
  if (!("Notification" in window) || !("PushManager" in window)) {
    return { ok: false, reason: "Push not supported in this browser" };
  }

  const reg = (await navigator.serviceWorker.getRegistration("/")) ?? (await registerServiceWorker());
  if (!reg) return { ok: false, reason: "Service worker unavailable" };

  // Fetch VAPID public key from the edge function (GET).
  const { data: keyRes, error: keyErr } = await supabase.functions.invoke("register-push-subscription", {
    method: "GET" as any,
  });
  if (keyErr || !(keyRes as any)?.vapid_public_key) {
    return { ok: false, reason: "Push not configured (missing VAPID key)" };
  }
  const vapid = (keyRes as any).vapid_public_key as string;

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "Notification permission denied" };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid) as unknown as BufferSource,
    });
  }

  const payload = sub.toJSON();
  const { error } = await supabase.functions.invoke("register-push-subscription", {
    body: {
      endpoint: payload.endpoint,
      keys: payload.keys,
      user_agent: navigator.userAgent,
    },
  });
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}
