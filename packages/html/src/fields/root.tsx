import {
  useEffect,
  useId,
  useRef,
  type ReactElement,
} from "react";
import {
  useSurface,
  type FieldChild,
  type SurfaceRootProps,
  type SurfaceSubmitEvent,
  type SurfaceDataApi,
  type SurfaceUiOptions,
  type Schema,
  type ValidateResult,
} from "@rusl-labs/surface";
import { surfaceClass } from "../classes.js";
import { useHtmlKitConfig } from "../kit-config.js";
import { applyConstAndDefaults } from "./apply-const-defaults.js";
import { firstIssueMessage, visibleRootIssues } from "./channel-errors.js";

/** True when the presentation still has at least one bound (editable) field. */
function hasBoundField(children: readonly FieldChild[]): boolean {
  for (const child of children) {
    if (child.kind === "field" && child.hidden !== true) return true;
    if (
      child.kind === "section" ||
      child.kind === "block" ||
      child.kind === "banner" ||
      child.kind === "span"
    ) {
      if (hasBoundField(child.children())) return true;
    }
  }
  return false;
}

function failResult(message: string): ValidateResult {
  return {
    valid: false,
    issues: [{ path: [], message, code: "save" }],
  };
}

/**
 * Kit root shell: on root + input mode, wrap the resolved body with Reset / Save
 * chrome. Save is a button that validates the channel and calls `onSubmit` —
 * not a native HTML form submit (no navigation / default form action).
 */
export function HtmlRoot({
  id,
  schema,
  children,
}: SurfaceRootProps): ReactElement {
  const surface = useSurface();
  const {
    mode,
    dataApi,
    options,
    onSubmit,
    formSubmitted,
    validity,
    helpers,
  } = surface;
  const { form: formChrome } = useHtmlKitConfig();
  const shellRef = useRef<HTMLDivElement>(null);
  const prevFormSubmitted = useRef(false);
  const formErrorsId = useId();

  // Always call the latest callbacks/data — Save is async (AJV compileAsync).
  const dataApiRef = useRef<SurfaceDataApi | undefined>(dataApi);
  dataApiRef.current = dataApi;
  const optionsRef = useRef<SurfaceUiOptions | undefined>(options);
  optionsRef.current = options;
  const onSubmitRef = useRef<
    ((event: SurfaceSubmitEvent) => void) | undefined
  >(onSubmit);
  onSubmitRef.current = onSubmit;
  const schemaRef = useRef<Schema | undefined>(schema);
  schemaRef.current = schema;
  const idRef = useRef(id);
  idRef.current = id;

  const rootIssues = visibleRootIssues(validity, formSubmitted);
  const rootErrorMessage = firstIssueMessage(rootIssues);

  useEffect(() => {
    const justFailed = formSubmitted === true && !prevFormSubmitted.current;
    prevFormSubmitted.current = formSubmitted === true;
    if (!justFailed) return;
    const shell = shellRef.current;
    if (shell === null) return;
    const frame = requestAnimationFrame(() => {
      const invalid = shell.querySelector(
        `.${surfaceClass.invalid}`,
      ) as HTMLElement | null;
      if (invalid !== null) {
        invalid.focus?.();
        return;
      }
      const banner = shell.querySelector(
        `.${surfaceClass.formErrors}`,
      ) as HTMLElement | null;
      if (banner !== null) {
        banner.focus?.();
        return;
      }
      (
        shell.querySelector(
          "input:not([type=hidden]):not([readonly]), select, textarea",
        ) as HTMLElement | null
      )?.focus?.();
    });
    return () => cancelAnimationFrame(frame);
  }, [formSubmitted, validity?.issues]);

  const kids = helpers?.fields();
  const editable =
    kids === undefined || kids.length === 0 || hasBoundField(kids);
  const formEnabled =
    mode === "input" && formChrome?.enabled !== false && editable;

  if (!formEnabled || schema === undefined) {
    return <>{children}</>;
  }

  const saveLabel = formChrome?.saveLabel ?? "Save";
  const resetLabel = formChrome?.resetLabel ?? "Reset";

  async function handleSave(): Promise<void> {
    const api = dataApiRef.current;
    const opts = optionsRef.current;
    const activeSchema = schemaRef.current;
    const surfaceId = idRef.current;
    const submit = onSubmitRef.current;

    if (api === undefined) {
      return;
    }
    if (opts?.validator === undefined) {
      api.reportValidation?.(failResult("Save failed: no validator configured"));
      return;
    }
    if (opts.schemaResolver === undefined) {
      api.reportValidation?.(
        failResult("Save failed: no schemaResolver configured"),
      );
      return;
    }
    if (activeSchema === undefined || surfaceId.length === 0) {
      api.reportValidation?.(
        failResult("Save failed: missing schema or subject id"),
      );
      return;
    }

    // Const/default must be on the instance before AJV runs — do not rely on
    // field useEffect seeders (mount order / hidden annotation shortcuts).
    let data: unknown;
    try {
      data = await applyConstAndDefaults(
        activeSchema,
        api.data,
        opts.schemaResolver,
      );
      // Always write back so channel === validated/submitted payload.
      api.setData(data);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : String(cause);
      api.reportValidation?.(
        failResult(`Save failed applying const/default: ${message}`),
      );
      return;
    }

    let result: ValidateResult;
    try {
      result = await Promise.resolve(
        opts.validator.validate({
          id: surfaceId,
          schema: activeSchema,
          data,
          schemaResolver: opts.schemaResolver,
        }),
      );
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : String(cause);
      result = failResult(`Save failed: ${message}`);
    }

    api.reportValidation?.(result);
    if (!result.valid) return;

    if (submit === undefined) {
      api.reportValidation?.(
        failResult("Save validated but no onSubmit handler is mounted"),
      );
      return;
    }
    submit({ data });
  }

  function handleReset(): void {
    dataApiRef.current?.reset?.();
  }

  return (
    <div
      ref={shellRef}
      className={surfaceClass.form}
      role="group"
      aria-label="Surface form"
      aria-describedby={
        rootErrorMessage.length > 0 ? formErrorsId : undefined
      }
    >
      {children}
      {rootIssues.length > 0 ? (
        <div
          id={formErrorsId}
          className={surfaceClass.formErrors}
          role="alert"
          tabIndex={-1}
        >
          {rootIssues.map((issue, index) => {
            const where =
              issue.path.length > 0
                ? `${issue.path.map(String).join(".")}: `
                : "";
            return (
              <span
                key={`${issue.message}-${index}`}
                className={surfaceClass.error}
              >
                {where}
                {issue.message}
              </span>
            );
          })}
        </div>
      ) : null}
      <div className={surfaceClass.formActions}>
        <button
          type="button"
          className={surfaceClass.button}
          onClick={handleReset}
        >
          {resetLabel}
        </button>
        <button
          type="button"
          className={`${surfaceClass.button} ${surfaceClass.buttonPrimary}`}
          onClick={() => {
            void handleSave();
          }}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
