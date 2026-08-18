# `@rusl-labs/surface`

A small React runtime that turns JSON Schema into forms and displays.

```tsx
import { useState } from "react";
import {
  createSurfaceUi,
  InMemorySchemaFetchResolver,
} from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { createHtmlKit } from "@rusl-labs/surface-html";
import "@rusl-labs/surface-html/surface.css";

const schemaId = "https://example.com/schemas/contact";

const schema = {
  $id: schemaId,
  type: "object",
  required: ["name", "email"],
  properties: {
    name: { type: "string" },
    email: { type: "string", format: "email" },
  },
};

const { Surface } = createSurfaceUi({
  schemaResolver: new InMemorySchemaFetchResolver({ [schemaId]: schema }),
  validator: createAjvValidator(),
  kit: createHtmlKit(),
});

export function App() {
  const [data, setData] = useState({ name: "", email: "" });

  return (
    <Surface
      id={schemaId}
      data={data}
      onChange={setData}
      onSubmit={({ data }) => console.log(data)}
    />
  );
}
```

Schema owns shape. An optional annotation owns presentation (order, labels, views). A kit owns the DOM. Swap or extend the kit when you want custom chrome.

---

## Install

```bash
npm install @rusl-labs/surface @rusl-labs/surface-html @rusl-labs/surface-ajv ajv ajv-formats react
```

## Custom components in one registration

Target a **schema key + mode + view**:

```tsx
import type { SurfaceRenderer } from "@rusl-labs/surface";
import { createHtmlKit } from "@rusl-labs/surface-html";

const ContactCard: SurfaceRenderer = function ContactCard({ data }) {
  const row = data as { name?: string; email?: string } | undefined;
  return (
    <article>
      <strong>{row?.name}</strong>
      <span>{row?.email}</span>
    </article>
  );
};

const kit = createHtmlKit({
  resolvers: [
    {
      key: schemaId,       // subject $id (or format:email, widget:media, string, …)
      mode: "display",     // or "input" — omit for both
      view: "card",        // annotation view — omit for all views
      component: ContactCard,
    },
  ],
});

<Surface id={schemaId} data={person} mode="display" view="card" />
```

Full walkthrough (candidate keys, `kit.set`, widgets, Root form shell):  
[`packages/core/README.md`](packages/core/README.md) · [`docs/guides/building-kits.md`](docs/guides/building-kits.md)

---

## Packages

| Package | Role |
| --- | --- |
| [`@rusl-labs/surface`](packages/core/README.md) | Core runtime |
| [`@rusl-labs/surface-html`](packages/html/README.md) | HTML kit + default widgets |
| [`@rusl-labs/surface-ajv`](packages/ajv/README.md) | AJV validator adapter |

## Docs

| Doc | Role |
| --- | --- |
| [packages/core/README.md](packages/core/README.md) | Get started + custom components |
| [docs/guides/building-kits.md](docs/guides/building-kits.md) | Kit authoring |
| [docs/annotation.md](docs/annotation.md) | Annotation model |
| [docs/implementation.md](docs/implementation.md) | What ships today |
| [SCHEMA.md](SCHEMA.md) | Schema-driven policy |

## Run this repo

```bash
bun test && bun run typecheck
bun run playground   # optional PORT=3001
```

The playground mounts seeded subjects with a live annotation editor.
