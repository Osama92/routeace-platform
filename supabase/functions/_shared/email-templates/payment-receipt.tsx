/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { styles as s } from './_styles.ts'

export interface PaymentReceiptProps {
  siteName: string
  siteUrl: string
  recipientName: string
  invoiceRef: string
  paymentDate: string
  planName: string
  amount: number | string
  currencySymbol: string
  paymentMethod: string
  invoiceUrl: string
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <>
    <div style={s.row}>
      <span style={s.label}>{label}</span>
      <span style={s.value}>{value}</span>
    </div>
    <Hr style={s.hr} />
  </>
)

export const PaymentReceiptEmail = (p: PaymentReceiptProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Payment received - Invoice #${p.invoiceRef}`}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Heading style={s.h1}>Payment Received ✓</Heading>
        <Text style={s.text}>Hi {p.recipientName}, thank you for your payment.</Text>
        <Section style={s.infoBox}>
          <Row label="Invoice #" value={p.invoiceRef} />
          <Row label="Date" value={p.paymentDate} />
          <Row label="Plan" value={p.planName} />
          <Row label="Amount Paid" value={`${p.currencySymbol}${p.amount}`} />
          <div style={s.row}><span style={s.label}>Payment Method</span><span style={s.value}>{p.paymentMethod}</span></div>
        </Section>
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={p.invoiceUrl} style={s.button}>Download Invoice</Button>
        </div>
        <Text style={s.small}>This is an automated receipt. Keep it for your records.</Text>
        <Text style={s.footer}>{p.siteName} - Thanks for your business.</Text>
      </Container>
    </Body>
  </Html>
)

export default PaymentReceiptEmail
