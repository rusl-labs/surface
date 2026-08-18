import type { ReactElement } from "react";
import {
  useSurface,
  type AnnotationEntry,
  type SurfaceProps,
} from "@rusl-labs/surface";
import { surfaceClass } from "../classes.js";
import { FieldChrome } from "./chrome.js";
import { useSeedSchemaValue } from "./seed-schema-value.js";
import { constToFormValue } from "./shared.js";

/**
 * `$kind` is type metadata (self-id), not a form control. The HTML kit keeps it
 * out of the UI by default while still seeding/submitting the channel.
 *
 * Annotation opt-in to surface it (any of):
 * - `label` other than the property name `"$kind"`
 * - `description`
 * - `hidden: false`
 *
 * Annotation `hidden: true` (or stealth `$kind`) → real hidden control + seed.
 */
function stealthKind(
  id: string,
  entry: AnnotationEntry | undefined,
): boolean {
  if (id !== "$kind") return false;
  if (entry?.hidden === false) return false;
  if (entry?.description !== undefined) return false;
  if (entry?.label !== undefined && entry.label !== "$kind") return false;
  return true;
}

function isHiddenConst(
  id: string,
  entry: AnnotationEntry | undefined,
): boolean {
  if (entry?.hidden === true) return true;
  return stealthKind(id, entry);
}

/** Input: fixed const as a read-only field (value lives on the data channel). */
export function ConstInput({ id }: SurfaceProps): ReactElement {
  const { schema, entry } = useSurface();
  useSeedSchemaValue();
  const constValue = schema?.const;
  const display = constToFormValue(constValue);

  if (isHiddenConst(id, entry)) {
    return (
      <input
        type="hidden"
        className={surfaceClass.hidden}
        name={id}
        value={display}
        readOnly
      />
    );
  }

  return (
    <FieldChrome>
      <input
        type="text"
        className={surfaceClass.control}
        name={id}
        value={display}
        readOnly
      />
    </FieldChrome>
  );
}

/** Display: field name + const value (or nothing for stealth `$kind` / hidden). */
export function ConstDisplay({ id }: SurfaceProps): ReactElement | null {
  const { schema, entry } = useSurface();
  if (isHiddenConst(id, entry)) return null;

  const value = constToFormValue(schema?.const);
  return (
    <FieldChrome as="div">
      <span className={surfaceClass.value}>{value}</span>
    </FieldChrome>
  );
}
