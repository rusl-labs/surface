import { describe, expect, test } from "bun:test";
import {
  getJsonPointer,
  resolveSchemaRef,
  schemaAtUri,
  splitSchemaUri,
} from "../../packages/core/src/resolvers/schema-uri.ts";
import { InMemorySchemaFetchResolver } from "../../packages/core/src/resolvers/in-memory-schema-resolver.ts";

describe("schema URI fragments", () => {
  test("splitSchemaUri separates document and pointer", () => {
    expect(
      splitSchemaUri("https://example.test/geo#/$defs/point"),
    ).toEqual({
      documentUri: "https://example.test/geo",
      pointer: "/$defs/point",
    });
  });

  test("splitSchemaUri treats a trailing hash as no pointer", () => {
    expect(splitSchemaUri("https://example.test/geo#")).toEqual({
      documentUri: "https://example.test/geo",
      pointer: undefined,
    });
  });

  test("splitSchemaUri with no hash returns the whole uri as document", () => {
    expect(splitSchemaUri("https://example.test/geo")).toEqual({
      documentUri: "https://example.test/geo",
      pointer: undefined,
    });
  });

  test("getJsonPointer reads $defs entries", () => {
    const doc = {
      $defs: {
        point: { type: "object", title: "Point" },
      },
    };
    expect(getJsonPointer(doc, "/$defs/point")).toEqual({
      type: "object",
      title: "Point",
    });
  });

  test("getJsonPointer decodes ~0 and ~1 escapes", () => {
    const doc = {
      "tilde~key": { ok: true },
      "slash/key": { ok: true },
    };
    expect(getJsonPointer(doc, "/tilde~0key")).toEqual({ ok: true });
    expect(getJsonPointer(doc, "/slash~1key")).toEqual({ ok: true });
  });

  test("getJsonPointer returns undefined for a missing path", () => {
    expect(getJsonPointer({ a: 1 }, "/b")).toBeUndefined();
  });

  test("schemaAtUri returns the fragment node without rewriting refs", () => {
    const doc = {
      $defs: {
        point: {
          type: "object",
          properties: {
            coordinates: { $ref: "#/$defs/position" },
          },
        },
        position: { type: "array" },
      },
    };

    expect(schemaAtUri(doc, "https://example.test/geo#/$defs/point")).toEqual({
      type: "object",
      properties: {
        coordinates: { $ref: "#/$defs/position" },
      },
    });
  });

  test("resolveSchemaRef uses context document for relative refs", async () => {
    const document = {
      $defs: {
        position: { type: "array", title: "Position" },
      },
    };

    const resolved = await resolveSchemaRef("#/$defs/position", {
      document,
      documentUri: "https://example.test/geo",
    });

    expect(resolved?.schema).toEqual({ type: "array", title: "Position" });
    expect(resolved?.documentUri).toBe("https://example.test/geo");
  });

  test("resolveSchemaRef returns undefined for relative refs without context", async () => {
    await expect(
      resolveSchemaRef("#/$defs/position", {}),
    ).resolves.toBeUndefined();
  });

  test("resolveSchemaRef returns undefined for absolute refs without a resolver", async () => {
    await expect(
      resolveSchemaRef("https://example.test/geo#/$defs/point", {}),
    ).resolves.toBeUndefined();
  });

  test("resolveSchemaRef falls back to resolveSchema when resolveDocument is absent", async () => {
    const document = {
      $defs: {
        point: { type: "object", title: "Point" },
      },
    };
    const resolver = {
      async resolveSchema(uri: string) {
        if (uri === "https://example.test/geo") return document;
        return undefined;
      },
    };

    const resolved = await resolveSchemaRef(
      "https://example.test/geo#/$defs/point",
      { resolver },
    );
    expect(resolved?.schema.title).toBe("Point");
    expect(resolved?.document).toBe(document);
  });

  test("resolveSchemaRef loads absolute refs and applies $defs fragments", async () => {
    const resolver = new InMemorySchemaFetchResolver({
      "https://example.test/geo": {
        $defs: {
          point: {
            type: "object",
            title: "Point",
            properties: {
              coordinates: { $ref: "#/$defs/position" },
            },
          },
          position: { type: "array", title: "Position" },
        },
      },
    });

    const point = await resolveSchemaRef(
      "https://example.test/geo#/$defs/point",
      { resolver },
    );
    expect(point?.schema.title).toBe("Point");
    expect(point?.schema.properties).toEqual({
      coordinates: { $ref: "#/$defs/position" },
    });
    expect(point?.documentUri).toBe("https://example.test/geo");

    const position = await resolveSchemaRef("#/$defs/position", {
      document: point?.document,
      documentUri: point?.documentUri,
    });
    expect(position?.schema.title).toBe("Position");
  });

  test("InMemorySchemaFetchResolver.resolveSchema returns the $defs target", async () => {
    const resolver = new InMemorySchemaFetchResolver({
      "https://example.test/geo": {
        $defs: {
          point: { type: "object", title: "Point" },
        },
      },
    });

    const point = await resolver.resolveSchema(
      "https://example.test/geo#/$defs/point",
    );
    expect(point?.title).toBe("Point");
  });
});
