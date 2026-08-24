/**
 * Default HTML kit widget vocabulary.
 * Schema: `packages/html/schemas/default-kit.schema.json`
 * Published as `@rusl-labs/surface-html/schemas/default-kit.schema.json`.
 */

/** Document `$id` for the default kit vocabulary. */
export const DEFAULT_KIT_ID =
  "https://resources.rusl.com/resources/surface/schemas/default-kit";

export const DEFAULT_KIT_INPUT = `${DEFAULT_KIT_ID}#/$defs/input`;
export const DEFAULT_KIT_DATE = `${DEFAULT_KIT_ID}#/$defs/date`;
export const DEFAULT_KIT_DATETIME = `${DEFAULT_KIT_ID}#/$defs/datetime`;
export const DEFAULT_KIT_MEDIA = `${DEFAULT_KIT_ID}#/$defs/media`;
export const DEFAULT_KIT_LINK = `${DEFAULT_KIT_ID}#/$defs/link`;
export const DEFAULT_KIT_EMAIL = `${DEFAULT_KIT_ID}#/$defs/email`;
export const DEFAULT_KIT_TEL = `${DEFAULT_KIT_ID}#/$defs/tel`;
export const DEFAULT_KIT_COPY = `${DEFAULT_KIT_ID}#/$defs/copy`;
export const DEFAULT_KIT_TABLE = `${DEFAULT_KIT_ID}#/$defs/table`;

/**
 * Pragmatic money schema `$id` — HTML kit registers this as an `$id` widget
 * (currency.js). No annotation required; not a default-kit `$defs` kind.
 */
export const MONEY_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/money";

/** Phone scalar `$id` — kit map key only; the schema is not vendored here. */
export const PHONE_ID =
  "https://resources.rusl.com/resources/pragmatic/schemas/contact.scalars#/$defs/phone";

/** All kind URIs this kit registers by default. */
export const DEFAULT_KIT_KINDS = {
  input: DEFAULT_KIT_INPUT,
  date: DEFAULT_KIT_DATE,
  datetime: DEFAULT_KIT_DATETIME,
  media: DEFAULT_KIT_MEDIA,
  link: DEFAULT_KIT_LINK,
  email: DEFAULT_KIT_EMAIL,
  tel: DEFAULT_KIT_TEL,
  copy: DEFAULT_KIT_COPY,
  table: DEFAULT_KIT_TABLE,
} as const;

/**
 * Extra map keys that reuse a short registration.
 * `widget.$kind` URIs and well-known formats hit the same components.
 */
export const HTML_KIT_ALIASES: Readonly<Record<string, string>> = {
  [DEFAULT_KIT_MEDIA]: "media",
  [DEFAULT_KIT_LINK]: "link",
  [DEFAULT_KIT_EMAIL]: "email",
  [DEFAULT_KIT_TEL]: "tel",
  [DEFAULT_KIT_COPY]: "copy",
  [DEFAULT_KIT_TABLE]: "table",
  [DEFAULT_KIT_INPUT]: "input",
  [DEFAULT_KIT_DATE]: "date",
  [DEFAULT_KIT_DATETIME]: "datetime",
  [PHONE_ID]: "tel",
  "date-time": "datetime",
  "idn-email": "email",
  "uri-reference": "uri",
  iri: "uri",
  "iri-reference": "uri",
};
