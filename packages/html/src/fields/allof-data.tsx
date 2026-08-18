import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";
import { useSurface } from "@rusl-labs/surface";

/**
 * Shared live data for an allOf composite so a nested oneOf can replace the
 * whole value (e.g. postal.address: switching US→AU updates countryCode on
 * the shared base branch, not only the variant subtree).
 *
 * Backed by the Surface data channel when available.
 */
export type AllOfDataApi = {
  readonly data: unknown;
  readonly generation: number;
  replace(next: unknown): void;
};

const AllOfDataContext = createContext<AllOfDataApi | null>(null);

export function AllOfDataProvider({
  data: propsData,
  children,
}: {
  readonly data: unknown;
  readonly children: ReactNode;
}): ReactNode {
  const { dataApi } = useSurface();
  // generation bumps when identity of data changes so union remounts.
  const generation =
    typeof propsData === "object" && propsData !== null
      ? objectGeneration(propsData)
      : 0;

  const replace = useCallback(
    (next: unknown) => {
      if (dataApi !== undefined) {
        dataApi.setData(next);
        return;
      }
    },
    [dataApi],
  );

  const live = dataApi?.data ?? propsData;

  return (
    <AllOfDataContext.Provider value={{ data: live, generation, replace }}>
      {children}
    </AllOfDataContext.Provider>
  );
}

/** Cheap identity token so branch Surfaces remount when the payload is replaced. */
function objectGeneration(value: object): number {
  // Prefer $kind (union discriminant) when present.
  const kind = (value as { $kind?: unknown }).$kind;
  if (typeof kind === "string") {
    return hashString(kind);
  }
  return hashString(JSON.stringify(value));
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

export function useAllOfData(): AllOfDataApi | null {
  return useContext(AllOfDataContext);
}
