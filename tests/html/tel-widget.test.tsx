import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import {
  acceptAllValidator,
  createSurfaceUi,
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  type AnnotationDocument,
  type Schema,
} from "../../packages/core/src/index.ts";
import { createHtmlKit, PHONE_ID } from "../../packages/html/src/index.tsx";
import { resolveTel } from "../../packages/html/src/fields/tel.tsx";
import contactScalars from "../../schemas/pragmatic/contact.scalars.schema.json" with {
  type: "json",
};
import { CONTACT_SCALARS_ID } from "../fixtures/pragmatic-seeds.ts";

afterEach(() => {
  cleanup();
});

describe("resolveTel", () => {
  test("E.164 formats nationally in the number's locale", () => {
    const resolved = resolveTel("+14155550100", undefined, "en-US");
    expect(resolved).toBeDefined();
    expect(resolved?.parsed).toBe(true);
    expect(resolved?.href).toBe("tel:+14155550100");
    expect(resolved?.text).toBe("(415) 555-0100");
  });

  test("foreign number formats internationally for the viewer locale", () => {
    const resolved = resolveTel("+14155550100", undefined, "en-GB");
    expect(resolved).toEqual({
      href: "tel:+14155550100",
      text: "+1 415 555 0100",
      parsed: true,
    });
  });

  test("UK E.164 formats nationally for a GB viewer", () => {
    const resolved = resolveTel("+442071838750", undefined, "en-GB");
    expect(resolved).toBeDefined();
    expect(resolved?.parsed).toBe(true);
    expect(resolved?.href).toBe("tel:+442071838750");
    expect(resolved?.text).toBe("020 7183 8750");
  });

  test("unparseable string still yields tel: fallback", () => {
    const resolved = resolveTel("not-a-phone");
    expect(resolved).toEqual({
      href: "tel:not-a-phone",
      text: "not-a-phone",
      parsed: false,
    });
  });

  test("empty / non-string → undefined", () => {
    expect(resolveTel("")).toBeUndefined();
    expect(resolveTel("   ")).toBeUndefined();
    expect(resolveTel(null)).toBeUndefined();
    expect(resolveTel(42)).toBeUndefined();
  });
});

const PHONE_CONTACT_ID = "https://example.test/schemas/phone-contact";
const PHONE_SCHEMA: Schema = {
  $id: PHONE_CONTACT_ID,
  type: "object",
  properties: {
    phone: {
      type: "string",
      pattern: "^\\+[1-9][0-9]{1,14}$",
    },
  },
};

const PHONE_ANNOTATION: AnnotationDocument = {
  subject: PHONE_CONTACT_ID,
  views: {
    default: {
      fields: [
        {
          name: "phone",
          label: "Phone",
          display: {
            widget: {
              name: "tel",
              $kind:
                "https://resources.rusl.com/resources/rusl/schemas/surface.default-kit#/$defs/tel",
            },
          },
        },
      ],
      rest: "omit",
    },
  },
};

function phoneInputAnnotation(
  widget: Record<string, unknown> = {},
): AnnotationDocument {
  return {
    subject: PHONE_CONTACT_ID,
    views: {
      default: {
        fields: [
          {
            name: "phone",
            label: "Phone",
            widget: {
              name: "tel",
              $kind:
                "https://resources.rusl.com/resources/rusl/schemas/surface.default-kit#/$defs/tel",
              ...widget,
            },
          },
        ],
        rest: "omit",
      },
    },
  };
}

const PHONE_INPUT_ANNOTATION = phoneInputAnnotation({ defaultCountry: "US" });
const PHONE_BARE_ANNOTATION = phoneInputAnnotation();

