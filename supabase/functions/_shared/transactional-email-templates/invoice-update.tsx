/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'RouteAce'

interface Props {
  recipientName?: string
  invoiceNumber?: string
  event?: 'issued' | 'reminder' | 'overdue' | 'paid'
  amount?: number
  currency?: string
  dueDate?: string
  organizationName?: string
  invoiceUrl?: string
  notes?: string
}

const labelFor = (e?: string) => {
  switch (e) {
    case 'issued': return 'New invoice issued'
    case 'reminder': return 'Payment reminder'
    case 'overdue': return 'Invoice overdue'
    case 'paid': return 'Payment received'
    default: return 'Invoice update'
  }
}

const fmtMoney = (amount?: number, currency?: string) => {
  if (typeof amount !== 'number') return '—'
  const ccy = currency || 'NGN'
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: ccy, maximumFractionDigits: 2 }).format(amount)
  } catch {
    return `${ccy} ${amount.toLocaleString()}`
  }
}

const InvoiceUpdateEmail = ({
  recipientName, invoiceNumber, event, amount, currency,
  dueDate, organizationName, invoiceUrl, notes,
}: Props) => {
  const orgLabel = organizationName || SITE_NAME
  const isPaid = event === 'paid'
  const isOverdue = event === 'overdue'
  const badgeStyle = isPaid ? badgePaid : isOverdue ? badgeOverdue : badgeInfo

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{labelFor(event)} {invoiceNumber || ''}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{recipientName ? `Hi ${recipientName},` : 'Hello,'}</Heading>
          <Text style={text}>
            {isPaid ? (
              <>Thank you - we've received payment for your invoice from {orgLabel}.</>
            ) : isOverdue ? (
              <>Your invoice with {orgLabel} is past due. Please settle at your earliest convenience.</>
            ) : event === 'reminder' ? (
              <>This is a friendly reminder from {orgLabel} about an outstanding invoice.</>
            ) : (
              <>A new invoice from {orgLabel} is ready for your review.</>
            )}
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>Invoice</Text>
            <Text style={cardValue}>{invoiceNumber || '—'}</Text>

            <Text style={{ ...cardLabel, marginTop: 12 }}>Status</Text>
            <Text style={cardValue}>
              <span style={badgeStyle}>{labelFor(event)}</span>
            </Text>

            <Text style={{ ...cardLabel, marginTop: 12 }}>Amount</Text>
            <Text style={cardValueLg}>{fmtMoney(amount, currency)}</Text>

            {dueDate && !isPaid && (
              <>
                <Text style={{ ...cardLabel, marginTop: 12 }}>Due date</Text>
                <Text style={cardSmall}>{dueDate}</Text>
              </>
            )}
          </Section>

          {notes && (
            <Section style={reasonBox}>
              <Text style={cardLabel}>Note</Text>
              <Text style={reasonText}>{notes}</Text>
            </Section>
          )}

          {invoiceUrl && !isPaid && (
            <Section style={{ margin: '20px 0' }}>
              <Button href={invoiceUrl} style={btn}>View invoice</Button>
            </Section>
          )}

          <Hr style={hr} />
          <Text style={small}>
            Questions about this invoice? Reply to this email and the {orgLabel}{' '}
            finance team will get back to you.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: InvoiceUpdateEmail,
  subject: (d: Record<string, any>) => {
    const num = d?.invoiceNumber ? ` ${d.invoiceNumber}` : ''
    return `${labelFor(d?.event)}${num}`
  },
  displayName: 'Invoice update',
  previewData: {
    recipientName: 'Jane Doe',
    invoiceNumber: 'INV-2026-0142',
    event: 'issued',
    amount: 485000,
    currency: 'NGN',
    dueDate: '30 May 2026',
    organizationName: 'RouteAce Logistics',
    invoiceUrl: 'https://routeace.app/invoices/INV-2026-0142',
    notes: 'Lagos - Ibadan haulage, May Week 3.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(222, 47%, 11%)', margin: '0 0 16px' }
const text = { fontSize: '15px', color: 'hsl(215, 20%, 30%)', lineHeight: '1.6', margin: '0 0 16px' }
const small = { fontSize: '12px', color: 'hsl(215, 20%, 50%)', margin: '8px 0 0', lineHeight: '1.6' }
const hr = { borderColor: 'hsl(215, 20%, 90%)', margin: '24px 0 16px' }
const card = { background: 'hsl(215, 30%, 97%)', border: '1px solid hsl(215, 20%, 90%)', borderRadius: '10px', padding: '14px 16px', margin: '12px 0' }
const reasonBox = { background: 'hsl(215, 30%, 97%)', border: '1px solid hsl(215, 20%, 90%)', borderRadius: '10px', padding: '12px 14px', margin: '12px 0' }
const cardLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.04em', color: 'hsl(215, 20%, 45%)', margin: 0, fontWeight: '600' as const }
const cardValue = { fontSize: '15px', color: 'hsl(222, 47%, 18%)', margin: '2px 0 0', fontWeight: '600' as const }
const cardValueLg = { fontSize: '22px', color: 'hsl(222, 47%, 18%)', margin: '4px 0 0', fontWeight: '700' as const }
const cardSmall = { fontSize: '14px', color: 'hsl(222, 47%, 18%)', margin: '2px 0 0', lineHeight: '1.5' }
const reasonText = { fontSize: '14px', color: 'hsl(222, 47%, 18%)', margin: '4px 0 0', lineHeight: '1.5', whiteSpace: 'pre-wrap' as const }
const badgePaid = { background: 'hsl(142, 70%, 92%)', color: 'hsl(142, 70%, 28%)', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' as const, fontSize: '13px' }
const badgeOverdue = { background: 'hsl(0, 80%, 95%)', color: 'hsl(0, 70%, 38%)', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' as const, fontSize: '13px' }
const badgeInfo = { background: 'hsl(199, 89%, 92%)', color: 'hsl(199, 89%, 28%)', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' as const, fontSize: '13px' }
const btn = { background: 'hsl(199, 89%, 38%)', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' as const, fontSize: '14px', display: 'inline-block' as const }
