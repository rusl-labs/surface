import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import {
  acceptAllValidator,
  createSurfaceUi,
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  type Schema,
} from "../../packages/core/src/index.ts";
import {
  createHtmlKit,
  formatMoneyDisplay,
  isMoney,
  MONEY_ID,
} from "../../packages/html/src/index.tsx";
import {
  majorText,
  parseMajor,
} from "../../packages/html/src/fields/money.tsx";
import {
  CURRENCY_CODE_ID,
  CURRENCY_CODE_SCHEMA,
  MONEY_SAMPLE,
  MONEY_SCHEMA,
} from "../fixtures/pragmatic-seeds.ts";

function moneyResolver(schema?: Schema): InMemorySchemaFetchResolver {
  return new InMemorySchemaFetchResolver({
    [MONEY_ID]: schema ?? MONEY_SCHEMA,
    [CURRENCY_CODE_ID]: CURRENCY_CODE_SCHEMA,
  });
}

function mountMoneyInput(opts?: {
  readonly data?: unknown;
  readonly schema?: Schema;
  readonly onSubmit?: (data: unknown) => void;
}) {
  const { Surface } = createSurfaceUi({
    validator: acceptAllValidator,
    schemaResolver: moneyResolver(opts?.schema),
    annotationResolver: new InMemoryAnnotationResolver({}),
    kit: createHtmlKit(),
  });
  return render(
    <Surface
      id={MONEY_ID}
      mode="input"
      {...(opts?.data !== undefined ? { data: opts.data } : {})}
      onSubmit={({ data }) => {
        opts?.onSubmit?.(data);
      }}
    />,
  );
}

function amountInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector(
    "input.surface-money-amount",
  ) as HTMLInputElement;
}

function currencyTrigger(container: HTMLElement): HTMLButtonElement | null {
  return container.querySelector("button.surface-money-currency");
}

function clickSave(container: HTMLElement): void {
  const save = [...container.querySelectorAll("button")].find((b) =>
    (b.textContent ?? "").includes("Save"),
  );
  expect(save).toBeDefined();
  fireEvent.click(save!);
}

async function typeAmountAndBlur(
  container: HTMLElement,
  text: string,
): Promise<HTMLInputElement> {
  const input = await waitFor(() => {
    const found = amountInput(container);
    expect(found).not.toBeNull();
    return found;
  });
  input.value = text;
  fireEvent.input(input);
  fireEvent.blur(input);
  return input;
}

afterEach(() => {
  cleanup();
});

describe("money helpers", () => {
  test("isMoney / majorText / parseMajor round-trip", () => {
    expect(isMoney(MONEY_SAMPLE)).toBe(true);
    expect(isMoney({ amount: 1, currency: "US" })).toBe(false);
    expect(majorText(1234, "USD")).toBe("12.34");
    expect(parseMajor("12.34", "USD")).toBe(1234);
    expect(majorText(500, "JPY")).toBe("500");
    expect(parseMajor("500", "JPY")).toBe(500);
    expect(parseMajor("not-a-number", "USD")).toBeNull();
    expect(formatMoneyDisplay(MONEY_SAMPLE)).toContain("12.34");
  });
});