describe("HTML kit tel widget", () => {
  test("display renders national format with tel: link", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [PHONE_CONTACT_ID]: PHONE_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [PHONE_CONTACT_ID]: PHONE_ANNOTATION,
      }),
      kit: createHtmlKit({ locale: "en-US" }),
    });

    const { container } = render(
      <Surface
        id={PHONE_CONTACT_ID}
        mode="display"
        data={{ phone: "+14155550100" }}
      />,
    );

    await waitFor(() => {
      const a = container.querySelector(
        "a.surface-tel",
      ) as HTMLAnchorElement | null;
      expect(a).not.toBeNull();
      expect(a?.getAttribute("href")).toBe("tel:+14155550100");
      expect(a?.textContent).toBe("(415) 555-0100");
    });
  });

  test("blur of national number with defaultCountry US writes E.164", async () => {
    const submits: unknown[] = [];
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [PHONE_CONTACT_ID]: PHONE_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [PHONE_CONTACT_ID]: PHONE_INPUT_ANNOTATION,
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={PHONE_CONTACT_ID}
        mode="input"
        data={{ phone: "" }}
        onSubmit={({ data }) => {
          submits.push(data);
        }}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('input[type="tel"]')).not.toBeNull();
    });

    const input = container.querySelector(
      'input[type="tel"]',
    ) as HTMLInputElement;
    input.value = "(415) 555-0100";
    fireEvent.input(input);
    fireEvent.blur(input);

    fireEvent.click(
      [...container.querySelectorAll("button")].find((b) =>
        (b.textContent ?? "").includes("Save"),
      )!,
    );

    await waitFor(() => {
      expect(submits.length).toBe(1);
    });
    expect(submits[0]).toEqual({ phone: "+14155550100" });
    expect(input.value).not.toBe("+14155550100");
    expect(input.value).toContain("415");
  });

  test("country picker is seeded from defaultCountry", async () => {
    const { container } = render(
      (() => {
        const { Surface } = createSurfaceUi({
          validator: acceptAllValidator,
          schemaResolver: new InMemorySchemaFetchResolver({
            [PHONE_CONTACT_ID]: PHONE_SCHEMA,
          }),
          annotationResolver: new InMemoryAnnotationResolver({
            [PHONE_CONTACT_ID]: PHONE_INPUT_ANNOTATION,
          }),
          kit: createHtmlKit(),
        });
        return (
          <Surface id={PHONE_CONTACT_ID} mode="input" data={{ phone: "" }} />
        );
      })(),
    );

    await waitFor(() => {
      const trigger = container.querySelector(
        'button[aria-label="Country United States"]',
      );
      expect(trigger).not.toBeNull();
      expect(trigger?.textContent).toContain("+1");
    });
  });

  test("kit tel.defaultCountry seeds parse when the field omits it", async () => {
    const submits: unknown[] = [];
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [PHONE_CONTACT_ID]: PHONE_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [PHONE_CONTACT_ID]: PHONE_BARE_ANNOTATION,
      }),
      kit: createHtmlKit({ tel: { defaultCountry: "US" } }),
    });

    const { container } = render(
      <Surface
        id={PHONE_CONTACT_ID}
        mode="input"
        data={{ phone: "" }}
        onSubmit={({ data }) => {
          submits.push(data);
        }}
      />,
    );

    await waitFor(() => {
      expect(
        container.querySelector('button[aria-label="Country United States"]'),
      ).not.toBeNull();
      expect(container.querySelector('input[type="tel"]')).not.toBeNull();
    });

    const input = container.querySelector(
      'input[type="tel"]',
    ) as HTMLInputElement;
    input.value = "4155550100";
    fireEvent.input(input);
    expect(container.querySelector(".surface-error")).toBeNull();
    fireEvent.blur(input);

    fireEvent.click(
      [...container.querySelectorAll("button")].find((b) =>
        (b.textContent ?? "").includes("Save"),
      )!,
    );

    await waitFor(() => {
      expect(submits.length).toBe(1);
    });
    expect(submits[0]).toEqual({ phone: "+14155550100" });
    expect(input.value).toBe("(415) 555-0100");
  });

  test("field defaultCountry wins over kit tel.defaultCountry", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [PHONE_CONTACT_ID]: PHONE_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [PHONE_CONTACT_ID]: phoneInputAnnotation({ defaultCountry: "GB" }),
      }),
      kit: createHtmlKit({ tel: { defaultCountry: "US" } }),
    });

    const { container } = render(
      <Surface id={PHONE_CONTACT_ID} mode="input" data={{ phone: "" }} />,
    );

    await waitFor(() => {
      expect(
        container.querySelector(
          'button[aria-label="Country United Kingdom"]',
        ),
      ).not.toBeNull();
    });
  });

  test("country picker search can switch default country", async () => {
    const submits: unknown[] = [];
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [PHONE_CONTACT_ID]: PHONE_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [PHONE_CONTACT_ID]: PHONE_INPUT_ANNOTATION,
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={PHONE_CONTACT_ID}
        mode="input"
        data={{ phone: "" }}
        onSubmit={({ data }) => {
          submits.push(data);
        }}
      />,
    );

    await waitFor(() => {
      expect(
        container.querySelector('button[aria-label="Country United States"]'),
      ).not.toBeNull();
    });

    fireEvent.click(
      container.querySelector(
        'button[aria-label="Country United States"]',
      )!,
    );

    await waitFor(() => {
      expect(
        container.querySelector('input[aria-label="Search country"]'),
      ).not.toBeNull();
    });

    const search = container.querySelector(
      'input[aria-label="Search country"]',
    ) as HTMLInputElement;
    search.value = "united kingdom";
    fireEvent.change(search);

    await waitFor(() => {
      const option = [...container.querySelectorAll('[role="option"]')].find(
        (el) => (el.textContent ?? "").includes("United Kingdom"),
      );
      expect(option).toBeDefined();
      fireEvent.click(option!);
    });

    await waitFor(() => {
      expect(
        container.querySelector(
          'button[aria-label="Country United Kingdom"]',
        ),
      ).not.toBeNull();
    });

    const input = container.querySelector(
      'input[type="tel"]',
    ) as HTMLInputElement;
    input.value = "020 7183 8750";
    fireEvent.input(input);
    fireEvent.blur(input);

    fireEvent.click(
      [...container.querySelectorAll("button")].find((b) =>
        (b.textContent ?? "").includes("Save"),
      )!,
    );

    await waitFor(() => {
      expect(submits.length).toBe(1);
    });
    expect(submits[0]).toEqual({ phone: "+442071838750" });
  });

  test("invalid string stays raw and shows an error after blur", async () => {
    const submits: unknown[] = [];
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [PHONE_CONTACT_ID]: PHONE_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [PHONE_CONTACT_ID]: PHONE_INPUT_ANNOTATION,
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface
        id={PHONE_CONTACT_ID}
        mode="input"
        data={{ phone: "" }}
        onSubmit={({ data }) => {
          submits.push(data);
        }}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('input[type="tel"]')).not.toBeNull();
    });

    const input = container.querySelector(
      'input[type="tel"]',
    ) as HTMLInputElement;
    input.value = "not-a-phone";
    fireEvent.input(input);
    expect(container.querySelector(".surface-error")).toBeNull();
    fireEvent.blur(input);

    await waitFor(() => {
      expect(input.value).toBe("not-a-phone");
      const alert = container.querySelector(".surface-error");
      expect(alert).not.toBeNull();
      expect(alert?.textContent?.length).toBeGreaterThan(0);
      expect(input.className).toContain("surface-invalid");
    });

    fireEvent.click(
      [...container.querySelectorAll("button")].find((b) =>
        (b.textContent ?? "").includes("Save"),
      )!,
    );

    await waitFor(() => {
      expect(submits.length).toBe(1);
    });
    expect(submits[0]).toEqual({ phone: "not-a-phone" });
  });
});

