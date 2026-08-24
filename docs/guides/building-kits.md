# Building kits

A kit is a collection of React components. Surface uses a kit to render each part of your schema. You can replace any component in the kit with your own.

The shipped kit is `@rusl-labs/surface-html`. It renders plain HTML inputs, selects, and checkboxes. This guide covers how to override parts of it — or build a kit from scratch for your design system.

**Before you start:** you have read the [root README](../../README.md) and [`@rusl-labs/surface`](../../packages/core/README.md). You have a working Surface mount.

---

## Register one renderer on an `$id`

Start here. You want to replace one view for one schema type. Register your component on the schema `$id` + `mode` + `view`. Every mount of that triple uses your component.

```tsx
const PERSON_ID = "https://rusl.com/example/schemas/person";

const kit = createHtmlKit({
  resolvers: [
    { key: PERSON_ID, mode: "display", view: "card", component: PersonCard },
    { key: PERSON_ID, mode: "display", view: "identity", component: PersonIdentity },
  ],
});

<Surface id={PERSON_ID} data={user} mode="display" view="card" />
<Surface id={PERSON_ID} data={user} mode="display" view="identity" />
```

Swap `view` to swap the renderer. The kit now uses your components for those triples. Everything else stays default.

A `$id` registration outranks widgets and types. A node you register this way always gets your component.

---

## Registry

The kit contract is `SurfaceKit`:

```ts
interface SurfaceKit {
  resolveRenderer(request: RendererRequest): SurfaceRenderer | undefined;
  readonly fallback: SurfaceRenderer;
  readonly Root?: SurfaceRoot;
}
```

You rarely implement `resolveRenderer` by hand. The shipped path is `createRegistryKit`:

```ts
import { createRegistryKit } from "@rusl-labs/surface";
import { createHtmlKit } from "@rusl-labs/surface-html";

const kit = createHtmlKit({
  resolvers: [
    { key: PERSON_ID, mode: "display", view: "card", component: PersonCard },
  ],
});

// Or build from scratch:
const customKit = createRegistryKit({
  fallback: () => null,
  resolvers: [/* ... */],
  Root: MyFormShell,
});
```

`createHtmlKit({ resolvers })` appends your entries after the built-in structural defaults. For a given key, **last registration wins**.

### Entry shape

```ts
type RegistryEntry =
  | { key?: string; mode?: SurfaceMode; view?: SurfaceViewName;
      component: SurfaceRenderer }
  | { key?: string; mode?: SurfaceMode; view?: SurfaceViewName;
      resolve: (request: RendererRequest) => SurfaceRenderer | null };
```

| Field | What it matches |
| --- | --- |
| `key` | A candidate key. **Omit** for a key-less catch-all. Catch-alls run *before* keyed lookup, in list order. |
| `mode` | `"input"` or `"display"`. Omit for both. |
| `view` | View name. Omit for all views. A non-default view falls back to a `view: "default"` entry when one exists. |
| `component` | Always use this renderer. |
| `resolve` | Return a renderer, or `null` to keep falling through. Use when the choice depends on app state. |

Never set both `component` and `resolve`. They are sibling fields — pick one.

```ts
// resolve: pick a renderer from app state
kit.set({
  key: PERSON_ID,
  resolve: () => (plan === "pro" ? ProEditor : null),
});
```

Returning `null` means "not me." The next key or entry continues.

### `set` after init

```ts
kit.set(PERSON_ID, "display", "card", PersonCard);
kit.set({ key: PERSON_ID, mode: "display", view: "card", component: PersonCard });
```

---

## Candidate keys

For each schema node, Surface builds `request.keys` — most specific first. The registry takes the **first key that has a matching entry**.

```text
schema $id
  → subject-root coordinate   (<uri> or <uri>#/$defs/<name>)
  → widget.$kind              (full kind URI)
  → widget:<name> → <name>   (annotation entry.widget.name)
  → format:<name> → <name>   (schema.format)
  → const | enum              (when present)
  → type                      (string, number, object, …)
  → combinators               (oneOf, anyOf, allOf when present)
```

