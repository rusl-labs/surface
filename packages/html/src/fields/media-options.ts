/**
 * Media-specific helpers on top of shared option expressions.
 */
import type { AnnotationWidget } from "@rusl-labs/surface";
import {
  isRecord,
  optionNumber,
  optionString,
  resolveOptionExpr,
} from "./option-expr.js";
import { widgetBag } from "./widget-bag.js";

export {
  getByPath,
  interpolateTemplate,
  isRecord,
  optionBoolean,
  optionNumber,
  optionString,
  resolveOptionExpr,
  resolveOptionSlot,
} from "./option-expr.js";

const VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac)(\?|#|$)/i;

export type MediaKind = "image" | "video" | "audio" | "unknown";

export function mediaKindFromUrl(url: string): MediaKind {
  if (url.length === 0) return "unknown";
  if (VIDEO_EXT.test(url)) return "video";
  if (AUDIO_EXT.test(url)) return "audio";
  return "image";
}

export type ResolvedAsset = {
  readonly src: string;
  readonly alt: string;
  readonly kind: MediaKind;
};

/** Params from the whole widget object (flat + options). */
export function mediaParams(
  widget: AnnotationWidget | undefined,
): Record<string, unknown> {
  return widgetBag(widget);
}

/** One asset from object / string data using option field maps. */
export function resolveAsset(
  data: unknown,
  params: Record<string, unknown> | undefined,
): ResolvedAsset | undefined {
  if (typeof data === "string") {
    const src = data.trim();
    if (src.length === 0) return undefined;
    return { src, alt: "", kind: mediaKindFromUrl(src) };
  }
  if (!isRecord(data)) return undefined;

  const src = resolveOptionExpr(data, params?.src, "url").trim();
  if (src.length === 0) return undefined;
  const alt = resolveOptionExpr(data, params?.alt, "alt");
  return { src, alt, kind: mediaKindFromUrl(src) };
}

/** Zero or more assets: single object/string, or array of them. */
export function resolveAssets(
  data: unknown,
  params: Record<string, unknown> | undefined,
): ResolvedAsset[] {
  if (Array.isArray(data)) {
    const out: ResolvedAsset[] = [];
    for (const item of data) {
      const asset = resolveAsset(item, params);
      if (asset !== undefined) out.push(asset);
    }
    return out;
  }
  const one = resolveAsset(data, params);
  return one !== undefined ? [one] : [];
}

export function mediaStyle(
  params: Record<string, unknown> | undefined,
): { maxHeight?: number; objectFit?: "cover" | "contain" } | undefined {
  const maxHeight = optionNumber(params, "maxHeight");
  const fit = optionString(params, "fit");
  if (maxHeight === undefined && fit === undefined) return undefined;
  return {
    ...(maxHeight !== undefined ? { maxHeight } : {}),
    ...(fit === "cover" || fit === "contain" ? { objectFit: fit } : {}),
  };
}
