import { createHtmlKit } from "@rusl-labs/surface-html";
import type { SurfaceKit, SurfaceRenderer } from "@rusl-labs/surface";

const TenantCard: SurfaceRenderer = () => null;

const kit = createHtmlKit({
  resolvers: [
    { key: "string", mode: "input", component: TenantCard },
    { resolve: (req) => (req.data === undefined ? null : TenantCard) },
  ],
});

kit.set("https://example.test/schemas/123", "display", "card", TenantCard);
kit.set({ key: "https://example.test/schemas/123", resolve: () => TenantCard });

const required: SurfaceKit = kit;
void required.fallback;
void required.resolveRenderer({
  keys: ["string"],
  mode: "input",
  view: "default",
  schema: { type: "string" },
});
