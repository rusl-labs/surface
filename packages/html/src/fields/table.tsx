import { useEffect, useMemo, useState, type ReactElement } from "react";
import {
  useSurface,
  type Schema,
  type SurfaceProps,
} from "@rusl-labs/surface";
import { surfaceClass } from "../classes.js";
import { FieldChrome } from "./chrome.js";
import { getByPath, isRecord, optionString } from "./option-expr.js";
import { childSurfaceProps } from "./shared.js";
import { widgetBag } from "./widget-bag.js";

type SortDirection = "asc" | "desc";

type TableAlign = "left" | "center" | "right";

type TableColumn = {
  readonly field: string;
  readonly label: string;
  readonly sortable: boolean;
  readonly align: TableAlign;
  readonly fontWeight: string | undefined;
};

const ALIGN = new Set<TableAlign>(["left", "center", "right"]);

function columnAlign(raw: unknown): TableAlign {
  return typeof raw === "string" && ALIGN.has(raw as TableAlign)
    ? (raw as TableAlign)
    : "left";
}

function columnFontWeight(raw: unknown): string | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
  return undefined;
}

function columnStyle(
  col: TableColumn,
): { fontWeight?: string } | undefined {
  if (col.fontWeight === undefined) return undefined;
  return { fontWeight: col.fontWeight };
}

type TableSort = {
  readonly field: string;
  readonly direction: SortDirection;
};

function columnsFromWidget(
  params: Record<string, unknown>,
  itemSchema: Schema | undefined,
): readonly TableColumn[] {
  const raw = params.columns;
  if (Array.isArray(raw) && raw.length > 0) {
    const listed: TableColumn[] = [];
    for (const item of raw) {
      if (!isRecord(item)) continue;
      if (typeof item.field !== "string") continue;
      const field = item.field.trim();
      if (field.length === 0) continue;
      listed.push({
        field,
        label:
          typeof item.label === "string" && item.label.length > 0
            ? item.label
            : field,
        sortable: item.sortable !== false,
        align: columnAlign(item.align),
        fontWeight: columnFontWeight(item.fontWeight),
      });
    }
    if (listed.length > 0) return listed;
  }
  const props = isRecord(itemSchema?.properties)
    ? itemSchema.properties
    : undefined;
  if (props === undefined) return [];
  return Object.keys(props).map((field) => ({
    field,
    label: field,
    sortable: true,
    align: "left" as const,
    fontWeight: undefined,
  }));
}

function sortFromWidget(params: Record<string, unknown>): TableSort | undefined {
  if (!isRecord(params.sort)) return undefined;
  const field = optionString(params.sort, "field");
  if (field === undefined) return undefined;
  return {
    field,
    direction: params.sort.direction === "desc" ? "desc" : "asc",
  };
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return 1;
  if (b === undefined || b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

function useItemSchema(items: unknown): Schema | undefined {
  const { options } = useSurface();
  const [resolved, setResolved] = useState<Schema | undefined>(() => {
    if (!isRecord(items)) return undefined;
    if (typeof items.$ref !== "string") return items as Schema;
    return undefined;
  });

  useEffect(() => {
    if (!isRecord(items)) {
      setResolved(undefined);
      return;
    }
    if (typeof items.$ref !== "string") {
      setResolved(items as Schema);
      return;
    }
    const ref = items.$ref;
    let cancelled = false;
    void options?.schemaResolver.resolveSchema(ref).then((schema) => {
      if (!cancelled && schema !== undefined) setResolved(schema);
    });
    return () => {
      cancelled = true;
    };
  }, [items, options]);

  return resolved;
}

function schemaAtPath(
  itemSchema: Schema | undefined,
  field: string,
): Record<string, unknown> {
  let cur: unknown = itemSchema;
  for (const seg of field.split(".")) {
    if (!isRecord(cur)) return { type: "string" };
    if (/^\d+$/.test(seg)) {
      cur = isRecord(cur.items) ? cur.items : undefined;
      continue;
    }
    const props = isRecord(cur.properties) ? cur.properties : undefined;
    cur = props?.[seg];
  }
  return isRecord(cur) ? cur : { type: "string" };
}

/**
 * Display-only table of an array of objects (`widget:table`).
 * Sort is view state; the data channel stays in wire order.
 */
export function TableDisplay(_props: SurfaceProps): ReactElement | null {
  const { data, schema, entry, Surface, view } = useSurface();
  const params = widgetBag(entry?.widget);
  const itemSchema = useItemSchema(schema?.items);
  const columns = useMemo(
    () => columnsFromWidget(params, itemSchema),
    [params, itemSchema],
  );
  const [sort, setSort] = useState<TableSort | undefined>(() =>
    sortFromWidget(params),
  );

  if (Surface === undefined || columns.length === 0) return null;

  const list = Array.isArray(data) ? data : [];
  const rows =
    sort === undefined
      ? list
      : [...list].sort((a, b) => {
          const cmp = compareValues(
            getByPath(a, sort.field),
            getByPath(b, sort.field),
          );
          return sort.direction === "desc" ? -cmp : cmp;
        });

  return (
    <FieldChrome as="div" className={surfaceClass.tableWrap}>
      <table className={surfaceClass.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.field}
                scope="col"
                className={surfaceClass.th}
                data-align={col.align}
                {...(columnStyle(col) !== undefined
                  ? { style: columnStyle(col) }
                  : {})}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    className={surfaceClass.sort}
                    aria-sort={
                      sort?.field === col.field
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    onClick={() => {
                      setSort((was) => {
                        if (was?.field !== col.field) {
                          return { field: col.field, direction: "asc" };
                        }
                        return {
                          field: col.field,
                          direction: was.direction === "asc" ? "desc" : "asc",
                        };
                      });
                    }}
                  >
                    {col.label}
                    {sort?.field === col.field
                      ? sort.direction === "asc"
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((col) => (
                <td
                  key={col.field}
                  className={surfaceClass.td}
                  data-align={col.align}
                  {...(columnStyle(col) !== undefined
                    ? { style: columnStyle(col) }
                    : {})}
                >
                  <Surface
                    {...childSurfaceProps(
                      col.field,
                      schemaAtPath(itemSchema, col.field),
                      getByPath(row, col.field),
                      "display",
                      view,
                      false,
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </FieldChrome>
  );
}
