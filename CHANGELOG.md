# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-09-23

### `@rusl-labs/surface`

#### Added

- Optional kit capability `getViews(request)` on registry kits. Lists explicit view registrations that win for the request’s candidate keys, aliases, mode, and data — without inventing names from wildcards, shadowed entries, or default-fallback matches.
- Inline schemas establish document scope for local `$ref` and annotation lookup without a duplicate resolver registration.
- Metadata-only named views can supply subject-root chrome independently of field-list layout.
- Section label / omit honor mode overrides.

#### Fixed

- Inline composition branches inherit annotation coordinates; inline array items use the bound entry’s `items` scope. Reindexing an unchanged supplied schema preserves its mounted editor.
- Root `onSubmit` preserves returned promises so consumers can await completion or rejection.
- After a failed Save, reactive revalidation reports validator rejection and discards stale results when data has been replaced.

### `@rusl-labs/surface-html` / `@rusl-labs/surface-ajv`

Unchanged at `0.1.0`. Peer range `@rusl-labs/surface@^0.1.0` accepts this core release.

### Repository

- Tag-triggered GitHub Actions publish (trusted publishing / OIDC), matching ajvforge. Pushing `v*` publishes every workspace package whose `version` matches the tag.

## [0.1.0] - 2026-09-07

Initial public release of `@rusl-labs/surface`, `@rusl-labs/surface-html`, and `@rusl-labs/surface-ajv`.

[Unreleased]: https://github.com/rusl-labs/surface/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/rusl-labs/surface/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/rusl-labs/surface/releases/tag/v0.1.0
