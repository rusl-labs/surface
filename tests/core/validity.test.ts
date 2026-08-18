import { describe, expect, test } from "bun:test";
import {
  acceptAllValidator,
  issuesAt,
  pathEquals,
  projectIssues,
  type ValidityIssue,
} from "../../packages/core/src/index.ts";

const issues: readonly ValidityIssue[] = [
  { path: ["email"], message: "bad email", code: "format" },
  { path: ["lineItems", 2, "sku"], message: "required", code: "required" },
  { path: ["lineItems", 2, "qty"], message: "min", code: "minimum" },
  { path: ["unitPrice", "amount"], message: "integer", code: "type" },
  { path: [], message: "root", code: "custom" },
];

describe("validity path helpers", () => {
  test("pathEquals", () => {
    expect(pathEquals(["a", 1], ["a", 1])).toBe(true);
    expect(pathEquals(["a", 1], ["a", "1"])).toBe(false);
    expect(pathEquals([], [])).toBe(true);
  });

  test("issuesAt exact path", () => {
    expect(issuesAt(issues, ["email"])).toEqual([
      { path: ["email"], message: "bad email", code: "format" },
    ]);
    expect(issuesAt(issues, [])).toEqual([
      { path: [], message: "root", code: "custom" },
    ]);
    expect(issuesAt(issues, ["missing"])).toEqual([]);
  });

  test("projectIssues rebases under a prefix", () => {
    expect(projectIssues(issues, ["lineItems", 2])).toEqual([
      { path: ["sku"], message: "required", code: "required" },
      { path: ["qty"], message: "min", code: "minimum" },
    ]);
    expect(projectIssues(issues, ["unitPrice"])).toEqual([
      { path: ["amount"], message: "integer", code: "type" },
    ]);
    expect(projectIssues(issues, [])).toEqual(issues);
  });
});

describe("acceptAllValidator", () => {
  test("always valid", async () => {
    const result = await acceptAllValidator.validate({
      id: "x",
      schema: { type: "string" },
      data: "anything",
      schemaResolver: { resolveSchema: async () => undefined },
    });
    expect(result).toEqual({ valid: true, issues: [] });
  });
});
