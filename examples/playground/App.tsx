import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createSurfaceUi,
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  type AnnotationDocument,
  type Schema,
  type SurfaceMode,
  type SurfaceViewName,
  type ValidateResult,
} from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import {
  createHtmlKit,
  humanizeFieldName,
} from "@rusl-labs/surface-html";

import {
  CONTACT_CARD as WALKTHROUGH_ID,
  CONTACT_SCHEMA as WALKTHROUGH_SCHEMA,
} from "../../tests/fixtures/contact-card.ts";
import { PRAGMATIC_SCHEMA_SEEDS } from "../../tests/fixtures/pragmatic-seeds.ts";
import { RUSL_FEEDBACK_SCHEMA_SEEDS } from "../../tests/fixtures/rusl-feedback-seeds.ts";
import {
  buildSubjectSearchParams,
  defaultCatalog,
  filterCatalog,
  groupSubjects,
  resolveSubjectFromSearchParams,
  shortNameFromId,
  CONTACT_CARD_ID,
  type CatalogEntry,
} from "./catalog.ts";
import {
  parseAnnotation,
  parseJson,
  starterAnnotation,
  SUBJECT_SEEDS,
  viewNamesFromAnnotation,
} from "./subject-state.ts";
import {
  CONTACT_DIRECTORY_ID,
  CONTACT_DIRECTORY_SCHEMA,
} from "./contact-directory.ts";

const allSchemaSeeds = {
  ...PRAGMATIC_SCHEMA_SEEDS,
  ...RUSL_FEEDBACK_SCHEMA_SEEDS,
  [WALKTHROUGH_ID]: WALKTHROUGH_SCHEMA,
  [CONTACT_DIRECTORY_ID]: CONTACT_DIRECTORY_SCHEMA,
};

const schemaResolver = new InMemorySchemaFetchResolver(allSchemaSeeds);
const validator = createAjvValidator({
  schemas: Object.values(allSchemaSeeds),
  discriminator: true,
});

const CATALOG = defaultCatalog();
const KNOWN_IDS = new Set(CATALOG.map((e) => e.id));

function Seg({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
  label: string;
}): ReactNode {
  return (
    <div className="field" role="group" aria-label={label}>
      <span
        style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)" }}
      >
        {label}
      </span>
      <div className="seg">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DisplayJson({
  label,
  value,
  onChange,
  error,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error: string | undefined;
  rows: number;
}): ReactNode {
  return (
    <label className="field">
      {label}
      <textarea
        rows={rows}
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error !== undefined ? (
        <span className="status error">{error}</span>
      ) : null}
    </label>
  );
}

