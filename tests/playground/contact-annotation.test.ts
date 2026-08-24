import { describe, expect, test } from "bun:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { listFields, type Schema } from "../../packages/core/src/index.ts";
import {
  CONTACT_ANNOTATION,
  CONTACT_DIRECTORY_ANNOTATION,
  EXTERNAL_REFERENCE_ANNOTATION,
  INVOICE_ANNOTATION,
  LINE_ITEM_ANNOTATION,
  MONEY_ANNOTATION,
  POSTAL_ANNOTATION,
  US_ADDRESS_ANNOTATION,
} from "../../examples/playground/subject-state.ts";
import { PRODUCT_ANNOTATION } from "../../examples/playground/commerce-product.ts";
import {
  CONTACT_CARD_ID,
  CONTACT_CARD_SCHEMA,
  EXTERNAL_REFERENCE_ID,
} from "../fixtures/pragmatic-seeds.ts";

const here = dirname(fileURLToPath(import.meta.url));
const formatSchema = JSON.parse(
  readFileSync(
    join(here, "../../docs/annotation-format.schema.json"),
    "utf8",
  ),
) as object;
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateAnnotation = ajv.compile(formatSchema);

function viewsOf(doc: { views?: Record<string, unknown> }): Record<string, unknown> {
  return doc.views ?? {};
}

function viewFields(view: unknown): readonly unknown[] {
  if (typeof view !== "object" || view === null) return [];
  const fields = (view as { fields?: unknown }).fields;
  return Array.isArray(fields) ? fields : [];
}

describe("playground contact annotations", () => {
  test("seeded subject starters validate", () => {
    expect(validateAnnotation(CONTACT_ANNOTATION)).toBe(true);
    expect(validateAnnotation(EXTERNAL_REFERENCE_ANNOTATION)).toBe(true);
    expect(validateAnnotation(POSTAL_ANNOTATION)).toBe(true);
    expect(validateAnnotation(US_ADDRESS_ANNOTATION)).toBe(true);
    expect(validateAnnotation(MONEY_ANNOTATION)).toBe(true);
    expect(validateAnnotation(PRODUCT_ANNOTATION)).toBe(true);
    expect(validateAnnotation(CONTACT_DIRECTORY_ANNOTATION)).toBe(true);
  });

  test("contact density views and nested display remounts", () => {
    const views = viewsOf(CONTACT_ANNOTATION);
    expect(views.identity).toBeDefined();
    expect(views.row).toBeDefined();
    expect(views.card).toBeDefined();
    const addresses = viewFields(views.default).find(
      (f) =>
        typeof f === "object" &&
        f !== null &&
        "name" in f &&
        (f as { name?: string }).name === "addresses",
    ) as { display?: { view?: string } } | undefined;
    expect(addresses?.display?.view).toBe("card");
    const ext = viewFields(views.default).find(
      (f) =>
        typeof f === "object" &&
        f !== null &&
        "name" in f &&
        (f as { name?: string }).name === "externalReferences",
    ) as { display?: { view?: string } } | undefined;
    expect(ext?.display?.view).toBe("row");
  });

  test("postal has row/card and no identity; money default-only", () => {
    const postal = viewsOf(POSTAL_ANNOTATION);
    expect(postal.identity).toBeUndefined();
    expect(postal.row).toBeDefined();
    expect(postal.card).toBeDefined();
    expect(Object.keys(viewsOf(MONEY_ANNOTATION))).toEqual(["default"]);
    expect(viewsOf(PRODUCT_ANNOTATION).identity).toBeDefined();
    expect(viewsOf(EXTERNAL_REFERENCE_ANNOTATION).row).toBeDefined();
    expect(viewsOf(EXTERNAL_REFERENCE_ANNOTATION).identity).toBeUndefined();
  });

  test("invoice + line-item starters validate and keep density views", () => {
    expect(validateAnnotation(INVOICE_ANNOTATION)).toBe(true);
    expect(validateAnnotation(LINE_ITEM_ANNOTATION)).toBe(true);
    const invoice = viewsOf(INVOICE_ANNOTATION);
    expect(invoice.identity).toBeUndefined();
    expect(invoice.row).toBeDefined();
    expect(invoice.card).toBeDefined();
    expect(viewsOf(LINE_ITEM_ANNOTATION).row).toBeDefined();
    const lineItems = viewFields(invoice.default).find(
      (f) =>
        typeof f === "object" &&
        f !== null &&
        "name" in f &&
        (f as { name?: string }).name === "lineItems",
    ) as { display?: { view?: string } } | undefined;
    expect(lineItems?.display?.view).toBe("row");
  });

  test("defs.phoneEntry value carries widget:tel", () => {
    const phoneSchema = (CONTACT_CARD_SCHEMA.$defs as Record<string, Schema>)
      .phoneEntry!;
    const fields = listFields({
      schema: phoneSchema,
      annotation: CONTACT_ANNOTATION,
      coordinate: {
        subject: `${CONTACT_CARD_ID}#/$defs/phoneEntry`,
        path: [],
      },
      mode: "display",
      view: "default",
    });
    const value = fields.find((f) => f.kind === "field" && f.key === "value");
    expect(value?.kind).toBe("field");
    if (value?.kind !== "field") return;
    expect(value.entry?.widget?.name).toBe("tel");
  });

  test("external-reference id carries widget:copy", () => {
    // Schema loaded via seed map — only need property names for listFields.
    const schema: Schema = {
      $id: EXTERNAL_REFERENCE_ID,
      type: "object",
      properties: {
        id: { type: "string" },
        system: { type: "string" },
        label: { type: "string" },
        url: { type: "string", format: "uri" },
        publiclyAccessible: { type: "boolean" },
      },
    };
    const fields = listFields({
      schema,
      annotation: EXTERNAL_REFERENCE_ANNOTATION,
      coordinate: { subject: EXTERNAL_REFERENCE_ID, path: [] },
      mode: "display",
      view: "default",
    });
    const id = fields.find((f) => f.kind === "field" && f.key === "id");
    expect(id?.kind).toBe("field");
    if (id?.kind !== "field") return;
    expect(id.entry?.widget?.name).toBe("copy");
  });
});
