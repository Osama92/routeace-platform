/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as customerPortalInvite } from './customer-portal-invite.tsx'
import { template as approvalDecision } from './approval-decision.tsx'
import { template as deliveryUpdate } from './delivery-update.tsx'
import { template as delayNotification } from './delay-notification.tsx'
import { template as invoiceUpdate } from './invoice-update.tsx'
import { template as delayAlert } from './delay-alert.tsx'
import { template as pickupConfirmation } from './pickup-confirmation.tsx'
import { template as deliveryProof } from './delivery-proof.tsx'
import { template as paymentAdvice } from './payment-advice.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'customer-portal-invite': customerPortalInvite,
  'approval-decision': approvalDecision,
  'delivery-update': deliveryUpdate,
  'delay-notification': delayNotification,
  'invoice-update': invoiceUpdate,
  'delay-alert': delayAlert,
  'pickup-confirmation': pickupConfirmation,
  'delivery-proof': deliveryProof,
  'payment-advice': paymentAdvice,
}
