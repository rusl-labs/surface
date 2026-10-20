import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Ajv2020 } from "ajv/dist/2020.js";
import envelope from "../../schemas/rusl/surface.annotation.schema.json" with { type: "json" };
import {
  acceptAllValidator, createSurfaceUi, InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver, useSurface,
  type AnnotationDocument, type Schema, type SurfaceRenderer,
} from "../../packages/core/src/index.ts";

afterEach(cleanup);

test("exact standalone reproduction reaches a consumer kit inside inline array items", async () => {
  const subject = "https://example.test/issues";
  const annotation: AnnotationDocument = {
    subject,
    views: { default: { fields: [{
      name: "issues",
      items: { fields: [
        { name: "subject", label: "Subject" },
        { label: "", widget: { name: "separator" } },
        { name: "description", label: "Description" },
      ] },
    }] } },
  };
  expect(new Ajv2020({ strict: false }).compile(envelope)(annotation)).toBe(true);
  const Consumer: SurfaceRenderer = () => {
    const { Surface, schema, data, helpers } = useSurface();
    if (!Surface || !schema || !helpers) return null;
    if (schema.type === "object") return <>{helpers.fields().map((child) => {
      if (child.kind === "field") return <Surface key={child.key} {...child.surface} />;
      if (child.kind === "heading") return <output key={child.key} data-testid="presentation">{JSON.stringify(child)}</output>;
      return null;
    })}</>;
    if (schema.type === "array") return <>{(data as unknown[]).map((item, index) => (
      <Surface key={index} id={String(index)} schema={schema.items as Schema} data={item} />
    ))}</>;
    return <span>{helpers.label()}</span>;
  };
  const { Surface } = createSurfaceUi({
    validator: acceptAllValidator,
    schemaResolver: new InMemorySchemaFetchResolver({}),
    annotationResolver: new InMemoryAnnotationResolver({ [subject]: annotation }),
    kit: { fallback: Consumer, resolveRenderer: () => Consumer },
  });
  const screen = render(<Surface id={subject} schema={{
    $id: subject, type: "object", properties: {
      issues: { type: "array", items: { type: "object", properties: {
        subject: { type: "string" }, description: { type: "string" },
      } } },
    },
  }} data={{ issues: [{ subject: "Bug", description: "Details" }] }} />);
  const entry = JSON.parse((await screen.findByTestId("presentation")).textContent!);
  expect(entry).toMatchObject({ kind: "heading", label: "", widget: { name: "separator" } });
  expect(screen.container.textContent).toBe(`Subject${JSON.stringify(entry)}Description`);
});
