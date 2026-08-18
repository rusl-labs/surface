/**
 * Vendored pragmatic graph seeds for playground + AJV dogfood tests.
 * Schemas come from `rusl install` (`schemas/pragmatic/`); do not hand-edit them.
 */
import type { Schema } from "../../packages/core/src/index.ts";
import billingInvoice from "../../schemas/pragmatic/billing.invoice.schema.json" with {
  type: "json",
};
import billingPayment from "../../schemas/pragmatic/billing.payment.schema.json" with {
  type: "json",
};
import billingRefund from "../../schemas/pragmatic/billing.refund.schema.json" with {
  type: "json",
};
import commerceLineItem from "../../schemas/pragmatic/commerce.line-item.schema.json" with {
  type: "json",
};
import commerceOrder from "../../schemas/pragmatic/commerce.order.schema.json" with {
  type: "json",
};
import commercePrice from "../../schemas/pragmatic/commerce.price.schema.json" with {
  type: "json",
};
import commerceProduct from "../../schemas/pragmatic/commerce.product.schema.json" with {
  type: "json",
};
import contactCard from "../../schemas/pragmatic/contact.card.schema.json" with {
  type: "json",
};
import contactScalars from "../../schemas/pragmatic/contact.scalars.schema.json" with {
  type: "json",
};
import contactSocialHandle from "../../schemas/pragmatic/contact.social-handle.schema.json" with {
  type: "json",
};
import currencyCode from "../../schemas/pragmatic/currency-code.schema.json" with {
  type: "json",
};
import externalReference from "../../schemas/pragmatic/external-reference.schema.json" with {
  type: "json",
};
import geo from "../../schemas/pragmatic/geo.schema.json" with { type: "json" };
import money from "../../schemas/pragmatic/money.schema.json" with { type: "json" };
import postalAddress from "../../schemas/pragmatic/postal.address.schema.json" with {
  type: "json",
};
import postalAuAddress from "../../schemas/pragmatic/postal.au-address.schema.json" with {
  type: "json",
};
import subdivisionCode from "../../schemas/pragmatic/subdivision-code.schema.json" with {
  type: "json",
};
import usAddress from "../../schemas/pragmatic/us-address.schema.json" with {
  type: "json",
};

export const MONEY_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/money";
export const CURRENCY_CODE_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/currency-code";
export const POSTAL_ADDRESS_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/postal.address";
export const US_ADDRESS_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/us-address";
export const AU_ADDRESS_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/postal.au-address";
export const GEO_ID = "https://resources.rusl.com/resources/pragmatic/schemas/geo";
export const SUBDIVISION_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/subdivision-code";
export const CONTACT_CARD_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/contact.card";
export const CONTACT_SCALARS_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/contact.scalars";
export const CONTACT_SOCIAL_HANDLE_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/contact.social-handle";
export const BILLING_INVOICE_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/billing.invoice";
export const BILLING_PAYMENT_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/billing.payment";
export const BILLING_REFUND_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/billing.refund";
export const COMMERCE_LINE_ITEM_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/commerce.line-item";
export const COMMERCE_ORDER_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/commerce.order";
export const COMMERCE_PRICE_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/commerce.price";
export const COMMERCE_PRODUCT_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/commerce.product";
export const EXTERNAL_REFERENCE_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/external-reference";

export const MONEY_SCHEMA = money as Schema;

/** Playground / test instance. Not part of the HTML kit. */
export const MONEY_SAMPLE = {
  amount: 1234,
  currency: "USD",
} as const;
export const CURRENCY_CODE_SCHEMA = currencyCode as Schema;
export const POSTAL_SCHEMA = postalAddress as Schema;
export const US_SCHEMA = usAddress as Schema;
export const AU_SCHEMA = postalAuAddress as Schema;
export const GEO_SCHEMA = geo as Schema;
export const SUBDIVISION_SCHEMA = subdivisionCode as Schema;
export const CONTACT_CARD_SCHEMA = contactCard as Schema;
export const CONTACT_SCALARS_SCHEMA = contactScalars as Schema;
export const CONTACT_SOCIAL_HANDLE_SCHEMA = contactSocialHandle as Schema;
export const BILLING_INVOICE_SCHEMA = billingInvoice as Schema;
export const BILLING_PAYMENT_SCHEMA = billingPayment as Schema;
export const BILLING_REFUND_SCHEMA = billingRefund as Schema;
export const COMMERCE_LINE_ITEM_SCHEMA = commerceLineItem as Schema;
export const COMMERCE_ORDER_SCHEMA = commerceOrder as Schema;
export const COMMERCE_PRICE_SCHEMA = commercePrice as Schema;
export const COMMERCE_PRODUCT_SCHEMA = commerceProduct as Schema;
export const EXTERNAL_REFERENCE_SCHEMA = externalReference as Schema;

