import type { ReactElement, ReactNode } from "react";
import { useSurface } from "@rusl-labs/surface";
import { surfaceClass, sx } from "../classes.js";
import { useFieldNameToLabel } from "../kit-config.js";
import { useFieldMeta } from "./field-meta.js";
import { formatPropertyLabel } from "./shared.js";

/**
 * Shared chrome for a Surface node: annotation label + description, then control.
 * Kits own structure (classes only — host CSS owns look); helpers own the text.
 *
 * When there is no label/description (synthetic mounts: union under allOf,
 * array indices, …), skip `surface-field` so hosts do not paint an empty
 * labeled box around structural chrome.
 */
export function FieldChrome({
  children,
  as = "label",
  className,
}: {
  readonly children: ReactNode;
  /** `div` when the control is not a single labeled input (arrays, unions). */
  readonly as?: "label" | "div";
  readonly className?: string;
}): ReactElement {
  const { helpers, id, labels } = useSurface();
  const { omitLabel } = useFieldMeta();
  const fieldNameToLabel = useFieldNameToLabel();
  const hideLabels = omitLabel || labels === false;
  const rawLabel = helpers?.label() ?? "";
  const label = hideLabels
    ? ""
    : formatPropertyLabel(id ?? "", rawLabel, fieldNameToLabel);
  const description = hideLabels ? "" : (helpers?.description() ?? "");
  const Tag = as;
  const hasChrome = label.length > 0 || description.length > 0;

  return (
    <Tag
      className={sx(hasChrome ? surfaceClass.field : surfaceClass.slot, className)}
    >
      {label.length > 0 ? (
        <span className={surfaceClass.label}>{label}</span>
      ) : null}
      {description.length > 0 ? (
        <span className={surfaceClass.description}>{description}</span>
      ) : null}
      {children}
    </Tag>
  );
}

export function SectionChrome({
  label,
  description,
  layout = "props",
  direction = "vertical",
  children,
}: {
  readonly label: string;
  readonly description?: string;
  readonly layout?: "props" | "stack";
  readonly direction?: "vertical" | "horizontal";
  readonly children: ReactNode;
}): ReactElement {
  const hostClass = sx(
    surfaceClass.section,
    layout === "stack" ? surfaceClass.layoutStack : surfaceClass.layoutProps,
    direction === "horizontal"
      ? surfaceClass.directionHorizontal
      : surfaceClass.directionVertical,
  );
  const bodyClass = sx(
    surfaceClass.sectionBody,
    layout === "stack" ? surfaceClass.layoutStack : surfaceClass.layoutProps,
    direction === "horizontal"
      ? surfaceClass.directionHorizontal
      : surfaceClass.directionVertical,
  );

  return (
    <section
      className={hostClass}
      data-surface-layout={layout}
      data-surface-direction={direction}
    >
      {label.length > 0 ? (
        <h3 className={surfaceClass.sectionLabel}>{label}</h3>
      ) : null}
      {description !== undefined && description.length > 0 ? (
        <p className={surfaceClass.description}>{description}</p>
      ) : null}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function TemplateChrome({ text }: { readonly text: string }): ReactElement {
  return <p className={surfaceClass.template}>{text}</p>;
}

export function HeadingChrome({ label }: { readonly label: string }): ReactElement {
  return <h4 className={surfaceClass.heading}>{label}</h4>;
}

function ChromeShell({
  kind,
  label,
  description,
  layout = "stack",
  direction = "vertical",
  text,
  children,
}: {
  readonly kind: "block" | "banner" | "span";
  readonly label?: string;
  readonly description?: string;
  readonly layout?: "props" | "stack";
  readonly direction?: "vertical" | "horizontal";
  readonly text?: string;
  readonly children: ReactNode;
}): ReactElement {
  const hostClass = sx(
    kind === "block"
      ? surfaceClass.block
      : kind === "banner"
        ? surfaceClass.banner
        : surfaceClass.span,
    layout === "stack" ? surfaceClass.layoutStack : surfaceClass.layoutProps,
    direction === "horizontal"
      ? surfaceClass.directionHorizontal
      : surfaceClass.directionVertical,
  );
  const Tag = kind === "span" ? "span" : "div";
  return (
    <Tag
      className={hostClass}
      data-surface-chrome={kind}
      data-surface-layout={layout}
      data-surface-direction={direction}
    >
      {label !== undefined && label.length > 0 ? (
        <span className={surfaceClass.chromeLabel}>{label}</span>
      ) : null}
      {description !== undefined && description.length > 0 ? (
        <span className={surfaceClass.description}>{description}</span>
      ) : null}
      {text !== undefined && text.length > 0 ? (
        <span className={surfaceClass.chromeText}>{text}</span>
      ) : null}
      {children}
    </Tag>
  );
}

export function BlockChrome(
  props: Omit<Parameters<typeof ChromeShell>[0], "kind">,
): ReactElement {
  return <ChromeShell kind="block" {...props} />;
}

export function BannerChrome(
  props: Omit<Parameters<typeof ChromeShell>[0], "kind">,
): ReactElement {
  return <ChromeShell kind="banner" {...props} />;
}

export function SpanChrome(
  props: Omit<Parameters<typeof ChromeShell>[0], "kind">,
): ReactElement {
  return <ChromeShell kind="span" {...props} />;
}
