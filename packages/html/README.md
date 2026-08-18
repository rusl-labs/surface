# `@rusl-labs/surface-html`

HTML kit for `@rusl-labs/surface`.

**Kit authoring** (candidate keys, `$id` / `format:` / `widget:` overrides,
helpers, Root): see **[Building kits](../../docs/guides/building-kits.md)**.

**Look and widget contract** (classes, errors, adapter vs presentational
widget, catalog, table): **[DESIGN.md](./DESIGN.md)**.

```tsx
import { createSurfaceUi, InMemorySchemaFetchResolver } from "@rusl-labs/surface";
import { createHtmlKit } from "@rusl-labs/surface-html";
// Optional default look (flat form chrome on `.surface-*` classes):
import "@rusl-labs/surface-html/surface.css";

import { createHtmlKit, humanizeFieldName } from "@rusl-labs/surface-html";

const { Surface } = createSurfaceUi({
  schemaResolver: new InMemorySchemaFetchResolver(),
  kit: createHtmlKit({
    // Bare property names → labels (`countryCode` → `Country Code`).
    // Annotation labels are never rewritten. Default is identity.
    fieldNameToLabel: humanizeFieldName,
    locale: "en-AU",
    money: { currency: "AUD" },
    tel: { defaultCountry: "AU" },
    date: { dateStyle: "medium", timeStyle: "short" },
    // resolvers: [{ key: "format:date-time", mode: "input", component: DateTimeInput }],
  }),
});
```

### Default stylesheet

`@rusl-labs/surface-html/surface.css` is **opt-in**. Core kit ships unstyled
class names; import the CSS for a usable baseline. Theme with variables:

```css
:root {
  --surface-accent: #265fd1;
  --surface-field-bg: #f8fafc;
  --surface-border: #d7dee9;
  --surface-field-gap: 1rem; /* space between object fields / display rows */
}
```

`createHtmlKit()` registers each structural key **per mode** (`input` / `display`):

- `string` → labeled text input / display text
- `enum` → native `<select>` / display text (before `string` when both apply)
- `number` / `integer` → number input / display text
- `boolean` → checkbox (`value="true"`) / `true`/`false` text
- `const` → read-only labeled input / text (display)
- `object` → `helpers.fields()` walk; **input** has optional Add/Remove presence; **display** is read-only
- `array` → **input** seeds `minItems`, Add/Remove; **display** is a `<ul>` of items
- `widget:table` → display-only table of object arrays (sortable columns)
- `allOf` → each branch is a child Surface over the same data (both modes)
- `oneOf` / `anyOf` → variant select (input) or matched branch (display)
- fallback → render nothing

Field chrome (`label` / `description`) comes from `useSurface().helpers`. Annotate a view with `label` + `description` for a form header; use section/heading/template entries to compose layout without custom components.

### Root chrome (Save / Reset)

The HTML kit sets **`kit.Root`**: the engine wraps the **root** body's renderer
as `children` when `isRoot`. In **input** mode that shell is
`<div class="surface-form">` with **button** Reset / Save — not a native HTML
`<form>` (no document submit / navigation). Works for **any** root schema
(object, allOf, oneOf, custom `$id`, …), not only `type: object`.

Save validates the data channel via
`validator.validate({ id, schema, data, schemaResolver })`.
Only when valid does it call Surface `onSubmit({ data })`.

```ts
const { Surface } = createSurfaceUi({
  schemaResolver,
  validator,
  kit: createHtmlKit({
    form: { saveLabel: "Save invoice", resetLabel: "Discard" },
  }),
});

<Surface
  id={invoiceId}
  data={draft}
  onChange={setDraft}
  onSubmit={({ data }) => persist(data)}
/>
```

### CSS hooks

Every chrome node carries a stable `surface-…` class (exported as `surfaceClass`):

```css
.surface-object { gap: 1rem; }
.surface-section { border-color: #ccc; }
.surface-control { font: inherit; }
.surface-template { font-style: italic; }
```

| Class | Where |
| --- | --- |
| `surface-object` / `surface-object-body` | Object body + property stack |
| `surface-title` | View / subject header |
| `surface-description` | Description under title, section, or field |
| `surface-slot` | Object property mount (layout only — not field chrome) |
| `surface-group` / `surface-group-header` | Optional structured property shell (Add/Remove) |
| `surface-field` | Leaf field chrome (label + control) |
| `surface-label` | Label text |
| `surface-control` | Inputs / selects |
| `surface-value` | Display-mode value |
| `surface-section` / `surface-section-label` / `surface-section-body` | Annotation section |
| `surface-heading` | Flat heading |
| `surface-template` | Template prose |
| `surface-array` / `surface-array-list` / `surface-array-item` | Arrays |
| `surface-button` | Add/remove |
| `surface-hidden` | Hidden submitting inputs |
| `surface-checkbox` | Boolean row |
| `surface-union` / `surface-select` | oneOf/anyOf |
| `surface-all-of` | allOf stack |
| `surface-form` / `surface-form-actions` / `surface-button-primary` | Root form shell |
| `surface-form-errors` | Form-level issues (path `[]`) after failed Save |
| `surface-invalid` / `surface-error` | Field invalid state + message (`aria-invalid` / `aria-describedby`) |

Chrome classes are unstyled by default: the host paints look. Prefer styling
`.surface-field` (controls) and avoid boxing `.surface-slot` or nesting focus rings.
