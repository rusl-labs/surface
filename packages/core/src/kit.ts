import type { ComponentType, ReactNode } from "react";
import type { AnnotationEntry, Schema, SurfaceProps } from "./types.js";

/** Field interaction mode. `input` is edit; `display` is read-only. */
export type SurfaceMode = "display" | "input";

/** Open view name. `"default"` is the reserved fallback view. */
export type SurfaceViewName = "default" | (string & {});

/**
 * Kit renderers receive the same props as Surface: schema `id`, and
 * optional `data` (omit for input create; pass for display / input edit).
 */
export type SurfaceRenderer = ComponentType<SurfaceProps>;

/**
 * Optional root shell: engine mounts only on the root Surface, wrapping the
 * resolved body renderer as `children`. Kits put form chrome, theme, etc. here.
 */
export type SurfaceRootProps = SurfaceProps & {
  readonly children: ReactNode;
};

export type SurfaceRoot = ComponentType<SurfaceRootProps>;

/**
 * Where a node sits in its annotation: the annotation scope (`<uri>` or
 * `<uri>#/$defs/<name>`) and the entry-identity chain within it.
 */
export interface SurfaceCoordinate {
  readonly subject: string;
  readonly path: readonly string[];
}

/**
 * What a kit is asked to render. Carries core-computed values only — never
 * caller identity.
 */
export interface RendererRequest {
  /** Candidate keys, most specific first. */
  readonly keys: readonly string[];
  readonly coordinate?: SurfaceCoordinate;
  readonly mode: SurfaceMode;
  readonly view: SurfaceViewName;
  readonly schema: Schema;
  /** Annotation entry for this node, when one was resolved. */
  readonly entry?: AnnotationEntry;
  /** The node's current value. */
  readonly data?: unknown;
}

/**
 * Kit contract: body lookup + fallback, optional root shell.
 * `Root` receives the resolved body as `children` (form chrome, providers…).
 */
export interface SurfaceKit {
  resolveRenderer(request: RendererRequest): SurfaceRenderer | undefined;
  readonly fallback: SurfaceRenderer;
  /** When set, engine wraps the root body's renderer with this component. */
  readonly Root?: SurfaceRoot;
}

interface RegistryEntryMatch {
  readonly key?: string;
  readonly mode?: SurfaceMode;
  readonly view?: SurfaceViewName;
}

/**
 * Omitting `key` matches every node; omitting `mode`/`view` matches all.
 * An entry either names a `component` or a `resolve` picking one from app
 * state per request (`null` = "not me, keep falling through") — sibling
 * fields, never both. A component and a resolver are indistinguishable
 * plain functions at runtime, so they cannot share one field.
 */
export type RegistryEntry = RegistryEntryMatch &
  (
    | {
        readonly resolve: (request: RendererRequest) => SurfaceRenderer | null;
        readonly component?: never;
      }
    | { readonly component: SurfaceRenderer; readonly resolve?: never }
  );

export interface RegistryKitOptions {
  readonly fallback: SurfaceRenderer;
  readonly resolvers?: readonly RegistryEntry[];
  /**
   * Extra lookup keys that reuse an existing registration.
   * `date-time` → `datetime` means a miss on `date-time` retries `datetime`.
   * One hop only. An explicit registration for the alias key still wins.
   */
  readonly aliases?: Readonly<Record<string, string>>;
  /** Optional root shell (form chrome, providers). See {@link SurfaceKit.Root}. */
  readonly Root?: SurfaceRoot;
}

/** A kit whose entry list can be extended after construction. */
export interface RegistryKit extends SurfaceKit {
  set(
    ...args:
      | [entry: RegistryEntry]
      | [
          key: string,
          mode: SurfaceMode,
          view: SurfaceViewName,
          component: SurfaceRenderer,
        ]
  ): void;
}

function componentFor(
  entry: RegistryEntry,
  request: RendererRequest,
): SurfaceRenderer | undefined {
  return entry.resolve !== undefined
    ? (entry.resolve(request) ?? undefined)
    : entry.component;
}

/**
 * Flat entry list, resolved key-less entries first (list order), then each
 * candidate key in turn (last set wins) against `[mode][view]` then
 * `[mode].default`.
 */
export function createRegistryKit(options: RegistryKitOptions): RegistryKit {
  const entries: RegistryEntry[] = [...(options.resolvers ?? [])];
  const aliases = options.aliases ?? {};

  function matchesMode(entry: RegistryEntry, request: RendererRequest): boolean {
    return entry.mode === undefined || entry.mode === request.mode;
  }

  function lookupKey(
    key: string,
    request: RendererRequest,
  ): SurfaceRenderer | undefined {
    const keyed = entries
      .filter((entry) => entry.key === key && matchesMode(entry, request))
      .reverse();

    for (const entry of keyed) {
      if (entry.view !== undefined && entry.view !== request.view) continue;
      const component = componentFor(entry, request);
      if (component !== undefined) return component;
    }

    if (request.view === "default") return undefined;

    for (const entry of keyed) {
      if (entry.view !== "default") continue;
      const component = componentFor(entry, request);
      if (component !== undefined) return component;
    }

    return undefined;
  }

  function resolveKey(
    key: string,
    request: RendererRequest,
  ): SurfaceRenderer | undefined {
    const direct = lookupKey(key, request);
    if (direct !== undefined) return direct;
    const aliased = aliases[key];
    if (aliased === undefined || aliased === key) return undefined;
    return lookupKey(aliased, request);
  }

  return {
    fallback: options.fallback,
    ...(options.Root !== undefined ? { Root: options.Root } : {}),

    resolveRenderer(request: RendererRequest): SurfaceRenderer | undefined {
      for (const entry of entries) {
        if (entry.key !== undefined) continue;
        if (!matchesMode(entry, request)) continue;
        if (entry.view !== undefined && entry.view !== request.view) continue;
        const component = componentFor(entry, request);
        if (component !== undefined) return component;
      }

      for (const key of request.keys) {
        const component = resolveKey(key, request);
        if (component !== undefined) return component;
      }

      return undefined;
    },

    set(
      ...args:
        | [entry: RegistryEntry]
        | [
            key: string,
            mode: SurfaceMode,
            view: SurfaceViewName,
            component: SurfaceRenderer,
          ]
    ): void {
      if (args.length === 1) {
        entries.push(args[0]);
        return;
      }
      const [key, mode, view, component] = args;
      entries.push({ key, mode, view, component });
    },
  };
}
