import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";
import type { Schema, SurfaceProps } from "@rusl-labs/surface";

/** True when `id` is a schema document URI, not a property name. */
export function isSchemaUri(id: string): boolean {
  return id.includes("://") || id.startsWith("urn:");
}

/**
 * Structural / composition mounts — not author field names.
 * e.g. `allOf:0`, `union:1`, array index `0`. Not schema URIs.
 */
export function isSyntheticFieldId(id: string): boolean {
  if (id.length === 0) return true;
  if (/^(allOf|anyOf|oneOf|union):\d+$/.test(id)) return true;
  if (/^\d+$/.test(id)) return true;
  return false;
}

/**
 * Labels for non-Surface chrome (union option text, etc.).
 * Annotated Surface nodes use `helpers.label()` only — not this.
 * Returns the raw property name (or schema title for URI mounts) — apply
 * {@link formatPropertyLabel} / kit `fieldNameToLabel` before showing in UI.
 */
export function fieldLabel(id: string, schema?: Schema): string {
  if (isSchemaUri(id)) {
    return typeof schema?.title === "string" ? schema.title : "";
  }
  if (isSyntheticFieldId(id)) return "";
  return id;
}

/**
 * Choose UI label text: keep annotation / non-name labels as-is; run bare
 * property names through `fieldNameToLabel` (humanize, title case, …).
 *
 * Empty `resolvedLabel` means the annotation suppressed the label (`label: ""`)
 * — do not humanize the property name back into chrome.
 */
export function formatPropertyLabel(
  propertyName: string,
  resolvedLabel: string,
  fieldNameToLabel: (name: string) => string,
): string {
  if (resolvedLabel.length === 0) return "";
  // Annotation or schema title that differs from the raw property name.
  if (
    resolvedLabel !== propertyName &&
    !isSyntheticFieldId(propertyName) &&
    !isSchemaUri(propertyName)
  ) {
    return resolvedLabel;
  }
  // Bare property name (or synthetic/URI with same string — rare).
  if (isSyntheticFieldId(propertyName) || isSchemaUri(propertyName)) {
    return resolvedLabel;
  }
  return fieldNameToLabel(propertyName);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Structural nest: id + schema (+ data/mode/view). Document, annotation, and
 * coordinate re-root flow through Surface context inheritance / `$ref` resolve
 * — not a second presentation algorithm. Annotation order/labels live in
 * `helpers.fields()` for objects (and allOf roots that honor a non-empty layout).
 */
export function childSurfaceProps(
  id: string,
  fieldSchema: Record<string, unknown>,
  data: unknown,
  mode: SurfaceProps["mode"],
  view: SurfaceProps["view"],
  labels?: boolean,
): SurfaceProps {
  return {
    id,
    schema: fieldSchema as Schema,
    ...(mode !== undefined ? { mode } : {}),
    ...(view !== undefined ? { view } : {}),
    ...(labels !== undefined ? { labels } : {}),
    ...(data !== undefined ? { data } : {}),
  };
}

/**
 * Mount a oneOf/anyOf branch.
 * Absolute `$ref` → Surface by schema id (natural resolve path).
 * Relative `#/…` or inline → schema prop for document-context resolve.
 */
export function branchSurfaceProps(
  branch: Record<string, unknown>,
  index: number,
  data: unknown,
  mode: SurfaceProps["mode"],
  view: SurfaceProps["view"],
): SurfaceProps {
  const ref = typeof branch.$ref === "string" ? branch.$ref : undefined;
  if (ref !== undefined && !ref.startsWith("#")) {
    return {
      id: ref,
      ...(mode !== undefined ? { mode } : {}),
      ...(view !== undefined ? { view } : {}),
      ...(data !== undefined ? { data } : {}),
    };
  }
  return childSurfaceProps(`union:${index}`, branch, data, mode, view);
}

export function constToFormValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";
  return JSON.stringify(value);
}

/**
 * allOf de-dupe: first **direct** object branch that declares a property owns it.
 * Precomputed — not a mutable set grown by nested object renderers (that blanked
 * the form when oneOf switched US→AU under postal.address).
 */
export type AllOfPropertyScope = {
  readonly firstOwner: ReadonlyMap<string, number>;
  readonly branchIndex: number;
};

const AllOfPropertyContext = createContext<AllOfPropertyScope | null>(null);

/** property name → index of the first allOf branch with that property. */
export function allOfFirstOwners(
  allOf: readonly unknown[],
): ReadonlyMap<string, number> {
  const firstOwner = new Map<string, number>();
  allOf.forEach((branch, index) => {
    if (!isRecord(branch)) return;
    const properties = branch.properties;
    if (!isRecord(properties)) return;
    for (const name of Object.keys(properties)) {
      if (!firstOwner.has(name)) firstOwner.set(name, index);
    }
  });
  return firstOwner;
}

export function AllOfBranchScope({
  firstOwner,
  branchIndex,
  children,
}: {
  firstOwner: ReadonlyMap<string, number>;
  branchIndex: number;
  children: ReactNode;
}): ReactNode {
  return createElement(
    AllOfPropertyContext.Provider,
    { value: { firstOwner, branchIndex } },
    children,
  );
}

/** Skip properties owned by an earlier direct allOf object branch. */
export function useAllOfPropertyVisible(name: string): boolean {
  const scope = useContext(AllOfPropertyContext);
  if (scope === null) return true;
  const owner = scope.firstOwner.get(name);
  if (owner === undefined) return true;
  return owner === scope.branchIndex;
}
