import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink } from "lucide-react";

export type GuideSection = {
  heading: string;
  ordered?: boolean;
  items: (string | { text: string; sub?: string[] })[];
};

export type DetailedGuide = {
  title: string;
  intro: string;
  sections: GuideSection[];
  fields: { label: string; value: string }[];
  docs?: string;
  oauth?: boolean;
};

const M = (s: string) => <span className="font-mono text-foreground">{s}</span>;

export const DETAILED_GUIDES: Record<string, DetailedGuide> = {
  sap: {
    title: "SAP S/4HANA Connection Guide",
    intro:
      "SAP has no central developer portal. Each client provisions credentials inside their own SAP tenant and shares them with you.",
    sections: [
      {
        heading: "Step 1 - Create a Communication User",
        ordered: true,
        items: [
          "Log in to SAP S/4HANA Fiori Launchpad as an administrator.",
          "Open Maintain Communication Users → New.",
          "Set a User Name (e.g. ROUTEACE_API) and generate a strong password.",
          "Save the user - you'll use this as the Client ID + Client Secret later.",
        ],
      },
      {
        heading: "Step 2 - Create a Communication System",
        ordered: true,
        items: [
          "Open Communication Systems → New.",
          "Set System ID and Hostname (your SAP API base host).",
          "Under Users for Inbound Communication, attach the user from Step 1.",
        ],
      },
      {
        heading: "Step 3 - Create a Communication Arrangement",
        ordered: true,
        items: [
          {
            text: "Open Communication Arrangements → New and pick a scenario:",
            sub: [
              "SAP_COM_0008 - Finance / Journals",
              "SAP_COM_0109 - Sales Orders",
              "SAP_COM_0053 - Procurement",
            ],
          },
          "Assign the Communication System from Step 2.",
          "Save and copy the Service URLs SAP displays.",
        ],
      },
    ],
    fields: [
      { label: "Instance URL", value: "Your SAP API base, e.g. https://my123456.s4hana.ondemand.com" },
      { label: "Client ID", value: "Communication User ID from Step 1" },
      { label: "Client Secret", value: "The password from Step 1" },
    ],
  },
  sap_wms: {
    title: "SAP WMS Cloud Connection Guide",
    intro: "Same Communication Arrangement model as SAP S/4HANA - use the WMS-specific scenario.",
    sections: [
      {
        heading: "Steps",
        ordered: true,
        items: [
          "Create a Communication User in your SAP WMS tenant.",
          "Create a Communication Arrangement using SAP_COM_0008 or your WMS-specific scenario.",
          "Assign the Communication User as Inbound user.",
          "Copy the user/password and the WMS API base URL.",
        ],
      },
    ],
    fields: [
      { label: "Instance URL", value: "Your SAP WMS API base host" },
      { label: "Client ID", value: "Communication User ID" },
      { label: "Client Secret", value: "Communication User password" },
    ],
  },
  jaggaer: {
    title: "Jaggaer Connection Guide",
    intro: "Jaggaer uses OAuth client credentials provisioned per buyer organization.",
    sections: [
      {
        heading: "Step 1 - Enable API Access",
        ordered: true,
        items: [
          "Log in to Jaggaer as an administrator.",
          "Navigate to Setup → Integration → API Access.",
          "Confirm your subscription includes API access (contact Jaggaer support if not).",
        ],
      },
      {
        heading: "Step 2 - Create an OAuth Client",
        ordered: true,
        items: [
          "Click New OAuth Client.",
          "Give it a name (e.g. ROUTEACE Sync) and select required modules (Sourcing, Contracts, etc.).",
          "Copy the Client ID and Client Secret immediately - the secret is only shown once.",
        ],
      },
    ],
    fields: [
      { label: "Instance URL", value: "Your Jaggaer tenant URL, e.g. https://yourorg.jaggaer.com" },
      { label: "Client ID", value: "OAuth Client ID from Step 2" },
      { label: "Client Secret", value: "OAuth Client Secret from Step 2" },
    ],
    docs: "https://www.jaggaer.com/api-documentation",
  },
  oracle: {
    title: "Oracle ERP Cloud Connection Guide",
    intro: "Oracle uses IDCS (Identity Cloud Service) to mint OAuth client credentials.",
    sections: [
      {
        heading: "Step 1 - Create a Confidential Application",
        ordered: true,
        items: [
          "Sign in to Oracle Cloud Console → Identity Cloud Service.",
          "Open Applications → Add → Confidential Application.",
          "Name it (e.g. ROUTEACE Integration), then Next.",
        ],
      },
      {
        heading: "Step 2 - Configure Client",
        ordered: true,
        items: [
          "Choose Configure this application as a client now.",
          "Enable Client Credentials and Resource Owner grant types.",
          "Add the Oracle ERP Cloud REST API as an allowed scope.",
          "Activate the application and copy the Client ID and Client Secret.",
        ],
      },
    ],
    fields: [
      { label: "Instance URL", value: "Your Oracle ERP REST endpoint (e.g. https://yourorg.fa.us2.oraclecloud.com)" },
      { label: "Client ID", value: "From IDCS application" },
      { label: "Client Secret", value: "From IDCS application" },
    ],
  },
  netsuite: {
    title: "NetSuite Connection Guide",
    intro: "NetSuite uses Token-Based Authentication (TBA) with OAuth 1.0a consumer credentials.",
    sections: [
      {
        heading: "Step 1 - Enable Required Features",
        ordered: true,
        items: [
          "Setup → Company → Enable Features → SuiteCloud tab.",
          "Check: Token-Based Authentication, REST Web Services, OAuth 2.0.",
          "Save.",
        ],
      },
      {
        heading: "Step 2 - Create Integration Record",
        ordered: true,
        items: [
          "Setup → Integration → Manage Integrations → New.",
          "Name it ROUTEACE, ensure Token-Based Authentication is checked.",
          "Save and copy the Consumer Key and Consumer Secret (shown only once).",
        ],
      },
      {
        heading: "Step 3 - Find your Account ID",
        items: [
          "Setup → Company → Company Information - copy the Account ID (e.g. 1234567 or 1234567_SB1 for sandbox).",
        ],
      },
    ],
    fields: [
      { label: "Instance URL", value: "https://[ACCOUNT_ID].suitetalk.api.netsuite.com" },
      { label: "Client ID", value: "Consumer Key from the Integration record" },
      { label: "Client Secret", value: "Consumer Secret from the Integration record" },
    ],
  },
  odoo: {
    title: "Odoo Connection Guide",
    intro: "Odoo uses simple per-user API keys - any user with sufficient access rights can generate one.",
    sections: [
      {
        heading: "Step 1 - Create a dedicated API user (recommended)",
        ordered: true,
        items: [
          "In Odoo, open Settings → Users & Companies → Users → Create.",
          "Set a login email (e.g. api@yourcompany.com) and grant the access rights you want exposed (Accounting, Inventory, Sales).",
        ],
      },
      {
        heading: "Step 2 - Generate an API Key",
        ordered: true,
        items: [
          "Open the user's preferences → Account Security → New API Key.",
          "Name it (e.g. ROUTEACE) and copy the generated key (shown once).",
        ],
      },
    ],
    fields: [
      { label: "Instance URL", value: "Your Odoo base URL, e.g. https://yourcompany.odoo.com" },
      { label: "Client ID", value: "The user's login email" },
      { label: "Client Secret", value: "The API key from Step 2" },
    ],
  },
  dynamics365: {
    title: "Microsoft Dynamics 365 Connection Guide",
    intro: "Dynamics 365 authenticates via an Azure AD App Registration using client credentials.",
    sections: [
      {
        heading: "Step 1 - Register an Azure AD Application",
        ordered: true,
        items: [
          "Open portal.azure.com → Azure Active Directory → App registrations → New registration.",
          "Name it ROUTEACE-D365 and choose Single tenant.",
          "Copy the Application (client) ID after creation.",
        ],
      },
      {
        heading: "Step 2 - Create a Client Secret",
        ordered: true,
        items: [
          "Open Certificates & secrets → New client secret.",
          "Choose an expiry (e.g. 24 months), copy the Value (only shown once).",
        ],
      },
      {
        heading: "Step 3 - Grant API Permissions",
        ordered: true,
        items: [
          "API permissions → Add → Dynamics CRM → user_impersonation.",
          "Click Grant admin consent.",
          "Inside Dynamics 365: Settings → Security → Application Users → New, paste the Application ID and assign the System Administrator (or scoped) role.",
        ],
      },
    ],
    fields: [
      { label: "Instance URL", value: "https://yourorg.crm.dynamics.com" },
      { label: "Client ID", value: "Application (client) ID from Azure AD" },
      { label: "Client Secret", value: "Secret Value from Step 2" },
    ],
  },
  sage: {
    title: "Sage Connection Guide",
    intro: "Sage Business Cloud uses OAuth 2.0 - credentials are created in the Sage Developer portal.",
    sections: [
      {
        heading: "Steps",
        ordered: true,
        items: [
          "Sign in to developer.sage.com and create a new application.",
          "Choose your Sage product (Accounting, Intacct, etc.) and the country.",
          "Copy the Client ID and Client Secret shown after creation.",
          "In your Sage account: Settings → Business settings → API Access → authorize the app.",
        ],
      },
    ],
    fields: [
      { label: "Instance URL", value: "The Sage API endpoint shown in the integration page" },
      { label: "Client ID", value: "From the Sage developer app" },
      { label: "Client Secret", value: "From the Sage developer app" },
    ],
    docs: "https://developer.sage.com",
  },
  blue_yonder: {
    title: "Blue Yonder Connection Guide",
    intro: "Blue Yonder credentials are provisioned by your Blue Yonder customer success contact.",
    sections: [
      {
        heading: "Steps",
        ordered: true,
        items: [
          "Open a support ticket with Blue Yonder requesting REST API credentials for ROUTEACE.",
          "Specify the modules (TMS, WMS, Demand) you need access to.",
          "Once provisioned, you'll receive a Client ID, Client Secret and base URL.",
        ],
      },
    ],
    fields: [
      { label: "Instance URL", value: "Provided by Blue Yonder" },
      { label: "Client ID", value: "Provided by Blue Yonder" },
      { label: "Client Secret", value: "Provided by Blue Yonder" },
    ],
  },
  manhattan: {
    title: "Manhattan Associates Connection Guide",
    intro: "Manhattan Active uses OAuth 2.0 - credentials are issued by your Manhattan admin or implementation partner.",
    sections: [
      {
        heading: "Steps",
        ordered: true,
        items: [
          "Contact your Manhattan Active administrator to provision an OAuth client for ROUTEACE.",
          "Specify the API scopes you need (Order, Inventory, WMS).",
          "Receive Client ID, Client Secret, and the OAuth token URL / API base URL.",
        ],
      },
    ],
    fields: [
      { label: "Instance URL", value: "Your Manhattan Active API base URL" },
      { label: "Client ID", value: "From Manhattan admin" },
      { label: "Client Secret", value: "From Manhattan admin" },
    ],
  },
  infor_wms: {
    title: "Infor WMS Connection Guide",
    intro: "Infor uses ION API gateway with OAuth Backend Service Account credentials.",
    sections: [
      {
        heading: "Steps",
        ordered: true,
        items: [
          "Open Infor ION API → Authorized Apps → New.",
          "Choose Backend Service type.",
          "Save and download the credentials JSON file.",
          "Copy ci (Client ID), cs (Client Secret) and the iu (token endpoint host).",
        ],
      },
    ],
    fields: [
      { label: "Instance URL", value: "Your Infor ION tenant URL" },
      { label: "Client ID", value: "ci value from credentials JSON" },
      { label: "Client Secret", value: "cs value from credentials JSON" },
    ],
  },
  cin7: {
    title: "Cin7 Connection Guide",
    intro: "Cin7 uses simple API username + key authentication.",
    sections: [
      {
        heading: "Steps",
        ordered: true,
        items: [
          "In Cin7, open Integrations & API → API v1 → Add User.",
          "Set a username and copy the generated API key.",
        ],
      },
    ],
    fields: [
      { label: "Instance URL", value: "https://api.cin7.com" },
      { label: "Client ID", value: "Cin7 API username" },
      { label: "Client Secret", value: "Cin7 API key" },
    ],
  },
  zoho_inventory: {
    title: "Zoho Inventory",
    intro: "One-click OAuth - no manual credentials needed.",
    oauth: true,
    sections: [
      {
        heading: "Steps",
        ordered: true,
        items: [
          "Click Connect with Zoho on the form.",
          "Sign in to Zoho and pick the Inventory organization.",
          "Approve the requested permissions.",
        ],
      },
    ],
    fields: [],
  },
  fishbowl: {
    title: "Fishbowl Connection Guide",
    intro: "Fishbowl exposes API access through Integration users created on the Fishbowl Server.",
    sections: [
      {
        heading: "Steps",
        ordered: true,
        items: [
          "Open Fishbowl Server → User Group → Integration → Add User.",
          "Set a username/password and assign API permissions.",
          "Note the host/port the Fishbowl Server listens on.",
        ],
      },
    ],
    fields: [
      { label: "Instance URL", value: "http(s)://your-fishbowl-host:port" },
      { label: "Client ID", value: "Integration username" },
      { label: "Client Secret", value: "Integration password" },
    ],
  },
  quickbooks_online: {
    title: "QuickBooks Online",
    intro: "One-click OAuth - no manual credentials needed.",
    oauth: true,
    sections: [
      {
        heading: "Steps",
        ordered: true,
        items: [
          "Click Connect with QuickBooks on the form.",
          "Sign in to Intuit and pick the QuickBooks company file.",
          "Approve the requested permissions.",
        ],
      },
    ],
    fields: [],
    docs: "https://developer.intuit.com/app/developer/qbo/docs/get-started",
  },
  xero: {
    title: "Xero",
    intro: "One-click OAuth - no manual credentials needed.",
    oauth: true,
    sections: [
      {
        heading: "Steps",
        ordered: true,
        items: [
          "Click Connect with Xero on the form.",
          "Sign in to Xero and select the organization to connect.",
          "Approve the requested permissions.",
        ],
      },
    ],
    fields: [],
    docs: "https://developer.xero.com/documentation/",
  },
  zoho_books: {
    title: "Zoho Books",
    intro: "One-click OAuth - no manual credentials needed.",
    oauth: true,
    sections: [
      {
        heading: "Steps",
        ordered: true,
        items: [
          "Click Connect with Zoho on the form.",
          "Sign in to Zoho and select your Zoho Books organization.",
          "Approve the requested permissions.",
        ],
      },
    ],
    fields: [],
    docs: "https://www.zoho.com/books/api/v3/",
  },
};

