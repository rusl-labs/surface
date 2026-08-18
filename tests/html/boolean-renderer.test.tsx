import { describe, expect, test } from "bun:test";
import { waitFor } from "@testing-library/react";
import { mountHtml } from "./mount.tsx";

const ROOT_ID = "https://example.test/active";

describe("html boolean renderer", () => {
  test("input mode renders a labeled checkbox", async () => {
    const { getByRole } = mountHtml(
      {
        [ROOT_ID]: {
          type: "boolean",
          title: "Active",
        },
      },
      { id: ROOT_ID, mode: "input", data: true },
    );

    await waitFor(() => {
      const input = getByRole("checkbox", { name: "Active" }) as HTMLInputElement;
      expect(input.checked).toBe(true);
      expect(input.name).toBe(ROOT_ID);
    });
  });

  test("input mode leaves the checkbox unchecked when data is false", async () => {
    const { container } = mountHtml(
      { [ROOT_ID]: { type: "boolean" } },
      { id: ROOT_ID, mode: "input", data: false },
    );

    await waitFor(() => {
      const input = container.querySelector(
        'input[type="checkbox"]',
      ) as HTMLInputElement | null;
      expect(input?.defaultChecked).toBe(false);
    });
  });

  test("display mode renders true/false text", async () => {
    const { container } = mountHtml(
      {
        [ROOT_ID]: {
          type: "boolean",
          title: "Active",
        },
      },
      { id: ROOT_ID, mode: "display", data: false },
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Active");
      expect(container.textContent).toContain("false");
    });
  });
});
