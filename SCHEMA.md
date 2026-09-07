# Schema-Driven Development

This repository follows the [Schema-Driven Development manifesto](https://schema-driven.dev): decide serializable data shapes once, then make types, validation, rendering, documentation, and agent context answer to those decisions.

Rusl provides the shared registry, dependency graph, lockfile, and vendored schema snapshots used by this repository. It is not a runtime dependency of `@rusl-labs/surface`.

## Scope

The schema-first rule applies to data that crosses a durable boundary: published annotation payloads, package-consumer data, application resources, validator payloads, and other JSON exchanged between systems or agents.

Local implementation state and behavior-bearing TypeScript interfaces do not need artificial JSON Schemas. When such an interface carries schema-defined JSON, that portion must remain aligned with its authoritative schema.

## Authority

| Concern | Authority |
| --- | --- |
| Declared external dependencies | `rusl.bundle.toml` |
| Exact resolved versions | `rusl.lock` — generated; do not edit by hand |
| Installed external schemas | `schemas/` — committed output of `rusl install`; do not edit by hand |
| What ships | `docs/implementation.md` |
| Annotation model | `docs/annotation.md` + runtime (`packages/core`) |
| Annotation envelope | [rusl/schemas/surface.annotation](https://rusl.com/rusl/schemas/surface.annotation) — published; local pin `schemas/rusl/surface.annotation.schema.json` |
| Kit authoring | `docs/guides/building-kits.md` + `packages/html` |
| Default kit look / widget contract | `packages/html/DESIGN.md` |
| Default kit `widget` kinds | [rusl/schemas/surface.default-kit](https://rusl.com/rusl/schemas/surface.default-kit) — published; local pin `schemas/rusl/surface.default-kit.schema.json` |
| TypeScript behavior | `packages/*/src` — never a second independent data-shape authority |

Schemas under `tests/fixtures/` and `$id` values under `example.test` are test inputs, not shared definitions. Application-supplied subject schemas remain owned by their applications; Surface consumes them without claiming their shape or validator.

**Do not treat historical proposal drafts or process prompts as current authority.** Living docs and `packages/*/src` are the record.

## Iron rules

1. **Define a shape once.** Name one authoritative schema for every serializable boundary shape. Do not create parallel JSON Schema, TypeScript, Zod, AJV, documentation, or fixture definitions that can drift independently.
2. **Reuse before defining.** Inspect the pinned graph with `rusl list --tree` and search for a reusable schema or bundle before introducing a domain shape.
3. **Define before generating or implementing.** Agree on the schema change before changing code that carries it. A new boundary field starts in the authoritative schema, not in a renderer, validator, or TypeScript type.
4. **Version definitions like code.** Review schema changes as contract changes, preserve an attributable diff, and apply semantic versioning when a published definition changes.
5. **Separate shape from meaning.** Subject schemas own data structure. Surface annotations own presentation. Applications own business semantics, validator choice, widget libraries, and policy. Do not smuggle those concerns into one another.
6. **Derive everything.** Generated or hand-written artifacts both answer to the authoritative schema. If regeneration or reconciliation would destroy required behavior, the artifact has incorrectly become a second source.

## Repository workflow

### Changing an installed dependency

1. Change `rusl.bundle.toml` intentionally; never edit a file under `schemas/` directly.
2. Run `rusl install` from the repository root.
3. Review and commit `rusl.lock` and the resulting `schemas/` changes together.
4. Run the consumers and tests that exercise the changed definition.

### Changing the Surface annotation format or default-kit vocabulary

1. Read `docs/annotation.md` and the installed schema. Change only with concrete implementation evidence.
2. These shapes are published Rusl schemas. Propose a new version on Rusl, accept it, then bump the pin in `rusl.bundle.toml` and run `rusl install`. Do not edit the installed files or keep a parallel local draft as authority.
3. Verify with `bun run check`.

AJV may validate annotation documents in tests and tooling. Core remains validator-agnostic.

## Rusl access policy

Rusl use for this repository is read-only unless the developer explicitly changes that policy. Do not create or modify Rusl resources, and do not submit proposals, annotations, endorsements, feedback, or usage reports. Registry discovery and local dependency inspection are allowed.

## Further reading

- [Schema-Driven Development manifesto](https://schema-driven.dev)
- [Rusl agent guide](https://rusl.com/llms.txt)
