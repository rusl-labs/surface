# Surface

Surface turns a JSON Schema into a working React UI. You give it a schema and some data. It gives you a form or a display.

Define how a type presents once — how it reads (`display`) and how it edits (`input`). Every place your app shows it — list row, card, detail page, edit form — renders it the same way.

```tsx
<Surface id={schema.$id} data={data} mode="display" view="card" />
```

**One component. Any typed data.** An invoice, a contact card, a product page, a settings form — same component, different schema. Nested objects, `$ref` across documents, and `$defs` resolve automatically. One mount renders the whole graph.

## Why Surface

Your app shows the same types in many places: rows in lists, cards on dashboards, detail pages, edit forms. Built by hand, each one drifts — different labels, different formatting, different behavior. Surface ties presentation to the schema, so every place that shows a Contact shows the same Contact.

- **Describe data once.** JSON Schema stays your single source of truth. Surface renders the UI from it. No per-type form components. No syncing schema changes into UI code.
- **Present consistently.** Presentation has two axes: `mode` — `display` for reading, `input` for editing — and `view` — `row`, `card`, `identity`, or your own. Define both once per schema; every mount reuses them.
- **Tweak presentation without code.** Annotations are JSON documents. They reorder fields, hide fields, add sections, or name widgets.
- **Generate as much or as little as you want.** Register your own components for anything — or nothing. Schemas you have not touched keep the generated UI. Take over one field at a time.

### Tweak presentation without code

Annotations are JSON documents. They reorder fields, hide fields, add sections, or name widgets — without a custom component.

```json
{
  "subject": "https://example.com/contact",
  "views": {
    "default": {
      "fields": [
        { "name": "name" },
        { "label": "Details", "fields": [{ "name": "email" }, { "name": "website" }] }
      ]
    }
  }
}
```

### Bring your own components

Generated UI is a default, not a cage. Register your own component for a schema, a type, a format, or a widget name — per mode and view. Hand-build everything, or leave schemas you have not touched on the generated UI. As much or as little as you want.

```tsx
const kit = createHtmlKit({
  resolvers: [
    { key: PERSON_ID, mode: "display", view: "card", component: PersonCard },
  ],
});

<Surface id={PERSON_ID} data={user} mode="display" view="card" />
```

Surface works with any JSON Schema. It follows `$ref` across documents and `$defs` inside them. A composed schema graph renders as one tree.

## 30-second example

```bash
npm install @rusl-labs/surface @rusl-labs/surface-html @rusl-labs/surface-ajv ajv ajv-formats react
```

```tsx
import { useState } from "react";
import { createSurfaceUi, InMemorySchemaFetchResolver } from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { createHtmlKit } from "@rusl-labs/surface-html";
import "@rusl-labs/surface-html/surface.css";

// Describe your data once — with JSON Schema
const schema = {
  $id: "https://example.com/contact",
  type: "object",
  required: ["name", "email"],
  properties: {
    name: { type: "string" },
    email: { type: "string", format: "email" },
  },
};

// Wire it up once
const { Surface } = createSurfaceUi({
  schemaResolver: new InMemorySchemaFetchResolver({ [schema.$id]: schema }),
  validator: createAjvValidator(),
  kit: createHtmlKit(),
});

// Render anywhere
function App() {
  const [data, setData] = useState({ name: "", email: "" });
  return <Surface id={schema.$id} data={data} onChange={setData} />;
}
```

This renders a validated form with name and email fields. It validates on save. It calls `onSubmit` only when valid.

