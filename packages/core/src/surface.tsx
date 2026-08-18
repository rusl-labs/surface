import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import {
  isDataInheritId,
  parseDataSlot,
  setChildValue,
  type SurfaceDataApi,
} from "./data.js";
import {
  listFields,
  resolveAnnotationEntry,
  resolveDescription,
  resolveLabel,
  resolveViewChrome,
} from "./helpers.js";
import type {
  SurfaceCoordinate,
  SurfaceMode,
  SurfaceViewName,
} from "./kit.js";
import { candidateKeys } from "./lookups.js";
import { splitSchemaUri } from "./resolvers/schema-uri.js";
import {
  DEFAULT_SURFACE_CONTEXT,
  SurfaceContextProvider,
  useResolvedNode,
  useSurface,
  type SurfaceContext,
  type SurfaceHelpers,
} from "./surface-context.js";
import type {
  AnnotationEntry,
  Schema,
  SurfaceComponent,
  SurfaceProps,
  SurfaceUi,
  SurfaceUiOptions,
} from "./types.js";
import {
  projectIssues,
  type DataPath,
  type SurfaceValidity,
  type ValidateResult,
} from "./validity.js";

/**
 * Build a Surface family closed over the given configuration.
 * Nested Surfaces discover the parent via {@link useSurface} and remount
 * the same {@link SurfaceComponent} from context.
 */
export function createSurfaceUi(options: SurfaceUiOptions): SurfaceUi {
  const Surface = function Surface(props: SurfaceProps): ReactElement | null {
    const parent = useSurface();
    const isRoot = parent === DEFAULT_SURFACE_CONTEXT;

    if (isRoot) {
      return (
        <RootSurface
          options={options}
          Surface={Surface as SurfaceComponent}
          props={props}
        />
      );
    }

    return (
      <NestedSurface
        options={parent.options ?? options}
        Surface={Surface as SurfaceComponent}
        props={props}
        parent={parent}
      />
    );
  };

  Surface.displayName = "Surface";

  return { Surface: Surface as SurfaceComponent };
}

