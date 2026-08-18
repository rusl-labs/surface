import type { ReactElement } from "react";
import type { SurfaceSubmitEvent } from "./data.js";
import type {
  SurfaceCoordinate,
  SurfaceKit,
  SurfaceMode,
  SurfaceViewName,
} from "./kit.js";
import type { SurfaceValidator, SurfaceValidity } from "./validity.js";

export type Schema = Record<string, unknown>;

/**
 * Kit-facing presentation attachment on an annotation entry.
 *
 * Core envelope: `name` required; optional `$kind` (absolute URI typing **this
 * whole object**), optional nested `options`, plus any additional properties
 * the kind or grab-bag author needs. Core does not interpret extras or validate
 * against `$kind` — it passes the object through on the entry / request.
 */
export type AnnotationWidget = {
  readonly name: string;
  readonly $kind?: string;
  readonly options?: Record<string, unknown>;
} & Record<string, unknown>;

/**
 * One annotation entry as resolved for a node (decoration after view + mode
 * merge). Layout keys (`fields`, `rest`, `items`) are not carried — helpers
 * read those from the document when yielding children.
 */
export interface AnnotationEntry {
  readonly label?: string;
  readonly description?: string;
  readonly hidden?: boolean;
  readonly omit?: boolean;
  readonly view?: string;
  readonly itemLabel?: string;
  readonly addLabel?: string;
  readonly widget?: AnnotationWidget;
}

/**
 * Presentation for one subject, per `annotation-format.schema.json`.
 * Views and defs stay opaque here; the field helpers consume them.
 */
export interface AnnotationDocument {
  readonly $schema?: string;
  readonly subject: string;
  /** Kit/library ids this annotation targets; tooling metadata only. */
  readonly targetLibraries?: readonly string[];
  readonly views?: Record<string, unknown>;
  readonly defs?: Record<string, unknown>;
}

export interface AnnotationResolver {
  /**
   * Resolve the annotation document for a subject, or `undefined` when the
   * subject has none. Layering is yours: serve — or merge overrides over —
   * a document for any subject, including schemas you don't own.
   */
  resolveAnnotation(subject: string): Promise<AnnotationDocument | undefined>;
}

export interface SchemaResolver {
  /**
   * Resolve a schema URI, including optional `#/$defs/...` fragments.
   * Returns the target schema node (the def, not necessarily the document root).
   */
  resolveSchema(uri: string): Promise<Schema | undefined>;
  /**
   * Load a whole schema document (no fragment application).
   * Used so relative `#/$defs/...` refs can resolve against the document.
   */
  resolveDocument?(documentUri: string): Promise<Schema | undefined>;
}

export interface SurfaceUiOptions {
  readonly schemaResolver: SchemaResolver;
  /** Omit for an un-annotated UI — every node then renders on kit defaults. */
  readonly annotationResolver?: AnnotationResolver;
  /**
   * Required. App-supplied adapter for instance validation (AJV, Zod, remote…).
   * Unaware of React context — callers pass `{ id, schema, data }` explicitly.
   */
  readonly validator: SurfaceValidator;
  readonly kit: SurfaceKit;
}

/** Props for one mounted Surface (and for kit renderers). */
export interface SurfaceProps {
  readonly id: string;
  /**
   * Inline schema for this node. May be a `$ref` wrapper — Surface resolves
   * it against {@link document} / {@link documentUri} or via the resolver.
   */
  readonly schema?: Schema;
  /** Schema document used to resolve relative `#/...` refs. */
  readonly document?: Schema;
  /** Absolute URI of {@link document} (no fragment). */
  readonly documentUri?: string;
  /**
   * Current value. Optional for input create flows; typically present for
   * display and input edit.
   */
  readonly data?: unknown;
  readonly mode?: SurfaceMode;
  /** Kit view name. Defaults to `"default"`. */
  readonly view?: SurfaceViewName;
  /**
   * When false, kits must not paint field labels/descriptions on this node
   * or its descendants (unless a child passes `labels: true`). Default true.
   * Table cells and other composed chrome use this so parent headers own labels.
   */
  readonly labels?: boolean;
  /**
   * Where this node sits in its annotation. Core derives one at subject roots;
   * helpers attach one when yielding children. Passing it wins over derivation.
   */
  readonly coordinate?: SurfaceCoordinate;
  /**
   * Effective annotation entry for this node. Helpers attach it on yielded
   * children; when set, it wins over coordinate-based lookup.
   */
  readonly entry?: AnnotationEntry;
  /**
   * Projected validity for this node's data (paths relative to this data).
   * Host may pass; otherwise root fills after validate() and nests project.
   */
  readonly validity?: SurfaceValidity;
  /**
   * Draft updates as the user edits. When set with {@link data}, the root is
   * controlled (parent owns the value). Without it, root keeps an internal draft.
   */
  readonly onChange?: (data: unknown) => void;
  /**
   * Fired only after a successful Save validation with the valid payload.
   * Invalid Save does not call this — issues go through the validity channel.
   */
  readonly onSubmit?: (event: SurfaceSubmitEvent) => void;
}

export type SurfaceComponent = (props: SurfaceProps) => ReactElement | null;

export interface SurfaceUi {
  readonly Surface: SurfaceComponent;
}
