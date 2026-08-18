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
import { mountHtml } from "./mount.tsx";

afterEach(() => {
  cleanup();
});

const SITE_ID = "https://example.test/schemas/uri-site";
const SITE_SCHEMA: Schema = {
  $id: SITE_ID,
  type: "object",
  properties: {
    homepage: { type: "string", format: "uri" },
  },
};

const NAMED_ID = "https://example.test/schemas/uri-named";
const NAMED_SCHEMA: Schema = {
  $id: NAMED_ID,
  type: "object",
  properties: {
    homepage: { type: "string" },
  },
};

const NAMED_ANNOTATION: AnnotationDocument = {
  subject: NAMED_ID,
  views: {
    default: {
      fields: [
        {
          name: "homepage",
          label: "Homepage",
          widget: { name: "uri" },
        },
      ],
      rest: "omit",
    },
  },
};

describe("HTML kit uri widget", () => {
  test("format: uri display is an anchor", async () => {
    const { container } = mountHtml(
      { [SITE_ID]: SITE_SCHEMA },
      {
        id: SITE_ID,
        mode: "display",
        data: { homepage: "https://example.com/home" },
      },
    );

    await waitFor(() => {
      const a = container.querySelector("a") as HTMLAnchorElement | null;
      expect(a).not.toBeNull();
      expect(a?.getAttribute("href")).toBe("https://example.com/home");
      expect(a?.textContent).toBe("https://example.com/home");
    });
  });

  test('widget.name: "uri" display is an anchor', async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [NAMED_ID]: NAMED_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [NAMED_ID]: NAMED_ANNOTATION,
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={NAMED_ID}
        mode="display"
        data={{ homepage: "https://example.com/named" }}
      />,
    );

    await waitFor(() => {
      const a = container.querySelector("a") as HTMLAnchorElement | null;
      expect(a).not.toBeNull();
      expect(a?.getAttribute("href")).toBe("https://example.com/named");
      expect(a?.textContent).toBe("https://example.com/named");
    });
  });

  test("format: uri input is type=url", async () => {
    const { container } = mountHtml(
      { [SITE_ID]: SITE_SCHEMA },
      { id: SITE_ID, mode: "input" },
    );

    await waitFor(() => {
      const input = container.querySelector(
        'input[name="homepage"]',
      ) as HTMLInputElement | null;
      expect(input).not.toBeNull();
      expect(input?.type).toBe("url");
    });
  });

  test('widget.name: "uri" input is type=url', async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [NAMED_ID]: NAMED_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [NAMED_ID]: NAMED_ANNOTATION,
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(<Surface id={NAMED_ID} mode="input" />);

    await waitFor(() => {
      const input = container.querySelector(
        'input[name="homepage"]',
      ) as HTMLInputElement | null;
      expect(input).not.toBeNull();
      expect(input?.type).toBe("url");
    });
  });
});
