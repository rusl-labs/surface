import type { ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { surfaceClass } from "../classes.js";
import { AllOfDataProvider, useAllOfData } from "./allof-data.js";
import { ObjectDisplay, ObjectInput } from "./object.js";
import {
  AllOfBranchScope,
  allOfFirstOwners,
  childSurfaceProps,
  isRecord,
} from "./shared.js";

/**
 * allOf body: each branch is a child Surface over shared live data.
 * Input and display share this walk; registered per-mode so edit chrome never
 * sneaks in on one path only.
 *
 * When the subject annotation yields a non-empty `helpers.fields()` layout
 * (banners/spans/stack — e.g. postal.address row/card/Display), prefer that
 * object presentation over walking branches. Empty fields (typical Input
 * default on allOf roots with no root properties) still falls through to the
 * branch walk so discriminators and variant forms keep working.
 */
function AllOfBody(props: SurfaceProps): ReactElement | null {
  const { schema, Surface, helpers } = useSurface();
  if (Surface === undefined || schema === undefined) return null;
  if (!Array.isArray(schema.allOf)) return null;

  const annotated = helpers?.fields() ?? [];
  if (annotated.length > 0) {
    return props.mode === "input" ? (
      <ObjectInput {...props} />
    ) : (
      <ObjectDisplay {...props} />
    );
  }

  // Nested allOf reuses the outer live data when already inside a provider.
  const outer = useAllOfData();
  if (outer !== null) {
    return (
      <AllOfBranches
        allOf={schema.allOf}
        data={outer.data}
        generation={outer.generation}
        mode={props.mode}
        view={props.view}
      />
    );
  }

  return (
    <AllOfDataProvider data={props.data}>
      <AllOfBranchesLive
        allOf={schema.allOf}
        mode={props.mode}
        view={props.view}
      />
    </AllOfDataProvider>
  );
}

function AllOfBranchesLive({
  allOf,
  mode,
  view,
}: {
  readonly allOf: readonly unknown[];
  readonly mode: SurfaceProps["mode"];
  readonly view: SurfaceProps["view"];
}): ReactElement {
  const live = useAllOfData();
  return (
    <AllOfBranches
      allOf={allOf}
      data={live?.data}
      generation={live?.generation ?? 0}
      mode={mode}
      view={view}
    />
  );
}

function AllOfBranches({
  allOf,
  data,
  generation,
  mode,
  view,
}: {
  readonly allOf: readonly unknown[];
  readonly data: unknown;
  readonly generation: number;
  readonly mode: SurfaceProps["mode"];
  readonly view: SurfaceProps["view"];
}): ReactElement {
  const { Surface } = useSurface();
  const firstOwner = allOfFirstOwners(allOf);

  return (
    <div className={surfaceClass.allOf}>
      {allOf.map((branch, index) => {
        if (!isRecord(branch) || Surface === undefined) return null;
        return (
          <AllOfBranchScope
            key={`${index}:${generation}`}
            firstOwner={firstOwner}
            branchIndex={index}
          >
            <Surface
              {...childSurfaceProps(
                `allOf:${index}`,
                branch,
                data,
                mode,
                view,
              )}
            />
          </AllOfBranchScope>
        );
      })}
    </div>
  );
}

export function AllOfInput(props: SurfaceProps): ReactElement | null {
  return <AllOfBody {...props} />;
}

export function AllOfDisplay(props: SurfaceProps): ReactElement | null {
  return <AllOfBody {...props} />;
}
