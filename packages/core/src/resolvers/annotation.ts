import type { AnnotationDocument, AnnotationResolver } from "../types.js";

/**
 * Documents held by subject — the convenience front for app-served ones.
 * Caching and request dedupe belong to the app's resolver, not to core: a
 * resolver that wants them implements them here, rather than core keeping a
 * second cache alongside whatever the app already has.
 */
export class InMemoryAnnotationResolver implements AnnotationResolver {
  private readonly documents: Record<string, AnnotationDocument>;

  constructor(documents: Record<string, AnnotationDocument> = {}) {
    this.documents = { ...documents };
  }

  async resolveAnnotation(
    subject: string,
  ): Promise<AnnotationDocument | undefined> {
    return this.documents[subject];
  }
}
