import type { ReactElement, ReactNode } from "react";
import {
  useSurface,
  type FieldChild,
  type FieldDirection,
  type FieldLayout,
  type SurfaceComponent,
  type SurfaceProps,
} from "@rusl-labs/surface";
import { surfaceClass, sx } from "../classes.js";
import {
  BannerChrome,
  BlockChrome,
  HeadingChrome,
  SectionChrome,
  SpanChrome,
  TemplateChrome,
} from "./chrome.js";
import { FieldMetaProvider } from "./field-meta.js";
import { useFieldNameToLabel } from "../kit-config.js";
import { IconButton } from "./icon-button.js";
import { PlusIcon, TrashIcon } from "./icons.js";
import { resolveAddCaption } from "./option-expr.js";
import {
  formatPropertyLabel,
  isRecord,
  isSchemaUri,
  isSyntheticFieldId,
  useAllOfPropertyVisible,
} from "./shared.js";

/**
 * Whether to paint object title/description for this mount.
 *
 * - **Root** — subject title (schema / annotation view).
 * - **Property mount** — property name (or annotation label); id is the name.
 * - **Nested absolute `$id`** (e.g. oneOf `$ref` branch) — suppress. Parent
 *   chrome already names the variant (union select).
 * - **Synthetic ids** (array indices, allOf:N) — suppress. Parent list / union
 *   chrome already situates the item; schema titles like "Social/messaging
 *   handle" must not shout inside a contact form.
 */
function showObjectChrome(
  isRoot: boolean | undefined,
  id: string | undefined,
  title: string,
): boolean {
  if (title.length === 0) return false;
  if (isRoot === true) return true;
  if (id !== undefined && isSchemaUri(id)) return false;
  if (id !== undefined && isSyntheticFieldId(id)) return false;
  return true;
}

function ObjectShell({
  children,
  layout = "props",
  direction = "vertical",
}: {
  readonly children: ReactNode;
  readonly layout?: FieldLayout;
  readonly direction?: FieldDirection;
}): ReactElement | null {
  const { schema, helpers, isRoot, id } = useSurface();
  if (schema === undefined || helpers === undefined) return null;

  const title = helpers.label();
  const description = helpers.description();
  const chrome = showObjectChrome(isRoot, id, title);
  const bodyClass = sx(
    surfaceClass.objectBody,
    layout === "stack" ? surfaceClass.layoutStack : surfaceClass.layoutProps,
    direction === "horizontal"
      ? surfaceClass.directionHorizontal
      : surfaceClass.directionVertical,
  );

  return (
    <div
      className={sx(
        surfaceClass.object,
        layout === "stack" ? surfaceClass.layoutStack : surfaceClass.layoutProps,
        direction === "horizontal"
          ? surfaceClass.directionHorizontal
          : surfaceClass.directionVertical,
      )}
      data-surface-layout={layout}
      data-surface-direction={direction}
    >
      {chrome ? <div className={surfaceClass.title}>{title}</div> : null}
      {chrome && description.length > 0 ? (
        <p className={surfaceClass.description}>{description}</p>
      ) : null}
      <div className={bodyClass}>{children}</div>
    </div>
  );
}

function requiredNames(schema: {
  readonly required?: unknown;
}): ReadonlySet<string> {
  return new Set(
    Array.isArray(schema.required)
      ? schema.required.filter(
          (name): name is string => typeof name === "string",
        )
      : [],
  );
}

function propertyForLayout(
  layout: FieldLayout,
  mode: "input" | "display",
): typeof ObjectPropertyInput | typeof ObjectPropertyDisplay {
  if (mode === "input") return ObjectPropertyInput;
  return layout === "stack" ? ObjectPropertyStack : ObjectPropertyDisplay;
}

