import { describe, expect, test } from "bun:test";
import { waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import {
  acceptAllValidator,
  createSurfaceUi,
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  type AnnotationDocument,
} from "../../packages/core/src/index.ts";
import { createHtmlKit } from "../../packages/html/src/index.tsx";

const ROOT = "https://example.test/person";

const SCHEMA = {
  $id: ROOT,
  type: "object",
  properties: {
    name: { type: "string" },
    title: { type: "string" },
    organization: { type: "string" },
  },
};

/** Identity-style view: chrome only, no bound fields. */
const ANNOTATION: AnnotationDocument = {
  subject: ROOT,
  views: {
    identity: {
      label: "",
      layout: "stack",
      fields: [
        { kind: "banner", template: "{{name}}" },
        { kind: "span", template: "{{title}} — {{organization}}" },
      ],
      rest: "omit",
    },
  },
};

describe("html root form chrome for readout views", () => {
  test("chrome-only identity view skips Reset/Save form actions", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({ [ROOT]: SCHEMA }),
      annotationResolver: new InMemoryAnnotationResolver({
        [ROOT]: ANNOTATION,
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={ROOT}
        mode="input"
        view="identity"
        data={{
          name: "Jane Doe",
          title: "VP of Sales",
          organization: "Acme Corp",
        }}
      />,
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Jane Doe");
      expect(container.textContent).toContain("VP of Sales — Acme Corp");
    });

    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector(".surface-form")).toBeNull();
    expect(
      [...container.querySelectorAll("button")].some((b) =>
        (b.textContent ?? "").includes("Save"),
      ),
    ).toBe(false);
  });
});
