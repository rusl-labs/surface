/**
 * Money renderer for
 * `https://resources.rusl.com/resources/pragmatic/schemas/money`.
 *
 * UI:  [ $ ]  12.34
 * Data: { amount: 1234, currency: "USD" }  // minor units
 *
 * Uses currency.js for minor/major conversion (avoids float footguns).
 * Registered by schema `$id` in createHtmlKit (not a widget kind).
 */
import { useEffect, useRef, useState, type ReactElement } from "react";
import {
  useSurface,
  type RegistryEntry,
  type Schema,
  type SurfaceProps,
  type SurfaceRenderer,
} from "@rusl-labs/surface";
import currency from "currency.js";
import { surfaceClass, sx } from "../classes.js";
import { MONEY_ID } from "../default-kit.js";
import { useHtmlKitConfig, useKitLocale } from "../kit-config.js";
import {
  controlValidityA11y,
  fieldControlDomId,
  firstIssueMessage,
  visibleFieldIssues,
} from "./channel-errors.js";
import { FieldError } from "./field-error.js";
import { currencySymbol, MoneyCurrencyField } from "./money-currency.js";
import { useFieldMeta } from "./field-meta.js";
import { optionString } from "./option-expr.js";
import { widgetBag } from "./widget-bag.js";
import type { WidgetProps } from "./widget-props.js";

export { MONEY_ID };

/** Canonical money payload (ISO minor units). */
export type MoneyValue = {
  readonly amount: number;
  readonly currency: string;
};

export type MoneyWidgetProps = WidgetProps<MoneyValue> & {
  readonly currencies: readonly string[];
  readonly lockedCurrency?: string | undefined;
  readonly defaultCurrency?: string;
  readonly locale?: string | undefined;
  readonly onInvalid?: () => void;
};

const PARSE_ERROR = "Enter a valid amount";

function enumCodes(schema: Schema | undefined): readonly string[] {
  if (!isRecord(schema) || !Array.isArray(schema.enum)) return [];
  return schema.enum.filter(
    (code): code is string => typeof code === "string" && code.length === 3,
  );
}

/** Fallback when Intl does not know the code (most ISO 4217 are 2). */
const MINOR_DIGITS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  BHD: 3,
  KWD: 3,
  OMR: 3,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function minorDigits(code: string): number {
  try {
    const digits = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
    }).resolvedOptions().maximumFractionDigits;
    if (typeof digits === "number") return digits;
  } catch {
    // unknown / non-ISO code
  }
  return MINOR_DIGITS[code.toUpperCase()] ?? 2;
}

export function isMoney(value: unknown): value is MoneyValue {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as MoneyValue).amount === "number" &&
    Number.isFinite((value as MoneyValue).amount) &&
    typeof (value as MoneyValue).currency === "string" &&
    (value as MoneyValue).currency.length === 3
  );
}



/** Minor units → major-unit string for the amount field (no currency symbol). */
export function majorText(amount: number, code: string): string {
  const precision = minorDigits(code);
  return currency(amount, { fromCents: true, precision }).value.toFixed(
    precision,
  );
}

/** Parse user text in major units → minor integer, or null if invalid. */
export function parseMajor(text: string, code: string): number | null {
  const cleaned = text.replace(/,/g, "").trim();
  if (cleaned.length === 0 || cleaned === "-" || cleaned === ".") return null;
  if (!/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const precision = minorDigits(code);
  const c = currency(cleaned, { precision });
  return c.intValue;
}

type CurrencyDisplay = "symbol" | "code" | "name";

function asCurrencyDisplay(raw: unknown): CurrencyDisplay | undefined {
  if (raw === "symbol" || raw === "code" || raw === "name") return raw;
  return undefined;
}

export function formatDisplay(
  value: MoneyValue,
  currencyDisplay?: CurrencyDisplay,
  locale?: string,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: value.currency,
      ...(currencyDisplay !== undefined ? { currencyDisplay } : {}),
    }).format(
      currency(value.amount, {
        fromCents: true,
        precision: minorDigits(value.currency),
      }).value,
    );
  } catch {
    return `${value.currency} ${majorText(value.amount, value.currency)}`;
  }
}

