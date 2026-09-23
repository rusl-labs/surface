import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { useState } from "react";
import {
  acceptAllValidator,
  createSurfaceUi,
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  useSurface,
  type AnnotationDocument,
  type Schema,
  type SurfaceRenderer,
} from "../../packages/core/src/index.ts";

// A consumer kit: all traversal and decoration are supplied by core.
const Field: SurfaceRenderer = () => {
  const { Surface, schema, helpers, data, dataApi, mode } = useSurface();
  if (!Surface || !schema || !helpers) return null;
  if (schema.type === "object")
    return (
      <section aria-label={helpers.label()}>
        {helpers
          .fields()
          .map((child) =>
            child.kind === "field" ? (
              <Surface key={child.key} {...child.surface} />
            ) : null,
          )}
      </section>
    );
  if (schema.type === "array")
    return (
      <>
        {(Array.isArray(data) ? data : []).map((item, index) => (
          <Surface
            key={index}
            id={String(index)}
            schema={schema.items as Schema}
            data={item}
          />
        ))}
      </>
    );
  return (
    <label>
      {helpers.label()}
      <input
        aria-label={helpers.label()}
        readOnly={mode === "display"}
        value={typeof data === "string" ? data : ""}
        onChange={(event) => dataApi?.setData(event.target.value)}
      />
    </label>
  );
};
const SUBJECT = "https://example.test/mechanics";
const schema: Schema = {
  $id: SUBJECT,
  type: "object",
  $defs: { name: { type: "string" } },
  properties: { name: { $ref: "#/$defs/name" } },
};
const annotation: AnnotationDocument = {
  subject: SUBJECT,
  views: {
    default: {
      label: "Person",
      fields: [{ name: "name", label: "Full name" }],
    },
  },
};
afterEach(cleanup);

test("inline documents resolve local refs and annotations without a registered copy", async () => {
  const { Surface } = createSurfaceUi({
    validator: acceptAllValidator,
    schemaResolver: new InMemorySchemaFetchResolver({}),
    annotationResolver: new InMemoryAnnotationResolver({
      [SUBJECT]: annotation,
    }),
    kit: { fallback: Field, resolveRenderer: () => Field },
  });
  const screen = render(
    <Surface id={SUBJECT} schema={schema} data={{ name: "Alex" }} />,
  );
  const input = await screen.findByRole("textbox", { name: "Full name" });
  expect((input as HTMLInputElement).value).toBe("Alex");
  expect(screen.getByRole("region", { name: "Person" })).toBeTruthy();
  fireEvent.change(input, { target: { value: "Taylor" } });
  await waitFor(() =>
    expect(
      (screen.getByRole("textbox", { name: "Full name" }) as HTMLInputElement)
        .value,
    ).toBe("Taylor"),
  );
});

test("inline array items keep annotation fields and inherited display mode", async () => {
  const list: Schema = {
    $id: SUBJECT,
    type: "object",
    properties: {
      rows: {
        type: "array",
        items: {
          type: "object",
          properties: { first: { type: "string" }, secret: { type: "string" } },
        },
      },
    },
  };
  const doc: AnnotationDocument = {
    subject: SUBJECT,
    views: {
      default: {
        fields: [
          {
            name: "rows",
            items: {
              fields: [{ name: "first", label: "Item name" }],
              rest: "omit",
            },
          },
        ],
      },
    },
  };
  const { Surface } = createSurfaceUi({
    validator: acceptAllValidator,
    schemaResolver: new InMemorySchemaFetchResolver({}),
    annotationResolver: new InMemoryAnnotationResolver({ [SUBJECT]: doc }),
    kit: { fallback: Field, resolveRenderer: () => Field },
  });
  const screen = render(
    <Surface
      id={SUBJECT}
      schema={list}
      mode="display"
      data={{
        rows: [
          { first: "A", secret: "hidden" },
          { first: "B", secret: "hidden" },
        ],
      }}
    />,
  );
  await waitFor(() =>
    expect(screen.getAllByRole("textbox", { name: "Item name" }).length).toBe(
      2,
    ),
  );
  expect(screen.queryByRole("textbox", { name: "secret" })).toBeNull();
  expect(
    screen
      .getAllByRole("textbox", { name: "Item name" })
      .map((el) => (el as HTMLInputElement).value),
  ).toEqual(["A", "B"]);
  expect(
    screen
      .getAllByRole("textbox")
      .every((el) => (el as HTMLInputElement).readOnly),
  ).toBe(true);
});

test("metadata-only named views label scalar subject roots", async () => {
  const { Surface } = createSurfaceUi({
    validator: acceptAllValidator,
    schemaResolver: new InMemorySchemaFetchResolver({}),
    annotationResolver: new InMemoryAnnotationResolver({
      [SUBJECT]: {
        subject: SUBJECT,
        views: { compact: { label: "Short name" } },
      },
    }),
    kit: { fallback: Field, resolveRenderer: () => Field },
  });
  const screen = render(
    <Surface
      id={SUBJECT}
      schema={{ $id: SUBJECT, type: "string" }}
      view="compact"
      data="Alex"
    />,
  );
  expect(
    (
      (await screen.findByRole("textbox", {
        name: "Short name",
      })) as HTMLInputElement
    ).value,
  ).toBe("Alex");
});

test("core preserves async submission completion and rejection for consumer actions", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const Submit: SurfaceRenderer = () => {
    const { onSubmit, data } = useSurface();
    const [status, setStatus] = useState("idle");
    return (
      <button
        onClick={async () => {
          setStatus("pending");
          try {
            await onSubmit?.({ data });
            setStatus("saved");
          } catch {
            setStatus("rejected");
          }
        }}
      >
        {status}
      </button>
    );
  };
  const { Surface } = createSurfaceUi({
    validator: acceptAllValidator,
    schemaResolver: new InMemorySchemaFetchResolver({}),
    kit: { fallback: Submit, resolveRenderer: () => Submit },
  });
  const screen = render(
    <Surface
      id={SUBJECT}
      schema={{ type: "string" }}
      data="Alex"
      onSubmit={async () => {
        await gate;
        throw new Error("Submission rejected");
      }}
    />,
  );
  fireEvent.click(await screen.findByRole("button", { name: "idle" }));
  await waitFor(() =>
    expect(screen.getByRole("button").textContent).toBe("pending"),
  );
  release();
  await screen.findByRole("button", { name: "rejected" });
});

test("post-failure revalidation reports validator rejection instead of leaking it", async () => {
  const Actions: SurfaceRenderer = () => {
    const { dataApi, validity } = useSurface();
    return (
      <>
        <button
          onClick={() =>
            dataApi?.reportValidation?.({
              valid: false,
              issues: [{ path: [], message: "invalid" }],
            })
          }
        >
          Validate
        </button>
        <button onClick={() => dataApi?.setData("edited")}>Edit</button>
        <output>
          {validity?.issues.map((issue) => issue.message).join(";")}
        </output>
      </>
    );
  };
  const { Surface } = createSurfaceUi({
    validator: {
      validate() {
        throw new Error("validator unavailable");
      },
    },
    schemaResolver: new InMemorySchemaFetchResolver({}),
    kit: { fallback: Actions, resolveRenderer: () => Actions },
  });
  const screen = render(
    <Surface id={SUBJECT} schema={{ type: "string" }} data="initial" />,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Validate" }));
  await screen.findByText("invalid");
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  await screen.findByText("validator unavailable");
});
