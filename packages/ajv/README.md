# `@rusl-labs/surface-ajv`

Recommended [`SurfaceValidator`](https://github.com/rusl-labs/surface) adapter
built on [AJV](https://ajv.js.org/) (JSON Schema draft 2020-12).

Core stays validator-agnostic. Most apps install this package so they never hand-roll
AJV wiring.

## Install

```bash
npm install @rusl-labs/surface @rusl-labs/surface-ajv ajv ajv-formats
```

`ajv` and `ajv-formats` are **peer** dependencies — you own the versions.

## Usage

```ts
import { createSurfaceUi, InMemorySchemaFetchResolver } from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { createHtmlKit } from "@rusl-labs/surface-html";

const schemaResolver = new InMemorySchemaFetchResolver({ /* seeds */ });
const validator = createAjvValidator({
  // optional offline seeds; everything else loads via ValidateRequest.schemaResolver
  schemas: [],
});

const { Surface } = createSurfaceUi({
  schemaResolver,
  validator,
  kit: createHtmlKit(),
});
```

### Behaviour

- **`ValidateRequest.schemaResolver`** — absolute `$ref`s load on demand
  (`compileAsync` + `loadSchema`), same path as the UI.
- **`discriminator: true`** — OpenAPI-style `discriminator` next to `oneOf`
  (e.g. Rusl `postal.address` `$kind`) so only the matching arm contributes
  field errors.
- **`allErrors: true`**, `strict: false`, `ajv-formats` enabled.

Core never hard-codes AJV. This package is the supported default for apps that
want JSON Schema instance validation without plumbing.
