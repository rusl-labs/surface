import type { CSSProperties, ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { surfaceClass, sx } from "../classes.js";
import { FieldChrome } from "./chrome.js";
import {
  getByPath,
  isRecord,
  mediaParams,
  mediaStyle as mediaStyleFromParams,
  optionBoolean,
  optionNumber,
  resolveAssets,
  type ResolvedAsset,
} from "./media-options.js";
import { isPathLike } from "./option-expr.js";

/**
 * Default-kit media widget (`name: "media"` / `$kind` …#/$defs/media).
 * Params live on the whole widget object (flat and/or nested `options`).
 */

function toCssStyle(
  style: ReturnType<typeof mediaStyleFromParams>,
): CSSProperties | undefined {
  if (style === undefined) return undefined;
  return {
    ...(style.maxHeight !== undefined ? { maxHeight: style.maxHeight } : {}),
    ...(style.objectFit !== undefined ? { objectFit: style.objectFit } : {}),
  };
}

function AssetView({
  asset,
  style,
  params,
}: {
  readonly asset: ResolvedAsset;
  readonly style?: CSSProperties | undefined;
  readonly params: Record<string, unknown>;
}): ReactElement {
  const styleProp = style !== undefined ? { style } : {};
  const controls = optionBoolean(params, "controls") ?? true;
  const autoplay = optionBoolean(params, "autoplay") ?? false;
  const muted = optionBoolean(params, "muted") ?? autoplay;
  const loop = optionBoolean(params, "loop") ?? false;

  if (asset.kind === "video") {
    return (
      <video
        className={surfaceClass.mediaPlayer}
        src={asset.src}
        controls={controls}
        playsInline
        autoPlay={autoplay}
        muted={muted}
        loop={loop}
        {...styleProp}
      >
        <a href={asset.src}>{asset.src}</a>
      </video>
    );
  }
  if (asset.kind === "audio") {
    return (
      <audio
        className={surfaceClass.mediaPlayer}
        src={asset.src}
        controls={controls}
        autoPlay={autoplay}
        muted={muted}
        loop={loop}
        {...styleProp}
      >
        <a href={asset.src}>{asset.src}</a>
      </audio>
    );
  }
  return (
    <img
      className={surfaceClass.mediaImage}
      src={asset.src}
      alt={asset.alt}
      loading="lazy"
      {...styleProp}
    />
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

function isBannerLayout(params: Record<string, unknown>): boolean {
  const layout = params.layout;
  if (layout === "banner" || layout === "full" || layout === "hero") {
    return true;
  }
  return params.fullWidth === true;
}

export function MediaDisplay(_props: SurfaceProps): ReactElement {
  const { data, entry } = useSurface();
  const params = mediaParams(entry?.widget);
  let assets = resolveAssets(data, params);
  const maxItems = optionNumber(params, "maxItems");
  if (maxItems !== undefined && maxItems >= 0) {
    assets = assets.slice(0, maxItems);
  }
  const style = toCssStyle(mediaStyleFromParams(params));
  const banner = isBannerLayout(params);
  const hostClass = sx(
    surfaceClass.media,
    banner ? surfaceClass.mediaBanner : undefined,
  );

  if (assets.length === 0) {
    return (
      <FieldChrome as="div" className={hostClass}>
        <span className={surfaceClass.value}>—</span>
      </FieldChrome>
    );
  }

  return (
    <FieldChrome as="div" className={hostClass}>
      <ul className={surfaceClass.mediaList}>
        {assets.map((asset, index) => (
          <li key={`${asset.src}:${index}`} className={surfaceClass.mediaItem}>
            <AssetView
              asset={asset}
              params={params}
              {...(style !== undefined ? { style } : {})}
            />
          </li>
        ))}
      </ul>
    </FieldChrome>
  );
}

export function MediaInput({ data }: SurfaceProps): ReactElement {
  const { entry, dataApi } = useSurface();
  const params = mediaParams(entry?.widget);
  const srcPath = pathKey(params, "src", "url");
  const altPath = pathKey(params, "alt", "alt");

  if (Array.isArray(data)) {
    const assets = resolveAssets(data, params);
    const listStyle = toCssStyle(mediaStyleFromParams(params));
    return (
      <FieldChrome as="div" className={surfaceClass.media}>
        {assets.length > 0 ? (
          <ul className={surfaceClass.mediaList}>
            {assets.map((asset, index) => (
              <li
                key={`${asset.src}:${index}`}
                className={surfaceClass.mediaItem}
              >
                <AssetView
                  asset={asset}
                  params={params}
                  {...(listStyle !== undefined ? { style: listStyle } : {})}
                />
              </li>
            ))}
          </ul>
        ) : null}
        <p className={surfaceClass.description}>
          Media list — edit items with the default array fields, or use a
          custom gallery widget.
        </p>
      </FieldChrome>
    );
  }

  if (typeof data === "string") {
    return (
      <FieldChrome>
        <input
          className={surfaceClass.control}
          type="url"
          value={data}
          onInput={(event) => {
            dataApi?.setData(event.currentTarget.value);
          }}
        />
      </FieldChrome>
    );
  }

  const record = isRecord(data) ? data : {};
  const srcRaw = getByPath(record, srcPath);
  const altRaw = getByPath(record, altPath);
  const src = srcRaw === undefined || srcRaw === null ? "" : String(srcRaw);
  const alt = altRaw === undefined || altRaw === null ? "" : String(altRaw);
  const preview = resolveAssets(record, params);
  const style = toCssStyle(mediaStyleFromParams(params));

  function patch(key: string, value: string): void {
    dataApi?.setData({ ...record, [key]: value });
  }

  return (
    <FieldChrome as="div" className={sx(surfaceClass.media, surfaceClass.group)}>
      {preview.length > 0 ? (
        <div className={surfaceClass.mediaItem}>
          <AssetView
            asset={preview[0]!}
            params={params}
            {...(style !== undefined ? { style } : {})}
          />
        </div>
      ) : null}
      <label className={surfaceClass.field}>
        <span className={surfaceClass.label}>URL</span>
        <input
          className={surfaceClass.control}
          type="url"
          value={src}
          onInput={(event) => {
            patch(srcPath, event.currentTarget.value);
          }}
        />
      </label>
      <label className={surfaceClass.field}>
        <span className={surfaceClass.label}>Alt text</span>
        <input
          className={surfaceClass.control}
          type="text"
          value={alt}
          onInput={(event) => {
            patch(altPath, event.currentTarget.value);
          }}
        />
      </label>
    </FieldChrome>
  );
}
