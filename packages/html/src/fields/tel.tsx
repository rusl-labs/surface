import { useEffect, useState, type ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import {
  parsePhoneNumberFromString,
  type CountryCode,
  type PhoneNumber,
} from "libphonenumber-js";
import { surfaceClass, sx } from "../classes.js";
import { useHtmlKitConfig, useKitLocale } from "../kit-config.js";
import {
  controlValidityA11y,
  fieldControlDomId,
  firstIssueMessage,
  visibleFieldIssues,
} from "./channel-errors.js";
import { FieldChrome } from "./chrome.js";
import { FieldError } from "./field-error.js";
import { useFieldMeta } from "./field-meta.js";
import { optionBoolean, optionString } from "./option-expr.js";
import {
  allDialCountries,
  TelCountryField,
} from "./tel-country.js";
import { widgetBag } from "./widget-bag.js";
import type { WidgetProps } from "./widget-props.js";

/**
 * Default-kit tel widget (`name: "tel"` / `$kind` …#/$defs/tel).
 * Input: national or international text; E.164 on the channel when parse works.
 * Display: national (or international) format + `tel:` link via libphonenumber-js.
 */

export type ResolvedTel = {
  readonly href: string;
  readonly text: string;
  /** True when libphonenumber-js parsed the value. */
  readonly parsed: boolean;
};

/** Shown after blur when libphone cannot parse. Schema/AJV stays the authority. */
const UNPARSED_TEL_MESSAGE = "Enter a valid phone number";

function asCountryCode(raw: string | undefined): CountryCode | undefined {
  if (raw === undefined || raw.length !== 2) return undefined;
  return raw.toUpperCase() as CountryCode;
}

function parseTel(
  data: unknown,
  country?: CountryCode,
): PhoneNumber | undefined {
  if (typeof data !== "string") return undefined;
  const raw = data.trim();
  if (raw.length === 0) return undefined;
  const parsed = parsePhoneNumberFromString(
    raw,
    country !== undefined ? { defaultCountry: country } : undefined,
  );
  if (parsed !== undefined && parsed.isValid()) return parsed;
  return undefined;
}

function countryFromWidget(
  params: Record<string, unknown>,
): CountryCode | undefined {
  return asCountryCode(optionString(params, "defaultCountry"));
}

/** Region of a BCP 47 tag, else the runtime locale region. */
export function countryFromLocale(locale?: string): CountryCode | undefined {
  const tag =
    locale !== undefined && locale.trim().length > 0
      ? locale.trim()
      : Intl.DateTimeFormat().resolvedOptions().locale;
  try {
    const region = new Intl.Locale(tag).maximize().region;
    return asCountryCode(region);
  } catch {
    const match = tag.match(/-([A-Za-z]{2})\b/);
    return asCountryCode(match?.[1]);
  }
}

function formatForViewer(parsed: PhoneNumber, locale?: string): string {
  const viewer = countryFromLocale(locale);
  const text =
    viewer !== undefined && parsed.country === viewer
      ? parsed.formatNational()
      : parsed.formatInternational();
  return text.trim().length > 0 ? text : parsed.formatInternational();
}

function codesFromList(raw: unknown): readonly CountryCode[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => asCountryCode(item))
    .filter((item): item is CountryCode => item !== undefined);
}

function countryListFromWidget(
  params: Record<string, unknown>,
  kitCountries?: readonly string[],
): readonly CountryCode[] {
  const annotated = codesFromList(params.countries);
  if (annotated.length > 0) return annotated;
  const fromKit = codesFromList(kitCountries);
  return fromKit.length > 0 ? fromKit : allDialCountries();
}

function resolveDefaultCountry(
  params: Record<string, unknown>,
  kitCountry?: string,
): CountryCode | undefined {
  return countryFromWidget(params) ?? asCountryCode(kitCountry);
}

function draftFromChannel(value: string, country?: CountryCode): string {
  const parsed = parseTel(value, country);
  if (parsed === undefined) return value;
  const national = parsed.formatNational();
  return national.trim().length > 0 ? national : value;
}

/** E.164 (`+14155550100`) when parse succeeds; otherwise undefined. */
export function toE164(
  data: unknown,
  params?: Record<string, unknown>,
): string | undefined {
  return parseTel(data, countryFromWidget(params ?? {}))?.format("E.164");
}

/** Format a phone string for display + dial link. */
export function resolveTel(
  data: unknown,
  params?: Record<string, unknown>,
  locale?: string,
): ResolvedTel | undefined {
  if (typeof data !== "string") return undefined;
  const raw = data.trim();
  if (raw.length === 0) return undefined;

  const parsed = parseTel(data, countryFromWidget(params ?? {}));

  if (parsed !== undefined) {
    return {
      href: parsed.getURI(),
      text: formatForViewer(parsed, locale),
      parsed: true,
    };
  }

  const digits = raw.replace(/^tel:/i, "").trim();
  const href = digits.startsWith("+") || /^\d/.test(digits)
    ? `tel:${digits}`
    : `tel:${digits}`;
  return { href, text: raw.replace(/^tel:/i, "").trim() || raw, parsed: false };
}

function TelValue({ value, widget }: WidgetProps<string>): ReactElement {
  const locale = useKitLocale();
  const tel = resolveTel(value, widget, locale);
  if (tel === undefined) {
    return <span className={surfaceClass.value}>—</span>;
  }
  return (
    <a className={surfaceClass.tel} href={tel.href}>
      {tel.text}
    </a>
  );
}

