import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { surfaceClass, sx } from "../classes.js";

export type TypeaheadClasses = {
  readonly host: string;
  readonly trigger: string;
  readonly menu: string;
  readonly search: string;
  readonly option: string;
};

export function Typeahead<T extends string>({
  items,
  selected,
  disabled,
  filter,
  onPick,
  triggerLabel,
  trigger,
  renderOption,
  searchLabel,
  listLabel,
  searchPlaceholder,
  classes,
}: {
  readonly items: readonly T[];
  readonly selected: T | undefined;
  readonly disabled?: boolean;
  readonly filter: (item: T, query: string) => boolean;
  readonly onPick: (next: T) => void;
  readonly triggerLabel: string;
  readonly trigger: ReactNode;
  readonly renderOption: (item: T) => ReactNode;
  readonly searchLabel: string;
  readonly listLabel: string;
  readonly searchPlaceholder: string;
  readonly classes: TypeaheadClasses;
}): ReactElement {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return items;
    return items.filter((item) => filter(item, q));
  }, [items, query, filter]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    setActive(0);
    function onDoc(event: MouseEvent): void {
      if (rootRef.current?.contains(event.target as Node) !== true) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pick(next: T): void {
    onPick(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className={classes.host}>
      <button
        type="button"
        className={classes.trigger}
        aria-label={triggerLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          setOpen((was) => !was);
        }}
      >
        {trigger}
      </button>
      {open ? (
        <div className={classes.menu} role="presentation">
          <input
            ref={searchRef}
            type="search"
            className={sx(surfaceClass.control, classes.search)}
            placeholder={searchPlaceholder}
            value={query}
            aria-label={searchLabel}
            aria-controls={listId}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
                setQuery("");
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((i) =>
                  Math.min(i + 1, Math.max(filtered.length - 1, 0)),
                );
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
                return;
              }
              if (event.key === "Enter") {
                event.preventDefault();
                const next = filtered[active];
                if (next !== undefined) pick(next);
              }
            }}
          />
          <ul id={listId} role="listbox" aria-label={listLabel}>
            {filtered.map((item, index) => (
              <li key={item} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={item === selected}
                  className={classes.option}
                  data-active={index === active ? "true" : undefined}
                  onMouseEnter={() => {
                    setActive(index);
                  }}
                  onClick={() => {
                    pick(item);
                  }}
                >
                  {renderOption(item)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