function SubjectBrowser({
  catalog,
  subject,
  onSelect,
}: {
  catalog: readonly CatalogEntry[];
  subject: string;
  onSelect: (id: string) => void;
}): ReactNode {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => filterCatalog(catalog, query),
    [catalog, query],
  );
  const groups = useMemo(() => groupSubjects(filtered), [filtered]);

  return (
    <aside className="subject-browser" aria-label="Subject catalog">
      <div className="subject-browser-head">
        <h2>Subjects</h2>
        <input
          type="search"
          className="subject-filter"
          placeholder="Filter title or $id…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Filter subjects"
        />
      </div>
      <div className="subject-browser-body">
        {groups.map((group) => (
          <div key={group.id} className="subject-group">
            <h3 className="subject-group-label">{group.label}</h3>
            <ul className="subject-list">
              {group.entries.map((entry) => (
                <li key={`${group.id}:${entry.id}`}>
                  <button
                    type="button"
                    className="subject-row"
                    aria-current={subject === entry.id ? "true" : undefined}
                    onClick={() => onSelect(entry.id)}
                  >
                    <span className="subject-row-title">{entry.title}</span>
                    <span className="subject-row-id">{entry.shortName}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {groups.length === 0 ? (
          <p className="status">No subjects match “{query}”.</p>
        ) : null}
      </div>
    </aside>
  );
}

function initialSubject(): string {
  if (typeof window === "undefined") return CONTACT_CARD_ID;
  return resolveSubjectFromSearchParams(
    new URLSearchParams(window.location.search),
    CONTACT_CARD_ID,
    KNOWN_IDS,
  );
}

function initialAnnotationTexts(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of CATALOG) {
    out[entry.id] = JSON.stringify(starterAnnotation(entry.id, entry.title), null, 2);
  }
  return out;
}

function initialValidAnnotations(): Record<string, AnnotationDocument> {
  const out: Record<string, AnnotationDocument> = {};
  for (const entry of CATALOG) {
    out[entry.id] = starterAnnotation(entry.id, entry.title);
  }
  return out;
}

function cloneSeed(value: unknown): unknown {
  if (value === undefined) return {};
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function initialDataBySubject(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const entry of CATALOG) {
    out[entry.id] = cloneSeed(SUBJECT_SEEDS[entry.id]);
  }
  return out;
}

export function App(): ReactNode {
  const [subject, setSubject] = useState(initialSubject);
  const [mode, setMode] = useState<SurfaceMode>("input");
  const [view, setView] = useState<SurfaceViewName>("default");
  /**
   * Committed instance per subject — Seed payload, Display, and post-Save
   * Input seed. Updated only after successful validation (onSubmit or
   * validated JSON apply). Input draft lives inside Surface until Save.
   */
  const [dataBySubject, setDataBySubject] = useState(initialDataBySubject);
  /** Bumps after commit so uncontrolled Surface reseeds from new committed. */
  const [commitGenBySubject, setCommitGenBySubject] = useState<
    Record<string, number>
  >({});
  /** Display JSON textarea only — never written to committed until valid. */
  const [jsonDraft, setJsonDraft] = useState<string | null>(null);
  const jsonDraftRef = useRef<string | null>(null);
  const [jsonError, setJsonError] = useState<string | undefined>(undefined);
  const [annotationTexts, setAnnotationTexts] = useState(initialAnnotationTexts);
  const [validAnnotations, setValidAnnotations] = useState(
    initialValidAnnotations,
  );
  const [lastValidation, setLastValidation] = useState<ValidateResult | null>(
    null,
  );
  /** True after a successful validated commit for this subject. */
  const [savedOkBySubject, setSavedOkBySubject] = useState<
    Record<string, boolean>
  >({});

  const entry = CATALOG.find((e) => e.id === subject);
  const subjectTitle = entry?.title ?? shortNameFromId(subject);
  /** Committed object only (never the live Input draft). */
  const data = dataBySubject[subject] ?? {};

  // URL sync
  useEffect(() => {
    const next = buildSubjectSearchParams(subject);
    if (window.location.search !== next) {
      window.history.pushState({ subject }, "", next);
    }
  }, [subject]);

  useEffect(() => {
    function onPopState(): void {
      setSubject(
        resolveSubjectFromSearchParams(
          new URLSearchParams(window.location.search),
          CONTACT_CARD_ID,
          KNOWN_IDS,
        ),
      );
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Prefill annotation/data for newly selected subjects
  useEffect(() => {
    jsonDraftRef.current = null;
    setJsonDraft(null);
    setJsonError(undefined);
    setAnnotationTexts((prev) => {
      if (prev[subject] !== undefined) return prev;
      const starter = starterAnnotation(subject, subjectTitle);
      setValidAnnotations((v) =>
        v[subject] !== undefined ? v : { ...v, [subject]: starter },
      );
      return { ...prev, [subject]: JSON.stringify(starter, null, 2) };
    });
    setDataBySubject((prev) => {
      if (prev[subject] !== undefined) return prev;
      return { ...prev, [subject]: cloneSeed(SUBJECT_SEEDS[subject]) };
    });
  }, [subject, subjectTitle]);

  const annotationText = annotationTexts[subject] ?? "";
  const parsedAnnotation = useMemo(
    () => parseAnnotation(annotationText, subject),
    [annotationText, subject],
  );

  useEffect(() => {
    if (parsedAnnotation.doc === undefined) return;
    setValidAnnotations((prev) => {
      if (prev[subject] === parsedAnnotation.doc) return prev;
      return { ...prev, [subject]: parsedAnnotation.doc! };
    });
  }, [parsedAnnotation.doc, subject]);

  const availableViews = useMemo(
    () =>
      viewNamesFromAnnotation(validAnnotations[subject]) as SurfaceViewName[],
    [validAnnotations, subject],
  );

  useEffect(() => {
    if (!availableViews.includes(view)) {
      setView(availableViews[0] ?? "default");
    }
  }, [availableViews, view]);

  const kit = useMemo(
    () =>
      createHtmlKit({
        fieldNameToLabel: humanizeFieldName,
        money: { currency: "USD" },
        tel: { defaultCountry: "US" },
        date: { dateStyle: "medium", timeStyle: "short" },
      }),
    [],
  );

  const { Surface } = useMemo(
    () =>
      createSurfaceUi({
        schemaResolver,
        annotationResolver: new InMemoryAnnotationResolver(validAnnotations),
        validator,
        kit,
      }),
    [kit, validAnnotations],
  );

  useEffect(() => {
    setLastValidation(null);
  }, [subject, mode, view]);

  useEffect(() => {
    if (subject === CONTACT_DIRECTORY_ID) setMode("display");
  }, [subject]);

  const dataText = jsonDraft ?? JSON.stringify(data, null, 2);
  const savedOk = savedOkBySubject[subject] === true;
  const commitGen = commitGenBySubject[subject] ?? 0;

  const subjectRef = useRef(subject);
  subjectRef.current = subject;

  /** Only path that writes committed data — validated payloads only. */
  const commitData = useCallback(
    (next: unknown, validation: ValidateResult) => {
      const id = subjectRef.current;
      setLastValidation(validation);
      if (!validation.valid) return;
      jsonDraftRef.current = null;
      setJsonDraft(null);
      setJsonError(undefined);
      setSavedOkBySubject((prev) => ({ ...prev, [id]: true }));
      setDataBySubject((prev) => ({ ...prev, [id]: next }));
      setCommitGenBySubject((prev) => ({
        ...prev,
        [id]: (prev[id] ?? 0) + 1,
      }));
    },
    [],
  );

  const handleSubmit = useCallback(
    (event: { data: unknown }) => {
      // HtmlRoot only calls onSubmit after Save validation succeeds.
      commitData(event.data, { valid: true, issues: [] });
    },
    [commitData],
  );

  function handleDataJsonChange(next: string): void {
    // Buffer only — committed data updates only after schema validation.
    jsonDraftRef.current = next;
    setJsonDraft(next);
    const parsed = parseJson(next);
    if (parsed.error !== undefined) {
      setJsonError(parsed.error);
      return;
    }
    setJsonError(undefined);
    const schema = allSchemaSeeds[subject] as Schema | undefined;
    if (schema === undefined || parsed.data === undefined) {
      setJsonError("No schema for subject");
      return;
    }
    void Promise.resolve(
      validator.validate({
        id: subject,
        schema,
        data: parsed.data,
        schemaResolver,
      }),
    ).then((result) => {
      if (jsonDraftRef.current !== next) return; // superseded by later keystrokes
      if (!result.valid) {
        setLastValidation(result);
        setJsonError(
          result.issues[0]?.message ?? "Schema validation failed",
        );
        return;
      }
      commitData(parsed.data, result);
    });
  }

  function setCurrentAnnotationText(next: string): void {
    setAnnotationTexts((prev) => ({ ...prev, [subject]: next }));
  }

  function resetAnnotationToStarter(): void {
    const starter = starterAnnotation(subject, subjectTitle);
    setCurrentAnnotationText(JSON.stringify(starter, null, 2));
  }

  const surfaceKey = `${subject}:${mode}:${view}:${commitGen}:${annotationText.length}:${parsedAnnotation.error ?? "ok"}`;

  return (
    <div className="shell">
      <header className="hero">
        <span className="badge">Surface · HTML kit · AJV</span>
        <h1>Playground</h1>
        <p>
          Pick any seeded subject, edit its <strong>annotation</strong>, and
          switch mode / view. Email, tel, copy, and money ship in the default
          kit.
        </p>
      </header>

      <div className="playground-layout">
        <SubjectBrowser
          catalog={CATALOG}
          subject={subject}
          onSelect={setSubject}
        />

        <div className="playground-main">
          <section className="panel toolbar">
            <div className="row">
              <Seg
                label="Mode"
                value={mode}
                onChange={(v) => {
                  jsonDraftRef.current = null;
                  setJsonDraft(null);
                  setJsonError(undefined);
                  setMode(v as SurfaceMode);
                }}
                options={[
                  { value: "input", label: "Input" },
                  { value: "display", label: "Display" },
                ]}
              />
              {availableViews.length > 1 ? (
                <Seg
                  label="View"
                  value={view}
                  onChange={(v) => setView(v as SurfaceViewName)}
                  options={availableViews.map((name) => ({
                    value: name,
                    label: name,
                  }))}
                />
              ) : null}
            </div>

            {mode === "display" ? (
              <DisplayJson
                label="Data (JSON)"
                value={dataText}
                onChange={handleDataJsonChange}
                error={jsonError}
                rows={8}
              />
            ) : null}

            <p className="status">
              <strong>{subjectTitle}</strong>{" "}
              <code className="subject-id">{subject}</code>
              {" "}
              · Seed payload = validated only
              {mode === "input" ? (
                <>
                  {" "}
                  · Input draft until <strong>Save</strong>
                </>
              ) : null}
              {savedOk ? (
                <>
                  {" "}
                  · last commit valid
                </>
              ) : null}
            </p>
          </section>

          <div className="layout">
            <section className="panel">
              <div className="panel-head">
                <h2>Rendered Surface</h2>
                <p className="hint">
                  {mode} · view “{view}” · live annotation
                </p>
              </div>
              <div className="surface-host">
                <Surface
                  key={surfaceKey}
                  id={subject}
                  mode={mode}
                  view={view}
                  data={data}
                  onSubmit={handleSubmit}
                />
              </div>
            </section>

            <aside className="side">
              <section className="panel annotation-editor">
                <div className="panel-head">
                  <h2>Annotation</h2>
                  <p className="hint">live · top-level subject</p>
                </div>
                <textarea
                  className="annotation-textarea"
                  rows={18}
                  spellCheck={false}
                  value={annotationText}
                  onChange={(event) =>
                    setCurrentAnnotationText(event.target.value)
                  }
                />
                {parsedAnnotation.error !== undefined ? (
                  <span className="status error">{parsedAnnotation.error}</span>
                ) : (
                  <span className="status">
                    OK · views: {availableViews.join(", ")}
                  </span>
                )}
                <div className="annotation-actions">
                  <button type="button" onClick={resetAnnotationToStarter}>
                    Reset starter
                  </button>
                </div>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2>Seed payload</h2>
                  <p className="hint">
                    committed · validated only (not the Input draft)
                    {SUBJECT_SEEDS[subject] === undefined
                      ? " · no fixture seed (starts as {})"
                      : ""}
                  </p>
                </div>
                <pre>{JSON.stringify(data, null, 2)}</pre>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2>Last Save</h2>
                  <p className="hint">
                    {lastValidation === null && !savedOk
                      ? "not yet"
                      : savedOk
                        ? "valid · same object as Seed payload"
                        : "failed — Seed payload unchanged"}
                  </p>
                </div>
                {savedOk ? (
                  <pre>{JSON.stringify(data, null, 2)}</pre>
                ) : (
                  <p className="status">
                    Save validates the Input draft, then{" "}
                    <code>onSubmit</code> moves that payload into Seed payload
                    (and Display). Invalid Save leaves Seed payload alone.
                  </p>
                )}
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