function lockedFromCurrencyNode(node: unknown): string | undefined {
  if (!isRecord(node)) return undefined;
  if (typeof node.const === "string" && node.const.length === 3) {
    return node.const.toUpperCase();
  }
  if (Array.isArray(node.enum) && node.enum.length === 1) {
    const only = node.enum[0];
    if (typeof only === "string" && only.length === 3) {
      return only.toUpperCase();
    }
  }
  if (Array.isArray(node.allOf)) {
    for (const arm of node.allOf) {
      const found = lockedFromCurrencyNode(arm);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/** Schema `const` / single-value `enum` on `currency`, including via allOf. */
export function schemaLockedCurrency(
  schema: Schema | undefined,
): string | undefined {
  if (!isRecord(schema)) return undefined;
  const props = schema.properties;
  if (isRecord(props) && "currency" in props) {
    const locked = lockedFromCurrencyNode(props.currency);
    if (locked !== undefined) return locked;
  }
  if (Array.isArray(schema.allOf)) {
    for (const arm of schema.allOf) {
      const locked = schemaLockedCurrency(arm as Schema);
      if (locked !== undefined) return locked;
    }
  }
  return undefined;
}

function collectCurrencyEnums(
  schema: Schema | undefined,
  into: string[],
): void {
  if (!isRecord(schema)) return;
  const props = schema.properties;
  if (isRecord(props) && isRecord(props.currency)) {
    const listed = props.currency.enum;
    if (Array.isArray(listed) && listed.length > 1) {
      for (const item of listed) {
        if (typeof item === "string" && item.length === 3) {
          into.push(item.toUpperCase());
        }
      }
    }
  }
  if (Array.isArray(schema.allOf)) {
    for (const arm of schema.allOf) {
      collectCurrencyEnums(arm as Schema, into);
    }
  }
}

function bagCurrencyList(
  widget: Record<string, unknown>,
): readonly string[] | undefined {
  const raw = widget.currencies;
  if (!Array.isArray(raw)) return undefined;
  const codes = raw
    .filter((code): code is string => typeof code === "string")
    .map((code) => code.toUpperCase())
    .filter((code) => code.length === 3);
  return codes.length > 0 ? codes : undefined;
}

function currencyOptions(
  schema: Schema | undefined,
  widget: Record<string, unknown>,
  kitList: readonly string[] | undefined,
  resolvedIso: readonly string[],
): readonly string[] {
  const fromSchema: string[] = [];
  collectCurrencyEnums(schema, fromSchema);
  const restrict = bagCurrencyList(widget) ?? kitList;
  const base =
    fromSchema.length > 0
      ? fromSchema
      : kitList !== undefined && kitList.length > 0
        ? kitList
        : resolvedIso;
  if (restrict === undefined) return base;
  if (base.length === 0) return restrict;
  const allowed = new Set(restrict);
  const filtered = base.filter((code) => allowed.has(code));
  return filtered.length > 0 ? filtered : restrict;
}

/** `$ref` on money.properties.currency — follow it; do not hard-code an $id. */
function currencySchemaRef(schema: Schema | undefined): string | undefined {
  if (!isRecord(schema)) return undefined;
  const props = schema.properties;
  if (isRecord(props) && isRecord(props.currency)) {
    if (typeof props.currency.$ref === "string") return props.currency.$ref;
  }
  if (Array.isArray(schema.allOf)) {
    for (const arm of schema.allOf) {
      const found = currencySchemaRef(arm as Schema);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function useResolvedCurrencyCodes(
  schema: Schema | undefined,
): readonly string[] {
  const { options } = useSurface();
  const [codes, setCodes] = useState<readonly string[]>([]);
  const ref = currencySchemaRef(schema);
  useEffect(() => {
    const resolver = options?.schemaResolver;
    if (resolver === undefined || ref === undefined) return;
    let cancelled = false;
    void resolver.resolveSchema(ref).then((resolved) => {
      if (cancelled) return;
      setCodes(enumCodes(resolved));
    });
    return () => {
      cancelled = true;
    };
  }, [options?.schemaResolver, ref]);
  return codes;
}

function moneyEqual(
  a: MoneyValue | undefined,
  b: MoneyValue | undefined,
): boolean {
  if (a === b) return true;
  if (!isMoney(a) || !isMoney(b)) return false;
  return (
    a.amount === b.amount &&
    a.currency.toUpperCase() === b.currency.toUpperCase()
  );
}

/** Presentational amount + currency controls. No useSurface. */
export function MoneyWidget({
  value,
  disabled,
  required,
  invalid,
  controlId,
  name,
  describedBy,
  onChange,
  onBlur,
  currencies,
  lockedCurrency,
  defaultCurrency = "USD",
  locale,
  onInvalid,
}: MoneyWidgetProps): ReactElement {
  const seededCode =
    lockedCurrency ??
    (isMoney(value) ? value.currency.toUpperCase() : defaultCurrency);
  const [code, setCode] = useState(seededCode);
  const [text, setText] = useState(() =>
    isMoney(value) ? majorText(value.amount, value.currency) : "",
  );
  const lastWritten = useRef<MoneyValue | undefined>(
    isMoney(value) ? value : undefined,
  );
  const amountRef = useRef<HTMLInputElement>(null);

  const effectiveCode = lockedCurrency ?? code;

  useEffect(() => {
    if (!isMoney(value)) return;
    if (moneyEqual(value, lastWritten.current)) return;
    lastWritten.current = value;
    setCode(value.currency.toUpperCase());
    setText(majorText(value.amount, value.currency));
  }, [value]);

  function commit(nextCode: string, nextText: string): void {
    const minor = parseMajor(nextText, nextCode);
    if (minor === null) {
      onInvalid?.();
      onBlur?.();
      return;
    }
    const next: MoneyValue = { amount: minor, currency: nextCode };
    lastWritten.current = next;
    setCode(nextCode);
    setText(majorText(minor, nextCode));
    onChange?.(next);
    onBlur?.();
  }

  const symbol = currencySymbol(effectiveCode);
  const selectCodes = currencies.includes(effectiveCode)
    ? currencies
    : [effectiveCode, ...currencies];

  return (
    <div className={surfaceClass.moneyRow}>
      <span
        className={surfaceClass.moneySymbol}
        aria-hidden="true"
        title={effectiveCode}
      >
        {symbol}
      </span>
      <input
        ref={amountRef}
        type="text"
        inputMode="decimal"
        id={controlId}
        className={sx(
          surfaceClass.control,
          surfaceClass.moneyAmount,
          invalid === true ? surfaceClass.invalid : undefined,
        )}
        value={text}
        aria-label={`Amount in ${effectiveCode}`}
        {...(name !== undefined ? { name } : {})}
        {...(disabled === true ? { disabled: true } : {})}
        {...(required === true ? { required: true } : {})}
        {...(invalid === true ? { "aria-invalid": true } : {})}
        {...(describedBy !== undefined ? { "aria-describedby": describedBy } : {})}
        onInput={(event) => {
          setText(event.currentTarget.value);
        }}
        onBlur={(event) => {
          commit(effectiveCode, event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
      />
      {lockedCurrency === undefined ? (
        <MoneyCurrencyField
          code={effectiveCode}
          codes={selectCodes}
          locale={locale}
          disabled={disabled}
          onPick={(next) => {
            setCode(next);
            commit(next, amountRef.current?.value ?? text);
          }}
        />
      ) : null}
    </div>
  );
}

function MoneyDisplayWidget({
  value,
  widget,
  locale,
  currencyDisplay,
}: {
  readonly value: MoneyValue | undefined;
  readonly widget: Record<string, unknown>;
  readonly locale?: string | undefined;
  readonly currencyDisplay?: CurrencyDisplay | undefined;
}): ReactElement {
  if (!isMoney(value)) {
    return (
      <div className={sx(surfaceClass.slot, surfaceClass.money)}>
        <span className={surfaceClass.value}>—</span>
      </div>
    );
  }
  const display =
    asCurrencyDisplay(widget.currencyDisplay) ?? currencyDisplay;
  return (
    <div className={sx(surfaceClass.slot, surfaceClass.money)}>
      <span className={sx(surfaceClass.value, surfaceClass.moneyDisplay)}>
        {formatDisplay(value, display, locale)}
      </span>
    </div>
  );
}

export const MoneyInput: SurfaceRenderer = function MoneyInput(
  _props: SurfaceProps,
): ReactElement {
  const { id, data, schema, dataApi, validity, formSubmitted, entry } =
    useSurface();
  const { required } = useFieldMeta();
  const kit = useHtmlKitConfig();
  const locale = useKitLocale();
  const params = widgetBag(entry?.widget);
  const [changed, setChanged] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const [parseFailed, setParseFailed] = useState(false);
  const resolvedIso = useResolvedCurrencyCodes(schema);

  const issues = visibleFieldIssues(validity, {
    formSubmitted,
    changed,
    blurred,
  });
  const error = parseFailed
    ? PARSE_ERROR
    : firstIssueMessage(issues);
  const controlDomId = fieldControlDomId(id);
  const a11y = controlValidityA11y(controlDomId, error);
  const schemaLocked = schemaLockedCurrency(schema);
  const kitCurrency = kit.money?.currency?.toUpperCase();
  const kitLocked =
    kit.money?.locked === true ||
    (kit.money?.currencies !== undefined && kit.money.currencies.length === 1);
  const lockedCurrency =
    schemaLocked ??
    (kitLocked ? (kitCurrency ?? kit.money?.currencies?.[0]?.toUpperCase()) : undefined);
  const currencies = currencyOptions(
    schema,
    params,
    kit.money?.currencies,
    resolvedIso,
  );
  const defaultCurrency =
    lockedCurrency ??
    optionString(params, "defaultCurrency") ??
    kitCurrency ??
    "USD";

  return (
    <div className={sx(surfaceClass.slot, surfaceClass.money)}>
      <MoneyWidget
        value={isMoney(data) ? data : undefined}
        widget={params}
        required={required}
        invalid={error.length > 0}
        controlId={a11y.id}
        currencies={currencies}
        defaultCurrency={defaultCurrency}
        locale={locale}
        onChange={(next) => {
          setChanged(true);
          setParseFailed(false);
          if (next !== undefined) dataApi?.setData(next);
        }}
        onBlur={() => {
          setBlurred(true);
        }}
        onInvalid={() => {
          setChanged(true);
          setParseFailed(true);
        }}
        {...(id !== undefined ? { name: id } : {})}
        {...(a11y["aria-describedby"] !== undefined
          ? { describedBy: a11y["aria-describedby"] }
          : {})}
        {...(lockedCurrency !== undefined ? { lockedCurrency } : {})}
      />
      <FieldError controlDomId={controlDomId} message={error} />
    </div>
  );
};

export const MoneyDisplay: SurfaceRenderer = function MoneyDisplay(
  _props: SurfaceProps,
): ReactElement {
  const { data, entry } = useSurface();
  const params = widgetBag(entry?.widget);
  const kit = useHtmlKitConfig();
  const locale = useKitLocale();
  return (
    <MoneyDisplayWidget
      value={isMoney(data) ? data : undefined}
      widget={params}
      locale={locale}
      currencyDisplay={kit.money?.currencyDisplay}
    />
  );
};

/** Register against the money schema `$id` so it outranks structural `object`. */
export const moneyKitResolvers: readonly RegistryEntry[] = [
  { key: MONEY_ID, mode: "input", component: MoneyInput },
  { key: MONEY_ID, mode: "display", component: MoneyDisplay },
];
