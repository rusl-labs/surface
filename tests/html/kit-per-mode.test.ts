import { describe, expect, test } from "bun:test";
import {
  createHtmlKit,
  DEFAULT_KIT_TEL,
  PHONE_ID,
} from "../../packages/html/src/index.tsx";
import type { RendererRequest } from "../../packages/core/src/index.ts";

function request(
  key: string,
  mode: "input" | "display",
  schema: Record<string, unknown>,
): RendererRequest {
  return {
    keys: [key],
    mode,
    view: "default",
    schema,
  };
}

describe("html kit per-mode registration", () => {
  const kit = createHtmlKit();

  test.each([
    ["string", { type: "string" }],
    ["number", { type: "number" }],
    ["boolean", { type: "boolean" }],
    ["const", { const: "x" }],
    ["enum", { enum: ["a", "b"] }],
    ["array", { type: "array", items: { type: "string" } }],
    ["object", { type: "object", properties: {} }],
    ["allOf", { allOf: [{ type: "object" }] }],
    ["oneOf", { oneOf: [{ type: "string" }] }],
    ["anyOf", { anyOf: [{ type: "string" }] }],
  ] as const)(
    "%s resolves distinct input and display components",
    (key, schema) => {
      const input = kit.resolveRenderer(request(key, "input", schema));
      const display = kit.resolveRenderer(request(key, "display", schema));
      expect(input).toBeDefined();
      expect(display).toBeDefined();
      // perMode registers separate components so mode chrome cannot share a body.
      expect(input).not.toBe(display);
    },
  );

  test("table is display-only; input falls through to array", () => {
    const display = kit.resolveRenderer(
      request("table", "display", { type: "array" }),
    );
    const tableInput = kit.resolveRenderer(
      request("table", "input", { type: "array" }),
    );
    const arrayInput = kit.resolveRenderer({
      keys: ["table", "array"],
      mode: "input",
      view: "default",
      schema: { type: "array" },
    });
    const arrayOnly = kit.resolveRenderer(
      request("array", "input", { type: "array" }),
    );
    expect(display).toBeDefined();
    expect(tableInput).toBeUndefined();
    expect(arrayInput).toBe(arrayOnly);
  });

  test("aliases reuse the short-name registration", () => {
    const tel = kit.resolveRenderer(
      request("tel", "display", { type: "string" }),
    );
    expect(
      kit.resolveRenderer(request("date-time", "input", { type: "string" })),
    ).toBe(
      kit.resolveRenderer(request("datetime", "input", { type: "string" })),
    );
    expect(
      kit.resolveRenderer(request("idn-email", "display", { type: "string" })),
    ).toBe(kit.resolveRenderer(request("email", "display", { type: "string" })));
    expect(
      kit.resolveRenderer(request(PHONE_ID, "display", { type: "string" })),
    ).toBe(tel);
    expect(
      kit.resolveRenderer(
        request(DEFAULT_KIT_TEL, "display", { type: "string" }),
      ),
    ).toBe(tel);
    expect(
      kit.resolveRenderer(
        request("uri-reference", "input", { type: "string" }),
      ),
    ).toBe(kit.resolveRenderer(request("uri", "input", { type: "string" })));
  });
});
