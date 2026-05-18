/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { styles as s } from './_styles.ts'

export interface SubscriptionActivatedProps {
  siteName: string
  siteUrl: string
  recipientName: string
  planName: string
  billingCycle: string
  amount: number | string
  currencySymbol: string
  nextBillingDate: string
  dashboardUrl: string
}

export const SubscriptionActivatedEmail = (p: SubscriptionActivatedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your ${p.planName} subscription is active`}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Heading style={s.h1}>Subscription Activated ✓</Heading>
        <Text style={s.text}>Hi {p.recipientName}, your account is fully activated. All features on the <strong>{p.planName}</strong> plan are now available.</Text>
        <Section style={s.infoBox}>
          <div style={s.row}><span style={s.label}>Plan</span><span style={s.value}>{p.planName}</span></div>
          <div style={s.row}><span style={s.label}>Billing</span><span style={s.value}>{p.billingCycle}</span></div>
          <div style={s.row}><span style={s.label}>Amount</span><span style={s.value}>{p.currencySymbol}{p.amount}</span></div>
          <div style={s.row}><span style={s.label}>Next Billing Date</span><span style={s.value}>{p.nextBillingDate}</span></div>
        </Section>
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={p.dashboardUrl} style={s.button}>Explore Your Plan</Button>
        </div>
        <Text style={s.footer}>To manage your subscription, go to Settings → Billing.</Text>
      </Container>
    </Body>
  </Html>
)

export default SubscriptionActivatedEmail
