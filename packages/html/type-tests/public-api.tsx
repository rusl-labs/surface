import {
  createSurfaceUi,
  createRegistryKit,
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  candidateKeys,
  useSurface,
  type SurfaceKit,
  type SurfaceRenderer,
  type SurfaceValidator,
} from "@rusl-labs/surface";
import {
  createHtmlKit,
  FieldChrome,
  HTML_KIT_ALIASES,
  MONEY_ID,
  PHONE_ID,
  humanizeFieldName,
  surfaceClass,
} from "@rusl-labs/surface-html";

const accept: SurfaceValidator = {
  validate: () => ({ valid: true, issues: [] }),
};

const TenantCard: SurfaceRenderer = () => null;

const kit = createHtmlKit({
  locale: "en-AU",
  money: { currency: "AUD" },
  tel: { defaultCountry: "AU" },
  date: { dateStyle: "medium", timeStyle: "short" },
  fieldNameToLabel: humanizeFieldName,
  aliases: { "x-phone": "tel" },
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

void HTML_KIT_ALIASES[PHONE_ID];
void HTML_KIT_ALIASES["date-time"];
void MONEY_ID;
void surfaceClass.table;
void surfaceClass.link;
void FieldChrome;

const { Surface } = createSurfaceUi({
  schemaResolver: new InMemorySchemaFetchResolver(),
  annotationResolver: new InMemoryAnnotationResolver({}),
  validator: accept,
  kit,
});

void (
  <Surface
    id="https://example.test/schemas/123"
    labels={false}
    mode="display"
    view="card"
  />
);

void candidateKeys({ type: "string", format: "email" });
void createRegistryKit({
  fallback: TenantCard,
  aliases: { "date-time": "datetime" },
});
void useSurface;
