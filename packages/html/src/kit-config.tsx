import { createContext, useContext, type ReactNode } from "react";

/** Optional form chrome for the root object in input mode (kit, not annotation). */
export type HtmlFormChrome = {
  /** Default true. */
  readonly enabled?: boolean;
  readonly saveLabel?: string;
  readonly resetLabel?: string;
};

/**
 * Turn a schema property name into UI label text when no annotation label is set.
 * Default is identity (`(name) => name`). Pass a humanizer for Title Case, etc.
 */
export type FieldNameToLabel = (name: string) => string;

export const identityFieldNameToLabel: FieldNameToLabel = (name) => name;

/**
 * Split camelCase / snake_case / digits into words and Title Case.
 * `countryCode` → `Country Code`, `street1` → `Street 1`.
 * Does not rewrite strings that already contain spaces (annotation labels).
 */
export function humanizeFieldName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return trimmed;
  if (/\s/.test(trimmed)) return trimmed;
  const words = trimmed
    .replace(/^\$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (words.length === 0) return trimmed;
  return words.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/** App-wide money presentation. Schema `const` / `enum` on `currency` still wins. */
export type HtmlMoneyDefaults = {
  /** ISO 4217 code when instance data has no currency. Default: `"USD"`. */
  readonly currency?: string;
  /**
   * Allowed codes for the currency select. One entry (or {@link locked})
   * hides the select. Omit to load ISO 4217 via the schema resolver.
   */
  readonly currencies?: readonly string[];
  /** Hide the currency select and always write {@link currency}. */
  readonly locked?: boolean;
  readonly currencyDisplay?: "symbol" | "code" | "name";
};

/** App-wide `Intl` date / time display. Input still uses native date controls. */
export type HtmlDateDefaults = {
  readonly dateStyle?: "short" | "medium" | "long" | "full";
  readonly timeStyle?: "short" | "medium" | "long" | "full";
};

/** App-wide tel presentation. Field widget keys still win when set. */
export type HtmlTelDefaults = {
  /** ISO 3166-1 alpha-2 seed for the flag picker and national parse. */
  readonly defaultCountry?: string;
  /**
   * Restrict the flag picker to these ISO 3166-1 alpha-2 codes.
   * Omit for the full libphonenumber list.
   */
  readonly countries?: readonly string[];
  /** Show the flag / country typeahead. Default true. */
  readonly showCountry?: boolean;
};

export type HtmlKitConfig = {
  readonly form?: HtmlFormChrome;
  /**
   * Format bare property names as labels. Annotation / schema titles win and
   * are not passed through this function. Default: identity.
   */
  readonly fieldNameToLabel?: FieldNameToLabel;
  /** BCP 47 locale for money, numbers, and dates. Default: runtime locale. */
  readonly locale?: string;
  readonly money?: HtmlMoneyDefaults;
  readonly date?: HtmlDateDefaults;
  readonly tel?: HtmlTelDefaults;
};

const HtmlKitConfigContext = createContext<HtmlKitConfig>({});

export function HtmlKitConfigProvider({
  value,
  children,
}: {
  readonly value: HtmlKitConfig;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <HtmlKitConfigContext.Provider value={value}>
      {children}
    </HtmlKitConfigContext.Provider>
  );
}

export function useHtmlKitConfig(): HtmlKitConfig {
  return useContext(HtmlKitConfigContext);
}

/** Resolved fieldNameToLabel (never undefined). */
export function useFieldNameToLabel(): FieldNameToLabel {
  return useHtmlKitConfig().fieldNameToLabel ?? identityFieldNameToLabel;
}

export function useKitLocale(): string | undefined {
  const locale = useHtmlKitConfig().locale;
  return locale !== undefined && locale.length > 0 ? locale : undefined;
}
