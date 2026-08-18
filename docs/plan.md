# Surface — loose plan

Living direction for the monorepo. Not a sprint backlog; update when priorities change.

## Goal

Make `@rusl-labs/surface` a library that can produce **high-quality, intentional UIs** from JSON Schema + annotations + a kit — not just a clever recursion engine.

## Steps

### 0. Doc authority purge — **done / ongoing**

Remove pre-implementation proposals and process fossils that contradict the runtime. Single living authority:

| Doc | Role |
| --- | --- |
| `docs/implementation.md` | What ships today |
| `docs/annotation.md` | Annotation model (from implementation) |
| `docs/annotation-format.schema.json` | Annotation JSON Schema contract |
| `docs/guides/building-kits.md` | Kit authoring |
| `docs/plan.md` | This file |
| `packages/*/src` | Runtime truth |

No `docs/proposals/` folder and no session-prompt archive.

### 1. High-quality UI capability — **done**

Default HTML kit + playground subject catalog + starter annotations for the
flagship pragmatic subjects. Table, tel, money, link, and density views ship.

### 2. Architecture review — **later**

After publish surfaces real friction: refactor overgrown modules, clarify
boundaries, no speculative abstractions.

### 3. Publish + consumer docs — **now**

Freeze the public API, keep install recipes true, publish `0.1.0`.

## Explicitly deferred

- Design-system kits (shadcn, etc.)
- Expanding the Rusl graph for its own sake

## How to work

1. Prefer code + living docs over proposal archaeology.
2. Prefer improving one real subject UI over abstract generality.
3. No backward-compatibility shims (see repo Agents / SCHEMA policy).
