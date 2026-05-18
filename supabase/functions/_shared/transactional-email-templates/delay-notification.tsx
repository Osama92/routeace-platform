/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'RouteAce'

interface Props {
  recipientName?: string
  dispatchNumber?: string
  delayMinutes?: number
  newEta?: string
  reason?: string
  pickupAddress?: string
  deliveryAddress?: string
  organizationName?: string
  trackingUrl?: string
}

const DelayNotificationEmail = ({
  recipientName, dispatchNumber, delayMinutes, newEta, reason,
  pickupAddress, deliveryAddress, organizationName, trackingUrl,
}: Props) => {
  const orgLabel = organizationName || SITE_NAME

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Heads up - your delivery {dispatchNumber || ''} is running late</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{recipientName ? `Hi ${recipientName},` : 'Hello,'}</Heading>
          <Text style={text}>
            We want to let you know that your shipment{' '}
            <strong>{dispatchNumber || ''}</strong> with {orgLabel} is{' '}
            <span style={badgeDelay}>delayed</span>
            {typeof delayMinutes === 'number' ? ` by approximately ${delayMinutes} minutes` : ''}.
          </Text>

          <Section style={card}>
            {newEta && (
              <>
                <Text style={cardLabel}>Updated ETA</Text>
                <Text style={cardValueLg}>{newEta}</Text>
              </>
            )}
            {pickupAddress && (
              <>
                <Text style={{ ...cardLabel, marginTop: 12 }}>Pickup</Text>
                <Text style={cardSmall}>{pickupAddress}</Text>
              </>
            )}
            {deliveryAddress && (
              <>
                <Text style={{ ...cardLabel, marginTop: 12 }}>Delivery</Text>
                <Text style={cardSmall}>{deliveryAddress}</Text>
              </>
            )}
          </Section>

          {reason && (
            <Section style={reasonBox}>
              <Text style={cardLabel}>Reason</Text>
              <Text style={reasonText}>{reason}</Text>
            </Section>
          )}

          {trackingUrl && (
            <Text style={text}>
              Track live: <a href={trackingUrl} style={link}>{trackingUrl}</a>
            </Text>
          )}

          <Hr style={hr} />
          <Text style={small}>
            We apologise for the inconvenience. Reply to this email if you need
            anything from the {orgLabel} team.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: DelayNotificationEmail,
  subject: (d: Record<string, any>) => {
    const num = d?.dispatchNumber ? ` ${d.dispatchNumber}` : ''
    return `Delivery${num} is delayed`
  },
  displayName: 'Delivery delay notification',
  previewData: {
    recipientName: 'Jane Doe',
    dispatchNumber: 'DSP-00421',
    delayMinutes: 45,
    newEta: 'Today, 6:15 PM',
    reason: 'Heavy traffic on Lagos-Ibadan Expressway.',
    pickupAddress: 'Apapa Port, Lagos',
    deliveryAddress: '12 Allen Ave, Ikeja, Lagos',
    organizationName: 'RouteAce Logistics',
    trackingUrl: 'https://routeaceglyde.app/track/DSP-00421',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(222, 47%, 11%)', margin: '0 0 16px' }
const text = { fontSize: '15px', color: 'hsl(215, 20%, 30%)', lineHeight: '1.6', margin: '0 0 16px' }
const small = { fontSize: '12px', color: 'hsl(215, 20%, 50%)', margin: '8px 0 0', lineHeight: '1.6' }
const hr = { borderColor: 'hsl(215, 20%, 90%)', margin: '24px 0 16px' }
const card = { background: 'hsl(215, 30%, 97%)', border: '1px solid hsl(215, 20%, 90%)', borderRadius: '10px', padding: '14px 16px', margin: '12px 0' }
const reasonBox = { background: 'hsl(38, 92%, 96%)', border: '1px solid hsl(38, 92%, 85%)', borderRadius: '10px', padding: '12px 14px', margin: '12px 0' }
const cardLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.04em', color: 'hsl(215, 20%, 45%)', margin: 0, fontWeight: '600' as const }
const cardValueLg = { fontSize: '20px', color: 'hsl(222, 47%, 18%)', margin: '4px 0 0', fontWeight: '700' as const }
const cardSmall = { fontSize: '14px', color: 'hsl(222, 47%, 18%)', margin: '2px 0 0', lineHeight: '1.5' }
const reasonText = { fontSize: '14px', color: 'hsl(28, 80%, 25%)', margin: '4px 0 0', lineHeight: '1.5', whiteSpace: 'pre-wrap' as const }
const badgeDelay = { background: 'hsl(38, 92%, 92%)', color: 'hsl(28, 80%, 32%)', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' as const, fontSize: '13px' }
const link = { color: 'hsl(199, 89%, 38%)', textDecoration: 'underline' }
