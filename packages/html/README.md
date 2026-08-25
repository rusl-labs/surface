# `@rusl-labs/surface-html`

The HTML kit for Surface. A kit is a collection of React components that Surface uses to render each part of your schema. This kit gives you plain HTML — inputs, selects, checkboxes — with opt-in CSS.

You do not need to read this to get started. The [root README](https://github.com/rusl-labs/surface/blob/master/README.md) covers the basic setup. Read this when you need to configure the kit or understand what renderers and widgets ship by default.

## Quick config

```tsx
import { createHtmlKit, humanizeFieldName } from "@rusl-labs/surface-html";

const kit = createHtmlKit({
  locale: "en-AU",
  fieldNameToLabel: humanizeFieldName,
  money: { currency: "AUD" },
  tel: { defaultCountry: "AU" },
  date: { dateStyle: "medium", timeStyle: "short" },
  form: { saveLabel: "Save", resetLabel: "Reset" },
});
```

Pass the kit to `createSurfaceUi`:

```tsx
const { Surface } = createSurfaceUi({
  schemaResolver,
  validator: createAjvValidator(),
  kit,
});
```

## Configuration options

| Option | Type | What it does |
| --- | --- | --- |
| `locale` | `string` | BCP 47 locale for money, numbers, and dates. Default: runtime locale. |
| `fieldNameToLabel` | `(name: string) => string` | Format a bare property name as a label. Annotation and schema titles are not passed through. Default: identity. |
| `money` | `{ currency, currencies?, locked?, currencyDisplay? }` | Default currency. Schema `const` / `enum` on a `currency` field overrides. |
| `tel` | `{ defaultCountry, countries?, showCountry? }` | Phone input defaults. A field-level `defaultCountry` overrides the kit default. |
| `date` | `{ dateStyle?, timeStyle? }` | Display formatting. Input still uses native date controls. |
| `form` | `{ saveLabel?, resetLabel?, enabled? }` | Root Save / Reset button labels. Default enabled in input mode. |
| `aliases` | `Record<string, string>` | Extra one-hop lookup keys. Host entries merge over built-in aliases. |
| `resolvers` | `RegistryEntry[]` | Extra registry entries, appended after built-in defaults. |

## Register your own renderers

```tsx
const kit = createHtmlKit({
  resolvers: [
    // By schema $id — your component for the whole type
    { key: PERSON_ID, mode: "display", view: "card", component: PersonCard },
    // By format — your date picker for all date-time fields
    { key: "format:date-time", mode: "input", component: MyDatePicker },
  ],
});
```

Your entries append after the built-in defaults. Last registration for a key wins. For full registry docs: [Building kits](https://github.com/rusl-labs/surface/blob/master/docs/guides/building-kits.md).

## Built-in renderers

### Structural types

The kit registers renderers for every JSON Schema type:

| Key | Mode | What it renders |
| --- | --- | --- |
| `string` | input / display | Text input or text display |
| `number` / `integer` | input / display | Number input |
| `boolean` | input / display | Checkbox |
| `const` | input / display | Read-only fixed value |
| `enum` | input / display | `<select>` (before `string` when both apply) |
| `object` | input / display | `helpers.fields()` layout. Input has Add/Remove for optional properties. |
| `array` | input / display | List with add/remove |
| `allOf` | input / display | Branches over the same data |
| `oneOf` / `anyOf` | input / display | Variant select (input) or matched branch (display) |
| fallback | — | Renders nothing |

### Widgets (short names)

Each is registered once by short name. An alias adds one extra lookup hop to the same renderer.

| Key | Input | Display |
| --- | --- | --- |
| `email` | Email input | `mailto:` link |
| `tel` | National draft, E.164 on blur | Locale `tel:` link |
| `uri` | URL input | Anchor link |
| `datetime` | `datetime-local` ↔ RFC 3339 | Formatted date-time |
| `date` | Native date input | Formatted date |
| `media` | File input | Image / video / audio |
| `link` | URL input | Anchor |
| `copy` | Read-only value | Value + clipboard button |
| `input` | Typed string control | Text display |
| `table` | — | Display-only object-array table. Sort is view-only. Columns: `field`, `label`, `sortable`, `align`, `fontWeight`. |

### `$id` registrations

These widgets are registered by schema `$id` — no annotation needed:

| `$id` | Constant | What it renders |
| --- | --- | --- |
| Money | `MONEY_ID` | Amount + currency selector (`currency.js`) |
| Phone | `PHONE_ID` | National draft + E.164 output (`libphonenumber-js`) |

`PHONE_ID` is a map key only. The kit does not vendor the phone schema. `MONEY_ID` is registered directly on the money schema `$id`.

## Built-in aliases

`createHtmlKit({ aliases })` merges `{ ...HTML_KIT_ALIASES, ...user }`. Host wins.

| You write | Resolves to |
| --- | --- |
| `datetime` / `date-time` | `datetime` |
| `email` / `idn-email` | `email` |
| `uri` / `uri-reference` / `iri` / `iri-reference` | `uri` |
| widget `$kind` URIs | the short name |
| `PHONE_ID` | `tel` |

## Root shell

The HTML kit sets `kit.Root`. In input mode, the root body is wrapped in a `<div class="surface-form" role="group">` with Reset and Save buttons — not a native `<form>` submit.

On Save, the kit deep-applies schema `const` (forced) and `default` (when missing), then calls `validator.validate()`. Only a valid result calls Surface `onSubmit({ data })`.

Configure the buttons:

```ts
createHtmlKit({ form: { saveLabel: "Save invoice", resetLabel: "Discard" } });
```

## CSS

`@rusl-labs/surface-html/surface.css` is opt-in. Class names ship unstyled. Import the CSS for a baseline. Theme with CSS custom properties:

```css
:root {
  --surface-accent: #265fd1;
  --surface-field-bg: #f8fafc;
  --surface-border: #d7dee9;
  --surface-field-gap: 1rem;
}
```

### Stable class names

Chrome nodes carry these classes (exported as `surfaceClass`):

| Class | Where |
| --- | --- |
| `surface-object` / `surface-object-body` | Object body and property stack |
| `surface-field` / `surface-label` / `surface-control` | Leaf field chrome |
| `surface-value` | Display-mode value |
| `surface-form` / `surface-form-actions` / `surface-button-primary` | Root form shell |
| `surface-form-errors` | Form-level issues after failed Save |
| `surface-invalid` / `surface-error` | Field invalid state and message |

### Layout attributes

The kit stamps `data-surface-layout` and `data-surface-direction` on object bodies, plus classes `surface-layout-props` / `surface-layout-stack` and `surface-direction-vertical` / `surface-direction-horizontal`.

### `<Surface labels={false} />`

`labels` inherits. `false` hides field chrome on that node and descendants. A child can set `labels: true` to override.

## Related

| Doc | Why |
| --- | --- |
| [Building kits](https://github.com/rusl-labs/surface/blob/master/docs/guides/building-kits.md) | Full kit authoring guide |
| [DESIGN.md](./DESIGN.md) | HTML kit look, class list, widget contract |
| [`@rusl-labs/surface`](https://github.com/rusl-labs/surface/blob/master/packages/core/README.md) | Core API reference |
| [Annotations](https://github.com/rusl-labs/surface/blob/master/docs/annotation.md) | Annotation model |
