# Surface playground

Dev harness for `@rusl-labs/surface` + `@rusl-labs/surface-html` +
`@rusl-labs/surface-ajv`.

## Navigation

Local **Contact table** subject is an inline `{ contacts: contact.card[] }`
object so the display-only `table` widget can sit on that array field.

One **subject catalog** (left): searchable, grouped list of every seeded
`$id` (Pinned · Contact · Commerce · Billing · Postal · Rusl feedback · Local). Selecting a
row mounts that subject immediately. Shareable URL: `?subject=<urlencoded $id>`.

Toolbar keeps **Mode** and **View** only. Named Demo / Raw tabs are gone.

### Live annotation editor

The right-hand **Annotation** panel edits the Surface annotation for the
mounted subject. Starter docs ship for contact (identity / row / card +
email/tel/copy via `defs` / subject docs — `items.fields` is ignored on
`$ref` items), invoice, postal, money, product, and the walkthrough
fixture; other seeds get an empty `rest: "append"` starter.

**Reset starter** restores that subject’s seed annotation.

### Data channel

**Seed payload** is the single *committed* instance object (Display reads it
too). Input keeps an internal draft until **Save**: kit validates, then
`onSubmit` replaces Seed payload with that validated object — invalid Save
leaves Seed payload unchanged. Display **Data (JSON)** only commits after
parse + schema validation.

Schemas: `rusl.bundle.toml` → `schemas/pragmatic/`. Seeds:
`tests/fixtures/pragmatic-seeds.ts`. Catalog helpers:
`examples/playground/catalog.ts`.

## Run

```sh
bun run playground
```

This is live. Bun serves `examples/playground/index.html` and resolves
workspace packages to **source** (`packages/*/src`). Edit a kit file, the
page reloads. Do not `bun run build` for playground work — `dist/` is
publish-only.

Default port **3000**. Override with `PORT=3001`.

## Styling

```ts
import "@rusl-labs/surface-html/surface.css";
```

`styles.css` themes the shell and bridges `--surface-*` tokens.
