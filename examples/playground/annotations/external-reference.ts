/**
 * External reference — foreign system id: system + copyable id.
 * Nested under contact via `display.view: "row"`.
 * Product display uses the link widget on the array instead.
 */
import type { AnnotationDocument } from "@rusl-labs/surface";
import { EXTERNAL_REFERENCE_ID } from "../../../tests/fixtures/pragmatic-seeds.ts";
import { ANNOTATION_SCHEMA, TARGET_HTML } from "./shared.ts";

export const EXTERNAL_REFERENCE_ANNOTATION: AnnotationDocument = {
  $schema: ANNOTATION_SCHEMA,
  subject: EXTERNAL_REFERENCE_ID,
  targetLibraries: [...TARGET_HTML],
  views: {
    /** Full small form — Display: system + copy id; Input: labeled fields. */
    default: {
      label: "",
      layout: "stack",
      fields: [
        {
          kind: "span",
          template: "{{system}}",
          input: { omit: true },
        },
        {
          name: "id",
          label: "Id",
          widget: { name: "copy" },
          display: { label: "" },
        },
        { name: "system", label: "System", display: { omit: true } },
        { name: "label", label: "Label", display: { omit: true } },
        {
          name: "url",
          label: "URL",
          widget: { name: "link" },
          display: { omit: true },
        },
        {
          name: "publiclyAccessible",
          label: "Public",
          display: { omit: true },
        },
        { name: "$kind", hidden: true },
      ],
      rest: "omit",
    },

    /** Nested list scan — system + copyable id on one line. */
    row: {
      label: "",
      layout: "stack",
      direction: "horizontal",
      fields: [
        { kind: "span", template: "{{system}}" },
        {
          name: "id",
          label: "",
          widget: { name: "copy" },
        },
      ],
      rest: "omit",
    },
  },
};

/** Standalone playground seed (also embedded under contact / product). */
export const EXTERNAL_REFERENCE_SAMPLE = {
  $kind: EXTERNAL_REFERENCE_ID,
  system: "salesforce",
  id: "003xx000004TmiQ",
  label: "CRM contact",
  url: "https://example.com/salesforce/003xx000004TmiQ",
  publiclyAccessible: false,
} as const;
