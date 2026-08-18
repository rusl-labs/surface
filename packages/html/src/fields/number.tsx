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
import { numberInputProps } from "./constraints.js";
import { FieldError } from "./field-error.js";
import { useFieldMeta } from "./field-meta.js";
import { useSeedSchemaValue } from "./seed-schema-value.js";
import { useKitLocale } from "../kit-config.js";

export function NumberInput({ id, data }: SurfaceProps): ReactElement {
  const { schema, entry, dataApi, validity, formSubmitted } = useSurface();
  useSeedSchemaValue();
  const { required } = useFieldMeta();
  const constraints = numberInputProps(schema);
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
  const value = typeof data === "number" && Number.isFinite(data) ? String(data) : "";

  if (entry?.hidden === true) {
    return (
      <input
        type="hidden"
        className={surfaceClass.hidden}
        name={id}
        value={value}
        readOnly
      />
    );
  }

  return (
    <FieldChrome>
      <input
        type="number"
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
          const raw = event.currentTarget.value;
          if (raw.length === 0) {
            dataApi?.setData(undefined);
            return;
          }
          const n = Number(raw);
          dataApi?.setData(Number.isFinite(n) ? n : raw);
        }}
        onBlur={() => {
          setBlurred(true);
        }}
      />
      <FieldError controlDomId={controlDomId} message={error} />
    </FieldChrome>
  );
}

export function NumberDisplay({ data }: SurfaceProps): ReactElement {
  const locale = useKitLocale();
  const text =
    typeof data === "number"
      ? new Intl.NumberFormat(locale).format(data)
      : "";
  return (
    <FieldChrome as="div">
      <span className={surfaceClass.value}>{text}</span>
    </FieldChrome>
  );
}
