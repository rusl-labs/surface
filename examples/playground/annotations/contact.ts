/**
 * Contact card — identity / row / card / default.
 *
 * Density ladder (Display):
 * - identity — who (banner + muted title/org; no channels)
 * - row — who + role + phone (list scan; no Input array chrome)
 * - card — who + role/org + email + phone (preview tile)
 * - default — full read / edit form
 *
 * Nested Display mounts: address→card, external-ref→row, social→row.
 * `$ref` array widgets live on `defs.*`, not `items.fields`.
 * Mode overrides: Display is calm read, not a labeled twin of Input.
 */
import type { AnnotationDocument } from "@rusl-labs/surface";
import { CONTACT_CARD_ID } from "../../../tests/fixtures/pragmatic-seeds.ts";
import { ANNOTATION_KIND, TARGET_HTML } from "./shared.ts";

export const CONTACT_ANNOTATION: AnnotationDocument = {
  $kind: ANNOTATION_KIND,
  subject: CONTACT_CARD_ID,
  targetLibraries: [...TARGET_HTML],
  views: {
    default: {
      label: "",
      layout: "stack",
      fields: [
        // Display lede — Input uses labeled fields below.
        { kind: "banner", template: "{{name}}", input: { omit: true } },
        {
          kind: "span",
          template: "{{title}} — {{organization}}",
          input: { omit: true },
        },
        {
          name: "name",
          label: "Full name",
          display: { omit: true },
        },
        { name: "title", label: "Title", display: { omit: true } },
        {
          name: "organization",
          label: "Company",
          display: { omit: true },
        },
        // Channels: Input keeps section labels + Add; Display quiet values.
        {
          label: "",
          fields: [
            {
              name: "emails",
              label: "Email",
              itemLabel: "Email",
              display: { label: "" },
            },
            {
              name: "phones",
              label: "Phone",
              itemLabel: "Phone",
              display: { label: "" },
            },
            {
              name: "links",
              label: "Links",
              itemLabel: "Link",
              display: { label: "" },
            },
          ],
        },
        {
          name: "addresses",
          label: "Addresses",
          itemLabel: "Address",
          display: { view: "card", label: "" },
        },
        {
          name: "externalReferences",
          label: "External IDs",
          itemLabel: "External ID",
          display: { view: "row", label: "" },
        },
        {
          name: "socialHandles",
          label: "Social",
          itemLabel: "Handle",
          display: { view: "row", label: "" },
        },
      ],
      rest: "omit",
    },

    /** Who — header chip only. */
    identity: {
      label: "",
      layout: "stack",
      fields: [
        { kind: "banner", template: "{{name}}" },
        { kind: "span", template: "{{title}} — {{organization}}" },
      ],
      rest: "omit",
    },

    /** List row — who, role, phone. Display-oriented (arrays Input-omitted). */
    row: {
      label: "",
      layout: "stack",
      direction: "horizontal",
      fields: [
        { kind: "banner", template: "{{name}}" },
        { kind: "span", template: "{{title}}" },
        {
          name: "phones",
          label: "",
          itemLabel: "Phone",
          // Readout view — don't drag Input array chrome into a list row.
          input: { omit: true },
        },
      ],
      rest: "omit",
    },

    /**
     * Preview tile — who, role/org, contact channels on Display.
     * Input: compact essentials (name / title / company) only; no array chrome.
     */
    card: {
      label: "",
      layout: "stack",
      fields: [
        { kind: "banner", template: "{{name}}", input: { omit: true } },
        {
          kind: "span",
          template: "{{title}} — {{organization}}",
          input: { omit: true },
        },
        { name: "name", label: "Full name", display: { omit: true } },
        { name: "title", label: "Title", display: { omit: true } },
        {
          name: "organization",
          label: "Company",
          display: { omit: true },
        },
        {
          name: "emails",
          label: "",
          itemLabel: "Email",
          input: { omit: true },
        },
        {
          name: "phones",
          label: "",
          itemLabel: "Phone",
          input: { omit: true },
        },
      ],
      rest: "omit",
    },
  },
  // `$ref` items (#/$defs/*): widgets must live here — items.fields is ignored.
  defs: {
    emailEntry: {
      views: {
        default: {
          fields: [
            {
              name: "value",
              label: "Email",
              widget: { name: "email" },
              display: { label: "" },
            },
            { name: "contexts", label: "Roles", display: { omit: true } },
            { name: "preference", omit: true },
          ],
          rest: "omit",
        },
      },
    },
    phoneEntry: {
      views: {
        default: {
          fields: [
            {
              name: "value",
              label: "Number",
              widget: { name: "tel" },
              display: { label: "" },
            },
            { name: "kind", label: "Type", display: { omit: true } },
            { name: "contexts", omit: true },
            { name: "preference", omit: true },
            { name: "extension", omit: true },
          ],
          rest: "omit",
        },
      },
    },
    linkEntry: {
      views: {
        default: {
          fields: [
            {
              name: "value",
              label: "URL",
              widget: { name: "link" },
              display: { label: "" },
            },
            { name: "kind", label: "Kind", display: { omit: true } },
            { name: "contexts", omit: true },
            { name: "preference", omit: true },
          ],
          rest: "omit",
        },
      },
    },
  },
};
