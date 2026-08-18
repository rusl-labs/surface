# `@rusl-labs/surface`

Give Surface a JSON Schema and some data. It renders a working form or display.

```tsx
import { useState } from "react";
import {
  createSurfaceUi,
  InMemorySchemaFetchResolver,
} from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { createHtmlKit } from "@rusl-labs/surface-html";
import "@rusl-labs/surface-html/surface.css";

const contactId = "https://example.com/schemas/contact";

const contactSchema = {
  $id: contactId,
  type: "object",
  required: ["name", "email"],
  properties: {
    name: { type: "string" },
    email: { type: "string", format: "email" },
    notes: { type: "string" },
  },
};

const { Surface } = createSurfaceUi({
  schemaResolver: new InMemorySchemaFetchResolver({
    [contactId]: contactSchema,
  }),
  validator: createAjvValidator(),
  kit: createHtmlKit(),
});

export function ContactEditor() {
  const [data, setData] = useState({ name: "", email: "" });

  return (
    <Surface
      id={contactId}
      data={data}
      onChange={setData}
      onSubmit={({ data }) => console.log("saved", data)}
    />
  );
}
```

That is a labeled form with Save / Reset, validation, and nested schema walk — no hand-built field tree.

---

## What it is

Surface is a small React runtime for JSON Schema UIs.

| Layer | Owns |
| --- | --- |
| **Schema** | Shape and validation |
| **Annotation** (optional) | Presentation decisions — order, labels, views, widgets |
| **Kit** | DOM and look — HTML kit today, your design system tomorrow |

Core stays validator-agnostic. Pair it with `@rusl-labs/surface-ajv` and `@rusl-labs/surface-html` for the usual app path.

---

## Install

```bash
npm install @rusl-labs/surface @rusl-labs/surface-html @rusl-labs/surface-ajv ajv ajv-formats react
```

`ajv` and `ajv-formats` are peers of the AJV adapter. You own those versions.

---

## Get started

### 1. Create a Surface

```tsx
const { Surface } = createSurfaceUi({
  schemaResolver, // loads schemas by $id / URI
  validator,      // required — createAjvValidator() or your own
  kit: createHtmlKit(),
});
```

### 2. Mount it

```tsx
{/* Edit */}
<Surface id={schemaId} data={draft} onChange={setDraft} onSubmit={persist} />

{/* Read */}
<Surface id={schemaId} data={record} mode="display" />

{/* Dense list row */}
<Surface id={schemaId} data={record} mode="display" view="row" />
```

| Prop | Role |
| --- | --- |
| `id` | Schema `$id` (required) |
| `data` / `onChange` | Controlled value. Omit `onChange` for an internal draft. |
| `mode` | `"input"` (default) or `"display"` |
| `view` | Annotation view name. Default `"default"`. |
| `onSubmit` | After a successful Save validation only |

Schemas can come from an in-memory map, `fetch`, or any `SchemaResolver`. Pass `schema` / `document` inline when you already have the document.

### 3. Optional: annotate presentation

Without an annotation, Surface walks the schema property order. Add a plain JSON annotation when you want labels, field order, sections, or named views (`card`, `row`, …).

```tsx
import {
  createSurfaceUi,
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
} from "@rusl-labs/surface";

const { Surface } = createSurfaceUi({
  schemaResolver: new InMemorySchemaFetchResolver({ [contactId]: contactSchema }),
  annotationResolver: new InMemoryAnnotationResolver({
    [contactId]: {
      subject: contactId,
      views: {
        default: {
          label: "Contact",
          fields: [
            { name: "name", label: "Full name" },
            { name: "email", label: "Email", widget: { name: "email" } },
            { name: "notes", label: "Notes" },
          ],
        },
        card: {
          label: "",
          fields: [
            { name: "name" },
            { name: "email", widget: { name: "email" } },
          ],
        },
      },
    },
  }),
  validator: createAjvValidator(),
  kit: createHtmlKit(),
});
```

Annotation model: [`docs/annotation.md`](../../docs/annotation.md).

---

## Custom components

Register a React component for a **schema key + mode + view**. Surface picks the first matching registry entry for the node’s candidate keys.

```tsx
import {
  useSurface,
  type SurfaceProps,
  type SurfaceRenderer,
} from "@rusl-labs/surface";
import { createHtmlKit, FieldChrome, surfaceClass } from "@rusl-labs/surface-html";

const ContactCard: SurfaceRenderer = function ContactCard({ data }: SurfaceProps) {
  const row = data as { name?: string; email?: string } | undefined;
  return (
    <article className="contact-card">
      <strong>{row?.name}</strong>
      <span>{row?.email}</span>
    </article>
  );
};

const EmailInput: SurfaceRenderer = function EmailInput({ data }: SurfaceProps) {
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

const kit = createHtmlKit({
  resolvers: [
    // Whole subject, display + card view only
    {
      key: contactId,
      mode: "display",
      view: "card",
      component: ContactCard,
    },
    // Any email-shaped string in input mode (all views)
    {
      key: "format:email",
      mode: "input",
      component: EmailInput,
    },
  ],
});

const { Surface } = createSurfaceUi({
  schemaResolver,
  validator,
  kit,
});

// Uses ContactCard
<Surface id={contactId} data={person} mode="display" view="card" />

// Uses EmailInput for the email field; default object form for the rest
<Surface id={contactId} data={draft} onChange={setDraft} mode="input" />
```

### Match rules

| You set | What matches |
| --- | --- |
| `key` | A **candidate key** for the node (`$id`, `widget:…`, `format:…`, `string`, …) |
| `mode` | `"input"` / `"display"`. Omit = both. |
| `view` | Annotation view name. Omit = all views. Non-default views fall back to a `view: "default"` entry when present. |

`createHtmlKit({ resolvers })` appends your entries after structural defaults. **Last registration wins** for a given key.

You can also register after construction:

```ts
kit.set(contactId, "display", "card", ContactCard);
// same as
kit.set({
  key: contactId,
  mode: "display",
  view: "card",
  component: ContactCard,
});
```

### Candidate keys (most specific first)

```text
schema $id
  → widget.$kind → widget:<name> → <name>
  → format:<name> → <name>
  → const | enum
  → type (string, object, …)
  → combinators (oneOf, anyOf, allOf)
```

Examples:

| Situation | Register |
| --- | --- |
| One subject schema | full `$id` |
| Annotation `widget: { name: "email" }` | `"email"` or `"widget:email"` |
| `{ type: "string", format: "date-time" }` | `"format:date-time"` |
| Every string input | `"string"` + `mode: "input"` |

`$id` outranks widgets and types. Claiming a subject by `$id` is intentional — annotations cannot steal that node.

For `resolve` (pick a component from app state, or return `null` to keep falling through) and Root form shells, see **[Building kits](../../docs/guides/building-kits.md)**.

---

## Packages

| Package | Role |
| --- | --- |
| `@rusl-labs/surface` | Core runtime |
| [`@rusl-labs/surface-html`](../html/README.md) | HTML kit, widgets, opt-in `surface.css` |
| [`@rusl-labs/surface-ajv`](../ajv/README.md) | Recommended AJV validator |

---

## Docs

| Doc | Role |
| --- | --- |
| [Building kits](../../docs/guides/building-kits.md) | Registry, candidate keys, custom renderers |
| [annotation.md](../../docs/annotation.md) | Annotation model |
| [implementation.md](../../docs/implementation.md) | What ships today |
| [SCHEMA.md](../../SCHEMA.md) | Schema-driven policy |

Try the playground from the repo root:

```bash
bun run playground
```
