import { useCallback, type ReactElement } from "react";
import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";
import { surfaceClass } from "../classes.js";
import { Typeahead } from "./typeahead.js";

export function flagEmoji(code: string): string {
  const up = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(up)) return "";
  return String.fromCodePoint(
    ...[...up].map((ch) => 0x1f1e6 - 65 + ch.charCodeAt(0)),
  );
}

export function regionName(code: string, locale?: string): string {
  try {
    return new Intl.DisplayNames(locale, { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function allDialCountries(): readonly CountryCode[] {
  return getCountries();
}

/**
 * Joined tel field: flag + calling-code typeahead.
 */
export function TelCountryField({
  country,
  countries,
  locale,
  disabled,
  onPick,
}: {
  readonly country: CountryCode | undefined;
  readonly countries: readonly CountryCode[];
  readonly locale?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly onPick: (next: CountryCode) => void;
}): ReactElement {
  const filter = useCallback(
    (item: CountryCode, query: string) => {
      if (item.toLowerCase().includes(query)) return true;
      const name = regionName(item, locale).toLowerCase();
      const dial = getCountryCallingCode(item);
      return name.includes(query) || dial.includes(query.replace(/^\+/, ""));
    },
    [locale],
  );

  const flag = country !== undefined ? flagEmoji(country) : "";
  const dial =
    country !== undefined ? `+${getCountryCallingCode(country)}` : undefined;

  return (
    <Typeahead
      items={countries}
      selected={country}
      disabled={disabled}
      filter={filter}
      onPick={onPick}
      triggerLabel={
        country !== undefined
          ? `Country ${regionName(country, locale)}`
          : "Choose country"
      }
      trigger={
        <>
          {flag.length > 0 ? <span aria-hidden="true">{flag}</span> : null}
          <strong>{dial ?? "—"}</strong>
        </>
      }
      searchLabel="Search country"
      listLabel="Countries"
      searchPlaceholder="Search country"
      classes={{
        host: surfaceClass.telCountryHost,
        trigger: surfaceClass.telCountry,
        menu: surfaceClass.telMenu,
        search: surfaceClass.telSearch,
        option: surfaceClass.telOption,
      }}
      renderOption={(item) => (
        <>
          <span aria-hidden="true">{flagEmoji(item)}</span>
          <strong>{item}</strong>
          <em>
            +{getCountryCallingCode(item)} {regionName(item, locale)}
          </em>
        </>
      )}
    />
  );
}
