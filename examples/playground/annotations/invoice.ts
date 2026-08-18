/**
 * Invoice — default / row / card. No identity.
 *
 * Density:
 * - row — INV · status · $total (scan line)
 * - card — number + status + due + total
 * - default Display — header, quiet line-item rows, totals as props
 * - default Input — labeled edit form
 *
 * Do not list the same `name` twice in one view: decorationMap keeps the last
 * entry, so a later `display: { omit: true }` would kill the earlier mount.
 */
import type { AnnotationDocument } from "@rusl-labs/surface";
import { BILLING_INVOICE_ID } from "../../../tests/fixtures/pragmatic-seeds.ts";
import { ANNOTATION_SCHEMA, TARGET_HTML } from "./shared.ts";

export const INVOICE_ANNOTATION: AnnotationDocument = {
  $schema: ANNOTATION_SCHEMA,
  subject: BILLING_INVOICE_ID,
  targetLibraries: [...TARGET_HTML],
  views: {
    default: {
      label: "",
      layout: "stack",
      fields: [
        // Display header (not an on-canvas "INVOICE" title)
        {
          kind: "banner",
          template: "{{number}}",
          input: { omit: true },
        },
        {
          kind: "span",
          template: "{{status}}",
          input: { omit: true },
        },
        // Input-only counterparts — one mount each (display omit)
        {
          name: "number",
          label: "Number",
          widget: { name: "copy" },
          display: { omit: true },
        },
        { name: "status", label: "Status", display: { omit: true } },
        // One mount per date field. Display: muted "Issued … · Due …".
        // Input: span chrome omits; fields keep Issued/Due labels.
        {
          label: "",
          layout: "stack",
          direction: "horizontal",
          fields: [
            { kind: "span", template: "Issued", input: { omit: true } },
            {
              name: "issuedAt",
              label: "Issued",
              widget: { name: "datetime" },
              display: { label: "" },
            },
            { kind: "span", template: "· Due", input: { omit: true } },
            {
              name: "dueAt",
              label: "Due",
              widget: { name: "datetime" },
              display: { label: "" },
            },
          ],
        },
        {
          name: "lineItems",
          label: "Line items",
          itemLabel: "Line",
          // Nested absolute `$ref` → commerce.line-item `row` in Display.
          // Input keeps labeled section + Add Line chrome.
          display: { view: "row", label: "" },
        },
        {
          // props = quiet label|amount rows (money $id → pretty; no canonical dump)
          label: "",
          layout: "props",
          fields: [
            { name: "subtotal", label: "Subtotal" },
            { name: "taxTotal", label: "Tax" },
            { name: "discountTotal", label: "Discount", display: { omit: true } },
            { name: "total", label: "Total" },
            { name: "amountPaid", label: "Paid", display: { omit: true } },
            { name: "amountDue", label: "Amount due", display: { omit: true } },
          ],
        },
        {
          name: "billingAddress",
          label: "Bill to",
          display: { omit: true },
        },
        {
          name: "settlements",
          label: "Settlements",
          display: { omit: true },
        },
        {
          name: "externalReferences",
          label: "External refs",
          display: { omit: true },
        },
      ],
      rest: "omit",
    },

    /** List scan — number · status · $total only. */
    row: {
      label: "",
      layout: "stack",
      direction: "horizontal",
      fields: [
        { kind: "banner", template: "{{number}}" },
        { kind: "span", template: "{{status}}" },
        { name: "total", label: "" },
      ],
      rest: "omit",
    },

    /** Preview tile — number + status + due + total. */
    card: {
      label: "",
      layout: "stack",
      fields: [
        { kind: "banner", template: "{{number}}" },
        {
          label: "",
          layout: "stack",
          direction: "horizontal",
          fields: [
            { kind: "span", template: "{{status}} · Due" },
            {
              name: "dueAt",
              label: "",
              widget: { name: "datetime" },
            },
          ],
        },
        { name: "total", label: "" },
      ],
      rest: "omit",
    },
  },
};
