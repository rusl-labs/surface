import { createContext, useContext, type ReactNode } from "react";

/** Kit-local meta for the field Surface currently mounting (not part of core). */
export type FieldMeta = {
  readonly required: boolean;
  /**
   * Parent object property already painted the use-site label (e.g. display
   * `<dt>`). Child FieldChrome should not reprint it.
   */
  readonly omitLabel: boolean;
};

const FieldMetaContext = createContext<FieldMeta>({
  required: false,
  omitLabel: false,
});

export function FieldMetaProvider({
  required,
  omitLabel = false,
  children,
}: {
  readonly required: boolean;
  readonly omitLabel?: boolean;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <FieldMetaContext.Provider value={{ required, omitLabel }}>
      {children}
    </FieldMetaContext.Provider>
  );
}

export function useFieldMeta(): FieldMeta {
  return useContext(FieldMetaContext);
}
