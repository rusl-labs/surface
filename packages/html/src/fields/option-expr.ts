/**
 * Kit-owned option expressions for widget field maps.
 *
 * A slot may be:
 * - **path** — dotted key into `data` (`"url"`, `"meta.href"`)
 * - **template** — `{{path}}` interpolation over record data
 * - **literal** — fixed string (`"Open in Stripe"`, full URL)
 *
 * Bare strings: `{{…}}` → template; `word.dot` path-like → path (missing → "");
 * otherwise → literal. Explicit objects always win:
 * `{ "path" }` | `{ "template" }` | `{ "literal" }`.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Walk `a.b.c` on a record; missing → undefined. */
export function getByPath(data: unknown, path: string): unknown {
  if (path.length === 0) return data;
  let cur: unknown = data;
  for (const seg of path.split(".")) {
    if (!isRecord(cur) || !(seg in cur)) return undefined;
    cur = cur[seg];
  }
  return cur;
}

/** Annotation `addLabel`: literal, or `{{path}}` over this node's data. */
export function resolveAddCaption(
  raw: string | undefined,
  data: unknown,
): string {
  if (raw === undefined) return "";
  const text = raw.includes("{{") ? interpolateTemplate(raw, data) : raw;
  return text.trim();
}

/** `{{a.b}}` over record data; missing → "". */
export function interpolateTemplate(
  template: string,
  data: unknown,
): string {
  const root = isRecord(data) ? data : undefined;
  return template.replace(/\{\{([\w.]+)\}\}/g, (_match, path: string) => {
    const value = getByPath(root, path);
    if (value === undefined || value === null) return "";
    return String(value);
  });
}

/** Bare identifier / dotted path (no spaces, schemes, etc.). */
export function isPathLike(value: string): boolean {
  return /^[\w]+(?:\.[\w]+)*$/.test(value);
}

function valueToString(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value);
}

/**
 * Resolve one option expression against node data.
 *
 * @param fallbackPath — used when `expr` is absent (default property name).
 */
export function resolveOptionExpr(
  data: unknown,
  expr: unknown,
  fallbackPath?: string,
): string {
  if (expr === undefined || expr === null) {
    if (fallbackPath !== undefined && fallbackPath.length > 0) {
      const fromFallback = getByPath(data, fallbackPath);
      if (fromFallback !== undefined && fromFallback !== null) {
        return valueToString(fromFallback);
      }
    }
    if (typeof data === "string") return data;
    return "";
  }

  if (typeof expr === "string") {
    if (expr.includes("{{")) {
      return interpolateTemplate(expr, data);
    }
    if (isPathLike(expr)) {
      return valueToString(getByPath(data, expr));
    }
    return expr; // literal
  }

  if (isRecord(expr)) {
    if (typeof expr.literal === "string") return expr.literal;
    if (typeof expr.template === "string") {
      return interpolateTemplate(expr.template, data);
    }
    if (typeof expr.path === "string") {
      return valueToString(getByPath(data, expr.path));
    }
  }

  return "";
}

/**
 * Slot helper: `options[slot]` with path/template/literal rules and a default path.
 */
export function resolveOptionSlot(
  data: unknown,
  options: Record<string, unknown> | undefined,
  slot: string,
  defaultPath: string,
): string {
  return resolveOptionExpr(data, options?.[slot], defaultPath);
}

export function optionNumber(
  options: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  const v = options?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export function optionString(
  options: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const v = options?.[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export function optionBoolean(
  options: Record<string, unknown> | undefined,
  key: string,
): boolean | undefined {
  const v = options?.[key];
  return typeof v === "boolean" ? v : undefined;
}
