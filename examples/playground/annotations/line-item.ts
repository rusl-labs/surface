/**
 * commerce.line-item — absolute `$ref` subject (not items.fields).
 *
 * Views: default + row only (no identity / card).
 * - default — labeled edit; readable name, qty, amounts
 * - row — compact `name · qty · $` for invoice Display nest
 *
 * Money pretty via pragmatic money `$id` takeover (not a widget kind).
 * Row is not a list owner — never mounts array chrome.
 */
import type { AnnotationDocument } from "@rusl-labs/surface";
import { COMMERCE_LINE_ITEM_ID } from "../../../tests/fixtures/pragmatic-seeds.ts";
import { ANNOTATION_KIND, TARGET_HTML } from "./shared.ts";

export const LINE_ITEM_ANNOTATION: AnnotationDocument = {
  $kind: ANNOTATION_KIND,
  subject: COMMERCE_LINE_ITEM_ID,
  targetLibraries: [...TARGET_HTML],
  views: {
    default: {
      label: "",
      layout: "stack",
      fields: [
        { name: "name", label: "Name" },
        { name: "quantity", label: "Quantity" },
        { name: "unitAmount", label: "Unit amount" },
        { name: "amount", label: "Amount" },
        { name: "description", label: "Description", omit: true },
        { name: "taxAmount", omit: true },
        { name: "discountAmount", omit: true },
        { name: "productId", omit: true },
        { name: "priceId", omit: true },
        { name: "externalReferences", omit: true },
        { name: "metadata", omit: true },
        { name: "$kind", hidden: true },
      ],
      rest: "omit",
    },

    /** Nested invoice scan line — name · qty · $amount. */
    row: {
      label: "",
      layout: "stack",
      direction: "horizontal",
      fields: [
        { kind: "span", template: "{{name}}" },
        { kind: "span", template: "·" },
        { kind: "span", template: "{{quantity}}" },
        { kind: "span", template: "·" },
        { name: "amount", label: "" },
      ],
      rest: "omit",
    },
  },
};
