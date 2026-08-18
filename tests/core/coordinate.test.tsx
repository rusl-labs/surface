import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import {
  acceptAllValidator,
  createSurfaceUi,
  InMemorySchemaFetchResolver,
  useSurface,
  type RendererRequest,
  type SurfaceContext,
  type SurfaceCoordinate,
  type SurfaceKit,
  type SurfaceProps,
  type SurfaceRenderer,
} from "../../packages/core/src/index.ts";

const CONTACT = "https://example.test/contact";
const CANONICAL = "https://schemas.example.test/contact";
const ORDER = "https://example.test/order";

/** The mount-id trail is replaced by the coordinate — one path, not two. */
type ContextHasPath = "path" extends keyof SurfaceContext ? true : false;
const contextHasPath: ContextHasPath = false;
void contextHasPath;

/** Reports the coordinate the context carries for this node. */
const Leaf: SurfaceRenderer = () => {
  const { coordinate } = useSurface();
  return <div data-coordinate={JSON.stringify(coordinate ?? null)} />;
};

/**
 * Records every request core makes. When `child` is given, object nodes mount
 * it through the real Surface from context — a kit hand-rolling a child.
 */
function recordingKit(child?: SurfaceProps): {
  readonly kit: SurfaceKit;
  readonly requests: RendererRequest[];
} {
  const requests: RendererRequest[] = [];

  const Parent: SurfaceRenderer = () => {
    const { Surface } = useSurface();
    return Surface === undefined || child === undefined ? null : (
      <Surface {...child} />
    );
  };

  const kit: SurfaceKit = {
    fallback: Leaf,
    resolveRenderer(request) {
      requests.push(request);
      return child !== undefined && request.schema.type === "object"
        ? Parent
        : Leaf;
    },
  };

  return { kit, requests };
}

function contextCoordinate(container: HTMLElement): unknown {
  const el = container.querySelector("[data-coordinate]") as HTMLElement;
  return JSON.parse(el.getAttribute("data-coordinate") ?? "null");
}

afterEach(() => {
  cleanup();
});

describe("Surface coordinate", () => {
  test("a root mount by uri is a subject root at the document's $id", async () => {
    const { kit, requests } = recordingKit();
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [CONTACT]: { $id: CANONICAL, type: "string" },
      }),
      kit,
    });

    const { container } = render(<Surface id={CONTACT} mode="input" />);

    await waitFor(() => {
      expect(contextCoordinate(container)).toEqual({
        subject: CANONICAL,
        path: [],
      });
    });
    expect(requests.at(-1)?.coordinate).toEqual({
      subject: CANONICAL,
      path: [],
    });
  });

  test("a root mount of an $id-less document is a subject root at its uri", async () => {
    const { kit, requests } = recordingKit();
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [ORDER]: { type: "string" },
      }),
      kit,
    });

    render(<Surface id={ORDER} mode="input" />);

    await waitFor(() => {
      expect(requests.at(-1)?.coordinate).toEqual({
        subject: ORDER,
        path: [],
      });
    });
  });

  test("a def mount by id fragment is a subject root in def scope", async () => {
    const { kit, requests } = recordingKit();
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [CONTACT]: {
          $id: CONTACT,
          $defs: { address: { type: "string", title: "Address" } },
        },
      }),
      kit,
    });

    render(<Surface id={`${CONTACT}#/$defs/address`} mode="input" />);

    await waitFor(() => {
      expect(requests.at(-1)?.coordinate).toEqual({
        subject: `${CONTACT}#/$defs/address`,
        path: [],
      });
    });
  });

  test("a child $ref into a def switches the subject to def scope", async () => {
    const { kit, requests } = recordingKit({
      id: "address",
      schema: { $ref: "#/$defs/address" },
      mode: "input",
    });
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [CONTACT]: {
          type: "object",
          properties: { address: { $ref: "#/$defs/address" } },
          $defs: { address: { type: "string", title: "Address" } },
        },
      }),
      kit,
    });

    render(<Surface id={CONTACT} mode="input" />);

    await waitFor(() => {
      const child = requests.find((request) => request.schema.title === "Address");
      expect(child?.coordinate).toEqual({
        subject: `${CONTACT}#/$defs/address`,
        path: [],
      });
    });
  });

  test("a hand-rolled property child carries no coordinate", async () => {
    const { kit, requests } = recordingKit({
      id: "email",
      schema: { type: "string", title: "Email" },
      mode: "input",
    });
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [CONTACT]: {
          type: "object",
          properties: { email: { type: "string", title: "Email" } },
        },
      }),
      kit,
    });

    const { container } = render(<Surface id={CONTACT} mode="input" />);

    await waitFor(() => {
      const child = requests.find((request) => request.schema.title === "Email");
      expect(child).toBeDefined();
      expect(child?.coordinate).toBeUndefined();
    });
    expect(contextCoordinate(container)).toBeNull();
  });

  test("a mount at a non-def fragment carries no coordinate", async () => {
    const { kit, requests } = recordingKit();
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [CONTACT]: {
          type: "object",
          properties: { email: { type: "string", title: "Email" } },
        },
      }),
      kit,
    });

    render(<Surface id={`${CONTACT}#/properties/email`} mode="input" />);

    await waitFor(() => {
      expect(requests.at(-1)?.schema.title).toBe("Email");
    });
    expect(requests.at(-1)?.coordinate).toBeUndefined();
  });

  test("an explicit coordinate prop flows verbatim and beats derivation", async () => {
    const given: SurfaceCoordinate = {
      subject: `${ORDER}#/$defs/money`,
      path: ["billing", "total"],
    };
    const { kit, requests } = recordingKit();
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [CONTACT]: { $id: CONTACT, type: "string" },
      }),
      kit,
    });

    const { container } = render(
      <Surface id={CONTACT} mode="input" coordinate={given} />,
    );

    await waitFor(() => {
      expect(contextCoordinate(container)).toEqual({
        subject: `${ORDER}#/$defs/money`,
        path: ["billing", "total"],
      });
    });
    expect(requests.at(-1)?.coordinate).toBe(given);
  });
});