function RootSurface({
  options,
  Surface,
  props,
}: {
  readonly options: SurfaceUiOptions;
  readonly Surface: SurfaceComponent;
  readonly props: SurfaceProps;
}): ReactElement {
  const {
    id,
    schema,
    document,
    documentUri,
    data: dataProp,
    mode = "input",
    view = "default",
    labels = true,
    coordinate,
    entry,
    validity: validityProp,
    onChange,
    onSubmit,
  } = props;

  const controlled = onChange !== undefined;
  const [draft, setDraft] = useState(() => dataProp);
  const [channelValidity, setChannelValidity] = useState<SurfaceValidity>({
    issues: [],
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Uncontrolled: re-seed draft when host passes a new initial value.
  useEffect(() => {
    if (!controlled) setDraft(dataProp);
  }, [dataProp, controlled]);

  const liveData = controlled ? dataProp : draft;
  const dataRef = useRef(liveData);
  dataRef.current = liveData;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const initialDataRef = useRef(dataProp);
  const formSubmittedRef = useRef(formSubmitted);
  formSubmittedRef.current = formSubmitted;
  /** Resolved root schema for post-Save re-validation on edits. */
  const validationTargetRef = useRef<{ id: string; schema: Schema } | null>(
    null,
  );
  const revalidateGenRef = useRef(0);

  const applyData = useCallback(
    (next: unknown) => {
      if (!controlled) setDraft(next);
      onChangeRef.current?.(next);
    },
    [controlled],
  );

  const applyValidationResult = useCallback((result: ValidateResult) => {
    setChannelValidity({ issues: result.issues });
    setFormSubmitted(!result.valid);
  }, []);

  /** After a failed Save, re-run validate on each edit so errors clear live. */
  const scheduleRevalidate = useCallback(
    (data: unknown) => {
      if (!formSubmittedRef.current) return;
      const target = validationTargetRef.current;
      if (target === null) return;
      const gen = ++revalidateGenRef.current;
      void Promise.resolve(
        options.validator.validate({
          id: target.id,
          schema: target.schema,
          data,
          schemaResolver: options.schemaResolver,
        }),
      ).then((result) => {
        if (gen !== revalidateGenRef.current) return;
        applyValidationResult(result);
      });
    },
    [options.validator, options.schemaResolver, applyValidationResult],
  );

  const registerValidationTarget = useCallback(
    (target: { readonly id: string; readonly schema: Schema }) => {
      validationTargetRef.current = target;
    },
    [],
  );

  const dataApi: SurfaceDataApi = useMemo(
    () => ({
      get data() {
        return dataRef.current;
      },
      setData(next: unknown) {
        // Keep the ref in sync immediately so submit can read before re-render.
        dataRef.current = next;
        applyData(next);
        scheduleRevalidate(next);
      },
      setChild(key: string | number, next: unknown) {
        const updated = setChildValue(dataRef.current, key, next);
        dataRef.current = updated;
        applyData(updated);
        scheduleRevalidate(updated);
      },
      reportValidation(result: ValidateResult) {
        applyValidationResult(result);
      },
      reset() {
        revalidateGenRef.current += 1; // drop in-flight revalidates
        dataRef.current = initialDataRef.current;
        applyData(initialDataRef.current);
        setChannelValidity({ issues: [] });
        setFormSubmitted(false);
      },
    }),
    [applyData, scheduleRevalidate, applyValidationResult],
  );

  const validity = validityProp ?? channelValidity;

  const shell: SurfaceContext = {
    isRoot: true,
    options,
    Surface,
    id,
    data: liveData,
    mode,
    view,
    labels,
    dataApi,
    dataPath: [],
    formSubmitted,
    validity,
    registerValidationTarget,
    ...(onSubmit !== undefined
      ? {
          onSubmit: (event) => {
            onSubmitRef.current?.(event);
          },
        }
      : {}),
    ...(coordinate !== undefined ? { coordinate } : {}),
    ...(entry !== undefined ? { entry } : {}),
    ...(schema !== undefined ? { schema } : {}),
    ...(document !== undefined ? { document } : {}),
    ...(documentUri !== undefined ? { documentUri } : {}),
  };

  return (
    <SurfaceContextProvider value={shell}>
      <ResolvedSurfaceBody />
    </SurfaceContextProvider>
  );
}

function NestedSurface({
  options,
  Surface,
  props,
  parent,
}: {
  readonly options: SurfaceUiOptions;
  readonly Surface: SurfaceComponent;
  readonly props: SurfaceProps;
  readonly parent: SurfaceContext;
}): ReactElement {
  const {
    id,
    schema,
    document,
    documentUri,
    data: dataProp,
    mode = "input",
    view = "default",
    labels: labelsProp,
    coordinate,
    entry,
    validity: validityProp,
  } = props;
  const labels = labelsProp ?? parent.labels ?? true;

  const inherit = isDataInheritId(id);
  const slot = parseDataSlot(id);
  const parentApi = parent.dataApi;

  const dataRef = useRef(dataProp);
  dataRef.current = dataProp;

  const dataApi = useMemo((): SurfaceDataApi | undefined => {
    if (parentApi === undefined) return undefined;
    if (inherit) return parentApi;
    return {
      get data() {
        return dataRef.current;
      },
      setData(next: unknown) {
        dataRef.current = next;
        parentApi.setChild(slot, next);
      },
      setChild(key: string | number, next: unknown) {
        const updated = setChildValue(dataRef.current, key, next);
        dataRef.current = updated;
        parentApi.setChild(slot, updated);
      },
    };
  }, [parentApi, inherit, slot]);

  const dataPath: DataPath = inherit
    ? (parent.dataPath ?? [])
    : [...(parent.dataPath ?? []), slot];

  const projected: SurfaceValidity | undefined =
    parent.validity === undefined
      ? undefined
      : inherit
        ? parent.validity
        : { issues: projectIssues(parent.validity.issues, [slot]) };

  const validity = validityProp ?? projected;

  // Prefer live parent data on inherit mounts; props for slot children.
  const liveData = inherit
    ? (parent.dataApi?.data ?? dataProp)
    : dataProp;

  const shell: SurfaceContext = {
    isRoot: false,
    options,
    Surface,
    id,
    data: liveData,
    mode,
    view,
    labels,
    ...(parent.formSubmitted !== undefined
      ? { formSubmitted: parent.formSubmitted }
      : {}),
    ...(dataApi !== undefined ? { dataApi } : {}),
    dataPath,
    ...(validity !== undefined ? { validity } : {}),
    ...(parent.onSubmit !== undefined ? { onSubmit: parent.onSubmit } : {}),
    ...(coordinate !== undefined ? { coordinate } : {}),
    ...(entry !== undefined ? { entry } : {}),
    ...(parent.annotation !== undefined
      ? { annotation: parent.annotation }
      : {}),
    ...(schema !== undefined ? { schema } : {}),
    ...(document !== undefined
      ? { document }
      : parent.document !== undefined
        ? { document: parent.document }
        : {}),
    ...(documentUri !== undefined
      ? { documentUri }
      : parent.documentUri !== undefined
        ? { documentUri: parent.documentUri }
        : {}),
  };

  return (
    <SurfaceContextProvider value={shell}>
      <ResolvedSurfaceBody />
    </SurfaceContextProvider>
  );
}

const DEF_POINTER = /^\/?\$defs\/[^/]+$/;

/**
 * The coordinate for a node core reached on its own, or `undefined` when the
 * node is not a subject root. A subject root is a mount of a whole document
 * (subject = its `$id`, else the URI it loaded from) or of one of that
 * document's `$defs` (subject = `<documentUri>#/$defs/<name>`). Every other
 * mount — a deeper pointer, an inline schema a kit hand-rolled — sits at a
 * position only the annotation's own path language can name, so it gets none.
 */
function subjectRootCoordinate(
  id: string | undefined,
  provided: Schema | undefined,
  schema: Schema,
  documentUri: string | undefined,
): SurfaceCoordinate | undefined {
  if (documentUri === undefined) return undefined;

  const reached =
    provided !== undefined
      ? typeof provided.$ref === "string"
        ? provided.$ref
        : undefined
      : id;
  if (reached === undefined) return undefined;

  const { pointer } = splitSchemaUri(reached);
  if (pointer === undefined) {
    const declared = schema.$id;
    return {
      subject: typeof declared === "string" ? declared : documentUri,
      path: [],
    };
  }

  if (!DEF_POINTER.test(pointer)) return undefined;
  const suffix = pointer.startsWith("/") ? pointer : `/${pointer}`;
  return { subject: `${documentUri}#${suffix}`, path: [] };
}

/** Runs under the shell provider so resolve can read options + id from context. */
function ResolvedSurfaceBody(): ReactElement {
  const shell = useSurface();
  const { schema, document, documentUri, annotation, error, loading } =
    useResolvedNode();

  const coordinate =
    shell.coordinate ??
    (schema === undefined
      ? undefined
      : subjectRootCoordinate(shell.id, shell.schema, schema, documentUri));

  const mode: SurfaceMode = shell.mode ?? "input";
  const view: SurfaceViewName = shell.view ?? "default";
  const id = shell.id ?? "";

  // Root needs the resolved schema to re-validate after a failed Save.
  useEffect(() => {
    if (!shell.isRoot || schema === undefined) return;
    const targetId =
      (typeof schema.$id === "string" ? schema.$id : undefined) ?? id;
    if (targetId.length === 0) return;
    shell.registerValidationTarget?.({ id: targetId, schema });
  }, [shell.isRoot, shell.registerValidationTarget, schema, id]);

  const entry: AnnotationEntry | undefined =
    shell.entry ??
    resolveAnnotationEntry({
      ...(annotation !== undefined ? { annotation } : {}),
      ...(coordinate !== undefined ? { coordinate } : {}),
      view,
      mode,
    });

  const helpers: SurfaceHelpers | undefined =
    schema === undefined
      ? undefined
      : {
          fields: () =>
            listFields({
              schema,
              mode,
              view,
              ...(shell.data !== undefined ? { data: shell.data } : {}),
              ...(annotation !== undefined ? { annotation } : {}),
              ...(coordinate !== undefined ? { coordinate } : {}),
              ...(document !== undefined ? { document } : {}),
              ...(documentUri !== undefined ? { documentUri } : {}),
            }),
          label: () =>
            resolveLabel({
              id,
              schema,
              view,
              ...(entry !== undefined ? { entry } : {}),
              ...(annotation !== undefined ? { annotation } : {}),
              ...(coordinate !== undefined ? { coordinate } : {}),
            }),
          description: () =>
            resolveDescription({
              view,
              ...(entry !== undefined ? { entry } : {}),
              ...(annotation !== undefined ? { annotation } : {}),
              ...(coordinate !== undefined ? { coordinate } : {}),
            }),
          layout: () => {
            const chrome = resolveViewChrome({
              view,
              ...(annotation !== undefined ? { annotation } : {}),
              ...(coordinate !== undefined ? { coordinate } : {}),
            });
            return chrome.layout ?? "props";
          },
          direction: () => {
            const chrome = resolveViewChrome({
              view,
              ...(annotation !== undefined ? { annotation } : {}),
              ...(coordinate !== undefined ? { coordinate } : {}),
            });
            return chrome.direction ?? "vertical";
          },
        };

  const context: SurfaceContext = {
    isRoot: shell.isRoot,
    loading,
    ...(coordinate !== undefined ? { coordinate } : {}),
    ...(annotation !== undefined ? { annotation } : {}),
    ...(entry !== undefined ? { entry } : {}),
    ...(helpers !== undefined ? { helpers } : {}),
    ...(shell.options !== undefined ? { options: shell.options } : {}),
    ...(shell.Surface !== undefined ? { Surface: shell.Surface } : {}),
    ...(shell.id !== undefined ? { id: shell.id } : {}),
    ...(shell.data !== undefined ? { data: shell.data } : {}),
    ...(shell.mode !== undefined ? { mode: shell.mode } : {}),
    ...(shell.view !== undefined ? { view: shell.view } : {}),
    ...(shell.labels !== undefined ? { labels: shell.labels } : {}),
    ...(schema !== undefined ? { schema } : {}),
    ...(document !== undefined ? { document } : {}),
    ...(documentUri !== undefined ? { documentUri } : {}),
    ...(error !== undefined ? { error } : {}),
    ...(shell.dataApi !== undefined ? { dataApi: shell.dataApi } : {}),
    ...(shell.dataPath !== undefined ? { dataPath: shell.dataPath } : {}),
    ...(shell.formSubmitted !== undefined
      ? { formSubmitted: shell.formSubmitted }
      : {}),
    ...(shell.validity !== undefined ? { validity: shell.validity } : {}),
    ...(shell.onSubmit !== undefined ? { onSubmit: shell.onSubmit } : {}),
    ...(shell.registerValidationTarget !== undefined
      ? { registerValidationTarget: shell.registerValidationTarget }
      : {}),
  };

  if (
    loading ||
    error !== undefined ||
    schema === undefined ||
    shell.options === undefined
  ) {
    return <SurfaceContextProvider value={context}>{null}</SurfaceContextProvider>;
  }

  const { kit } = shell.options;
  const Renderer =
    kit.resolveRenderer({
      keys: candidateKeys(schema, entry, coordinate),
      ...(coordinate !== undefined ? { coordinate } : {}),
      mode,
      view,
      schema,
      ...(entry !== undefined ? { entry } : {}),
      data: shell.data,
    }) ?? kit.fallback;

  const bodyProps = {
    id,
    schema,
    ...(document !== undefined ? { document } : {}),
    ...(documentUri !== undefined ? { documentUri } : {}),
    data: shell.data,
    mode,
    view,
    ...(coordinate !== undefined ? { coordinate } : {}),
    ...(entry !== undefined ? { entry } : {}),
    ...(shell.validity !== undefined ? { validity: shell.validity } : {}),
  };

  const body = <Renderer {...bodyProps} />;

  // Optional kit root shell (form chrome, providers) — only on the root mount.
  const Root = kit.Root;
  const tree =
    shell.isRoot && Root !== undefined ? (
      <Root {...bodyProps}>{body}</Root>
    ) : (
      body
    );

  return (
    <SurfaceContextProvider value={context}>{tree}</SurfaceContextProvider>
  );
}
