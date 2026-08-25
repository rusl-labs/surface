# `@rusl-labs/surface`

The core runtime. `createSurfaceUi` returns the `Surface` component and the `kit` registry.

You do not need to read this to get started. The [root README](https://github.com/rusl-labs/surface/blob/master/README.md) covers the setup. Read this when you need the API reference or want to understand how Surface resolves schemas and renderers.

## `createSurfaceUi(options)`

```ts
function createSurfaceUi(options: {
  schemaResolver: SchemaResolver;
  validator: SurfaceValidator;
  kit: SurfaceKit;
  annotationResolver?: AnnotationResolver;
}): { Surface: React.FC<SurfaceProps> }
```

| Option | What it does |
| --- | --- |
| `schemaResolver` | Loads JSON Schema documents by `$id`. Surface calls it whenever it encounters a `$ref` to an unknown document. |
| `validator` | Validates data against the schema before `onSubmit`. Must implement `SurfaceValidator`. |
| `kit` | Supplies the renderers. Must implement `SurfaceKit`. |
| `annotationResolver` | Optional. Loads annotation documents by URI. |

Call `createSurfaceUi` once at the top of your app. It returns a bound `Surface` component ready to mount anywhere:

```tsx
const { Surface } = createSurfaceUi({
  schemaResolver: new InMemorySchemaFetchResolver({ [schema.$id]: schema }),
  validator: createAjvValidator(),
  kit: createHtmlKit(),
});

// Mount it anywhere
<Surface id={schema.$id} data={data} onChange={setData} />
```

## `Surface` props

| Prop | Type | Required | What it does |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Schema `$id` to render |
| `data` | `unknown` | — | Controlled value |
| `onChange` | `(next: unknown) => void` | — | Called when any field changes. Omit for an internal draft. |
| `mode` | `"input" | "display"` | — | Default `"input"` |
| `view` | `string` | — | Default `"default"`. Open string — use `"card"`, `"row"`, `"identity"`, or your own. |
| `onSubmit` | `({ data }: { data: unknown }) => void` | — | Called after a successful validate-and-save |
| `labels` | `boolean` | — | Inherited. `false` hides field chrome for this node and descendants. A child can override with `true`. |
| `schema` / `document` / `documentUri` | — | — | Pass the schema document directly when you already have it |
| `annotationUri` | `string` | — | URI of an annotation document for this mount |

## Schema resolver

Surface walks JSON Schema graphs. When it encounters a `$ref`, it asks the resolver for that document.

### `InMemorySchemaFetchResolver`

Seed it with documents keyed by `$id`. Unknown `$id` values are fetched over the network.

```ts
const resolver = new InMemorySchemaFetchResolver({
  [PERSON_ID]: personSchema,
  [ADDRESS_ID]: addressSchema,
});
```

This works for `$ref` across documents and `#/$defs/…` fragments inside them.

### Custom resolver

Implement `SchemaResolver` to load schemas from your own store:

```ts
interface SchemaResolver {
  resolve(uri: string): Promise<JsonSchemaDocument | undefined>;
}
```

## Kit registry

The kit picks a renderer for each schema node. It receives a `RendererRequest` with candidate keys and returns a React component — or falls through to the next entry.

### `createRegistryKit(options)`

Build a kit from a list of resolver entries:

```ts
import { createRegistryKit } from "@rusl-labs/surface";

const kit = createRegistryKit({
  fallback: () => null,
  resolvers: [
    { key: PERSON_ID, mode: "display", view: "card", component: PersonCard },
  ],
  Root: MyFormShell,
  aliases: { "date-time": "datetime" },
});
```

`createHtmlKit({ resolvers, aliases })` wraps this — your entries append after the HTML kit defaults.

### Registry entry shape

```ts
type RegistryEntry =
  | { key?: string; mode?: SurfaceMode; view?: SurfaceViewName;
      component: SurfaceRenderer }
  | { key?: string; mode?: SurfaceMode; view?: SurfaceViewName;
      resolve: (request: RendererRequest) => SurfaceRenderer | null };
```

| Field | What it matches |
| --- | --- |
| `key` | A candidate key. Omit for a catch-all that runs before keyed lookup. |
| `mode` | `"input"` or `"display"`. Omit for both. |
| `view` | View name. Omit for all views. A non-default view falls back to a `view: "default"` entry. |
| `component` | Always use this renderer. |
| `resolve` | Return a renderer, or `null` to keep falling through. Use when the choice depends on app state. |

Never set both `component` and `resolve`. Last registration wins when multiple entries match the same key.

### `kit.set()` after init

```ts
kit.set(PERSON_ID, "display", "card", PersonCard);
kit.set({ key: PERSON_ID, mode: "display", view: "card", component: PersonCard });
```

### `kit.Root`

When set, the engine wraps only the root body's renderer as `children`. The HTML kit uses this for a form shell with Save and Reset buttons.

### Candidate key order

For each node, Surface builds this list (most specific first) and asks the kit for the first match:

```text
schema $id
  → subject-root coordinate (<uri> or <uri>#/$defs/<name>)
  → widget.$kind
  → widget:<name> → name
  → format:<f> → f
  → const | enum | type | combinators
```

### Aliases

`createRegistryKit({ aliases })` adds one extra lookup hop. If a key `A` is not found, the kit retries with `aliases[A]` (one hop only). An explicit registration for the alias key wins over the alias target.

## `useSurface()`

Renderers call this hook for context:

```ts
const { dataApi, validity, helpers, id, mode, view, schema, labels } = useSurface();
```

| Returned | What it does |
| --- | --- |
| `dataApi.setData(next)` | Replace this node's value |
| `dataApi.setChild(key, next)` | Write one property or array index |
| `validity` | Issues projected to this node's path. Use `issuesAt(validity.issues, [])` for leaf-level issues. |
| `helpers.fields()` | Yield fields in annotation order, with sections |
| `helpers.layout()` | `"props"` (default) or `"stack"` |
| `helpers.direction()` | `"vertical"` (default) or `"horizontal"` |
| `labels` | Current `labels` value (inherited) |

### Data channel rules

- Commit through `setData` and `setChild`. Do not keep a parallel local source of truth.
- Wire formats belong on the channel: money in minor units, dates as RFC 3339.
- Control value can differ from the wire format. Convert at the boundary.

## `SurfaceValidator`

```ts
interface SurfaceValidator {
  validate(request: {
    id: string;
    schema: JsonSchemaDocument;
    data: unknown;
    schemaResolver: SchemaResolver;
  }): Promise<{ valid: boolean; issues: SurfaceIssue[] }>;
}
```

The recommended implementation is `@rusl-labs/surface-ajv`.

## Related

| Doc | Why |
| --- | --- |
| [Building kits](https://github.com/rusl-labs/surface/blob/master/docs/guides/building-kits.md) | Full guide: registry, aliases, candidate keys, writing renderers, Root |
| [Annotations](https://github.com/rusl-labs/surface/blob/master/docs/annotation.md) | Annotation model |
| [`@rusl-labs/surface-html`](https://github.com/rusl-labs/surface/blob/master/packages/html/README.md) | HTML kit config and widgets |
| [`@rusl-labs/surface-ajv`](https://github.com/rusl-labs/surface/blob/master/packages/ajv/README.md) | AJV validator adapter |
