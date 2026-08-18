import { describe, expect, test } from "bun:test";
import { fireEvent, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import {
  acceptAllValidator,
  createSurfaceUi,
  InMemorySchemaFetchResolver,
  type SurfaceValidator,
  type ValidateResult,
} from "../../packages/core/src/index.ts";
import { createHtmlKit } from "../../packages/html/src/index.tsx";

const ROOT = "https://example.test/person";

function clickSave(container: HTMLElement): void {
  const save = [...container.querySelectorAll("button")].find((b) =>
    (b.textContent ?? "").includes("Save"),
  );
  expect(save).toBeDefined();
  expect(save!.type).toBe("button");
  fireEvent.click(save!);
}

describe("html root form chrome", () => {
  test("root input gets Reset/Save chrome without a native form", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [ROOT]: {
          type: "object",
          properties: { name: { type: "string" } },
        },
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface id={ROOT} mode="input" data={{ name: "Ada" }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".surface-form")).not.toBeNull();
    });

    expect(container.querySelector("form")).toBeNull();
    expect(
      [...container.querySelectorAll("button")].some((b) =>
        (b.textContent ?? "").includes("Reset"),
      ),
    ).toBe(true);
    const save = [...container.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("Save"),
    );
    expect(save?.type).toBe("button");
  });

  test("Save validates then calls onSubmit with channel data when valid", async () => {
    const submits: unknown[] = [];
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [ROOT]: {
          type: "object",
          properties: { name: { type: "string" } },
        },
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={ROOT}
        mode="input"
        data={{ name: "Ada" }}
        onSubmit={({ data }) => {
          submits.push(data);
        }}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector(".surface-form")).not.toBeNull();
    });

    clickSave(container);

    await waitFor(() => {
      expect(submits.length).toBe(1);
    });
    expect(submits[0]).toEqual({ name: "Ada" });
  });

  test("Save does not call onSubmit when validation fails", async () => {
    const submits: unknown[] = [];
    const rejecting: SurfaceValidator = {
      validate(): ValidateResult {
        return {
          valid: false,
          issues: [{ path: ["name"], message: "Required" }],
        };
      },
    };

    const { Surface } = createSurfaceUi({
      validator: rejecting,
      schemaResolver: new InMemorySchemaFetchResolver({
        [ROOT]: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string", minLength: 1 } },
        },
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={ROOT}
        mode="input"
        data={{ name: "" }}
        onSubmit={({ data }) => {
          submits.push(data);
        }}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector(".surface-form")).not.toBeNull();
    });

    clickSave(container);

    await waitFor(() => {
      expect(
        container.querySelector(".surface-error")?.textContent,
      ).toContain("Required");
    });
    expect(submits.length).toBe(0);
  });

  test("path [] issues show form-level error chrome after failed Save", async () => {
    const submits: unknown[] = [];
    const rejecting: SurfaceValidator = {
      validate(): ValidateResult {
        return {
          valid: false,
          issues: [
            {
              path: [],
              message: "must match exactly one schema in oneOf",
            },
          ],
        };
      },
    };

    const { Surface } = createSurfaceUi({
      validator: rejecting,
      schemaResolver: new InMemorySchemaFetchResolver({
        [ROOT]: {
          type: "object",
          properties: { name: { type: "string" } },
        },
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={ROOT}
        mode="input"
        data={{ name: "Ada" }}
        onSubmit={({ data }) => {
          submits.push(data);
        }}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector(".surface-form")).not.toBeNull();
    });

    clickSave(container);

    await waitFor(() => {
      const banner = container.querySelector(".surface-form-errors");
      expect(banner).not.toBeNull();
      expect(banner?.textContent).toContain("oneOf");
      expect(banner?.getAttribute("role")).toBe("alert");
    });
    // Field chrome must not steal a path-[] issue.
    expect(container.querySelector('input[name="name"]')?.className).not.toContain(
      "surface-invalid",
    );
    expect(submits.length).toBe(0);
  });

  test("after failed Save, editing re-validates and clears field errors", async () => {
    const ROOT_ID = "https://example.test/person-live";
    const validator: SurfaceValidator = {
      validate({ data }): ValidateResult {
        const name =
          typeof data === "object" &&
          data !== null &&
          typeof (data as { name?: unknown }).name === "string"
            ? (data as { name: string }).name
            : "";
        if (name.length < 2) {
          return {
            valid: false,
            issues: [{ path: ["name"], message: "Too short" }],
          };
        }
        return { valid: true, issues: [] };
      },
    };

    const { Surface } = createSurfaceUi({
      validator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [ROOT_ID]: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string", minLength: 2 } },
        },
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface id={ROOT_ID} mode="input" data={{ name: "" }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".surface-form")).not.toBeNull();
    });

    clickSave(container);

    await waitFor(() => {
      expect(container.querySelector(".surface-error")?.textContent).toContain(
        "Too short",
      );
    });

    const input = container.querySelector(
      'input[name="name"]',
    ) as HTMLInputElement;
    input.value = "Ada";
    fireEvent.input(input);

    await waitFor(() => {
      expect(container.querySelector(".surface-error")).toBeNull();
    });
  });

  test("display mode does not wrap in form chrome", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [ROOT]: {
          type: "object",
          properties: { name: { type: "string" } },
        },
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface id={ROOT} mode="display" data={{ name: "Ada" }} />,
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Ada");
    });
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector(".surface-form")).toBeNull();
  });

  test("root allOf (not type:object) still gets Save chrome via kit.Root", async () => {
    const ALL_OF = "https://example.test/allof-root";
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [ALL_OF]: {
          allOf: [
            {
              type: "object",
              properties: { name: { type: "string" } },
            },
          ],
        },
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface id={ALL_OF} mode="input" data={{ name: "Ada" }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".surface-form")).not.toBeNull();
    });
    expect(container.querySelector("form")).toBeNull();
    const save = [...container.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("Save"),
    );
    expect(save?.type).toBe("button");
  });
});
