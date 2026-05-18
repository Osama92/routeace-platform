/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { styles as s } from './_styles.ts'

export interface DeliveryDispatchedProps {
  siteName: string
  siteUrl: string
  recipientName: string
  orderRef: string
  driverName: string
  driverPhone: string
  vehicleReg: string
  estimatedArrival: string
  trackingUrl: string
}

export const DeliveryDispatchedEmail = (p: DeliveryDispatchedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your order #${p.orderRef} is on the way`}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Heading style={s.h1}>Your delivery is on its way 🚚</Heading>
        <Text style={s.text}>Hi {p.recipientName}, order <strong>#{p.orderRef}</strong> has been dispatched.</Text>
        <Section style={s.infoBox}>
          <div style={s.row}><span style={s.label}>Driver</span><span style={s.value}>{p.driverName}</span></div>
          <div style={s.row}><span style={s.label}>Vehicle Reg</span><span style={s.value}>{p.vehicleReg}</span></div>
          <div style={s.row}><span style={s.label}>ETA</span><span style={s.value}>{p.estimatedArrival}</span></div>
        </Section>
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={p.trackingUrl} style={s.button}>Track Live Location</Button>
        </div>
        <Text style={s.footer}>For urgent delivery issues, call your driver directly at {p.driverPhone}.</Text>
      </Container>
    </Body>
  </Html>
)

export default DeliveryDispatchedEmail
