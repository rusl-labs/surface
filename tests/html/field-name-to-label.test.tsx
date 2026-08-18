import { describe, expect, test } from "bun:test";
import { waitFor } from "@testing-library/react";
import {
  acceptAllValidator,
  createSurfaceUi,
  InMemorySchemaFetchResolver,
} from "../../packages/core/src/index.ts";
import {
  createHtmlKit,
  humanizeFieldName,
} from "../../packages/html/src/index.tsx";
import { formatPropertyLabel } from "../../packages/html/src/fields/shared.ts";
import { render } from "@testing-library/react";

describe("humanizeFieldName", () => {
  test("splits camelCase and Title Cases", () => {
    expect(humanizeFieldName("countryCode")).toBe("Country Code");
    expect(humanizeFieldName("postalCode")).toBe("Postal Code");
    expect(humanizeFieldName("street1")).toBe("Street 1");
    expect(humanizeFieldName("billingAddress")).toBe("Billing Address");
  });

  test("leaves spaced annotation-style strings alone", () => {
    expect(humanizeFieldName("Full name")).toBe("Full name");
  });
});

describe("formatPropertyLabel", () => {
  test("rewrites bare property names only", () => {
    expect(
      formatPropertyLabel("countryCode", "countryCode", humanizeFieldName),
    ).toBe("Country Code");
    expect(
      formatPropertyLabel("name", "Full name", humanizeFieldName),
    ).toBe("Full name");
  });

  test("empty resolved label stays suppressed (annotation label: \"\")", () => {
    expect(formatPropertyLabel("emails", "", humanizeFieldName)).toBe("");
    expect(formatPropertyLabel("phones", "", (x) => x)).toBe("");
  });

  test("identity leaves bare names unchanged", () => {
    expect(formatPropertyLabel("countryCode", "countryCode", (x) => x)).toBe(
      "countryCode",
    );
  });
});

describe("createHtmlKit fieldNameToLabel", () => {
  test("display object rows use humanized bare names", async () => {
    const rootId = "https://example.test/person-labels";
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [rootId]: {
          type: "object",
          properties: {
            countryCode: { type: "string" },
            postalCode: { type: "string" },
          },
        },
      }),
      kit: createHtmlKit({ fieldNameToLabel: humanizeFieldName }),
    });

    const { container } = render(
      <Surface
        id={rootId}
        mode="display"
        data={{ countryCode: "US", postalCode: "94105" }}
      />,
    );

    await waitFor(() => {
      const dts = [...container.querySelectorAll("dt")].map(
        (n) => n.textContent ?? "",
      );
      expect(dts).toContain("Country Code");
      expect(dts).toContain("Postal Code");
      expect(dts).not.toContain("countryCode");
    });
  });
});