const PHONE_SCALAR: Schema = {
  $id: PHONE_ID,
  type: "string",
  pattern: "^\\+[1-9][0-9]{1,14}$",
};

describe("HTML kit phone $id", () => {
  test("display is a locale tel: link with no widget annotation", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver(),
      annotationResolver: new InMemoryAnnotationResolver({}),
      kit: createHtmlKit({ locale: "en-GB" }),
    });

    const { container } = render(
      <Surface
        id={PHONE_ID}
        schema={PHONE_SCALAR}
        mode="display"
        data="+14155550100"
      />,
    );

    await waitFor(() => {
      const a = container.querySelector(
        "a.surface-tel",
      ) as HTMLAnchorElement | null;
      expect(a).not.toBeNull();
      expect(a?.getAttribute("href")).toBe("tel:+14155550100");
      expect(a?.textContent).toBe("+1 415 555 0100");
    });
  });

  test("input is the tel control with no widget annotation", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver(),
      annotationResolver: new InMemoryAnnotationResolver({}),
      kit: createHtmlKit({ tel: { defaultCountry: "US" } }),
    });

    const { container } = render(
      <Surface
        id={PHONE_ID}
        schema={PHONE_SCALAR}
        mode="input"
        data="+14155550100"
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('input[type="tel"]')).not.toBeNull();
      expect(
        container.querySelector('button[aria-label="Country United States"]'),
      ).not.toBeNull();
    });
    expect(
      (container.querySelector('input[type="tel"]') as HTMLInputElement).value,
    ).toBe("(415) 555-0100");
  });

  test("$ref to contact.scalars#/$defs/phone dispatches tel with no widget", async () => {
    const holderId = "https://example.test/schemas/has-phone";
    const holder: Schema = {
      $id: holderId,
      type: "object",
      properties: {
        phone: { $ref: PHONE_ID },
      },
    };
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [holderId]: holder,
        [CONTACT_SCALARS_ID]: contactScalars as Schema,
      }),
      annotationResolver: new InMemoryAnnotationResolver({}),
      kit: createHtmlKit({ locale: "en-GB" }),
    });

    const { container } = render(
      <Surface
        id={holderId}
        mode="display"
        data={{ phone: "+14155550100" }}
      />,
    );

    await waitFor(() => {
      const a = container.querySelector(
        "a.surface-tel",
      ) as HTMLAnchorElement | null;
      expect(a).not.toBeNull();
      expect(a?.getAttribute("href")).toBe("tel:+14155550100");
      expect(a?.textContent).toBe("+1 415 555 0100");
    });
  });
});
