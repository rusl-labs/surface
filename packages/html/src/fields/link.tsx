import type { ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { surfaceClass } from "../classes.js";
import { FieldChrome } from "./chrome.js";
import {
  isPathLike,
  optionBoolean,
  optionString,
  resolveOptionExpr,
} from "./option-expr.js";
import { widgetBag } from "./widget-bag.js";

/**
 * Default-kit link widget (`name: "link"` / `$kind` …#/$defs/link).
 * Display: `<a href={href}>{text || href}</a>`.
 */

export type ResolvedLink = {
  readonly href: string;
  readonly text: string;
};

/** Resolve one link from node data + flattened widget params. */
export function resolveLink(
  data: unknown,
  params: Record<string, unknown> | undefined,
): ResolvedLink | undefined {
  if (typeof data === "string") {
    const href = data.trim();
    if (href.length === 0) return undefined;
    const textExpr = params?.text ?? params?.label;
    const text = resolveOptionExpr(data, textExpr).trim() || href;
    return { href, text };
  }

  if (data === null || data === undefined || Array.isArray(data)) {
    return undefined;
  }

  const href = resolveOptionExpr(data, params?.href, "url").trim();
  if (href.length === 0) return undefined;

  const textRaw =
    params?.text !== undefined
      ? resolveOptionExpr(data, params.text)
      : params?.label !== undefined
        ? resolveOptionExpr(data, params.label)
        : resolveOptionExpr(data, undefined, "label");
  const text = textRaw.trim().length > 0 ? textRaw.trim() : href;
  return { href, text };
}

export function resolveLinks(
  data: unknown,
  params: Record<string, unknown> | undefined,
): ResolvedLink[] {
  if (Array.isArray(data)) {
    const out: ResolvedLink[] = [];
    for (const item of data) {
      const link = resolveLink(item, params);
      if (link !== undefined) out.push(link);
    }
    return out;
  }
  const one = resolveLink(data, params);
  return one !== undefined ? [one] : [];
}

function linkAttrs(
  params: Record<string, unknown> | undefined,
  href: string,
): { target?: string; rel?: string } {
  const external =
    optionBoolean(params, "external") ?? /^https?:\/\//i.test(href);
  const target =
    optionString(params, "target") ?? (external ? "_blank" : undefined);
  const rel =
    optionString(params, "rel") ??
    (target === "_blank" ? "noopener noreferrer" : undefined);
  return {
    ...(target !== undefined ? { target } : {}),
    ...(rel !== undefined ? { rel } : {}),
  };
}

function Anchor({
  link,
  params,
}: {
  readonly link: ResolvedLink;
  readonly params: Record<string, unknown> | undefined;
}): ReactElement {
  const attrs = linkAttrs(params, link.href);
  return (
    <a className={surfaceClass.link} href={link.href} {...attrs}>
      {link.text}
    </a>
  );
}

function pathKey(
  params: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const raw = params[key];
  if (typeof raw === "string" && isPathLike(raw)) return raw;
  return fallback;
}

export function LinkDisplay(_props: SurfaceProps): ReactElement {
  const { data, entry } = useSurface();
  const params = widgetBag(entry?.widget);
  const links = resolveLinks(data, params);

  if (links.length === 0) {
    return (
      <FieldChrome as="div" className={surfaceClass.linkHost}>
        <span className={surfaceClass.value}>—</span>
      </FieldChrome>
    );
  }

  if (links.length === 1) {
    return (
      <FieldChrome as="div" className={surfaceClass.linkHost}>
        <Anchor link={links[0]!} params={params} />
      </FieldChrome>
    );
  }

  return (
    <FieldChrome as="div" className={surfaceClass.linkHost}>
      <ul className={surfaceClass.linkList}>
        {links.map((link, index) => (
          <li key={`${link.href}:${index}`} className={surfaceClass.linkItem}>
            <Anchor link={link} params={params} />
          </li>
        ))}
      </ul>
    </FieldChrome>
  );
}

export function LinkInput({ data }: SurfaceProps): ReactElement {
  const { entry, dataApi, schema } = useSurface();
  const params = widgetBag(entry?.widget);

  if (Array.isArray(data)) {
    const links = resolveLinks(data, params);
    return (
      <FieldChrome as="div" className={surfaceClass.linkHost}>
        {links.length > 0 ? (
          <ul className={surfaceClass.linkList}>
            {links.map((link, index) => (
              <li
                key={`${link.href}:${index}`}
                className={surfaceClass.linkItem}
              >
                <Anchor link={link} params={params} />
              </li>
            ))}
          </ul>
        ) : null}
        <p className={surfaceClass.description}>
          Link list — edit items as objects, or use a custom list editor.
        </p>
      </FieldChrome>
    );
  }

  // Object editor only when the node is (or will be) a link object.
  // Empty / undefined string properties must not fall through here — that
  // painted FieldChrome("URL") + hardcoded URL/Label (double chrome).
  const record =
    data !== null && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : undefined;
  const stringShaped =
    record === undefined ||
    schema?.type === "string" ||
    typeof data === "string";

  if (stringShaped) {
    const value = typeof data === "string" ? data : "";
    return (
      <FieldChrome>
        <input
          className={surfaceClass.control}
          type="url"
          value={value}
          onInput={(event) => {
            dataApi?.setData(event.currentTarget.value);
          }}
        />
      </FieldChrome>
    );
  }

  const hrefPath = pathKey(params, "href", "url");
  const textPath =
    params.text !== undefined &&
    typeof params.text === "string" &&
    isPathLike(params.text)
      ? params.text
      : pathKey(params, "label", "label");

  const href =
    record[hrefPath] === undefined || record[hrefPath] === null
      ? ""
      : String(record[hrefPath]);
  const text =
    record[textPath] === undefined || record[textPath] === null
      ? ""
      : String(record[textPath]);
  const preview = resolveLink(record, params);

  function patch(key: string, value: string): void {
    dataApi?.setData({ ...record, [key]: value });
  }

  return (
    <FieldChrome as="div" className={surfaceClass.linkHost}>
      {preview !== undefined ? (
        <Anchor link={preview} params={params} />
      ) : null}
      <label className={surfaceClass.field}>
        <span className={surfaceClass.label}>URL</span>
        <input
          className={surfaceClass.control}
          type="url"
          value={href}
          onInput={(event) => {
            patch(hrefPath, event.currentTarget.value);
          }}
        />
      </label>
      <label className={surfaceClass.field}>
        <span className={surfaceClass.label}>Label</span>
        <input
          className={surfaceClass.control}
          type="text"
          value={text}
          onInput={(event) => {
            patch(textPath, event.currentTarget.value);
          }}
        />
      </label>
    </FieldChrome>
  );
}
