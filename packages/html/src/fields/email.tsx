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
import { FieldError } from "./field-error.js";
import { useFieldMeta } from "./field-meta.js";
import { optionString } from "./option-expr.js";
import { widgetBag } from "./widget-bag.js";
import type { WidgetProps } from "./widget-props.js";

/**
 * Default-kit email widget (`name: "email"` / `$kind` …#/$defs/email).
 * Display: `<a href="mailto:…">`.
 */

type EmailFieldProps = WidgetProps<string> & {
  readonly minLength?: number | undefined;
  readonly maxLength?: number | undefined;
  readonly pattern?: string | undefined;
};

/** Presentational mailto: display. No `useSurface`. */
export function EmailValue({ value }: WidgetProps<string>): ReactElement {
  const email = typeof value === "string" ? value.trim() : "";
  if (email.length === 0) {
    return <span className={surfaceClass.value}>—</span>;
  }
  return (
    <a className={surfaceClass.email} href={`mailto:${email}`}>
      {email}
    </a>
  );
}

/** Presentational email control. No `useSurface`. */
export function EmailField({
  value,
  widget,
  disabled,
  required,
  invalid,
  controlId,
  name,
  describedBy,
  minLength,
  maxLength,
  pattern,
  onChange,
  onBlur,
}: EmailFieldProps): ReactElement {
  const placeholder = optionString(widget, "placeholder");
  const autocomplete = optionString(widget, "autocomplete");
  return (
    <input
      type="email"
      className={sx(
        surfaceClass.control,
        invalid === true ? surfaceClass.invalid : undefined,
      )}
      id={controlId}
      name={name}
      required={required}
      disabled={disabled}
      value={typeof value === "string" ? value : ""}
      {...(invalid === true ? { "aria-invalid": true } : {})}
      {...(describedBy !== undefined ? { "aria-describedby": describedBy } : {})}
      {...(placeholder !== undefined ? { placeholder } : {})}
      {...(autocomplete !== undefined ? { autoComplete: autocomplete } : {})}
      {...(minLength !== undefined ? { minLength } : {})}
      {...(maxLength !== undefined ? { maxLength } : {})}
      {...(pattern !== undefined ? { pattern } : {})}
      onInput={(event) => {
        onChange?.(event.currentTarget.value);
      }}
      onBlur={onBlur}
    />
  );
}

export function EmailDisplay(_props: SurfaceProps): ReactElement {
  const { data, id, entry } = useSurface();
  return (
    <FieldChrome as="div" className={surfaceClass.emailHost}>
      <EmailValue
        value={typeof data === "string" ? data : undefined}
        widget={widgetBag(entry?.widget)}
        controlId={fieldControlDomId(id)}
      />
    </FieldChrome>
  );
}

export function EmailInput(_props: SurfaceProps): ReactElement {
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

  return (
    <FieldChrome as="div" className={surfaceClass.emailHost}>
      <EmailField
        value={typeof data === "string" ? data : undefined}
        widget={params}
        required={required}
        invalid={error.length > 0}
        controlId={controlDomId}
        name={id}
        describedBy={a11y["aria-describedby"]}
        minLength={constraints.minLength}
        maxLength={constraints.maxLength}
        pattern={constraints.pattern}
        onChange={(next) => {
          setChanged(true);
          dataApi?.setData(next ?? "");
        }}
        onBlur={() => {
          setBlurred(true);
        }}
      />
      <FieldError controlDomId={controlDomId} message={error} />
    </FieldChrome>
  );
}
