import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("pwa-dismissed")) return;

    // Don't show inside iframes (Lovable preview)
    try {
      if (window.self !== window.top) return;
    } catch {
      return;
    }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia?.("(display-mode: standalone)").matches;
    if (standalone) return;

    if (ios) {
      setIsIOS(true);
      setVisible(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setPrompt(null);
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem("pwa-dismissed", "1");
  };

  if (!visible) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[100] animate-in slide-in-from-bottom-4">
      <div className="bg-card border border-border rounded-lg shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">
              Add RouteAce to Home Screen
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isIOS
                ? 'Tap Share then "Add to Home Screen"'
                : "Get instant access and notifications"}
            </p>
            {!isIOS && (
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={install}>Install</Button>
                <Button size="sm" variant="ghost" onClick={dismiss}>Not now</Button>
              </div>
            )}
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default PWAInstallPrompt;
