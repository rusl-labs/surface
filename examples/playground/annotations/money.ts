/**
 * Money — kit `$id` takeover only. Default view; no row/card/identity.
 *
 * No fields list + rest append keep the `$id` resolver (MoneyDisplay /
 * MoneyInput) in charge of the body. Annotation must not re-implement money UI.
 * (`fields: []` is invalid — format requires minItems 1 when present.)
 * Pretty amount only — never canonical dumps like `[USD] 1234` (kit concern).
 */
import type { AnnotationDocument } from "@rusl-labs/surface";
import { MONEY_ID } from "../../../tests/fixtures/pragmatic-seeds.ts";
import { ANNOTATION_KIND, TARGET_HTML } from "./shared.ts";

export const MONEY_ANNOTATION: AnnotationDocument = {
  $kind: ANNOTATION_KIND,
  subject: MONEY_ID,
  targetLibraries: [...TARGET_HTML],
  views: {
    default: {
      // No fields list — kit `$id` takeover owns the body. `label: ""` quiets chrome.
      label: "",
      rest: "append",
    },
  },
};
