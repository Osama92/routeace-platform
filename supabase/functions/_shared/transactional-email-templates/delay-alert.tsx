/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  dispatchNumber?: string
  severity?: 'at_risk' | 'breached' | string
  delayMinutes?: number
  newEta?: string
  reason?: string
  deliveryAddress?: string
  organizationName?: string
  trackingUrl?: string
  // Tenant overrides
  brandColor?: string
  logoUrl?: string
  introText?: string
  outroText?: string
  supportEmail?: string
}

const fmtEta = (s?: string) => {
  if (!s) return undefined
  try { return new Date(s).toLocaleString() } catch { return s }
}

const DelayAlertEmail = ({
  recipientName, dispatchNumber, severity, delayMinutes, newEta, reason,
  deliveryAddress, organizationName, trackingUrl,
  brandColor, logoUrl, introText, outroText, supportEmail,
}: Props) => {
  const accent = brandColor || 'hsl(0, 84%, 50%)'
  const org = organizationName || 'RouteAce'
  const isBreached = severity === 'breached'
  const headline = isBreached
    ? `Delivery delay on ${dispatchNumber || 'your shipment'}`
    : `Heads up: possible delay on ${dispatchNumber || 'your shipment'}`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{headline}</Preview>
      <Body style={main}>
        <Container style={container}>
          {logoUrl && <Img src={logoUrl} alt={org} width="120" style={{ marginBottom: 16 }} />}
          <Section style={{ ...banner, background: accent }}>
            <Text style={bannerText}>{isBreached ? 'DELIVERY DELAYED' : 'AT RISK OF DELAY'}</Text>
          </Section>
          <Heading style={h1}>{recipientName ? `Hi ${recipientName},` : 'Hello,'}</Heading>
          <Text style={text}>
            {introText || `We want to keep you informed about your shipment with ${org}.`}
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>Dispatch</Text>
            <Text style={cardValue}>{dispatchNumber || '—'}</Text>
            {delayMinutes != null && (
              <>
                <Text style={{ ...cardLabel, marginTop: 12 }}>Estimated delay</Text>
                <Text style={cardValue}>{delayMinutes} minutes</Text>
              </>
            )}
            {newEta && (
              <>
                <Text style={{ ...cardLabel, marginTop: 12 }}>Revised ETA</Text>
                <Text style={cardValue}>{fmtEta(newEta)}</Text>
              </>
            )}
            {reason && (
              <>
                <Text style={{ ...cardLabel, marginTop: 12 }}>Reason</Text>
                <Text style={cardSmall}>{reason}</Text>
              </>
            )}
            {deliveryAddress && (
              <>
                <Text style={{ ...cardLabel, marginTop: 12 }}>Delivery</Text>
                <Text style={cardSmall}>{deliveryAddress}</Text>
              </>
            )}
          </Section>

          {trackingUrl && (
            <Text style={text}>
              Track live: <a href={trackingUrl} style={{ ...link, color: accent }}>{trackingUrl}</a>
            </Text>
          )}

          <Text style={text}>
            {outroText || `We apologise for the inconvenience and are doing everything to recover the schedule.`}
          </Text>

          <Hr style={hr} />
          <Text style={small}>
            Questions? {supportEmail ? <>Email <a href={`mailto:${supportEmail}`} style={link}>{supportEmail}</a> or </> : ''}reply to this email and our team at {org} will help.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: DelayAlertEmail,
  subject: (d: Record<string, any>) => {
    const num = d?.dispatchNumber ? ` ${d.dispatchNumber}` : ''
    if (d?.subjectOverride) return d.subjectOverride
    return d?.severity === 'breached'
      ? `Delay alert: dispatch${num}`
      : `Possible delay: dispatch${num}`
  },
  displayName: 'Delay alert',
  previewData: {
    recipientName: 'Jane Doe',
    dispatchNumber: 'DSP-00421',
    severity: 'breached',
    delayMinutes: 45,
    newEta: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    reason: 'Heavy traffic on Lagos-Ibadan expressway',
    deliveryAddress: '12 Allen Ave, Ikeja, Lagos',
    organizationName: 'RouteAce Logistics',
    trackingUrl: 'https://routeace.app/track/DSP-00421',
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
