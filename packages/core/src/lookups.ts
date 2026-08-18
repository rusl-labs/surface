import type { SurfaceCoordinate } from "./kit.js";
import type { AnnotationEntry, Schema } from "./types.js";

const COMBINATORS = ["oneOf", "anyOf", "allOf"] as const;

/** Push `ns:name`, then the bare `name` a kit may have registered once. */
function pushNamespaced(keys: string[], ns: string, name: unknown): void {
  if (typeof name !== "string" || name.length === 0) return;
  keys.push(`${ns}:${name}`, name);
}

/**
 * Candidate renderer keys for a node, most specific first:
 * schema `$id` → subject-root coordinate (`<uri>` or `<uri>#/$defs/<name>`) →
 * `widget.$kind` (full absolute URI) → `widget:<name>` / bare name →
 * `format:<name>` → structural keys (`const`, `enum`, `type`, combinators).
 * Deduped, first occurrence wins.
 */
export function candidateKeys(
  schema: Schema,
  entry?: AnnotationEntry,
  coordinate?: SurfaceCoordinate,
): string[] {
  const keys: string[] = [];
  if (typeof schema.$id === "string") keys.push(schema.$id);
  if (
    coordinate !== undefined &&
    coordinate.path.length === 0 &&
    coordinate.subject.length > 0
  ) {
    keys.push(coordinate.subject);
  }
  const kind = entry?.widget?.$kind;
  if (typeof kind === "string" && kind.length > 0) keys.push(kind);
  pushNamespaced(keys, "widget", entry?.widget?.name);
  pushNamespaced(keys, "format", schema.format);
  if ("const" in schema) keys.push("const");
  if (Array.isArray(schema.enum)) keys.push("enum");
  if (typeof schema.type === "string") keys.push(schema.type);
  for (const combinator of COMBINATORS) {
    if (Array.isArray(schema[combinator])) keys.push(combinator);
  }
  return [...new Set(keys)];
}
