/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'RouteAce'

interface Props {
  name?: string
  inviteUrl?: string
  inviterName?: string
  organizationName?: string
}

const CustomerPortalInviteEmail = ({ name, inviteUrl, inviterName, organizationName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {organizationName || SITE_NAME} customer portal access is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{name ? `Hi ${name},` : 'Hi there,'}</Heading>
        <Text style={text}>
          {inviterName ? `${inviterName} has invited you` : "You've been invited"} to access the
          {organizationName ? ` ${organizationName}` : ` ${SITE_NAME}`} customer portal.
          You'll be able to track your shipments, view invoices and rate every delivery you receive.
        </Text>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button style={button} href={inviteUrl || '#'}>
            Accept invite & sign in
          </Button>
        </Section>
        <Text style={small}>
          This single-use link is valid for 14 days. If you didn't expect this invite, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CustomerPortalInviteEmail,
  subject: (d: Record<string, any>) =>
    `Your ${d?.organizationName || SITE_NAME} customer portal access`,
  displayName: 'Customer portal invite',
  previewData: {
    name: 'Jane Doe',
    inviteUrl: 'https://example.com/customer-accept/sample-token',
    inviterName: 'Olashile',
    organizationName: 'Acme Logistics',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(222, 47%, 11%)', margin: '0 0 16px' }
const text = { fontSize: '15px', color: 'hsl(215, 20%, 30%)', lineHeight: '1.6', margin: '0 0 16px' }
const small = { fontSize: '12px', color: 'hsl(215, 20%, 50%)', margin: '24px 0 0' }
const button = {
  backgroundColor: 'hsl(173, 80%, 40%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '10px',
  padding: '12px 22px',
  textDecoration: 'none',
}
