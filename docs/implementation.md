# Implementation status

What the Surface runtime **actually does** today.

## Packages

| Package | Role |
| --- | --- |
| `@rusl-labs/surface` | Core: recursive Surface, resolvers, helpers, data channel, validity |
| `@rusl-labs/surface-html` | HTML kit: fields, widgets, layout, opt-in `surface.css` |
| `@rusl-labs/surface-ajv` | Recommended AJV adapter (`ajv` / `ajv-formats` peers) |

## Core

- Kit registry: `resolveRenderer` + `fallback`; candidate keys `$id` → **subject-root coordinate** (`<uri>` or `<uri>#/$defs/<name>`) → **`widget.$kind`** → `widget:name` → format → const → enum → type → combinators
- `createRegistryKit({ aliases })` — one hop; explicit alias-key registration wins
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
- **Default kit widgets:** media, link, email, tel, copy, input, date, datetime, table, uri
- **Short names once; aliases reuse them:** `$kind` URIs, `PHONE_ID` → `tel`, `date-time` → `datetime`, `idn-email` → `email`, `uri-reference` / `iri` / `iri-reference` → `uri`. Host `createHtmlKit({ aliases })` merges `{ ...HTML_KIT_ALIASES, ...user }`
- **Money / phone:** `$id` widgets (`currency.js`, `libphonenumber-js`). `PHONE_ID` = `…/contact.scalars#/$defs/phone` (no slash before `#`) — map key only; schemas are not vendored in the kit
- **`createHtmlKit({ locale, money, tel, date, aliases, resolvers })`**
- **`Surface` `labels`:** inherited; `false` hides field chrome
- **Table:** display-only; sort is view-only; columns `field` / `label` / `sortable` / `align` / `fontWeight`
- Vocabulary schema: `packages/html/schemas/default-kit.schema.json` (published as `@rusl-labs/surface-html/schemas/default-kit.schema.json`)
- `HtmlRoot`: Reset/Save **buttons** (not native form submit); before validate, deep-apply schema `const` (forced) + `default` (when missing); then validate → `onSubmit`; optional structured presence (Add/Remove) input-only
- date-time: registered as `datetime`; `date-time` aliases in; `datetime-local` ↔ RFC 3339
- tel: messy national draft, E.164 on blur; display is a locale `tel:` link
- Opt-in stylesheet: `@rusl-labs/surface-html/surface.css`


## AJV

- `createAjvValidator({ schemas?, discriminator? })` — discriminator on by default
- Absolute `$ref`s via request `schemaResolver`

## Rusl / playground

Vendored graph (`rusl.bundle.toml`): postal.address, money, contact.card, billing.invoice / payment / refund, **commerce.product / order / price**, and deps, plus `rusl/bundles/feedback-schemas`.

Playground (`bun run playground`, `PORT` supported): **subject catalog** (searchable grouped sidebar) mounts any seeded `$id` with the seeded annotations; `?subject=` URL sync; Mode / View chrome; live annotation editor.

## Tests

Core, HTML, AJV: data channel, form, enum, postal discriminator, layout/direction, media/link/email/tel/copy widgets, money `$id` kit, product sample validation.


## Non-goals

- Core does not embed AJV or hard-code form HTML
- No deprecation shims / dual paths
- Annotations do not own Save/Reset

## Run

```bash
bun run check
bun run playground   # PORT=3001 optional
```

## Living docs

| Doc | Role |
| --- | --- |
| [annotation.md](./annotation.md) | Annotation model |
| [annotation-format.schema.json](./annotation-format.schema.json) | Format contract |
| [guides/building-kits.md](./guides/building-kits.md) | Kit guide |