describe("HTML kit money $id takeover", () => {
  test("createHtmlKit registers money without playground resolvers", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: moneyResolver(),
      annotationResolver: new InMemoryAnnotationResolver({
        [MONEY_ID]: {
          subject: MONEY_ID,
          views: { default: { rest: "append" } },
        },
      }),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface id={MONEY_ID} mode="display" data={MONEY_SAMPLE} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".surface-money")).not.toBeNull();
      expect(container.querySelector(".surface-money-display")).not.toBeNull();
      expect(container.textContent).toContain("12.34");
      // Display is pretty-only — no canonical minor-unit dump.
      expect(container.textContent).not.toContain("[USD] 1234");
      expect(
        container.querySelector(".surface-money-canonical"),
      ).toBeNull();
    });
  });

  test("input mode paints amount + currency controls", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: moneyResolver(),
      annotationResolver: new InMemoryAnnotationResolver({}),
      kit: createHtmlKit(),
    });

    const { container } = render(
      <Surface id={MONEY_ID} mode="input" data={MONEY_SAMPLE} />,
    );

    const currency = await waitFor(() => {
      const amount = container.querySelector(
        "input.surface-money-amount",
      ) as HTMLInputElement | null;
      const trigger = currencyTrigger(container);
      expect(amount).not.toBeNull();
      expect(amount?.value).toBe("12.34");
      expect(trigger?.textContent?.trim()).toBe("USD");
      return trigger!;
    });
    fireEvent.click(currency);
    await waitFor(() => {
      const options = [
        ...container.querySelectorAll(".surface-money-option"),
      ].map((el) => el.textContent ?? "");
      expect(options.some((t) => t.includes("INR"))).toBe(true);
      expect(options.some((t) => t.includes("BHD"))).toBe(true);
      expect(options.length).toBeGreaterThan(6);
    });
    expect(container.textContent).not.toContain("data →");
    expect(container.textContent).not.toContain("[USD] 1234");
    expect(container.querySelector(".surface-money-canonical")).toBeNull();
  });

  test("currency typeahead filters and picks a code", async () => {
    const { container } = mountMoneyInput({
      data: { amount: 1999, currency: "USD" },
    });
    const trigger = await waitFor(() => {
      const found = currencyTrigger(container);
      expect(found).not.toBeNull();
      return found!;
    });
    fireEvent.click(trigger);
    const search = await waitFor(() => {
      const input = container.querySelector(
        "input.surface-money-search",
      ) as HTMLInputElement | null;
      expect(input).not.toBeNull();
      return input!;
    });
    fireEvent.change(search, { target: { value: "eur" } });
    await waitFor(() => {
      const options = [...container.querySelectorAll(".surface-money-option")];
      expect(options.length).toBeGreaterThan(0);
      expect(options.some((el) => el.textContent?.includes("EUR"))).toBe(true);
    });
    const eur = [...container.querySelectorAll(".surface-money-option")].find(
      (el) => el.textContent?.includes("EUR"),
    );
    fireEvent.click(eur!);
    await waitFor(() => {
      expect(currencyTrigger(container)?.textContent?.trim()).toBe("EUR");
    });
  });

  test("type 12.34 USD writes minor units on blur", async () => {
    const submits: unknown[] = [];
    const { container } = mountMoneyInput({
      data: { amount: 0, currency: "USD" },
      onSubmit: (data) => {
        submits.push(data);
      },
    });

    await typeAmountAndBlur(container, "12.34");
    clickSave(container);

    await waitFor(() => {
      expect(submits.length).toBe(1);
    });
    expect(submits[0]).toEqual(
      expect.objectContaining({ amount: 1234, currency: "USD" }),
    );
  });

  test("JPY 500 writes whole-yen minor units", async () => {
    const submits: unknown[] = [];
    const { container } = mountMoneyInput({
      data: { amount: 0, currency: "JPY" },
      onSubmit: (data) => {
        submits.push(data);
      },
    });

    await typeAmountAndBlur(container, "500");
    clickSave(container);

    await waitFor(() => {
      expect(submits.length).toBe(1);
    });
    expect(submits[0]).toEqual(
      expect.objectContaining({ amount: 500, currency: "JPY" }),
    );
  });

  test("invalid blur shows an error and does not write a partial object", async () => {
    const submits: unknown[] = [];
    const { container } = mountMoneyInput({
      data: MONEY_SAMPLE,
      onSubmit: (data) => {
        submits.push(data);
      },
    });

    const input = await typeAmountAndBlur(container, "nope");
    expect(input.value).toBe("nope");
    const alert = container.querySelector(".surface-error");
    expect(alert).not.toBeNull();
    expect(alert?.textContent?.length).toBeGreaterThan(0);
    expect(input.className).toContain("surface-invalid");

    clickSave(container);
    await waitFor(() => {
      expect(submits.length).toBe(1);
    });
    expect(isMoney(submits[0])).toBe(true);
    expect(submits[0]).toEqual(
      expect.objectContaining({ amount: 1234, currency: "USD" }),
    );
  });

  test("kit money.locked hides the select and uses kit currency", async () => {
    const submits: unknown[] = [];
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: moneyResolver(),
      annotationResolver: new InMemoryAnnotationResolver({}),
      kit: createHtmlKit({
        money: { currency: "AUD", locked: true },
      }),
    });
    const { container } = render(
      <Surface
        id={MONEY_ID}
        mode="input"
        data={{ amount: 0, currency: "AUD" }}
        onSubmit={({ data }) => {
          submits.push(data);
        }}
      />,
    );

    await waitFor(() => {
      expect(amountInput(container)).not.toBeNull();
    });
    expect(currencyTrigger(container)).toBeNull();

    await typeAmountAndBlur(container, "12.34");
    clickSave(container);

    await waitFor(() => {
      expect(submits.length).toBe(1);
    });
    expect(submits[0]).toEqual(
      expect.objectContaining({ amount: 1234, currency: "AUD" }),
    );
  });

  test("schema currency const EUR hides the select and writes EUR", async () => {
    const submits: unknown[] = [];
    const properties = MONEY_SCHEMA.properties as Record<string, unknown>;
    const schema: Schema = {
      ...MONEY_SCHEMA,
      properties: {
        ...properties,
        currency: { const: "EUR" },
      },
    };
    const { container } = mountMoneyInput({
      schema,
      data: { amount: 0, currency: "EUR" },
      onSubmit: (data) => {
        submits.push(data);
      },
    });

    await waitFor(() => {
      expect(amountInput(container)).not.toBeNull();
    });
    expect(currencyTrigger(container)).toBeNull();

    await typeAmountAndBlur(container, "12.34");
    clickSave(container);

    await waitFor(() => {
      expect(submits.length).toBe(1);
    });
    expect(submits[0]).toEqual(
      expect.objectContaining({ amount: 1234, currency: "EUR" }),
    );
  });
});