Namespaced keys try the full key first, then the bare name. One registration can serve both:

| You register | Also matches |
| --- | --- |
| `email` | `widget:email`, `format:email` |
| `format:date-time` | only the namespaced form |
| a schema `$id` | that subject only |

### Walkthrough: JSON Schema date-time

Schema: `{ type: "string", format: "date-time" }`. The HTML kit registers `datetime` and aliases `date-time` → `datetime`. Chain:

```text
format:date-time → date-time → string
```

An explicit registration for `date-time` or `format:date-time` wins over the alias.

### Walkthrough: annotation widget

Annotation: `{ widget: { name: "email" } }`. Chain:

```text
widget:email → email → format:email → email → string
```

Register once: `{ key: "email", mode: "input", component: EmailInput }`. It matches both `widget:email` and `format:email`.

### Enum before string

`{ type: "string", enum: [...] }` hits `enum` (select) before `string` (text field).

---

## Aliases

Short names are registered once: `tel`, `email`, `datetime`, `uri`, `table` (display-only). `MONEY_ID` is a direct `$id` registration, not an alias.

`createRegistryKit({ aliases })` and `createHtmlKit({ aliases })` add one extra lookup hop. `date-time` → `datetime` means a miss on `date-time` retries `datetime`. One hop only. An explicit registration for the alias key still wins over the alias target.

Host aliases merge `{ ...HTML_KIT_ALIASES, ...user }`. Host wins.

```ts
createHtmlKit({ aliases: { "x-phone": "tel" } });
```

Shipped `HTML_KIT_ALIASES`:

- default-kit `$kind` URIs → the short name
- `PHONE_ID` → `tel`
- well-known formats: `date-time` → `datetime`, `idn-email` → `email`, `uri-reference` / `iri` / `iri-reference` → `uri`

`PHONE_ID` is `https://resources.rusl.com/resources/pragmatic/schemas/contact.scalars#/$defs/phone` (no slash before `#`). It is a map key only. The kit does not vendor that subject schema.

---

## Writing a renderer

Renderers are React components. They receive `SurfaceProps` and call `useSurface()` for context.

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
  const { dataApi } = useSurface();
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

### The data channel

- `dataApi.setData(next)` — replace this node's value.
- `dataApi.setChild(key, next)` — write one object property or array index.
- Commit through the channel. Do not keep a parallel local source of truth.
- Local UI state (draft text while typing) is fine. Commit through `setData`.

Wire formats belong on the channel: money in minor units, dates as RFC 3339. Control value can differ — convert at the boundary.

### Validity

- Issues are projected to this node's path automatically.
- Leaf chrome usually reads issues at `[]` relative to the field: `issuesAt(validity.issues, [])`.
- When to show errors (dirty after blur, after failed Save) is kit policy. The HTML kit shows errors after form submission **or** after change + blur.

### Recursion

If a property is an object, `$ref`, array item, or union arm — mount a child `Surface`. Do not resolve `$ref` and build a parallel form tree inside your renderer.

```tsx
<Surface id={childId} schema={propSchema} data={childData} />
```

### Object layout

Structural object renderers should call `helpers.fields()`. This honors annotations for field order, sections, `hidden` / `omit`, labels, and views:

```tsx
for (const item of helpers.fields()) {
  if (item.kind === "section") {
    // render chrome, then recurse children
  }
  if (item.kind === "field") {
    <Surface {...item.surface} />
  }
}
```

Helpers are opt-in. A kit that ignores them still renders. It just does not honor annotations.

`helpers.layout()` returns `"props"` (default) or `"stack"`. `helpers.direction()` returns `"vertical"` (default) or `"horizontal"`. The HTML kit stamps `data-surface-layout`, `data-surface-direction`, and classes `surface-layout-*` / `surface-direction-*`.

