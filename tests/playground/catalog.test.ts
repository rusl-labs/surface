import { describe, expect, test } from "bun:test";
import {
  buildSubjectSearchParams,
  defaultCatalog,
  filterCatalog,
  groupSubjects,
  resolveSubjectFromSearchParams,
  shortNameFromId,
  CONTACT_CARD_ID,
  CONTACT_DIRECTORY_ID,
  BILLING_INVOICE_ID,
} from "../../examples/playground/catalog.ts";

describe("playground catalog", () => {
  const catalog = defaultCatalog();

  test("shortNameFromId takes the last path segment", () => {
    expect(shortNameFromId(CONTACT_CARD_ID)).toBe("contact.card");
  });

  test("filterCatalog matches invoice by title or id fragment", () => {
    const hits = filterCatalog(catalog, "invoice");
    expect(hits.some((e) => e.id === BILLING_INVOICE_ID)).toBe(true);
  });

  test("groupSubjects puts contact.card in Pinned and keeps Contact group", () => {
    const groups = groupSubjects(catalog);
    const pinned = groups.find((g) => g.id === "pinned");
    expect(pinned?.entries.some((e) => e.id === CONTACT_CARD_ID)).toBe(true);
    const contact = groups.find((g) => g.id === "contact");
    // Pinned entries are not duplicated into Contact
    expect(
      contact === undefined ||
        !contact.entries.some((e) => e.id === CONTACT_CARD_ID),
    ).toBe(true);
  });

  test("resolveSubjectFromSearchParams / buildSubjectSearchParams round-trip", () => {
    const known = new Set(catalog.map((e) => e.id));
    const qs = buildSubjectSearchParams(BILLING_INVOICE_ID);
    expect(qs.includes("billing.invoice")).toBe(true);
    const params = new URLSearchParams(qs.slice(1));
    expect(
      resolveSubjectFromSearchParams(params, CONTACT_CARD_ID, known),
    ).toBe(BILLING_INVOICE_ID);
    expect(
      resolveSubjectFromSearchParams(
        new URLSearchParams("subject=https://missing.example/x"),
        CONTACT_CARD_ID,
        known,
      ),
    ).toBe(CONTACT_CARD_ID);
  });

  test("contact directory is a local catalog entry", () => {
    const groups = groupSubjects(catalog);
    const local = groups.find((g) => g.id === "local");
    expect(local?.entries.some((e) => e.id === CONTACT_DIRECTORY_ID)).toBe(
      true,
    );
  });
});
