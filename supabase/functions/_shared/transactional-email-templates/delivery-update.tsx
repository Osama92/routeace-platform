/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'RouteAce'

interface Props {
  recipientName?: string
  recipientRole?: 'customer' | 'driver'
  dispatchNumber?: string
  status?: 'assigned' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'cancelled'
  pickupAddress?: string
  deliveryAddress?: string
  driverName?: string
  vehicleReg?: string
  eta?: string
  organizationName?: string
  trackingUrl?: string
}

const labelFor = (s?: string) => {
  switch (s) {
    case 'assigned': return 'Assigned'
    case 'picked_up': return 'Picked Up'
    case 'in_transit': return 'In Transit'
    case 'out_for_delivery': return 'Out for Delivery'
    case 'delivered': return 'Delivered'
    case 'cancelled': return 'Cancelled'
    default: return 'Update'
  }
}

const DeliveryUpdateEmail = ({
  recipientName, recipientRole, dispatchNumber, status,
  pickupAddress, deliveryAddress, driverName, vehicleReg, eta,
  organizationName, trackingUrl,
}: Props) => {
  const orgLabel = organizationName || SITE_NAME
  const isDriver = recipientRole === 'driver'
  const headline = isDriver
    ? `Job ${dispatchNumber || ''} - ${labelFor(status)}`
    : `Your delivery ${dispatchNumber || ''} is ${labelFor(status).toLowerCase()}`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{headline}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{recipientName ? `Hi ${recipientName},` : 'Hello,'}</Heading>
          <Text style={text}>
            {isDriver ? (
              <>Status update for your assigned job from {orgLabel}.</>
            ) : (
              <>Here's the latest on your shipment from {orgLabel}.</>
            )}
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>Dispatch</Text>
            <Text style={cardValue}>{dispatchNumber || '—'}</Text>
            <Text style={{ ...cardLabel, marginTop: 12 }}>Status</Text>
            <Text style={cardValue}>
              <span style={badge}>{labelFor(status)}</span>
            </Text>
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
            {!isDriver && driverName && (
              <>
                <Text style={{ ...cardLabel, marginTop: 12 }}>Driver</Text>
                <Text style={cardSmall}>{driverName}{vehicleReg ? ` · ${vehicleReg}` : ''}</Text>
              </>
            )}
            {eta && (
              <>
                <Text style={{ ...cardLabel, marginTop: 12 }}>ETA</Text>
                <Text style={cardSmall}>{eta}</Text>
              </>
            )}
          </Section>

          {trackingUrl && (
            <Text style={text}>
              Track live: <a href={trackingUrl} style={link}>{trackingUrl}</a>
            </Text>
          )}

          <Hr style={hr} />
          <Text style={small}>
            Questions? Reply to this email and our team at {orgLabel} will help.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: DeliveryUpdateEmail,
  subject: (d: Record<string, any>) => {
    const num = d?.dispatchNumber ? ` ${d.dispatchNumber}` : ''
    if (d?.recipientRole === 'driver') return `Job${num} - ${labelFor(d?.status)}`
    return `Delivery${num} - ${labelFor(d?.status)}`
  },
  displayName: 'Delivery status update',
  previewData: {
    recipientName: 'Jane Doe',
    recipientRole: 'customer',
    dispatchNumber: 'DSP-00421',
    status: 'in_transit',
    pickupAddress: 'Apapa Port, Lagos',
    deliveryAddress: '12 Allen Ave, Ikeja, Lagos',
    driverName: 'Tunde A.',
    vehicleReg: 'LAG-554-XY',
    eta: 'Today, 4:30 PM',
    organizationName: 'RouteAce Logistics',
    trackingUrl: 'https://routeace.app/track/DSP-00421',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(222, 47%, 11%)', margin: '0 0 16px' }
const text = { fontSize: '15px', color: 'hsl(215, 20%, 30%)', lineHeight: '1.6', margin: '0 0 16px' }
const small = { fontSize: '12px', color: 'hsl(215, 20%, 50%)', margin: '8px 0 0', lineHeight: '1.6' }
const hr = { borderColor: 'hsl(215, 20%, 90%)', margin: '24px 0 16px' }
const card = { background: 'hsl(215, 30%, 97%)', border: '1px solid hsl(215, 20%, 90%)', borderRadius: '10px', padding: '14px 16px', margin: '12px 0' }
const cardLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.04em', color: 'hsl(215, 20%, 45%)', margin: 0, fontWeight: '600' as const }
const cardValue = { fontSize: '15px', color: 'hsl(222, 47%, 18%)', margin: '2px 0 0', fontWeight: '600' as const }
const cardSmall = { fontSize: '14px', color: 'hsl(222, 47%, 18%)', margin: '2px 0 0', lineHeight: '1.5' }
const badge = { background: 'hsl(199, 89%, 92%)', color: 'hsl(199, 89%, 28%)', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' as const, fontSize: '13px' }
const link = { color: 'hsl(199, 89%, 38%)', textDecoration: 'underline' }