function renderChildren(
  children: readonly FieldChild[],
  Surface: SurfaceComponent,
  required: ReadonlySet<string>,
  mode: "input" | "display",
  layout: FieldLayout,
): ReactNode {
  const Property = propertyForLayout(layout, mode);
  return children.map((child) => {
    switch (child.kind) {
      case "section": {
        const childLayout = child.layout ?? layout;
        const childDirection = child.direction ?? "vertical";
        const nested = renderChildren(
          child.children(),
          Surface,
          required,
          mode,
          childLayout,
        );
        return (
          <SectionChrome
            key={child.key}
            label={child.label}
            layout={childLayout}
            direction={childDirection}
            {...(child.description !== undefined
              ? { description: child.description }
              : {})}
          >
            {mode === "display" && childLayout === "props" ? (
              <dl className={surfaceClass.dl}>{nested}</dl>
            ) : (
              nested
            )}
          </SectionChrome>
        );
      }
      case "heading":
        return <HeadingChrome key={child.key} label={child.label} />;
      case "template":
        return <TemplateChrome key={child.key} text={child.text} />;
      case "block":
      case "banner":
      case "span": {
        const childLayout = child.layout ?? layout;
        const childDirection = child.direction ?? "vertical";
        const nested = renderChildren(
          child.children(),
          Surface,
          required,
          mode,
          childLayout,
        );
        const Chrome =
          child.kind === "block"
            ? BlockChrome
            : child.kind === "banner"
              ? BannerChrome
              : SpanChrome;
        return (
          <Chrome
            key={child.key}
            layout={childLayout}
            direction={childDirection}
            {...(child.label !== undefined ? { label: child.label } : {})}
            {...(child.description !== undefined
              ? { description: child.description }
              : {})}
            {...(child.text !== undefined ? { text: child.text } : {})}
          >
            {mode === "display" && childLayout === "props" ? (
              <dl className={surfaceClass.dl}>{nested}</dl>
            ) : (
              nested
            )}
          </Chrome>
        );
      }
      case "field":
        if (child.hidden === true) {
          // Display: nothing to show.
          // Input: still mount Surface so const/default seeders run. A dumb
          // <input type="hidden"> only mirrors current data and never writes
          // schema const ($kind, countryCode) into the channel — which broke Save.
          if (mode === "display") return null;
          return (
            <Surface
              key={child.key}
              {...child.surface}
              mode="input"
            />
          );
        }
        return (
          <Property
            key={child.key}
            name={child.surface.id}
            label={child.label}
            propSchema={child.surface.schema ?? {}}
            value={child.surface.data}
            required={required.has(child.surface.id)}
            surface={child.surface}
            Surface={Surface}
          />
        );
    }
  });
}

/**
 * Match const stealth for `$kind` — type metadata, not a display field
 * (unless annotation explicitly surfaces it).
 */
function isStealthKind(
  name: string,
  entry: SurfaceProps["entry"],
): boolean {
  if (name !== "$kind") return false;
  if (entry?.hidden === false) return false;
  if (entry?.description !== undefined) return false;
  if (entry?.label !== undefined && entry.label !== "$kind") return false;
  return true;
}

function isEmptyDisplayValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function branchLooksStructured(branch: unknown): boolean {
  if (!isRecord(branch)) return false;
  if (branch.type === "object") return true;
  if (typeof branch.$ref === "string") return true;
  if (Array.isArray(branch.allOf)) return true;
  if (Array.isArray(branch.oneOf) || Array.isArray(branch.anyOf)) return true;
  return false;
}

/**
 * Optional structured properties need a presence toggle in input mode.
 * Scalars and arrays keep their own empty UX.
 */
function needsPresenceToggle(
  propSchema: Record<string, unknown>,
  required: boolean,
): boolean {
  if (required) return false;
  if (propSchema.type === "object") return true;
  if (typeof propSchema.$ref === "string") return true;
  if (Array.isArray(propSchema.allOf)) return true;
  const union = propSchema.oneOf ?? propSchema.anyOf;
  if (Array.isArray(union)) {
    return union.some(branchLooksStructured);
  }
  return false;
}

type PropertyProps = {
  name: string;
  /** Effective use-site label from helpers.fields(). */
  label: string;
  propSchema: unknown;
  value: unknown;
  required: boolean;
  surface: SurfaceProps;
  Surface: SurfaceComponent;
};

/** Input: optional structured props get Add / Remove presence chrome. */
function ObjectPropertyInput({
  name,
  label: fieldChildLabel,
  propSchema,
  value,
  required,
  surface,
  Surface,
}: PropertyProps): ReactElement | null {
  const { dataApi, labels } = useSurface();
  const fieldNameToLabel = useFieldNameToLabel();
  const visible = useAllOfPropertyVisible(name);
  if (!isRecord(propSchema) || !visible) return null;

  const resolved = labels === false ? "" : fieldChildLabel;
  const label = formatPropertyLabel(name, resolved, fieldNameToLabel);
  const presence = needsPresenceToggle(propSchema, required);
  const present = value !== undefined && value !== null;
  const addCaption = resolveAddCaption(surface.entry?.addLabel, value);

  if (presence && !present) {
    return (
      <div className={surfaceClass.group}>
        {label.length > 0 ? (
          <span className={surfaceClass.label}>{label}</span>
        ) : null}
        <IconButton
          kind="add"
          label={
            addCaption.length > 0
              ? addCaption
              : `Add ${label.length > 0 ? label : name}`
          }
          caption={addCaption}
          onClick={() => {
            dataApi?.setChild(name, {});
          }}
        >
          <PlusIcon />
        </IconButton>
      </div>
    );
  }

  const fieldData = present
    ? value
    : required
      ? undefined
      : null;

  return (
    <div className={surfaceClass.slot}>
      {presence && present ? (
        <div className={surfaceClass.group}>
          <div className={surfaceClass.groupHeader}>
            {label.length > 0 ? (
              <span className={surfaceClass.label}>{label}</span>
            ) : null}
            <IconButton
              kind="remove"
              label={`Remove ${label.length > 0 ? label : name}`}
              onClick={() => {
                // Omit the key (undefined → delete). null is a present value.
                dataApi?.setChild(name, undefined);
              }}
            >
              <TrashIcon />
            </IconButton>
          </div>
          <FieldMetaProvider required={required}>
            <Surface
              {...surface}
              {...(fieldData !== undefined ? { data: fieldData } : {})}
            />
          </FieldMetaProvider>
        </div>
      ) : (
        <FieldMetaProvider required={required}>
          <Surface
            {...surface}
            {...(fieldData !== undefined ? { data: fieldData } : {})}
          />
        </FieldMetaProvider>
      )}
    </div>
  );
}

