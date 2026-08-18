import { describe, expect, test } from "bun:test";
import { setChildValue } from "../../packages/core/src/data.ts";

describe("setChildValue", () => {
  test("sets an object property", () => {
    expect(setChildValue({ a: 1 }, "b", 2)).toEqual({ a: 1, b: 2 });
  });

  test("undefined omits an object property (optional absent)", () => {
    const next = setChildValue(
      { name: "Ada", geo: { type: "Point" } },
      "geo",
      undefined,
    );
    expect(next).toEqual({ name: "Ada" });
    expect(Object.prototype.hasOwnProperty.call(next, "geo")).toBe(false);
  });

  test("null is kept as an explicit value", () => {
    expect(setChildValue({ name: "Ada" }, "geo", null)).toEqual({
      name: "Ada",
      geo: null,
    });
  });

  test("sets an array index", () => {
    expect(setChildValue(["a"], 1, "b")).toEqual(["a", "b"]);
  });
});
