import { describe, expect, test } from "bun:test";
import { fireEvent, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import {
  createSurfaceUi,
  InMemorySchemaFetchResolver,
  type SurfaceValidator,
  type ValidateResult,
} from "../../packages/core/src/index.ts";
import { createHtmlKit } from "../../packages/html/src/index.tsx";
import { mountHtml } from "./mount.tsx";

describe("html string channel validation", () => {
  test("shows projected channel error after failed Save", async () => {
    const rootId = "https://example.test/person";
    const validator: SurfaceValidator = {
      validate({ data }): ValidateResult {
        const record =
          typeof data === "object" && data !== null
            ? (data as Record<string, unknown>)
            : {};
        const code = record.countryCode;
        if (typeof code !== "string" || !/^[A-Z]{2}$/.test(code)) {
          return {
            valid: false,
            issues: [
              {
                path: ["countryCode"],
                message: "Must be a 2-letter country code",
              },
            ],
          };
        }
        return { valid: true, issues: [] };
      },
    };

    const { Surface } = createSurfaceUi({
      validator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [rootId]: {
          type: "object",
          required: ["countryCode"],
          properties: {
            countryCode: {
              type: "string",
              minLength: 2,
              maxLength: 2,
              pattern: "^[A-Z]{2}$",
            },
          },
        },
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface id={rootId} mode="input" data={{ countryCode: "us" }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".surface-form")).not.toBeNull();
    });

    fireEvent.click(
      [...container.querySelectorAll("button")].find((b) =>
        (b.textContent ?? "").includes("Save"),
      )!,
    );

    await waitFor(() => {
      const alert = container.querySelector(".surface-error");
      expect(alert).not.toBeNull();
      expect(alert?.textContent).toContain("2-letter");
      const input = container.querySelector("input");
      expect(input?.className).toContain("surface-invalid");
      expect(input?.getAttribute("aria-invalid")).toBe("true");
      const describedBy = input?.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      expect(container.querySelector(`#${describedBy}`)?.textContent).toContain(
        "2-letter",
      );
    });
  });

  test("email format uses type=email", async () => {
    const rootId = "https://example.test/contact";
    const { container } = mountHtml(
      {
        [rootId]: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
          },
        },
      },
      { id: rootId, mode: "input" },
    );

    await waitFor(() => {
      const input = container.querySelector(
        'input[name="email"]',
      ) as HTMLInputElement | null;
      expect(input?.type).toBe("email");
    });
  });

  test("date-time format uses datetime-local and maps ISO ↔ wall-clock", async () => {
    const rootId = "https://example.test/invoice";
    const submits: unknown[] = [];
    const isoSeed = "2026-07-27T12:00:00.000Z";
    const { Surface } = createSurfaceUi({
      validator: {
        validate() {
          return { valid: true, issues: [] };
        },
      },
      schemaResolver: new InMemorySchemaFetchResolver({
        [rootId]: {
          type: "object",
          properties: {
            dueAt: { type: "string", format: "date-time" },
          },
        },
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={rootId}
        mode="input"
        data={{ dueAt: isoSeed }}
        onSubmit={({ data }) => {
          submits.push(data);
        }}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('input[name="dueAt"]')).not.toBeNull();
    });

    const input = container.querySelector(
      'input[name="dueAt"]',
    ) as HTMLInputElement;
    expect(input.type).toBe("datetime-local");
    // Control shows local wall-clock, not the RFC 3339 wire form.
    expect(input.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    expect(input.value).not.toContain("Z");
    // Round-trip of the seed: local control value parses back to the same instant.
    expect(new Date(input.value).toISOString()).toBe(isoSeed);

    input.value = "2026-08-20T00:19";
    fireEvent.input(input);
    fireEvent.click(
      [...container.querySelectorAll("button")].find((b) =>
        (b.textContent ?? "").includes("Save"),
      )!,
    );

    await waitFor(() => {
      expect(submits.length).toBe(1);
    });
    const payload = submits[0] as { dueAt: string };
    // Channel stores RFC 3339 / ISO 8601 (what AJV format:date-time wants).
    expect(payload.dueAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    expect(payload.dueAt).toBe(new Date("2026-08-20T00:19").toISOString());
  });

  test("edits flow through the data channel into onSubmit", async () => {
    const rootId = "https://example.test/person";
    const submits: unknown[] = [];
    const { Surface } = createSurfaceUi({
      validator: {
        validate() {
          return { valid: true, issues: [] };
        },
      },
      schemaResolver: new InMemorySchemaFetchResolver({
        [rootId]: {
          type: "object",
          properties: { name: { type: "string" } },
        },
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={rootId}
        mode="input"
        data={{ name: "Ada" }}
        onSubmit={({ data }) => {
          submits.push(data);
        }}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('input[name="name"]')).not.toBeNull();
    });

    const input = container.querySelector(
      'input[name="name"]',
    ) as HTMLInputElement;
    // happy-dom + React: set value then fire input (not change).
    input.value = "Grace";
    fireEvent.input(input);
    fireEvent.click(
      [...container.querySelectorAll("button")].find((b) =>
        (b.textContent ?? "").includes("Save"),
      )!,
    );

    await waitFor(() => {
      expect(submits.length).toBe(1);
    });
    expect(submits[0]).toEqual({ name: "Grace" });
  });
});
