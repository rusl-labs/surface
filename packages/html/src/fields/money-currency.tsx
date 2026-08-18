import { useCallback, type ReactElement } from "react";
import { surfaceClass } from "../classes.js";
import { Typeahead } from "./typeahead.js";

export function currencySymbol(code: string): string {
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? code;
  } catch {
    return code;
  }
}

export function currencyName(code: string, locale?: string): string {
  try {
    return new Intl.DisplayNames(locale, { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * Joined money field: typeahead for ISO code. Options show symbol + code + name.
 */
export function MoneyCurrencyField({
  code,
  codes,
  locale,
  disabled,
  onPick,
}: {
  readonly code: string;
  readonly codes: readonly string[];
  readonly locale?: string;
  readonly disabled?: boolean;
  readonly onPick: (next: string) => void;
}): ReactElement {
  const filter = useCallback(
    (item: string, query: string) => {
      if (item.toLowerCase().includes(query)) return true;
      const name = currencyName(item, locale).toLowerCase();
      const symbol = currencySymbol(item).toLowerCase();
      return name.includes(query) || symbol.includes(query);
    },
    [locale],
  );

  return (
    <Typeahead
      items={codes}
      selected={code}
      disabled={disabled}
      filter={filter}
      onPick={onPick}
      triggerLabel={`Currency ${code}`}
      trigger={code}
      searchLabel="Search currency"
      listLabel="Currencies"
      searchPlaceholder="Search currency"
      classes={{
        host: surfaceClass.moneyCurrencyHost,
        trigger: surfaceClass.moneyCurrency,
        menu: surfaceClass.moneyMenu,
        search: surfaceClass.moneySearch,
        option: surfaceClass.moneyOption,
      }}
      renderOption={(item) => (
        <>
          <span aria-hidden="true">{currencySymbol(item)}</span>
          <strong>{item}</strong>
          <em>{currencyName(item, locale)}</em>
        </>
      )}
    />
  );
}
