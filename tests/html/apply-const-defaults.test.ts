import { describe, expect, test } from "bun:test";
import {
  InMemorySchemaFetchResolver,
  type Schema,
} from "../../packages/core/src/index.ts";
import { applyConstAndDefaults } from "../../packages/html/src/fields/apply-const-defaults.ts";

const US_ID = "https://example.test/us-address";
const POSTAL_ID = "https://example.test/postal.address";

const US_ADDRESS: Schema = {
  $id: US_ID,
  type: "object",
  required: ["$kind", "countryCode", "street1"],
  properties: {
    $kind: { const: US_ID },
    countryCode: { const: "US" },
    street1: { type: "string" },
    status: { type: "string", default: "active" },
  },
};

const POSTAL: Schema = {
  $id: POSTAL_ID,
  allOf: [
    {
      type: "object",
      properties: {
        street1: { type: "string" },
      },
    },
    {
      oneOf: [
        { $ref: US_ID },
        {
          type: "object",
          properties: {
            $kind: { const: "https://example.test/au-address" },
            countryCode: { const: "AU" },
          },
        },
      ],
    },
  ],
};

describe("applyConstAndDefaults", () => {
  test("forces property const and fills missing defaults", async () => {
    const resolver = new InMemorySchemaFetchResolver({ [US_ID]: US_ADDRESS });
    const out = await applyConstAndDefaults(
      US_ADDRESS,
      { street1: "1 Market" },
      resolver,
    );
    expect(out).toEqual({
      street1: "1 Market",
      $kind: US_ID,
      countryCode: "US",
      status: "active",
    });
  });

  test("const overwrites a wrong value", async () => {
    const resolver = new InMemorySchemaFetchResolver({ [US_ID]: US_ADDRESS });
    const out = (await applyConstAndDefaults(
      US_ADDRESS,
      { street1: "x", countryCode: "XX", $kind: "wrong" },
      resolver,
    )) as Record<string, unknown>;
    expect(out.countryCode).toBe("US");
    expect(out.$kind).toBe(US_ID);
  });

  test("allOf + oneOf $ref seeds nested branch consts", async () => {
    const resolver = new InMemorySchemaFetchResolver({
      [US_ID]: US_ADDRESS,
      [POSTAL_ID]: POSTAL,
    });
    const out = await applyConstAndDefaults(
      POSTAL,
      { street1: "1 Market", $kind: US_ID },
      resolver,
    );
    expect(out).toEqual({
      street1: "1 Market",
      $kind: US_ID,
      countryCode: "US",
      status: "active",
    });
  });

  test("defaults always apply when null as well as undefined", async () => {
    const resolver = new InMemorySchemaFetchResolver({ [US_ID]: US_ADDRESS });
    const out = (await applyConstAndDefaults(
      US_ADDRESS,
      { street1: "1 Market", status: null },
      resolver,
    )) as Record<string, unknown>;
    expect(out.status).toBe("active");
  });
});