export function ConnectionGuide({ providerKey, providerLabel }: { providerKey: string; providerLabel: string }) {
  const guide = DETAILED_GUIDES[providerKey];
  if (!guide) return null;
  return (
    <Dialog>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <BookOpen className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{providerLabel} - Connection Guide</p>
            <p className="text-xs text-muted-foreground">
              {guide.oauth
                ? "One-click OAuth flow - see the short walkthrough."
                : "Each client provisions their own credentials. Share this checklist with their admin."}
            </p>
          </div>
        </div>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="shrink-0">Open Guide</Button>
        </DialogTrigger>
      </div>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" />{guide.title}</DialogTitle>
          <DialogDescription>{guide.intro}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 text-sm">
          {guide.sections.map((sec, i) => (
            <section key={i}>
              <h3 className="font-semibold mb-1">{sec.heading}</h3>
              {sec.ordered ? (
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  {sec.items.map((it, j) =>
                    typeof it === "string" ? (
                      <li key={j}>{it}</li>
                    ) : (
                      <li key={j}>
                        {it.text}
                        {it.sub && (
                          <ul className="list-disc list-inside ml-4 mt-1">
                            {it.sub.map((s, k) => <li key={k}>{M(s)}</li>)}
                          </ul>
                        )}
                      </li>
                    )
                  )}
                </ol>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {sec.items.map((it, j) => (
                    <li key={j}>{typeof it === "string" ? it : it.text}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          {guide.fields.length > 0 && (
            <section>
              <h3 className="font-semibold mb-1">Paste credentials in RouteAce</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {guide.fields.map((f, i) => (
                  <li key={i}>
                    <span className="font-medium text-foreground">{f.label}</span> - {f.value}
                  </li>
                ))}
                <li>Click <span className="font-medium text-foreground">Test Connection</span>, then <span className="font-medium text-foreground">Save Credentials</span>.</li>
              </ul>
            </section>
          )}
          {guide.docs && (
            <a href={guide.docs} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Official docs <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <section className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Security note</p>
            Credentials are encrypted server-side and isolated per tenant via RLS - one client cannot read another's credentials. The Client Secret field is write-only in the UI.
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
