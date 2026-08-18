import { useEffect } from "react";
import { useSurface } from "@rusl-labs/surface";

/**
 * Live channel seeding while fields are mounted (UI parity with Save).
 *
 * - **const** — always write the fixed value.
 * - **default** — always write when the slot is missing (`undefined` / `null`).
 *
 * Save also runs {@link applyConstAndDefaults} so validation never depends on
 * this effect having flushed first.
 */
export function useSeedSchemaValue(): void {
  const { schema, dataApi, data } = useSurface();

  useEffect(() => {
    if (dataApi === undefined || schema === undefined) return;

    if ("const" in schema && schema.const !== undefined) {
      if (data !== schema.const) dataApi.setData(schema.const);
      return;
    }

    if (
      (data === undefined || data === null) &&
      "default" in schema &&
      schema.default !== undefined
    ) {
      dataApi.setData(schema.default);
    }
  }, [dataApi, schema, data]);
}
