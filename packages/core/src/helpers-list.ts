import type { SurfaceMode, SurfaceViewName } from "./kit.js";
import type { AnnotationDocument, Schema } from "./types.js";
import type { FieldChild, ListFieldsInput } from "./helpers-shared.js";
import {
  chainKey,
  decorationMap,
  effectiveDecoration,
  emitField,
  emitRest,
  interpolateTemplate,
  isRecord,
  layoutView,
  markListed,
  nestedEntryLayout,
  parseFieldDirection,
  parseFieldLayout,
  propertyMap,
  propertyOrder,
  viewsForSubject,
} from "./helpers-shared.js";

function walkList(
  list: unknown,
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
  restPolicy: "append" | "omit" | null,
  restEmitted: { value: boolean },
): FieldChild[] {
  const out: FieldChild[] = [];
  if (!Array.isArray(list)) return out;

  for (const raw of list) {
    if (!isRecord(raw)) continue;

    // Rest slot
    if (raw.rest === true) {
      restEmitted.value = true;
      if (restPolicy !== null) {
        out.push(
          ...emitRest(
            properties,
            order,
            listed,
            defaults,
            path,
            subject,
            objectData,
            mode,
            view,
            document,
            documentUri,
            annotation,
            restPolicy,
          ),
        );
      }
      continue;
    }

    // Structural chrome: block | banner | span (discriminated by kind)
    if (
      raw.kind === "block" ||
      raw.kind === "banner" ||
      raw.kind === "span"
    ) {
      const decor = effectiveDecoration(raw, "", defaults, mode);
      if (decor.omit === true) continue;
      if (Array.isArray(raw.fields)) markListed(raw.fields, listed);
      const nested = Array.isArray(raw.fields)
        ? walkList(
            raw.fields,
            properties,
            order,
            listed,
            defaults,
            path,
            subject,
            objectData,
            mode,
            view,
            document,
            documentUri,
            annotation,
            restPolicy,
            restEmitted,
          )
        : [];
      const text =
        typeof raw.template === "string"
          ? interpolateTemplate(raw.template, objectData)
          : undefined;
      if (nested.length === 0 && (text === undefined || text.length === 0)) {
        continue;
      }
      const nestedFrozen = nested;
      const chromeLayout = parseFieldLayout(raw.layout);
      const chromeDirection = parseFieldDirection(raw.direction);
      out.push({
        kind: raw.kind,
        key: `${raw.kind}:${out.length}`,
        ...(typeof decor.label === "string" ? { label: decor.label } : {}),
        ...(decor.description !== undefined
          ? { description: decor.description }
          : {}),
        ...(chromeLayout !== undefined ? { layout: chromeLayout } : {}),
        ...(chromeDirection !== undefined
          ? { direction: chromeDirection }
          : {}),
        ...(text !== undefined ? { text } : {}),
        children: () => nestedFrozen,
      });
      continue;
    }

    // Virtual entries — layout only (identity transparent for decoration maps).
    if (typeof raw.template === "string") {
      const decor = effectiveDecoration(raw, "", defaults, mode);
      if (decor.omit === true) continue;
      const text = interpolateTemplate(raw.template, objectData);
      out.push({
        kind: "template",
        key: `template:${out.length}`,
        text,
      });
      continue;
    }
    if (typeof raw.label === "string" && raw.name === undefined) {
      const decor = effectiveDecoration(raw, "", defaults, mode);
      if (decor.omit === true) continue;
      if (!Array.isArray(raw.fields)) {
        out.push({
          kind: "heading",
          key: `heading:${raw.label}:${out.length}`,
          label: raw.label,
        });
        continue;
      }
      // Section: rest policy stays live so a rest slot inside can place unlisted.
      markListed(raw.fields, listed);
      const nested = walkList(
        raw.fields,
        properties,
        order,
        listed,
        defaults,
        path,
        subject,
        objectData,
        mode,
        view,
        document,
        documentUri,
        annotation,
        restPolicy,
        restEmitted,
      );
      // Yield only when something renders or participates (hidden fields count).
      if (nested.length === 0) continue;
      const nestedFrozen = nested;
      const sectionLayout = parseFieldLayout(raw.layout);
      const sectionDirection = parseFieldDirection(raw.direction);
      out.push({
        kind: "section",
        key: `section:${raw.label}:${out.length}`,
        label: raw.label,
        ...(decor.description !== undefined
          ? { description: decor.description }
          : {}),
        ...(sectionLayout !== undefined ? { layout: sectionLayout } : {}),
        ...(sectionDirection !== undefined
          ? { direction: sectionDirection }
          : {}),
        children: () => nestedFrozen,
      });
      continue;
    }

    if (typeof raw.name !== "string") continue;
    // listed is pre-scanned for rest; still mark for nested section walks
    listed.add(raw.name);
    const propSchema = properties[raw.name];
    if (propSchema === undefined) continue; // unknown name — ignored

    const decor = effectiveDecoration(
      raw,
      chainKey(path, raw.name),
      defaults,
      mode,
    );
    const field = emitField(
      raw.name,
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

/**
 * Effective children for an object node, in presentation order.
 * Pure function — the React helpers bag closes over context and calls this.
 */
export function listFields(input: ListFieldsInput): FieldChild[] {
  const {
    schema,
    data,
    annotation,
    coordinate,
    mode,
    view,
    document,
    documentUri,
  } = input;

  const properties = propertyMap(schema);
  const order = propertyOrder(schema);
  const objectData = isRecord(data) ? data : undefined;
  const subject = coordinate?.subject;
  const path = coordinate?.path ?? [];
  const views = viewsForSubject(annotation, subject);
  const defaultView = isRecord(views?.default) ? views.default : undefined;
  const defaults = decorationMap(defaultView);

  // Subject / def roots (path []) use the view block. Nested objects only
  // inherit a layout when the bound entry itself carries `fields` — otherwise
  // fall through to schema order. Replaying the parent view here paints its
  // banners/templates against the child payload (e.g. " · " on nameComponents).
  const layout =
    path.length === 0
      ? layoutView(views, view)
      : nestedEntryLayout(views, view, path);

  if (layout === undefined) {
    return emitRest(
      properties,
      order,
      new Set(),
      defaults,
      path,
      subject,
      objectData,
      mode,
      view,
      document,
      documentUri,
      annotation,
      "append",
    );
  }

  const restPolicy: "append" | "omit" =
    layout.rest === "omit" ? "omit" : "append";
  // Unlisted = not named anywhere in this view's layout (pre-scan), not
  // "not yet visited" — so a rest slot mid-list doesn't re-emit later entries.
  const listed = new Set<string>();
  markListed(layout.fields, listed);
  const restEmitted = { value: false };
  const out = walkList(
    layout.fields,
    properties,
    order,
    listed,
    defaults,
    path,
    subject,
    objectData,
    mode,
    view,
    document,
    documentUri,
    annotation,
    restPolicy,
    restEmitted,
  );

  if (!restEmitted.value) {
    out.push(
      ...emitRest(
        properties,
        order,
        listed,
        defaults,
        path,
        subject,
        objectData,
        mode,
        view,
        document,
        documentUri,
        annotation,
        restPolicy,
      ),
    );
  }
  return out;
}

/**
 * When the coordinate path is non-empty, a bound entry at that path may carry
 * its own nested `fields` layout (literal object). Virtuals are transparent.
 */
