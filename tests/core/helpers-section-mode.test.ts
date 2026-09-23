import { expect, test } from "bun:test";
import {
  listFields,
  type AnnotationDocument,
} from "../../packages/core/src/index.ts";
import {
  PERSON,
  PERSON_SCHEMA,
  names,
} from "./helpers-fields-support.ts";

test("section label and omit honor mode overrides", () => {
  const annotation: AnnotationDocument = {
    subject: PERSON,
    views: {
      default: {
        fields: [
          {
            label: "Who",
            display: { label: "" },
            fields: [{ name: "name" }],
          },
          {
            label: "Edit only",
            display: { omit: true },
            fields: [{ name: "title" }],
          },
          {
            label: "",
            input: { omit: true },
            fields: [{ name: "email" }],
          },
        ],
        rest: "omit",
      },
    },
  };
  const input = listFields({
    schema: PERSON_SCHEMA,
    annotation,
    coordinate: { subject: PERSON, path: [] },
    mode: "input",
    view: "default",
  });
  expect(input.map((f) => f.kind)).toEqual(["section", "section"]);
  expect(input[0]).toMatchObject({ kind: "section", label: "Who" });
  expect(input[1]).toMatchObject({ kind: "section", label: "Edit only" });
  expect(names(input)).toEqual(["name", "title"]);

  const display = listFields({
    schema: PERSON_SCHEMA,
    annotation,
    coordinate: { subject: PERSON, path: [] },
    mode: "display",
    view: "default",
  });
  expect(display.map((f) => f.kind)).toEqual(["section", "section"]);
  expect(display[0]).toMatchObject({ kind: "section", label: "" });
  expect(display[1]).toMatchObject({ kind: "section", label: "" });
  expect(names(display)).toEqual(["name", "email"]);
});
