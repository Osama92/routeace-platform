/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName = 'RouteAce',
  siteUrl = 'https://routeace.app',
  recipient = '',
  confirmationUrl = '#',
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to RouteAce — please confirm your email to get started</Preview>
    <Body style={main}>
      <Container style={container}>

        {/* Header */}
        <Section style={header}>
          <Text style={logo}>RouteAce</Text>
          <Text style={tagline}>Distribution Intelligence Platform</Text>
        </Section>

        {/* Hero */}
        <Section style={hero}>
          <Text style={heroIcon}>🎉</Text>
          <Heading style={h1}>Welcome aboard!</Heading>
          <Text style={heroSubtext}>
            You're one step away from unlocking smarter distribution, real-time dispatch, and end-to-end supply chain visibility.
          </Text>
        </Section>

        {/* Body */}
        <Section style={body}>
          <Text style={text}>
            Hi there,
          </Text>
          <Text style={text}>
            Thanks for creating your RouteAce account. Before you can access your workspace, we need to verify that <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link> belongs to you.
          </Text>
          <Text style={text}>
            Click the button below to confirm your email address and complete your setup:
          </Text>

          <Section style={ctaSection}>
            <Button style={button} href={confirmationUrl}>
              Confirm My Email Address
            </Button>
          </Section>

          <Text style={expiryNote}>
            This link expires in <strong>24 hours</strong>. If you need a new one, simply try signing in and we'll send a fresh link.
          </Text>
        </Section>

        <Hr style={divider} />

        {/* What's next */}
        <Section style={body}>
          <Text style={sectionTitle}>What happens next?</Text>
          <table style={featureTable} width="100%">
            <tbody>
              {[
                ['🗺️', 'Set up your organisation', 'Configure your routes, fleet, and team in minutes.'],
                ['📦', 'Start dispatching', 'Create and track deliveries with real-time visibility.'],
                ['📊', 'Unlock intelligence', 'Revenue analytics, SLA tracking, and driver performance at a glance.'],
              ].map(([icon, title, desc]) => (
                <tr key={title}>
                  <td style={featureIcon}>{icon}</td>
                  <td style={featureContent}>
                    <Text style={featureTitle}>{title}</Text>
                    <Text style={featureDesc}>{desc}</Text>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Hr style={divider} />

        {/* Footer */}
        <Section style={footerSection}>
          <Text style={footer}>
            If you didn't sign up for RouteAce, you can safely ignore this email — no account will be created without confirmation.
          </Text>
          <Text style={footer}>
            Need help? Reply to this email or visit{' '}
            <Link href={siteUrl} style={footerLink}>{siteUrl}</Link>
          </Text>
          <Text style={footerMuted}>
            © {new Date().getFullYear()} Glyde Systems · RouteAce Distribution Intelligence Platform
          </Text>
        </Section>

      </Container>
    </Body>
  </Html>
)

export default SignupEmail

// ── Styles ──────────────────────────────────────────────────────────────────

const main = {
  backgroundColor: '#f4f6f9',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}

const container = {
  maxWidth: '580px',
  margin: '32px auto',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  overflow: 'hidden' as const,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
}

const header = {
  backgroundColor: '#0f1f3d',
  padding: '28px 36px 20px',
  textAlign: 'center' as const,
}

const logo = {
  fontSize: '26px',
  fontWeight: '700' as const,
  color: '#ffffff',
  margin: '0',
  letterSpacing: '-0.5px',
}

const tagline = {
  fontSize: '12px',
  color: '#8fa3c8',
  margin: '4px 0 0',
  letterSpacing: '0.5px',
  textTransform: 'uppercase' as const,
}

const hero = {
  backgroundColor: '#f0f7ff',
  padding: '32px 36px 28px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e2eaf4',
}

const heroIcon = {
  fontSize: '40px',
  margin: '0 0 8px',
}

const h1 = {
  fontSize: '26px',
  fontWeight: '700' as const,
  color: '#0f1f3d',
  margin: '0 0 12px',
  lineHeight: '1.3',
}

const heroSubtext = {
  fontSize: '15px',
  color: '#4a6080',
  lineHeight: '1.6',
  margin: '0',
}

const body = {
  padding: '28px 36px',
}

const text = {
  fontSize: '15px',
  color: '#374151',
  lineHeight: '1.65',
  margin: '0 0 16px',
}

const link = {
  color: '#0ea5a0',
  textDecoration: 'underline',
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '24px 0 20px',
}

const button = {
  backgroundColor: '#0ea5a0',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}

const expiryNote = {
  fontSize: '13px',
  color: '#6b7280',
  textAlign: 'center' as const,
  margin: '0',
  lineHeight: '1.5',
}

const sectionTitle = {
  fontSize: '13px',
  fontWeight: '600' as const,
  color: '#9ca3af',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.8px',
  margin: '0 0 16px',
}

const featureTable = {
  borderCollapse: 'collapse' as const,
}

const featureIcon = {
  fontSize: '22px',
  verticalAlign: 'top' as const,
  paddingTop: '2px',
  paddingRight: '14px',
  width: '36px',
}

const featureContent = {
  paddingBottom: '14px',
}

const featureTitle = {
  fontSize: '14px',
  fontWeight: '600' as const,
  color: '#111827',
  margin: '0 0 2px',
}

const featureDesc = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '0',
  lineHeight: '1.5',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '0',
}

const footerSection = {
  padding: '20px 36px 28px',
}

const footer = {
  fontSize: '12px',
  color: '#6b7280',
  lineHeight: '1.6',
  margin: '0 0 8px',
}

const footerLink = {
  color: '#0ea5a0',
  textDecoration: 'none',
}

const footerMuted = {
  fontSize: '11px',
  color: '#9ca3af',
  margin: '12px 0 0',
}
