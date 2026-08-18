# Building kits

How to take over presentation: register components, win the right node, and
stay out of core’s job.

**Audience.** App authors extending `@rusl-labs/surface-html`, and kit authors
building a design-system kit from the registry. For “what ships,” see
[`implementation.md`](../implementation.md). For annotation layout (order,
sections, labels, widgets), see [`annotation.md`](../annotation.md).

---

## Mental model

Three layers, one job each:

| Layer | Owns |
| --- | --- |
| **Schema** | Shape and validation |
| **Annotation** | Presentation *decisions* (order, labels, hide, widget name, views) |
| **Kit** | Presentation *implementation* (DOM, chrome, widgets, form shell) |

Surface’s loop is the same at every node:

1. Resolve schema (+ optional annotation entry).
2. Compute **candidate keys** (most specific first).
3. Ask the kit for a renderer.
4. Render. Nested structure mounts child **`Surface`s** — the kit never
   re-implements schema walk ahead of the engine.

If the kit ignores annotations entirely, forms still work (schema-default
layout). Helpers make annotation behavior free when you adopt them.

---

## Kit contract vs registry

Required contract (`SurfaceKit`):

```ts
interface SurfaceKit {
  resolveRenderer(request: RendererRequest): SurfaceRenderer | undefined;
  readonly fallback: SurfaceRenderer;
  readonly Root?: SurfaceRoot; // optional shell around the root body
}
```

You rarely implement `resolveRenderer` by hand. The shipped path is a
**registry kit**:

```ts
import { createRegistryKit } from "@rusl-labs/surface";
import { createHtmlKit } from "@rusl-labs/surface-html";

// Extend the HTML kit (usual app path)
const kit = createHtmlKit({
  resolvers: [
    { key: MONEY_ID, mode: "input", component: MoneyInput },
    { key: MONEY_ID, mode: "display", component: MoneyDisplay },
  ],
});

// Or build a kit from scratch
const kit = createRegistryKit({
  fallback: () => null,
  resolvers: [/* ... */],
  Root: MyFormShell, // optional
});
```

`createHtmlKit({ resolvers })` **appends** your entries after the structural
defaults. For a given key, **last registration wins**. You can also
`kit.set(...)` after construction.

`createHtmlKit({ aliases })` adds extra lookup keys that reuse a registered
name. Host aliases override the shipped ones (`date-time` → `datetime`,
`idn-email` → `email`, the phone `$id` → `tel`, widget `$kind` URIs → short
names). One hop only; an explicit registration for the alias key still wins.

---

## Candidate keys (the resolution chain)

For each node, core builds `request.keys` — most specific first — then the
registry takes the **first key that has a matching entry**.

Order (see `candidateKeys` in core):

```text
schema $id
  → subject-root coordinate         // `<uri>` or `<uri>#/$defs/<name>`
  → widget.$kind                    // full kind URI
  → widget:<name> → <name>          // annotation entry.widget.name
  → format:<name> → <name>          // schema.format
  → const | enum                    // when present
  → type                            // string, number, object, …
  → combinators                     // oneOf, anyOf, allOf when present
