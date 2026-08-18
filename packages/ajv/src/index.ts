/**
 * Recommended AJV SurfaceValidator.
 *
 * Absolute `$ref`s load through `request.schemaResolver` on each validate —
 * same fetch path Surface uses for UI. OpenAPI-style `discriminator` is on
 * so oneOf unions (e.g. postal.address) only apply the matching arm.
 */
import {
  Ajv2020,
  type AnySchemaObject,
  type ValidateFunction,
} from "ajv/dist/2020.js";
import formatsPlugin from "ajv-formats";
import type {
  DataPath,
  Schema,
  SchemaResolver,
  SurfaceValidator,
  ValidateRequest,
  ValidateResult,
  ValidityIssue,
} from "@rusl-labs/surface";

export type CreateAjvValidatorOptions = {
  /**
   * Schemas registered up front (offline seeds). Anything else is loaded via
   * `request.schemaResolver` during `compileAsync`.
   */
  readonly schemas?: readonly Schema[];
  /**
   * Enable OpenAPI-style `discriminator` (default true).
   * Required for Rusl postal.address `$kind` oneOf arms.
   */
  readonly discriminator?: boolean;
};

/** AJV instancePath like "/lineItems/2/sku" → ["lineItems", 2, "sku"]. */
export function instancePathToDataPath(instancePath: string): DataPath {
  if (instancePath.length === 0 || instancePath === "/") return [];
  const raw = instancePath.startsWith("/")
    ? instancePath.slice(1)
    : instancePath;
  if (raw.length === 0) return [];
  return raw.split("/").map((seg) => {
    if (/^\d+$/.test(seg)) return Number(seg);
    return seg.replace(/~1/g, "/").replace(/~0/g, "~");
  });
}

function issueFromAjvError(error: {
  instancePath?: string;
  message?: string | null;
  keyword?: string;
  params?: Record<string, unknown>;
}): ValidityIssue {
  const path = instancePathToDataPath(error.instancePath ?? "");
  let message = error.message ?? "Invalid value";
  if (
    error.keyword === "required" &&
    typeof error.params?.missingProperty === "string"
  ) {
    message = `Required property ${error.params.missingProperty}`;
    return {
      path: [...path, error.params.missingProperty],
      message,
      code: error.keyword,
    };
  }
  return {
    path,
    message,
    ...(error.keyword !== undefined ? { code: error.keyword } : {}),
  };
}

function documentUri(uri: string): string {
  const hash = uri.indexOf("#");
  return hash === -1 ? uri : uri.slice(0, hash);
}

/**
 * Build an AJV-backed {@link SurfaceValidator}.
 *
 * @example
 * ```ts
 * const validator = createAjvValidator({ schemas: [moneySchema] });
 * createSurfaceUi({ schemaResolver, validator, kit });
 * ```
 */
export function createAjvValidator(
  options: CreateAjvValidatorOptions = {},
): SurfaceValidator {
  const knownSchemas = options.schemas ?? [];
  const discriminator = options.discriminator !== false;

  return {
    async validate(request: ValidateRequest): Promise<ValidateResult> {
      const { id, schema, data, schemaResolver } = request;

      const ajv = new Ajv2020({
        allErrors: true,
        strict: false,
        validateSchema: false,
        discriminator,
        loadSchema: (uri) => loadViaResolver(uri, schemaResolver),
      });
      // Plugin type is callable at runtime; typings are awkward under NodeNext.
      (formatsPlugin as unknown as (instance: Ajv2020) => void)(ajv);

      for (const known of knownSchemas) {
        const knownId = typeof known.$id === "string" ? known.$id : undefined;
        if (knownId !== undefined && !ajv.getSchema(knownId)) {
          try {
            ajv.addSchema(known as AnySchemaObject);
          } catch {
            // ignore duplicate / incompatible
          }
        }
      }

      const key =
        (typeof schema.$id === "string" ? schema.$id : undefined) ?? id;
      let validateFn: ValidateFunction | undefined =
        key !== undefined ? ajv.getSchema(key) : undefined;

      if (validateFn === undefined) {
        const toCompile: AnySchemaObject =
          key !== undefined
            ? ({ ...schema, $id: key } as AnySchemaObject)
            : (schema as AnySchemaObject);
        try {
          validateFn = await ajv.compileAsync(toCompile);
        } catch (cause) {
          const message =
            cause instanceof Error ? cause.message : String(cause);
          return {
            valid: false,
            issues: [
              {
                path: [],
                message: `Schema compile failed: ${message}`,
                code: "schema",
              },
            ],
          };
        }
      }

      const valid = Boolean(validateFn(data));
      const issues = (validateFn.errors ?? []).map(issueFromAjvError);
      return { valid, issues };
    },
  };
}

async function loadViaResolver(
  uri: string,
  resolver: SchemaResolver,
): Promise<AnySchemaObject> {
  const docUri = documentUri(uri);
  if (resolver.resolveDocument !== undefined) {
    const document = await resolver.resolveDocument(docUri);
    if (document !== undefined) {
      return document as AnySchemaObject;
    }
  }
  const node = await resolver.resolveSchema(uri);
  if (node === undefined) {
    throw new Error(`schemaResolver returned no schema for ${uri}`);
  }
  return node as AnySchemaObject;
}
