# HTML kit design system

Look and widget contract for `@rusl-labs/surface-html`.

The kit is **plain HTML + CSS**. It is not Ant, shad, or any other component
framework. Those catalogs are a checklist of *jobs*. We implement the jobs with
native elements and small libraries (`libphonenumber-js`, `currency.js`, `Intl`).

**Authority**

| Concern | File |
| --- | --- |
| Widget vocabulary (`$kind` defs) | `schemas/default-kit.schema.json` (schema steward) |
| Class names | `src/classes.ts` (`surfaceClass`) — designer |
| Default look / tokens | `surface.css` (opt-in) — designer |
| How a kit wins a node | `docs/guides/building-kits.md` |
| Annotation widget envelope | `docs/annotation.md` |

Class names and token defaults stay one look. Propose names in
`src/classes.ts`; do not invent a parallel class scale in a widget.

App defaults go on `createHtmlKit({ locale, money, tel, date })` — not annotations:

```ts
createHtmlKit({
  locale: "en-AU",
  money: { currency: "AUD", locked: true },
  tel: { defaultCountry: "AU" },
  date: { dateStyle: "medium", timeStyle: "short" },
});
```

Schema `const` / `enum` on a money field still wins over kit `money`.
A field `widget.defaultCountry` still wins over kit `tel`.

---

## Two layers

`resolveRenderer(request)` sees the tree: keys, coordinate, mode, view, schema,
entry, data. The **adapter** (the registered `SurfaceRenderer`) may use that
and `useSurface()`.

A widget is a **product control**. It never paints teaching chrome: no
`data →`, no raw JSON, no `[USD] 1234` next to the field. Wire shape
stays on the data channel. The playground Seed / Save panels may show
JSON; the kit must not.

The **widget** does not. It is a presentational control:

```ts
type WidgetProps<T> = {
  readonly value: T | undefined;
  readonly widget: Record<string, unknown>; // flattened bag (see widgetBag)
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly invalid?: boolean;
  readonly controlId: string;
  readonly name?: string;
  readonly describedBy?: string;
  readonly onChange?: (next: T | undefined) => void;
  readonly onBlur?: () => void;
};
```

| Layer | Owns | Does not own |
| --- | --- | --- |
| **Adapter** | `useSurface`, FieldChrome, errors, a11y ids, `dataApi.setData`, child `Surface` mounts | Visual control details |
| **Widget** | Native element + library (parse, format, normalize) | Tree walk, schema walk, annotation resolve |

Adapters stay thin. If a widget needs schema constraints (`minLength`,
`minimum`, `enum` values), the adapter **projects** them into props. Do not
call `useSurface()` inside the widget.

`widgetBag(entry.widget)` is the only annotation the widget sees: `options`
first, then top-level keys except `name` / `$kind` / `options`.

---

## How a node picks a control

Candidate keys (core), most specific first:

```text
schema $id
  → subject-root coordinate (`<uri>` or `<uri>#/$defs/<name>`)
  → widget.$kind
  → widget:<name> → name
  → format:<f> → f
  → const | enum | type | combinators
```

Two ways a nice control appears:

1. **Schema default** — `type` / `format` / `enum` / `const`. No annotation.
   Register the spec name (`date`, `date-time`, `email`), not a nickname.
2. **Annotation widget** — `{ "widget": { "name": "tel" } }`.
   Specialized skin of the same wire value (slider, progress, table, password).

JSON Schema has no `datetime` type and no `tel` format. Spec format is
`date-time`. Phone is an `$id` takeover of
`contact.scalars#/$defs/phone` (E.164). `widget:tel` skins a plain string.

Kit `widget` params (`columns`, `align`, `defaultCountry`, …) are defined in
`schemas/default-kit.schema.json`, not the annotation envelope.

---

## Classes

All names are `surface-*`, exported as `surfaceClass`. Host CSS owns look.
The opt-in sheet `surface.css` paints a baseline on these classes only.

### Chrome (every field)

| Class | Role |
| --- | --- |
| `surface-field` | Labeled field wrapper (label + description + control) |
| `surface-slot` | Mount with no label/description (do not box this) |
| `surface-label` | Label text |
| `surface-description` | Help text under title, section, or field |
| `surface-control` | Interactive control (`input`, `select`, `textarea`) |
| `surface-value` | Read-only display text |
| `surface-invalid` | Control failed a shown check |
| `surface-error` | Message under the control (`role="alert"`) |
| `surface-hidden` | Hidden submitting input |
| `surface-button` | Quiet text action |
| `surface-icon-button` / `--add` / `--remove` | Collection + / trash (hover) |
| `surface-button-primary` | Save |

### Structure

