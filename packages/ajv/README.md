# `@rusl-labs/surface-ajv`

AJV adapter for Surface’s `SurfaceValidator`. Core stays validator-agnostic. This package is the recommended instance validator.

## Install

```bash
npm install @rusl-labs/surface @rusl-labs/surface-html @rusl-labs/surface-ajv ajv ajv-formats react
```

`ajv` and `ajv-formats` are peer dependencies. You own those versions.

## Usage

```ts
import { createSurfaceUi, InMemorySchemaFetchResolver } from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { createHtmlKit } from "@rusl-labs/surface-html";

const contactId = "https://example.com/schemas/contact";
const contactSchema = {
  $id: contactId,
  type: "object",
  properties: { name: { type: "string" } },
};

const schemaResolver = new InMemorySchemaFetchResolver({
  [contactId]: contactSchema,
});

const validator = createAjvValidator();

const { Surface } = createSurfaceUi({
  schemaResolver,
  validator,
  kit: createHtmlKit(),
});
```

`createAjvValidator({ schemas?, discriminator? })` builds one validator. Each `validate` call compiles against the request schema.

Absolute `$ref`s load through the same `request.schemaResolver` that Surface uses for UI (`compileAsync` + `loadSchema`). Pass `schemas` when you want known documents registered up front.

`discriminator` defaults to `true` (OpenAPI-style `discriminator` next to `oneOf`). Set `discriminator: false` to turn it off.

The AJV instance uses `allErrors: true`, `strict: false`, and `ajv-formats`.
