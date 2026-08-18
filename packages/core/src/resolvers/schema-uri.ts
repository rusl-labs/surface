import type { Schema, SchemaResolver } from "../types.js";

export function splitSchemaUri(uri: string): {
  readonly documentUri: string;
  readonly pointer: string | undefined;
} {
  const hash = uri.indexOf("#");
  if (hash === -1) {
    return { documentUri: uri, pointer: undefined };
  }
  const documentUri = uri.slice(0, hash);
  const pointer = uri.slice(hash + 1);
  return {
    documentUri,
    pointer: pointer.length > 0 ? pointer : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Resolve a JSON Pointer (`/$defs/point` or `$defs/point`) against a document. */
export function getJsonPointer(root: unknown, pointer: string): unknown {
  if (pointer === "" || pointer === "/") return root;
  const path = pointer.startsWith("/") ? pointer.slice(1) : pointer;
  if (path.length === 0) return root;

  const parts = path
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));

  let current: unknown = root;
  for (const part of parts) {
    if (!isRecord(current) || !(part in current)) return undefined;
    current = current[part];
  }
  return current;
}

export type ResolvedSchemaRef = {
  readonly schema: Schema;
  readonly document: Schema;
  readonly documentUri: string;
};

/**
 * Resolve a `$ref`:
 * - relative (`#/...`) → current document in context
 * - absolute → fetch/load that document
 * then apply a `#/$defs/...` fragment when present.
 */
export async function resolveSchemaRef(
  ref: string,
  args: {
    readonly resolver?: SchemaResolver | undefined;
    readonly document?: Schema | undefined;
    readonly documentUri?: string | undefined;
  },
): Promise<ResolvedSchemaRef | undefined> {
  if (ref.startsWith("#")) {
    const { document, documentUri } = args;
    if (document === undefined || documentUri === undefined) return undefined;
    const pointer = ref.slice(1);
    const target = getJsonPointer(document, pointer);
    if (!isRecord(target)) return undefined;
    return {
      schema: target as Schema,
      document,
      documentUri,
    };
  }

  const { documentUri, pointer } = splitSchemaUri(ref);
  if (documentUri.length === 0) return undefined;

  const resolver = args.resolver;
  if (resolver === undefined) return undefined;

  const document =
    (resolver.resolveDocument !== undefined
      ? await resolver.resolveDocument(documentUri)
      : await resolver.resolveSchema(documentUri)) ?? undefined;
  if (document === undefined) return undefined;

  if (pointer === undefined) {
    return { schema: document, document, documentUri };
  }

  const target = getJsonPointer(document, pointer);
  if (!isRecord(target)) return undefined;
  return {
    schema: target as Schema,
    document,
    documentUri,
  };
}

/** Apply fragment pointer (if any) against an already-loaded document. */
export function schemaAtUri(document: Schema, uri: string): Schema | undefined {
  const { pointer } = splitSchemaUri(uri);
  if (pointer === undefined) return document;
  const target = getJsonPointer(document, pointer);
  return isRecord(target) ? (target as Schema) : undefined;
}
