import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import {
  acceptAllValidator,
  createSurfaceUi,
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  type AnnotationDocument,
  type Schema,
} from "../../packages/core/src/index.ts";
import { createHtmlKit } from "../../packages/html/src/index.tsx";
import {
  interpolateTemplate,
  mediaKindFromUrl,
  resolveAsset,
  resolveAssets,
  resolveOptionSlot,
} from "../../packages/html/src/fields/media-options.ts";
import {
  COMMERCE_PRODUCT_ID,
  COMMERCE_PRODUCT_SCHEMA,
} from "../fixtures/pragmatic-seeds.ts";
import {
  PRODUCT_ANNOTATION,
  PRODUCT_SAMPLE,
} from "../../examples/playground/commerce-product.ts";

afterEach(() => {
  cleanup();
});

describe("media-options (field maps)", () => {
  test("path string maps src → url and alt → alt", () => {
    const data = { url: "https://example.com/a.png", alt: "Widget" };
    expect(resolveOptionSlot(data, { src: "url" }, "src", "url")).toBe(
      "https://example.com/a.png",
    );
    expect(resolveOptionSlot(data, { alt: "alt" }, "alt", "alt")).toBe(
      "Widget",
    );
  });

  test("defaults to url / alt when params omit maps", () => {
    const data = { url: "https://example.com/b.jpg", alt: "Bee" };
    const asset = resolveAsset(data, undefined);
    expect(asset?.src).toBe("https://example.com/b.jpg");
    expect(asset?.alt).toBe("Bee");
    expect(asset?.kind).toBe("image");
  });

  test("template option builds src from fields", () => {
    const data = { base: "https://cdn.example", id: "p1" };
    expect(
      resolveOptionSlot(
        data,
        { src: "{{base}}/{{id}}.png" },
        "src",
        "url",
      ),
    ).toBe("https://cdn.example/p1.png");
    expect(interpolateTemplate("x-{{missing}}-y", data)).toBe("x--y");
  });

  test("mediaKindFromUrl sniffs video / audio / image", () => {
    expect(mediaKindFromUrl("https://x.test/a.mp4")).toBe("video");
    expect(mediaKindFromUrl("https://x.test/a.mp3")).toBe("audio");
    expect(mediaKindFromUrl("https://x.test/a.png")).toBe("image");
    expect(mediaKindFromUrl("https://cdn/x/no-ext")).toBe("image");
  });

  test("resolveAssets walks arrays and bare URL strings", () => {
    expect(resolveAssets("https://x.test/a.png", undefined)).toEqual([
      { src: "https://x.test/a.png", alt: "", kind: "image" },
    ]);
    expect(
      resolveAssets(
        [
          { url: "https://x.test/1.png", alt: "one" },
          { url: "https://x.test/2.mp4" },
        ],
        { src: "url", alt: "alt" },
      ),
    ).toEqual([
      { src: "https://x.test/1.png", alt: "one", kind: "image" },
      { src: "https://x.test/2.mp4", alt: "", kind: "video" },
    ]);
  });
});

const PHOTO_ID = "https://example.test/schemas/photo";
const PHOTO_SCHEMA: Schema = {
  $id: PHOTO_ID,
  type: "object",
  properties: {
    images: {
      type: "array",
      items: {
        type: "object",
        required: ["url"],
        properties: {
          url: { type: "string", format: "uri" },
          alt: { type: "string" },
        },
      },
    },
  },
};

const PHOTO_ANNOTATION: AnnotationDocument = {
  subject: PHOTO_ID,
  views: {
    default: {
      fields: [
        {
          name: "images",
          label: "Photos",
          display: {
            widget: {
              name: "media",
              $kind:
                "https://resources.rusl.com/resources/surface/schemas/default-kit#/$defs/media",
              src: "url",
              alt: "alt",
              maxHeight: 80,
            },
          },
        },
      ],
      rest: "omit",
    },
  },
};

describe("HTML kit media widget", () => {
  test("display: annotation widget:media renders img for product-like array", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [PHOTO_ID]: PHOTO_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [PHOTO_ID]: PHOTO_ANNOTATION,
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={PHOTO_ID}
        mode="display"
        data={{
          images: [
            {
              url: "https://example.com/icon.png",
              alt: "Icon",
            },
          ],
        }}
      />,
    );

    await waitFor(() => {
      const img = container.querySelector(
        "img.surface-media-image",
      ) as HTMLImageElement | null;
      expect(img).not.toBeNull();
      expect(img?.getAttribute("src")).toBe("https://example.com/icon.png");
      expect(img?.getAttribute("alt")).toBe("Icon");
    });
  });

  test("display: video URL uses video element", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [PHOTO_ID]: PHOTO_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [PHOTO_ID]: PHOTO_ANNOTATION,
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={PHOTO_ID}
        mode="display"
        data={{
          images: [{ url: "https://example.com/clip.mp4", alt: "Clip" }],
        }}
      />,
    );

    await waitFor(() => {
      const video = container.querySelector("video.surface-media-player");
      expect(video).not.toBeNull();
      expect(video?.getAttribute("src")).toBe("https://example.com/clip.mp4");
    });
  });

  test("product annotation default view shows media for images", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [COMMERCE_PRODUCT_ID]: COMMERCE_PRODUCT_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [COMMERCE_PRODUCT_ID]: PRODUCT_ANNOTATION,
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={COMMERCE_PRODUCT_ID}
        mode="display"
        view="default"
        data={PRODUCT_SAMPLE}
      />,
    );

    await waitFor(() => {
      const img = container.querySelector(
        "img.surface-media-image",
      ) as HTMLImageElement | null;
      expect(img).not.toBeNull();
      expect(img?.getAttribute("src")).toBe(PRODUCT_SAMPLE.images[0]?.url);
    });
  });

  test("product annotation card view shows media for images", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [COMMERCE_PRODUCT_ID]: COMMERCE_PRODUCT_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [COMMERCE_PRODUCT_ID]: PRODUCT_ANNOTATION,
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={COMMERCE_PRODUCT_ID}
        mode="display"
        view="card"
        data={PRODUCT_SAMPLE}
      />,
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Fooo");
      const img = container.querySelector("img.surface-media-image");
      expect(img).not.toBeNull();
      expect(img?.getAttribute("src")).toContain("rusl.com");
    });
  });
});
