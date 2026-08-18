import type { Schema, SchemaResolver } from "./types.js";

/**
 * Instance path relative to the data root of one validate() call.
 * - string → object property name
 * - number → array index
 */
export type DataPath = readonly (string | number)[];

/**
 * One problem with the data. Kits show `message` on the matching field.
 * Paths are relative to ValidateRequest.data — never annotation coordinates.
 */
export interface ValidityIssue {
  readonly path: DataPath;
  readonly message: string;
  readonly code?: string;
}

/**
 * Pure validation input — no React, no ambient Surface context.
 * Callers hand fields in explicitly; adapters never close over resolvers.
 */
export interface ValidateRequest {
  /** Subject / schema document id when known (mount id or schema `$id`). */
  readonly id?: string;
  /** Effective schema node for this value. */
  readonly schema: Schema;
  /** Value at this validation root. */
  readonly data: unknown;
  /**
   * Same schema resolver the Surface uses for UI. Adapters that need absolute
   * `$ref`s (AJV) load missing documents through this on demand.
   */
  readonly schemaResolver: SchemaResolver;
}

export interface ValidateResult {
  readonly valid: boolean;
  readonly issues: readonly ValidityIssue[];
}

/**
 * App-supplied adapter (AJV, Zod, remote, handwritten).
 * Unaware of React context — only sees {@link ValidateRequest}.
 */
export interface SurfaceValidator {
  validate(
    request: ValidateRequest,
  ): ValidateResult | Promise<ValidateResult>;
}

/** Projected issues for one Surface node (paths relative to that node's data). */
export interface SurfaceValidity {
  readonly issues: readonly ValidityIssue[];
}

export function pathEquals(a: DataPath, b: DataPath): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Issues whose path equals `path` exactly (this node only). */
export function issuesAt(
  issues: readonly ValidityIssue[],
  path: DataPath,
): readonly ValidityIssue[] {
  return issues.filter((issue) => pathEquals(issue.path, path));
}

/**
 * Issues at or under `base`, with paths rebased (prefix stripped).
 * `projectIssues(issues, ["lineItems", 2])` → paths relative to that item.
 */
export function projectIssues(
  issues: readonly ValidityIssue[],
  base: DataPath,
): readonly ValidityIssue[] {
  if (base.length === 0) return issues;
  const out: ValidityIssue[] = [];
  for (const issue of issues) {
    if (issue.path.length < base.length) continue;
    let match = true;
    for (let i = 0; i < base.length; i++) {
      if (issue.path[i] !== base[i]) {
        match = false;
        break;
      }
    }
    if (!match) continue;
    out.push({
      ...issue,
      path: issue.path.slice(base.length),
    });
  }
  return out;
}

/** Test / display-only validator that never reports issues. */
export const acceptAllValidator: SurfaceValidator = {
  validate() {
    return { valid: true, issues: [] };
  },
};
