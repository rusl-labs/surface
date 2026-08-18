import { createContext, useContext, useEffect, useState } from "react";
import type { SurfaceDataApi, SurfaceSubmitEvent } from "./data.js";
import type { FieldChild } from "./helpers.js";
import type {
  SurfaceCoordinate,
  SurfaceMode,
  SurfaceViewName,
} from "./kit.js";
import { resolveSchemaRef, splitSchemaUri } from "./resolvers/schema-uri.js";
import type {
  AnnotationDocument,
  AnnotationEntry,
  AnnotationResolver,
  Schema,
  SchemaResolver,
  SurfaceComponent,
  SurfaceUiOptions,
} from "./types.js";
import type { DataPath, SurfaceValidity } from "./validity.js";

/** Opt-in helpers kits use for annotated field order and chrome. */
export interface SurfaceHelpers {
  fields(): FieldChild[];
  /** Entry label, or view label at a subject root, or schema/property fallback. */
  label(): string;
  /** Entry or view description when the annotation supplies one. */
  description(): string;
  /**
   * View-level field chrome at a subject root (`props` | `stack`).
   * Nested mounts without view chrome default to `props`.
   */
  layout(): "props" | "stack";
  /**
   * View-level body direction at a subject root (`vertical` | `horizontal`).
   * Nested mounts default to `vertical`.
   */
  direction(): "vertical" | "horizontal";
}

/** Value provided by a mounted Surface (grows as the runtime lands). */
export interface SurfaceContext {
  readonly isRoot: boolean;
  /** Family config — set once at the root Surface, inherited below. */
  readonly options?: SurfaceUiOptions;
  /**
   * The same configuration-bound Surface from createSurfaceUi.
   * Renderers mount nested schemas with this — not a new createSurfaceUi call.
   */
  readonly Surface?: SurfaceComponent;
  readonly id?: string;
  readonly data?: unknown;
  readonly mode?: SurfaceMode;
  readonly view?: SurfaceViewName;
  /** Inherited label chrome. False suppresses labels on this node and descendants. */
  readonly labels?: boolean;
  /** Schema node for this Surface (def or document root). */
  readonly schema?: Schema;
  /** Whole schema document for resolving relative `#/$defs/...` refs. */
  readonly document?: Schema;
  /** Absolute URI of {@link document} (no fragment). */
  readonly documentUri?: string;
  readonly error?: string;
  readonly loading?: boolean;
  /** Where this node sits in its annotation, when it has one. */
  readonly coordinate?: SurfaceCoordinate;
  /** Annotation document for this node's subject, when one resolved. */
  readonly annotation?: AnnotationDocument;
  /** Effective annotation entry for this node, when one was resolved. */
  readonly entry?: AnnotationEntry;
  /** Annotation-aware helpers for the current node. */
  readonly helpers?: SurfaceHelpers;
  /**
   * Projected validity issues for this node's data (paths relative to it).
   * Root writes after validate(); nests inherit or project by data slot.
   */
  readonly validity?: SurfaceValidity;
  /** Live data channel for this node (root owns; nests inherit or slot-wrap). */
  readonly dataApi?: SurfaceDataApi;
  /**
   * Instance path from the form/data root to this node.
   * Empty at root; not extended on inherit mounts (URI / allOf / union).
   */
  readonly dataPath?: DataPath;
  /**
   * True after a Save attempt that failed validation (kit dirty rule).
   * Inherited by all nested nodes from the root.
   */
  readonly formSubmitted?: boolean;
  /** Root host callback — kit form chrome invokes only when valid. */
  readonly onSubmit?: (event: SurfaceSubmitEvent) => void;
  /**
   * Root only: ResolvedSurfaceBody registers the resolved schema so data
   * writes can re-validate after a failed Save without ambient state.
   */
  readonly registerValidationTarget?: (target: {
    readonly id: string;
    readonly schema: Schema;
  }) => void;
}

export const DEFAULT_SURFACE_CONTEXT: SurfaceContext = Object.freeze({
  isRoot: true,
});

const SurfaceReactContext = createContext<SurfaceContext>(DEFAULT_SURFACE_CONTEXT);

export const SurfaceContextProvider = SurfaceReactContext.Provider;

/**
 * Nearest Surface context, or {@link DEFAULT_SURFACE_CONTEXT} when none is mounted.
 * Does not throw outside a Surface.
 */
export function useSurface(): SurfaceContext {
  return useContext(SurfaceReactContext);
}

export type ResolvedSurfaceNode = {
  readonly schema?: Schema;
  readonly document?: Schema;
  readonly documentUri?: string;
  readonly annotation?: AnnotationDocument;
  readonly error?: string;
  readonly loading: boolean;
};

type SchemaOutcome =
  | {
      readonly schema: Schema;
      readonly document?: Schema;
      readonly documentUri?: string;
    }
  | { readonly error: string };

