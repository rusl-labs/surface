import type {
  AnnotationDocument,
  Schema,
} from "../../packages/core/src/index.ts";

/** The walkthrough playground's subject, schema and data. */
export const CONTACT_CARD = "https://example.test/schemas/contact.card";

export const CONTACT_SCHEMA: Schema = {
  $id: CONTACT_CARD,
  type: "object",
  title: "Contact card",
  properties: {
    name: { type: "string" },
    title: { type: "string" },
    organization: { type: "string" },
    emails: { type: "array", items: { type: "string", format: "email" } },
    phones: { type: "array", items: { $ref: "#/$defs/phoneEntry" } },
    metadata: { type: "string" },
    createdAt: { type: "string", format: "date" },
  },
  $defs: {
    phoneEntry: {
      type: "object",
      title: "Phone entry",
      properties: {
        value: { type: "string" },
        kind: { type: "string" },
        extension: { type: "string" },
      },
    },
  },
};

export const CONTACT_DATA = {
  name: "Ada Lovelace",
  title: "Analyst",
  organization: "Analytical Engines Ltd",
  emails: ["ada@aengines.example"],
  createdAt: "1998-03-14",
  phones: [{ value: "+44 20 7946 0018", kind: "work", extension: "12" }],
  metadata: "internal-7f3a",
};

/** The playground's annotation document, verbatim. */
export const WALKTHROUGH_ANNOTATION: AnnotationDocument = {
  $kind:
    "https://resources.rusl.com/resources/rusl/schemas/surface.annotation",
  subject: CONTACT_CARD,
  views: {
    default: {
      label: "Contact card",
      description: "How this person shows up — identity, reach, membership.",
      fields: [
        {
          label: "Identity",
          description: "Who they are on paper.",
          fields: [
            { name: "name", label: "Full name" },
            { name: "organization", label: "Company" },
          ],
        },
        {
          label: "Reach",
          description: "How to get hold of them.",
          fields: [
            {
              name: "emails",
              label: "Email addresses",
              itemLabel: "Email",
              widget: { name: "email" },
            },
            { name: "phones", label: "Phone numbers", itemLabel: "Phone", view: "compact" },
          ],
        },
        { name: "metadata", hidden: true },
        { template: "Member since {{createdAt}}" },
      ],
      rest: "append",
    },
    card: {
      label: "Contact",
      fields: [
        { name: "name" },
        { name: "organization" },
        { name: "emails" },
      ],
      rest: "omit",
    },
  },
  defs: {
    phoneEntry: {
      views: {
        compact: {
          fields: [
            { name: "value", label: "Number" },
            { name: "kind", label: "Type" },
          ],
          rest: "omit",
        },
      },
    },
  },
};
