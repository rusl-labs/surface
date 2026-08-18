import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import { Ajv2020 } from "ajv/dist/2020.js";
import {
  acceptAllValidator,
  createSurfaceUi,
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  useSurface,
  type AnnotationDocument,
  type AnnotationResolver,
  type Schema,
  type SchemaResolver,
  type SurfaceKit,
  type SurfaceProps,
  type SurfaceRenderer,
} from "../../packages/core/src/index.ts";

const CONTACT = "https://example.test/contact";
const ORDER = "https://example.test/order";

const CONTACT_DOC: AnnotationDocument = {
  subject: CONTACT,
  views: { default: { fields: [{ name: "email", label: "Email" }] } },
};

const ORDER_DOC: AnnotationDocument = {
  subject: ORDER,
  views: { default: { fields: [{ name: "total", label: "Total" }] } },
};

const CONTACT_SCHEMA: Schema = {
  $id: CONTACT,
  type: "object",
  properties: {
    email: { type: "string", title: "Email" },
    address: { $ref: "#/$defs/address" },
    order: { $ref: ORDER },
  },
  $defs: { address: { type: "string", title: "Address" } },
};

const ORDER_SCHEMA: Schema = { $id: ORDER, type: "string", title: "Order" };

/** Reports the annotation document context carries for this node. */
const Leaf: SurfaceRenderer = () => {
  const { annotation } = useSurface();
  return <div data-annotation={JSON.stringify(annotation ?? null)} />;
};

/** Object nodes mount `child` through the real Surface; leaves report. */
function kitMounting(child?: SurfaceProps): SurfaceKit {
  const Parent: SurfaceRenderer = () => {
    const { Surface } = useSurface();
    return Surface === undefined || child === undefined ? null : (
      <Surface {...child} />
    );
  };

  return {
    fallback: Leaf,
    resolveRenderer: (request) =>
      child !== undefined && request.schema.type === "object" ? Parent : Leaf,
  };
}

/** Records every subject core asks the resolver for. */
function spyResolver(documents: Record<string, AnnotationDocument>): {
  readonly subjects: string[];
  readonly resolver: AnnotationResolver;
} {
  const subjects: string[] = [];
  const inner = new InMemoryAnnotationResolver(documents);

  return {
    subjects,
    resolver: {
      async resolveAnnotation(subject) {
        subjects.push(subject);
        return inner.resolveAnnotation(subject);
      },
    },
  };
}

function contextAnnotation(container: HTMLElement): unknown {
  const el = container.querySelector("[data-annotation]") as HTMLElement;
  return JSON.parse(el.getAttribute("data-annotation") ?? "null");
}

afterEach(() => {
  cleanup();
});

