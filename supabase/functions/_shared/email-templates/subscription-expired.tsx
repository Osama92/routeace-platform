/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { styles as s } from './_styles.ts'

export interface SubscriptionExpiredProps {
  siteName: string
  siteUrl: string
  recipientName: string
  planName: string
  expiredOn: string
  reactivateUrl: string
}

export const SubscriptionExpiredEmail = (p: SubscriptionExpiredProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your ${p.siteName} subscription has expired`}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Heading style={s.h1}>Your Subscription Has Expired</Heading>
        <Section style={s.infoBoxRed}>
          <div style={s.row}><span style={s.label}>Plan</span><span style={s.value}>{p.planName}</span></div>
          <div style={s.row}><span style={s.label}>Expiry Date</span><span style={s.value}>{p.expiredOn}</span></div>
        </Section>
        <Text style={s.text}>Hi {p.recipientName}, your <strong>{p.planName}</strong> plan expired on {p.expiredOn}. Your data is safe - reactivate within 30 days to restore full access.</Text>
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={p.reactivateUrl} style={s.button}>Reactivate Now</Button>
        </div>
        <Text style={s.footer}>Data is retained for 30 days. After that, account data may be permanently deleted.</Text>
      </Container>
    </Body>
  </Html>
)

export default SubscriptionExpiredEmail
