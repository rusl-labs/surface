import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import {
  acceptAllValidator,
  createSurfaceUi,
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
} from "../../packages/core/src/index.ts";
import { createHtmlKit } from "../../packages/html/src/index.tsx";
import {
  CONTACT_CARD,
  CONTACT_DATA,
  CONTACT_SCHEMA,
  WALKTHROUGH_ANNOTATION,
} from "../fixtures/contact-card.ts";

afterEach(() => {
  cleanup();
});

function mountAnnotated(props: {
  mode: "input" | "display";
  view?: string;
  data?: unknown;
}) {
  const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
    schemaResolver: new InMemorySchemaFetchResolver({
      [CONTACT_CARD]: CONTACT_SCHEMA,
    }),
    annotationResolver: new InMemoryAnnotationResolver({
      [CONTACT_CARD]: WALKTHROUGH_ANNOTATION,
    }),
    kit: createHtmlKit(),
  });
  return render(
    <Surface
      id={CONTACT_CARD}
      mode={props.mode}
      view={props.view ?? "default"}
      data={props.data ?? CONTACT_DATA}
    />,
  );
}

describe("HTML kit annotation fields", () => {
  test("default view: entry order, labels, hidden input, rest append", async () => {
    const { container } = mountAnnotated({ mode: "input" });

    await waitFor(() => {
      expect(container.textContent).toContain("Contact card");
      expect(container.textContent).toContain(
        "How this person shows up — identity, reach, membership.",
      );
      expect(container.textContent).toContain("Full name");
      expect(container.textContent).toContain("Company");
      expect(container.textContent).toContain("Identity");
      expect(container.textContent).toContain("Who they are on paper.");
      expect(container.textContent).toContain("Reach");
      expect(container.textContent).toContain("Member since 1998-03-14");
    });

    // Stable CSS hooks for host styling
    expect(container.querySelector(".surface-object")).not.toBeNull();
    expect(container.querySelector(".surface-title")).not.toBeNull();
    expect(container.querySelectorAll(".surface-section").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector(".surface-template")).not.toBeNull();
    expect(container.querySelector(".surface-field")).not.toBeNull();
    expect(container.querySelector(".surface-control")).not.toBeNull();
    expect(container.querySelector(".surface-hidden")).not.toBeNull();

    const text = container.textContent ?? "";
    expect(text.indexOf("Contact card")).toBeLessThan(text.indexOf("Identity"));
    expect(text.indexOf("Identity")).toBeLessThan(text.indexOf("Full name"));
    expect(text.indexOf("Full name")).toBeLessThan(text.indexOf("Company"));
    // organization before schema-order title (rest append)
    expect(text.indexOf("Company")).toBeLessThan(text.indexOf("title"));

    const hidden = container.querySelector(
      'input[type="hidden"][name="metadata"]',
    ) as HTMLInputElement | null;
    expect(hidden).not.toBeNull();
    expect(hidden?.value).toBe("internal-7f3a");
    // hidden is not shown as a visible text control label
    expect(container.querySelector('input[name="metadata"]:not([type="hidden"])')).toBeNull();
  });

  test("card view: rest omit and inherited labels", async () => {
    const { container } = mountAnnotated({ mode: "input", view: "card" });

    await waitFor(() => {
      expect(container.textContent).toContain("Full name");
    });

    expect(container.textContent).toContain("Company");
    expect(container.textContent).not.toContain("title");
    expect(container.querySelector('input[name="title"]')).toBeNull();
    expect(container.querySelector('input[name="metadata"]')).toBeNull();
  });

  test("widget candidate key from entry reaches the kit", async () => {
    const seen: string[][] = [];
    const kit = createHtmlKit({
      resolvers: [
        {
          key: "widget:email",
          mode: "input",
          resolve: (req) => {
            seen.push([...req.keys]);
            return null;
          },
        },
      ],
    });
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [CONTACT_CARD]: CONTACT_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [CONTACT_CARD]: WALKTHROUGH_ANNOTATION,
      }),
      kit,
    });

    const { container } = render(
      <Surface
        id={CONTACT_CARD}
        mode="input"
        data={CONTACT_DATA}
      />,
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Full name");
    });

    const emailKeys = seen.find((keys) => keys.includes("widget:email"));
    expect(emailKeys).toBeDefined();
    // emails is an array (no $id) — widget key leads, then bare name, then type
    expect(emailKeys).toEqual([
      "widget:email",
      "email",
      "array",
    ]);
  });

  test("no annotation degrades to schema property order", async () => {
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [CONTACT_CARD]: CONTACT_SCHEMA,
      }),
      kit: createHtmlKit(),
    });
    const { container } = render(
      <Surface id={CONTACT_CARD} mode="input" data={CONTACT_DATA} />,
    );

    await waitFor(() => {
      expect(container.querySelector('input[name="name"]')).not.toBeNull();
    });
    // schema order: name, title, organization — title appears before organization
    const text = container.textContent ?? "";
    expect(text.indexOf("title")).toBeLessThan(text.indexOf("organization"));
  });

  test("display mode keeps annotation labels and shows values", async () => {
    const { container } = mountAnnotated({ mode: "display" });

    await waitFor(() => {
      expect(container.textContent).toContain("Full name");
      expect(container.textContent).toContain("Ada Lovelace");
    });
    expect(container.textContent).toContain("Company");
    expect(container.textContent).toContain("Analytical Engines Ltd");
    // Read-only: no form controls. Hidden annotation fields are omitted
    // (display has nothing to submit).
    expect(container.querySelector("input")).toBeNull();
    expect(container.textContent).not.toContain("internal-7f3a");
    // Definition-list layout with use-site labels as dt.
    expect(container.querySelector("dl.surface-dl")).not.toBeNull();
    expect(
      [...container.querySelectorAll("dt")].some((n) =>
        (n.textContent ?? "").includes("Full name"),
      ),
    ).toBe(true);
  });

  test("unknown widget degrades to the type default with the label kept", async () => {
    const broken = structuredClone(WALKTHROUGH_ANNOTATION) as typeof WALKTHROUGH_ANNOTATION;
    // Reach.emails widget → typo
    const reach = (broken.views as { default: { fields: Array<Record<string, unknown>> } })
      .default.fields[1] as { fields: Array<Record<string, unknown>> };
    (reach.fields[0] as { widget: { name: string } }).widget = { name: "emial" };

    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [CONTACT_CARD]: CONTACT_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [CONTACT_CARD]: broken,
      }),
      kit: createHtmlKit(),
    });
    const { container } = render(
      <Surface id={CONTACT_CARD} mode="input" data={CONTACT_DATA} />,
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Full name");
    });
    // emails still present (array type default), not blanked by the typo
    expect(container.textContent).toMatch(/email/i);
    expect(container.querySelector("ul")).not.toBeNull();
  });

  test("phones compact def view: Number/Type labels, extension omitted", async () => {
    const { container } = mountAnnotated({ mode: "input" });

    await waitFor(() => {
      expect(container.textContent).toContain("Number");
      expect(container.textContent).toContain("Type");
    });
    const valueInput = container.querySelector(
      'input[name="value"]',
    ) as HTMLInputElement | null;
    const kindInput = container.querySelector(
      'input[name="kind"]',
    ) as HTMLInputElement | null;
    expect(valueInput?.defaultValue).toBe("+44 20 7946 0018");
    expect(kindInput?.defaultValue).toBe("work");
    expect(container.querySelector('input[name="extension"]')).toBeNull();
  });
});
