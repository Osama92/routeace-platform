import { Helmet } from "react-helmet-async";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <Helmet>
        <title>Privacy Policy - RouteAce</title>
        <meta name="description" content="How RouteAce (operated by Glyde Systems) collects, uses, and protects data under the Nigeria Data Protection Act 2023." />
        <link rel="canonical" href="https://routeace.app/privacy" />
        <meta property="og:title" content="Privacy Policy - RouteAce" />
        <meta property="og:description" content="RouteAce data protection, retention, and user-rights policy under NDPA 2023." />
        <meta property="og:url" content="https://routeace.app/privacy" />
      </Helmet>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">
            Effective date: January 1, 2025 · Last updated: May 2026
          </p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-bold">1. Who We Are</h2>
            <p>
              RouteAce is a logistics management platform operated by <strong>Glyde Systems</strong>,
              a company registered in Nigeria. We provide fleet operations, dispatch management,
              and enterprise logistics intelligence software to businesses across Africa.
            </p>
            <p>Contact: <a href="mailto:privacy@routeace.app" className="text-primary underline">privacy@routeace.app</a></p>
          </section>

          <section>
            <h2 className="text-xl font-bold">2. Data We Collect</h2>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Account data:</strong> name, email, phone, company name</li>
              <li><strong>Operational data:</strong> dispatches, delivery locations, route data, vehicles</li>
              <li><strong>Financial data:</strong> invoice amounts, billing records (no card data - handled by Paystack)</li>
              <li><strong>Usage data:</strong> login timestamps, feature usage, API logs</li>
              <li><strong>Location data:</strong> GPS of vehicles and deliveries during active operations only</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">3. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>To operate the RouteAce platform</li>
              <li>To calculate KPIs, generate reports, and deliver AI-powered insights</li>
              <li>To send transactional notifications (delivery updates, SLA alerts)</li>
              <li>To process subscription billing via Paystack</li>
              <li>To detect fraud and security threats</li>
              <li>To comply with Nigerian legal and regulatory obligations</li>
            </ul>
            <p>We do <strong>not</strong> sell your personal data.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold">4. Data Sharing</h2>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Supabase (USA):</strong> database and authentication infrastructure</li>
              <li><strong>Paystack (Nigeria):</strong> payment processing</li>
              <li><strong>Termii / Twilio:</strong> SMS / WhatsApp delivery</li>
              <li><strong>Resend:</strong> transactional email delivery</li>
              <li><strong>Anthropic / Google AI:</strong> anonymised operational summaries for AI features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">5. Data Retention</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Active account data: while account is active</li>
              <li>Dispatch / delivery records: 7 years (Nigerian tax compliance)</li>
              <li>Audit logs: 3 years</li>
              <li>Deleted accounts: purged within 30 days of closure request</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">6. Your Rights (NDPA 2023)</h2>
            <p>Under the Nigeria Data Protection Act 2023, you may:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion (subject to legal retention)</li>
              <li>Object to or restrict processing</li>
              <li>Receive your data in a portable format</li>
              <li>Lodge a complaint with the Nigeria Data Protection Commission (NDPC)</li>
            </ul>
            <p>Email <a href="mailto:privacy@routeace.app" className="text-primary underline">privacy@routeace.app</a> to exercise these rights.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold">7. Security</h2>
            <p>
              AES-256 encryption at rest, TLS 1.3 in transit, row-level security on all tables,
              regular audits, and MFA for all production access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">8. Cookies</h2>
            <p>Functional cookies only (authentication, sessions). No advertising or third-party tracking.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold">9. Changes</h2>
            <p>Material changes are notified via email at least 30 days before they take effect.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold">10. Contact</h2>
            <p>Data Controller: Glyde Systems</p>
            <p>Data Protection Officer: <a href="mailto:privacy@routeace.app" className="text-primary underline">privacy@routeace.app</a></p>
            <p>Website: <a href="https://routeace.app" className="text-primary underline">routeace.app</a></p>
          </section>
        </div>

        <div className="pt-4 border-t">
          <a href="/" className="text-primary underline text-sm">← Back to RouteAce</a>
        </div>
      </div>
    </div>
  );
}
