import { describe, expect, test } from "bun:test";
import { fireEvent, waitFor } from "@testing-library/react";
import { mountHtml } from "./mount.tsx";

const ROOT = "https://example.test/place";

describe("html enum renderer", () => {
  test("string enum renders as a select with options", async () => {
    const { container } = mountHtml(
      {
        [ROOT]: {
          type: "object",
          required: ["region"],
          properties: {
            region: {
              type: "string",
              enum: ["AK", "AL", "CA", "NY"],
              title: "State",
            },
          },
        },
      },
      { id: ROOT, mode: "input", data: { region: "CA" } },
    );

    await waitFor(() => {
      const select = container.querySelector(
        'select[name="region"]',
      ) as HTMLSelectElement | null;
      expect(select).not.toBeNull();
      expect(select?.value).toBe("CA");
      const labels = [...(select?.options ?? [])].map((o) => o.textContent);
      expect(labels).toContain("CA");
      expect(labels).toContain("NY");
    });
  });

  test("$ref into enum def still resolves to select (region-style)", async () => {
    const subId = "https://example.test/subdivision";
    const { container } = mountHtml(
      {
        [ROOT]: {
          type: "object",
          properties: {
            region: { $ref: `${subId}#/$defs/US` },
          },
        },
        [subId]: {
          $defs: {
            US: {
              type: "string",
              enum: ["CA", "NY", "TX"],
              title: "US subdivision",
            },
          },
        },
      },
      { id: ROOT, mode: "input", data: { region: "TX" } },
    );

    await waitFor(() => {
      const select = container.querySelector(
        'select[name="region"]',
      ) as HTMLSelectElement | null;
      expect(select).not.toBeNull();
      expect(select?.value).toBe("TX");
      expect(container.querySelector('input[name="region"]')).toBeNull();
    });
  });

  test("changing the select writes through the data channel into onSubmit", async () => {
    const { render } = await import("@testing-library/react");
    const {
      createSurfaceUi,
      InMemorySchemaFetchResolver,
      acceptAllValidator,
    } = await import("../../packages/core/src/index.ts");
    const { createHtmlKit } = await import("../../packages/html/src/index.tsx");

    const submits: unknown[] = [];
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [ROOT]: {
          type: "object",
          properties: {
            region: { type: "string", enum: ["CA", "NY"] },
          },
        },
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={ROOT}
        mode="input"
        data={{ region: "CA" }}
        onSubmit={({ data }) => {
          submits.push(data);
        }}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector("select")).not.toBeNull();
    });

    const select = container.querySelector("select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "NY" } });
    fireEvent.click(
      [...container.querySelectorAll("button")].find((b) =>
        (b.textContent ?? "").includes("Save"),
      )!,
    );

    await waitFor(() => {
      expect(submits.length).toBe(1);
    });
    expect(submits[0]).toEqual({ region: "NY" });
  });
});
