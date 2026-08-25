/**
 * Social/messaging handle — nested under contact; also a playground subject.
 * Quiet chrome: no screaming schema title inside contact arrays.
 *
 * - default Display: calm `platform · @handle` + optional link
 * - default Input: labeled platform / handle / url
 * - row: one-line scan for contact socialHandles (view: "row")
 * identity/card omitted — no distinct job beyond default/row.
 */
import type { AnnotationDocument } from "@rusl-labs/surface";
import { CONTACT_SOCIAL_HANDLE_ID } from "../../../tests/fixtures/pragmatic-seeds.ts";
import { ANNOTATION_KIND, TARGET_HTML } from "./shared.ts";

export const SOCIAL_HANDLE_ANNOTATION: AnnotationDocument = {
  $kind: ANNOTATION_KIND,
  subject: CONTACT_SOCIAL_HANDLE_ID,
  targetLibraries: [...TARGET_HTML],
  views: {
    default: {
      label: "",
      layout: "stack",
      fields: [
        // Display: one readable line (not a labeled twin of Input).
        {
          kind: "span",
          template: "{{platform}} · @{{handle}}",
          input: { omit: true },
        },
        // Input: labeled edit fields (display uses the span above).
        { name: "platform", label: "Platform", display: { omit: true } },
        { name: "handle", label: "Handle", display: { omit: true } },
        {
          name: "url",
          label: "URL",
          widget: { name: "link" },
          display: { label: "" },
        },
        { name: "platformId", label: "Platform id", display: { omit: true } },
        { name: "contexts", label: "Roles", display: { omit: true } },
        { name: "preference", omit: true },
        { name: "metadata", omit: true },
        { name: "$kind", hidden: true },
      ],
      rest: "omit",
    },
    /** Nested scan under contact — one horizontal line. */
    row: {
      label: "",
      layout: "stack",
      direction: "horizontal",
      fields: [
        { kind: "span", template: "{{platform}} · @{{handle}}" },
      ],
      rest: "omit",
    },
  },
};
