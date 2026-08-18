import { describe, expect, test } from "bun:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  listFields,
  type AnnotationDocument,
  type Schema,
} from "../../packages/core/src/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const formatSchema = JSON.parse(
  readFileSync(
    join(here, "../../docs/annotation-format.schema.json"),
    "utf8",
  ),
) as object;

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateAnnotation = ajv.compile(formatSchema);

const PERSON = "https://example.test/person";
const PERSON_SCHEMA: Schema = {
  $id: PERSON,
  type: "object",
  properties: {
    name: { type: "string" },
    title: { type: "string" },
    email: { type: "string", format: "email" },
    secret: { type: "string" },
    note: { type: "string" },
  },
};

describe("structural chrome + targetLibraries", () => {
  test("document with targetLibraries and block/banner/span validates", () => {
    const doc: AnnotationDocument = {
      subject: PERSON,
      targetLibraries: ["@rusl-labs/surface-html"],
      views: {
        default: {
          fields: [
            {
              kind: "banner",
              label: "Hero",
              template: "{{name}}",
            },
            {
              kind: "block",
              label: "Identity",
              fields: [{ name: "name" }, { name: "title" }],
            },
            { kind: "span", template: "{{email}}" },
            { name: "email" },
          ],
        },
        identity: {
          fields: [{ name: "name" }, { name: "title" }],
          rest: "omit",
        },
        row: {
          direction: "horizontal",
          layout: "stack",
          fields: [{ name: "name" }, { name: "email" }],
          rest: "omit",
        },
        card: {
          layout: "stack",
          fields: [
            { kind: "block", fields: [{ name: "name" }] },
            { name: "email" },
          ],
          rest: "omit",
        },
      },
    };
    expect(validateAnnotation(doc)).toBe(true);
  });

  test("listFields yields block, banner, and span children", () => {
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [
            { kind: "banner", template: "Hello {{name}}" },
            {
              kind: "block",
              label: "Who",
              fields: [{ name: "name" }],
            },
            { kind: "span", template: "{{title}}" },
          ],
          rest: "omit",
        },
      },
    };
    const fields = listFields({
      schema: PERSON_SCHEMA,
      data: { name: "Ada", title: "Analyst" },
      annotation,
      coordinate: { subject: PERSON, path: [] },
      mode: "display",
      view: "default",
    });
    expect(fields.map((f) => f.kind)).toEqual(["banner", "block", "span"]);
    const banner = fields[0]!;
    expect(banner.kind).toBe("banner");
    if (banner.kind === "banner") {
      expect(banner.text).toBe("Hello Ada");
    }
    const block = fields[1]!;
    expect(block.kind).toBe("block");
    if (block.kind === "block") {
      expect(block.label).toBe("Who");
      expect(block.children().map((c) => c.kind)).toEqual(["field"]);
    }
  });
});
