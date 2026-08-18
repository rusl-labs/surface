/**
 * Presentational widget contract. Adapters call useSurface(); widgets do not.
 * See packages/html/DESIGN.md.
 */
export type WidgetProps<T> = {
  readonly value: T | undefined;
  readonly widget: Record<string, unknown>;
  readonly disabled?: boolean | undefined;
  readonly required?: boolean | undefined;
  readonly invalid?: boolean | undefined;
  readonly controlId: string;
  readonly name?: string | undefined;
  readonly describedBy?: string | undefined;
  readonly onChange?: (next: T | undefined) => void;
  readonly onBlur?: () => void;
};
