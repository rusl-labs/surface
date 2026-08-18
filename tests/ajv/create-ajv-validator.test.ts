import { describe, expect, test } from "bun:test";
import {
  InMemorySchemaFetchResolver,
  type Schema,
} from "../../packages/core/src/index.ts";
import { createAjvValidator } from "../../packages/ajv/src/index.ts";
import postalAddress from "../../schemas/pragmatic/postal.address.schema.json" with { type: "json" };
import usAddress from "../../schemas/pragmatic/us-address.schema.json" with { type: "json" };
import auAddress from "../../schemas/pragmatic/postal.au-address.schema.json" with { type: "json" };
import geo from "../../schemas/pragmatic/geo.schema.json" with { type: "json" };
import subdivision from "../../schemas/pragmatic/subdivision-code.schema.json" with { type: "json" };

const POSTAL = postalAddress as Schema;
const US = usAddress as Schema;
const AU = auAddress as Schema;

const US_ID = "https://resources.rusl.com/resources/pragmatic/schemas/us-address";
const AU_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/postal.au-address";
const POSTAL_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/postal.address";

const resolver = new InMemorySchemaFetchResolver({
  [POSTAL_ID]: POSTAL,
  [US_ID]: US,
  [AU_ID]: AU,
  "https://resources.rusl.com/resources/pragmatic/schemas/geo": geo as Schema,
  "https://resources.rusl.com/resources/pragmatic/schemas/subdivision-code":
    subdivision as Schema,
});

const validator = createAjvValidator({
  schemas: [POSTAL, US, AU, geo as Schema, subdivision as Schema],
  discriminator: true,
});

describe("createAjvValidator + postal.address discriminator", () => {
  test("valid US zip does not report AU pattern", async () => {
    const result = await validator.validate({
      id: POSTAL_ID,
      schema: POSTAL,
      schemaResolver: resolver,
      data: {
        $kind: US_ID,
        countryCode: "US",
        street1: "1 Market St",
        city: "San Francisco",
        region: "CA",
        postalCode: "94598",
      },
    });
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  test("invalid US zip reports US pattern only (not AU 4-digit)", async () => {
    const result = await validator.validate({
      id: POSTAL_ID,
      schema: POSTAL,
      schemaResolver: resolver,
      data: {
        $kind: US_ID,
        countryCode: "US",
        street1: "1 Market St",
        city: "San Francisco",
        region: "CA",
        postalCode: "3000",
      },
    });
    expect(result.valid).toBe(false);
    const messages = result.issues.map((i) => i.message).join("\n");
    expect(messages).toContain("^[0-9]{5}");
    expect(messages).not.toContain("^[0-9]{4}$");
  });

  test("invalid AU postcode reports AU pattern only", async () => {
    const result = await validator.validate({
      id: POSTAL_ID,
      schema: POSTAL,
      schemaResolver: resolver,
      data: {
        $kind: AU_ID,
        countryCode: "AU",
        street1: "10 Smith St",
        city: "Fitzroy",
        region: "VIC",
        postalCode: "94598",
      },
    });
    expect(result.valid).toBe(false);
    const messages = result.issues.map((i) => i.message).join("\n");
    expect(messages).toContain("^[0-9]{4}$");
    expect(messages).not.toContain("^[0-9]{5}");
  });
});
