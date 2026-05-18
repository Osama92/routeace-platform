/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/render@0.0.17'

import { OrderConfirmationEmail } from '../_shared/email-templates/order-confirmation.tsx'
import { WelcomeNewUserEmail } from '../_shared/email-templates/welcome-new-user.tsx'
import { DeliveryDispatchedEmail } from '../_shared/email-templates/delivery-dispatched.tsx'
import { DeliveryCompletedEmail } from '../_shared/email-templates/delivery-completed.tsx'
import { DeliveryFailedEmail } from '../_shared/email-templates/delivery-failed.tsx'
import { SubscriptionActivatedEmail } from '../_shared/email-templates/subscription-activated.tsx'
import { SubscriptionRenewalEmail } from '../_shared/email-templates/subscription-renewal.tsx'
import { SubscriptionExpiredEmail } from '../_shared/email-templates/subscription-expired.tsx'
import { PaymentReceiptEmail } from '../_shared/email-templates/payment-receipt.tsx'

interface TemplateDef {
  component: React.ComponentType<any>
  subject: (data: any) => string
}

export const TRANSACTIONAL_TEMPLATES: Record<string, TemplateDef> = {
  order_confirmation: {
    component: OrderConfirmationEmail,
    subject: (d) => `Your order #${d.orderRef} is confirmed - ${d.siteName ?? 'RouteAce'}`,
  },
  welcome_new_user: {
    component: WelcomeNewUserEmail,
    subject: (d) => `Welcome to ${d.siteName ?? 'RouteAce'}, ${d.recipientName ?? ''}!`,
  },
  delivery_dispatched: {
    component: DeliveryDispatchedEmail,
    subject: (d) => `Your order #${d.orderRef} is on the way`,
  },
  delivery_completed: {
    component: DeliveryCompletedEmail,
    subject: (d) => `Order #${d.orderRef} delivered successfully`,
  },
  delivery_failed: {
    component: DeliveryFailedEmail,
    subject: (d) => `Delivery attempt failed for order #${d.orderRef}`,
  },
  subscription_activated: {
    component: SubscriptionActivatedEmail,
    subject: (d) => `Your ${d.planName} subscription is active`,
  },
  subscription_renewal: {
    component: SubscriptionRenewalEmail,
    subject: (d) => `Your ${d.siteName ?? 'RouteAce'} subscription renews on ${d.renewalDate}`,
  },
  subscription_expired: {
    component: SubscriptionExpiredEmail,
    subject: (d) => `Your ${d.siteName ?? 'RouteAce'} subscription has expired`,
  },
  payment_receipt: {
    component: PaymentReceiptEmail,
    subject: (d) => `Payment received - Invoice #${d.invoiceRef}`,
  },
}

export async function renderTransactionalTemplate(
  templateName: string,
  templateData: Record<string, unknown>
): Promise<{ html: string; subject: string } | null> {
  const def = TRANSACTIONAL_TEMPLATES[templateName]
  if (!def) return null
  const data = {
    siteName: 'RouteAce',
    siteUrl: 'https://routeaceglyde.app',
    ...templateData,
  }
  const Component = def.component
  const html = await renderAsync(React.createElement(Component, data))
  return { html, subject: def.subject(data) }
}
