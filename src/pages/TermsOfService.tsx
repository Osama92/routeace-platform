import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, ExternalLink, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import brandLogo from "@/assets/routeace-mark.png";

const SECTIONS = [
  { id: "s1",  title: "Introduction and Acceptance" },
  { id: "s2",  title: "What RouteAce Is" },
  { id: "s3",  title: "Account Registration and Eligibility" },
  { id: "s4",  title: "Subscription, Trial, and Billing" },
  { id: "s5",  title: "Acceptable Use" },
  { id: "s6",  title: "Your Data" },
  { id: "s7",  title: "Intellectual Property" },
  { id: "s8",  title: "Confidentiality" },
  { id: "s9",  title: "Service Availability" },
  { id: "s10", title: "Third-Party Services" },
  { id: "s11", title: "Disclaimer of Warranties" },
  { id: "s12", title: "Limitation of Liability" },
  { id: "s13", title: "Indemnification" },
  { id: "s14", title: "Suspension and Termination" },
  { id: "s15", title: "Reseller and White-Label Partners" },
  { id: "s16", title: "Changes to These Terms" },
  { id: "s17", title: "Governing Law and Dispute Resolution" },
  { id: "s18", title: "General Provisions" },
  { id: "s19", title: "Contact Information" },
];

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="hidden sm:block w-px h-4 bg-border" />
            <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
              <img src={brandLogo} alt="RouteAce" className="w-7 h-7 object-contain" />
              <span className="font-bold text-sm">RouteAce</span>
            </button>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs shrink-0"
            onClick={() => window.print()}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download / Print</span>
            <span className="sm:hidden">Print</span>
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:grid lg:grid-cols-[260px_1fr] lg:gap-12 xl:gap-16">

        {/* Sidebar TOC — desktop only */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-2">
              Contents
            </p>
            {SECTIONS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className="w-full text-left px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-start gap-2"
              >
                <span className="text-[11px] text-muted-foreground/60 font-mono mt-0.5 shrink-0 w-5">{i + 1}.</span>
                <span className="leading-snug">{s.title}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0">
          {/* Document header */}
          <div className="mb-10 pb-8 border-b border-border">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold font-heading leading-tight">Terms of Service</h1>
                <p className="text-sm text-muted-foreground mt-0.5">RouteAce · Operated by Glyde Systems Services Ltd</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
              <span><span className="font-medium text-foreground">Effective Date:</span> 1 May 2026</span>
              <span><span className="font-medium text-foreground">Version:</span> 2026-05-v1</span>
              <span><span className="font-medium text-foreground">Governing Law:</span> Federal Republic of Nigeria</span>
            </div>

            <div className="mt-5 p-4 rounded-xl bg-primary/5 border border-primary/15 text-sm text-muted-foreground leading-relaxed">
              These Terms of Service govern your use of the RouteAce platform. By creating an account or using any part of the platform, you agree to be bound by these Terms. Please read them carefully.
            </div>
          </div>

          <div className="prose-legal space-y-10">

            {/* S1 */}
            <section id="s1">
              <SectionHeading n={1} title="Introduction and Acceptance" />
              <Body>
                Welcome to RouteAce, a logistics intelligence platform operated by <strong>Glyde Systems Services Ltd</strong> ("Glyde Systems", "we", "our", "us"), a company incorporated in Nigeria. Our contact details are in Section 19.
              </Body>
              <Body>
                By creating an account, accessing, or using RouteAce — including any of its modules (Logistics Company, Logistics Department, FMCG, Driver App, or API) — you ("Subscriber", "you") agree to be bound by these Terms of Service ("Terms") and our Privacy Policy. <strong>If you do not agree, you must immediately cease use.</strong>
              </Body>
              <Body>
                If you accept these Terms on behalf of a company or legal entity, you represent that you have authority to bind that entity. In that case, "you" refers to that entity.
              </Body>
              <Body>
                These Terms were last updated on 1 May 2026. We will notify you by email at least 30 days before any material change takes effect.
              </Body>
            </section>

            {/* S2 */}
            <section id="s2">
              <SectionHeading n={2} title="What RouteAce Is" />
              <Body>
                RouteAce is a Software-as-a-Service (SaaS) logistics intelligence platform built and operated by Glyde Systems Services Ltd. It provides:
              </Body>
              <BulletList items={[
                "Fleet dispatch management and vehicle tracking",
                "Driver management, job assignment, and performance scoring",
                "Fuel intelligence and cost monitoring",
                "Automated invoicing, waybill generation, and client notifications",
                "SLA management and OTIF reporting",
                "Enterprise logistics department intelligence and ERP integrations",
                "FMCG field sales and distribution intelligence",
                "AI-powered operational advisor (Zaza AI)",
                "Reseller and white-label infrastructure for logistics service providers",
              ]} />
            </section>

            {/* S3 */}
            <section id="s3">
              <SectionHeading n={3} title="Account Registration and Eligibility" />
              <Body>
                To use RouteAce you must: (a) be at least 18 years old; (b) be a business, sole trader, or authorised representative of one operating lawfully in Nigeria or any other jurisdiction; (c) provide accurate and complete registration information; and (d) maintain the security of your account credentials.
              </Body>
              <Body>
                You are responsible for all activity under your account. Notify us immediately at <Email addr="management@glydeservicesng.com" /> if you suspect unauthorised access.
              </Body>
              <Body>
                Each tenant account is fully isolated. Users in one organisation cannot access another organisation's data. This isolation is enforced at the database level using row-level security policies.
              </Body>
              <Body>
                We reserve the right to verify account information and decline or terminate accounts that we reasonably believe to be fraudulent, duplicated, or in breach of these Terms.
              </Body>
            </section>

            {/* S4 */}
            <section id="s4">
              <SectionHeading n={4} title="Subscription, Trial, and Billing" />

              <SubHeading>Free Trial</SubHeading>
              <Body>
                New accounts receive a free trial period — <strong>30 days</strong> for Logistics Company (LC) accounts and <strong>60 days</strong> for Logistics Department (LD) enterprise accounts. Full platform features are available during the trial. No payment method is required to start.
              </Body>

              <SubHeading>Paid Subscription</SubHeading>
              <Body>
                After the trial, continued use requires a paid subscription. LC accounts are billed at <strong>₦5,000 per registered vehicle per month</strong>. LD enterprise accounts are billed at flat monthly rates displayed on the pricing page at the time of subscription. All prices are in Nigerian Naira (NGN) unless otherwise stated.
              </Body>

              <SubHeading>Automatic Renewal</SubHeading>
              <Body>
                Subscriptions renew automatically at the end of each billing cycle. You authorise us to charge your payment method via Paystack on each renewal date. You may cancel at any time before renewal in the Subscription & Billing section of your account.
              </Body>

              <SubHeading>Late Payment</SubHeading>
              <Body>
                If payment is not received within 7 days of the due date, we may suspend your account. Your data is retained for 30 days after suspension before deletion.
              </Body>

              <SubHeading>Refunds</SubHeading>
              <Body>
                Subscription fees are non-refundable except: (a) where required by applicable Nigerian law; (b) where we have suffered a verified platform outage of more than 72 consecutive hours in a billing period; or (c) where we agree in writing. Refund requests must be submitted within 14 days of the charge to <Email addr="management@glydeservicesng.com" />.
              </Body>

              <SubHeading>Price Changes</SubHeading>
              <Body>
                We will provide at least 30 days' written notice before changing subscription prices. Continued use after the effective date constitutes acceptance of revised prices.
              </Body>
            </section>

            {/* S5 */}
            <section id="s5">
              <SectionHeading n={5} title="Acceptable Use" />
              <Body>You agree to use RouteAce only for lawful business operations. You must not:</Body>
              <BulletList items={[
                "Use the platform to facilitate illegal transport, smuggling, money laundering, or any activity that violates Nigerian law or applicable international law",
                "Attempt to reverse engineer, decompile, or extract any part of the platform's source code or algorithms",
                "Upload malicious code, interfere with the platform's infrastructure, or attempt unauthorised access to other tenants' data",
                "Resell, sublicense, or redistribute the platform without an active written Reseller Agreement with Glyde Systems Services Ltd",
                "Use the AI features (Zaza) to fabricate operational data, generate misleading reports, or deceive clients, partners, or regulators",
                "Share login credentials across multiple individuals beyond your plan's permitted user allocation",
              ]} />
            </section>

            {/* S6 */}
            <section id="s6">
              <SectionHeading n={6} title="Your Data" />

              <SubHeading>Ownership</SubHeading>
              <Body>
                All operational data you input into RouteAce (dispatches, customers, vehicles, invoices, driver records) remains your property. We process it on your behalf as a data processor under the Nigeria Data Protection Act 2023 (NDPA 2023).
              </Body>

              <SubHeading>How We Use Your Data</SubHeading>
              <Body>
                We process your data solely to operate and improve the RouteAce platform. We do not sell your data to any third party. We do not use your identifiable operational data to train AI models.
              </Body>

              <SubHeading>Data Protection Compliance</SubHeading>
              <Body>
                Glyde Systems Services Ltd operates in compliance with the Nigeria Data Protection Act 2023 and has initiated registration with the Nigeria Data Protection Commission (NDPC). Our full data processing obligations, the legal bases for processing, and your rights under NDPA 2023 are set out in our Privacy Policy.
              </Body>

              <SubHeading>Data Portability</SubHeading>
              <Body>
                You may export your data at any time via the platform's export tools. Upon account closure, request a full data export at <Email addr="management@glydeservicesng.com" /> within 14 days of closure.
              </Body>

              <SubHeading>Data Retention</SubHeading>
              <Body>
                Active account data is retained while your account is open. After account closure, data is deleted within 30 days unless legal retention obligations apply. You are responsible for exporting and retaining any records required for your own regulatory compliance, including records that Nigerian tax law (FIRS) requires to be kept for up to 7 years.
              </Body>
            </section>

            {/* S7 */}
            <section id="s7">
              <SectionHeading n={7} title="Intellectual Property" />
              <Body>
                All software, algorithms, AI models, interface designs, route intelligence data, and platform content are the exclusive intellectual property of Glyde Systems Services Ltd, protected under the Nigerian Copyright Act 2022 (as amended) and applicable international conventions.
              </Body>
              <Body>
                We grant you a limited, non-exclusive, non-transferable licence to access and use RouteAce solely for your internal business operations during your active subscription. This licence terminates when your subscription ends.
              </Body>
              <Body>
                Your company name, logo, and content remain your property. You grant us a limited licence to display your branding within the platform as configured by you, solely for the purpose of delivering the service.
              </Body>
            </section>

            {/* S8 */}
            <section id="s8">
              <SectionHeading n={8} title="Confidentiality" />
              <Body>
                Each party will keep confidential all non-public information disclosed by the other in connection with this agreement and use it only for purposes of these Terms. This obligation survives termination for 5 years.
              </Body>
              <Body>
                Confidentiality obligations do not apply to information that: (a) is or becomes publicly known through no breach of these Terms; (b) was already known to the receiving party; or (c) is required to be disclosed by a Nigerian court or regulatory authority.
              </Body>
            </section>

            {/* S9 */}
            <section id="s9">
              <SectionHeading n={9} title="Service Availability" />
              <Body>
                We work to maintain reliable service availability for the RouteAce platform. The platform is provided on an "as available" basis. We do not guarantee uninterrupted, error-free service and make no warranty that the platform will meet your specific requirements or be suitable for any particular purpose.
              </Body>
              <Body>
                We will communicate planned maintenance windows at least 24 hours in advance where practicable. We are not liable for downtime caused by: third-party infrastructure providers (including Supabase or Vercel); internet connectivity issues outside our control; or force majeure events.
              </Body>
            </section>

            {/* S10 */}
            <section id="s10">
              <SectionHeading n={10} title="Third-Party Services" />
              <Body>
                RouteAce integrates with third-party services. By using the platform, you acknowledge that your data may be transmitted to:
              </Body>
              <div className="overflow-x-auto rounded-xl border border-border my-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Provider</th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      ["Supabase (USA)", "Database, authentication, and file storage infrastructure"],
                      ["Paystack (Nigeria)", "Payment processing — Paystack's own terms govern payment transactions"],
                      ["Resend", "Transactional email delivery"],
                      ["Google Maps / Google Cloud (USA)", "Location services and map rendering"],
                      ["Anthropic / Google AI (USA)", "AI features — query content is transmitted to these providers' servers; they do not train models on API query data under their commercial terms"],
                      ["Africa's Talking / Termii (Nigeria)", "SMS delivery"],
                    ].map(([provider, purpose]) => (
                      <tr key={provider} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap align-top">{provider}</td>
                        <td className="px-4 py-3 text-muted-foreground">{purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Body>
                We are not responsible for the availability or practices of these providers. Where a critical third-party service is discontinued and materially affects your use of RouteAce, we will notify you and work to provide an equivalent alternative.
              </Body>
            </section>

            {/* S11 */}
            <section id="s11">
              <SectionHeading n={11} title="Disclaimer of Warranties" />
              <Body>
                To the fullest extent permitted by Nigerian law, RouteAce is provided <strong>without warranty of any kind</strong>, express or implied. We expressly disclaim all warranties including: fitness for a particular purpose; accuracy of AI-generated recommendations; accuracy of route intelligence or ETA data; and compatibility with your existing systems.
              </Body>
              <Body>
                We do not warrant that the platform will be free from errors, that defects will be corrected, or that the platform is free from viruses or other harmful components.
              </Body>
            </section>

            {/* S12 */}
            <section id="s12">
              <SectionHeading n={12} title="Limitation of Liability" />
              <Body>To the maximum extent permitted by Nigerian law, Glyde Systems Services Ltd shall not be liable for:</Body>
              <BulletList items={[
                "Indirect, incidental, special, consequential, or punitive damages of any kind",
                "Loss of profits, revenue, data, contracts, goodwill, or business opportunity",
                "Decisions made by you, your drivers, or your team based on RouteAce data, AI outputs, or route intelligence",
                "Any loss, accident, delay, or injury in transit not directly caused by a verified platform failure on our part",
                "Data loss resulting from your failure to maintain adequate account security or to export records before account closure",
              ]} />
              <Body>
                Our total aggregate liability for all claims arising under or in connection with these Terms — whether in contract, tort, or otherwise — shall not exceed <strong>the total subscription fees you paid to Glyde Systems Services Ltd in the 3 calendar months immediately preceding the event giving rise to the claim</strong>.
              </Body>
              <Body>
                Nothing in these Terms excludes or limits liability for: death or personal injury caused by our proven negligence; fraud or fraudulent misrepresentation; or any other liability that cannot be excluded under Nigerian law.
              </Body>
            </section>

            {/* S13 */}
            <section id="s13">
              <SectionHeading n={13} title="Indemnification" />
              <Body>
                You agree to indemnify and hold harmless Glyde Systems Services Ltd and its directors, officers, employees, and contractors from any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising from: (a) your use of RouteAce in material violation of these Terms; (b) data you upload that infringes a third party's intellectual property rights or violates any law; or (c) your drivers' or employees' conduct in connection with dispatches managed on the platform where that conduct constitutes a breach of applicable law.
              </Body>
            </section>

            {/* S14 */}
            <section id="s14">
              <SectionHeading n={14} title="Suspension and Termination" />

              <SubHeading>By You</SubHeading>
              <Body>
                You may cancel your subscription at any time from the Subscription & Billing section. Cancellation takes effect at the end of the current billing period and you retain full access until that date.
              </Body>

              <SubHeading>By Us</SubHeading>
              <Body>
                We may suspend or terminate your account immediately if you: (a) materially breach these Terms and fail to remedy the breach within 7 days of written notice; (b) remain unpaid for 14 or more consecutive days after the due date; (c) use the platform for illegal purposes; or (d) pose a verified security risk to other tenants on the platform.
              </Body>

              <SubHeading>Effect of Termination</SubHeading>
              <Body>
                On termination, your access ceases immediately. We retain your data for 30 days, during which you may request an export, after which it will be permanently deleted subject to any mandatory legal retention obligations.
              </Body>

              <SubHeading>Cross-Tenant Suspension Note</SubHeading>
              <Body>
                Suspension of a user by one tenant organisation does not prevent that user from being independently engaged and approved by a separate, unrelated tenant. Each organisation's membership is independently managed and data-isolated.
              </Body>
            </section>

            {/* S15 */}
            <section id="s15">
              <SectionHeading n={15} title="Reseller and White-Label Partners" />
              <Body>
                Resellers operating under a signed Reseller Agreement with Glyde Systems Services Ltd may market and provision RouteAce under their own brand. Reseller obligations, commission structures, and white-label terms are set out in the separate Reseller Agreement, which forms part of these Terms for those parties. Resellers must ensure their end-customers accept equivalent terms before platform access is granted.
              </Body>
            </section>

            {/* S16 */}
            <section id="s16">
              <SectionHeading n={16} title="Changes to These Terms" />
              <Body>
                We may update these Terms from time to time. For material changes, we will provide at least 30 days' notice via email to your registered address and via an in-platform notice, along with the updated version number. Continued use after the effective date constitutes acceptance. If you do not accept revised Terms, you may cancel before the effective date without penalty.
              </Body>
            </section>

            {/* S17 */}
            <section id="s17">
              <SectionHeading n={17} title="Governing Law and Dispute Resolution" />
              <Body>
                These Terms are governed by the laws of the Federal Republic of Nigeria, including the Nigeria Data Protection Act 2023, the Companies and Allied Matters Act 2020, the Copyright Act 2022 (as amended), and the Cybercrimes (Prohibition, Prevention, etc.) Act 2015 (as amended).
              </Body>
              <div className="space-y-3 my-4">
                {[
                  ["Step 1 — Informal Resolution", `Contact management@glydeservicesng.com with a written description of the dispute. We respond within 10 business days.`],
                  ["Step 2 — Mediation", "If unresolved within 30 days, the dispute shall be referred to mediation administered by the Lagos Multi-Door Courthouse (LMDC), Lagos, Nigeria."],
                  ["Step 3 — Arbitration", "If mediation fails, the dispute shall be resolved by binding arbitration under the Arbitration and Mediation Act 2023 (Nigeria), seat of arbitration in Lagos, in the English language."],
                ].map(([step, desc]) => (
                  <div key={step} className="flex gap-4 p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="w-2 rounded-full bg-primary/40 shrink-0 self-stretch" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{step}</p>
                      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Body>
                Nothing in this clause prevents either party from seeking emergency injunctive relief from a competent Nigerian court.
              </Body>
            </section>

            {/* S18 */}
            <section id="s18">
              <SectionHeading n={18} title="General Provisions" />
              {[
                ["Entire Agreement", "These Terms and the Privacy Policy constitute the entire agreement between you and Glyde Systems Services Ltd regarding RouteAce, and supersede all prior agreements."],
                ["Severability", "If any provision is held invalid or unenforceable, the remaining provisions continue in full force."],
                ["No Waiver", "Our failure to enforce any right does not constitute a waiver of that right."],
                ["Assignment", "You may not assign your rights under these Terms without our written consent. We may assign our obligations to an affiliate or successor entity, provided service continuity is maintained."],
                ["Force Majeure", "Neither party is liable for failure to perform due to causes beyond reasonable control, including acts of God, government action, civil unrest, power outages, or internet infrastructure failures."],
              ].map(([heading, text]) => (
                <div key={heading} className="mb-4">
                  <SubHeading>{heading}</SubHeading>
                  <Body>{text}</Body>
                </div>
              ))}
            </section>

            {/* S19 */}
            <section id="s19">
              <SectionHeading n={19} title="Contact Information" />
              <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/40">
                  <p className="font-semibold text-foreground">Glyde Systems Services Ltd</p>
                  <p className="text-sm text-muted-foreground">Operating as: RouteAce Logistics Intelligence Platform</p>
                </div>
                <div className="px-5 py-4 space-y-2.5 text-sm">
                  {[
                    ["General & Legal Enquiries", "management@glydeservicesng.com"],
                    ["Data Protection Officer", "management@glydeservicesng.com"],
                    ["Platform", "routeace.app"],
                    ["Company Website", "glydeservicesng.com"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex flex-wrap gap-x-4 gap-y-0.5">
                      <span className="text-muted-foreground w-48 shrink-0">{label}</span>
                      <span className="font-medium text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Footer */}
            <div className="pt-8 mt-8 border-t border-border text-center space-y-3">
              <p className="text-xs text-muted-foreground">
                Effective 1 May 2026 · Version 2026-05-v1 · Governed by the laws of the Federal Republic of Nigeria
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Download className="w-3.5 h-3.5" /> Download a copy
                </button>
                <a
                  href="mailto:management@glydeservicesng.com"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Legal enquiries
                </a>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          header, aside { display: none !important; }
          main { max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function SectionHeading({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
        {n}
      </span>
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground mt-4 mb-1.5">{children}</h3>;
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed mb-3">{children}</p>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 my-3 ml-1">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Email({ addr }: { addr: string }) {
  return (
    <a href={`mailto:${addr}`} className="text-primary hover:underline font-medium">
      {addr}
    </a>
  );
}
