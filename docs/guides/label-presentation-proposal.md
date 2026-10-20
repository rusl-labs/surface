# Label presentation: proposed contract, not implemented

Status: blocked on an authorized annotation-schema publication. This is review
material, **not** a parallel schema or a supported runtime contract.

The installed `rusl/schemas/surface.annotation@0.1.0` disallows `labelDisplay`.
Its view, bound-entry, item-entry, and mode-override definitions all use
`additionalProperties: false`. Do not send the examples below to current Surface
and assume they work. Validate annotations against the pinned envelope to detect
unsupported properties; core is validator-agnostic and is not that validator.

## Approval and publication dependency

`labelDisplay` fits the existing camelCase decoration vocabulary (`itemLabel`,
`addLabel`) and avoids overloading `label`, `hidden` (data participation), or
`display` (a mode-override object).

Proposed authoritative schema delta for review:

- Introduce a shared label-display definition with string values `visible`,
  `hidden`, and `placeholder`.
- Add `labelDisplay` to view, bound-entry, item-entry, and mode-override properties.
- Allow `null` on decoration locations (bound-entry, item-entry, mode-override)
  to clear inherited decoration, consistent with existing decoration merging.
- Keep view values non-null, consistent with existing view-level chrome.
- Do not add this property directly to structural headings/sections: it governs
  labels of data controls, not arbitrary prose or structural chrome. Since
  `modeOverride` is shared, adding it there also admits the key under structural
  entries' `input`/`display` objects. Under this proposal it has no effect there;
  structural groups remain transparent. The schema maintainer must approve that
  detail or narrow the mode-override references before publication.

A maintainer must arrange an approved new published schema version under the
repository's access policy. Merely approving this document does not authorize
registry writes by the agent. Then update `rusl.bundle.toml`, run `rusl install`,
and review the generated lock and snapshots together. Only then implement the
runtime/types/tests below. No registry write or vendored edit was made here.

### Concrete maintainer action

The dependency was rechecked with `rusl list --tree`, `rusl outdated`, and
read-only `rusl search surface.annotation --type schema --view full`. The pin is
still `0.1.0`; `outdated` reported `Everything is up to date!`. No approved newer
contract was found by these checks.

| Item | Required action / identity |
| --- | --- |
| Resource | `rusl/schemas/surface.annotation` |
| Registry GUID | `schemas.46a308c3-da2a-429d-9d2c-4dee73d9ff6e` |
| Schema `$id` | `https://resources.rusl.com/resources/rusl/schemas/surface.annotation` |
| Current installed version | `0.1.0` |
| Proposed publication target | `0.2.0` (new pre-1.0 feature contract; **not published or reserved**) |
| Actor | A maintainer authorized to publish/accept versions of this resource in the `rusl` account |
| Approval needed | The schema delta above and resolution/naming semantics below, including null clearing and reference boundaries |

Publish an approved version derived from `0.1.0`, with these exact schema
locations changed (not the local vendored snapshot):

- `/$defs/labelDisplay`: new string enum `visible`, `hidden`, `placeholder`.
- `/$defs/view/properties/labelDisplay`: reference that enum.
- `/$defs/boundEntry/properties/labelDisplay`,
  `/$defs/itemEntry/properties/labelDisplay`, and
  `/$defs/modeOverride/properties/labelDisplay`: enum reference or null.
- Update the authoritative descriptions to specify the approved inheritance,
  mode, runtime-chrome, and clearing semantics.

No subject-schema or default-kit-schema publication is required. Keep the
existing standalone heading/section definitions intact. Do not create an
alternate annotation resource with a different identity.

The maintainer should return **the accepted version number and registry version
URL/identifier**, not just permission to implement. If `0.2.0` is used, the local
follow-up is:

1. Change only the annotation resource pin in `rusl.bundle.toml` from `0.1.0` to
   `0.2.0`; leave `surface.default-kit` at its existing version.
2. Run `rusl install` and review `rusl.lock` and the generated annotation snapshot.
3. Confirm the published contract matches the approved semantics before adding
   runtime support. If publication differs, reconcile the proposal first.
4. Implement types, resolution, public helpers, traversal state, and the required
   tests below; run `bun run check` and build a versioned package.

If the agent is expected to perform publication instead, a **developer-level
change to the read-only Rusl policy** is required, with the resource and permitted
write actions explicitly scoped. A user request to finish the feature does not
supersede that policy. Until an accepted schema is available, label-policy
implementation remains blocked, not completed.

## Proposed syntax

```json
{
  "subject": "https://example.com/schemas/contact.json",
  "views": {
    "default": {
      "labelDisplay": "placeholder",
      "fields": [
        { "name": "email", "label": "Email address", "widget": { "name": "email" } },
        {
          "name": "phone", "label": "Contact phone",
          "input": { "labelDisplay": "placeholder" },
          "display": { "labelDisplay": "visible" }
        },
        { "name": "available", "label": "Available for contact", "labelDisplay": "visible" }
      ]
    }
  }
}
```

## Proposed resolution rules

1. Baseline policy is `visible`. A view's policy is decoration: a named view
   inherits the default view's policy when absent, independently of field layout.
