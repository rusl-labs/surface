import { useState, type ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { surfaceClass, sx } from "../classes.js";
import { FieldChrome } from "./chrome.js";
import { optionString } from "./option-expr.js";
import { widgetBag } from "./widget-bag.js";

/**
 * Default-kit copy widget (`name: "copy"` / `$kind` …#/$defs/copy).
 * Shows the value plus a button that copies it to the clipboard.
 */

/** Stringify node data for display + clipboard. */
export function copyText(data: unknown): string {
  if (data === null || data === undefined) return "";
  if (typeof data === "string") return data;
  if (typeof data === "number" || typeof data === "boolean") {
    return String(data);
  }
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard !== undefined &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  return false;
}

function CopyControl({
  data,
  editable,
}: {
  readonly data: unknown;
  readonly editable: boolean;
}): ReactElement {
  const { dataApi, entry } = useSurface();
  const params = widgetBag(entry?.widget);
  const buttonLabel = optionString(params, "buttonLabel") ?? "Copy";
  const text = copyText(data);
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function onCopy(): Promise<void> {
    if (text.length === 0) return;
    const ok = await writeClipboard(text);
    setStatus(ok ? "copied" : "failed");
    window.setTimeout(() => {
      setStatus("idle");
    }, 1500);
  }

  return (
    <div className={surfaceClass.copyHost}>
      {editable ? (
        <input
          className={sx(surfaceClass.control, surfaceClass.copyValue)}
          type="text"
          value={typeof data === "string" ? data : text}
          onInput={(event) => {
            dataApi?.setData(event.currentTarget.value);
          }}
        />
      ) : (
        <span className={sx(surfaceClass.value, surfaceClass.copyValue)}>
          {text.length > 0 ? text : "—"}
        </span>
      )}
      <button
        type="button"
        className={sx(surfaceClass.button, surfaceClass.copyButton)}
        disabled={text.length === 0}
        onClick={() => {
          void onCopy();
        }}
      >
        {status === "copied"
          ? "Copied"
          : status === "failed"
            ? "Copy failed"
            : buttonLabel}
      </button>
    </div>
  );
}

export function CopyDisplay({ data }: SurfaceProps): ReactElement {
  return (
    <FieldChrome as="div">
      <CopyControl data={data} editable={false} />
    </FieldChrome>
  );
}

export function CopyInput({ data }: SurfaceProps): ReactElement {
  return (
    <FieldChrome as="div">
      <CopyControl data={data} editable={true} />
    </FieldChrome>
  );
}
