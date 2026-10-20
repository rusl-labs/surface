import { expect, test } from "bun:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import envelope from "../../schemas/rusl/surface.annotation.schema.json" with { type: "json" };
import { listFields, type AnnotationDocument } from "../../packages/core/src/index.ts";

const subject = "https://example.test/standalone";
const schema = { type: "object", properties: { subject: { type: "string" }, description: { type: "string" } } };
const validate = new Ajv2020({ strict: false }).compile(envelope);

function fields(entries: unknown[], mode: "input" | "display" = "input") {
  const annotation: AnnotationDocument = {
    subject,
    views: { default: { fields: entries, rest: "omit" } },
  };
  expect(validate(annotation)).toBe(true);
  return listFields({ schema, annotation, coordinate: { subject, path: [] }, mode, view: "default" });
}

test("standalone headings preserve arbitrary widget and chrome metadata", () => {
  for (const name of ["separator", "notice"]) {
    const widget = { name, $kind: "https://example.test/widgets/decoration", options: { tone: "quiet" }, custom: 42 };
    expect(fields([{ label: "", widget, description: "Break", layout: "stack", direction: "horizontal" }])).toEqual([
      { kind: "heading", key: "heading::0", label: "", widget, description: "Break", layout: "stack", direction: "horizontal" },
    ]);
    expect(fields([{ label: "Heading", widget }])[0]).toMatchObject({ kind: "heading", label: "Heading", widget });
  }
});

test("standalone treatment uses effective mode decoration including null clearing and omit", () => {
  const entry = { label: "", widget: { name: "notice" }, display: { widget: { name: "rule" }, description: "Display" } };
  expect(fields([entry], "display")[0]).toMatchObject({ widget: { name: "rule" }, description: "Display" });
  expect(fields([{ ...entry, display: { widget: null } }], "display")).toEqual([]);
  expect(fields([{ label: "", input: { widget: { name: "notice" } } }])[0]).toMatchObject({ kind: "heading", widget: { name: "notice" } });
  expect(fields([{ ...entry, input: { omit: true } }])).toEqual([]);
});

test("empty content pruning distinguishes headings, standalone treatments, and sections", () => {
  const result = fields([
    { label: "" },
    { label: "", description: "Not a presentation instruction" },
    { label: "Plain" },
    { label: "", widget: { name: "notice" }, fields: [{ name: "subject", omit: true }] },
    { label: "", widget: { name: "notice" }, fields: [{ name: "description" }] },
    { template: "Hello" },
  ]);
  expect(result.map((entry) => entry.kind)).toEqual(["heading", "section", "template"]);
  const section = result[1];
  expect(section).toMatchObject({ label: "", widget: { name: "notice" } });
  if (section?.kind !== "section") throw new Error("Expected section");
  expect(section.children()[0]).toMatchObject({ kind: "field", label: "description" });
});
