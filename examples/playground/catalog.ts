/**
 * Playground subject catalog — groups, pins, search.
 */
import {
  AU_ADDRESS_ID,
  BILLING_INVOICE_ID,
  COMMERCE_LINE_ITEM_ID,
  COMMERCE_PRODUCT_ID,
  CONTACT_CARD_ID,
  CONTACT_SCALARS_ID,
  CONTACT_SOCIAL_HANDLE_ID,
  CURRENCY_CODE_ID,
  EXTERNAL_REFERENCE_ID,
  GEO_ID,
  MONEY_ID,
  POSTAL_ADDRESS_ID,
  PRAGMATIC_SCHEMA_SEEDS,
  SUBDIVISION_ID,
  US_ADDRESS_ID,
} from "../../tests/fixtures/pragmatic-seeds.ts";
import { RUSL_FEEDBACK_SCHEMA_SEEDS } from "../../tests/fixtures/rusl-feedback-seeds.ts";
import { CONTACT_CARD as WALKTHROUGH_ID } from "../../tests/fixtures/contact-card.ts";
import { CONTACT_DIRECTORY_ID } from "./contact-directory.ts";

export type CatalogGroupId =
  | "pinned"
  | "contact"
  | "commerce"
  | "billing"
  | "postal"
  | "rusl"
  | "local"
  | "other";

export type CatalogEntry = {
  readonly id: string;
  readonly title: string;
  readonly shortName: string;
  readonly group: CatalogGroupId;
};

export const PINNED_IDS: readonly string[] = [
  CONTACT_CARD_ID,
  BILLING_INVOICE_ID,
  COMMERCE_PRODUCT_ID,
  MONEY_ID,
  POSTAL_ADDRESS_ID,
];

const GROUP_LABELS: Record<CatalogGroupId, string> = {
  pinned: "Pinned",
  contact: "Contact",
  commerce: "Commerce",
  billing: "Billing",
  postal: "Postal",
  rusl: "Rusl feedback",
  local: "Local",
  other: "Other",
};

export function groupLabel(id: CatalogGroupId): string {
  return GROUP_LABELS[id];
}

/** Last path segment of a schema `$id` (e.g. contact.card). */
export function shortNameFromId(id: string): string {
  const noFrag = id.split("#")[0] ?? id;
  const parts = noFrag.split("/");
  return parts[parts.length - 1] || id;
}

function titleFromSchema(id: string, schema: { title?: unknown }): string {
  return typeof schema.title === "string" && schema.title.length > 0
    ? schema.title
    : shortNameFromId(id);
}

function classifyGroup(id: string): CatalogGroupId {
  if (id === WALKTHROUGH_ID) return "local";
  if (id.includes("/rusl/schemas/")) return "rusl";
  const short = shortNameFromId(id);
  if (short.startsWith("contact.") || id === CONTACT_SCALARS_ID) return "contact";
  if (short.startsWith("commerce.")) return "commerce";
  if (short.startsWith("billing.")) return "billing";
  if (
    short.startsWith("postal.") ||
    id === US_ADDRESS_ID ||
    id === AU_ADDRESS_ID ||
    id === GEO_ID ||
    id === SUBDIVISION_ID
  ) {
    return "postal";
  }
  if (id === MONEY_ID || id === CURRENCY_CODE_ID) return "billing";
  if (id === EXTERNAL_REFERENCE_ID) return "commerce";
  return "other";
}

/** Build catalog entries from schema seeds + local fixtures. */
export function buildCatalog(
  seeds: Record<string, { title?: unknown }>,
  extra: ReadonlyArray<{ id: string; title: string; group: CatalogGroupId }> = [],
): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  const seen = new Set<string>();

  for (const id of PINNED_IDS) {
    const schema = seeds[id];
    if (schema === undefined) continue;
    entries.push({
      id,
      title: titleFromSchema(id, schema),
      shortName: shortNameFromId(id),
      group: "pinned",
    });
    seen.add(id);
  }

  for (const [id, schema] of Object.entries(seeds)) {
    if (seen.has(id)) continue;
    entries.push({
      id,
      title: titleFromSchema(id, schema),
      shortName: shortNameFromId(id),
      group: classifyGroup(id),
    });
    seen.add(id);
  }

  for (const row of extra) {
    if (seen.has(row.id)) continue;
    entries.push({
      id: row.id,
      title: row.title,
      shortName: shortNameFromId(row.id),
      group: row.group,
    });
    seen.add(row.id);
  }

  return entries;
}

export function filterCatalog(
  entries: readonly CatalogEntry[],
  query: string,
): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [...entries];
  return entries.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      e.shortName.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q),
  );
}

export type CatalogGroup = {
  readonly id: CatalogGroupId;
  readonly label: string;
  readonly entries: CatalogEntry[];
};

const GROUP_ORDER: readonly CatalogGroupId[] = [
  "pinned",
  "contact",
  "commerce",
  "billing",
  "postal",
  "rusl",
  "local",
  "other",
];

export function groupSubjects(
  entries: readonly CatalogEntry[],
): CatalogGroup[] {
  const buckets = new Map<CatalogGroupId, CatalogEntry[]>();
  for (const id of GROUP_ORDER) buckets.set(id, []);
  for (const entry of entries) {
    const list = buckets.get(entry.group) ?? [];
    list.push(entry);
    buckets.set(entry.group, list);
  }
  const out: CatalogGroup[] = [];
  for (const id of GROUP_ORDER) {
    const list = buckets.get(id) ?? [];
    if (list.length === 0) continue;
    out.push({ id, label: groupLabel(id), entries: list });
  }
  return out;
}

export function resolveSubjectFromSearchParams(
  params: URLSearchParams,
  fallback: string,
  knownIds: ReadonlySet<string>,
): string {
  const raw = params.get("subject");
  if (raw === null || raw.trim().length === 0) return fallback;
  const id = raw.trim();
  return knownIds.has(id) ? id : fallback;
}

export function buildSubjectSearchParams(subject: string): string {
  const params = new URLSearchParams();
  params.set("subject", subject);
  return `?${params.toString()}`;
}

/** Default catalog from current pragmatic + rusl feedback seeds + walkthrough. */
export function defaultCatalog(): CatalogEntry[] {
  return buildCatalog(
    { ...PRAGMATIC_SCHEMA_SEEDS, ...RUSL_FEEDBACK_SCHEMA_SEEDS },
    [
      {
        id: WALKTHROUGH_ID,
        title: "Walkthrough contact (local)",
        group: "local",
      },
      {
        id: CONTACT_DIRECTORY_ID,
        title: "Contact table (local)",
        group: "local",
      },
    ],
  );
}

export {
  CONTACT_CARD_ID,
  BILLING_INVOICE_ID,
  COMMERCE_PRODUCT_ID,
  MONEY_ID,
  POSTAL_ADDRESS_ID,
  COMMERCE_LINE_ITEM_ID,
  CONTACT_SOCIAL_HANDLE_ID,
  WALKTHROUGH_ID,
  CONTACT_DIRECTORY_ID,
};