---

## Root shell (`kit.Root`)

When `kit.Root` is set, the engine wraps **only the root** body's renderer as `children` (`isRoot` flag). The HTML kit uses this for a `div.surface-form` (`role="group"`) with Reset and Save buttons. Not a native `<form>` submit.

Save should:

1. Call `validator.validate({ id, schema, data, schemaResolver })`
2. Call Surface `onSubmit({ data })` only if valid

The HTML kit also deep-applies schema `const` (forced) and `default` (when missing) before validate.

```ts
createHtmlKit({ form: { saveLabel: "Save invoice", resetLabel: "Discard" } });
```

---

## HTML kit built-in defaults

| Key | What it renders |
| --- | --- |
| `string` | Text input / display (format fallbacks still apply) |
| `email` | Email input / `mailto:` |
| `uri` | URL input / href |
| `tel` | National draft + E.164 / locale `tel:` |
| `datetime` | `datetime-local` ↔ RFC 3339 |
| `date` | Native date |
| `table` | Display-only object-array table |
| `enum` | `<select>` |
| `number` / `integer` | Number input |
| `boolean` | Checkbox |
| `const` | Read-only fixed value |
| `object` | `helpers.fields()` layout |
| `array` | List with add/remove |
| `allOf` | Branches over same data |
| `oneOf` / `anyOf` | Variant select / matched branch |
| `MONEY_ID` | Amount + currency |
| fallback | Nothing |

---

## Common patterns

**1. Design-system field for a format**

```ts
{ key: "format:date-time", mode: "input", component: DsDateTimePicker }
```

**2. Domain type by `$id`**

```ts
{ key: PERSON_ID, mode: "display", view: "card", component: PersonCard }
```

**3. Annotation-chosen widget**

```ts
{ key: "email", mode: "input", component: EmailInput }
```

Pair with `{ widget: { name: "email" } }` on the annotation entry.

**4. Plan-gated editor**

```ts
{ key: PERSON_ID, resolve: () => (flags.richContact ? RichCard : null) }
```

**5. View-specific chrome**

```ts
{ key: PERSON_ID, mode: "display", view: "card", component: CompactCard }
// view "profile" falls back to a view "default" entry if registered
```

---

## Degradation

| Situation | What happens |
| --- | --- |
| No annotation | Schema property order, kit type defaults |
| Unknown view | Falls through to `default`, then kit defaults |
| Unknown widget name | Next candidate key (usually the type default) |
| Resolver returns `null` | Continues falling through the chain |
| No registry hit | `kit.fallback` |

Surface does not restrict which widget you pair with which type. Bad pairings degrade. They do not crash.

---

## Checklist for a new override

1. Pick the right key: `$id` for a whole type, `format:…` for a JSON Schema format, `widget:…` / bare name for annotation-driven choice.
2. Register input and display if both modes matter.
3. Put wire format on the channel. Convert for the control if needed.
4. Use `dataApi`. Do not use a shadow form state.
5. Nest `Surface` for structured children.
6. Use `helpers` if you care about annotations on that node.
7. Show validity with the kit's dirty policy. Do not invent a second issue path.
8. Test in the playground: `bun run playground`.

## Related

| Resource | Why |
| --- | --- |
| [`@rusl-labs/surface`](../../packages/core/README.md) | Core API: resolver, views, registry |
| [`@rusl-labs/surface-html`](../../packages/html/README.md) | HTML kit config, aliases, CSS, Root |
| [Implementation status](../implementation.md) | What the runtime does today |
| [Annotations](../annotation.md) | Annotation model |
| [HTML kit DESIGN.md](../../packages/html/DESIGN.md) | Look, class list, widget contract |
| `packages/core/src/lookups.ts` | Authoritative `candidateKeys` order |
| `packages/core/src/kit.ts` | Authoritative registry resolution |
