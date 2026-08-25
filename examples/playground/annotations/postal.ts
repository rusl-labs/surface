/**
 * Postal address — form + one-line row / block card. No identity.
 *
 * Root schema is allOf (base + country oneOf). Display/row/card use annotated
 * chrome on this subject; Input default falls through to variant branches
 * (us-address / postal.au-address annotations).
 */
import type { AnnotationDocument } from "@rusl-labs/surface";
import {
  POSTAL_ADDRESS_ID,
  US_ADDRESS_ID,
} from "../../../tests/fixtures/pragmatic-seeds.ts";
import { ANNOTATION_KIND, TARGET_HTML } from "./shared.ts";

export const POSTAL_ANNOTATION: AnnotationDocument = {
  $kind: ANNOTATION_KIND,
  subject: POSTAL_ADDRESS_ID,
  targetLibraries: [...TARGET_HTML],
  views: {
    /** Full address block — calm multi-line Display; Input via branch. */
    default: {
      label: "",
      layout: "stack",
      fields: [
        {
          kind: "banner",
          template: "{{street1}}",
          input: { omit: true },
        },
        {
          kind: "span",
          template: "{{street2}}",
          input: { omit: true },
        },
        {
          kind: "span",
          template: "{{city}}, {{region}} {{postalCode}}",
          input: { omit: true },
        },
        // Named fields are not on the allOf root propertyMap — Input uses
        // the us-address / au-address branch annotations instead.
        { name: "countryCode", hidden: true },
        { name: "$kind", hidden: true },
        { name: "geo", omit: true },
        { name: "contexts", omit: true },
        { name: "preference", omit: true },
      ],
      rest: "omit",
    },

    /** List scan — single horizontal one-liner. */
    row: {
      label: "",
      layout: "stack",
      direction: "horizontal",
      fields: [
        {
          kind: "span",
          template: "{{street1}}, {{city}} {{region}} {{postalCode}}",
        },
      ],
      rest: "omit",
    },

    /** Dense multi-line block for nested mounts (e.g. contact addresses). */
    card: {
      label: "",
      layout: "stack",
      fields: [
        { kind: "banner", template: "{{street1}}" },
        { kind: "span", template: "{{street2}}" },
        {
          kind: "span",
          template: "{{city}}, {{region}} {{postalCode}}",
        },
      ],
      rest: "omit",
    },
  },
};

/** US variant — labeled Input form when postal.address allOf walks branches. */
export const US_ADDRESS_ANNOTATION: AnnotationDocument = {
  $kind: ANNOTATION_KIND,
  subject: US_ADDRESS_ID,
  targetLibraries: [...TARGET_HTML],
  views: {
    default: {
      label: "",
      layout: "stack",
      fields: [
        {
          kind: "banner",
          template: "{{street1}}",
          input: { omit: true },
        },
        {
          kind: "span",
          template: "{{street2}}",
          input: { omit: true },
        },
        {
          kind: "span",
          template: "{{city}}, {{region}} {{postalCode}}",
          input: { omit: true },
        },
        {
          name: "street1",
          label: "Street address",
          display: { omit: true },
        },
        {
          name: "street2",
          label: "Apt, suite, etc.",
          display: { omit: true },
        },
        {
          label: "",
          layout: "stack",
          direction: "horizontal",
          fields: [
            { name: "city", label: "City", display: { omit: true } },
            { name: "region", label: "State", display: { omit: true } },
            {
              name: "postalCode",
              label: "ZIP code",
              display: { omit: true },
            },
          ],
        },
        { name: "countryCode", hidden: true },
        { name: "$kind", hidden: true },
        { name: "geo", omit: true },
        { name: "contexts", label: "Roles", display: { omit: true } },
        { name: "preference", omit: true },
      ],
      rest: "omit",
    },
  },
};
