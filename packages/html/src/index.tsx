import type { ReactElement } from "react";
import {
  createRegistryKit,
  type RegistryEntry,
  type RegistryKit,
  type SurfaceRenderer,
  type SurfaceRoot,
  type SurfaceRootProps,
} from "@rusl-labs/surface";
export { surfaceClass, sx, type SurfaceClass } from "./classes.js";
export {
  FieldChrome,
  HeadingChrome,
  SectionChrome,
  TemplateChrome,
  BlockChrome,
  BannerChrome,
  SpanChrome,
} from "./fields/chrome.js";
export type {
  FieldNameToLabel,
  HtmlDateDefaults,
  HtmlFormChrome,
  HtmlKitConfig,
  HtmlMoneyDefaults,
  HtmlTelDefaults,
} from "./kit-config.js";
export {
  humanizeFieldName,
  identityFieldNameToLabel,
} from "./kit-config.js";
export { HtmlRoot } from "./fields/root.js";
export {
  MoneyInput,
  MoneyDisplay,
  isMoney,
  formatDisplay as formatMoneyDisplay,
  type MoneyValue,
} from "./fields/money.js";
export { resolveTel, type ResolvedTel } from "./fields/tel.js";
import {
  HtmlKitConfigProvider,
  identityFieldNameToLabel,
  type HtmlKitConfig,
} from "./kit-config.js";
import { HTML_KIT_ALIASES, MONEY_ID } from "./default-kit.js";
import {
  AllOfDisplay,
  AllOfInput,
  ArrayDisplay,
  ArrayInput,
  BooleanDisplay,
  BooleanInput,
  ConstDisplay,
  ConstInput,
  CopyDisplay,
  CopyInput,
  EmailDisplay,
  EmailInput,
  EnumDisplay,
  EnumInput,
  Fallback,
  LinkDisplay,
  LinkInput,
  MediaDisplay,
  MediaInput,
  MoneyDisplay,
  MoneyInput,
  NumberDisplay,
  NumberInput,
  ObjectDisplay,
  ObjectInput,
  StringDisplay,
  StringInput,
  TelDisplay,
  TelInput,
  TableDisplay,
  UnionDisplay,
  UnionInput,
  UriDisplay,
  UriInput,
} from "./fields/index.js";
import {
  KitDateDisplay,
  KitDateInput,
  KitDateTimeDisplay,
  KitDateTimeInput,
  KitInputDisplay,
  KitInputInput,
} from "./fields/typed-string.js";
import { HtmlRoot } from "./fields/root.js";

export {
  DEFAULT_KIT_COPY,
  DEFAULT_KIT_DATE,
  DEFAULT_KIT_DATETIME,
  DEFAULT_KIT_EMAIL,
  DEFAULT_KIT_ID,
  DEFAULT_KIT_INPUT,
  DEFAULT_KIT_KINDS,
  DEFAULT_KIT_LINK,
  DEFAULT_KIT_MEDIA,
  DEFAULT_KIT_TEL,
  DEFAULT_KIT_TABLE,
  HTML_KIT_ALIASES,
  MONEY_ID,
  PHONE_ID,
} from "./default-kit.js";

function perMode(
  key: string,
  input: SurfaceRenderer,
  display: SurfaceRenderer,
): RegistryEntry[] {
  return [
    { key, mode: "input", component: input },
    { key, mode: "display", component: display },
  ];
}

function rootWithConfig(
  config: HtmlKitConfig,
  Root: SurfaceRoot,
): SurfaceRoot {
  function Bound(props: SurfaceRootProps): ReactElement {
    return (
      <HtmlKitConfigProvider value={config}>
        <Root {...props} />
      </HtmlKitConfigProvider>
    );
  }
  Bound.displayName = "HtmlKit(Root)";
  return Bound;
}

export type HtmlKitOptions = HtmlKitConfig & {
  readonly resolvers?: readonly RegistryEntry[];
  /** Extra keys that reuse a registered name. Host entries override defaults. */
  readonly aliases?: Readonly<Record<string, string>>;
};

/**
 * HTML kit: string/number/integer/boolean/const/object/array/allOf/oneOf/anyOf.
 * Root form chrome is kit.Root (wraps any body: object, allOf, $id, …).
 * Configured entries are appended after the defaults, so they win.
 */
export function createHtmlKit(options: HtmlKitOptions = {}): RegistryKit {
  const config: HtmlKitConfig = {
    ...(options.form !== undefined ? { form: options.form } : {}),
    fieldNameToLabel: options.fieldNameToLabel ?? identityFieldNameToLabel,
    ...(options.locale !== undefined ? { locale: options.locale } : {}),
    ...(options.money !== undefined ? { money: options.money } : {}),
    ...(options.date !== undefined ? { date: options.date } : {}),
    ...(options.tel !== undefined ? { tel: options.tel } : {}),
  };

  const defaults: readonly RegistryEntry[] = [
    ...perMode("string", StringInput, StringDisplay),
    ...perMode("number", NumberInput, NumberDisplay),
    ...perMode("integer", NumberInput, NumberDisplay),
    ...perMode("boolean", BooleanInput, BooleanDisplay),
    ...perMode("array", ArrayInput, ArrayDisplay),
    ...perMode("oneOf", UnionInput, UnionDisplay),
    ...perMode("anyOf", UnionInput, UnionDisplay),
    ...perMode("const", ConstInput, ConstDisplay),
    ...perMode("enum", EnumInput, EnumDisplay),
    ...perMode("object", ObjectInput, ObjectDisplay),
    ...perMode("allOf", AllOfInput, AllOfDisplay),
    ...perMode("media", MediaInput, MediaDisplay),
    ...perMode("link", LinkInput, LinkDisplay),
    ...perMode("email", EmailInput, EmailDisplay),
    ...perMode("uri", UriInput, UriDisplay),
    ...perMode("tel", TelInput, TelDisplay),
    ...perMode("copy", CopyInput, CopyDisplay),
    { key: "table", mode: "display", component: TableDisplay },
    ...perMode("input", KitInputInput, KitInputDisplay),
    ...perMode("date", KitDateInput, KitDateDisplay),
    ...perMode("datetime", KitDateTimeInput, KitDateTimeDisplay),
    ...perMode(MONEY_ID, MoneyInput, MoneyDisplay),
  ];

  return createRegistryKit({
    fallback: Fallback,
    Root: rootWithConfig(config, HtmlRoot),
    aliases: { ...HTML_KIT_ALIASES, ...options.aliases },
    resolvers: [...defaults, ...(options.resolvers ?? [])],
  });
}
