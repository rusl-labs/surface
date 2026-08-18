import { describe, expect, test } from "bun:test";
import {
  InMemorySchemaFetchResolver,
} from "../../packages/core/src/index.ts";
import { createAjvValidator } from "../../packages/ajv/src/index.ts";
import {
  PRODUCT_SAMPLE,
} from "../../examples/playground/commerce-product.ts";
import {
  BILLING_INVOICE_ID,
  BILLING_INVOICE_SAMPLE,
  BILLING_INVOICE_SCHEMA,
  COMMERCE_PRODUCT_ID,
  COMMERCE_PRODUCT_SCHEMA,
  CONTACT_CARD_ID,
  CONTACT_CARD_SAMPLE,
  CONTACT_CARD_SCHEMA,
  PRAGMATIC_SCHEMA_SEEDS,
} from "../fixtures/pragmatic-seeds.ts";

const schemaResolver = new InMemorySchemaFetchResolver(PRAGMATIC_SCHEMA_SEEDS);
const validator = createAjvValidator({
  schemas: Object.values(PRAGMATIC_SCHEMA_SEEDS),
  discriminator: true,
});

describe("composite dogfood (Rusl contact.card + billing.invoice + product)", () => {
  test("contact.card maximal sample validates (postal + E.164 + scalars)", async () => {
    const result = await validator.validate({
      id: CONTACT_CARD_ID,
      schema: CONTACT_CARD_SCHEMA,
      schemaResolver,
      data: CONTACT_CARD_SAMPLE,
    });
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  test("billing.invoice maximal sample validates (money + postal + settlements)", async () => {
    const result = await validator.validate({
      id: BILLING_INVOICE_ID,
      schema: BILLING_INVOICE_SCHEMA,
      schemaResolver,
      data: BILLING_INVOICE_SAMPLE,
    });
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  test("commerce.product playground sample validates (external-reference)", async () => {
    const result = await validator.validate({
      id: COMMERCE_PRODUCT_ID,
      schema: COMMERCE_PRODUCT_SCHEMA,
      schemaResolver,
      data: PRODUCT_SAMPLE,
    });
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  test("contact.card rejects non-E.164 phone", async () => {
    const result = await validator.validate({
      id: CONTACT_CARD_ID,
      schema: CONTACT_CARD_SCHEMA,
      schemaResolver,
      data: {
        name: "Bad phone",
        phones: [{ value: "(415) 555-0100", kind: "mobile" }],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  test("billing.invoice rejects empty lineItems", async () => {
    const result = await validator.validate({
      id: BILLING_INVOICE_ID,
      schema: BILLING_INVOICE_SCHEMA,
      schemaResolver,
      data: {
        lineItems: [],
        total: { amount: 0, currency: "USD" },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
