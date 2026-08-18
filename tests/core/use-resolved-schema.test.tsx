import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import {
  acceptAllValidator,
  createSurfaceUi,
  InMemorySchemaFetchResolver,
  useSurface,
} from "../../packages/core/src/index.ts";
import type { SurfaceKit, SurfaceRenderer } from "../../packages/core/src/kit.ts";

const GEO = "https://example.test/geo";
const ADDRESS = "https://example.test/address";

const Probe: SurfaceRenderer = () => {
  const { schema, document, documentUri, error, loading } = useSurface();
  return (
    <div
      data-loading={loading ? "1" : "0"}
      data-error={error ?? ""}
      data-title={typeof schema?.title === "string" ? schema.title : ""}
      data-type={typeof schema?.type === "string" ? schema.type : ""}
      data-const={
        typeof schema?.const === "string" || typeof schema?.const === "boolean"
          ? String(schema.const)
          : schema?.const === undefined
            ? ""
            : JSON.stringify(schema.const)
      }
      data-document-uri={documentUri ?? ""}
      data-has-defs={document !== undefined && "$defs" in document ? "1" : "0"}
      data-prop-keys={
        schema?.properties !== undefined &&
        typeof schema.properties === "object" &&
        schema.properties !== null
          ? Object.keys(schema.properties as object).join(",")
          : ""
      }
    />
  );
};

function probeKit(): SurfaceKit {
  return {
    fallback: Probe,
    resolveRenderer: () => Probe,
  };
}

afterEach(() => {
  cleanup();
});

describe("useResolvedNode via Surface", () => {
  test("loads by id and applies a $defs fragment", async () => {
    const resolver = new InMemorySchemaFetchResolver({
      [GEO]: {
        $defs: {
          point: {
            type: "object",
            title: "Point",
            properties: {
              coordinates: { $ref: "#/$defs/position" },
            },
          },
          position: { type: "array" },
        },
      },
    });

    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: resolver,
      kit: probeKit(),
    });

    const { container } = render(
      <Surface id={`${GEO}#/$defs/point`} mode="input" />,
    );

    await waitFor(() => {
      const el = container.querySelector("[data-loading]") as HTMLElement;
      expect(el.getAttribute("data-loading")).toBe("0");
      expect(el.getAttribute("data-title")).toBe("Point");
      expect(el.getAttribute("data-type")).toBe("object");
      expect(el.getAttribute("data-document-uri")).toBe(GEO);
      expect(el.getAttribute("data-has-defs")).toBe("1");
      expect(el.getAttribute("data-prop-keys")).toBe("coordinates");
    });
  });

  test("resolves an absolute $ref on inline schema to the def node", async () => {
    const resolver = new InMemorySchemaFetchResolver({
      [ADDRESS]: {
        type: "object",
        properties: {
          geo: { $ref: `${GEO}#/$defs/point` },
        },
      },
      [GEO]: {
        $defs: {
          point: {
            type: "object",
            title: "Point",
            required: ["type", "coordinates"],
            properties: {
              type: { const: "Point" },
              coordinates: { $ref: "#/$defs/position" },
            },
          },
          position: { type: "array" },
        },
      },
    });

    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: resolver,
      kit: probeKit(),
    });

    const { container } = render(
      <Surface
        id="geo"
        mode="input"
        schema={{ $ref: `${GEO}#/$defs/point` }}
      />,
    );

    await waitFor(() => {
      const el = container.querySelector("[data-loading]") as HTMLElement;
      expect(el.getAttribute("data-loading")).toBe("0");
      expect(el.getAttribute("data-title")).toBe("Point");
      expect(el.getAttribute("data-document-uri")).toBe(GEO);
      expect(el.getAttribute("data-has-defs")).toBe("1");
      expect(el.getAttribute("data-error")).toBe("");
    });
  });

  test("resolves a relative $ref against the context document", async () => {
    const resolver = new InMemorySchemaFetchResolver({
      [GEO]: {
        $defs: {
          position: { type: "array", title: "Position" },
        },
      },
    });

    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: resolver,
      kit: probeKit(),
    });

    const { container } = render(
      <Surface
        id="coordinates"
        mode="input"
        schema={{ $ref: "#/$defs/position" }}
        document={{
          $defs: {
            position: { type: "array", title: "Position" },
          },
        }}
        documentUri={GEO}
      />,
    );

    await waitFor(() => {
      const el = container.querySelector("[data-loading]") as HTMLElement;
      expect(el.getAttribute("data-loading")).toBe("0");
      expect(el.getAttribute("data-title")).toBe("Position");
      expect(el.getAttribute("data-type")).toBe("array");
      expect(el.getAttribute("data-document-uri")).toBe(GEO);
    });
  });

  test("uses an inline schema without $ref as-is", async () => {
    const resolver = new InMemorySchemaFetchResolver();
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: resolver,
      kit: probeKit(),
    });

    const { container } = render(
      <Surface
        id="name"
        mode="input"
        schema={{ type: "string", title: "Name" }}
      />,
    );

    await waitFor(() => {
      const el = container.querySelector("[data-loading]") as HTMLElement;
      expect(el.getAttribute("data-loading")).toBe("0");
      expect(el.getAttribute("data-title")).toBe("Name");
      expect(el.getAttribute("data-type")).toBe("string");
    });
  });
});
