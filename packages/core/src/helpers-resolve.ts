import type { SurfaceCoordinate, SurfaceViewName } from "./kit.js";
import type {
  AnnotationDocument,
  AnnotationEntry,
  Schema,
} from "./types.js";
import type {
  FieldDirection,
  FieldLayout,
  ResolveEntryInput,
} from "./helpers-shared.js";
import {
  chainKey,
  decorationMap,
  effectiveDecoration,
  isRecord,
  layoutView,
  parseFieldDirection,
  parseFieldLayout,
  toResolvedEntry,
  viewsForSubject,
} from "./helpers-shared.js";

export function resolveAnnotationEntry(
  input: ResolveEntryInput,
): AnnotationEntry | undefined {
  const { annotation, coordinate, view, mode } = input;
  if (annotation === undefined || coordinate === undefined) return undefined;
  const path = coordinate.path;
  if (path.length === 0) return undefined;

  const views = viewsForSubject(annotation, coordinate.subject);
  const defaultView = isRecord(views?.default) ? views.default : undefined;
  const layout = layoutView(views, view);
  const defaults = decorationMap(defaultView);

  // Walk the layout list to find the raw entry for the last path segment,
  // with identity chain for decoration merge.
  const name = path[path.length - 1]!;
  const parentPath = path.slice(0, -1);
  const key = chainKey(parentPath, name);

  // Prefer the layout view's entry; decorationMap already flattened identities.
  const layoutMap = decorationMap(layout);
  const raw = layoutMap.get(key) ?? defaults.get(key);
  if (raw === undefined && !defaults.has(key)) return undefined;

  return toResolvedEntry(effectiveDecoration(raw, key, defaults, mode));
}

/** View-level chrome for a subject scope (path []). */
export function resolveViewChrome(input: {
  readonly annotation?: AnnotationDocument;
  readonly coordinate?: SurfaceCoordinate;
  readonly view: SurfaceViewName;
}): {
  readonly label?: string;
  readonly description?: string;
  readonly layout?: FieldLayout;
  readonly direction?: FieldDirection;
} {
  const { annotation, coordinate, view } = input;
  if (annotation === undefined || coordinate === undefined) return {};
  if (coordinate.path.length > 0) return {};
  const views = viewsForSubject(annotation, coordinate.subject);
  const block = layoutView(views, view);
  if (block === undefined) return {};
  const fieldLayout = parseFieldLayout(block.layout);
  const fieldDirection = parseFieldDirection(block.direction);
  return {
    ...(typeof block.label === "string" ? { label: block.label } : {}),
    ...(typeof block.description === "string"
      ? { description: block.description }
      : {}),
    ...(fieldLayout !== undefined ? { layout: fieldLayout } : {}),
    ...(fieldDirection !== undefined ? { direction: fieldDirection } : {}),
  };
}

/**
 * Label for the current node:
 * entry label → view label (subject root) → schema title (URI) / property name.
 */
export function resolveLabel(input: {
  readonly id: string;
  readonly schema?: Schema;
  readonly entry?: AnnotationEntry;
  readonly annotation?: AnnotationDocument;
  readonly coordinate?: SurfaceCoordinate;
  readonly view?: SurfaceViewName;
}): string {
  if (input.entry?.label !== undefined) return input.entry.label;
  if (input.view !== undefined) {
    const chrome = resolveViewChrome({
      view: input.view,
      ...(input.annotation !== undefined ? { annotation: input.annotation } : {}),
      ...(input.coordinate !== undefined ? { coordinate: input.coordinate } : {}),
    });
    if (chrome.label !== undefined) return chrome.label;
  }
  const id = input.id;
  if (id.includes("://") || id.startsWith("urn:")) {
    return typeof input.schema?.title === "string" ? input.schema.title : "";
  }
  if (id.length === 0) return "";
  if (/^(allOf|anyOf|oneOf|union):\d+$/.test(id) || /^\d+$/.test(id)) return "";
  return id;
}

/** Description for the current node: entry, else view chrome at subject root. */
export function resolveDescription(input: {
  readonly entry?: AnnotationEntry;
  readonly annotation?: AnnotationDocument;
  readonly coordinate?: SurfaceCoordinate;
  readonly view?: SurfaceViewName;
}): string {
  if (input.entry?.description !== undefined) return input.entry.description;
  if (input.view === undefined) return "";
  const chrome = resolveViewChrome({
    view: input.view,
    ...(input.annotation !== undefined ? { annotation: input.annotation } : {}),
    ...(input.coordinate !== undefined ? { coordinate: input.coordinate } : {}),
  });
  return chrome.description ?? "";
}
