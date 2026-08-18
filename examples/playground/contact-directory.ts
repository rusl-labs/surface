/**
 * Local playground subject: an object with one `contacts` array so the
 * table widget can sit on that field. Not a Rusl schema.
 */
import type { AnnotationDocument, Schema } from "@rusl-labs/surface";
import { DEFAULT_KIT_TABLE } from "../../packages/html/src/default-kit.ts";
import {
  CONTACT_CARD_ID,
  CONTACT_CARD_SAMPLE,
} from "../../tests/fixtures/pragmatic-seeds.ts";
import { ANNOTATION_SCHEMA, TARGET_HTML } from "./annotations/shared.ts";

export const CONTACT_DIRECTORY_ID =
  "https://example.test/schemas/contact.directory";

export const CONTACT_DIRECTORY_SCHEMA: Schema = {
  $id: CONTACT_DIRECTORY_ID,
  title: "Contact directory",
  type: "object",
  additionalProperties: false,
  required: ["contacts"],
  properties: {
    contacts: {
      type: "array",
      items: { $ref: CONTACT_CARD_ID },
    },
  },
};

export const CONTACT_DIRECTORY_SAMPLE = {
  contacts: [
    CONTACT_CARD_SAMPLE,
    {
      $kind: CONTACT_CARD_ID,
      kind: "individual",
      name: "Sam Rivera",
      title: "Staff Engineer",
      organization: "Globex",
      emails: [{ value: "sam@globex.example", contexts: ["work"] }],
      phones: [{ value: "+14155550199", kind: "work" }],
    },
    {
      $kind: CONTACT_CARD_ID,
      kind: "individual",
      name: "Aiko Tanaka",
      title: "Design Lead",
      organization: "Acme Corp",
      emails: [{ value: "aiko@acme.example", contexts: ["work"] }],
      phones: [{ value: "+81312345678", kind: "work" }],
    },
    {
      $kind: CONTACT_CARD_ID,
      kind: "organization",
      name: "Northwind Labs",
      title: "",
      organization: "Northwind Labs",
    },
  ],
};

export const CONTACT_DIRECTORY_ANNOTATION: AnnotationDocument = {
  $schema: ANNOTATION_SCHEMA,
  subject: CONTACT_DIRECTORY_ID,
  targetLibraries: [...TARGET_HTML],
  views: {
    default: {
      label: "",
      fields: [
        {
          name: "contacts",
          label: "",
          widget: {
            name: "table",
            $kind: DEFAULT_KIT_TABLE,
            columns: [
              {
                field: "name",
                label: "Name",
                sortable: true,
                fontWeight: 600,
              },
              { field: "title", label: "Title", sortable: true },
              {
                field: "organization",
                label: "Company",
                sortable: true,
                align: "right",
              },
            ],
          },
        },
      ],
      rest: "omit",
    },
  },
};
