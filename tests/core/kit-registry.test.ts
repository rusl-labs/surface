import { describe, expect, test } from "bun:test";
import {
  candidateKeys,
  createRegistryKit,
  type RegistryEntry,
  type RendererRequest,
  type SurfaceRenderer,
} from "../../packages/core/src/index.ts";

const StringInput: SurfaceRenderer = () => null;
const StringDisplay: SurfaceRenderer = () => null;
const StringCard: SurfaceRenderer = () => null;
const MoneyInput: SurfaceRenderer = () => null;
const TenantCard: SurfaceRenderer = () => null;
const LegacyForm: SurfaceRenderer = () => null;
const Fallback: SurfaceRenderer = () => null;

const MONEY = "https://example.test/schemas/money";

function request(overrides: Partial<RendererRequest> = {}): RendererRequest {
  return {
    keys: ["string"],
    mode: "input",
    view: "default",
    schema: { type: "string" },
    ...overrides,
  };
}

describe("registry kit", () => {
  test("resolves a keyed entry for the request's mode", () => {
    const kit = createRegistryKit({
      fallback: Fallback,
      resolvers: [
        { key: "string", mode: "input", component: StringInput },
        { key: "string", mode: "display", component: StringDisplay },
      ],
    });

    expect(kit.resolveRenderer(request())).toBe(StringInput);
    expect(kit.resolveRenderer(request({ mode: "display" }))).toBe(
      StringDisplay,
    );
  });

  test("an entry without mode or view matches every mode and view", () => {
    const kit = createRegistryKit({
      fallback: Fallback,
      resolvers: [{ key: "string", component: StringInput }],
    });

    expect(kit.resolveRenderer(request({ mode: "display", view: "card" }))).toBe(
      StringInput,
    );
  });

  test("prefers the entry for the requested view over the default view", () => {
    const kit = createRegistryKit({
      fallback: Fallback,
      resolvers: [
        {
          key: "string",
          mode: "input",
          view: "default",
          component: StringInput,
        },
        { key: "string", mode: "input", view: "card", component: StringCard },
      ],
    });

    expect(kit.resolveRenderer(request({ view: "card" }))).toBe(StringCard);
  });

  test("view specificity beats registration order", () => {
    const kit = createRegistryKit({
      fallback: Fallback,
      resolvers: [
        { key: "string", mode: "input", view: "card", component: StringCard },
        {
          key: "string",
          mode: "input",
          view: "default",
          component: StringInput,
        },
      ],
    });

    expect(kit.resolveRenderer(request({ view: "card" }))).toBe(StringCard);
  });

  test("falls back to the default-view entry for an unknown view", () => {
    const kit = createRegistryKit({
      fallback: Fallback,
      resolvers: [
        {
          key: "string",
          mode: "input",
          view: "default",
          component: StringInput,
        },
      ],
    });

    expect(kit.resolveRenderer(request({ view: "compact" }))).toBe(StringInput);
  });

  test("returns undefined when nothing matches", () => {
    const kit = createRegistryKit({
      fallback: Fallback,
      resolvers: [{ key: "string", mode: "display", component: StringDisplay }],
    });

    expect(kit.resolveRenderer(request())).toBeUndefined();
    expect(kit.resolveRenderer(request({ keys: ["object"] }))).toBeUndefined();
  });

  test("tries candidate keys most specific first", () => {
    const kit = createRegistryKit({
      fallback: Fallback,
      resolvers: [
        { key: "string", component: StringInput },
        { key: MONEY, component: MoneyInput },
      ],
    });

    expect(kit.resolveRenderer(request({ keys: [MONEY, "string"] }))).toBe(
      MoneyInput,
    );
  });

  test("key-less entries run before keyed lookup, in list order", () => {
    const kit = createRegistryKit({
      fallback: Fallback,
      resolvers: [
        { key: "string", component: StringInput },
        { component: LegacyForm },
        { component: TenantCard },
      ],
    });

    expect(kit.resolveRenderer(request())).toBe(LegacyForm);
  });

  test("a resolve returning null keeps falling through", () => {
    const seen: string[] = [];
    const kit = createRegistryKit({
      fallback: Fallback,
      resolvers: [
        {
          resolve: (req) => {
            seen.push(req.view);
            return null;
          },
        },
        { key: MONEY, resolve: () => null },
        { key: "string", component: StringInput },
      ],
    });

    expect(kit.resolveRenderer(request({ keys: [MONEY, "string"] }))).toBe(
      StringInput,
    );
    expect(seen).toEqual(["default"]);
  });

  test("resolve receives the request and may return a component", () => {
    const kit = createRegistryKit({
      fallback: Fallback,
      resolvers: [
        { key: MONEY, mode: "input", component: MoneyInput },
        {
          key: MONEY,
          resolve: (req) => (req.data === "pro" ? TenantCard : null),
        },
      ],
    });

    expect(kit.resolveRenderer(request({ keys: [MONEY], data: "pro" }))).toBe(
      TenantCard,
    );
    expect(kit.resolveRenderer(request({ keys: [MONEY], data: "free" }))).toBe(
      MoneyInput,
    );
  });

  test("resolve wins when a JS caller passes both fields", () => {
    const kit = createRegistryKit({
      fallback: Fallback,
      resolvers: [
        {
          key: "string",
          component: StringInput,
          resolve: () => TenantCard,
        } as RegistryEntry,
      ],
    });

    expect(kit.resolveRenderer(request())).toBe(TenantCard);
  });

  test("last set wins for duplicate keys", () => {
    const kit = createRegistryKit({
      fallback: Fallback,
      resolvers: [
        { key: "string", mode: "input", component: StringInput },
        { key: "string", mode: "input", component: StringDisplay },
      ],
    });

    expect(kit.resolveRenderer(request())).toBe(StringDisplay);
  });

  test("set adds an entry post-init", () => {
    const kit = createRegistryKit({
      fallback: Fallback,
      resolvers: [{ key: "string", component: StringInput }],
    });

    kit.set({ key: "string", component: TenantCard });

    expect(kit.resolveRenderer(request({ view: "card" }))).toBe(TenantCard);
  });

  test("set adds a key-less resolve entry post-init", () => {
    const kit = createRegistryKit({
      fallback: Fallback,
      resolvers: [{ key: "string", component: StringInput }],
    });

    kit.set({ resolve: (req) => (req.data === "pro" ? TenantCard : null) });

    expect(kit.resolveRenderer(request({ data: "pro" }))).toBe(TenantCard);
    expect(kit.resolveRenderer(request({ data: "free" }))).toBe(StringInput);
  });

  test("set registers an entry for one mode and view", () => {
    const kit = createRegistryKit({
      fallback: Fallback,
      resolvers: [{ key: MONEY, component: MoneyInput }],
    });

    kit.set(MONEY, "display", "card", TenantCard);

    expect(kit.resolveRenderer(request({ keys: [MONEY] }))).toBe(MoneyInput);
    expect(
      kit.resolveRenderer(
        request({ keys: [MONEY], mode: "display", view: "card" }),
      ),
    ).toBe(TenantCard);
  });

  test("a $id entry outranks a widget entry", () => {
    const kit = createRegistryKit({
      fallback: Fallback,
      resolvers: [
        { key: "widget:card", component: StringCard },
        { key: MONEY, component: MoneyInput },
      ],
    });

    const schema = { $id: MONEY, type: "object" };
    const entry = { widget: { name: "card" } };

    expect(
      kit.resolveRenderer(
        request({ keys: candidateKeys(schema, entry), schema, entry }),
      ),
    ).toBe(MoneyInput);
  });

  test("aliases retry a miss on the target key", () => {
    const kit = createRegistryKit({
      fallback: Fallback,
      aliases: { "date-time": "datetime" },
      resolvers: [
        { key: "datetime", mode: "input", component: StringInput },
        { key: "datetime", mode: "display", component: StringDisplay },
      ],
    });

    expect(
      kit.resolveRenderer(request({ keys: ["date-time"], mode: "input" })),
    ).toBe(StringInput);
    expect(
      kit.resolveRenderer(request({ keys: ["date-time"], mode: "display" })),
    ).toBe(StringDisplay);
  });

  test("an explicit alias key wins over the alias target", () => {
    const kit = createRegistryKit({
      fallback: Fallback,
      aliases: { "date-time": "datetime" },
      resolvers: [
        { key: "datetime", component: StringInput },
        { key: "date-time", component: StringCard },
      ],
    });

    expect(kit.resolveRenderer(request({ keys: ["date-time"] }))).toBe(
      StringCard,
    );
  });

  test("a widget name resolves through its bare key", () => {
    const kit = createRegistryKit({
      fallback: Fallback,
      resolvers: [{ key: "email", component: StringInput }],
    });

    const schema = { type: "string" };
    const entry = { widget: { name: "email" } };

    expect(
      kit.resolveRenderer(
        request({ keys: candidateKeys(schema, entry), schema, entry }),
      ),
    ).toBe(StringInput);
  });
});
