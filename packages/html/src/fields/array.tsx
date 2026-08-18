import type { ReactElement } from "react";
import { useSurface, type Schema, type SurfaceProps } from "@rusl-labs/surface";
import { surfaceClass } from "../classes.js";
import { useFieldNameToLabel } from "../kit-config.js";
import { FieldChrome } from "./chrome.js";
import { IconButton } from "./icon-button.js";
import { PlusIcon, TrashIcon } from "./icons.js";
import { resolveAddCaption } from "./option-expr.js";
import {
  childSurfaceProps,
  formatPropertyLabel,
  isRecord,
  isSchemaUri,
  isSyntheticFieldId,
} from "./shared.js";

/** Singular noun for add/remove: entry.itemLabel, else formatted property name. */
function itemNoun(
  id: string,
  itemLabel: string | undefined,
  fieldNameToLabel: (name: string) => string,
): string {
  if (itemLabel !== undefined && itemLabel.length > 0) return itemLabel;
  if (id.length === 0 || isSchemaUri(id) || isSyntheticFieldId(id)) return "item";
  return formatPropertyLabel(id, id, fieldNameToLabel);
}

function listFromData(data: unknown, schema: Schema): unknown[] {
  if (data === null) return [];
  const minItems = typeof schema.minItems === "number" ? schema.minItems : 0;
  const list = Array.isArray(data) ? [...data] : [];
  while (list.length < minItems) list.push(undefined);
  return list;
}

const SCALAR_TYPES = new Set(["string", "number", "integer", "boolean"]);

/** Schema says items are scalars (string / number / integer / boolean / enum / const). */
function isScalarItemSchema(items: Record<string, unknown>): boolean {
  if (Array.isArray(items.enum)) return true;
  if ("const" in items) return true;
  const t = items.type;
  if (typeof t === "string") return SCALAR_TYPES.has(t);
  if (Array.isArray(t)) {
    return t.every(
      (x) => typeof x === "string" && (SCALAR_TYPES.has(x) || x === "null"),
    );
  }
  return false;
}

/** Every list value is a JSON primitive (covers `$ref` → string schemas). */
function isPrimitiveList(list: readonly unknown[]): boolean {
  return list.every(
    (v) =>
      v === null ||
      v === undefined ||
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean",
  );
}

function formatScalar(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

/**
 * Display: scalars → comma-separated line; structured items → list of Surfaces.
 */
export function ArrayDisplay({
  data,
  mode,
  view,
}: SurfaceProps): ReactElement | null {
  const { schema, Surface } = useSurface();
  if (Surface === undefined || schema === undefined) return null;

  const items = schema.items;
  if (!isRecord(items)) return null;

  const list = Array.isArray(data) ? data : [];
  const scalar =
    isScalarItemSchema(items) ||
    (list.length > 0 && isPrimitiveList(list));

  if (scalar) {
    const text = list
      .map(formatScalar)
      .filter((s) => s.length > 0)
      .join(", ");
    return (
      <FieldChrome as="div" className={surfaceClass.array}>
        <span className={`${surfaceClass.value} ${surfaceClass.scalarList}`}>
          {text}
        </span>
      </FieldChrome>
    );
  }

  return (
    <FieldChrome as="div" className={surfaceClass.array}>
      <ul className={surfaceClass.arrayList}>
        {list.map((item, index) => (
          <li key={index} className={surfaceClass.arrayItem}>
            <Surface
              {...childSurfaceProps(String(index), items, item, mode, view)}
            />
          </li>
        ))}
      </ul>
    </FieldChrome>
  );
}

/** Input: field name, seed empty arrays, add/remove item Surfaces. */
export function ArrayInput({
  id,
  data,
  mode,
  view,
}: SurfaceProps): ReactElement | null {
  const { schema, Surface, entry, dataApi } = useSurface();
  const fieldNameToLabel = useFieldNameToLabel();
  if (Surface === undefined || schema === undefined) return null;

  const items = schema.items;
  if (!isRecord(items)) return null;

  const minItems = typeof schema.minItems === "number" ? schema.minItems : 0;
  const maxItems =
    typeof schema.maxItems === "number" ? schema.maxItems : undefined;
  const itemLabel = itemNoun(id, entry?.itemLabel, fieldNameToLabel);
  const addCaption = resolveAddCaption(entry?.addLabel, dataApi?.data ?? data);

  const list = listFromData(dataApi?.data ?? data, schema);

  function write(next: unknown[]): void {
    dataApi?.setData(next);
  }

  return (
    <FieldChrome as="div" className={surfaceClass.array}>
      <ul className={surfaceClass.arrayList}>
        {list.map((item, index) => (
          <li key={index} className={surfaceClass.arrayItem}>
            <Surface
              {...childSurfaceProps(String(index), items, item, mode, view)}
            />
            <IconButton
              kind="remove"
              label={`Remove ${itemLabel}`}
              disabled={list.length <= minItems}
              onClick={() => {
                write(list.filter((_, i) => i !== index));
              }}
            >
              <TrashIcon />
            </IconButton>
          </li>
        ))}
      </ul>
      <IconButton
        kind="add"
        label={addCaption.length > 0 ? addCaption : `Add ${itemLabel}`}
        caption={addCaption}
        disabled={maxItems !== undefined && list.length >= maxItems}
        onClick={() => {
          write([...list, undefined]);
        }}
      >
        <PlusIcon />
      </IconButton>
    </FieldChrome>
  );
}