/**
 * Display: one definition-list row — property label (`dt`) + value (`dd`).
 * Child surfaces omit their own labels so we never get label/label/value.
 */
function ObjectPropertyDisplay({
  name,
  label: fieldChildLabel,
  propSchema,
  value,
  required,
  surface,
  Surface,
}: PropertyProps): ReactElement | null {
  const { labels } = useSurface();
  const fieldNameToLabel = useFieldNameToLabel();
  const visible = useAllOfPropertyVisible(name);
  if (!isRecord(propSchema) || !visible) return null;
  if (isStealthKind(name, surface.entry)) return null;

  const resolved = labels === false ? "" : fieldChildLabel;
  const label = formatPropertyLabel(name, resolved, fieldNameToLabel);
  const presence = needsPresenceToggle(propSchema, required);
  const present = value !== undefined && value !== null;

  if (presence && !present) return null;
  if (!present && !required) return null;
  // Skip blank optional scalars / empty arrays in display.
  if (!required && isEmptyDisplayValue(value)) return null;

  const fieldData = present
    ? value
    : required
      ? undefined
      : null;

  return (
    <div className={surfaceClass.prop}>
      {label.length > 0 ? (
        <dt className={surfaceClass.label}>{label}</dt>
      ) : null}
      <dd
        className={surfaceClass.propValue}
        {...(label.length === 0 ? { style: { gridColumn: "1 / -1" } } : {})}
      >
        <FieldMetaProvider required={required} omitLabel>
          <Surface
            {...surface}
            {...(fieldData !== undefined ? { data: fieldData } : {})}
          />
        </FieldMetaProvider>
      </dd>
    </div>
  );
}

/**
 * Display stack layout: full-width block — optional label above value.
 * Used for heroes, cards, and other non–definition-list presentations.
 */
function ObjectPropertyStack({
  name,
  label: fieldChildLabel,
  propSchema,
  value,
  required,
  surface,
  Surface,
}: PropertyProps): ReactElement | null {
  const { labels } = useSurface();
  const fieldNameToLabel = useFieldNameToLabel();
  const visible = useAllOfPropertyVisible(name);
  if (!isRecord(propSchema) || !visible) return null;
  if (isStealthKind(name, surface.entry)) return null;

  const resolved = labels === false ? "" : fieldChildLabel;
  const label = formatPropertyLabel(name, resolved, fieldNameToLabel);
  const presence = needsPresenceToggle(propSchema, required);
  const present = value !== undefined && value !== null;

  if (presence && !present) return null;
  if (!present && !required) return null;
  if (!required && isEmptyDisplayValue(value)) return null;

  const fieldData = present
    ? value
    : required
      ? undefined
      : null;

  return (
    <div className={surfaceClass.stackItem}>
      {label.length > 0 ? (
        <div className={surfaceClass.label}>{label}</div>
      ) : null}
      <div className={surfaceClass.propValue}>
        <FieldMetaProvider required={required} omitLabel>
          <Surface
            {...surface}
            {...(fieldData !== undefined ? { data: fieldData } : {})}
          />
        </FieldMetaProvider>
      </div>
    </div>
  );
}

/** Object form body (input mode). Root form shell is kit.Root. */
export function ObjectInput(_props: SurfaceProps): ReactElement | null {
  const { schema, Surface, helpers } = useSurface();
  if (Surface === undefined || schema === undefined || helpers === undefined) {
    return null;
  }
  const required = requiredNames(schema);
  const layout = helpers.layout();
  const direction = helpers.direction();
  return (
    <ObjectShell layout={layout} direction={direction}>
      {renderChildren(helpers.fields(), Surface, required, "input", layout)}
    </ObjectShell>
  );
}

/**
 * Object read-only body.
 * `layout: "props"` (default) → definition-list rows.
 * `layout: "stack"` → full-width blocks (card heroes, PDPs).
 */
export function ObjectDisplay(_props: SurfaceProps): ReactElement | null {
  const { schema, Surface, helpers } = useSurface();
  if (Surface === undefined || schema === undefined || helpers === undefined) {
    return null;
  }
  const required = requiredNames(schema);
  const layout = helpers.layout();
  const direction = helpers.direction();
  const body = renderChildren(
    helpers.fields(),
    Surface,
    required,
    "display",
    layout,
  );

  return (
    <ObjectShell layout={layout} direction={direction}>
      {layout === "stack" ? (
        body
      ) : (
        <dl className={surfaceClass.dl}>{body}</dl>
      )}
    </ObjectShell>
  );
}
