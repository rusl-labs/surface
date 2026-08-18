import type { SchemaResolver, Schema } from "../types.js";
import { schemaAtUri, splitSchemaUri } from "./schema-uri.js";

export class InMemorySchemaFetchResolver implements SchemaResolver {
  private readonly schemas: Record<string, Schema>;
  private readonly documents = new Map<string, Schema>();

  constructor(schemas: Record<string, Schema> = {}) {
    this.schemas = { ...schemas };
    for (const [uri, schema] of Object.entries(this.schemas)) {
      const { documentUri, pointer } = splitSchemaUri(uri);
      if (pointer === undefined) {
        this.documents.set(documentUri, schema);
      }
    }
  }

  async resolveDocument(documentUri: string): Promise<Schema | undefined> {
    const seeded =
      this.schemas[documentUri] ?? this.documents.get(documentUri);
    if (seeded !== undefined) {
      this.documents.set(documentUri, seeded);
      return seeded;
    }

    const cached = this.documents.get(documentUri);
    if (cached !== undefined) return cached;

    const response = await fetch(documentUri);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch schema from ${documentUri}: ${response.statusText}`,
      );
    }
    const document = (await response.json()) as Schema;
    this.documents.set(documentUri, document);
    return document;
  }

  async resolveSchema(uri: string): Promise<Schema | undefined> {
    const exact = this.schemas[uri];
    if (exact !== undefined) {
      const asDocument = schemaAtUri(exact, uri);
      return asDocument ?? exact;
    }

    const { documentUri } = splitSchemaUri(uri);
    const document = await this.resolveDocument(documentUri);
    if (document === undefined) return undefined;
    return schemaAtUri(document, uri);
  }
}
