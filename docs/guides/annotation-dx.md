# Annotation DX checklist

Use this rubric before merging changes to the Surface annotation format or default-kit vocabulary. Protect expressivity *and* reject ceremony that blocks common UIs.

## Guardian questions

1. **Primitives** — Can an agent express link, block, banner, template, span, and copy without inventing kit code or host React?
2. **Theming** — Is CSS (`--surface-*` variables, `data-surface-*` attrs, opt-in `surface.css`) still the styling path? No hard-coded one-off colors in chrome.
3. **Drip UIs** — Did we add steps that block a contact identity/row/card screen (email mailto, phone display, copyable value, money)?
4. **Layering** — Schema owns shape; annotation owns presentation decisions; kit owns DOM. No smuggling validation, Save/Reset, or business policy into annotations.
5. **`$ref` arrays** — `items.fields` is ignored when items are `$ref`. Relative defs → put widgets on `defs.<name>.views`; absolute `$ref` → a subject annotation for that `$id`.

## Fail closed

- Blocking finding → fix or get an explicit human waiver before merge.
- Prefer additive widget/`$kind` vocabulary over new core engine concepts.
- View names stay open strings; document conventions, do not enum-lock.
