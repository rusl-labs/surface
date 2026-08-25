import { listFields, type Schema } from "../../packages/core/src/index.ts";

export function names(fields: ReturnType<typeof listFields>): string[] {
  const out: string[] = [];
  for (const f of fields) {
    if (f.kind === "field") out.push(f.surface.id);
    else if (f.kind === "section") out.push(...names([...f.children()]));
  }
  return out;
}

type FieldYield = Extract<
  ReturnType<typeof listFields>[number],
  { kind: "field" }
>;

export function fieldByName(
  fields: ReturnType<typeof listFields>,
  name: string,
): FieldYield {
  for (const f of fields) {
    if (f.kind === "field" && f.surface.id === name) return f;
    if (f.kind === "section") {
      try {
        return fieldByName([...f.children()], name);
      } catch {
        // keep scanning siblings
      }
    }
  }
  throw new Error(`expected field ${name}`);
}

export const PERSON = "https://example.test/person";
export const PERSON_SCHEMA: Schema = {
  $id: PERSON,
  type: "object",
  properties: {
    name: { type: "string" },
    title: { type: "string" },
    email: { type: "string", format: "email" },
    secret: { type: "string" },
    note: { type: "string" },
  },
};
