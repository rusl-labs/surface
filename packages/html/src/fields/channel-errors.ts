import {
  issuesAt,
  type SurfaceValidity,
  type ValidityIssue,
} from "@rusl-labs/surface";

/**
 * Kit dirty policy: show channel issues when the form failed submit, or the
 * field was changed and blurred at least once.
 */
export function visibleFieldIssues(
  validity: SurfaceValidity | undefined,
  opts: {
    readonly formSubmitted: boolean | undefined;
    readonly changed: boolean;
    readonly blurred: boolean;
  },
): readonly ValidityIssue[] {
  const dirty =
    opts.formSubmitted === true || (opts.changed && opts.blurred);
  if (!dirty) return [];
  return issuesAt(validity?.issues ?? [], []);
}

/**
 * Root form banner after a failed Save.
 * Prefer path-`[]` schema/form issues; if Save failed with only field-path
 * issues, still surface them here so Save never looks like a no-op when field
 * chrome has not projected them yet.
 */
export function visibleRootIssues(
  validity: SurfaceValidity | undefined,
  formSubmitted: boolean | undefined,
): readonly ValidityIssue[] {
  if (formSubmitted !== true) return [];
  const all = validity?.issues ?? [];
  const rootOnly = issuesAt(all, []);
  if (rootOnly.length > 0) return rootOnly;
  return all;
}

export function firstIssueMessage(
  issues: readonly ValidityIssue[],
): string {
  return issues[0]?.message ?? "";
}

/** Stable DOM id for a field control (links label / describedby). */
export function fieldControlDomId(fieldId: string | undefined): string {
  const raw = (fieldId ?? "").trim();
  if (raw.length === 0) return "surface-field";
  // Keep CSS.escape-ish: letters, digits, -, _, replace rest.
  const safe = raw.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return `surface-field-${safe.length > 0 ? safe : "node"}`;
}

export function fieldErrorDomId(controlDomId: string): string {
  return `${controlDomId}-error`;
}

/** aria-invalid + aria-describedby when a channel error is showing. */
export function controlValidityA11y(
  controlDomId: string,
  errorMessage: string,
): {
  readonly id: string;
  readonly "aria-invalid"?: boolean;
  readonly "aria-describedby"?: string;
} {
  if (errorMessage.length === 0) {
    return { id: controlDomId };
  }
  return {
    id: controlDomId,
    "aria-invalid": true,
    "aria-describedby": fieldErrorDomId(controlDomId),
  };
}
