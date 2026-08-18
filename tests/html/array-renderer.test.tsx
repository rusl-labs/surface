import { describe, expect, test } from "bun:test";
import { waitFor } from "@testing-library/react";
import { mountHtml } from "./mount.tsx";

const ROOT_ID = "https://example.test/tags";

describe("html array renderer", () => {
  test("display mode renders scalar string items as a comma-separated list", async () => {
    const { container, queryByRole } = mountHtml(
      {
        [ROOT_ID]: {
          type: "array",
          items: { type: "string", title: "Tag" },
        },
      },
      { id: ROOT_ID, mode: "display", data: ["a", "b"] },
    );

    await waitFor(() => {
      expect(container.textContent).toContain("a, b");
    });
    expect(container.querySelector("ul")).toBeNull();
    expect(container.querySelector("input")).toBeNull();
    expect(queryByRole("button", { name: /Add/i })).toBeNull();
    expect(queryByRole("button", { name: /Remove/i })).toBeNull();
  });

  test("display mode renders number and enum items as comma-separated lists", async () => {
    const numsId = "https://example.test/nums";
    const enumsId = "https://example.test/enums";
    const { container: nums } = mountHtml(
      {
        [numsId]: {
          type: "array",
          items: { type: "integer" },
        },
      },
      { id: numsId, mode: "display", data: [1, 2, 3] },
    );
    await waitFor(() => {
      expect(nums.textContent).toContain("1, 2, 3");
    });
    expect(nums.querySelector("ul")).toBeNull();

    const { container: enums } = mountHtml(
      {
        [enumsId]: {
          type: "array",
          items: { type: "string", enum: ["red", "green", "blue"] },
        },
      },
      { id: enumsId, mode: "display", data: ["red", "blue"] },
    );
    await waitFor(() => {
      expect(enums.textContent).toContain("red, blue");
    });
    expect(enums.querySelector("ul")).toBeNull();
  });

  test("display mode keeps a list for structured object items", async () => {
    const rootId = "https://example.test/people";
    const { container } = mountHtml(
      {
        [rootId]: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
            },
          },
        },
      },
      {
        id: rootId,
        mode: "display",
        data: [{ name: "Ada" }, { name: "Grace" }],
      },
    );

    await waitFor(() => {
      expect(container.querySelectorAll("ul > li").length).toBe(2);
      expect(container.textContent).toContain("Ada");
      expect(container.textContent).toContain("Grace");
    });
  });

  test("resolves absolute $ref string items as a comma-separated list", async () => {
    const tagId = "https://example.test/tag";
    const { container } = mountHtml(
      {
        [ROOT_ID]: {
          type: "array",
          items: { $ref: tagId },
        },
        [tagId]: { type: "string", title: "Tag" },
      },
      { id: ROOT_ID, mode: "display", data: ["x", "y"] },
    );

    await waitFor(() => {
      // Data is primitive; $ref items still splat when values are scalars.
      expect(container.textContent).toContain("x, y");
    });
    expect(container.querySelector("ul")).toBeNull();
  });
});
