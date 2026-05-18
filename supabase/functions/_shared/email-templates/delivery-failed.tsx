/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { styles as s } from './_styles.ts'

export interface DeliveryFailedProps {
  siteName: string
  siteUrl: string
  recipientName: string
  orderRef: string
  attemptDate: string
  failReason: string
  rescheduleUrl: string
  supportUrl: string
}

export const DeliveryFailedEmail = (p: DeliveryFailedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Delivery attempt failed for order #${p.orderRef}`}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Heading style={s.h1}>Delivery Attempt Unsuccessful</Heading>
        <Text style={s.text}>Hi {p.recipientName}, we tried to deliver order <strong>#{p.orderRef}</strong> on {p.attemptDate} but were unable to complete it.</Text>
        <Section style={s.infoBoxAmber}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Reason: {p.failReason}</div>
          <div style={{ fontSize: 13 }}>Attempted on {p.attemptDate}</div>
        </Section>
        <Text style={s.text}>Don't worry - you can reschedule or contact support below.</Text>
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={p.rescheduleUrl} style={s.button}>Reschedule Delivery</Button>
          <Button href={p.supportUrl} style={s.buttonOutline}>Contact Support</Button>
        </div>
        <Text style={s.footer}>We'll keep your shipment safe until next attempt.</Text>
      </Container>
    </Body>
  </Html>
)

export default DeliveryFailedEmail
