import type { ValidateResult } from "./validity.js";

/**
 * Live data API for one Surface node.
 *
 * Root owns the document value; nested nodes either inherit (shared value —
 * schema URI, allOf/union composition) or wrap a slot (property / array index)
 * via {@link setChild} on the parent.
 */
export interface SurfaceDataApi {
  /** Current value at this node. */
  readonly data: unknown;
  /** Replace this node's whole value. */
  setData(next: unknown): void;
  /** Replace one child slot (object key or array index). */
  setChild(key: string | number, next: unknown): void;
  /**
   * Root only: write a validate() result into the channel (issues + form
   * submitted flag for kit dirty rules).
   */
  reportValidation?(result: ValidateResult): void;
  /** Root only: restore initial data and clear validity. */
  reset?(): void;
}

/** Payload for Surface `onSubmit` — only fired when validation succeeds. */
export interface SurfaceSubmitEvent {
  readonly data: unknown;
}

/**
 * True when this mount shares its parent's data identity (no path segment).
 * Schema document URIs and composition ids (`allOf:0`, `union:1`, …).
 */
export function isDataInheritId(id: string): boolean {
  if (id.includes("://") || id.startsWith("urn:")) return true;
  if (/^(allOf|anyOf|oneOf|union):\d+$/.test(id)) return true;
  return false;
}

/**
 * Slot key for a non-inherit id: array index if all digits, else property name.
 */
export function parseDataSlot(id: string): string | number {
  if (/^\d+$/.test(id)) return Number(id);
  return id;
}

/**
 * Immutable update of one object property or array index.
 *
 * For object keys, `undefined` **omits** the property (JSON Schema optional =
 * key absent). Do not write `null` unless the schema allows null — `null` is a
 * present value and fails `type: "object"` / `$ref` object schemas.
 */
export function setChildValue(
  parent: unknown,
  key: string | number,
  next: unknown,
): unknown {
  if (typeof key === "number") {
    const arr = Array.isArray(parent) ? parent.slice() : [];
    while (arr.length <= key) arr.push(undefined);
    arr[key] = next;
    return arr;
  }
  const obj =
    typeof parent === "object" && parent !== null && !Array.isArray(parent)
      ? { ...(parent as Record<string, unknown>) }
      : ({} as Record<string, unknown>);
  if (next === undefined) {
    delete obj[key];
    return obj;
  }
  obj[key] = next;
  return obj;
}