| Class | Role |
| --- | --- |
| `surface-object` / `surface-object-body` | Object |
| `surface-layout-props` / `surface-layout-stack` | Label\|value rows vs stacked blocks |
| `surface-direction-vertical` / `surface-direction-horizontal` | Body axis |
| `surface-dl` / `surface-prop` / `surface-prop-value` | Display definition list |
| `surface-stack-item` | Stack-layout field |
| `surface-title` | View / subject title |
| `surface-section` / `surface-section-label` / `surface-section-body` | Annotation section |
| `surface-heading` / `surface-template` | Heading / interpolated prose |
| `surface-block` / `surface-banner` / `surface-span` | Structural chrome |
| `surface-chrome-label` / `surface-chrome-text` | Text inside that chrome |
| `surface-group` / `surface-group-header` | Optional object presence |
| `surface-array` / `surface-array-list` / `surface-array-item` | Default array (list) |
| `surface-union` / `surface-select` | oneOf / anyOf |
| `surface-all-of` | allOf stack |
| `surface-form` / `surface-form-actions` / `surface-form-errors` | Root Save/Reset shell |
| `surface-checkbox` | Boolean row |
| `surface-scalar-list` | Comma-separated scalar array display |

### Widgets (add here when you add a widget)

| Class | Role |
| --- | --- |
| `surface-email-host` / `surface-email` | Email + `mailto:` |
| `surface-tel-host` / `surface-tel` / `surface-tel-row` / `surface-tel-input` / `surface-tel-country` | Tel + `tel:` + flag picker |
| `surface-uri-host` / `surface-uri` | URI + href |
| `surface-link-host` / `surface-link` / `surface-link-list` / `surface-link-item` | Link |
| `surface-copy-host` / `surface-copy-value` / `surface-copy-button` | Copy |
| `surface-media` / `surface-media--banner` / `surface-media-list` / `surface-media-item` / `surface-media-image` / `surface-media-player` | Media |
| `surface-money` / `surface-money-row` / `surface-money-symbol` / `surface-money-amount` / `surface-money-currency` / `surface-money-display` | Money `$id` |
| `surface-table-wrap` / `surface-table` / `surface-th` / `surface-td` / `surface-sort` | Array as table (display-only) |

New widget → new `surfaceClass` keys → paint in `surface.css`. Do not invent
ad-hoc class strings.

Data attributes the kit already stamps:

- `data-surface-layout` = `props` \| `stack`
- `data-surface-direction` = `vertical` \| `horizontal`

---

## Errors

Validity lives on the **data channel**, not in the widget.

1. AJV (or another `SurfaceValidator`) writes issues with JSON-pointer paths.
2. Adapter reads `useSurface().validity` + `formSubmitted`.
3. Show field issues when **Save failed** or the field was **changed and blurred**.
   (`visibleFieldIssues` in `channel-errors.ts`.)
4. First message goes under the control as `.surface-error` (`FieldError`).
5. Control gets `.surface-invalid`, `aria-invalid`, and `aria-describedby`
   pointing at `{controlId}-error`.
6. Root Save failures also land in `.surface-form-errors`.

A library (libphone) may **normalize** or refuse to write. It must not become
a second validator. If parse fails:

- leave the channel as the user’s string
- show a field error after blur (adapter maps “unparsed” to a message)
- Save still runs AJV; the schema pattern / format is the authority

Hidden / stealth `$kind` const fields seed the channel and stay out of the UI.

---

## Tokens (`surface.css`)

The designer owns this list. Implementers do not add tokens. Override on
`:root` or a host wrapper:

```css
--surface-text
--surface-muted
--surface-faint
--surface-border
--surface-border-soft
--surface-field-bg
--surface-panel-2
--surface-accent
--surface-accent-soft
--surface-danger
--surface-radius
--surface-font
--surface-mono
--surface-field-gap
--surface-prop-column-gap
```

Do not style the page. Do not box `.surface-slot`. Prefer painting
`.surface-field` and `.surface-control`.

---

## Libraries

Allowed when the browser cannot do the job well. Keep them inside the widget.

| Job | Library | Wire value |
| --- | --- | --- |
| Phone parse / national format / E.164 | `libphonenumber-js` | E.164 string (`+14155550100`) |
| Money minor ↔ major | `currency.js` | `{ amount, currency }` (ISO minor units) |
| Date / number / money display | `Intl` | RFC 3339 string / JSON number / money object |
| Copy | `navigator.clipboard` | unchanged |

Do not add a component framework. Do not add a date-picker package unless
native `input type="date"` / `time` / `datetime-local` is proven insufficient.

---

## Catalog

### Schema defaults (no annotation)

