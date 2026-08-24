import { describe, expect, test } from "bun:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  listFields,
  resolveAnnotationEntry,
  type AnnotationDocument,
  type Schema,
} from "../../packages/core/src/index.ts";
import {
  CONTACT_CARD,
  CONTACT_DATA,
  CONTACT_SCHEMA,
  WALKTHROUGH_ANNOTATION,
} from "../fixtures/contact-card.ts";
import {
  PERSON,
  PERSON_SCHEMA,
  fieldByName,
  names,
} from "./helpers-fields-support.ts";

const here = dirname(fileURLToPath(import.meta.url));
const formatSchema = JSON.parse(
  readFileSync(
    join(here, "../../docs/annotation-format.schema.json"),
    "utf8",
  ),
) as object;

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateAnnotation = ajv.compile(formatSchema);

describe("helpers.fields", () => {
  test("walkthrough fixture validates against annotation-format.schema.json", () => {
    expect(validateAnnotation(WALKTHROUGH_ANNOTATION)).toBe(true);
  });

  test("addLabel is valid decoration on a bound array field", () => {
    expect(
      validateAnnotation({
        subject: PERSON,
        views: {
          default: {
            fields: [
              {
                name: "email",
                itemLabel: "address",
                addLabel: "Add another",
              },
            ],
          },
        },
      }),
    ).toBe(true);
  });

  test("no annotation yields schema property order (kit defaults)", () => {
    const fields = listFields({
      schema: PERSON_SCHEMA,
      mode: "input",
      view: "default",
    });
    expect(names(fields)).toEqual(["name", "title", "email", "secret", "note"]);
    expect(fields.every((f) => f.kind === "field")).toBe(true);
  });

  test("empty / unknown view degrades through default then kit defaults", () => {
    const empty: AnnotationDocument = {
      subject: PERSON,
      views: { default: { fields: [{ name: "name" }], rest: "omit" } },
    };
    // named view missing → default layout
    expect(
      names(
        listFields({
          schema: PERSON_SCHEMA,
          annotation: empty,
          coordinate: { subject: PERSON, path: [] },
          mode: "input",
          view: "poster",
        }),
      ),
    ).toEqual(["name"]);

    const noViews: AnnotationDocument = { subject: PERSON, defs: { x: { views: { default: { fields: [{ name: "a" }] } } } } };
    expect(
      names(
        listFields({
          schema: PERSON_SCHEMA,
          annotation: noViews,
          coordinate: { subject: PERSON, path: [] },
          mode: "input",
          view: "default",
        }),
      ),
    ).toEqual(["name", "title", "email", "secret", "note"]);
  });

  test("entry order wins over schema order", () => {
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [
            { name: "email", label: "Work email" },
            { name: "name", label: "Full name" },
          ],
          rest: "omit",
        },
      },
    };
    const fields = listFields({
      schema: PERSON_SCHEMA,
      annotation,
      coordinate: { subject: PERSON, path: [] },
      mode: "input",
      view: "default",
    });
    expect(names(fields)).toEqual(["email", "name"]);
    expect(fieldByName(fields, "email").label).toBe("Work email");
    expect(fieldByName(fields, "name").label).toBe("Full name");
  });

  test("rest defaults to append and places unlisted properties in schema order", () => {
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [{ name: "email" }, { name: "name" }],
        },
      },
    };
    expect(
      names(
        listFields({
          schema: PERSON_SCHEMA,
          annotation,
          coordinate: { subject: PERSON, path: [] },
          mode: "input",
          view: "default",
        }),
      ),
    ).toEqual(["email", "name", "title", "secret", "note"]);
  });

  test('rest: "omit" drops unlisted properties', () => {
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [{ name: "name" }, { name: "email" }],
          rest: "omit",
        },
      },
    };
    expect(
      names(
        listFields({
          schema: PERSON_SCHEMA,
          annotation,
          coordinate: { subject: PERSON, path: [] },
          mode: "input",
          view: "default",
        }),
      ),
    ).toEqual(["name", "email"]);
  });

  test("rest slot places unlisted properties at the slot", () => {
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [
            { name: "name" },
            { rest: true },
            { name: "email" },
          ],
          rest: "append",
        },
      },
    };
    expect(
      names(
        listFields({
          schema: PERSON_SCHEMA,
          annotation,
          coordinate: { subject: PERSON, path: [] },
          mode: "input",
          view: "default",
        }),
      ),
    ).toEqual(["name", "title", "secret", "note", "email"]);
  });

  test("omit is not yielded; hidden is yielded flagged", () => {
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [
            { name: "name" },
            { name: "secret", omit: true },
            { name: "note", hidden: true },
          ],
          rest: "omit",
        },
      },
    };
    const fields = listFields({
      schema: PERSON_SCHEMA,
      annotation,
      coordinate: { subject: PERSON, path: [] },
      mode: "input",
      view: "default",
    });
    expect(names(fields)).toEqual(["name", "note"]);
    expect(fieldByName(fields, "note").hidden).toBe(true);
    expect(fieldByName(fields, "name").hidden).toBeFalsy();
  });

  test("named view replaces layout; decoration merges by entry identity from default", () => {
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [
            { name: "name", label: "Full name" },
            { name: "email", label: "Work email", widget: { name: "email" } },
            { name: "title", label: "Job title" },
          ],
        },
        card: {
          fields: [{ name: "name" }, { name: "email" }],
          rest: "omit",
        },
      },
    };
    const fields = listFields({
      schema: PERSON_SCHEMA,
      annotation,
      coordinate: { subject: PERSON, path: [] },
      mode: "input",
      view: "card",
    });
    expect(names(fields)).toEqual(["name", "email"]);
    expect(fieldByName(fields, "name").label).toBe("Full name");
    expect(fieldByName(fields, "email").label).toBe("Work email");
    expect(fieldByName(fields, "email").entry?.widget).toEqual({ name: "email" });
  });

  test("null clears an inherited decoration key", () => {
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [{ name: "name", label: "Full name" }],
        },
        card: {
          fields: [{ name: "name", label: null }],
          rest: "omit",
        },
      },
    };
    const fields = listFields({
      schema: PERSON_SCHEMA,
      annotation,
      coordinate: { subject: PERSON, path: [] },
      mode: "input",
      view: "card",
    });
    // cleared → falls back to property name
    expect(fieldByName(fields, "name").label).toBe("name");
  });

  test("mode sub-entries merge decoration per key", () => {
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [
            {
              name: "email",
              label: "Email",
              input: { widget: { name: "email" } },
              display: { label: "Mail" },
            },
          ],
          rest: "omit",
        },
      },
    };
    const input = listFields({
      schema: PERSON_SCHEMA,
      annotation,
      coordinate: { subject: PERSON, path: [] },
      mode: "input",
      view: "default",
    });
    expect(fieldByName(input, "email").label).toBe("Email");
    expect(fieldByName(input, "email").entry?.widget).toEqual({ name: "email" });

    const display = listFields({
      schema: PERSON_SCHEMA,
      annotation,
      coordinate: { subject: PERSON, path: [] },
      mode: "display",
      view: "default",
    });
    expect(fieldByName(display, "email").label).toBe("Mail");
    expect(fieldByName(display, "email").entry?.widget).toBeUndefined();
  });

  test("sections yield as sections; field order is nested children", () => {
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [
            {
              label: "Who",
              fields: [
                { name: "name", label: "Full name" },
                { name: "title" },
              ],
            },
            { name: "email" },
          ],
          rest: "omit",
        },
      },
    };
    const fields = listFields({
      schema: PERSON_SCHEMA,
      annotation,
      coordinate: { subject: PERSON, path: [] },
      mode: "input",
      view: "default",
    });
    expect(fields.map((f) => f.kind)).toEqual(["section", "field"]);
    expect(fields[0]).toMatchObject({ kind: "section", label: "Who" });
    expect(names(fields)).toEqual(["name", "title", "email"]);
    expect(fieldByName(fields, "name").label).toBe("Full name");
  });

  test("bound field surface bag carries id, schema, data, mode, view, coordinate", () => {
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [{ name: "email", view: "compact" }],
          rest: "omit",
        },
      },
    };
    const fields = listFields({
      schema: PERSON_SCHEMA,
      data: { email: "a@b.test" },
      annotation,
      coordinate: { subject: PERSON, path: [] },
      mode: "display",
      view: "default",
      document: PERSON_SCHEMA,
      documentUri: PERSON,
    });
    const email = fieldByName(fields, "email");
    expect(email.surface).toMatchObject({
      id: "email",
      schema: { type: "string", format: "email" },
      data: "a@b.test",
      mode: "display",
      view: "compact",
      coordinate: { subject: PERSON, path: ["email"] },
      documentUri: PERSON,
    });
  });

  test("walkthrough default view: field order, labels, hidden, rest append", () => {
    const fields = listFields({
      schema: CONTACT_SCHEMA,
      data: CONTACT_DATA,
      annotation: WALKTHROUGH_ANNOTATION,
      coordinate: { subject: CONTACT_CARD, path: [] },
      mode: "input",
      view: "default",
      document: CONTACT_SCHEMA,
      documentUri: CONTACT_CARD,
    });
    expect(fields.map((f) => f.kind)).toEqual([
      "section",
      "section",
      "field",
      "template",
      "field",
      "field",
    ]);
    expect(fields[0]).toMatchObject({ kind: "section", label: "Identity" });
    expect(fields[1]).toMatchObject({ kind: "section", label: "Reach" });
    expect(fields[3]).toMatchObject({
      kind: "template",
      text: "Member since 1998-03-14",
    });
    expect(names(fields)).toEqual([
      "name",
      "organization",
      "emails",
      "phones",
      "metadata",
      "title",
      "createdAt",
    ]);
    expect(fieldByName(fields, "name").label).toBe("Full name");
    expect(fieldByName(fields, "organization").label).toBe("Company");
    expect(fieldByName(fields, "metadata").hidden).toBe(true);
    expect(fieldByName(fields, "emails").entry?.widget).toEqual({ name: "email" });
    expect(fieldByName(fields, "phones").surface.view).toBe("compact");
  });

  test("walkthrough card view: rest omit + inherited labels", () => {
    const fields = listFields({
      schema: CONTACT_SCHEMA,
      data: CONTACT_DATA,
      annotation: WALKTHROUGH_ANNOTATION,
      coordinate: { subject: CONTACT_CARD, path: [] },
      mode: "input",
      view: "card",
    });
    expect(names(fields)).toEqual(["name", "organization", "emails"]);
    expect(fieldByName(fields, "name").label).toBe("Full name");
    expect(fieldByName(fields, "organization").label).toBe("Company");
  });

  test("defs.<name> view drives layout at a def-scoped coordinate", () => {
    const phoneSchema = (CONTACT_SCHEMA.$defs as Record<string, Schema>)
      .phoneEntry!;
    const fields = listFields({
      schema: phoneSchema,
      data: { value: "+1", kind: "work", extension: "9" },
      annotation: WALKTHROUGH_ANNOTATION,
      coordinate: {
        subject: `${CONTACT_CARD}#/$defs/phoneEntry`,
        path: [],
      },
      mode: "input",
      view: "compact",
    });
    expect(names(fields)).toEqual(["value", "kind"]);
    expect(fieldByName(fields, "value").label).toBe("Number");
    expect(fieldByName(fields, "kind").label).toBe("Type");
  });

  test("name matching no property is ignored", () => {
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [{ name: "ghost" }, { name: "name" }],
          rest: "omit",
        },
      },
    };
    expect(
      names(
        listFields({
          schema: PERSON_SCHEMA,
          annotation,
          coordinate: { subject: PERSON, path: [] },
          mode: "input",
          view: "default",
        }),
      ),
    ).toEqual(["name"]);
  });

  test("use-site chrome on a $ref entry wins over target view label", () => {
    const schema: Schema = {
      $id: PERSON,
      type: "object",
      properties: {
        phone: { $ref: "#/$defs/phone" },
      },
      $defs: {
        phone: { type: "string", title: "Phone schema title" },
      },
    };
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [{ name: "phone", label: "Mobile", hidden: true }],
          rest: "omit",
        },
      },
      defs: {
        phone: {
          views: { default: { label: "Phone from def view" } },
        },
      },
    };
    const fields = listFields({
      schema,
      annotation,
      coordinate: { subject: PERSON, path: [] },
      mode: "input",
      view: "default",
    });
    expect(fieldByName(fields, "phone").label).toBe("Mobile");
    expect(fieldByName(fields, "phone").hidden).toBe(true);
    expect(fieldByName(fields, "phone").entry?.hidden).toBe(true);
  });

  test("nested bound entry fields drive the child object's layout", () => {
    const schema: Schema = {
      $id: PERSON,
      type: "object",
      properties: {
        address: {
          type: "object",
          properties: {
            street: { type: "string" },
            city: { type: "string" },
            zip: { type: "string" },
          },
        },
      },
    };
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [
            {
              name: "address",
              fields: [
                { name: "city", label: "Town" },
                { name: "street", label: "Street" },
              ],
              rest: "omit",
            },
          ],
          rest: "omit",
        },
      },
    };
    const addressSchema = (schema.properties as Record<string, Schema>)
      .address!;
    const fields = listFields({
      schema: addressSchema,
      annotation,
      coordinate: { subject: PERSON, path: ["address"] },
      mode: "input",
      view: "default",
    });
    expect(names(fields)).toEqual(["city", "street"]);
    expect(fieldByName(fields, "city").label).toBe("Town");
  });

  test("internal $ref field re-roots coordinate to defs scope", () => {
    const schema: Schema = {
      $id: PERSON,
      type: "object",
      properties: {
        phone: { $ref: "#/$defs/phone" },
      },
      $defs: {
        phone: {
          type: "object",
          properties: {
            value: { type: "string" },
            kind: { type: "string" },
          },
        },
      },
    };
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [{ name: "phone", view: "compact" }],
          rest: "omit",
        },
      },
      defs: {
        phone: {
          views: {
            compact: {
              fields: [{ name: "value", label: "Number" }],
              rest: "omit",
            },
          },
        },
      },
    };
    const parent = listFields({
      schema,
      annotation,
      coordinate: { subject: PERSON, path: [] },
      mode: "input",
      view: "default",
      documentUri: PERSON,
    });
    const phone = fieldByName(parent, "phone");
    expect(phone.surface.coordinate).toEqual({
      subject: `${PERSON}#/$defs/phone`,
      path: [],
    });
    expect(phone.surface.view).toBe("compact");

    const nested = listFields({
      schema: (schema.$defs as Record<string, Schema>).phone!,
      annotation,
      coordinate: phone.surface.coordinate!,
      mode: "input",
      view: phone.surface.view ?? "default",
    });
    expect(names(nested)).toEqual(["value"]);
    expect(fieldByName(nested, "value").label).toBe("Number");
  });

  test("rest slot inside a transparent section still places unlisted fields", () => {
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [
            {
              label: "Main",
              fields: [{ name: "name" }, { rest: true }],
            },
            { name: "email" },
          ],
          rest: "append",
        },
      },
    };
    expect(
      names(
        listFields({
          schema: PERSON_SCHEMA,
          annotation,
          coordinate: { subject: PERSON, path: [] },
          mode: "input",
          view: "default",
        }),
      ),
    ).toEqual(["name", "title", "secret", "note", "email"]);
  });

  test("ref-label falls back use-site → target view label → schema title → name", () => {
    const schema: Schema = {
      $id: PERSON,
      type: "object",
      properties: {
        phone: { $ref: "#/$defs/phone", title: "Wrapper title" },
      },
      $defs: {
        phone: { type: "string", title: "Phone schema title" },
      },
    };
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [{ name: "phone" }],
          rest: "omit",
        },
      },
      defs: {
        phone: {
          views: { default: { label: "Phone from def view" } },
        },
      },
    };
    expect(
      fieldByName(
        listFields({
          schema,
          annotation,
          coordinate: { subject: PERSON, path: [] },
          mode: "input",
          view: "default",
        }),
        "phone",
      ).label,
    ).toBe("Phone from def view");

    // no target view label → $ref wrapper title (use-site schema node)
    const bare: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: { fields: [{ name: "phone" }], rest: "omit" },
      },
    };
    expect(
      fieldByName(
        listFields({
          schema,
          annotation: bare,
          coordinate: { subject: PERSON, path: [] },
          mode: "input",
          view: "default",
        }),
        "phone",
      ).label,
    ).toBe("Wrapper title");

    // no titles either → property name
    const untitled: Schema = {
      $id: PERSON,
      type: "object",
      properties: { phone: { $ref: "#/$defs/phone" } },
      $defs: { phone: { type: "string" } },
    };
    expect(
      fieldByName(
        listFields({
          schema: untitled,
          annotation: bare,
          coordinate: { subject: PERSON, path: [] },
          mode: "input",
          view: "default",
        }),
        "phone",
      ).label,
    ).toBe("phone");
  });
});

describe("resolveAnnotationEntry", () => {
  test("resolves the entry at a coordinate path with mode merge", () => {
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: {
        default: {
          fields: [
            {
              name: "email",
              label: "Email",
              widget: { name: "email" },
              input: { label: "Edit email" },
            },
          ],
        },
      },
    };
    const entry = resolveAnnotationEntry({
      annotation,
      coordinate: { subject: PERSON, path: ["email"] },
      view: "default",
      mode: "input",
    });
    expect(entry).toEqual({
      label: "Edit email",
      widget: { name: "email" },
    });
  });

  test("root path has no bound entry", () => {
    const annotation: AnnotationDocument = {
      subject: PERSON,
      views: { default: { fields: [{ name: "name" }] } },
    };
    expect(
      resolveAnnotationEntry({
        annotation,
        coordinate: { subject: PERSON, path: [] },
        view: "default",
        mode: "input",
      }),
    ).toBeUndefined();
  });
});