```

Namespaced keys always try the full key first, then the bare name, so one
registration can serve both:

| You register | Also matches |
| --- | --- |
| `email` | `widget:email`, `format:email` |
| `format:date-time` | only the namespaced form (more precise) |
| full schema `$id` | that subject only |

### Worked examples

**Default string** — no annotation, no special format:

```text
string → … → StringInput
```

**JSON Schema date-time** — HTML kit maps this inside `StringInput` today
(`datetime-local` + ISO on the wire). You could instead take over:

```ts
createHtmlKit({
  resolvers: [
    { key: "format:date-time", mode: "input", component: DateTimeInput },
    { key: "format:date-time", mode: "display", component: DateTimeDisplay },
  ],
});
```

Chain for `{ type: "string", format: "date-time" }`:

```text
format:date-time → date-time → string
```

Your entry wins before structural `string`.

**Annotation widget** — entry `{ "name": "email", "widget": { "name": "email" } }`:

```text
widget:email → email → format:email → email → string
```

Register once:

```ts
{ key: "email", mode: "input", component: EmailInput }
```

**View / section structure** — two small enums for nice, minimal UIs:

| Key | Values | Meaning |
| --- | --- | --- |
| `layout` | `props` (default), `stack` | Field chrome: label\|value rows vs full-width blocks |
| `direction` | `vertical` (default), `horizontal` | Body flex axis (row wraps) |

```json
{
  "layout": "stack",
  "direction": "vertical",
  "fields": [
    { "name": "images", "label": null, "display": { "widget": { "name": "media", "layout": "banner" } } },
    {
      "label": "",
      "layout": "props",
      "fields": [
        { "name": "name", "label": "Title" },
        { "name": "status" }
      ]
    }
  ]
}
```

Kit stamps `data-surface-layout`, `data-surface-direction`, and classes
`surface-layout-*` / `surface-direction-*` for CSS. Empty section `label` =
anonymous group (layout only).

**Widget envelope** — open object; `$kind` types the **whole** widget:

```json
{
  "name": "media",
  "$kind": "https://resources.rusl.com/resources/surface/schemas/default-kit#/$defs/media",
  "src": "url",
  "alt": "alt",
  "maxHeight": 160
}
```

- Core: `name` required; `$kind?`; `options?`; **additionalProperties: true**
- Candidate keys: schema `$id` → **`widget.$kind`** → `widget:<name>` → name → format → type…
- Default kit vocabulary (vendored): `packages/html/schemas/default-kit.schema.json`
  (`#/$defs/input`, `date`, `datetime`, `media`, `link`, `email`, `tel`, `copy`, `table`, `optionExpr`)
- Look, class list, error policy, adapter/widget split: [`packages/html/DESIGN.md`](../../packages/html/DESIGN.md)
- Mode (input vs display) = Surface mode + kit registry, not separate kinds

**Grab-bag (no `$kind`):**

```json
{ "name": "input", "type": "password", "autocomplete": "current-password" }
```

**Media / link / email / tel / copy** (flat params on widget; nested `options` also allowed):

```json
{
  "name": "externalReferences",
  "display": {
    "widget": {
      "name": "link",
      "$kind": "https://resources.rusl.com/resources/surface/schemas/default-kit#/$defs/link",
      "href": "url",
      "text": "label"
    }
  }
}
```

```json
{ "name": "email", "widget": { "name": "email" } }
```

```json
{ "name": "phone", "widget": { "name": "tel", "defaultCountry": "GB" } }
```

```json
{ "name": "sku", "widget": { "name": "copy", "buttonLabel": "Copy SKU" } }
```

- **email** display → `<a href="mailto:…">`
- **tel** / **phone `$id`** (`contact.scalars#/$defs/phone`) input → joined
  flag typeahead + messy national text; E.164 on the channel after blur.
  Display → `tel:` link, national when the number is in the viewer locale
  region, else international. Field `defaultCountry` / `countries` /
  `showCountry` override `createHtmlKit({ tel })`.
- **copy** → value + clipboard button

**Option expressions** (kit helper) — path | template | literal for map slots.

**Schema `$id` widget** (money in the default HTML kit) — outranks widget
and type. A `$ref` to the money schema gets the control with no
annotation; `currency.js` keeps minor units on the wire (same idea as
libphone on tel). Optional `widget` keys are decoration only:

```ts
import { MONEY_ID, createHtmlKit } from "@rusl-labs/surface-html";

createHtmlKit(); // registers MoneyInput/Display on MONEY_ID by default
// keys: <MONEY_ID> → object → …  → MoneyInput wins
```

Nothing an annotation says can steal a node your app claimed by `$id`. That
is intentional.

