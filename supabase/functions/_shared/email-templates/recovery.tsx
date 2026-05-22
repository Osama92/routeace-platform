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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName = 'RouteAce',
  confirmationUrl = '#',
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your {siteName} password — link expires in 1 hour</Preview>
    <Body style={main}>
      <Container style={container}>

        {/* Header */}
        <Section style={header}>
          <Text style={logo}>RouteAce</Text>
          <Text style={tagline}>Distribution Intelligence Platform</Text>
        </Section>

        {/* Hero */}
        <Section style={hero}>
          <Text style={heroIcon}>🔒</Text>
          <Heading style={h1}>Reset your password</Heading>
          <Text style={heroSubtext}>
            We received a request to reset the password for your {siteName} account.
          </Text>
        </Section>

        {/* Body */}
        <Section style={body}>
          <Text style={text}>
            Click the button below to choose a new password. This link is valid for <strong>1 hour</strong> and can only be used once.
          </Text>

          <Section style={ctaSection}>
            <Button style={button} href={confirmationUrl}>
              Reset My Password
            </Button>
          </Section>

          <Text style={expiryNote}>
            Link expires in <strong>1 hour</strong>. After that, you'll need to request a new one.
          </Text>
        </Section>

        <Hr style={divider} />

        {/* Security notice */}
        <Section style={body}>
          <Text style={sectionTitle}>Didn't request this?</Text>
          <Text style={text}>
            If you didn't request a password reset, your account is still secure — simply ignore this email. No changes will be made unless you click the button above.
          </Text>
          <Text style={text}>
            If you're concerned about unauthorised access, you can{' '}
            <Link href="https://routeace.app/auth" style={link}>
              sign in to your account
            </Link>{' '}
            and review your recent activity.
          </Text>
        </Section>

        <Hr style={divider} />

        {/* Footer */}
        <Section style={footerSection}>
          <Text style={footer}>
            Need help? Reply to this email or visit{' '}
            <Link href="https://routeace.app" style={footerLink}>routeace.app</Link>
          </Text>
          <Text style={footerMuted}>
            © {new Date().getFullYear()} Glyde Systems · RouteAce Distribution Intelligence Platform
          </Text>
        </Section>

      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
