import { describe, expect, test } from "bun:test";
import { listFields, type AnnotationDocument, type Schema } from "../../packages/core/src/index.ts";

const PERSON = "https://example.test/person";

function names(fields: ReturnType<typeof listFields>): string[] {
  return fields.filter((f) => f.kind === "field").map((f) => f.surface.id);
}

describe("helpers.fields nested layout", () => {
  test("nested object without its own fields uses schema order, not the parent view", () => {
    const schema: Schema = {
      $id: PERSON,
      type: "object",
      properties: {
        name: { type: "string" },
        organization: { type: "string" },
        nameComponents: {
          type: "object",
          properties: {
            given: { type: "string" },
            family: { type: "string" },
          },
        },
      },
    };
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [
            { kind: "banner", template: "{{name}} · {{organization}}" },
            { name: "name" },
            { name: "organization" },
          ],
          rest: "append",
        },
      },
    };
    const nestedSchema = (schema.properties as Record<string, Schema>)
      .nameComponents!;
    const fields = listFields({
      schema: nestedSchema,
      data: { given: "Jane", family: "Doe" },
      annotation,
      coordinate: { subject: PERSON, path: ["nameComponents"] },
      mode: "display",
      view: "default",
    });
    expect(fields.filter((f) => f.kind === "banner")).toEqual([]);
    expect(names(fields)).toEqual(["given", "family"]);
  });
});
