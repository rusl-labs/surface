/**
 * Vendored rusl feedback-schemas seeds for playground dogfood.
 */
import type { Schema } from "../../packages/core/src/index.ts";
import contextLoadingHint from "../../schemas/rusl/context-loading-hint.schema.json" with {
  type: "json",
};
import contextRequest from "../../schemas/rusl/context-request.schema.json" with {
  type: "json",
};
import domainInterpretation from "../../schemas/rusl/domain-interpretation.schema.json" with {
  type: "json",
};
import migrationGuide from "../../schemas/rusl/migration-guide.schema.json" with {
  type: "json",
};
import semanticLink from "../../schemas/rusl/semantic-link.schema.json" with {
  type: "json",
};
import sourceAttestation from "../../schemas/rusl/source-attestation.schema.json" with {
  type: "json",
};
import trustSignal from "../../schemas/rusl/trust-signal.schema.json" with {
  type: "json",
};
import usageReport from "../../schemas/rusl/usage-report.schema.json" with {
  type: "json",
};

export const CONTEXT_LOADING_HINT_ID =
  "https://resources.rusl.com/resources/rusl/schemas/context-loading-hint";
export const CONTEXT_REQUEST_ID =
  "https://resources.rusl.com/resources/rusl/schemas/context-request";
export const DOMAIN_INTERPRETATION_ID =
  "https://resources.rusl.com/resources/rusl/schemas/domain-interpretation";
export const MIGRATION_GUIDE_ID =
  "https://resources.rusl.com/resources/rusl/schemas/migration-guide";
export const SEMANTIC_LINK_ID =
  "https://resources.rusl.com/resources/rusl/schemas/semantic-link";
export const SOURCE_ATTESTATION_ID =
  "https://resources.rusl.com/resources/rusl/schemas/source-attestation";
export const TRUST_SIGNAL_ID =
  "https://resources.rusl.com/resources/rusl/schemas/trust-signal";
export const USAGE_REPORT_ID =
  "https://resources.rusl.com/resources/rusl/schemas/usage-report";

export const RUSL_FEEDBACK_SCHEMA_SEEDS: Record<string, Schema> = {
  [CONTEXT_LOADING_HINT_ID]: contextLoadingHint as Schema,
  [CONTEXT_REQUEST_ID]: contextRequest as Schema,
  [DOMAIN_INTERPRETATION_ID]: domainInterpretation as Schema,
  [MIGRATION_GUIDE_ID]: migrationGuide as Schema,
  [SEMANTIC_LINK_ID]: semanticLink as Schema,
  [SOURCE_ATTESTATION_ID]: sourceAttestation as Schema,
  [TRUST_SIGNAL_ID]: trustSignal as Schema,
  [USAGE_REPORT_ID]: usageReport as Schema,
};
