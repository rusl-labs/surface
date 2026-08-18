import { describe, expect, test } from "bun:test";
import { fireEvent, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import {
  acceptAllValidator,
  createSurfaceUi,
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  type AnnotationDocument,
} from "../../packages/core/src/index.ts";
import { createHtmlKit } from "../../packages/html/src/index.tsx";
import { mountHtml } from "./mount.tsx";

describe("html allOf / oneOf renderers", () => {
  test("allOf display mode shows branch fields without edit chrome", async () => {
    const rootId = "https://example.test/postal-display";
    const usId = "https://example.test/us-display";

    const { container, queryByRole } = mountHtml(
      {
        [rootId]: {
          title: "Postal address",
          allOf: [
            {
              type: "object",
              properties: { countryCode: { type: "string" } },
            },
            {
              oneOf: [{ $ref: usId }],
            },
          ],
        },
        [usId]: {
          type: "object",
          title: "US postal address",
          properties: {
            street1: { type: "string" },
            city: { type: "string" },
          },
        },
      },
      {
        id: rootId,
        mode: "display",
        data: {
          countryCode: "US",
          $kind: usId,
          street1: "1 Market",
          city: "SF",
        },
      },
    );

    await waitFor(() => {
      expect(container.textContent).toContain("US");
      expect(container.textContent).toContain("1 Market");
      expect(container.textContent).toContain("SF");
    });
    expect(container.querySelector("select")).toBeNull();
    expect(container.querySelector("input")).toBeNull();
    expect(queryByRole("button")).toBeNull();
  });

  test("allOf mounts each branch over the same data", async () => {
    const rootId = "https://example.test/postal.address";
    const usId = "https://example.test/us-address";

    const { container } = mountHtml(
      {
        [rootId]: {
          title: "Postal address",
          allOf: [
            {
              type: "object",
              required: ["countryCode"],
              properties: {
                countryCode: { type: "string", title: "Country" },
              },
            },
            {
              oneOf: [{ $ref: usId }],
            },
          ],
        },
        [usId]: {
          type: "object",
          title: "US address",
          properties: {
            street: { type: "string", title: "Street" },
          },
        },
      },
      { id: rootId, mode: "input" },
    );

    await waitFor(() => {
      const labels = [...container.querySelectorAll("label")].map(
        (node) => node.textContent ?? "",
      );
      expect(labels.some((text) => text.includes("countryCode"))).toBe(true);
      expect(labels.some((text) => text.includes("street"))).toBe(true);
      expect(container.textContent).not.toMatch(/allOf:\d+/);
      expect(container.textContent).not.toMatch(/union:\d+/);
      expect(container.querySelector("select")).not.toBeNull();
    });
  });

  test("oneOf $ref branch does not re-print schema title under the variant select", async () => {
    const rootId = "https://example.test/postal.address";
    const usId = "https://example.test/us-address";

    const { container } = mountHtml(
      {
        [rootId]: {
          title: "Postal address",
          allOf: [
            {
              type: "object",
              properties: { countryCode: { type: "string" } },
            },
            {
              oneOf: [{ $ref: usId }],
            },
          ],
        },
        [usId]: {
          type: "object",
          title: "US postal address",
          properties: {
            street1: { type: "string" },
            city: { type: "string" },
          },
        },
      },
      {
        id: rootId,
        mode: "input",
        data: {
          countryCode: "US",
          $kind: usId,
          street1: "1 Market",
          city: "SF",
        },
      },
    );

    await waitFor(() => {
      expect(container.querySelector("select")).not.toBeNull();
      expect(container.querySelector('input[name="street1"]')).not.toBeNull();
    });

    // Select option may say "US postal address"; the nested object must not
    // also paint that schema title as a second heading.
    const titles = [...container.querySelectorAll(".surface-title")].map(
      (node) => node.textContent ?? "",
    );
    expect(titles.filter((t) => t.includes("US postal address")).length).toBe(
      0,
    );
    // Property fields still labeled.
    expect(container.textContent).toContain("street1");
    expect(container.textContent).toContain("city");
  });

  test("allOf de-dupes the same property name across branches", async () => {
    const rootId = "https://example.test/postal.address";
    const usId = "https://example.test/us-address";

    const { container } = mountHtml(
      {
        [rootId]: {
          title: "Postal address",
          allOf: [
            {
              type: "object",
              properties: {
                countryCode: { type: "string" },
              },
            },
            {
              oneOf: [{ $ref: usId }],
            },
          ],
        },
        [usId]: {
          type: "object",
          title: "US address",
          properties: {
            countryCode: { const: "US" },
            street: { type: "string" },
          },
        },
      },
      { id: rootId, mode: "input" },
    );

    await waitFor(() => {
      const labels = [...container.querySelectorAll("label")].map(
        (node) => node.textContent ?? "",
      );
      expect(labels.filter((text) => text.includes("countryCode")).length).toBe(
        1,
      );
      expect(labels.some((text) => text.includes("street"))).toBe(true);
      const countryLabel = [...container.querySelectorAll("label")].find((node) =>
        (node.textContent ?? "").includes("countryCode"),
      );
      const input = countryLabel?.querySelector(
        "input",
      ) as HTMLInputElement | null;
      expect(input?.readOnly).toBe(false);
    });
  });

  test("switching oneOf under allOf remounts the selected $ref form", async () => {
    const rootId = "https://example.test/postal.address";
    const usId = "https://example.test/us-address";
    const auId = "https://example.test/postal.au-address";

    const { container } = mountHtml(
      {
        [rootId]: {
          title: "Postal address",
          allOf: [
            {
              type: "object",
              properties: {
                countryCode: { type: "string" },
              },
            },
            {
              oneOf: [{ $ref: usId }, { $ref: auId }],
            },
          ],
        },
        [usId]: {
          type: "object",
          title: "US address",
          properties: {
            countryCode: { const: "US" },
            street: { type: "string" },
            zip: { type: "string" },
          },
        },
        [auId]: {
          type: "object",
          title: "Australian Postal Address",
          properties: {
            countryCode: { const: "AU" },
            line1: { type: "string" },
            postcode: { type: "string" },
          },
        },
      },
      { id: rootId, mode: "input" },
    );

    await waitFor(() => {
      expect(container.textContent).toContain("street");
      expect(container.textContent).toContain("zip");
    });

    const select = container.querySelector("select");
    expect(select).not.toBeNull();
    fireEvent.change(select!, { target: { value: "1" } });

    await waitFor(() => {
      expect(container.textContent).toContain("line1");
      expect(container.textContent).toContain("postcode");
      expect(container.textContent).not.toContain("street");
      // Shared allOf field still once; variant const still suppressed.
      expect(
        [...container.querySelectorAll("label")].filter((node) =>
          (node.textContent ?? "").includes("countryCode"),
        ).length,
      ).toBe(1);
    });
  });

  test("oneOf select uses resolved schema titles for $ref branches", async () => {
    const rootId = "https://example.test/union";
    const aId = "https://example.test/a";
    const bId = "https://example.test/b";

    const { container } = mountHtml(
      {
        [rootId]: {
          oneOf: [{ $ref: aId }, { $ref: bId }],
        },
        [aId]: { type: "object", title: "US address" },
        [bId]: { type: "object", title: "AU address" },
      },
      { id: rootId, mode: "input" },
    );

    await waitFor(() => {
      const options = [...container.querySelectorAll("option")].map(
        (node) => node.textContent,
      );
      expect(options).toEqual(["US address", "AU address"]);
    });
  });

  test("switching oneOf under allOf seeds const fields (countryCode) on the shared data", async () => {
    const rootId = "https://example.test/postal.address";
    const usId = "https://example.test/us-address";
    const auId = "https://example.test/postal.au-address";

    const { container } = mountHtml(
      {
        [rootId]: {
          allOf: [
            {
              type: "object",
              properties: {
                countryCode: { type: "string" },
              },
            },
            {
              oneOf: [{ $ref: usId }, { $ref: auId }],
            },
          ],
        },
        [usId]: {
          type: "object",
          title: "US address",
          properties: {
            $kind: { const: usId },
            countryCode: { const: "US" },
            street1: { type: "string" },
          },
        },
        [auId]: {
          type: "object",
          title: "AU address",
          properties: {
            $kind: { const: auId },
            countryCode: { const: "AU" },
            street1: { type: "string" },
          },
        },
      },
      {
        id: rootId,
        mode: "input",
        data: { $kind: usId, countryCode: "US", street1: "1 Market" },
      },
    );

    await waitFor(() => {
      const country = container.querySelector(
        'input[name="countryCode"]',
      ) as HTMLInputElement | null;
      expect(country?.defaultValue ?? country?.value).toBe("US");
    });

    fireEvent.change(container.querySelector("select")!, {
      target: { value: "1" },
    });

    await waitFor(() => {
      const country = container.querySelector(
        'input[name="countryCode"]',
      ) as HTMLInputElement | null;
      expect(country?.defaultValue ?? country?.value).toBe("AU");
      const street = container.querySelector(
        'input[name="street1"]',
      ) as HTMLInputElement | null;
      expect(street?.defaultValue ?? street?.value ?? "").toBe("");
    });
  });

  test("switching oneOf clears stale data when branch $kind no longer matches", async () => {
    const rootId = "https://example.test/postal.address";
    const usId = "https://example.test/us-address";
    const auId = "https://example.test/postal.au-address";

    const { container } = mountHtml(
      {
        [rootId]: {
          oneOf: [{ $ref: usId }, { $ref: auId }],
        },
        [usId]: {
          type: "object",
          title: "US address",
          properties: {
            $kind: { const: usId },
            street1: { type: "string" },
          },
        },
        [auId]: {
          type: "object",
          title: "AU address",
          properties: {
            $kind: { const: auId },
            street1: { type: "string" },
          },
        },
      },
      {
        id: rootId,
        mode: "input",
        data: { $kind: usId, street1: "1 Market St" },
      },
    );

    await waitFor(() => {
      const street = container.querySelector(
        'input[name="street1"]',
      ) as HTMLInputElement | null;
      expect(street?.defaultValue ?? street?.value).toBe("1 Market St");
    });

    fireEvent.change(container.querySelector("select")!, {
      target: { value: "1" },
    });

    await waitFor(() => {
      const street = container.querySelector(
        'input[name="street1"]',
      ) as HTMLInputElement | null;
      // Remounted with only $kind seed — not the previous street value
      expect(street?.defaultValue ?? street?.value ?? "").toBe("");
    });
  });

  test("oneOf select uses field name for inline scalar branches", async () => {
    const rootId = "https://example.test/status";

    const { container } = mountHtml(
      {
        [rootId]: {
          type: "object",
          properties: {
            status: {
              oneOf: [{ type: "string" }, { type: "null" }],
            },
          },
        },
      },
      { id: rootId, mode: "input" },
    );

    await waitFor(() => {
      const options = [...container.querySelectorAll("option")].map(
        (node) => node.textContent,
      );
      expect(options).toEqual(["status", "status"]);
    });
  });

  test("allOf Display prefers annotated fields() over branch walk", async () => {
    const rootId = "https://example.test/postal-annotated";
    const usId = "https://example.test/us-annotated";
    const annotation: AnnotationDocument = {
      subject: rootId,
      views: {
        default: {
          label: "",
          layout: "stack",
          fields: [
            { kind: "banner", template: "{{street1}}" },
            {
              kind: "span",
              template: "{{city}}, {{region}} {{postalCode}}",
            },
          ],
          rest: "omit",
        },
        row: {
          label: "",
          layout: "stack",
          direction: "horizontal",
          fields: [
            {
              kind: "span",
              template: "{{street1}}, {{city}} {{region}} {{postalCode}}",
            },
          ],
          rest: "omit",
        },
      },
    };

    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [rootId]: {
          title: "Postal address",
          allOf: [
            {
              type: "object",
              properties: { countryCode: { type: "string" } },
            },
            { oneOf: [{ $ref: usId }] },
          ],
        },
        [usId]: {
          type: "object",
          properties: {
            street1: { type: "string" },
            city: { type: "string" },
            region: { type: "string" },
            postalCode: { type: "string" },
          },
        },
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [rootId]: annotation,
      }),
      kit: createHtmlKit(),
    });

    const data = {
      countryCode: "US",
      $kind: usId,
      street1: "1 Market St",
      city: "San Francisco",
      region: "CA",
      postalCode: "94105",
    };

    const { container, rerender } = render(
      <Surface id={rootId} mode="display" view="default" data={data} />,
    );

    await waitFor(() => {
      expect(container.textContent).toContain("1 Market St");
      expect(container.textContent).toContain("San Francisco, CA 94105");
    });
    // Annotated chrome — not the labeled property dump from branch walk.
    expect(container.textContent).not.toContain("countryCode");
    expect(container.querySelector(".surface-all-of")).toBeNull();

    rerender(<Surface id={rootId} mode="display" view="row" data={data} />);
    await waitFor(() => {
      expect(container.textContent).toContain(
        "1 Market St, San Francisco CA 94105",
      );
    });
  });
});