type TelWidgetProps = WidgetProps<string> & {
  readonly draft: string;
  readonly country: CountryCode | undefined;
  readonly countries: readonly CountryCode[];
  readonly showCountry: boolean;
  readonly onDraft: (raw: string) => void;
  readonly onCountry: (next: CountryCode) => void;
};

function TelWidget({
  draft,
  country,
  countries,
  showCountry,
  widget,
  disabled,
  required,
  invalid,
  controlId,
  name,
  describedBy,
  onDraft,
  onCountry,
  onBlur,
}: TelWidgetProps): ReactElement {
  const locale = useKitLocale();
  const placeholder = optionString(widget, "placeholder");
  const autocomplete = optionString(widget, "autocomplete");

  return (
    <div className={surfaceClass.telRow}>
      {showCountry ? (
        <TelCountryField
          country={country}
          countries={countries}
          locale={locale}
          disabled={disabled}
          onPick={onCountry}
        />
      ) : null}
      <input
        id={controlId}
        type="tel"
        className={sx(
          surfaceClass.control,
          surfaceClass.telInput,
          invalid === true ? surfaceClass.invalid : undefined,
        )}
        name={name}
        required={required}
        disabled={disabled}
        value={draft}
        {...(placeholder !== undefined ? { placeholder } : {})}
        {...(autocomplete !== undefined ? { autoComplete: autocomplete } : {})}
        {...(invalid === true ? { "aria-invalid": true } : {})}
        {...(describedBy !== undefined ? { "aria-describedby": describedBy } : {})}
        onInput={(event) => {
          onDraft(event.currentTarget.value);
        }}
        onBlur={onBlur}
      />
    </div>
  );
}

export function TelDisplay(_props: SurfaceProps): ReactElement {
  const { data, entry } = useSurface();
  const kit = useHtmlKitConfig();
  const params = widgetBag(entry?.widget);
  const value = typeof data === "string" ? data : undefined;
  const displayParams =
    optionString(params, "defaultCountry") !== undefined
      ? params
      : {
          ...params,
          ...(kit.tel?.defaultCountry !== undefined
            ? { defaultCountry: kit.tel.defaultCountry }
            : {}),
        };

  return (
    <FieldChrome as="div" className={surfaceClass.telHost}>
      <TelValue value={value} widget={displayParams} controlId="" />
    </FieldChrome>
  );
}

export function TelInput(_props: SurfaceProps): ReactElement {
  const { id, data, dataApi, validity, formSubmitted, entry } = useSurface();
  const { required } = useFieldMeta();
  const kit = useHtmlKitConfig();
  const params = widgetBag(entry?.widget);
  const annotated = resolveDefaultCountry(params, kit.tel?.defaultCountry);
  const countries = countryListFromWidget(params, kit.tel?.countries);
  const annotatedShow = optionBoolean(params, "showCountry");
  const showCountry =
    annotatedShow ?? kit.tel?.showCountry ?? true;
  const channel = typeof data === "string" ? data : "";
  const parsedChannel = parseTel(channel, annotated);
  const [country, setCountry] = useState<CountryCode | undefined>(
    parsedChannel?.country ?? annotated,
  );
  const [draft, setDraft] = useState(() =>
    draftFromChannel(channel, parsedChannel?.country ?? annotated),
  );
  const [changed, setChanged] = useState(false);
  const [blurred, setBlurred] = useState(false);

  useEffect(() => {
    if (changed) return;
    const parsed = parseTel(channel, annotated);
    setDraft(draftFromChannel(channel, parsed?.country ?? annotated));
    if (parsed?.country !== undefined) setCountry(parsed.country);
  }, [channel, annotated, changed]);

  function writeChannel(
    raw: string,
    nextCountry: CountryCode | undefined,
    keepCountry = false,
  ): void {
    const parsed = parseTel(raw, nextCountry);
    if (parsed !== undefined) {
      const national = parsed.formatNational();
      setDraft(national.trim().length > 0 ? national : raw);
      if (!keepCountry && parsed.country !== undefined) {
        setCountry(parsed.country);
      }
      dataApi?.setData(parsed.format("E.164"));
      return;
    }
    dataApi?.setData(raw);
  }

  const issues = visibleFieldIssues(validity, {
    formSubmitted,
    changed,
    blurred,
  });
  const channelError = firstIssueMessage(issues);
  const parsedDraft = parseTel(draft, country ?? annotated);
  const unparsed = draft.trim().length > 0 && parsedDraft === undefined;
  const showUnparsed =
    (formSubmitted === true || (changed && blurred)) && unparsed;
  const error =
    channelError.length > 0
      ? channelError
      : showUnparsed
        ? UNPARSED_TEL_MESSAGE
        : "";
  const controlDomId = fieldControlDomId(id);
  const a11y = controlValidityA11y(controlDomId, error);

  return (
    <FieldChrome className={surfaceClass.telHost}>
      <TelWidget
        value={channel}
        draft={draft}
        country={country ?? annotated}
        countries={countries}
        showCountry={showCountry}
        widget={params}
        required={required}
        invalid={error.length > 0}
        controlId={a11y.id}
        name={id}
        describedBy={a11y["aria-describedby"]}
        onDraft={(raw) => {
          setChanged(true);
          setDraft(raw);
        }}
        onCountry={(next) => {
          setChanged(true);
          setCountry(next);
          writeChannel(draft, next, true);
          setBlurred(true);
        }}
        onBlur={() => {
          setBlurred(true);
          writeChannel(draft, country ?? annotated);
        }}
      />
      <FieldError controlDomId={controlDomId} message={error} />
    </FieldChrome>
  );
}