describe("Surface annotation resolution", () => {
  test("resolves the mount subject and lands the document in context", async () => {
    const { subjects, resolver } = spyResolver({ [CONTACT]: CONTACT_DOC });
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [CONTACT]: { $id: CONTACT, type: "string" },
      }),
      annotationResolver: resolver,
      kit: kitMounting(),
    });

    const { container } = render(<Surface id={CONTACT} mode="input" />);

    await waitFor(() => {
      expect(contextAnnotation(container)).toEqual(CONTACT_DOC);
    });
    expect(subjects).toEqual([CONTACT]);
  });

  test("a child within the subject reuses the parent's document", async () => {
    const { subjects, resolver } = spyResolver({ [CONTACT]: CONTACT_DOC });
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [CONTACT]: CONTACT_SCHEMA,
      }),
      annotationResolver: resolver,
      kit: kitMounting({
        id: "email",
        schema: { type: "string", title: "Email" },
        mode: "input",
      }),
    });

    const { container } = render(<Surface id={CONTACT} mode="input" />);

    await waitFor(() => {
      expect(contextAnnotation(container)).toEqual(CONTACT_DOC);
    });
    expect(subjects).toEqual([CONTACT]);
  });

  test("an internal def crossing keeps the document it is defined in", async () => {
    const { subjects, resolver } = spyResolver({ [CONTACT]: CONTACT_DOC });
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [CONTACT]: CONTACT_SCHEMA,
      }),
      annotationResolver: resolver,
      kit: kitMounting({
        id: "address",
        schema: { $ref: "#/$defs/address" },
        mode: "input",
      }),
    });

    const { container } = render(<Surface id={CONTACT} mode="input" />);

    await waitFor(() => {
      expect(contextAnnotation(container)).toEqual(CONTACT_DOC);
    });
    expect(subjects).toEqual([CONTACT]);
  });

  test("an external ref crossing resolves the new subject document", async () => {
    const { subjects, resolver } = spyResolver({
      [CONTACT]: CONTACT_DOC,
      [ORDER]: ORDER_DOC,
    });
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [CONTACT]: CONTACT_SCHEMA,
        [ORDER]: ORDER_SCHEMA,
      }),
      annotationResolver: resolver,
      kit: kitMounting({
        id: "order",
        schema: { $ref: ORDER },
        mode: "input",
      }),
    });

    const { container } = render(<Surface id={CONTACT} mode="input" />);

    await waitFor(() => {
      expect(contextAnnotation(container)).toEqual(ORDER_DOC);
    });
    expect(subjects).toEqual([CONTACT, ORDER]);
  });

  test("annotation resolves alongside the schema, not behind it", async () => {
    let releaseSchema = (): void => {};
    const schemaGate = new Promise<void>((resolve) => {
      releaseSchema = resolve;
    });
    const timeline = { schemaSettled: false, annotationSawPendingSchema: false };

    const schemaResolver: SchemaResolver = {
      async resolveSchema(uri) {
        await schemaGate;
        timeline.schemaSettled = true;
        return uri === CONTACT ? { $id: CONTACT, type: "string" } : undefined;
      },
    };

    const annotationResolver: AnnotationResolver = {
      async resolveAnnotation(subject) {
        timeline.annotationSawPendingSchema = !timeline.schemaSettled;
        return subject === CONTACT ? CONTACT_DOC : undefined;
      },
    };

    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver,
      annotationResolver,
      kit: kitMounting(),
    });

    const { container } = render(<Surface id={CONTACT} mode="input" />);

    await waitFor(() => {
      expect(timeline.annotationSawPendingSchema).toBe(true);
    });
    releaseSchema();

    await waitFor(() => {
      expect(contextAnnotation(container)).toEqual(CONTACT_DOC);
    });
  });

  test("a rejecting resolver renders exactly as no resolver does", async () => {
    const schemas = { [CONTACT]: { $id: CONTACT, type: "string" } };

    const plain = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver(schemas),
      kit: kitMounting(),
    });
    const { container: baseline } = render(
      <plain.Surface id={CONTACT} mode="input" />,
    );
    await waitFor(() => {
      expect(baseline.querySelector("[data-annotation]")).not.toBeNull();
    });
    const expected = baseline.innerHTML;
    cleanup();

    const rejecting = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver(schemas),
      annotationResolver: {
        resolveAnnotation: async () => {
          throw new Error("annotation service is down");
        },
      },
      kit: kitMounting(),
    });
    const { container } = render(
      <rejecting.Surface id={CONTACT} mode="input" />,
    );

    await waitFor(() => {
      expect(container.querySelector("[data-annotation]")).not.toBeNull();
    });
    expect(container.innerHTML).toBe(expected);
  });

  test("the documents these tests use are valid annotation documents", async () => {
    const format = await Bun.file(
      "docs/annotation-format.schema.json",
    ).json();
    const validate = new Ajv2020({
      strict: false,
      allErrors: true,
    }).compile(format);

    for (const document of [CONTACT_DOC, ORDER_DOC]) {
      expect({
        subject: document.subject,
        valid: validate(document),
      }).toEqual({ subject: document.subject, valid: true });
    }
  });
});
