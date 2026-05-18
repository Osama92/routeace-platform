/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  dispatchNumber?: string
  deliveryAddress?: string
  deliveredAt?: string
  podRecipient?: string
  podPhotoUrl?: string
  podNotes?: string
  organizationName?: string
  invoiceUrl?: string
  brandColor?: string
  logoUrl?: string
  introText?: string
  outroText?: string
  supportEmail?: string
}

const fmt = (s?: string) => { if (!s) return undefined; try { return new Date(s).toLocaleString() } catch { return s } }

const DeliveryProofEmail = (p: Props) => {
  const accent = p.brandColor || 'hsl(199, 89%, 38%)'
  const org = p.organizationName || 'RouteAce'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Proof of delivery for {p.dispatchNumber || 'your shipment'}</Preview>
      <Body style={main}>
        <Container style={container}>
          {p.logoUrl && <Img src={p.logoUrl} alt={org} width="120" style={{ marginBottom: 16 }} />}
          <Section style={{ ...banner, background: accent }}>
            <Text style={bannerText}>✓ DELIVERED — PROOF ATTACHED</Text>
          </Section>
          <Heading style={h1}>{p.recipientName ? `Hi ${p.recipientName},` : 'Hello,'}</Heading>
          <Text style={text}>
            {p.introText || `Your shipment has been delivered. Here's the proof of delivery from ${org}.`}
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>Dispatch</Text>
            <Text style={cardValue}>{p.dispatchNumber || '—'}</Text>
            {p.deliveredAt && (<><Text style={{ ...cardLabel, marginTop: 12 }}>Delivered at</Text><Text style={cardValue}>{fmt(p.deliveredAt)}</Text></>)}
            {p.deliveryAddress && (<><Text style={{ ...cardLabel, marginTop: 12 }}>Location</Text><Text style={cardSmall}>{p.deliveryAddress}</Text></>)}
            {p.podRecipient && (<><Text style={{ ...cardLabel, marginTop: 12 }}>Signed by</Text><Text style={cardSmall}>{p.podRecipient}</Text></>)}
            {p.podNotes && (<><Text style={{ ...cardLabel, marginTop: 12 }}>Notes</Text><Text style={cardSmall}>{p.podNotes}</Text></>)}
          </Section>

          {p.podPhotoUrl && (
            <Section style={{ margin: '12px 0' }}>
              <Text style={cardLabel}>POD photo</Text>
              <Img src={p.podPhotoUrl} alt="Proof of delivery" width="520" style={{ borderRadius: 10, border: '1px solid hsl(215, 20%, 90%)', marginTop: 8 }} />
            </Section>
          )}

          {p.invoiceUrl && (
            <Text style={text}>View invoice: <a href={p.invoiceUrl} style={{ ...link, color: accent }}>{p.invoiceUrl}</a></Text>
          )}

          <Text style={text}>
            {p.outroText || `Thank you for shipping with ${org}.`}
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
  component: DeliveryProofEmail,
  subject: (d: Record<string, any>) => d?.subjectOverride || `Delivered · proof for ${d?.dispatchNumber || 'your shipment'}`,
  displayName: 'Delivery proof',
  previewData: {
    recipientName: 'Jane Doe',
    dispatchNumber: 'DSP-00421',
    deliveryAddress: '12 Allen Ave, Ikeja, Lagos',
    deliveredAt: new Date().toISOString(),
    podRecipient: 'A. Bello (Store Manager)',
    podPhotoUrl: 'https://placehold.co/520x320?text=POD',
    podNotes: 'Goods received in good condition.',
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
