import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
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
import { copyText } from "../../packages/html/src/fields/copy.tsx";

afterEach(() => {
  cleanup();
});

describe("copyText", () => {
  test("stringifies scalars and JSON objects", () => {
    expect(copyText("abc")).toBe("abc");
    expect(copyText(12)).toBe("12");
    expect(copyText(true)).toBe("true");
    expect(copyText(null)).toBe("");
    expect(copyText(undefined)).toBe("");
    expect(copyText({ a: 1 })).toBe('{"a":1}');
  });
});

const CODE_ID = "https://example.test/schemas/copy-code";
const CODE_SCHEMA: Schema = {
  $id: CODE_ID,
  type: "object",
  properties: {
    sku: { type: "string" },
  },
};

const CODE_ANNOTATION: AnnotationDocument = {
  subject: CODE_ID,
  views: {
    default: {
      fields: [
        {
          name: "sku",
          label: "SKU",
          display: {
            widget: {
              name: "copy",
              $kind:
                "https://resources.rusl.com/resources/surface/schemas/default-kit#/$defs/copy",
            },
          },
        },
      ],
      rest: "omit",
    },
  },
};

describe("HTML kit copy widget", () => {
  test("display shows value and copies on click", async () => {
    const writeText = mock(async (_text: string) => {});
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [CODE_ID]: CODE_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [CODE_ID]: CODE_ANNOTATION,
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface id={CODE_ID} mode="display" data={{ sku: "SKU-99" }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".surface-copy-value")?.textContent).toBe(
        "SKU-99",
      );
    });

    const button = container.querySelector(
      "button.surface-copy-button",
    ) as HTMLButtonElement | null;
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe("Copy");
    fireEvent.click(button!);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("SKU-99");
      expect(button?.textContent).toBe("Copied");
    });
  });
});