**Enum before string** — `{ type: "string", enum: [...] }` hits `enum`
(select) before the text field.

---

## Registry entries

```ts
type RegistryEntry =
  | { key?: string; mode?: SurfaceMode; view?: SurfaceViewName;
      component: SurfaceRenderer }
  | { key?: string; mode?: SurfaceMode; view?: SurfaceViewName;
      resolve: (request: RendererRequest) => SurfaceRenderer | null };
```

| Field | Meaning |
| --- | --- |
| `key` | Match a candidate key. **Omit** = key-less catch-all (runs *before* keyed lookup, list order). |
| `mode` | `"input"` / `"display"`. Omit = both. |
| `view` | Annotation view name. Omit = all views; non-default views fall back to a `view: "default"` entry when present. |
| `component` | Always this renderer. |
| `resolve` | Return a component, or `null` to keep falling through. |

`component` and `resolve` are **sibling fields — never both**. Use `resolve`
when the choice depends on app state:

```ts
kit.set({
  key: CONTACT_ID,
  resolve: (req) => (plan === "pro" ? ProEditor : null),
});
```

Returning `null` is “not me”; the next key or entry continues.

### `set` after init

```ts
kit.set("widget:email", "input", "default", EmailInput);
// same as
kit.set({
  key: "widget:email",
  mode: "input",
  view: "default",
  component: EmailInput,
});
```

---

## Writing a field renderer

Renderers are ordinary React components with `SurfaceProps`
(`id`, `data`, `mode`, `view`, …). Context is via **`useSurface()`**:

```tsx
import {
  useSurface,
  type SurfaceProps,
  type SurfaceRenderer,
} from "@rusl-labs/surface";
import { FieldChrome, surfaceClass } from "@rusl-labs/surface-html";

export const EmailInput: SurfaceRenderer = function EmailInput({
  data,
}: SurfaceProps) {
  const { dataApi, validity, helpers } = useSurface();
  const value = typeof data === "string" ? data : "";

  return (
    <FieldChrome>
      <input
        type="email"
        className={surfaceClass.control}
        value={value}
        onInput={(e) => dataApi?.setData(e.currentTarget.value)}
      />
    </FieldChrome>
  );
};
```

### Data channel

- **`dataApi.setData(next)`** — replace this node’s value.
- **`dataApi.setChild(key, next)`** — write one object property / array index.
- Prefer the channel over inventing parallel local “source of truth.” Local
  UI state (draft text while typing) is fine; **commit** through `setData`.

Wire formats belong on the channel (e.g. money minor units, RFC 3339 for
`date-time`). Control value can differ; convert at the boundary.

### Validity

- Issues are projected to **this node’s path**.
- Leaf chrome usually reads issues at `[]` relative to the field
  (`issuesAt(validity.issues, [])` or kit helpers).
- **When** to show errors (dirty after blur, after failed Save) is kit policy.
  The HTML kit does form-submitted **or** change+blur.

### Recursion rule

If a property is an object, `$ref`, array item, or union arm — mount a
**child `Surface`** (or use a kit structural renderer that does). Do not
resolve `$ref` and invent a parallel form tree inside your component.

```tsx
// Good: let Surface re-enter the loop
<Surface id={childId} schema={propSchema} data={childData} /* … */ />

// Bad: hand-walk properties of a nested object with custom markup only
```

### Object layout without reinventing annotation

Structural object renderers should call **`helpers.fields()`** so order,
sections, `hidden` / `omit`, labels, and views stay consistent:

```tsx
for (const item of helpers.fields()) {
  if (item.kind === "section") { /* chrome + recurse children */ }
  if (item.kind === "field") {
    <Surface {...item.surface} />  // bound bag from helpers
  }
  // heading, template, rest slot, …
}
```

Helpers are **opt-in**. A kit that ignores them still renders; it just will
not honor annotations.

---

## Root shell (`kit.Root`)

