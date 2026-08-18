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
import { useSeedSchemaValue } from "./seed-schema-value.js";

export function StringInput({ id, data }: SurfaceProps): ReactElement {
  const { schema, entry, dataApi, validity, formSubmitted } = useSurface();
  useSeedSchemaValue();
  const { required } = useFieldMeta();
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
  const isDateTime = constraints.type === "datetime-local";
  const raw = typeof data === "string" ? data : "";
  const value = isDateTime ? toDatetimeLocalValue(raw) : raw;

  if (entry?.hidden === true) {
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
      <input
        {...constraints}
        {...a11y}
        className={sx(
          surfaceClass.control,
          error.length > 0 ? surfaceClass.invalid : undefined,
        )}
        name={id}
        required={required}
        value={value}
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

export function StringDisplay({ data }: SurfaceProps): ReactElement {
  return (
    <FieldChrome as="div">
      <span className={surfaceClass.value}>
        {typeof data === "string" ? data : ""}
      </span>
    </FieldChrome>
  );
}
