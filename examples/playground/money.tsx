/**
 * Playground re-export — money UI lives in `@rusl-labs/surface-html`.
 * `createHtmlKit()` registers MONEY `$id` by default; `moneyKitResolvers`
 * remains for hosts that still pass it explicitly.
 */
export {
  MONEY_ID,
  MoneyDisplay,
  MoneyInput,
  moneyKitResolvers,
  type MoneyValue,
} from "@rusl-labs/surface-html";

export {
  CURRENCY_CODE_ID,
  CURRENCY_CODE_SCHEMA,
  MONEY_SAMPLE,
  MONEY_SCHEMA,
} from "../../tests/fixtures/pragmatic-seeds.ts";