type NodeInputs = {
  readonly id: string | undefined;
  readonly provided: Schema | undefined;
  readonly schemaResolver: SchemaResolver | undefined;
  readonly contextDocument: Schema | undefined;
  readonly contextDocumentUri: string | undefined;
};

/**
 * Resolve this node's schema.
 *
 * 1. Inline `schema` with `$ref` → relative against context document, or
 *    absolute via resolver (load document, then apply fragment).
 * 2. Inline `schema` without `$ref` → use as-is; keep context document.
 * 3. Else load by `id` via resolver (supports `#/$defs/...` fragments).
 */
async function resolveNodeSchema({
  id,
  provided,
  schemaResolver,
  contextDocument,
  contextDocumentUri,
}: NodeInputs): Promise<SchemaOutcome> {
  if (provided !== undefined) {
    const ref = typeof provided.$ref === "string" ? provided.$ref : undefined;

    if (ref === undefined) {
      return {
        schema: provided,
        ...(contextDocument !== undefined ? { document: contextDocument } : {}),
        ...(contextDocumentUri !== undefined
          ? { documentUri: contextDocumentUri }
          : {}),
      };
    }

    const resolved = await resolveSchemaRef(ref, {
      resolver: schemaResolver,
      document: contextDocument,
      documentUri: contextDocumentUri,
    });
    return resolved === undefined
      ? { error: `Failed to resolve $ref ${ref}` }
      : resolved;
  }

  if (schemaResolver === undefined || id === undefined) {
    return { error: "Surface context is missing options.schemaResolver or id" };
  }

  const { documentUri: idDocumentUri } = splitSchemaUri(id);
  const resolved = await resolveSchemaRef(id, {
    resolver: schemaResolver,
    document: contextDocument,
    documentUri: contextDocumentUri ?? idDocumentUri,
  });
  return resolved === undefined
    ? { error: `Resolver returned no schema for ${id}` }
    : resolved;
}

/**
 * The document URI this node's schema will come from, known *before* the
 * schema loads — which is what lets the annotation resolve alongside it
 * instead of behind it. `undefined` means "wherever the parent's came from".
 */
function annotationSubject({
  id,
  provided,
  contextDocumentUri,
}: NodeInputs): string | undefined {
  const reached =
    provided !== undefined
      ? typeof provided.$ref === "string"
        ? provided.$ref
        : undefined
      : id;
  if (reached === undefined || reached.startsWith("#")) return contextDocumentUri;

  const { documentUri } = splitSchemaUri(reached);
  return documentUri.length > 0 ? documentUri : contextDocumentUri;
}

/**
 * The annotation for this node's subject. A node only resolves when it moves
 * to a subject document its parent wasn't already in — staying put inherits,
 * so `#/$defs/...` crossings keep the document they are defined in. A
 * rejected resolve degrades to no annotation; the node renders on kit
 * defaults rather than breaking.
 */
async function resolveNodeAnnotation(
  inputs: NodeInputs,
  resolver: AnnotationResolver | undefined,
  inherited: AnnotationDocument | undefined,
): Promise<AnnotationDocument | undefined> {
  const subject = annotationSubject(inputs);
  if (resolver === undefined || subject === undefined) return undefined;
  if (subject === inputs.contextDocumentUri) return inherited;

  try {
    return await resolver.resolveAnnotation(subject);
  } catch {
    return undefined;
  }
}

/** Resolve this Surface's schema and annotation together, one await. */
export function useResolvedNode(): ResolvedSurfaceNode {
  const {
    options,
    id,
    schema: provided,
    document: contextDocument,
    documentUri: contextDocumentUri,
    annotation: inherited,
  } = useSurface();
  const schemaResolver = options?.schemaResolver;
  const annotationResolver = options?.annotationResolver;

  const [state, setState] = useState<ResolvedSurfaceNode>({ loading: true });

  useEffect(() => {
    let cancelled = false;
    const inputs: NodeInputs = {
      id,
      provided,
      schemaResolver,
      contextDocument,
      contextDocumentUri,
    };

    async function run(): Promise<void> {
      setState({ loading: true });

      const [outcome, annotation] = await Promise.all([
        resolveNodeSchema(inputs).catch(
          (cause: unknown): SchemaOutcome => ({
            error: cause instanceof Error ? cause.message : String(cause),
          }),
        ),
        resolveNodeAnnotation(inputs, annotationResolver, inherited),
      ]);
      if (cancelled) return;

      setState({
        ...outcome,
        ...(annotation !== undefined ? { annotation } : {}),
        loading: false,
      });
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    provided,
    contextDocument,
    contextDocumentUri,
    schemaResolver,
    annotationResolver,
    inherited,
    id,
  ]);

  return state;
}
