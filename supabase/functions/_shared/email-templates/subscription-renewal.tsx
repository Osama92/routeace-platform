/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { styles as s } from './_styles.ts'

export interface SubscriptionRenewalProps {
  siteName: string
  siteUrl: string
  recipientName: string
  planName: string
  amount: number | string
  currencySymbol: string
  renewalDate: string
  invoiceUrl: string
  manageUrl: string
  paymentLast4?: string
}

export const SubscriptionRenewalEmail = (p: SubscriptionRenewalProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your ${p.siteName} subscription renews on ${p.renewalDate}`}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Heading style={s.h1}>Upcoming Renewal Reminder</Heading>
        <Text style={s.text}>Hi {p.recipientName}, your <strong>{p.planName}</strong> plan will auto-renew on <strong>{p.renewalDate}</strong> for {p.currencySymbol}{p.amount}.</Text>
        <Section style={s.infoBox}>
          <div style={s.row}><span style={s.label}>Plan</span><span style={s.value}>{p.planName}</span></div>
          <div style={s.row}><span style={s.label}>Amount</span><span style={s.value}>{p.currencySymbol}{p.amount}</span></div>
          <div style={s.row}><span style={s.label}>Renewal Date</span><span style={s.value}>{p.renewalDate}</span></div>
          {p.paymentLast4 ? (
            <div style={s.row}><span style={s.label}>Payment Method</span><span style={s.value}>•••• {p.paymentLast4}</span></div>
          ) : null}
        </Section>
        <div style={{ margin: '20px 0' }}>
          <Link href={p.invoiceUrl} style={s.link}>View Invoice</Link>
          <span style={{ margin: '0 8px', color: 'hsl(215, 20%, 70%)' }}>•</span>
          <Link href={p.manageUrl} style={s.link}>Manage Subscription</Link>
        </div>
        <Text style={s.footer}>To cancel before renewal, visit Settings → Billing at least 24 hours before the date.</Text>
      </Container>
    </Body>
  </Html>
)

export default SubscriptionRenewalEmail
