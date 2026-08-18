/** commerce.product — default / identity / row / card. */
import type { AnnotationDocument } from "@rusl-labs/surface";
import {
  DEFAULT_KIT_LINK,
  DEFAULT_KIT_MEDIA,
} from "../../packages/html/src/default-kit.ts";
import { ANNOTATION_SCHEMA, TARGET_HTML } from "./annotations/shared.ts";

export const COMMERCE_PRODUCT_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/commerce.product";

export const PRODUCT_ANNOTATION: AnnotationDocument = {
  $schema: ANNOTATION_SCHEMA,
  subject: COMMERCE_PRODUCT_ID,
  targetLibraries: [...TARGET_HTML],
  views: {
    default: {
      label: "",
      layout: "stack",
      fields: [
        { kind: "banner", template: "{{name}}", input: { omit: true } },
        {
          kind: "span",
          template: "{{status}} · {{sku}}",
          input: { omit: true },
        },
        // Media high in the stack so Display preview is obvious (card-like).
        // One binding only — duplicate `name: images` poisons decorationMap.
        {
          name: "images",
          label: "Images",
          itemLabel: "Image",
          display: {
            label: "",
            widget: {
              name: "media",
              $kind: DEFAULT_KIT_MEDIA,
              src: "url",
              alt: "alt",
              maxItems: 3,
              maxHeight: 160,
              fit: "contain",
            },
          },
        },
        { name: "name", label: "Name", display: { omit: true } },
        { name: "sku", label: "SKU", display: { omit: true } },
        { name: "gtin", label: "GTIN / barcode" },
        { name: "status", label: "Status", display: { omit: true } },
        { name: "description", label: "Description" },
        {
          name: "externalReferences",
          label: "External systems",
          itemLabel: "Reference",
          display: {
            label: "",
            widget: {
              name: "link",
              $kind: DEFAULT_KIT_LINK,
              href: "url",
              text: "label",
            },
          },
        },
        { name: "$kind", hidden: true },
        { name: "metadata", omit: true },
      ],
      rest: "omit",
    },

    /** Name only — who/what header. */
    identity: {
      label: "",
      layout: "stack",
      fields: [{ kind: "banner", template: "{{name}}" }],
      rest: "omit",
    },

    row: {
      label: "",
      layout: "stack",
      direction: "horizontal",
      fields: [
        { kind: "banner", template: "{{name}}" },
        { kind: "span", template: "{{sku}}" },
        { kind: "span", template: "{{status}}" },
      ],
      rest: "omit",
    },

    card: {
      label: "",
      layout: "stack",
      fields: [
        {
          name: "images",
          label: "",
          itemLabel: "Image",
          display: {
            widget: {
              name: "media",
              $kind: DEFAULT_KIT_MEDIA,
              src: "url",
              alt: "alt",
              maxItems: 1,
              layout: "banner",
              fit: "cover",
              maxHeight: 180,
            },
          },
          input: { omit: true },
        },
        { kind: "banner", template: "{{name}}" },
        { kind: "span", template: "{{status}} · {{sku}}" },
      ],
      rest: "omit",
    },
  },
};

/** Sample instance for playground + dogfood tests. */
export const PRODUCT_SAMPLE = {
  name: "Fooo",
  sku: "FOO-001",
  gtin: "88888888",
  status: "active",
  description: "This is a foo... A long one",
  images: [
    {
      url: "https://rusl.com/icon-512.png",
      alt: "Fooo product mark",
    },
  ],
  externalReferences: [
    {
      $kind:
        "https://resources.rusl.com/resources/pragmatic/schemas/external-reference",
      id: "23422",
      label: "Stripe",
      publiclyAccessible: true,
      system: "stripe",
      url: "https://example.com/products/foooo",
    },
  ],
} as const;