When `kit.Root` is set, the engine wraps **only the root** body’s renderer as
`children` (`isRoot`). The HTML kit uses this for a `div.surface-form` (`role="group"`) with
button Reset / Save on **any** root shape (object, allOf, custom `$id`, …).
Not a native `<form>` submit.

Save should:

1. `validator.validate({ id, schema, data, schemaResolver })`
2. Call Surface `onSubmit({ data })` **only if valid**

Annotations never own Save/Reset — that is kit or host chrome.

```ts
createHtmlKit({
  form: { saveLabel: "Save invoice", resetLabel: "Discard" },
});
```

---

## HTML kit defaults (baseline)

| Key | Role |
| --- | --- |
| `string` | Text / email / url / date / datetime-local / time from `format` |
| `enum` | `<select>` (before `string` when both apply) |
| `number` / `integer` | Number input |
| `boolean` | Checkbox |
| `const` | Read-only fixed value (`$kind` often hidden) |
| `object` | `helpers.fields()` layout; input has Add/Remove presence |
| `array` | List; input has add/remove |
| `allOf` | Branches over same data (both modes) |
| `oneOf` / `anyOf` | Variant select (input) / matched branch (display) |
| fallback | Renders nothing |

Stable CSS hooks: `surfaceClass` / `.surface-*` (see package README). Structure
is always in the kit; look is opt-in via `@rusl-labs/surface-html/surface.css`
(or your own rules on the same class names).

---

## Patterns that work well

**1. Design-system field for a format**

```ts
{ key: "format:date-time", mode: "input", component: DsDateTimePicker }
```

**2. Domain type by `$id`**

```ts
{ key: MONEY_ID, mode: "input", component: MoneyInput }
```

**3. Annotation-chosen widget**

```json
{ "name": "email", "widget": { "name": "email" } }
```

```ts
{ key: "email", mode: "input", component: EmailInput }
```

**4. Plan-gated editor**

```ts
{
  key: CONTACT_ID,
  resolve: () => (flags.richContact ? RichCard : null),
}
```

**5. View-specific chrome**

```ts
{ key: CONTACT_ID, mode: "display", view: "card", component: CompactCard }
// view "profile" falls back to view "default" entry if registered
```

---

## Degradation (what should never throw)

| Situation | Expected behavior |
| --- | --- |
| No annotation | Schema property order, kit type defaults |
| Unknown view | Fall through to `default`, then kit defaults |
| Unknown widget name | Next candidate key (usually the type default); keep labels from the entry |
| Resolver returns `null` | Keep falling through the chain |
| No registry hit | `kit.fallback` |

Core does not police “widget X on type Y.” Bad pairings degrade; they do not
crash the tree.

---

## Checklist for a new override

1. **Which key should win?** Prefer `$id` for a whole type, `format:…` for a
   JSON Schema format, `widget:…` / bare name for annotation-driven choice.
2. **Register input and display** if both modes matter.
3. **Wire format on the channel**; convert for the control if needed.
4. **Use `dataApi`**, not a shadow form state that never reaches Save.
5. **Nest `Surface`** for structured children.
6. **Adopt `helpers`** if you care about annotations on that node.
7. **Show validity** with kit dirty policy; do not invent a second issue path.
8. Smoke in the playground (`bun run playground`) against a real schema.

---

## Related

| Resource | Why |
| --- | --- |
| [`implementation.md`](../implementation.md) | What the runtime does today |
| [`annotation.md`](../annotation.md) | Annotation model |
| [`annotation-format.schema.json`](../annotation-format.schema.json) | Annotation JSON Schema |
| [`plan.md`](../plan.md) | Roadmap |
| `examples/playground/` | Live dogfood (product, contact, money, …) |
| `packages/html` | Structural defaults + CSS hooks |
| `packages/core/src/lookups.ts` | Authoritative `candidateKeys` order |
| `packages/core/src/kit.ts` | Authoritative registry resolution |
