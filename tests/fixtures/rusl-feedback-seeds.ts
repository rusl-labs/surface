/**
 * Local rusl feedback-schema seeds for playground dogfood.
 * Not Rusl-installed; Surface's bundle only pins the two Surface contracts.
 */
import type { Schema } from "../../packages/core/src/index.ts";
import contextLoadingHint from "./rusl-feedback/context-loading-hint.schema.json" with {
  type: "json",
};
import contextRequest from "./rusl-feedback/context-request.schema.json" with {
  type: "json",
};
import domainInterpretation from "./rusl-feedback/domain-interpretation.schema.json" with {
  type: "json",
};
import migrationGuide from "./rusl-feedback/migration-guide.schema.json" with {
  type: "json",
};
import semanticLink from "./rusl-feedback/semantic-link.schema.json" with {
  type: "json",
};
import sourceAttestation from "./rusl-feedback/source-attestation.schema.json" with {
  type: "json",
};
import trustSignal from "./rusl-feedback/trust-signal.schema.json" with {
  type: "json",
};
import usageReport from "./rusl-feedback/usage-report.schema.json" with {
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
