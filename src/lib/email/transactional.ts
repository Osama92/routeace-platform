import { supabase } from "@/integrations/supabase/client";

/**
 * Branded transactional email helpers.
 * Each helper invokes the `send-transactional-email` edge function with a stable
 * idempotency key so retries never produce duplicates.
 */

type DeliveryStatus =
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface DeliveryUpdateInput {
  dispatchId: string;
  recipientEmail: string;
  recipientName?: string;
  recipientRole?: "customer" | "driver";
  dispatchNumber?: string;
  status: DeliveryStatus;
  pickupAddress?: string;
  deliveryAddress?: string;
  driverName?: string;
  vehicleReg?: string;
  eta?: string;
  organizationName?: string;
  trackingUrl?: string;
}

export async function sendDeliveryUpdateEmail(input: DeliveryUpdateInput) {
  return supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName: "delivery-update",
      recipientEmail: input.recipientEmail,
      idempotencyKey: `delivery-${input.dispatchId}-${input.status}-${input.recipientRole ?? "customer"}`,
      templateData: {
        recipientName: input.recipientName,
        recipientRole: input.recipientRole ?? "customer",
        dispatchNumber: input.dispatchNumber,
        status: input.status,
        pickupAddress: input.pickupAddress,
        deliveryAddress: input.deliveryAddress,
        driverName: input.driverName,
        vehicleReg: input.vehicleReg,
        eta: input.eta,
        organizationName: input.organizationName,
        trackingUrl: input.trackingUrl,
      },
    },
  });
}

export interface DelayNotificationInput {
  dispatchId: string;
  recipientEmail: string;
  recipientName?: string;
  dispatchNumber?: string;
  delayMinutes?: number;
  newEta?: string;
  reason?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  organizationName?: string;
  trackingUrl?: string;
  /** Optional event id so multiple delay alerts on the same dispatch don't dedupe. */
  eventId?: string;
}

export async function sendDelayNotificationEmail(input: DelayNotificationInput) {
  const eventSuffix = input.eventId ?? input.newEta ?? new Date().toISOString().slice(0, 16);
  return supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName: "delay-notification",
      recipientEmail: input.recipientEmail,
      idempotencyKey: `delay-${input.dispatchId}-${eventSuffix}`,
      templateData: {
        recipientName: input.recipientName,
        dispatchNumber: input.dispatchNumber,
        delayMinutes: input.delayMinutes,
        newEta: input.newEta,
        reason: input.reason,
        pickupAddress: input.pickupAddress,
        deliveryAddress: input.deliveryAddress,
        organizationName: input.organizationName,
        trackingUrl: input.trackingUrl,
      },
    },
  });
}

export interface InvoiceUpdateInput {
  invoiceId: string;
  recipientEmail: string;
  recipientName?: string;
  invoiceNumber?: string;
  event: "issued" | "reminder" | "overdue" | "paid";
  amount?: number;
  currency?: string;
  dueDate?: string;
  organizationName?: string;
  invoiceUrl?: string;
  notes?: string;
}

export async function sendInvoiceUpdateEmail(input: InvoiceUpdateInput) {
  return supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName: "invoice-update",
      recipientEmail: input.recipientEmail,
      idempotencyKey: `invoice-${input.invoiceId}-${input.event}`,
      templateData: {
        recipientName: input.recipientName,
        invoiceNumber: input.invoiceNumber,
        event: input.event,
        amount: input.amount,
        currency: input.currency,
        dueDate: input.dueDate,
        organizationName: input.organizationName,
        invoiceUrl: input.invoiceUrl,
        notes: input.notes,
      },
    },
  });
}

// ===========================================================
// Configurable templates (delay alert, pickup confirmation,
// delivery proof, payment advice). Each accepts an optional
// organizationId so the send function can apply tenant-level
// subject/copy/branding overrides from email_template_configs.
// ===========================================================

