export type IntegrationCategory = "accounting" | "crm" | "payments" | "communication";

export type AuthMode = "oauth" | "api_key";

export interface IntegrationApp {
  id: string;
  name: string;
  logo: string;
  category: IntegrationCategory;
  description: string;
  authMode: AuthMode;
  fields?: { key: string; label: string; placeholder?: string; type?: "text" | "password" }[];
  defaultMappings: { source: string; target: string; confidence: number }[];
  oauthHint?: string;
  /** Key into DETAILED_GUIDES in src/pages/dept/erp-connection-guides.tsx */
  guideKey?: string;
  /** When true the wizard kicks off a real provider OAuth flow instead of the mock validate step */
  managedOauth?: "quickbooks";
}

export const INTEGRATION_CATALOG: IntegrationApp[] = [
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    logo: "📘",
    category: "accounting",
    description: "Sync invoices, bills, and payments with QuickBooks.",
    authMode: "oauth",
    managedOauth: "quickbooks",
    guideKey: "quickbooks_online",
    oauthHint: "We'll redirect you to Intuit to grant read/write access.",
    defaultMappings: [
      { source: "Customers", target: "Customers", confidence: 95 },
      { source: "Invoices", target: "Invoices", confidence: 92 },
      { source: "Payments", target: "Payments", confidence: 90 },
      { source: "Chart of Accounts", target: "GL Accounts", confidence: 78 },
    ],
  },
  {
    id: "xero",
    name: "Xero",
    logo: "📙",
    category: "accounting",
    description: "Two-way sync for invoices, bills, contacts, and bank feeds.",
    authMode: "oauth",
    guideKey: "xero",
    defaultMappings: [
      { source: "Customers", target: "Contacts", confidence: 88 },
      { source: "Invoices", target: "Sales Invoices", confidence: 94 },
      { source: "Payments", target: "Payments", confidence: 91 },
    ],
  },
  {
    id: "zoho_books",
    name: "Zoho Books",
    logo: "📗",
    category: "accounting",
    description: "Sync invoices, bills, COA, and payments with Zoho Books.",
    authMode: "api_key",
    guideKey: "zoho_books",
    fields: [
      { key: "organization_id", label: "Zoho Organization ID", placeholder: "60012345678" },
      { key: "client_id", label: "Client ID", type: "text" },
      { key: "client_secret", label: "Client Secret", type: "password" },
    ],
    defaultMappings: [
      { source: "Customers", target: "Customers", confidence: 96 },
      { source: "Invoices", target: "Invoices", confidence: 94 },
      { source: "Payments", target: "Payments", confidence: 89 },
    ],
  },
  {
    id: "hubspot",
    name: "HubSpot",
    logo: "🟧",
    category: "crm",
    description: "Sync leads, contacts, and deal stages bidirectionally.",
    authMode: "oauth",
    defaultMappings: [
      { source: "Customers", target: "Contacts", confidence: 90 },
      { source: "Leads", target: "Leads", confidence: 95 },
      { source: "Opportunities", target: "Deals", confidence: 87 },
    ],
  },
  {
    id: "stripe",
    name: "Stripe",
    logo: "💳",
    category: "payments",
    description: "Accept card payments and reconcile payouts.",
    authMode: "api_key",
    fields: [
      { key: "publishable_key", label: "Publishable Key", placeholder: "pk_live_..." },
      { key: "secret_key", label: "Secret Key", type: "password", placeholder: "sk_live_..." },
    ],
    defaultMappings: [
      { source: "Payments", target: "Charges", confidence: 97 },
      { source: "Customers", target: "Customers", confidence: 92 },
      { source: "Refunds", target: "Refunds", confidence: 95 },
    ],
  },
  {
    id: "paystack",
    name: "Paystack",
    logo: "🟦",
    category: "payments",
    description: "Nigerian-first card, transfer, and USSD payments.",
    authMode: "api_key",
    fields: [
      { key: "public_key", label: "Public Key", placeholder: "pk_live_..." },
      { key: "secret_key", label: "Secret Key", type: "password", placeholder: "sk_live_..." },
    ],
    defaultMappings: [
      { source: "Payments", target: "Transactions", confidence: 96 },
      { source: "Customers", target: "Customers", confidence: 88 },
    ],
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    logo: "💬",
    category: "communication",
    description: "Send delivery updates, OTPs, and POD requests via WhatsApp.",
    authMode: "api_key",
    fields: [
      { key: "phone_number_id", label: "Phone Number ID" },
      { key: "access_token", label: "Permanent Access Token", type: "password" },
    ],
    defaultMappings: [
      { source: "Dispatch Updates", target: "Template Messages", confidence: 85 },
      { source: "POD Requests", target: "Interactive Messages", confidence: 80 },
    ],
  },
  {
    id: "africastalking",
    name: "Africa's Talking SMS",
    logo: "📨",
    category: "communication",
    description: "Reliable SMS fallback across African networks.",
    authMode: "api_key",
    fields: [
      { key: "username", label: "Username" },
      { key: "api_key", label: "API Key", type: "password" },
    ],
    defaultMappings: [
      { source: "Dispatch Alerts", target: "SMS", confidence: 99 },
      { source: "OTP", target: "SMS", confidence: 99 },
    ],
  },
];

export const CATEGORIES: { id: IntegrationCategory; label: string; icon: string }[] = [
  { id: "accounting", label: "Accounting", icon: "📊" },
  { id: "crm", label: "CRM", icon: "👥" },
  { id: "payments", label: "Payments", icon: "💳" },
  { id: "communication", label: "Communication", icon: "💬" },
];