*This example defines the schema inline. You can also load schemas from an online registry like [rusl.com](https://rusl.com). Compile them in at build time or fetch them dynamically. Same `$id`, no inline definition needed.*

### One schema, many surfaces

Three mounts of one component. Each view is defined once — in an annotation or a registered component — then reused everywhere:

```tsx
// Row in a list
<Surface id={CONTACT_ID} data={contact} mode="display" view="row" />

// Card on a dashboard
<Surface id={CONTACT_ID} data={contact} mode="display" view="card" />

// Edit form on a detail page
<Surface id={CONTACT_ID} data={contact} />
```

Same schema, same validation, same behavior. `view` changes the layout. `mode` flips read ↔ write. Only presentation differs — and all of it is defined once.

## What you get

| Capability | How |
| --- | --- |
| **Forms from schemas** | Pass a schema `$id` — Surface walks the schema and renders inputs for every field |
| **Display views** | Switch `mode="display"` to render read-only views of the same data |
| **Multiple views per type** | `view="card"`, `view="identity"`, `view="row"`, or your own — same data, different presentation |
| **Field-level overrides** | Replace any field's renderer with your own component — register by `$id`, type, format, or widget name |
| **Composed schemas** | `$ref` across documents and `$defs` work automatically — one mount renders the whole graph |
| **Annotations for tweaks** | Change field order, hide fields, name widgets — without writing a custom renderer |
| **CSS theming** | Opt-in stylesheet with CSS custom properties — theme with `--surface-*` variables |

## What Surface is not

- **Not a form library.** Form generators stop at inputs. Surface renders read views from the same schema that renders the edit form — one source of truth for both.
- **Not a design system.** The default HTML kit is plain, unstyled HTML. You bring your own look.
- **Not tied to one validator.** This repo ships an AJV adapter. You can write your own.
- **Not tied to the DOM.** The kit contract supports React Native (future).

## Modes and views

| Prop | What it does |
| --- | --- |
| `id` | Schema `$id` to render (required) |
| `data` / `onChange` | Controlled value. Omit `onChange` for an internal draft. |
| `mode` | `"input"` (default) — editable form. `"display"` — read-only view. |
| `view` | Which presentation. `"default"`, `"card"`, `"row"`, `"identity"`, or your own string. |
| `onSubmit` | Called after a successful save — receives `{ data }` |

```tsx
<Surface id={schema.$id} data={data} onChange={setData} onSubmit={save} />
<Surface id={schema.$id} data={data} mode="display" />
<Surface id={schema.$id} data={data} mode="display" view="card" />
```

## Override any renderer

Register your own component for a schema, a type, a format, or an annotation-chosen widget. The kit resolves the most specific match.

```tsx
const kit = createHtmlKit({
  resolvers: [
    // By schema $id — your component for the whole type
    { key: PERSON_ID, mode: "display", view: "card", component: PersonCard },
    // By format — your date picker for all date-time fields
    { key: "format:date-time", mode: "input", component: MyDatePicker },
    // By widget name — paired with an annotation
    { key: "email", mode: "input", component: EmailInput },
  ],
});
```

The resolution order: schema `$id` → widget kind → widget name → format → const/enum → type. Most specific wins. No match falls back to the kit default.

## How it works

1. **Schema resolver** — loads schemas by `$id`. `InMemorySchemaFetchResolver` serves seeded documents and fetches unknown ones.
2. **Validator** — validates data before submit. The AJV adapter is the recommended one.
3. **Kit** — supplies renderers for each schema node. The HTML kit ships with defaults for every JSON Schema type plus widgets like email, tel, datetime, money, and table.
4. **Annotations (optional)** — JSON documents that set field order, hide fields, name widgets, or define views. Without annotations, Surface uses schema property order and kit defaults.

## Packages

| Package | What it does |
| --- | --- |
| [`@rusl-labs/surface`](packages/core/README.md) | Core — `Surface` component, schema resolver, kit registry, data channel |
| [`@rusl-labs/surface-html`](packages/html/README.md) | HTML kit — renderers for every JSON Schema type, widgets, opt-in CSS |
| [`@rusl-labs/surface-ajv`](packages/ajv/README.md) | AJV adapter — validates data against the schema |

## Next steps

| You want to | Read |
| --- | --- |
| Understand the core in depth | [`@rusl-labs/surface`](packages/core/README.md) |
| Configure the HTML kit | [`@rusl-labs/surface-html`](packages/html/README.md) |
| Write your own renderers | [Building kits](docs/guides/building-kits.md) |
| Tweak presentation without code | [Annotations](docs/annotation.md) |
| See what ships today | [Implementation status](docs/implementation.md) |

## Run locally

```bash
bun run check        # type-check, lint, test
bun run playground   # interactive schema browser (PORT=3001 optional)
```
