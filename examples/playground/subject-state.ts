/**
 * Playground subject seeds: annotations + instance JSON.
 */
import type { AnnotationDocument } from "@rusl-labs/surface";
import {
  BILLING_INVOICE_ID,
  BILLING_INVOICE_SAMPLE,
  COMMERCE_LINE_ITEM_ID,
  CONTACT_CARD_ID,
  CONTACT_CARD_SAMPLE,
  CONTACT_SOCIAL_HANDLE_ID,
  EXTERNAL_REFERENCE_ID,
  MONEY_ID,
  POSTAL_ADDRESS_ID,
  POSTAL_SAMPLE,
  US_ADDRESS_ID,
} from "../../tests/fixtures/pragmatic-seeds.ts";
import {
  CONTACT_CARD as WALKTHROUGH_ID,
  CONTACT_DATA as WALKTHROUGH_DATA,
  WALKTHROUGH_ANNOTATION,
} from "../../tests/fixtures/contact-card.ts";
import {
  COMMERCE_PRODUCT_ID,
  PRODUCT_ANNOTATION,
  PRODUCT_SAMPLE,
} from "./commerce-product.ts";
import { MONEY_SAMPLE } from "./money.tsx";
import { shortNameFromId } from "./catalog.ts";
import { CONTACT_ANNOTATION } from "./annotations/contact.ts";
import {
  EXTERNAL_REFERENCE_ANNOTATION,
  EXTERNAL_REFERENCE_SAMPLE,
} from "./annotations/external-reference.ts";
import { INVOICE_ANNOTATION } from "./annotations/invoice.ts";
import { LINE_ITEM_ANNOTATION } from "./annotations/line-item.ts";
import { MONEY_ANNOTATION } from "./annotations/money.ts";
import {
  POSTAL_ANNOTATION,
  US_ADDRESS_ANNOTATION,
} from "./annotations/postal.ts";
import { SOCIAL_HANDLE_ANNOTATION } from "./annotations/social-handle.ts";
import { ANNOTATION_KIND } from "./annotations/shared.ts";
import {
  CONTACT_DIRECTORY_ANNOTATION,
  CONTACT_DIRECTORY_ID,
  CONTACT_DIRECTORY_SAMPLE,
} from "./contact-directory.ts";

export {
  CONTACT_ANNOTATION,
  CONTACT_DIRECTORY_ANNOTATION,
  EXTERNAL_REFERENCE_ANNOTATION,
  INVOICE_ANNOTATION,
  LINE_ITEM_ANNOTATION,
  MONEY_ANNOTATION,
  POSTAL_ANNOTATION,
  SOCIAL_HANDLE_ANNOTATION,
  US_ADDRESS_ANNOTATION,
};

export const SUBJECT_SEEDS: Record<string, unknown> = {
  [MONEY_ID]: MONEY_SAMPLE,
  [POSTAL_ADDRESS_ID]: POSTAL_SAMPLE,
  [CONTACT_CARD_ID]: CONTACT_CARD_SAMPLE,
  [BILLING_INVOICE_ID]: BILLING_INVOICE_SAMPLE,
  [COMMERCE_PRODUCT_ID]: PRODUCT_SAMPLE,
  [EXTERNAL_REFERENCE_ID]: EXTERNAL_REFERENCE_SAMPLE,
  [WALKTHROUGH_ID]: WALKTHROUGH_DATA,
  [CONTACT_DIRECTORY_ID]: CONTACT_DIRECTORY_SAMPLE,
};

export const SUBJECT_ANNOTATIONS: Record<string, AnnotationDocument> = {
  [WALKTHROUGH_ID]: WALKTHROUGH_ANNOTATION,
  [COMMERCE_PRODUCT_ID]: PRODUCT_ANNOTATION,
  [COMMERCE_LINE_ITEM_ID]: LINE_ITEM_ANNOTATION,
  [CONTACT_CARD_ID]: CONTACT_ANNOTATION,
  [CONTACT_SOCIAL_HANDLE_ID]: SOCIAL_HANDLE_ANNOTATION,
  [EXTERNAL_REFERENCE_ID]: EXTERNAL_REFERENCE_ANNOTATION,
  [BILLING_INVOICE_ID]: INVOICE_ANNOTATION,
  [POSTAL_ADDRESS_ID]: POSTAL_ANNOTATION,
  [US_ADDRESS_ID]: US_ADDRESS_ANNOTATION,
  [MONEY_ID]: MONEY_ANNOTATION,
  [CONTACT_DIRECTORY_ID]: CONTACT_DIRECTORY_ANNOTATION,
};

export function emptyAnnotation(
  subject: string,
  label: string,
): AnnotationDocument {
  return {
    $kind: ANNOTATION_KIND,
    subject,
    targetLibraries: ["@rusl-labs/surface-html"],
    views: {
      default: {
        label,
        fields: [],
        rest: "append",
      },
    },
  };
}

export function starterAnnotation(
  subject: string,
  fallbackLabel?: string,
): AnnotationDocument {
  return (
    SUBJECT_ANNOTATIONS[subject] ??
    emptyAnnotation(
      subject,
      fallbackLabel ?? shortNameFromId(subject),
    )
  );
}

export function seedDataText(subject: string): string {
  const seed = SUBJECT_SEEDS[subject];
  return JSON.stringify(seed ?? {}, null, 2);
}

export function isAnnotationDocument(
  value: unknown,
): value is AnnotationDocument {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const rec = value as Record<string, unknown>;
  return typeof rec.subject === "string" && rec.subject.length > 0;
}

export function viewNamesFromAnnotation(
  doc: AnnotationDocument | undefined,
): string[] {
  if (doc?.views === undefined || typeof doc.views !== "object") {
    return ["default"];
  }
  const names = Object.keys(doc.views);
  return names.length > 0 ? names : ["default"];
}

export function parseJson(text: string): {
  data: unknown;
  error: string | undefined;
} {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { data: undefined, error: undefined };
  try {
    return { data: JSON.parse(trimmed) as unknown, error: undefined };
  } catch (cause) {
    return {
      data: undefined,
      error: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

export function parseAnnotation(
  text: string,
  expectedSubject: string,
): {
  doc: AnnotationDocument | undefined;
  error: string | undefined;
} {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { doc: undefined, error: "Empty annotation" };
  }
  try {
    const data: unknown = JSON.parse(trimmed);
    if (!isAnnotationDocument(data)) {
      return {
        doc: undefined,
        error: 'Annotation must be an object with string "subject"',
      };
    }
    if (data.subject !== expectedSubject) {
      return {
        doc: data,
        error: `subject is "${data.subject}" — expected "${expectedSubject}" (still applied)`,
      };
    }
    return { doc: data, error: undefined };
  } catch (cause) {
    return {
      doc: undefined,
      error: cause instanceof Error ? cause.message : String(cause),
    };
  }
}
