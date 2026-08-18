import type {
  SurfaceCoordinate,
  SurfaceMode,
  SurfaceViewName,
} from "./kit.js";
import type {
  AnnotationDocument,
  AnnotationEntry,
  AnnotationWidget,
  Schema,
  SurfaceProps,
} from "./types.js";

/** Keys that merge as decoration (layout is never inherited across views). */
const DECORATION_KEYS = [
  "label",
  "description",
  "hidden",
  "omit",
  "view",
  "itemLabel",
  "addLabel",
  "widget",
] as const;

type Decoration = {
  readonly label?: string;
  readonly description?: string;
  readonly hidden?: boolean;
  readonly omit?: boolean;
  readonly view?: string;
  readonly itemLabel?: string;
  readonly addLabel?: string;
  readonly widget?: AnnotationWidget;
};

/** How bound fields are chrome'd in a view or section body. */
export type FieldLayout = "props" | "stack";

/** Flow direction of a view or section body. */
export type FieldDirection = "vertical" | "horizontal";

/**
 * Effective presentation children for one object node.
 * Matches the design kit snippet: field | section | heading | template.
 */
export type FieldChild =
  | {
      readonly kind: "field";
      readonly key: string;
      readonly label: string;
      readonly hidden?: boolean;
      readonly entry?: AnnotationEntry;
      readonly surface: SurfaceProps;
    }
  | {
      readonly kind: "section";
      readonly key: string;
      /** Empty string = anonymous group (no heading). */
      readonly label: string;
      readonly description?: string;
      readonly layout?: FieldLayout;
      readonly direction?: FieldDirection;
      /** Nested yields (already computed; call returns the same list). */
      readonly children: () => readonly FieldChild[];
    }
  | {
      readonly kind: "heading";
      readonly key: string;
      readonly label: string;
    }
  | {
      readonly kind: "template";
      readonly key: string;
      /** Pre-interpolated plain text (React will escape on render). */
      readonly text: string;
    }
  | {
      readonly kind: "block" | "banner" | "span";
      readonly key: string;
      readonly label?: string;
      readonly description?: string;
      readonly layout?: FieldLayout;
      readonly direction?: FieldDirection;
      /** Pre-interpolated prose when the entry carries `template`. */
      readonly text?: string;
      readonly children: () => readonly FieldChild[];
    };
export interface ListFieldsInput {
  readonly schema: Schema;
  readonly data?: unknown;
  readonly annotation?: AnnotationDocument;
  readonly coordinate?: SurfaceCoordinate;
  readonly mode: SurfaceMode;
  readonly view: SurfaceViewName;
  readonly document?: Schema;
  readonly documentUri?: string;
}

