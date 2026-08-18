import type { Schema } from "@rusl-labs/surface";

/** Map JSON Schema string constraints onto HTML input attributes. */
export function stringInputProps(schema: Schema | undefined): {
  readonly type: string;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly min?: string;
  readonly max?: string;
  readonly step?: string;
} {
  if (schema === undefined) return { type: "text" };

  const format = typeof schema.format === "string" ? schema.format : undefined;
  let type = "text";
  if (format === "email") type = "email";
  else if (format === "uri" || format === "uri-reference") type = "url";
  else if (format === "date") type = "date";
  else if (format === "date-time") type = "datetime-local";
  else if (format === "time") type = "time";

  return {
    type,
    ...(typeof schema.minLength === "number"
      ? { minLength: schema.minLength }
      : {}),
    ...(typeof schema.maxLength === "number"
      ? { maxLength: schema.maxLength }
      : {}),
    ...(typeof schema.pattern === "string" ? { pattern: schema.pattern } : {}),
  };
}

export function numberInputProps(schema: Schema | undefined): {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number | "any";
} {
  if (schema === undefined) return {};
  return {
    ...(typeof schema.minimum === "number" ? { min: schema.minimum } : {}),
    ...(typeof schema.maximum === "number" ? { max: schema.maximum } : {}),
    ...(typeof schema.multipleOf === "number"
      ? { step: schema.multipleOf }
      : { step: schema.type === "integer" ? 1 : "any" }),
  };
}
