// Central toast re-export that auto-reports error toasts to platform_errors.
// Import from here instead of "sonner" directly so every toast.error() is captured.
import { toast as sonnerToast, Toaster } from "sonner";
export { Toaster };

const reportError = (message: string) => {
  import("@/hooks/usePlatformErrorReporter").then(({ reportPlatformError }) => {
    reportPlatformError(message, { error_type: "client", severity: "error" });
  }).catch(() => {});
};

// Re-export the full sonner toast object with error/warning overridden
export const toast: typeof sonnerToast = new Proxy(sonnerToast, {
  apply(target, thisArg, args) {
    return Reflect.apply(target, thisArg, args);
  },
  get(target, prop) {
    const original = (target as any)[prop];
    if (prop === "error") {
      return (message: unknown, options?: unknown) => {
        if (message) reportError(String(message));
        return (original as Function).call(target, message, options);
      };
    }
    if (prop === "warning") {
      return (message: unknown, options?: unknown) => {
        if (message) {
          import("@/hooks/usePlatformErrorReporter").then(({ reportPlatformError }) => {
            reportPlatformError(String(message), { error_type: "client", severity: "warning" });
          }).catch(() => {});
        }
        return (original as Function).call(target, message, options);
      };
    }
    if (typeof original === "function") return original.bind(target);
    return original;
  },
});

export default toast;