| Schema | Input | Display |
| --- | --- | --- |
| `string` | `<input type="text">` | text |
| `string` + `format: date` | `type="date"` | `Intl` date |
| `string` + `format: time` | `type="time"` | raw / text |
| `string` + `format: date-time` | `type="datetime-local"` via `widget:datetime`; format key still `date-time` | text |
| `string` + `format: email` / `idn-email` | `type="email"` | `mailto:` |
| `string` + `format: uri` / `uri-reference` / `iri` / `iri-reference` | `type="url"` | `<a>` |
| `string` + `format: uuid` | text | text |
| `integer` | `type="number"` step 1 | `Intl.NumberFormat` |
| `number` | `type="number"` | `Intl.NumberFormat` |
| `boolean` | checkbox | `"true"` / `"false"` |
| `null` | nothing | empty |
| `enum` | `<select>` | chosen label |
| `const` | hidden / read-only | fixed value or omit |
| `$id` money | amount + currency; `currency.js` | `Intl` currency string |
| `$id` phone | `type="tel"` + libphone; E.164 on write | `tel:` link, locale format |

Low-traffic formats (`duration`, `hostname`, `ipv4`, `ipv6`, `regex`,
`json-pointer`, `uri-template`) stay as text until a real subject needs them.

### `$id` widgets (no annotation)

These win because the subject schema is that `$id` (including `$ref` to it).
Same idea as `format: email`: the type is already named.

| `$id` | Library | Wire | Out of the box |
| --- | --- | --- | --- |
| `…/pragmatic/schemas/money` | `currency.js` + `Intl` | `{ amount: integer, currency: ISO 4217 }` | Amount in major units; currency select. If the schema `const`s / `enum`s `currency`, lock it. Display is a formatted money string. |
| `…/contact.scalars#/$defs/phone` | `libphonenumber-js` | E.164 string | Input: flag typeahead + national draft. Display: `tel:` link formatted for the viewer locale. |

Optional annotation on a money field is decoration only (`currencyDisplay`,
`defaultCurrency`). It must not be required for the control to appear.

### Annotation widgets (same wire type, different skin)

| `widget.name` | Binds to | Native stand-in |
| --- | --- | --- |
| `input` | string | text / password / search via `type` |
| `textarea` | string | `<textarea>` |
| `password` | string | `type="password"`; mask in display |
| `email` | string | already shipped |
| `tel` | string | flag typeahead + `type="tel"`; E.164 on blur |
| `date` / `datetime` | string | native date / datetime-local |
| `time` | string | `type="time"` |
| `uri` / `link` | string or object | `link` already shipped |
| `copy` | string | already shipped |
| `slider` | number / integer | `type="range"` |
| `progress` | number / integer | `<progress>` (mostly display) |
| `switch` | boolean | checkbox + `role="switch"` |
| `radio` | enum | radio group |
| `color` | string | `type="color"` |
| `rate` | integer | radio group |
| `media` | string / object / array | already shipped |
| `table` | **array** of objects | display-only `<table>`; sortable columns |
| `money` | money object | optional skin; `$id` already dispatched the control |

---

## Table widget (arrays)

Put `widget: { "name": "table" }` on the **array field**, not on each item.

```json
{
  "name": "contacts",
  "widget": {
    "name": "table",
    "$kind": "https://resources.rusl.com/resources/surface/schemas/default-kit#/$defs/table",
    "columns": [
      { "field": "name", "label": "Name", "sortable": true, "fontWeight": 600 },
      { "field": "title", "label": "Title", "sortable": true, "align": "right" }
    ],
    "sort": { "field": "name", "direction": "asc" }
  }
}
```

Rules:

- Items must be objects (or `$ref` to an object). Scalar arrays stay the
  comma-separated / list renderer unless a later skin says otherwise.
- Omitted `columns` → item schema `properties` order.
- Each **cell** is a child `Surface` for that property. Cell widgets
  (email, money, tel) still run. The table does not reimplement types.
- **Sort** reorders **display** only. Wire order stays index order.
- Display-only. Input falls through to the list array. Cells mount
  `labels={false}` so the column header owns the name.
- Classes: `surface-table-wrap` > `table.surface-table` > `th.surface-th` /
  `td.surface-td`. Sortable headers use `button.surface-sort`.

This is how Ant Table / shad Data Table map onto us: HTML `<table>`, not a
grid framework.

---

## Adding a widget (checklist)

1. If the kind needs params, add a `$defs` entry in
   `schemas/default-kit.schema.json` (schema steward must accept this).
2. Register `key` + `mode` in `createHtmlKit` (`$kind` URI and short name).
3. Adapter uses FieldChrome + channel errors; widget is presentational.
4. Land `surfaceClass` keys and `surface.css` with the widget. Keep the
   look on the shared sheet.
5. Tests: unit the library helper; mount test input + display; annotation
   `widget.name` wins; `format:` wins when the name matches a spec format.
6. Do not change `docs/annotation-format.schema.json` for a new kit kind.
   The envelope is already open.
