# Implementation status

What the Surface runtime **actually does** today. Direction: [`plan.md`](./plan.md).

## Packages

| Package | Role |
| --- | --- |
| `@rusl-labs/surface` | Core: recursive Surface, resolvers, helpers, data channel, validity |
| `@rusl-labs/surface-html` | HTML kit: fields, widgets, layout, opt-in `surface.css` |
| `@rusl-labs/surface-ajv` | Recommended AJV adapter (`ajv` / `ajv-formats` peers) |

## Core

- Kit registry: `resolveRenderer` + `fallback`; candidate keys `$id` → **`widget.$kind`** → `widget:name` → format → const → enum → type → combinators
- Optional `kit.Root` wraps the root body (`isRoot`)
- Schema + annotation resolve; coordinates; `helpers.fields` / `label` / `description` / **`layout`** / **`direction`**
- Data channel: controlled or draft; `setData` / `setChild`; omit optional keys on Remove (`undefined`)
- Validity: required `SurfaceValidator`; issues by data path; re-validate after failed Save

## Annotation (runtime)

- Views, sections, headings, templates, **block / banner / span** chrome, rest, mode overrides (`input` / `display`)
- Optional document `targetLibraries` (kit hint; not used by core resolution)
- Conventional view names: `default`, `identity`, `row`, `card` (open strings)
- **Layout** `props` \| `stack` and **direction** `vertical` \| `horizontal` on views and sections
- Open **widget** object (`name`, optional `$kind` / `options`, additional properties); whole object passed through
- Format contract: [`annotation-format.schema.json`](./annotation-format.schema.json)
- Model summary: [`annotation.md`](./annotation.md)
- DX checklist: [`guides/annotation-dx.md`](./guides/annotation-dx.md)

## HTML kit

- Structural renderers per mode: string, number, boolean, const, enum, object, array, allOf, oneOf/anyOf
- **Layout:** stack vs props field chrome; section body flex + data attrs for CSS
- **Default kit widgets:** media, link, email, tel, copy, input, date, datetime, table, uri (short name + aliases for `$kind` URIs and well-known formats)
- **Money / phone:** `$id` widgets (`currency.js`, `libphonenumber-js`); schemas are not vendored in the kit
- **`createRegistryKit({ aliases })`:** one hop; host aliases override kit defaults
- **`Surface` `labels`:** inherited; `false` hides field chrome
- Vocabulary schema: `packages/html/schemas/default-kit.schema.json`
- `HtmlRoot`: Reset/Save **buttons** (not native form submit); before validate, deep-apply schema `const` (forced) + `default` (when missing); then validate → `onSubmit`; optional structured presence (Add/Remove) input-only
- date-time: `datetime-local` ↔ RFC 3339; field-level a11y hooks
- tel display: `libphonenumber-js` national/`tel:` formatting
- Opt-in stylesheet: `@rusl-labs/surface-html/surface.css`


## AJV

- `createAjvValidator({ schemas?, discriminator? })` — discriminator on by default
- Absolute `$ref`s via request `schemaResolver`

## Rusl / playground

Vendored graph (`rusl.bundle.toml`): postal.address, money, contact.card, billing.invoice / payment / refund, **commerce.product / order / price**, and deps, plus `rusl/bundles/feedback-schemas`.

Playground (`bun run playground`, `PORT` supported): **subject catalog** (searchable grouped sidebar) mounts any seeded `$id` with starter annotations; `?subject=` URL sync; Mode / View chrome; live annotation editor.

Default kit widgets: media, link, **email**, **tel**, **copy**, input, date, datetime; money via `$id` takeover (`currency.js`, `libphonenumber-js`).

## Tests

Core, HTML, AJV: data channel, form, enum, postal discriminator, layout/direction, media/link/email/tel/copy widgets, money `$id` kit, product sample validation.

## Next (see plan.md)

1. Publish + consumer docs (`0.1.0`).
2. Architecture review — later.

## Non-goals

- Core does not embed AJV or hard-code form HTML
- No deprecation shims / dual paths
- Annotations do not own Save/Reset

## Run

```bash
bun test && bun run typecheck
bun run playground   # PORT=3001 optional
```

## Living docs

| Doc | Role |
| --- | --- |
| [plan.md](./plan.md) | Loose roadmap |
| [annotation.md](./annotation.md) | Annotation model |
| [annotation-format.schema.json](./annotation-format.schema.json) | Format contract |
| [guides/building-kits.md](./guides/building-kits.md) | Kit guide |
