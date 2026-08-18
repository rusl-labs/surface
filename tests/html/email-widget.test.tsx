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

afterEach(() => {
  cleanup();
});

const CONTACT_ID = "https://example.test/schemas/email-contact";
const CONTACT_SCHEMA: Schema = {
  $id: CONTACT_ID,
  type: "object",
  properties: {
    email: { type: "string", format: "email" },
  },
};

const CONTACT_ANNOTATION: AnnotationDocument = {
  subject: CONTACT_ID,
  views: {
    default: {
      fields: [
        {
          name: "email",
          label: "Email",
          display: {
            widget: {
              name: "email",
              $kind:
                "https://resources.rusl.com/resources/surface/schemas/default-kit#/$defs/email",
            },
          },
        },
      ],
      rest: "omit",
    },
  },
};

describe("HTML kit email widget", () => {
  test("display renders mailto: link", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [CONTACT_ID]: CONTACT_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [CONTACT_ID]: CONTACT_ANNOTATION,
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={CONTACT_ID}
        mode="display"
        data={{ email: "jane@example.com" }}
      />,
    );

    await waitFor(() => {
      const a = container.querySelector(
        "a.surface-email",
      ) as HTMLAnchorElement | null;
      expect(a).not.toBeNull();
      expect(a?.getAttribute("href")).toBe("mailto:jane@example.com");
      expect(a?.textContent).toBe("jane@example.com");
    });
  });

  test("whitespace-only value shows em dash (no mailto)", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [CONTACT_ID]: CONTACT_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [CONTACT_ID]: CONTACT_ANNOTATION,
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface id={CONTACT_ID} mode="display" data={{ email: "   " }} />,
    );

    await waitFor(() => {
      expect(container.querySelector("a.surface-email")).toBeNull();
      expect(container.textContent).toContain("—");
    });
  });

  test("format: email (no annotation) display is mailto:", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [CONTACT_ID]: CONTACT_SCHEMA,
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={CONTACT_ID}
        mode="display"
        data={{ email: "jane@example.com" }}
      />,
    );

    await waitFor(() => {
      const a = container.querySelector(
        "a.surface-email",
      ) as HTMLAnchorElement | null;
      expect(a).not.toBeNull();
      expect(a?.getAttribute("href")).toBe("mailto:jane@example.com");
      expect(a?.textContent).toBe("jane@example.com");
    });
  });
});
