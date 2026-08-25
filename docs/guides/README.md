# Surface guides

These guides assume you have read the [root README](../../README.md). You know what Surface does and you have seen the money shot.

## Learning path

### 1. Build your first override

Start here. You have a working Surface mount. Now you want to swap one field or one view for your own component.

Read: [Building kits — Register one renderer on an `$id`](./building-kits.md#register-one-renderer-on-an-id)
Time: 5 minutes.

### 2. Understand the renderer contract

You want to write your own renderer from scratch. You need to know about `SurfaceProps`, `useSurface()`, the data channel, and how validity works.

Read: [Building kits — Writing a renderer](./building-kits.md#writing-a-renderer)
Time: 10 minutes.

### 3. Learn the resolution order

You registered a component but it does not fire. You need to understand how the kit picks a renderer: candidate keys, aliases, and fallback.

Read: [Building kits — Candidate keys](./building-kits.md#candidate-keys)
Time: 10 minutes.

### 4. Tweak layout without code

You want to reorder fields, hide some, or add sections — without writing a custom renderer. Use annotations.

Read: [Annotations](../annotation.md)
Time: 15 minutes.

### 5. Build a kit for your design system

You want every Surface mount in your app to use your company's components. You need the full kit contract.

Read: [Building kits — Registry](./building-kits.md#registry)
Time: 20 minutes.

## Reference

| Doc | When to read |
| --- | --- |
| [Building kits](./building-kits.md) | Full kit authoring guide — registry, aliases, candidate keys, renderers, Root |
| [Annotations](../annotation.md) | Annotation model — views, fields, widgets, layout |
| [Implementation status](../implementation.md) | What the runtime does today — capabilities and limits |
| [Annotation DX checklist](./annotation-dx.md) | Maintainer rubric for annotation changes |