/** Every vendored pragmatic schema, keyed by `$id`. */
export const PRAGMATIC_SCHEMA_SEEDS: Record<string, Schema> = {
  [MONEY_ID]: MONEY_SCHEMA,
  [CURRENCY_CODE_ID]: CURRENCY_CODE_SCHEMA,
  [POSTAL_ADDRESS_ID]: POSTAL_SCHEMA,
  [US_ADDRESS_ID]: US_SCHEMA,
  [AU_ADDRESS_ID]: AU_SCHEMA,
  [GEO_ID]: GEO_SCHEMA,
  [SUBDIVISION_ID]: SUBDIVISION_SCHEMA,
  [CONTACT_CARD_ID]: CONTACT_CARD_SCHEMA,
  [CONTACT_SCALARS_ID]: CONTACT_SCALARS_SCHEMA,
  [CONTACT_SOCIAL_HANDLE_ID]: CONTACT_SOCIAL_HANDLE_SCHEMA,
  [BILLING_INVOICE_ID]: BILLING_INVOICE_SCHEMA,
  [BILLING_PAYMENT_ID]: BILLING_PAYMENT_SCHEMA,
  [BILLING_REFUND_ID]: BILLING_REFUND_SCHEMA,
  [COMMERCE_LINE_ITEM_ID]: COMMERCE_LINE_ITEM_SCHEMA,
  [COMMERCE_ORDER_ID]: COMMERCE_ORDER_SCHEMA,
  [COMMERCE_PRICE_ID]: COMMERCE_PRICE_SCHEMA,
  [COMMERCE_PRODUCT_ID]: COMMERCE_PRODUCT_SCHEMA,
  [EXTERNAL_REFERENCE_ID]: EXTERNAL_REFERENCE_SCHEMA,
};

/** Seed US address (valid against us-address + postal.address). */
export const POSTAL_SAMPLE = {
  $kind: US_ADDRESS_ID,
  countryCode: "US",
  street1: "1 Market St",
  city: "San Francisco",
  region: "CA",
  postalCode: "94105",
} as const;

/**
 * Registry maximal example for contact.card — embeds postal.address + E.164 phone.
 * @see rusl list_schema_examples pragmatic/contact.card
 */
export const CONTACT_CARD_SAMPLE = {
  $kind: CONTACT_CARD_ID,
  kind: "individual",
  name: "Jane Doe",
  nameComponents: {
    prefix: "Dr.",
    given: "Jane",
    family: "Doe",
  },
  organization: "Acme Corp",
  title: "VP of Sales",
  emails: [
    {
      value: "jane@acme.example",
      contexts: ["work"],
      preference: 1,
    },
  ],
  phones: [
    {
      value: "+14155550100",
      kind: "mobile",
      contexts: ["work"],
      preference: 1,
    },
  ],
  links: [
    {
      value: "https://jane.example",
      kind: "website",
      contexts: ["work"],
      preference: 1,
    },
  ],
  addresses: [POSTAL_SAMPLE],
  socialHandles: [
    {
      platform: "x",
      handle: "jdoe",
    },
  ],
  externalReferences: [
    {
      system: "salesforce",
      id: "003xx000004TmiQ",
    },
  ],
  metadata: {
    "com.example.crmId": "c_1",
  },
} as const;

/**
 * Registry maximal invoice — line items (money), billingAddress (postal), settlements.
 * @see rusl list_schema_examples pragmatic/billing.invoice
 */
export const BILLING_INVOICE_SAMPLE = {
  $kind: BILLING_INVOICE_ID,
  number: "INV-1001",
  status: "paid",
  customerId: "cus_1",
  orderId: "ord_1",
  issuedAt: "2026-07-13T12:00:00Z",
  dueAt: "2026-07-27T12:00:00Z",
  billingAddress: POSTAL_SAMPLE,
  lineItems: [
    {
      name: "Wireless Mouse",
      quantity: 1,
      unitAmount: { amount: 1999, currency: "USD" },
      amount: { amount: 1999, currency: "USD" },
    },
  ],
  subtotal: { amount: 1999, currency: "USD" },
  discountTotal: { amount: 0, currency: "USD" },
  taxTotal: { amount: 0, currency: "USD" },
  total: { amount: 1999, currency: "USD" },
  amountPaid: { amount: 1999, currency: "USD" },
  amountDue: { amount: 0, currency: "USD" },
  settlements: [
    {
      kind: "payment",
      id: "pay_1",
      amount: { amount: 1500, currency: "USD" },
      occurredAt: "2026-07-13T12:05:00Z",
    },
    {
      kind: "payment",
      id: "pay_2",
      amount: { amount: 499, currency: "USD" },
      occurredAt: "2026-07-13T12:06:00Z",
    },
  ],
  externalReferences: [
    {
      system: "stripe",
      id: "in_123",
    },
  ],
  metadata: {},
} as const;
