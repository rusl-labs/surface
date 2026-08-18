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
  isPathLike,
  resolveOptionExpr,
} from "../../packages/html/src/fields/option-expr.ts";
import {
  resolveLink,
  resolveLinks,
} from "../../packages/html/src/fields/link.tsx";
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

describe("option expressions (path | template | literal)", () => {
  const data = {
    url: "https://example.com/p",
    label: "Stripe",
    system: "stripe",
  };

  test("path-like bare string reads a field", () => {
    expect(isPathLike("url")).toBe(true);
    expect(isPathLike("meta.href")).toBe(true);
    expect(isPathLike("Open Stripe")).toBe(false);
    expect(resolveOptionExpr(data, "url")).toBe("https://example.com/p");
    expect(resolveOptionExpr(data, "label")).toBe("Stripe");
  });

  test("template interpolates fields", () => {
    expect(resolveOptionExpr(data, "{{label}} ({{system}})")).toBe(
      "Stripe (stripe)",
    );
    expect(resolveOptionExpr(data, { template: "go:{{url}}" })).toBe(
      "go:https://example.com/p",
    );
  });

  test("literal: spaces / explicit object", () => {
    expect(resolveOptionExpr(data, "Open in Stripe")).toBe("Open in Stripe");
    expect(resolveOptionExpr(data, { literal: "View" })).toBe("View");
  });

  test("explicit path object; missing path → empty", () => {
    expect(resolveOptionExpr(data, { path: "label" })).toBe("Stripe");
    expect(resolveOptionExpr(data, { path: "missing" })).toBe("");
    expect(resolveOptionExpr(data, "missingField")).toBe("");
  });

  test("fallback path when expr absent", () => {
    expect(resolveOptionExpr(data, undefined, "url")).toBe(
      "https://example.com/p",
    );
  });
});

describe("resolveLink", () => {
  test("object: href + label with text || href", () => {
    expect(
      resolveLink(
        { url: "https://example.com/x", label: "Stripe" },
        { href: "url", text: "label" },
      ),
    ).toEqual({ href: "https://example.com/x", text: "Stripe" });

    expect(
      resolveLink({ url: "https://example.com/x" }, { href: "url", text: "label" }),
    ).toEqual({
      href: "https://example.com/x",
      text: "https://example.com/x",
    });
  });

  test("string data is the href", () => {
    expect(resolveLink("https://example.com", undefined)).toEqual({
      href: "https://example.com",
      text: "https://example.com",
    });
  });

  test("array of refs", () => {
    expect(
      resolveLinks(
        [
          { url: "https://a.test", label: "A" },
          { url: "https://b.test" },
        ],
        { href: "url", text: "label" },
      ),
    ).toEqual([
      { href: "https://a.test", text: "A" },
      { href: "https://b.test", text: "https://b.test" },
    ]);
  });
});

const REF_ID = "https://example.test/schemas/with-refs";
const REF_SCHEMA: Schema = {
  $id: REF_ID,
  type: "object",
  properties: {
    externalReferences: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: { type: "string" },
          label: { type: "string" },
        },
      },
    },
  },
};

const REF_ANNOTATION: AnnotationDocument = {
  subject: REF_ID,
  views: {
    default: {
      fields: [
        {
          name: "externalReferences",
          label: "Linked systems",
          display: {
            widget: {
              name: "link",
              $kind:
                "https://resources.rusl.com/resources/surface/schemas/default-kit#/$defs/link",
              href: "url",
              text: "label",
            },
          },
        },
      ],
      rest: "omit",
    },
  },
};

const STRING_URL_ID = "https://example.test/schemas/string-url-link";
const STRING_URL_SCHEMA: Schema = {
  $id: STRING_URL_ID,
  type: "object",
  properties: {
    url: { type: "string", format: "uri" },
    label: { type: "string" },
  },
};
const STRING_URL_ANNOTATION: AnnotationDocument = {
  subject: STRING_URL_ID,
  views: {
    default: {
      label: "",
      layout: "stack",
      fields: [
        { name: "label", label: "Label" },
        {
          name: "url",
          label: "URL",
          widget: { name: "link" },
        },
      ],
      rest: "omit",
    },
  },
};

describe("HTML kit link widget", () => {
  test("input on empty string url shows one URL label (not object chrome)", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [STRING_URL_ID]: STRING_URL_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [STRING_URL_ID]: STRING_URL_ANNOTATION,
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface id={STRING_URL_ID} mode="input" data={{ label: "CRM" }} />,
    );

    await waitFor(() => {
      expect(container.querySelector('input[type="url"]')).not.toBeNull();
    });

    const labels = [...container.querySelectorAll(".surface-label")].map(
      (el) => el.textContent,
    );
    // Property Label + single URL chrome — never nested URL/Label from object editor.
    expect(labels.filter((t) => t === "URL")).toHaveLength(1);
    expect(labels.filter((t) => t === "Label")).toHaveLength(1);
  });

  test("display renders <a href={url}>{label}</a>", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [REF_ID]: REF_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [REF_ID]: REF_ANNOTATION,
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={REF_ID}
        mode="display"
        data={{
          externalReferences: [
            {
              url: "https://example.com/products/foooo",
              label: "Stripe",
            },
          ],
        }}
      />,
    );

    await waitFor(() => {
      const a = container.querySelector("a.surface-link") as HTMLAnchorElement | null;
      expect(a).not.toBeNull();
      expect(a?.getAttribute("href")).toBe("https://example.com/products/foooo");
      expect(a?.textContent).toBe("Stripe");
      // No raw field dump
      expect(container.textContent).not.toContain("Publicly Accessible");
    });
  });

  test("product default view links external references", async () => {
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
      const a = container.querySelector("a.surface-link");
      expect(a).not.toBeNull();
      expect(a?.getAttribute("href")).toBe("https://example.com/products/foooo");
      expect(a?.textContent).toBe("Stripe");
    });
  });
});
