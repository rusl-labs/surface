import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import {
  acceptAllValidator,
  createSurfaceUi,
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  type AnnotationDocument,
  type Schema,
} from "../../packages/core/src/index.ts";
import { createHtmlKit } from "../../packages/html/src/index.tsx";

afterEach(() => {
  cleanup();
});

const DIR_ID = "https://example.test/schemas/contact-directory";

const DIR_SCHEMA: Schema = {
  $id: DIR_ID,
  type: "object",
  properties: {
    contacts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          title: { type: "string" },
          organization: { type: "string" },
        },
      },
    },
  },
};

const DIR_ANNOTATION: AnnotationDocument = {
  subject: DIR_ID,
  views: {
    default: {
      fields: [
        {
          name: "contacts",
          label: "",
          widget: {
            name: "table",
            columns: [
              { field: "name", label: "Name", sortable: true, fontWeight: 600 },
              { field: "title", label: "Title", sortable: true },
              {
                field: "organization",
                label: "Company",
                sortable: true,
                align: "right",
              },
            ],
          },
        },
      ],
      rest: "omit",
    },
  },
};

const SAMPLE = {
  contacts: [
    { name: "Jane Doe", title: "VP of Sales", organization: "Acme" },
    { name: "Sam Rivera", title: "Staff Engineer", organization: "Globex" },
    { name: "Aiko Tanaka", title: "Design Lead", organization: "Acme" },
  ],
};

function mount(data = SAMPLE) {
  const { Surface } = createSurfaceUi({
    validator: acceptAllValidator,
    schemaResolver: new InMemorySchemaFetchResolver({
      [DIR_ID]: DIR_SCHEMA,
    }),
    annotationResolver: new InMemoryAnnotationResolver({
      [DIR_ID]: DIR_ANNOTATION,
    }),
    kit: createHtmlKit(),
  });
  return render(<Surface id={DIR_ID} mode="display" data={data} />);
}

describe("HTML kit table widget", () => {
  test("renders annotated columns for an array of objects", async () => {
    const { container } = mount();

    await waitFor(() => {
      expect(container.querySelector("table.surface-table")).not.toBeNull();
    });
    const headers = [...container.querySelectorAll("th")].map(
      (th) => th.textContent ?? "",
    );
    expect(headers).toEqual(["Name", "Title", "Company"]);
    expect(container.textContent).toContain("Jane Doe");
    expect(container.textContent).toContain("Globex");
  });

  test("column align and fontWeight paint header and cells", async () => {
    const { container } = mount();

    await waitFor(() => {
      expect(container.querySelector("table.surface-table")).not.toBeNull();
    });
    const nameTh = container.querySelectorAll("th")[0] as HTMLElement;
    const companyTh = container.querySelectorAll("th")[2] as HTMLElement;
    const firstRow = container.querySelectorAll("tbody tr")[0]!;
    const nameTd = firstRow.querySelectorAll("td")[0] as HTMLElement;
    const companyTd = firstRow.querySelectorAll("td")[2] as HTMLElement;
    expect(nameTh.style.fontWeight).toBe("600");
    expect(nameTd.style.fontWeight).toBe("600");
    expect(companyTh.getAttribute("data-align")).toBe("right");
    expect(companyTd.getAttribute("data-align")).toBe("right");
    expect(nameTd.querySelector(".surface-label")).toBeNull();
  });

  test("header click sorts display order without rewriting data", async () => {
    const changes: unknown[] = [];
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({
        [DIR_ID]: DIR_SCHEMA,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [DIR_ID]: DIR_ANNOTATION,
      }),
      kit: createHtmlKit(),
    });
    const seed = {
      contacts: [
        { name: "Jane Doe", title: "VP of Sales", organization: "Acme" },
        { name: "Sam Rivera", title: "Staff Engineer", organization: "Globex" },
        { name: "Aiko Tanaka", title: "Design Lead", organization: "Acme" },
      ],
    };
    const { container } = render(
      <Surface
        id={DIR_ID}
        mode="display"
        data={seed}
        onChange={(next) => {
          changes.push(next);
        }}
      />,
    );

    const names = () =>
      [...container.querySelectorAll("tbody tr")].map(
        (tr) => tr.querySelector("td")?.textContent?.trim() ?? "",
      );

    await waitFor(() => {
      expect(names()[0]).toContain("Jane Doe");
    });

    fireEvent.click(
      [...container.querySelectorAll("button")].find((b) =>
        (b.textContent ?? "").includes("Name"),
      )!,
    );

    await waitFor(() => {
      expect(names()[0]).toContain("Aiko Tanaka");
    });
    fireEvent.click(
      [...container.querySelectorAll("button")].find((b) =>
        (b.textContent ?? "").includes("Name"),
      )!,
    );
    await waitFor(() => {
      expect(names()[0]).toContain("Sam Rivera");
    });
    expect(changes).toEqual([]);
    expect(seed.contacts.map((c) => c.name)).toEqual([
      "Jane Doe",
      "Sam Rivera",
      "Aiko Tanaka",
    ]);
  });
});

describe("Surface labels prop", () => {
  test("labels={false} suppresses field chrome on the mount", async () => {
    const id = "https://example.test/schemas/named";
    const schema: Schema = {
      $id: id,
      type: "object",
      properties: { name: { type: "string" } },
    };
    const annotation: AnnotationDocument = {
      subject: id,
      views: {
        default: {
          fields: [{ name: "name", label: "Full name" }],
          rest: "omit",
        },
      },
    };
    const { Surface } = createSurfaceUi({
      validator: acceptAllValidator,
      schemaResolver: new InMemorySchemaFetchResolver({ [id]: schema }),
      annotationResolver: new InMemoryAnnotationResolver({ [id]: annotation }),
      kit: createHtmlKit(),
    });
    const { container } = render(
      <Surface
        id={id}
        mode="display"
        data={{ name: "Ada" }}
        labels={false}
      />,
    );
    await waitFor(() => {
      expect(container.textContent).toContain("Ada");
    });
    expect(container.querySelector(".surface-label")).toBeNull();
  });
});
