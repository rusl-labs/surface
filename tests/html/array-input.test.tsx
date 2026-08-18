import { describe, expect, test } from "bun:test";
import { fireEvent, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import {
  acceptAllValidator,
  createSurfaceUi,
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
} from "../../packages/core/src/index.ts";
import { createHtmlKit } from "../../packages/html/src/index.tsx";
import { mountHtml } from "./mount.tsx";

const ROOT_ID = "https://example.test/tags";

describe("html array input renderer", () => {
  test("seeds no items when data and minItems are missing", async () => {
    const { container, getByRole } = mountHtml(
      {
        [ROOT_ID]: {
          type: "array",
          items: { type: "string", title: "Tag" },
        },
      },
      { id: ROOT_ID, mode: "input" },
    );

    await waitFor(() => {
      expect(container.querySelectorAll("ul > li").length).toBe(0);
      expect(getByRole("button", { name: "Add item" })).not.toBeNull();
    });
  });

  test("addLabel paints a visible caption on the add control", async () => {
    const personId = "https://example.test/person-add-label";
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [personId]: {
          type: "object",
          properties: {
            tags: { type: "array", items: { type: "string" } },
          },
        },
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [personId]: {
          subject: personId,
          views: {
            default: {
              fields: [
                { name: "tags", itemLabel: "tag", addLabel: "Add another" },
              ],
            },
          },
        },
      }),
      kit: createHtmlKit(),
    });
    const { getByRole } = render(
      <Surface id={personId} mode="input" data={{ tags: [] }} />,
    );

    await waitFor(() => {
      const add = getByRole("button", { name: "Add another" });
      expect(add.textContent).toContain("Add another");
    });
  });

  test("object property arrays show the field name on Add", async () => {
    const personId = "https://example.test/person";
    const { container, getByRole } = mountHtml(
      {
        [personId]: {
          type: "object",
          properties: {
            tags: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
      { id: personId, mode: "input", data: { tags: null } },
    );

    await waitFor(() => {
      expect(container.textContent).toContain("tags");
      expect(getByRole("button", { name: "Add tags" })).not.toBeNull();
    });
  });

  test("seeds minItems empty slots when data is missing", async () => {
    const { container } = mountHtml(
      {
        [ROOT_ID]: {
          type: "array",
          minItems: 2,
          items: { type: "string", title: "Tag" },
        },
      },
      { id: ROOT_ID, mode: "input" },
    );

    await waitFor(() => {
      expect(container.querySelectorAll("ul > li").length).toBe(2);
    });
  });

  test("does not seed minItems when data is null (optional unset)", async () => {
    const { container, getByRole } = mountHtml(
      {
        [ROOT_ID]: {
          type: "array",
          minItems: 4,
          items: { type: "number", title: "Coord" },
        },
      },
      { id: ROOT_ID, mode: "input", data: null },
    );

    await waitFor(() => {
      expect(container.querySelectorAll("ul > li").length).toBe(0);
      expect(getByRole("button", { name: "Add item" })).not.toBeNull();
    });
  });

  test("disables Add at maxItems", async () => {
    const { container, getByRole } = mountHtml(
      {
        [ROOT_ID]: {
          type: "array",
          maxItems: 1,
          items: { type: "string", title: "Tag" },
        },
      },
      { id: ROOT_ID, mode: "input", data: ["a"] },
    );

    await waitFor(() => {
      expect(container.querySelectorAll("ul > li").length).toBe(1);
    });

    expect(
      (getByRole("button", { name: "Add item" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  test("add and remove update the list", async () => {
    const { container, getByRole, getAllByRole } = mountHtml(
      {
        [ROOT_ID]: {
          type: "array",
          minItems: 1,
          items: { type: "string", title: "Tag" },
        },
      },
      { id: ROOT_ID, mode: "input", data: ["a"] },
    );

    await waitFor(() => {
      expect(container.querySelectorAll("ul > li").length).toBe(1);
    });

    fireEvent.click(getByRole("button", { name: "Add item" }));
    expect(container.querySelectorAll("ul > li").length).toBe(2);

    fireEvent.click(getAllByRole("button", { name: "Remove item" })[0]!);
    expect(container.querySelectorAll("ul > li").length).toBe(1);

    expect(
      (getByRole("button", { name: "Remove item" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
