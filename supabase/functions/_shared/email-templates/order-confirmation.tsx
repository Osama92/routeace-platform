/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import { styles as s } from './_styles.ts'

export interface OrderConfirmationProps {
  siteName: string
  siteUrl: string
  recipientName: string
  orderRef: string
  orderDate: string
  pickupAddress: string
  deliveryAddress: string
  estimatedDelivery: string
  items: Array<{ description: string; quantity: number | string; weight?: string | number }>
  totalAmount: number | string
  currencySymbol: string
  trackingUrl: string
}

export const OrderConfirmationEmail = (p: OrderConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your order #${p.orderRef} is confirmed - ${p.siteName}`}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Heading style={s.h1}>Order Confirmed ✓</Heading>
        <Text style={s.text}>Hi {p.recipientName}, your shipment order has been received and is being processed.</Text>

        <Section style={s.infoBox}>
          <div style={s.row}><span style={s.label}>Order Ref</span><span style={s.value}>{p.orderRef}</span></div>
          <div style={s.row}><span style={s.label}>Order Date</span><span style={s.value}>{p.orderDate}</span></div>
          <div style={s.row}><span style={s.label}>Estimated Delivery</span><span style={s.value}>{p.estimatedDelivery}</span></div>
        </Section>

        <table width="100%" style={{ borderCollapse: 'collapse', margin: '0 0 20px' }}>
          <tbody>
            <tr>
              <td style={{ ...s.td, verticalAlign: 'top', width: '50%' }}>
                <div style={s.label}>Pickup Address</div>
                <div style={s.value}>{p.pickupAddress}</div>
              </td>
              <td style={{ ...s.td, verticalAlign: 'top', width: '50%' }}>
                <div style={s.label}>Delivery Address</div>
                <div style={s.value}>{p.deliveryAddress}</div>
              </td>
            </tr>
          </tbody>
        </table>

        <table width="100%" style={{ borderCollapse: 'collapse', margin: '0 0 16px' }}>
          <thead>
            <tr><th style={s.th}>Description</th><th style={s.th}>Qty</th><th style={s.th}>Weight</th></tr>
          </thead>
          <tbody>
            {p.items.map((it, i) => (
              <tr key={i}>
                <td style={s.td}>{it.description}</td>
                <td style={s.td}>{it.quantity}</td>
                <td style={s.td}>{it.weight ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ textAlign: 'right', ...s.totalRow }}>
          Total: {p.currencySymbol}{p.totalAmount}
        </div>

        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={p.trackingUrl} style={s.button}>Track Your Order</Button>
        </div>

        <Text style={s.footer}>Need help? Reply to this email or visit our support centre.</Text>
      </Container>
    </Body>
  </Html>
)

export default OrderConfirmationEmail
