import { afterEach, describe, expect, mock, test } from "bun:test";
import { InMemorySchemaFetchResolver } from "../../packages/core/src/resolvers/in-memory-schema-resolver.ts";

const GEO = "https://example.test/geo";
const geoDocument = {
  $id: GEO,
  $defs: {
    point: {
      type: "object",
      title: "Point",
      properties: {
        coordinates: { $ref: "#/$defs/position" },
      },
    },
    position: { type: "array", title: "Position", minItems: 2 },
  },
};

const originalFetch = globalThis.fetch;

/** Bun's mock() lacks fetch's preconnect; attach one so the type holds. */
function mockFetch(
  impl: (input: RequestInfo | URL) => Promise<Response>,
): typeof fetch {
  return Object.assign(mock(impl), { preconnect: () => {} });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("InMemorySchemaFetchResolver", () => {
  test("resolveSchema returns a seeded document root", async () => {
    const resolver = new InMemorySchemaFetchResolver({
      [GEO]: geoDocument,
    });

    await expect(resolver.resolveSchema(GEO)).resolves.toEqual(geoDocument);
  });

  test("resolveSchema applies a $defs fragment to the seeded document", async () => {
    const resolver = new InMemorySchemaFetchResolver({
      [GEO]: geoDocument,
    });

    const point = await resolver.resolveSchema(`${GEO}#/$defs/point`);
    expect(point).toEqual(geoDocument.$defs.point);
    expect(point).not.toHaveProperty("$defs");
  });

  test("resolveDocument returns the whole document, never a fragment node", async () => {
    const resolver = new InMemorySchemaFetchResolver({
      [GEO]: geoDocument,
    });

    await expect(resolver.resolveDocument(GEO)).resolves.toEqual(geoDocument);
  });

  test("resolveSchema returns undefined for a missing fragment", async () => {
    const resolver = new InMemorySchemaFetchResolver({
      [GEO]: geoDocument,
    });

    await expect(
      resolver.resolveSchema(`${GEO}#/$defs/missing`),
    ).resolves.toBeUndefined();
  });

  test("seeded fragment URI returns that exact node", async () => {
    const pointOnly = { type: "object", title: "SeededPoint" };
    const resolver = new InMemorySchemaFetchResolver({
      [`${GEO}#/$defs/point`]: pointOnly,
    });

    await expect(
      resolver.resolveSchema(`${GEO}#/$defs/point`),
    ).resolves.toEqual(pointOnly);
  });

  test("fetches and caches a remote document, then serves fragments from cache", async () => {
    let fetchCount = 0;
    globalThis.fetch = mockFetch(async (input) => {
      fetchCount += 1;
      expect(String(input)).toBe(GEO);
      return new Response(JSON.stringify(geoDocument), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const resolver = new InMemorySchemaFetchResolver();

    const root = await resolver.resolveSchema(GEO);
    expect(root).toEqual(geoDocument);
    expect(fetchCount).toBe(1);

    const point = await resolver.resolveSchema(`${GEO}#/$defs/point`);
    expect(point).toEqual(geoDocument.$defs.point);
    expect(fetchCount).toBe(1);

    const again = await resolver.resolveDocument(GEO);
    expect(again).toEqual(geoDocument);
    expect(fetchCount).toBe(1);
  });

  test("throws when fetch is not ok", async () => {
    globalThis.fetch = mockFetch(async () => {
      return new Response("nope", { status: 404, statusText: "Not Found" });
    });

    const resolver = new InMemorySchemaFetchResolver();
    await expect(resolver.resolveSchema(GEO)).rejects.toThrow(
      /Failed to fetch schema from .*Not Found/,
    );
  });

  test("prefers seed map over fetch", async () => {
    globalThis.fetch = mockFetch(async () => {
      throw new Error("fetch should not run for seeded uris");
    });

    const resolver = new InMemorySchemaFetchResolver({
      [GEO]: { type: "string", title: "Seeded" },
    });

    await expect(resolver.resolveSchema(GEO)).resolves.toEqual({
      type: "string",
      title: "Seeded",
    });
  });
});