export interface ResolveEntryInput {
  readonly annotation?: AnnotationDocument;
  readonly coordinate?: SurfaceCoordinate;
  readonly view: SurfaceViewName;
  readonly mode: SurfaceMode;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseFieldLayout(value: unknown): FieldLayout | undefined {
  return value === "props" || value === "stack" ? value : undefined;
}

export function parseFieldDirection(value: unknown): FieldDirection | undefined {
  return value === "vertical" || value === "horizontal" ? value : undefined;
}

export function propertyMap(schema: Schema): Record<string, Schema> {
  const properties = schema.properties;
  if (!isRecord(properties)) return {};
  const out: Record<string, Schema> = {};
  for (const [name, prop] of Object.entries(properties)) {
    if (isRecord(prop)) out[name] = prop as Schema;
  }
  return out;
}

export function propertyOrder(schema: Schema): string[] {
  const properties = schema.properties;
  if (!isRecord(properties)) return [];
  return Object.keys(properties);
}

/** Views block for this annotation scope (root or `#/$defs/<name>`). */
export function viewsForSubject(
  annotation: AnnotationDocument | undefined,
  subject: string | undefined,
): Record<string, unknown> | undefined {
  if (annotation === undefined || subject === undefined) return undefined;
  const defMatch = subject.match(/#\/\$defs\/([^/]+)$/);
  if (defMatch !== null) {
    const block = annotation.defs?.[defMatch[1]!];
    if (!isRecord(block)) return undefined;
    const views = block.views;
    return isRecord(views) ? views : undefined;
  }
  return annotation.views;
}

/** Layout view: named view if it has fields, else default. */
export function layoutView(
  views: Record<string, unknown> | undefined,
  view: SurfaceViewName,
): Record<string, unknown> | undefined {
  if (views === undefined) return undefined;
  const named = views[view];
  if (isRecord(named) && Array.isArray(named.fields)) return named;
  const dflt = views.default;
  if (isRecord(dflt) && Array.isArray(dflt.fields)) return dflt;
  return undefined;
}

/**
 * Map entry-identity chains → raw entries for decoration merge.
 * Virtuals (sections) are transparent.
 */
export function decorationMap(
  view: Record<string, unknown> | undefined,
): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  function walk(list: unknown, chain: string[]): void {
    if (!Array.isArray(list)) return;
    for (const raw of list) {
      if (!isRecord(raw)) continue;
      if (typeof raw.name === "string") {
        map.set([...chain, raw.name].join("/"), raw);
        if (Array.isArray(raw.fields)) walk(raw.fields, [...chain, raw.name]);
      } else if (Array.isArray(raw.fields)) {
        walk(raw.fields, chain);
      }
    }
  }
  if (view !== undefined) walk(view.fields, []);
  return map;
}

export function chainKey(path: readonly string[], name: string): string {
  return [...path, name].join("/");
}

/**
 * Merge decoration: default-view inherit → layout entry → default mode
 * sub-entry → layout mode sub-entry. `null` clears.
 */
export function effectiveDecoration(
  entry: Record<string, unknown> | undefined,
  key: string,
  defaults: Map<string, Record<string, unknown>>,
  mode: SurfaceMode,
): Decoration {
  const inherit = defaults.get(key);
  const out: {
    -readonly [K in keyof Decoration]?: Decoration[K];
  } = {};

  for (const k of DECORATION_KEYS) {
    let v: unknown =
      inherit !== undefined && inherit[k] !== undefined ? inherit[k] : undefined;
    if (entry !== undefined && entry[k] !== undefined) v = entry[k];

    const modeInherit = isRecord(inherit?.[mode])
      ? (inherit[mode] as Record<string, unknown>)
      : undefined;
    const modeEntry = isRecord(entry?.[mode])
      ? (entry[mode] as Record<string, unknown>)
      : undefined;
    if (
      modeInherit !== undefined &&
      modeInherit[k] !== undefined &&
      !(modeEntry !== undefined && modeEntry[k] !== undefined)
    ) {
      v = modeInherit[k];
    }
    if (modeEntry !== undefined && modeEntry[k] !== undefined) {
      v = modeEntry[k];
    }

    if (v === null || v === undefined) continue;
    switch (k) {
      case "widget":
        // Preserve the whole object (additionalProperties). Only require `name`.
        if (isRecord(v) && typeof v.name === "string" && v.name.length > 0) {
          out.widget = { ...v, name: v.name } as AnnotationWidget;
        }
        break;
      case "hidden":
      case "omit":
        if (typeof v === "boolean") out[k] = v;
        break;
      case "label":
      case "description":
      case "view":
      case "itemLabel":
      case "addLabel":
        if (typeof v === "string") out[k] = v;
        break;
    }
  }
  return out;
}

export function toResolvedEntry(decor: Decoration): AnnotationEntry | undefined {
  const entry: {
    -readonly [K in keyof AnnotationEntry]?: AnnotationEntry[K];
  } = {};
  if (decor.label !== undefined) entry.label = decor.label;
  if (decor.description !== undefined) entry.description = decor.description;
  if (decor.hidden !== undefined) entry.hidden = decor.hidden;
  if (decor.omit !== undefined) entry.omit = decor.omit;
  if (decor.view !== undefined) entry.view = decor.view;
  if (decor.itemLabel !== undefined) entry.itemLabel = decor.itemLabel;
  if (decor.addLabel !== undefined) entry.addLabel = decor.addLabel;
  if (decor.widget !== undefined) entry.widget = decor.widget;
  return Object.keys(entry).length > 0 ? entry : undefined;
}

/**
 * Ref-label fallback: use-site label → target view label → schema title → name.
 * Non-ref properties: use-site label → property name.
 */
export function fieldLabel(
  name: string,
  decor: Decoration,
  propSchema: Schema,
  annotation: AnnotationDocument | undefined,
  childView: SurfaceViewName,
): string {
  if (decor.label !== undefined) return decor.label;

  const ref = typeof propSchema.$ref === "string" ? propSchema.$ref : undefined;
  if (ref !== undefined) {
    const defMatch = ref.match(/^#\/\$defs\/([^/]+)$/);
    if (defMatch !== null && annotation !== undefined) {
      const block = annotation.defs?.[defMatch[1]!];
      if (isRecord(block) && isRecord(block.views)) {
        const named = block.views[childView];
        const dflt = block.views.default;
        const viewRec = isRecord(named) ? named : isRecord(dflt) ? dflt : undefined;
        if (viewRec !== undefined && typeof viewRec.label === "string") {
          return viewRec.label;
        }
      }
    }
    // External $ref: target view label needs the target document — not available
    // here without the schema resolver. Schema title on the $ref wrapper is rare;
    // fall through to the property name.
    if (typeof propSchema.title === "string") return propSchema.title;
  }

  return name;
}

export function childSurface(
  name: string,
  propSchema: Schema,
  data: unknown,
  mode: SurfaceMode,
  view: SurfaceViewName,
  coordinate: SurfaceCoordinate | undefined,
  document: Schema | undefined,
  documentUri: string | undefined,
  entry: AnnotationEntry | undefined,
): SurfaceProps {
  return {
    id: name,
    schema: propSchema,
    mode,
    view,
    ...(data !== undefined ? { data } : {}),
    ...(document !== undefined ? { document } : {}),
    ...(documentUri !== undefined ? { documentUri } : {}),
    ...(coordinate !== undefined ? { coordinate } : {}),
    ...(entry !== undefined ? { entry } : {}),
  };
}

export function emitField(
  name: string,
  propSchema: Schema,
  decor: Decoration,
  objectData: Record<string, unknown> | undefined,
  path: readonly string[],
  subject: string | undefined,
  mode: SurfaceMode,
  parentView: SurfaceViewName,
  document: Schema | undefined,
  documentUri: string | undefined,
  annotation: AnnotationDocument | undefined,
): FieldChild | undefined {
  if (decor.omit === true) return undefined;
  const childView =
    typeof decor.view === "string" ? decor.view : parentView;
  const label = fieldLabel(name, decor, propSchema, annotation, childView);
  // Effective label lives on the entry so helpers.label() matches FieldChild.label.
  const base = toResolvedEntry(decor);
  const entry: AnnotationEntry = {
    ...(base ?? {}),
    label,
    ...(decor.hidden === true ? { hidden: true } : {}),
  };
  const coordinate = childCoordinate(
    subject,
    path,
    name,
    propSchema,
    documentUri,
  );
  return {
    kind: "field",
    key: name,
    label,
    ...(decor.hidden === true ? { hidden: true } : {}),
    entry,
    surface: childSurface(
      name,
      propSchema,
      objectData?.[name],
      mode,
      childView,
      coordinate,
      document,
      documentUri,
      entry,
    ),
  };
}

/**
 * Coordinate for a yielded child. Internal `#/$defs/<name>` (and absolute
 * refs into a def) re-root the annotation scope so the child reads
 * `defs.<name>`; other properties extend the parent path.
 */
export function childCoordinate(
  subject: string | undefined,
  path: readonly string[],
  name: string,
  propSchema: Schema,
  documentUri: string | undefined,
): SurfaceCoordinate | undefined {
  const ref = typeof propSchema.$ref === "string" ? propSchema.$ref : undefined;
  if (ref !== undefined) {
    const relativeDef = ref.match(/^#\/\$defs\/([^/]+)$/);
    if (relativeDef !== null) {
      const base =
        documentUri ??
        (subject !== undefined ? subject.replace(/#.*$/, "") : undefined);
      if (base !== undefined && base.length > 0) {
        return { subject: `${base}#/$defs/${relativeDef[1]}`, path: [] };
      }
    }
    if (/^.*#\/\$defs\/[^/]+$/.test(ref)) {
      return { subject: ref, path: [] };
    }
    if (!ref.startsWith("#")) {
      return { subject: ref.replace(/#.*$/, "") || ref, path: [] };
    }
  }
  if (subject === undefined) return undefined;
  return { subject, path: [...path, name] };
}

export function markListed(list: unknown, listed: Set<string>): void {
  if (!Array.isArray(list)) return;
  for (const raw of list) {
    if (!isRecord(raw)) continue;
    if (typeof raw.name === "string") listed.add(raw.name);
    else if (Array.isArray(raw.fields)) markListed(raw.fields, listed);
  }
}

/** `{{a.b}}` over the containing object; missing segments → empty. */
export function interpolateTemplate(
  template: string,
  data: Record<string, unknown> | undefined,
): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (_match, path: string) => {
    let cur: unknown = data;
    for (const seg of path.split(".")) {
      if (!isRecord(cur) || !(seg in cur)) return "";
      cur = cur[seg];
    }
    if (cur === undefined || cur === null) return "";
    return String(cur);
  });
}

export function emitRest(
  properties: Record<string, Schema>,
  order: string[],
  listed: Set<string>,
  defaults: Map<string, Record<string, unknown>>,
  path: readonly string[],
  subject: string | undefined,
  objectData: Record<string, unknown> | undefined,
  mode: SurfaceMode,
  view: SurfaceViewName,
  document: Schema | undefined,
  documentUri: string | undefined,
  annotation: AnnotationDocument | undefined,
  restPolicy: "append" | "omit",
): FieldChild[] {
  if (restPolicy === "omit") return [];
  const out: FieldChild[] = [];
  for (const name of order) {
    if (listed.has(name)) continue;
    const propSchema = properties[name];
    if (propSchema === undefined) continue;
    const decor = effectiveDecoration(
      undefined,
      chainKey(path, name),
      defaults,
      mode,
    );
    const field = emitField(
      name,
      propSchema,
      decor,
      objectData,
      path,
      subject,
      mode,
      view,
      document,
      documentUri,
      annotation,
    );
    if (field !== undefined) out.push(field);
  }
  return out;
}


export function nestedEntryLayout(
  views: Record<string, unknown> | undefined,
  view: SurfaceViewName,
  path: readonly string[],
): Record<string, unknown> | undefined {
  if (path.length === 0 || views === undefined) return undefined;
  const layout = layoutView(views, view);
  if (layout === undefined) return undefined;
  const map = decorationMap(layout);
  const raw = map.get(path.join("/"));
  if (raw === undefined || !Array.isArray(raw.fields)) return undefined;
  return {
    fields: raw.fields,
    ...(raw.rest === "omit" || raw.rest === "append" ? { rest: raw.rest } : {}),
  };
}

/**
 * Resolve the effective annotation entry for a node (after view + mode merge).
 * Root paths (`path: []`) have no bound entry.
 */
