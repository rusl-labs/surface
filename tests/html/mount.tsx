import { render, type RenderResult } from "@testing-library/react";
import {
  acceptAllValidator,
  createSurfaceUi,
  InMemorySchemaFetchResolver,
  type Schema,
} from "../../packages/core/src/index.ts";
import { createHtmlKit } from "../../packages/html/src/index.tsx";

/** Mount a Surface with the HTML kit and an in-memory schema map. */
export function mountHtml(
  schemas: Record<string, Schema>,
  props: {
    id: string;
    mode: "input" | "display";
    data?: unknown;
  },
): RenderResult {
  const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
    schemaResolver: new InMemorySchemaFetchResolver(schemas),
    kit: createHtmlKit(),
  });
  return render(<Surface {...props} />);
}
