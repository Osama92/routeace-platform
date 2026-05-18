/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'RouteAce'

interface Props {
  name?: string
  entityType?: string // "Customer" | "Vendor"
  companyName?: string
  decision?: 'approved' | 'rejected' | 'pending_final'
  reason?: string
  organizationName?: string
}

const ApprovalDecisionEmail = ({
  name, entityType, companyName, decision, reason, organizationName,
}: Props) => {
  const isApproved = decision === 'approved'
  const isPending = decision === 'pending_final'
  const orgLabel = organizationName || SITE_NAME
  const headline = isApproved
    ? `Your ${entityType || 'record'} has been approved`
    : isPending
      ? `Your ${entityType || 'record'} is moving to final review`
      : `Update on your ${entityType || 'record'} submission`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{headline}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? `Hi ${name},` : 'Hello,'}</Heading>
          <Text style={text}>
            {isApproved ? (
              <>
                Good news - your {entityType?.toLowerCase() || 'record'}{' '}
                <strong>{companyName || ''}</strong> has been{' '}
                <span style={badgeApproved}>approved</span> on {orgLabel}.
              </>
            ) : isPending ? (
              <>
                Your {entityType?.toLowerCase() || 'record'}{' '}
                <strong>{companyName || ''}</strong> has cleared the first review
                and is now <span style={badgePending}>pending final approval</span>{' '}
                from the Super Admin at {orgLabel}. We'll email you again with the
                final decision.
              </>
            ) : (
              <>
                We're writing to let you know that your{' '}
                {entityType?.toLowerCase() || 'record'}{' '}
                <strong>{companyName || ''}</strong> was{' '}
                <span style={badgeRejected}>not approved</span> on {orgLabel}.
              </>
            )}
          </Text>

          {reason && (
            <Section style={reasonBox}>
              <Text style={reasonLabel}>
                {isApproved ? 'Reviewer note' : isPending ? 'Reviewer note' : 'Reason'}
              </Text>
              <Text style={reasonText}>{reason}</Text>
            </Section>
          )}

          <Hr style={hr} />
          <Text style={small}>
            {isApproved
              ? `You can now begin transacting with ${orgLabel}. If you have questions, reply to this email.`
              : isPending
                ? `No action is required from you right now.`
                : `If you'd like to discuss this decision or resubmit with updated details, please reply to this email.`}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ApprovalDecisionEmail,
  subject: (d: Record<string, any>) => {
    const t = d?.entityType || 'record'
    if (d?.decision === 'approved') return `Your ${t} has been approved`
    if (d?.decision === 'pending_final') return `Your ${t} is pending final approval`
    return `Update on your ${t} submission`
  },
  displayName: 'Approval decision',
  previewData: {
    name: 'Jane Doe',
    entityType: 'Customer',
    companyName: 'Acme Foods Ltd',
    decision: 'approved',
    reason: 'All documents verified.',
    organizationName: 'RouteAce Logistics',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(222, 47%, 11%)', margin: '0 0 16px' }
const text = { fontSize: '15px', color: 'hsl(215, 20%, 30%)', lineHeight: '1.6', margin: '0 0 16px' }
const small = { fontSize: '12px', color: 'hsl(215, 20%, 50%)', margin: '8px 0 0', lineHeight: '1.6' }
const hr = { borderColor: 'hsl(215, 20%, 90%)', margin: '24px 0 16px' }
const reasonBox = {
  background: 'hsl(215, 30%, 97%)',
  border: '1px solid hsl(215, 20%, 90%)',
  borderRadius: '10px',
  padding: '12px 14px',
  margin: '12px 0 4px',
}
const reasonLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.04em', color: 'hsl(215, 20%, 45%)', margin: '0 0 4px', fontWeight: '600' as const }
const reasonText = { fontSize: '14px', color: 'hsl(222, 47%, 18%)', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap' as const }
const badgeApproved = { background: 'hsl(142, 70%, 92%)', color: 'hsl(142, 70%, 28%)', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' as const, fontSize: '13px' }
const badgeRejected = { background: 'hsl(0, 80%, 95%)', color: 'hsl(0, 70%, 38%)', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' as const, fontSize: '13px' }
const badgePending = { background: 'hsl(38, 92%, 92%)', color: 'hsl(28, 80%, 32%)', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' as const, fontSize: '13px' }
