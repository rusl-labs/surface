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
import { stringInputProps } from "./constraints.js";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "./datetime.js";
import { FieldError } from "./field-error.js";
import { useFieldMeta } from "./field-meta.js";
import { optionString } from "./option-expr.js";
import { widgetBag } from "./widget-bag.js";
import { useHtmlKitConfig, useKitLocale } from "../kit-config.js";

/**
 * Generic / date / datetime string controls driven by widget bag or forced type.
 * Used for default-kit `#/$defs/input`, `date`, `datetime`.
 */

function TypedStringInput({
  forcedType,
}: {
  readonly forcedType?: "text" | "date" | "datetime-local" | "password";
}): ReactElement {
  const { id, data, schema, dataApi, validity, formSubmitted, entry } =
    useSurface();
  const { required } = useFieldMeta();
  const params = widgetBag(entry?.widget);
  const constraints = stringInputProps(schema);
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

  const widgetType = optionString(params, "type");
  const inputType =
    forcedType ??
    (widgetType === "password" ||
    widgetType === "email" ||
    widgetType === "search" ||
    widgetType === "tel" ||
    widgetType === "url" ||
    widgetType === "text" ||
    widgetType === "date" ||
    widgetType === "datetime-local"
      ? widgetType
      : constraints.type === "datetime-local"
        ? "datetime-local"
        : constraints.type === "email"
          ? "email"
          : "text");

  const isDateTime = inputType === "datetime-local";
  const raw = typeof data === "string" ? data : "";
  const value = isDateTime ? toDatetimeLocalValue(raw) : raw;
  const placeholder = optionString(params, "placeholder");
  const autocomplete = optionString(params, "autocomplete");

  return (
    <FieldChrome>
      <input
        {...constraints}
        {...a11y}
        type={inputType}
        className={sx(
          surfaceClass.control,
          error.length > 0 ? surfaceClass.invalid : undefined,
        )}
        name={id}
        required={required}
        value={value}
        {...(placeholder !== undefined ? { placeholder } : {})}
        {...(autocomplete !== undefined ? { autoComplete: autocomplete } : {})}
        onInput={(event) => {
          setChanged(true);
          const next = event.currentTarget.value;
          dataApi?.setData(
            isDateTime ? fromDatetimeLocalValue(next) : next,
          );
        }}
        onBlur={() => {
          setBlurred(true);
        }}
      />
      <FieldError controlDomId={controlDomId} message={error} />
    </FieldChrome>
  );
}

/** Human date for Display — never dump raw `2026-07-27T12:00:00Z`. */
function formatDisplayDate(
  raw: string,
  kind: "date" | "datetime",
  locale: string | undefined,
  dateStyle: "short" | "medium" | "long" | "full",
  timeStyle: "short" | "medium" | "long" | "full" | undefined,
): string {
  if (raw.length === 0) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return kind === "date" && raw.length >= 10 ? raw.slice(0, 10) : raw;
  }
  const options: Intl.DateTimeFormatOptions =
    kind === "datetime" && timeStyle !== undefined
      ? { dateStyle, timeStyle }
      : { dateStyle };
  return new Intl.DateTimeFormat(locale, options).format(date);
}

function TypedStringDisplay({
  kind,
}: {
  readonly kind?: "date" | "datetime";
}): ReactElement {
  const { data } = useSurface();
  const locale = useKitLocale();
  const dateDefaults = useHtmlKitConfig().date;
  const raw = typeof data === "string" ? data : "";
  const text =
    kind === "date" || kind === "datetime"
      ? formatDisplayDate(
          raw,
          kind,
          locale,
          dateDefaults?.dateStyle ?? "medium",
          kind === "datetime" ? (dateDefaults?.timeStyle ?? "short") : undefined,
        )
      : raw;
  return (
    <FieldChrome as="div">
      <span className={surfaceClass.value}>{text}</span>
    </FieldChrome>
  );
}

export function KitInputInput(_props: SurfaceProps): ReactElement {
  return <TypedStringInput />;
}

export function KitInputDisplay(_props: SurfaceProps): ReactElement {
  return <TypedStringDisplay />;
}

export function KitDateInput(_props: SurfaceProps): ReactElement {
  return <TypedStringInput forcedType="date" />;
}

export function KitDateDisplay(_props: SurfaceProps): ReactElement {
  return <TypedStringDisplay kind="date" />;
}

export function KitDateTimeInput(_props: SurfaceProps): ReactElement {
  return <TypedStringInput forcedType="datetime-local" />;
}

export function KitDateTimeDisplay(_props: SurfaceProps): ReactElement {
  return <TypedStringDisplay kind="datetime" />;
}
