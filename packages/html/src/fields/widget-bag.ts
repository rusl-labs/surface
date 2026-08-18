import type { AnnotationWidget } from "@rusl-labs/surface";
import { isRecord } from "./option-expr.js";

/**
 * Flatten a widget object for kit param lookup: nested `options` first, then
 * top-level properties (except name / $kind / options) win on key collision.
 * Matches "widget is open; $kind types the whole object."
 */
export function widgetBag(
  widget: AnnotationWidget | undefined,
): Record<string, unknown> {
  if (widget === undefined) return {};
  const nested = isRecord(widget.options) ? { ...widget.options } : {};
  const out: Record<string, unknown> = { ...nested };
  for (const [key, value] of Object.entries(widget)) {
    if (key === "name" || key === "$kind" || key === "options") continue;
    out[key] = value;
  }
  return out;
}

/** Read one param from the flattened widget bag. */
export function widgetParam(
  widget: AnnotationWidget | undefined,
  key: string,
): unknown {
  return widgetBag(widget)[key];
}
