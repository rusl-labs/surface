import type { ReactElement, ReactNode } from "react";
import { surfaceClass, sx } from "../classes.js";

export function IconButton({
  label,
  kind,
  caption,
  disabled,
  onClick,
  children,
}: {
  readonly label: string;
  readonly kind: "add" | "remove";
  readonly caption?: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}): ReactElement {
  const showCaption = caption !== undefined && caption.length > 0;
  return (
    <button
      type="button"
      className={sx(
        surfaceClass.iconButton,
        kind === "add" ? surfaceClass.iconButtonAdd : surfaceClass.iconButtonRemove,
        showCaption ? surfaceClass.iconButtonCaption : undefined,
      )}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      {showCaption ? <span>{caption}</span> : null}
    </button>
  );
}
