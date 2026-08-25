# Surface annotations

An annotation is a JSON document. It changes how Surface displays a schema. You use annotations when you want to reorder fields, hide fields, add sections, or change layout — without writing a custom component.

Schema owns the data shape. Annotations own presentation choices. The kit owns the DOM.

## Before and after

Here is a contact form with Surface defaults. Schema property order. No sections. Every field visible.

```tsx
<Surface id="https://example.com/contact" data={contact} />
```

Here is the same form with an annotation. Fields are reordered. The phone field is hidden. A "Details" section groups the remaining fields.

```json
{
  "subject": "https://example.com/contact",
  "views": {
    "default": {
      "fields": [
        { "name": "name" },
        { "label": "Details", "fields": [
          { "name": "email" },
          { "name": "website" }
        ]}
      ]
    }
  }
}
```

```tsx
const { Surface } = createSurfaceUi({
  schemaResolver,
  validator: createAjvValidator(),
  kit: createHtmlKit(),
  annotationResolver: new InMemoryAnnotationResolver({
    ["https://example.com/contact"]: contactAnnotation,
  }),
});

// No per-mount prop. The resolver matches by schema $id.
<Surface id="https://example.com/contact" data={contact} />
```

## Document structure

```json
{
  "subject": "https://…/schemas/commerce.product",
  "views": { "default": { … }, "card": { … } },
  "defs": { "emailEntry": { "views": { … } } }
}
```

| Key | What it does |
| --- | --- |
| `subject` | Schema `$id` this annotation applies to |
| `targetLibraries` | Optional kit ids this annotation targets (metadata for tooling; core does not filter by it) |
| `views` | Named presentations. `"default"` is the fallback. |
| `defs` | Presentation for `#/$defs/<name>` scopes inside the subject schema |

## Views

A view describes one presentation of the schema. It has an optional `label`, `description`, `layout`, `direction`, and a `fields` list.

### Conventional view names

View names are open strings. These conventions are recommended:

| View | When to use it |
| --- | --- |
| `default` | Full primary surface. Input: labeled edit form. Display: calm read. |
| `identity` | Who/what header — banner name and muted meta. For people and products. Not for money or addresses. |
| `row` | One horizontal scan line for lists — primary, secondary, status. |
| `card` | Dense preview tile — lede and a few essentials. Not a mini form. |

### Layout and direction

| Key | Values | What it does |
| --- | --- | --- |
| `layout` | `"props"` (default), `"stack"` | `props`: label next to value. `stack`: full-width blocks. |
| `direction` | `"vertical"` (default), `"horizontal"` | Column vs wrapping row. |
| `rest` | `"append"` (default), `"omit"` | What to do with properties not listed in `fields`. |

## Fields

A view's `fields` list controls what appears and in what order. Each entry is one of these:

- **Bound field** — `{ "name": "sku" }`. A single property name. Never dotted.
- **Section** — `{ "label": "Details", "fields": […] }`. Groups fields under a heading. Empty label = anonymous group.
- **Heading** — `{ "label": "Payment" }` without `fields`. A visual divider.
- **Template** — `{ "template": "Hello {{name}}" }`. HTML-escaped text. Dotted paths are allowed.
- **Block, banner, span** — `{ "kind": "block"|"banner"|"span", … }`. Structural chrome. Optional `fields`, `template`, or `label`.
- **Rest slot** — `{ "rest": true }`. Where to put unlisted properties.

A field entry can carry mode-specific decoration under `input` or `display`. Use this for widgets:

```json
{ "name": "email", "display": { "widget": { "name": "link" } } }
```

### Arrays that point at another schema

Two kinds of arrays:

1. **Inline items.** The items live inside the array's schema. You describe them inline with `items`:

```json
{
  "name": "tags",
  "items": {
    "fields": [{ "name": "value" }]
  }
}
```

1. **Referenced items.** The items point at another schema with `$ref`. You cannot describe them inline — annotate the schema they point at instead.

If the `$ref` is relative (like `#/$defs/phone`), put the annotation on `defs.phone` in the same document:

```json
{
  "defs": {
    "phone": {
      "views": {
        "default": {
          "fields": [{ "name": "number", "widget": { "name": "tel" } }]
        }
      }
    }
  }
}
```

If the `$ref` is absolute (like `https://example.com/phone`), write a separate annotation document whose `subject` is that `$id`.

### Add controls for arrays and optional objects

Omit `addLabel` for a hover `+`. Set `addLabel` for a visible caption. `{{path}}` interpolates over that node's data.

## Widgets

A widget entry tells the kit which renderer to use for a field:

```json
{
  "name": "link",
  "$kind": "https://resources.rusl.com/resources/surface/schemas/default-kit#/$defs/link",
  "options": { … }
}
```

| Key | What it does |
| --- | --- |
| `name` | Short name. Becomes candidate key `widget:<name>`. |
| `$kind` | Absolute URI typing the whole widget. Takes precedence in resolution. |
| `options` | Optional bag passed to the renderer. |

Without `$kind`, the `options` are a grab-bag for the named renderer. Core does not validate `$kind` — each kit owns its widget schema.

For the HTML kit's widget vocabulary, see `@rusl-labs/surface-html/schemas/default-kit.schema.json`.

## How the kit picks a renderer

For each node, Surface builds a list of candidate keys. It asks the kit for the first match. Most specific first:

```text
schema $id
  → subject-root coordinate (<uri> or <uri>#/$defs/<name>)
  → widget.$kind
  → widget:<name> → name
  → format:<f> → f
  → const | enum | type | combinators
```

## What annotations are not

- Not components or code
- Not validation (schema and the validity channel own that)
- Not Save/Reset (the kit owns that)

## Envelope schema

The annotation format contract: [annotation-format.schema.json](./annotation-format.schema.json)
