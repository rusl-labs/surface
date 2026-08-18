import type { ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { surfaceClass, sx } from "../classes.js";
import { useFieldNameToLabel } from "../kit-config.js";
import { useFieldMeta } from "./field-meta.js";
import { useSeedSchemaValue } from "./seed-schema-value.js";
import { formatPropertyLabel } from "./shared.js";

export function BooleanInput({ id, data }: SurfaceProps): ReactElement {
  const { helpers, entry, dataApi, labels } = useSurface();
  useSeedSchemaValue();
  const { omitLabel } = useFieldMeta();
  const fieldNameToLabel = useFieldNameToLabel();
  const hideLabels = omitLabel || labels === false;
  const raw = helpers?.label() ?? "";
  const label = hideLabels
    ? ""
    : formatPropertyLabel(id, raw, fieldNameToLabel);
  const description = hideLabels ? "" : (helpers?.description() ?? "");

  if (entry?.hidden === true) {
    return (
      <input
        type="hidden"
        className={surfaceClass.hidden}
        name={id}
        value={data === true ? "true" : "false"}
        readOnly
      />
    );
  }

  return (
    <div className={sx(surfaceClass.field, surfaceClass.checkbox)}>
      <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          type="checkbox"
          className={surfaceClass.control}
          name={id}
          value="true"
          checked={data === true}
          onChange={(event) => {
            dataApi?.setData(event.currentTarget.checked);
          }}
        />
        {label.length > 0 ? (
          <span className={surfaceClass.label}>{label}</span>
        ) : null}
      </label>
      {description.length > 0 ? (
        <span className={surfaceClass.description}>{description}</span>
      ) : null}
    </div>
  );
}

export function BooleanDisplay({ id, data }: SurfaceProps): ReactElement {
  const { helpers, labels } = useSurface();
  const { omitLabel } = useFieldMeta();
  const fieldNameToLabel = useFieldNameToLabel();
  const hideLabels = omitLabel || labels === false;
  const raw = helpers?.label() ?? "";
  const label = hideLabels
    ? ""
    : formatPropertyLabel(id, raw, fieldNameToLabel);
  const description = hideLabels ? "" : (helpers?.description() ?? "");
  return (
    <div className={sx(surfaceClass.field, surfaceClass.checkbox)}>
      {label.length > 0 ? (
        <span className={surfaceClass.label}>{label}</span>
      ) : null}
      {description.length > 0 ? (
        <span className={surfaceClass.description}>{description}</span>
      ) : null}
      <span className={surfaceClass.value}>
        {typeof data === "boolean" ? String(data) : ""}
      </span>
    </div>
  );
}
