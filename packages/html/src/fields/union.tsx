import { useEffect, useState, type ReactElement } from "react";
import {
  useSurface,
  type Schema,
  type SchemaResolver,
  type SurfaceProps,
} from "@rusl-labs/surface";
import { surfaceClass, sx } from "../classes.js";
import { useAllOfData } from "./allof-data.js";
import { FieldChrome } from "./chrome.js";
import {
  branchSurfaceProps,
  constToFormValue,
  fieldLabel,
  isRecord,
} from "./shared.js";

function refSlug(ref: string): string {
  const slug = ref.split("/").pop();
  return slug !== undefined && slug.length > 0 ? slug : ref;
}

function branchLabel(
  branch: Record<string, unknown>,
  index: number,
  fieldName: string,
): string {
  if (typeof branch.title === "string") return branch.title;
  if ("const" in branch) return constToFormValue(branch.const);
  if (typeof branch.$ref === "string") return refSlug(branch.$ref);
  const name = fieldLabel(fieldName);
  if (name.length > 0) return name;
  if (typeof branch.type === "string") return branch.type;
  return `Option ${index + 1}`;
}

function optionLabel(option: unknown, index: number, fieldName: string): string {
  return isRecord(option)
    ? branchLabel(option, index, fieldName)
    : `Option ${index + 1}`;
}

async function resolveBranchLabel(
  branch: Record<string, unknown>,
  index: number,
  fieldName: string,
  resolver: SchemaResolver | undefined,
): Promise<string> {
  if (
    typeof branch.$ref === "string" &&
    !branch.$ref.startsWith("#") &&
    resolver !== undefined
  ) {
    try {
      const resolved = await resolver.resolveSchema(branch.$ref);
      if (typeof resolved?.title === "string") return resolved.title;
    } catch {
      // fall through
    }
  }
  return branchLabel(branch, index, fieldName);
}

function matchUnionIndex(options: readonly unknown[], data: unknown): number {
  if (!isRecord(data) || typeof data.$kind !== "string") return 0;
  const kind = data.$kind;
  const index = options.findIndex(
    (option) =>
      isRecord(option) &&
      typeof option.$ref === "string" &&
      option.$ref === kind,
  );
  return index >= 0 ? index : 0;
}

function unionOptions(schema: Schema): unknown[] | undefined {
  if (Array.isArray(schema.oneOf)) return schema.oneOf;
  if (Array.isArray(schema.anyOf)) return schema.anyOf;
  return undefined;
}

/**
 * Seed for a newly selected branch: $kind + every `const` property on the
 * target schema (e.g. countryCode: "AU" on postal.au-address).
 */
async function seedForBranch(
  branch: unknown,
  resolver: SchemaResolver | undefined,
): Promise<Record<string, unknown>> {
  const seed: Record<string, unknown> = {};
  if (!isRecord(branch)) return seed;

  if (typeof branch.$ref === "string") {
    if (!branch.$ref.startsWith("#")) seed.$kind = branch.$ref;
    if (resolver !== undefined) {
      try {
        const target = await resolver.resolveSchema(branch.$ref);
        const properties = target?.properties;
        if (isRecord(properties)) {
          for (const [name, prop] of Object.entries(properties)) {
            if (isRecord(prop) && "const" in prop) {
              seed[name] = prop.const;
            }
          }
        }
      } catch {
        // keep $kind-only seed
      }
    }
  } else if ("const" in branch) {
    seed.value = branch.const;
  }

  return seed;
}

/** oneOf/anyOf input: pick a branch, mount one child Surface. */
export function UnionInput({
  id,
  data,
  mode,
  view,
}: SurfaceProps): ReactElement | null {
  const { schema, Surface, options: uiOptions, dataApi } = useSurface();
  const allOf = useAllOfData();
  if (Surface === undefined || schema === undefined) return null;

  const options = unionOptions(schema);
  if (options === undefined || options.length === 0) return null;

  // Prefer allOf shared data (whole composite), else this node's data channel.
  const parentData = allOf?.data ?? dataApi?.data ?? data;

  const [selected, setSelected] = useState(() =>
    matchUnionIndex(options, parentData),
  );
  const [labels, setLabels] = useState(() =>
    options.map((option, index) => optionLabel(option, index, id)),
  );

  const resolver = uiOptions?.schemaResolver;

  useEffect(() => {
    setSelected(matchUnionIndex(options, parentData));
  }, [parentData, options]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      options.map((option, index) =>
        isRecord(option)
          ? resolveBranchLabel(option, index, id, resolver)
          : Promise.resolve(optionLabel(option, index, id)),
      ),
    ).then((next) => {
      if (!cancelled) setLabels(next);
    });
    return () => {
      cancelled = true;
    };
  }, [options, id, resolver]);

  const branch = options[selected];
  if (!isRecord(branch)) return null;

  const liveData = parentData;
  const child = branchSurfaceProps(branch, selected, liveData, mode, view);

  function replaceValue(seed: Record<string, unknown>): void {
    if (allOf !== null) {
      allOf.replace(seed);
      return;
    }
    dataApi?.setData(seed);
  }

  return (
    <FieldChrome as="div" className={surfaceClass.union}>
      <select
        className={sx(surfaceClass.control, surfaceClass.select)}
        value={selected}
        aria-label="Variant"
        onChange={(event) => {
          const index = Number(event.target.value);
          setSelected(index);
          void seedForBranch(options[index], resolver).then((seed) => {
            replaceValue(seed);
          });
        }}
      >
        {options.map((_, index) => (
          <option key={index} value={index}>
            {labels[index]}
          </option>
        ))}
      </select>
      <Surface
        key={`${selected}:${allOf?.generation ?? 0}:${child.id}`}
        {...child}
      />
    </FieldChrome>
  );
}

/** oneOf/anyOf display: render the matched branch only. */
export function UnionDisplay({
  data,
  mode,
  view,
}: SurfaceProps): ReactElement | null {
  const { schema, Surface } = useSurface();
  const allOf = useAllOfData();
  if (Surface === undefined || schema === undefined) return null;

  const options = unionOptions(schema);
  if (options === undefined || options.length === 0) return null;

  const liveData = allOf?.data ?? data;
  const selected = matchUnionIndex(options, liveData);
  const branch = options[selected];
  if (!isRecord(branch)) return null;

  const child = branchSurfaceProps(branch, selected, liveData, mode, view);
  return <Surface key={child.id} {...child} />;
}
