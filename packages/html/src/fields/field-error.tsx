import type { ReactElement } from "react";
import { surfaceClass } from "../classes.js";
import { fieldErrorDomId } from "./channel-errors.js";

/** Inline channel error under a control; id matches `aria-describedby`. */
export function FieldError({
  controlDomId,
  message,
}: {
  readonly controlDomId: string;
  readonly message: string;
}): ReactElement | null {
  if (message.length === 0) return null;
  return (
    <span
      id={fieldErrorDomId(controlDomId)}
      className={surfaceClass.error}
      role="alert"
    >
      {message}
    </span>
  );
}
