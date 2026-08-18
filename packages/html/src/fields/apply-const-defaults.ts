/**
 * Apply schema `const` / `default` deep into instance data **before** validate.
 *
 * Field-level useEffect seeding is best-effort (mount order, hidden fields).
 * Save must not depend on that: const is forced, defaults fill every missing
 * slot (undefined / null) so required fixed metadata ($kind, countryCode)
 * and declared defaults are present when AJV runs.
 */
import type { Schema, SchemaResolver } from "@rusl-labs/surface";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null;
}

async function resolveSchema(
  schema: Schema,
  resolver: SchemaResolver,
  seen: Set<string>,
): Promise<Schema> {
  const ref = typeof schema.$ref === "string" ? schema.$ref : undefined;
  if (ref === undefined) return schema;
  if (seen.has(ref)) return schema;
  seen.add(ref);
  try {
    const resolved = await resolver.resolveSchema(ref);
    if (resolved === undefined) return schema;
    // Preserve sibling keywords rarely used with $ref; prefer resolved body.
    return resolved;
  } catch {
    return schema;
  }
}

/**
 * Pick a oneOf/anyOf branch that matches instance data (usually via `$kind`).
 */
async function matchUnionBranch(
  branches: readonly unknown[],
  data: unknown,
  resolver: SchemaResolver,
  seen: Set<string>,
): Promise<Schema | undefined> {
  if (!isRecord(data)) return undefined;
  const kind = typeof data.$kind === "string" ? data.$kind : undefined;

  for (const branch of branches) {
    if (!isRecord(branch)) continue;
    if (kind !== undefined && typeof branch.$ref === "string") {
      if (branch.$ref === kind || branch.$ref.startsWith(`${kind}#`)) {
        return branch as Schema;
      }
    }
    const resolved = await resolveSchema(branch as Schema, resolver, seen);
    const props = resolved.properties;
    if (kind !== undefined && isRecord(props) && isRecord(props.$kind)) {
      if (props.$kind.const === kind) return resolved;
    }
    // countryCode-only const arms (no $kind yet)
    if (isRecord(props) && isRecord(props.countryCode)) {
      const cc = props.countryCode.const;
      if (cc !== undefined && data.countryCode === cc) return resolved;
    }
  }
  return undefined;
}

/**
 * Deep-apply const (always) and default (when missing) per schema.
 */
export async function applyConstAndDefaults(
  schema: Schema,
  data: unknown,
  resolver: SchemaResolver,
  seen: Set<string> = new Set(),
): Promise<unknown> {
  const s = await resolveSchema(schema, resolver, seen);

  // Whole-node const wins.
  if ("const" in s && s.const !== undefined) {
    return s.const;
  }

  let value: unknown = data;
  if (isMissing(value) && "default" in s && s.default !== undefined) {
    value = s.default;
  }

  // allOf: layer each arm onto the accumulator
  if (Array.isArray(s.allOf) && s.allOf.length > 0) {
    let acc: unknown = value;
    for (const arm of s.allOf) {
      if (!isRecord(arm) && typeof arm !== "object") continue;
      acc = await applyConstAndDefaults(arm as Schema, acc, resolver, seen);
    }
    // Continue with merged schema keywords on the same node (properties on allOf root rare)
    value = acc;
  }

  // oneOf / anyOf: fill the matching branch only
  const union = s.oneOf ?? s.anyOf;
  if (Array.isArray(union) && union.length > 0) {
    const branch = await matchUnionBranch(union, value, resolver, seen);
    if (branch !== undefined) {
      return applyConstAndDefaults(branch, value, resolver, seen);
    }
    return value;
  }

  const propMap = isRecord(s.properties) ? s.properties : undefined;
  const looksObject =
    s.type === "object" ||
    (Array.isArray(s.type) && s.type.includes("object")) ||
    propMap !== undefined;

  if (looksObject && propMap !== undefined) {
    const base: Record<string, unknown> = isRecord(value) ? { ...value } : {};
    // If still missing after default, use empty object so required consts can land.
    const out: Record<string, unknown> = isRecord(value)
      ? { ...value }
      : isMissing(value)
        ? { ...base }
        : {};
    const requiredNames = new Set(
      Array.isArray(s.required)
        ? s.required.filter((name): name is string => typeof name === "string")
        : [],
    );

    for (const [name, propSchema] of Object.entries(propMap)) {
      if (!isRecord(propSchema) && typeof propSchema !== "object") continue;
      const prop = propSchema as Schema;
      if (
        isMissing(out[name]) &&
        !requiredNames.has(name) &&
        !("default" in prop)
      ) {
        continue;
      }
      const next = await applyConstAndDefaults(
        propSchema as Schema,
        out[name],
        resolver,
        seen,
      );
      if (next === undefined) {
        delete out[name];
      } else {
        out[name] = next;
      }
    }
    return out;
  }

  if (
    (s.type === "array" ||
      (Array.isArray(s.type) && s.type.includes("array"))) &&
    Array.isArray(value) &&
    isRecord(s.items)
  ) {
    const itemSchema = s.items as Schema;
    return Promise.all(
      value.map((item) =>
        applyConstAndDefaults(itemSchema, item, resolver, seen),
      ),
    );
  }

  return value;
}
