import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import {
  acceptAllValidator,
  createSurfaceUi,
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  type AnnotationDocument,
  type Schema,
} from "../../packages/core/src/index.ts";
import { createHtmlKit } from "../../packages/html/src/index.tsx";
import { mountHtml } from "./mount.tsx";

const ROOT_ID = "https://example.test/kind";

afterEach(() => {
  cleanup();
});

function mountAnnotated(
  schemas: Record<string, Schema>,
  annotations: Record<string, AnnotationDocument>,
  props: {
    id: string;
    mode: "input" | "display";
    data?: unknown;
  },
) {
  const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
    schemaResolver: new InMemorySchemaFetchResolver(schemas),
    annotationResolver: new InMemoryAnnotationResolver(annotations),
    kit: createHtmlKit(),
  });
  return render(<Surface {...props} />);
}

describe("html const renderer", () => {
  test("input mode renders a read-only field with the const value", async () => {
    const { container } = mountHtml(
      {
        [ROOT_ID]: {
          const: "https://example.test/kind",
          description: "fixed kind",
        },
      },
      { id: ROOT_ID, mode: "input" },
    );

    await waitFor(() => {
      const input = container.querySelector(
        `input[name="${ROOT_ID}"]`,
      ) as HTMLInputElement | null;
      expect(input).not.toBeNull();
      expect(input?.value ?? input?.getAttribute("value")).toBe(
        "https://example.test/kind",
      );
      expect(input?.readOnly).toBe(true);
      expect(input?.disabled).toBe(false);
    });
  });

  test("object property consts show the field name and fixed value", async () => {
    const addressId = "https://example.test/us-address";
    const { container } = mountHtml(
      {
        [addressId]: {
          type: "object",
          properties: {
            countryCode: { const: "US" },
            street: { type: "string" },
          },
        },
      },
      {
        id: addressId,
        mode: "input",
        data: { countryCode: "US", street: "" },
      },
    );

    await waitFor(() => {
      expect(container.textContent).toContain("countryCode");
      const constInput = container.querySelector(
        'input[name="countryCode"]',
      ) as HTMLInputElement | null;
      expect(constInput?.value ?? constInput?.getAttribute("value")).toBe("US");
      expect(constInput?.readOnly).toBe(true);
    });
  });

  test("display mode shows field name and const value", async () => {
    const addressId = "https://example.test/us-address";
    const { container } = mountHtml(
      {
        [addressId]: {
          type: "object",
          properties: {
            countryCode: { const: "US" },
          },
        },
      },
      { id: addressId, mode: "display", data: { countryCode: "US" } },
    );

    await waitFor(() => {
      expect(container.textContent).toContain("countryCode");
      expect(container.textContent).toContain("US");
      expect(container.querySelector("input")).toBeNull();
    });
  });

  test("$kind const is a hidden submit field with no label by default", async () => {
    const invoiceId = "https://example.test/invoice";
    const { container } = mountHtml(
      {
        [invoiceId]: {
          type: "object",
          properties: {
            $kind: { const: invoiceId },
            number: { type: "string" },
          },
        },
      },
      {
        id: invoiceId,
        mode: "input",
        data: { $kind: invoiceId, number: "INV-1" },
      },
    );

    await waitFor(() => {
      expect(container.querySelector('input[name="number"]')).not.toBeNull();
    });

    const kind = container.querySelector(
      'input[name="$kind"]',
    ) as HTMLInputElement | null;
    expect(kind).not.toBeNull();
    expect(kind?.type).toBe("hidden");
    expect(kind?.value ?? kind?.getAttribute("value")).toBe(invoiceId);
    expect(container.textContent).not.toContain("$kind");
    expect(
      container.querySelector('input[name="$kind"]:not([type="hidden"])'),
    ).toBeNull();
  });

  test("Save applies const/default before validate even without waiting for mount effects", async () => {
    const addressId = "https://example.test/us-address-save-fill";
    const submits: unknown[] = [];
    const schemas: Record<string, Schema> = {
      [addressId]: {
        type: "object",
        required: ["$kind", "countryCode", "street"],
        properties: {
          $kind: { const: addressId },
          countryCode: { const: "US" },
          street: { type: "string" },
          tag: { type: "string", default: "home" },
        },
      },
    };
    // Use real AJV so missing const would fail validation without pre-fill.
    const { createAjvValidator } = await import(
      "../../packages/ajv/src/index.ts"
    );
    const { Surface } = createSurfaceUi({
      validator: createAjvValidator({
        schemas: Object.values(schemas),
        discriminator: true,
      }),
      schemaResolver: new InMemorySchemaFetchResolver(schemas),
      kit: createHtmlKit(),
    });
    const { container } = render(
      <Surface
        id={addressId}
        mode="input"
        // No $kind / countryCode / tag — Save must inject them first.
        data={{ street: "1 Market" }}
        onSubmit={({ data }) => {
          submits.push(data);
        }}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('input[name="street"]')).not.toBeNull();
    });

    // Click Save immediately (do not wait for field useEffects).
    const save = [...container.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("Save"),
    );
    save!.click();

    await waitFor(() => {
      expect(submits.length).toBe(1);
    });
    expect(submits[0]).toEqual({
      street: "1 Market",
      $kind: addressId,
      countryCode: "US",
      tag: "home",
    });
  });

  test("annotation hidden:true still seeds const into the data channel on Save", async () => {
    const addressId = "https://example.test/us-address";
    const submits: unknown[] = [];
    const schemas: Record<string, Schema> = {
      [addressId]: {
        type: "object",
        required: ["$kind", "countryCode", "street"],
        properties: {
          $kind: { const: addressId },
          countryCode: { const: "US" },
          street: { type: "string" },
        },
      },
    };
    const annotations: Record<string, AnnotationDocument> = {
      [addressId]: {
        subject: addressId,
        views: {
          default: {
            fields: [
              { name: "$kind", hidden: true },
              { name: "countryCode", hidden: true },
              { name: "street", label: "Street" },
            ],
            rest: "omit",
          },
        },
      },
    };
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver(schemas),
      annotationResolver: new InMemoryAnnotationResolver(annotations),
      kit: createHtmlKit(),
    });
    const { container } = render(
      <Surface
        id={addressId}
        mode="input"
        data={{ street: "1 Market" }}
        onSubmit={({ data }) => {
          submits.push(data);
        }}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('input[name="street"]')).not.toBeNull();
    });
    // Const seeders mount as hidden; channel gets $kind + countryCode.
    await waitFor(() => {
      const kind = container.querySelector(
        'input[name="$kind"]',
      ) as HTMLInputElement | null;
      const country = container.querySelector(
        'input[name="countryCode"]',
      ) as HTMLInputElement | null;
      expect(kind?.type).toBe("hidden");
      expect(kind?.value).toBe(addressId);
      expect(country?.type).toBe("hidden");
      expect(country?.value).toBe("US");
    });

    const save = [...container.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("Save"),
    );
    expect(save).toBeDefined();
    save!.click();

    await waitFor(() => {
      expect(submits.length).toBe(1);
    });
    expect(submits[0]).toEqual({
      $kind: addressId,
      countryCode: "US",
      street: "1 Market",
    });
  });

  test("schema default is written when channel value is undefined", async () => {
    const rootId = "https://example.test/with-default";
    const submits: unknown[] = [];
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [rootId]: {
          type: "object",
          properties: {
            status: { type: "string", default: "draft" },
            name: { type: "string" },
          },
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
    // Let useSeedSchemaValue flush default onto the channel.
    await waitFor(() => {
      const status = container.querySelector(
        'input[name="status"]',
      ) as HTMLInputElement | null;
      expect(status?.value).toBe("draft");
    });

    const save = [...container.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("Save"),
    );
    save!.click();

    await waitFor(() => {
      expect(submits.length).toBe(1);
    });
    expect(submits[0]).toEqual({ name: "Ada", status: "draft" });
  });

  test("annotation can surface $kind with a label", async () => {
    const invoiceId = "https://example.test/invoice";
    const { container } = mountAnnotated(
      {
        [invoiceId]: {
          type: "object",
          properties: {
            $kind: { const: invoiceId },
            number: { type: "string" },
          },
        },
      },
      {
        [invoiceId]: {
          subject: invoiceId,
          views: {
            default: {
              fields: [
                { name: "$kind", label: "Document type" },
                { name: "number", label: "Number" },
              ],
              rest: "omit",
            },
          },
        },
      },
      {
        id: invoiceId,
        mode: "input",
        data: { $kind: invoiceId, number: "INV-1" },
      },
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Document type");
    });
    const kind = container.querySelector(
      'input[name="$kind"]',
    ) as HTMLInputElement | null;
    expect(kind?.type).toBe("text");
    expect(kind?.readOnly).toBe(true);
  });
});
