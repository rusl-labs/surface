# Surface annotations

Presentation for one **subject** schema. Schema owns shape; annotation owns presentation decisions; kit owns DOM and look.

**Envelope schema:** [`annotation-format.schema.json`](./annotation-format.schema.json)  
**Default-kit `widget` schema:** [`packages/html/schemas/default-kit.schema.json`](../packages/html/schemas/default-kit.schema.json)  
**Runtime:** `@rusl-labs/surface` helpers + kit candidate keys  
**Kit authoring:** [`guides/building-kits.md`](./guides/building-kits.md)

## Document

```json
{
  "$schema": "https://resources.rusl.com/resources/pragmatic/schemas/surface.annotation.v1",
  "subject": "https://…/schemas/commerce.product",
  "views": { "default": { … }, "card": { … } },
  "defs": { "emailEntry": { "views": { … } } }
}
```

| Key | Role |
| --- | --- |
| `subject` | Schema `$id` this document applies to |
| `targetLibraries` | Optional kit/library ids this annotation targets (tooling metadata; core does not filter renderers) |
| `views` | Named presentations; `default` is the fallback |
| `defs` | Presentation for subject `#/$defs/<name>` scopes (required for `$ref` array item widgets — `items.fields` is ignored on `$ref` items) |

## Views and fields

A view has optional `label`, `description`, **`layout`**, **`direction`**, `fields`, `rest`.

| Key | Values | Meaning |
| --- | --- | --- |
| `layout` | `props` (default), `stack` | Label\|value rows vs full-width blocks |
| `direction` | `vertical` (default), `horizontal` | Body flow (column vs wrapping row) |
| `rest` | `append` (default), `omit` | Unlisted properties |

`fields` is a list of:

- **Bound field** — `{ "name": "sku", … }` (single property name, never dotted)
- **Section** — `{ "label": "…", "fields": […] }` (empty `label` = anonymous group)
- **Heading** — `{ "label": "…" }` without `fields`
- **Template** — `{ "template": "Hello {{name}}" }` (HTML-escaped; dotted paths OK)
- **Block / banner / span** — `{ "kind": "block"|"banner"|"span", … }` optional `fields` / `template` / `label`
- **Rest slot** — `{ "rest": true }`

### Conventional view names

View names are open strings. Prefer these conventions when authoring — and only
add a view when it earns a distinct job:

| View | Intent |
| --- | --- |
| `default` | Full primary surface. **Input:** labeled edit form. **Display:** calm read (mode overrides so display isn't a labeled twin of input). |
| `identity` | Who/what header only — banner name + muted meta span. People/products, not money/postal/invoice. |
| `row` | One horizontal scan line for lists (primary · secondary · status/amount). |
| `card` | Dense preview tile: lede + a few essentials — not a mini default form. |

Empty view `label: ""` suppresses on-canvas object titles. Avoid section titles
like "Identity" / "Reach" as decoration.

Array / optional-object **add** control: omit `addLabel` for a hover `+`.
Set `addLabel` for a visible caption (`"Add another"`). `{{path}}` interpolates
over that node's data, same as templates. `itemLabel` stays the a11y noun for
remove (`Remove email`).

`$ref` array items: put widgets on `defs.<name>` (relative) or a subject
annotation (absolute `$id`). `items.fields` is ignored on `$ref` items.

A nested object only uses a `fields` list when that bound entry carries one.
Otherwise it renders in schema property order — it does not replay the parent
view (banners/templates included).

## Modes

`input` / `display` on a field entry hold decoration only (including `widget`). Different *layout* per mode → use two views and mount with the one you want.

## Widget

The envelope owns only the shell. Kit kinds own the rest.

```json
{
  "name": "link",
  "$kind": "https://resources.rusl.com/resources/surface/schemas/default-kit#/$defs/link"
}
```

| Key | Role |
| --- | --- |
| `name` | Short name; candidate key `widget:<name>` |
| `$kind` | Absolute URI typing **the whole widget**; takes precedence in resolution |
| `options` | Optional nested bag |
| *other keys* | Allowed (`additionalProperties`). When `$kind` is set, those keys are an instance of the kind schema — for the default HTML kit, `packages/html/schemas/default-kit.schema.json`. |

Without `$kind`: grab-bag for the named renderer. Core does not validate `$kind`.

Do not document kit-specific widget params (`columns`, `defaultCountry`, `align`) here. They live on the kit schema.

## Candidate keys (renderer pick)

Most specific first:

```text
schema $id
  → subject-root coordinate (`<uri>` or `<uri>#/$defs/<name>`)
  → widget.$kind
  → widget:<name> → name
  → format:<f> → f
  → const | enum | type | combinators
```

## What annotations are not

- Not components or code
- Not validation constraints (schema + validity channel)
- Not Save/Reset (kit / host)
