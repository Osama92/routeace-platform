/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { styles as s } from './_styles.ts'

export interface DeliveryCompletedProps {
  siteName: string
  siteUrl: string
  recipientName: string
  orderRef: string
  deliveredAt: string
  proofOfDeliveryUrl: string
  feedbackUrl: string
}

export const DeliveryCompletedEmail = (p: DeliveryCompletedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Order #${p.orderRef} delivered successfully`}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Heading style={s.h1}>Delivered ✓</Heading>
        <Text style={s.text}>Hi {p.recipientName}, your shipment <strong>#{p.orderRef}</strong> was successfully delivered on {p.deliveredAt}.</Text>
        <div style={{ margin: '16px 0' }}>
          <div style={{ margin: '8px 0', fontSize: '14px' }}>📄 <Link href={p.proofOfDeliveryUrl} style={s.link}>View Proof of Delivery</Link></div>
          <div style={{ margin: '8px 0', fontSize: '14px' }}>⭐ <Link href={p.feedbackUrl} style={s.link}>Rate this delivery</Link></div>
        </div>
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={p.feedbackUrl} style={s.button}>Leave Feedback</Button>
        </div>
        <Text style={s.footer}>Thanks for shipping with {p.siteName}.</Text>
      </Container>
    </Body>
  </Html>
)

export default DeliveryCompletedEmail
