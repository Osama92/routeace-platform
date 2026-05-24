import { useMemo } from "react";
import { INTEGRATION_CATALOG } from "@/lib/integrations/catalog";

const STORAGE_KEY = "routeace.integration.connections.v1";

interface ErpInfo {
  id: string;
  name: string;
  connected: boolean;
}

const ACCOUNTING_IDS = ["quickbooks", "xero", "zoho_books", "sage", "wave"];

export function useActiveErp(): ErpInfo {
  return useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { id: "zoho_books", name: "Zoho Books", connected: false };
      const connections: Record<string, { status: string }> = JSON.parse(raw);
      for (const appId of ACCOUNTING_IDS) {
        if (connections[appId]?.status === "connected") {
          const catalog = INTEGRATION_CATALOG.find((a) => a.id === appId);
          return { id: appId, name: catalog?.name ?? appId, connected: true };
        }
      }
    } catch {
      // ignore parse errors
    }
    return { id: "zoho_books", name: "Zoho Books", connected: false };
  }, []);
}