export interface DelayAlertInput {
  dispatchId: string;
  recipientEmail: string;
  organizationId?: string;
  recipientName?: string;
  dispatchNumber?: string;
  severity?: "at_risk" | "breached";
  delayMinutes?: number;
  newEta?: string;
  reason?: string;
  deliveryAddress?: string;
  organizationName?: string;
  trackingUrl?: string;
  eventId?: string;
}
export async function sendDelayAlertEmail(input: DelayAlertInput) {
  const suffix = input.eventId ?? input.severity ?? input.newEta ?? new Date().toISOString().slice(0, 16);
  return supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName: "delay-alert",
      recipientEmail: input.recipientEmail,
      organizationId: input.organizationId,
      idempotencyKey: `delay-alert-${input.dispatchId}-${suffix}`,
      templateData: {
        recipientName: input.recipientName,
        dispatchNumber: input.dispatchNumber,
        severity: input.severity ?? "breached",
        delayMinutes: input.delayMinutes,
        newEta: input.newEta,
        reason: input.reason,
        deliveryAddress: input.deliveryAddress,
        organizationName: input.organizationName,
        trackingUrl: input.trackingUrl,
      },
    },
  });
}

export interface PickupConfirmationInput {
  dispatchId: string;
  recipientEmail: string;
  organizationId?: string;
  recipientName?: string;
  dispatchNumber?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  pickupTime?: string;
  driverName?: string;
  vehicleReg?: string;
  cargoDescription?: string;
  organizationName?: string;
  trackingUrl?: string;
}
export async function sendPickupConfirmationEmail(input: PickupConfirmationInput) {
  return supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName: "pickup-confirmation",
      recipientEmail: input.recipientEmail,
      organizationId: input.organizationId,
      idempotencyKey: `pickup-${input.dispatchId}`,
      templateData: {
        recipientName: input.recipientName,
        dispatchNumber: input.dispatchNumber,
        pickupAddress: input.pickupAddress,
        deliveryAddress: input.deliveryAddress,
        pickupTime: input.pickupTime,
        driverName: input.driverName,
        vehicleReg: input.vehicleReg,
        cargoDescription: input.cargoDescription,
        organizationName: input.organizationName,
        trackingUrl: input.trackingUrl,
      },
    },
  });
}

export interface DeliveryProofInput {
  dispatchId: string;
  recipientEmail: string;
  organizationId?: string;
  recipientName?: string;
  dispatchNumber?: string;
  deliveryAddress?: string;
  deliveredAt?: string;
  podRecipient?: string;
  podPhotoUrl?: string;
  podNotes?: string;
  organizationName?: string;
  invoiceUrl?: string;
}
export async function sendDeliveryProofEmail(input: DeliveryProofInput) {
  return supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName: "delivery-proof",
      recipientEmail: input.recipientEmail,
      organizationId: input.organizationId,
      idempotencyKey: `pod-${input.dispatchId}`,
      templateData: {
        recipientName: input.recipientName,
        dispatchNumber: input.dispatchNumber,
        deliveryAddress: input.deliveryAddress,
        deliveredAt: input.deliveredAt,
        podRecipient: input.podRecipient,
        podPhotoUrl: input.podPhotoUrl,
        podNotes: input.podNotes,
        organizationName: input.organizationName,
        invoiceUrl: input.invoiceUrl,
      },
    },
  });
}

export interface PaymentAdviceInput {
  invoiceId: string;
  recipientEmail: string;
  organizationId?: string;
  recipientName?: string;
  invoiceNumber?: string;
  amountPaid?: number;
  totalAmount?: number;
  balanceDue?: number;
  currency?: string;
  paidDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
  organizationName?: string;
  invoiceUrl?: string;
}
export async function sendPaymentAdviceEmail(input: PaymentAdviceInput) {
  return supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName: "payment-advice",
      recipientEmail: input.recipientEmail,
      organizationId: input.organizationId,
      idempotencyKey: `pay-advice-${input.invoiceId}`,
      templateData: {
        recipientName: input.recipientName,
        invoiceNumber: input.invoiceNumber,
        amountPaid: input.amountPaid,
        totalAmount: input.totalAmount,
        balanceDue: input.balanceDue,
        currency: input.currency,
        paidDate: input.paidDate,
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference,
        organizationName: input.organizationName,
        invoiceUrl: input.invoiceUrl,
      },
    },
  });
}