2. Field decoration merges in the existing order: default-view field, selected
   view field, default-view active-mode override, selected-view active-mode
   override. Last supplied value wins; `null` removes that field-level value,
   exposing the containing scope's policy. An explicit `visible` overrides a
   view default of `hidden` or `placeholder`.
3. The resulting policy flows through nested objects and inline array items.
   An inline `items.labelDisplay` (including active-mode override) takes
   precedence over the array's inherited policy. Nested field overrides win over
   that inherited policy. Structural groups are transparent to this inheritance.
4. At a `$ref` / `$defs` boundary, the target's selected/default view policy
   supplies its local default; an explicit use-site field/item override wins
   for the referenced node. If neither is supplied, inherit the containing
   scope. The resolved node policy becomes its descendants' fallback; explicit
   descendant decorations still win. Do not propagate the referencing view's
   layout into the referenced type. Referenced items remain annotated on their
   target, not through inline item fields.
5. Runtime `labels` stays a separate inherited chrome switch: root defaults to
   `true`, and each child uses `labelsProp ?? parent.labels ?? true`. Thus a child
   explicitly passing `labels={true}` can re-enable chrome. `false` forces the
   effective label policy to `hidden` regardless of annotation, and retains its
   existing description-suppression behavior. It must not erase label text or
   accessible naming information. Re-enabling runtime chrome does not erase an
   annotation-level `hidden` policy.
6. In display mode, `placeholder` resolves to `visible`. In input mode it remains
   `placeholder`, since only the kit knows the control's capabilities.

## Proposed public kit APIs and naming

Keep `resolveLabel()` and `helpers.label()` unchanged: an explicit empty string
continues to return an empty string. Do not conflate presentation policy with
label content, and do not introduce widget-option parsing in core.

Add pure `resolveLabelDisplay()` and context-bound `helpers.labelDisplay()` with
resolved `visible | hidden | placeholder` output, plus the corresponding
resolved annotation decoration. Preserve scope policy separately from the runtime
chrome switch so descendants can re-enable chrome correctly.

A separate `resolveAccessibleLabel()` / `helpers.accessibleLabel()` is needed:
visible labels can intentionally be empty while input controls still need names.
Proposed fallback order: nonblank effective label, nonblank target view label,
nonblank schema title, bound property name, then existing item naming (`Item N`).
Never fall back to placeholder text, selected values, entered data, or schema
URIs for a name. Naming must remain stable after the user enters a value. Anonymous subject
roots without meaningful metadata may still return empty: kits/applications must
supply an external accessible name in that case, not invent a semantic name.
The helper must retain property identity at ref boundaries rather than substituting
the ref URI. No new serialized accessible-label property is proposed.

Kit responsibilities:

- `visible`: render the normal label, respecting an intentionally empty label.
- `hidden`: suppress visible label chrome and provide an accessible name.
- `placeholder` in input mode: use label text only for placeholder-capable
  controls. An explicitly supplied placeholder (including an empty one) wins.
  Checkboxes, switches, and other ineligible controls keep visible labels.
- Placeholder text is never sufficient accessibility: use an associated label,
  `aria-label`, or `aria-labelledby`. Core does not choose DOM mechanisms.

## Required follow-up checks

After schema publication, test schema acceptance and invalid values first, then
view/field/mode precedence, named-view fallback and null clearing; nested object,
inline item, local `$defs` and external `$ref` traversal; runtime `labels={false}`
and child re-enabling; meaningful names with empty/hidden labels; public helper
exports and context helpers. Existing empty-label semantics must remain unchanged.
These label-policy tests have **not** passed or been implemented in this patch:
there is no authorized schema to implement them against yet.

## Compatibility and dependency handoff

Standalone presentation is implemented independently under the existing envelope;
see [the supported syntax](../annotation.md#standalone-presentation-entries).
The public `FieldChild` heading branch gains optional widget/description/layout/
direction metadata; no new union discriminant is introduced. Kits must handle
heading widgets to paint them. Existing text headings, sections, templates, and
bound fields retain their behavior. Old core versions silently drop empty-label
standalone entries, so updating only a kit is insufficient.

The work is based on core `0.1.1`, HEAD
`3f08ee1e84f2741ce7e2f00472508b418825d85b`. The standalone fix and this handoff
are committed together; locate the commit with
`git log -1 --format=%H -- packages/core/src/helpers-list.ts`.
No registry package publication or version bump is performed here.

For an identifiable standalone-only distributable, pack `packages/core` after
building/testing, name the tarball with that source commit, and record its SHA-256.
Install the tarball directly and commit the consumer's dependency lockfile; do
not substitute a registry dependency on `0.1.1`. Although the embedded package
version is still `0.1.1`, the tarball digest identifies its exact bytes and the
commit identifies its source. Preserve the artifact in your deployment artifact
store. A local absolute path alone is not a portable deployment dependency.

A future registry release must use a new package version (for example `0.1.2`
for the standalone-only fix, subject to maintainer release policy). Label policy
needs a subsequent approved schema and runtime release and is not available from
this checkout. Neither the tarball nor the standalone commit unblocks label
policy. Do not replace the kit's temporary accessible-name derivation until the
core helpers are actually implemented and tested.
