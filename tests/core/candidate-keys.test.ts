import { describe, expect, test } from "bun:test";
import { candidateKeys } from "../../packages/core/src/index.ts";

const CONTACT = "https://example.test/schemas/contact.card";

describe("candidateKeys", () => {
  test("puts the schema $id first, above the annotation's widget", () => {
    expect(
      candidateKeys(
        { $id: CONTACT, type: "object" },
        { widget: { name: "card" } },
      ),
    ).toEqual([CONTACT, "widget:card", "card", "object"]);
  });

  test("puts widget.$kind before widget name", () => {
    const kind =
      "https://resources.rusl.com/resources/surface/schemas/default-kit#/$defs/media";
    expect(
      candidateKeys(
        { type: "array" },
        { widget: { name: "media", $kind: kind } },
      ),
    ).toEqual([kind, "widget:media", "media", "array"]);
  });

  test("orders widget above format above the structural key", () => {
    expect(
      candidateKeys(
        { type: "string", format: "date" },
        { widget: { name: "calendar" } },
      ),
    ).toEqual(["widget:calendar", "calendar", "format:date", "date", "string"]);
  });

  test("emits the bare name after each namespaced key", () => {
    expect(candidateKeys({ type: "string", format: "email" })).toEqual([
      "format:email",
      "email",
      "string",
    ]);
  });

  test("dedupes candidates, keeping the first occurrence", () => {
    expect(
      candidateKeys(
        { type: "string", format: "email" },
        { widget: { name: "email" } },
      ),
    ).toEqual(["widget:email", "email", "format:email", "string"]);
  });

  test("does not split a $id on its URI scheme", () => {
    expect(candidateKeys({ $id: CONTACT })).toEqual([CONTACT]);
  });

  test("keeps the type after const, so a const string still reaches string", () => {
    expect(candidateKeys({ const: "Point", type: "string" })).toEqual([
      "const",
      "string",
    ]);
  });

  test("puts enum before type so enum strings hit enum not string", () => {
    expect(
      candidateKeys({ type: "string", enum: ["AK", "AL", "CA"] }),
    ).toEqual(["enum", "string"]);
  });

  test("passes each JSON Schema type through as a key", () => {
    for (const type of [
      "string",
      "number",
      "integer",
      "boolean",
      "object",
      "array",
      "null",
    ]) {
      expect(candidateKeys({ type })).toEqual([type]);
    }
  });

  test("adds present combinators after the type, most specific first", () => {
    expect(candidateKeys({ oneOf: [{ type: "string" }] })).toEqual(["oneOf"]);
    expect(candidateKeys({ anyOf: [{ type: "string" }] })).toEqual(["anyOf"]);
    expect(candidateKeys({ allOf: [{ type: "string" }] })).toEqual(["allOf"]);
    expect(
      candidateKeys({ type: "object", allOf: [{ type: "object" }] }),
    ).toEqual(["object", "allOf"]);
    expect(
      candidateKeys({
        oneOf: [{ type: "string" }],
        anyOf: [{ type: "number" }],
        allOf: [{ type: "boolean" }],
      }),
    ).toEqual(["oneOf", "anyOf", "allOf"]);
  });

  test("yields no keys for a node with nothing to dispatch on", () => {
    expect(candidateKeys({})).toEqual([]);
  });

  test("yields no widget keys without an annotation entry", () => {
    expect(candidateKeys({ type: "string" })).toEqual(["string"]);
  });

  test("puts a subject-root coordinate after schema $id", () => {
    const phone =
      "https://resources.rusl.com/resources/pragmatic/schemas/contact.scalars#/$defs/phone";
    expect(
      candidateKeys({ type: "string" }, undefined, {
        subject: phone,
        path: [],
      }),
    ).toEqual([phone, "string"]);
  });

  test("ignores a coordinate that is not a subject root", () => {
    expect(
      candidateKeys({ type: "string" }, undefined, {
        subject: CONTACT,
        path: ["phones", "0"],
      }),
    ).toEqual(["string"]);
  });

  test("schema $id stays ahead of a different subject-root coordinate", () => {
    const phone =
      "https://resources.rusl.com/resources/pragmatic/schemas/contact.scalars#/$defs/phone";
    expect(
      candidateKeys({ $id: CONTACT, type: "string" }, undefined, {
        subject: phone,
        path: [],
      }),
    ).toEqual([CONTACT, phone, "string"]);
  });

  test("dedupes schema $id that matches the subject-root coordinate", () => {
    expect(
      candidateKeys({ $id: CONTACT, type: "object" }, undefined, {
        subject: CONTACT,
        path: [],
      }),
    ).toEqual([CONTACT, "object"]);
  });
});
