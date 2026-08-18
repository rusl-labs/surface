import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import {
  acceptAllValidator,
  createSurfaceUi,
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  listFields,
  resolveViewChrome,
  type AnnotationDocument,
  type Schema,
} from "../../packages/core/src/index.ts";
import { createHtmlKit } from "../../packages/html/src/index.tsx";
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

const CARD_ID = "https://example.test/schemas/card-layout";
const CARD_SCHEMA: Schema = {
  $id: CARD_ID,
  type: "object",
  properties: {
    name: { type: "string" },
    photo: { type: "string" },
  },
};

const CARD_ANNOTATION: AnnotationDocument = {
  subject: CARD_ID,
  views: {
    default: {
      layout: "stack",
      direction: "vertical",
      fields: [
        { name: "photo", label: null },
        {
          label: "",
          layout: "props",
          fields: [{ name: "name", label: "Title" }],
        },
      ],
      rest: "omit",
    },
    side: {
      layout: "stack",
      direction: "horizontal",
      fields: [
        { name: "photo", label: null },
        { name: "name", label: "Title" },
      ],
      rest: "omit",
    },
  },
};

describe("view/section layout + direction", () => {
  test("resolveViewChrome exposes layout and direction", () => {
    const chrome = resolveViewChrome({
      annotation: CARD_ANNOTATION,
      coordinate: { subject: CARD_ID, path: [] },
      view: "side",
    });
    expect(chrome.layout).toBe("stack");
    expect(chrome.direction).toBe("horizontal");
  });

  test("listFields carries section layout", () => {
    const fields = listFields({
      schema: CARD_SCHEMA,
      annotation: CARD_ANNOTATION,
      coordinate: { subject: CARD_ID, path: [] },
      mode: "display",
      view: "default",
    });
    const section = fields.find((f) => f.kind === "section");
    expect(section).toMatchObject({
      kind: "section",
      label: "",
      layout: "props",
    });
  });

  test("stack view renders stack items and data attrs", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [CARD_ID]: CARD_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [CARD_ID]: CARD_ANNOTATION,
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={CARD_ID}
        mode="display"
        view="default"
        data={{ name: "Widget", photo: "https://example.com/p.png" }}
      />,
    );

    await waitFor(() => {
      const root = container.querySelector(
        ".surface-object[data-surface-layout='stack']",
      );
      expect(root).not.toBeNull();
      expect(root?.getAttribute("data-surface-direction")).toBe("vertical");
      expect(container.querySelector(".surface-stack-item")).not.toBeNull();
      // Props subsection still uses dl rows
      expect(container.querySelector(".surface-dl")).not.toBeNull();
      expect(container.textContent).toContain("Widget");
    });
  });

  test("product card view is stack with banner media", async () => {
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
      expect(
        container.querySelector(
          ".surface-object[data-surface-layout='stack']",
        ),
      ).not.toBeNull();
      expect(container.querySelector(".surface-media--banner")).not.toBeNull();
      expect(container.querySelector("img.surface-media-image")).not.toBeNull();
      expect(container.textContent).toContain("Fooo");
    });
  });
});
