import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import {
  acceptAllValidator,
  createRegistryKit,
  createSurfaceUi,
  InMemorySchemaFetchResolver,
  type RendererRequest,
  type SurfaceKit,
  type SurfaceRenderer,
} from "../../packages/core/src/index.ts";

const EMAIL = "https://example.test/email";

const Chosen: SurfaceRenderer = () => <div data-renderer="chosen" />;
const Fallback: SurfaceRenderer = () => <div data-renderer="fallback" />;

/** Records what core asks for, and answers only when a key is registered. */
function recordingKit(registered: readonly string[]): {
  readonly kit: SurfaceKit;
  readonly requests: RendererRequest[];
} {
  const requests: RendererRequest[] = [];
  const kit: SurfaceKit = {
    fallback: Fallback,
    resolveRenderer(request) {
      requests.push(request);
      return request.keys.some((key) => registered.includes(key))
        ? Chosen
        : undefined;
    },
  };
  return { kit, requests };
}

afterEach(() => {
  cleanup();
});

describe("Surface renderer request", () => {
  test("carries candidate keys, coordinate, mode, view, schema and data", async () => {
    const email = { $id: EMAIL, type: "string", format: "email" };
    const { kit, requests } = recordingKit(["string"]);
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({ [EMAIL]: email }),
      kit,
    });

    const { container } = render(
      <Surface id={EMAIL} mode="display" view="card" data="dev@example.test" />,
    );

    await waitFor(() => {
      expect(container.querySelector("[data-renderer='chosen']")).not.toBeNull();
    });

    const request = requests.at(-1) as RendererRequest;
    expect(request.keys).toEqual([EMAIL, "format:email", "email", "string"]);
    expect(request.coordinate).toEqual({ subject: EMAIL, path: [] });
    expect(request.mode).toBe("display");
    expect(request.view).toBe("card");
    expect(request.data).toBe("dev@example.test");
    expect(request.schema).toEqual(email);
    expect(Object.keys(request).sort()).toEqual([
      "coordinate",
      "data",
      "keys",
      "mode",
      "schema",
      "view",
    ]);
    expect(request.entry).toBeUndefined();
  });

  test("renders the kit fallback when the kit resolves nothing", async () => {
    const { kit } = recordingKit([]);
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver(),
      kit,
    });

    const { container } = render(
      <Surface id="name" mode="input" schema={{ type: "string" }} />,
    );

    await waitFor(() => {
      expect(
        container.querySelector("[data-renderer='fallback']"),
      ).not.toBeNull();
    });
  });

  test("renders the kit fallback when the only matching resolve returns null", async () => {
    const seen: RendererRequest[] = [];
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver(),
      kit: createRegistryKit({
        fallback: Fallback,
        resolvers: [
          {
            key: "string",
            resolve: (request) => {
              seen.push(request);
              return null;
            },
          },
        ],
      }),
    });

    const { container } = render(
      <Surface id="name" mode="input" schema={{ type: "string" }} />,
    );

    await waitFor(() => {
      expect(
        container.querySelector("[data-renderer='fallback']"),
      ).not.toBeNull();
    });
    expect(seen).toHaveLength(1);
  });
});
