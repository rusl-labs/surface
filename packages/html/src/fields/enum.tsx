import { useState, type ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { surfaceClass, sx } from "../classes.js";
import {
  controlValidityA11y,
  fieldControlDomId,
  firstIssueMessage,
  visibleFieldIssues,
} from "./channel-errors.js";
import { FieldChrome } from "./chrome.js";
import { FieldError } from "./field-error.js";
import { useFieldMeta } from "./field-meta.js";
import { useSeedSchemaValue } from "./seed-schema-value.js";

function enumOptions(schema: Record<string, unknown> | undefined): unknown[] {
  return Array.isArray(schema?.enum) ? [...schema.enum] : [];
}

function optionKey(value: unknown, index: number): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";
  return `opt-${index}`;
}

function optionLabel(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";
  return JSON.stringify(value);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a === "object" || typeof b === "object") {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

/** Input: JSON Schema `enum` as a native select. */
export function EnumInput({ id, data }: SurfaceProps): ReactElement {
  const { schema, entry, dataApi, validity, formSubmitted } = useSurface();
  useSeedSchemaValue();
  const { required } = useFieldMeta();
  const options = enumOptions(schema);
  const [changed, setChanged] = useState(false);
  const [blurred, setBlurred] = useState(false);

  const issues = visibleFieldIssues(validity, {
    formSubmitted,
    changed,
    blurred,
  });
  const error = firstIssueMessage(issues);
  const controlDomId = fieldControlDomId(id);
  const a11y = controlValidityA11y(controlDomId, error);

  const selectedIndex = options.findIndex((opt) => valuesEqual(opt, data));
  const selectValue =
    selectedIndex >= 0 ? optionKey(options[selectedIndex], selectedIndex) : "";

  if (entry?.hidden === true) {
    const raw =
      data === undefined || data === null
        ? ""
        : typeof data === "string" ||
            typeof data === "number" ||
            typeof data === "boolean"
          ? String(data)
          : JSON.stringify(data);
    return (
      <input
        type="hidden"
        className={surfaceClass.hidden}
        name={id}
        value={raw}
        readOnly
      />
    );
  }

  return (
    <FieldChrome>
      <select
        {...a11y}
        className={sx(
          surfaceClass.control,
          surfaceClass.select,
          error.length > 0 ? surfaceClass.invalid : undefined,
        )}
        name={id}
        required={required}
        value={selectValue}
        onChange={(event) => {
          setChanged(true);
          const key = event.currentTarget.value;
          if (key.length === 0) {
            dataApi?.setData(undefined);
            return;
          }
          const index = options.findIndex(
            (opt, i) => optionKey(opt, i) === key,
          );
          if (index >= 0) dataApi?.setData(options[index]);
        }}
        onBlur={() => {
          setBlurred(true);
        }}
      >
        {/* Empty option so optional enums can be cleared / unset shown. */}
        <option value="">{required ? "Select…" : ""}</option>
        {options.map((opt, index) => (
          <option key={optionKey(opt, index)} value={optionKey(opt, index)}>
            {optionLabel(opt)}
          </option>
        ))}
      </select>
      <FieldError controlDomId={controlDomId} message={error} />
    </FieldChrome>
  );
}

export function EnumDisplay({ data }: SurfaceProps): ReactElement {
  return (
    <FieldChrome as="div">
      <span className={surfaceClass.value}>
        {data === undefined || data === null ? "" : optionLabel(data)}
      </span>
    </FieldChrome>
  );
}
