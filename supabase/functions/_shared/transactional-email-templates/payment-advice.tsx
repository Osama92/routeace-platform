/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  invoiceNumber?: string
  amountPaid?: number
  totalAmount?: number
  balanceDue?: number
  currency?: string
  paidDate?: string
  paymentMethod?: string
  paymentReference?: string
  organizationName?: string
  invoiceUrl?: string
  brandColor?: string
  logoUrl?: string
  introText?: string
  outroText?: string
  supportEmail?: string
}

const fmtDate = (s?: string) => { if (!s) return undefined; try { return new Date(s).toLocaleDateString() } catch { return s } }
const fmtMoney = (n?: number, c?: string) => {
  if (n == null) return '—'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: c || 'NGN', maximumFractionDigits: 2 }).format(n)
  } catch {
    return `${c || ''} ${n.toFixed(2)}`
  }
}

const PaymentAdviceEmail = (p: Props) => {
  const accent = p.brandColor || 'hsl(222, 47%, 18%)'
  const org = p.organizationName || 'RouteAce'
  const balance = p.balanceDue ?? 0
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Payment received for {p.invoiceNumber || 'your invoice'}</Preview>
      <Body style={main}>
        <Container style={container}>
          {p.logoUrl && <Img src={p.logoUrl} alt={org} width="120" style={{ marginBottom: 16 }} />}
          <Section style={{ ...banner, background: accent }}>
            <Text style={bannerText}>PAYMENT RECEIVED</Text>
          </Section>
          <Heading style={h1}>{p.recipientName ? `Hi ${p.recipientName},` : 'Hello,'}</Heading>
          <Text style={text}>
            {p.introText || `Thank you — we've received your payment. Here are the details from ${org}.`}
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>Invoice</Text>
            <Text style={cardValue}>{p.invoiceNumber || '—'}</Text>
            <Text style={{ ...cardLabel, marginTop: 12 }}>Amount paid</Text>
            <Text style={{ ...cardValue, color: accent, fontSize: 22 }}>{fmtMoney(p.amountPaid, p.currency)}</Text>
            {p.totalAmount != null && (
              <><Text style={{ ...cardLabel, marginTop: 12 }}>Invoice total</Text><Text style={cardSmall}>{fmtMoney(p.totalAmount, p.currency)}</Text></>
            )}
            <Text style={{ ...cardLabel, marginTop: 12 }}>Balance due</Text>
            <Text style={{ ...cardSmall, fontWeight: 600 as const, color: balance > 0 ? 'hsl(0, 84%, 40%)' : 'hsl(142, 71%, 35%)' }}>
              {balance > 0 ? fmtMoney(balance, p.currency) : 'Settled in full ✓'}
            </Text>
            {p.paidDate && (<><Text style={{ ...cardLabel, marginTop: 12 }}>Paid on</Text><Text style={cardSmall}>{fmtDate(p.paidDate)}</Text></>)}
            {p.paymentMethod && (<><Text style={{ ...cardLabel, marginTop: 12 }}>Method</Text><Text style={cardSmall}>{p.paymentMethod}</Text></>)}
            {p.paymentReference && (<><Text style={{ ...cardLabel, marginTop: 12 }}>Reference</Text><Text style={cardSmall}>{p.paymentReference}</Text></>)}
          </Section>

          {p.invoiceUrl && (
            <Text style={text}>View invoice: <a href={p.invoiceUrl} style={{ ...link, color: accent }}>{p.invoiceUrl}</a></Text>
          )}

          <Text style={text}>
            {p.outroText || `This email serves as your official payment advice. Thank you for your business.`}
          </Text>

          <Hr style={hr} />
          <Text style={small}>
            Questions? {p.supportEmail ? <>Email <a href={`mailto:${p.supportEmail}`} style={link}>{p.supportEmail}</a> or </> : ''}reply to this email and our team at {org} will help.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PaymentAdviceEmail,
  subject: (d: Record<string, any>) => d?.subjectOverride || `Payment received · ${d?.invoiceNumber || 'invoice'}`,
  displayName: 'Payment advice',
  previewData: {
    recipientName: 'Jane Doe',
    invoiceNumber: 'INV-2026-0042',
    amountPaid: 152000,
    totalAmount: 152000,
    balanceDue: 0,
    currency: 'NGN',
    paidDate: new Date().toISOString(),
    paymentMethod: 'Bank transfer',
    paymentReference: 'TRF-998877',
    organizationName: 'RouteAce Logistics',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const banner = { borderRadius: '8px', padding: '10px 14px', margin: '0 0 18px' }
const bannerText = { color: '#ffffff', fontWeight: 700 as const, fontSize: '13px', letterSpacing: '0.08em', margin: 0 }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(222, 47%, 11%)', margin: '0 0 16px' }
const text = { fontSize: '15px', color: 'hsl(215, 20%, 30%)', lineHeight: '1.6', margin: '0 0 16px' }
const small = { fontSize: '12px', color: 'hsl(215, 20%, 50%)', margin: '8px 0 0', lineHeight: '1.6' }
const hr = { borderColor: 'hsl(215, 20%, 90%)', margin: '24px 0 16px' }
const card = { background: 'hsl(215, 30%, 97%)', border: '1px solid hsl(215, 20%, 90%)', borderRadius: '10px', padding: '14px 16px', margin: '12px 0' }
const cardLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.04em', color: 'hsl(215, 20%, 45%)', margin: 0, fontWeight: '600' as const }
const cardValue = { fontSize: '15px', color: 'hsl(222, 47%, 18%)', margin: '2px 0 0', fontWeight: '600' as const }
const cardSmall = { fontSize: '14px', color: 'hsl(222, 47%, 18%)', margin: '2px 0 0', lineHeight: '1.5' }
const link = { color: 'hsl(199, 89%, 38%)', textDecoration: 'underline' }
