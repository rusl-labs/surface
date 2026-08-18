import { describe, expect, test } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import {
  acceptAllValidator,
  createSurfaceUi,
  InMemorySchemaFetchResolver,
} from "../../packages/core/src/index.ts";
import { createHtmlKit } from "../../packages/html/src/index.tsx";
import { mountHtml } from "./mount.tsx";

const ROOT_ID = "https://example.test/person";

describe("html object renderer", () => {
  test("walks properties in defined order and mounts child Surfaces", async () => {
    const { container } = mountHtml(
      {
        [ROOT_ID]: {
          type: "object",
          properties: {
            title: { type: "string" },
            note: { type: "string" },
          },
        },
      },
      {
        id: ROOT_ID,
        mode: "input",
        data: { title: "Hello", note: "World" },
      },
    );

    await waitFor(() => {
      expect(container.querySelectorAll("input").length).toBe(2);
      expect(
        (container.querySelector('input[name="title"]') as HTMLInputElement)
          .defaultValue,
      ).toBe("Hello");
      expect(
        (container.querySelector('input[name="note"]') as HTMLInputElement)
          .defaultValue,
      ).toBe("World");
    });
  });

  test("resolves $ref properties with the property name, not the type title", async () => {
    const regionId = "https://example.test/subdivision-us";
    const { container } = mountHtml(
      {
        [ROOT_ID]: {
          type: "object",
          properties: {
            region: { $ref: regionId },
          },
        },
        [regionId]: {
          type: "string",
          title: "United States subdivision code",
          enum: ["TX", "CA"],
        },
      },
      { id: ROOT_ID, mode: "display", data: { region: "TX" } },
    );

    await waitFor(() => {
      expect(container.textContent).toContain("region");
      expect(container.textContent).toContain("TX");
      expect(container.textContent).not.toContain(
        "United States subdivision code",
      );
    });
  });

  test("absolute $ref to a $defs fragment uses that def, not sibling defs", async () => {
    const geoId = "https://example.test/geo";
    const addressId = "https://example.test/address";
    const { container, queryByRole } = mountHtml(
      {
        [addressId]: {
          type: "object",
          title: "Address",
          required: ["geo"],
          properties: {
            geo: { $ref: `${geoId}#/$defs/point` },
          },
        },
        [geoId]: {
          $ref: "#/$defs/geometry",
          $defs: {
            bbox: {
              type: "array",
              minItems: 4,
              maxItems: 6,
              items: { type: "number" },
            },
            position: {
              type: "array",
              minItems: 2,
              maxItems: 3,
              items: { type: "number" },
            },
            point: {
              type: "object",
              required: ["type", "coordinates"],
              properties: {
                bbox: { $ref: "#/$defs/bbox" },
                coordinates: { $ref: "#/$defs/position" },
                type: { const: "Point" },
              },
            },
            geometry: {
              anyOf: [{ $ref: "#/$defs/point" }],
            },
          },
        },
      },
      { id: addressId, mode: "input" },
    );

    await waitFor(() => {
      expect(container.textContent).toContain("geo");
      expect(queryByRole("button", { name: "Add coordinates" })).not.toBeNull();
    });

    const typeInput = container.querySelector(
      'input[name="type"]',
    ) as HTMLInputElement | null;
    expect(typeInput?.value ?? typeInput?.getAttribute("value")).toBe("Point");
    expect(typeInput?.readOnly).toBe(true);
    expect(queryByRole("button", { name: "Add bbox" })).not.toBeNull();
    expect(queryByRole("button", { name: "Remove bbox" })).toBeNull();
    expect(queryByRole("button", { name: "Add coordinates" })).not.toBeNull();
    expect(container.querySelectorAll("ul > li").length).toBe(2);
  });

  test("still mounts optional scalar fields when unset", async () => {
    const { container } = mountHtml(
      {
        [ROOT_ID]: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
            note: { type: "string" },
          },
        },
      },
      { id: ROOT_ID, mode: "input" },
    );

    await waitFor(() => {
      expect(container.querySelectorAll("input").length).toBe(2);
    });
  });

  test("display mode uses a definition list (dt/dd) without double labels", async () => {
    const { container } = mountHtml(
      {
        [ROOT_ID]: {
          type: "object",
          title: "Person",
          properties: {
            name: { type: "string" },
            age: { type: "integer" },
            tags: { type: "array", items: { type: "string" } },
          },
        },
      },
      {
        id: ROOT_ID,
        mode: "display",
        data: { name: "Ada", age: 36, tags: ["math", "poet"] },
      },
    );

    await waitFor(() => {
      expect(container.querySelector("dl.surface-dl")).not.toBeNull();
      expect(container.textContent).toContain("Ada");
      expect(container.querySelectorAll("dt.surface-label").length).toBe(3);
    });

    const nameRow = [...container.querySelectorAll(".surface-prop")].find(
      (row) => row.querySelector("dt")?.textContent === "name",
    );
    expect(nameRow).toBeTruthy();
    const nameDd = nameRow?.querySelector("dd");
    expect(nameDd?.textContent).toContain("Ada");
    // Value cell only — no second "name" label from FieldChrome.
    expect(nameDd?.querySelector(".surface-label")).toBeNull();

    expect(container.textContent).toContain("math, poet");
    expect(container.querySelector("ul")).toBeNull();
  });

  test("display mode does not show Add/Remove for optional structured props", async () => {
    const addressId = "https://example.test/address-display-geo";
    const geoId = "https://example.test/geo-display";
    const schemas = {
      [addressId]: {
        type: "object",
        required: ["street1"],
        properties: {
          street1: { type: "string" },
          geo: { $ref: `${geoId}#/$defs/point` },
        },
      },
      [geoId]: {
        $defs: {
          point: {
            type: "object",
            properties: {
              type: { const: "Point" },
            },
          },
        },
      },
    };

    const present = mountHtml(schemas, {
      id: addressId,
      mode: "display",
      data: {
        street1: "1 Market",
        geo: { type: "Point" },
      },
    });

    await waitFor(() => {
      expect(present.container.textContent).toContain("1 Market");
      expect(present.container.textContent).toContain("Point");
    });
    expect(present.queryByRole("button", { name: /Remove/i })).toBeNull();
    expect(present.queryByRole("button", { name: /Add/i })).toBeNull();
    // Display still paints a use-site label for present optional structured props.
    expect(present.container.textContent).toContain("geo");

    const absent = mountHtml(schemas, {
      id: addressId,
      mode: "display",
      data: { street1: "1 Market" },
    });

    await waitFor(() => {
      expect(absent.container.textContent).toContain("1 Market");
    });
    // Absent optional structured: no Add control and no empty geo shell.
    expect(absent.queryByRole("button", { name: /Add/i })).toBeNull();
    expect(absent.queryByRole("button", { name: /Remove/i })).toBeNull();
    expect(absent.container.querySelector('input[name="type"]')).toBeNull();
  });

  test("input mode shows Add when optional structured prop is absent", async () => {
    const addressId = "https://example.test/address-add-geo";
    const geoId = "https://example.test/geo-add";
    const { queryByRole, getByRole } = mountHtml(
      {
        [addressId]: {
          type: "object",
          required: ["street1"],
          properties: {
            street1: { type: "string" },
            geo: { $ref: `${geoId}#/$defs/point` },
          },
        },
        [geoId]: {
          $defs: {
            point: {
              type: "object",
              properties: {
                type: { const: "Point" },
              },
            },
          },
        },
      },
      {
        id: addressId,
        mode: "input",
        data: { street1: "1 Market" },
      },
    );

    await waitFor(() => {
      expect(queryByRole("button", { name: "Add geo" })).not.toBeNull();
    });
    expect(queryByRole("button", { name: "Remove geo" })).toBeNull();

    getByRole("button", { name: "Add geo" }).click();

    await waitFor(() => {
      expect(queryByRole("button", { name: "Remove geo" })).not.toBeNull();
      expect(queryByRole("button", { name: "Add geo" })).toBeNull();
    });
  });

  test("optional object/$ref property is collapsed until Add, removable after", async () => {
    const addressId = "https://example.test/address-opt-geo";
    const geoId = "https://example.test/geo-opt";
    const submits: unknown[] = [];
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [addressId]: {
          type: "object",
          required: ["street1"],
          properties: {
            street1: { type: "string" },
            geo: {
              $ref: `${geoId}#/$defs/point`,
              description: "Optional GeoJSON Point",
            },
          },
        },
        [geoId]: {
          $defs: {
            point: {
              type: "object",
              required: ["type", "coordinates"],
              properties: {
                type: { const: "Point" },
                coordinates: {
                  type: "array",
                  minItems: 2,
                  maxItems: 3,
                  items: { type: "number" },
                },
              },
            },
          },
        },
      }),
      kit: createHtmlKit(),
    });

    const { container, queryByRole, getByRole } = render(
      <Surface
        id={addressId}
        mode="input"
        data={{ street1: "1 Market", geo: { type: "Point", coordinates: [1, 2] } }}
        onSubmit={({ data }) => {
          submits.push(data);
        }}
      />,
    );

    await waitFor(() => {
      expect(queryByRole("button", { name: "Remove geo" })).not.toBeNull();
    });

    getByRole("button", { name: "Remove geo" }).click();

    await waitFor(() => {
      expect(queryByRole("button", { name: "Add geo" })).not.toBeNull();
      expect(queryByRole("button", { name: "Add coordinates" })).toBeNull();
    });

    fireEvent.click(
      [...container.querySelectorAll("button")].find((b) =>
        (b.textContent ?? "").includes("Save"),
      )!,
    );

    await waitFor(() => {
      expect(submits.length).toBe(1);
    });
    // Omit the key — do not leave geo: null (invalid for object/$ref).
    expect(submits[0]).toEqual({ street1: "1 Market" });
    expect(
      Object.prototype.hasOwnProperty.call(submits[0] as object, "geo"),
    ).toBe(false);
  });
});

