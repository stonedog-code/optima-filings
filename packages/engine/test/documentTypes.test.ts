/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The vocabulary is a **published, persisted, cross-tier contract**, so these
 * tests are less about the code than about pinning the promises:
 *
 * - the values are persisted, so renaming one silently reclassifies documents
 * - the hosted tier imports this list, so a change here is a change there
 * - the list is closed, which is only true if writing rejects what it does not
 *   recognise
 */

import {
  DEFAULT_DOCUMENT_TYPE,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_INFO,
  isDocumentType,
  requiresDocumentDate,
  toDocumentType,
  type DocumentType,
} from "../src/documentTypes.js";

describe("the vocabulary", () => {
  it("pins the exact set of values", () => {
    // Deliberately a literal rather than derived from the constant, so ADDING a
    // type fails this test on purpose. These strings are persisted and shared
    // with the hosted tier; growing the list should be a decision someone
    // makes, not something that slips in with an unrelated change.
    expect([...DOCUMENT_TYPES]).toEqual([
      "MEETING_MINUTES",
      "DOCUMENT_OF_RECORD",
      "FILING_RECEIPT",
      "CORRESPONDENCE",
      "POLICY",
      "OTHER",
    ]);
  });

  it("has no duplicate values", () => {
    expect(new Set(DOCUMENT_TYPES).size).toBe(DOCUMENT_TYPES.length);
  });

  it("describes every value", () => {
    // The Record type already enforces this at compile time. Asserted anyway
    // because a value could be described with an empty string, which type-checks
    // and renders a blank row in the picker.
    for (const value of DOCUMENT_TYPES) {
      const info = DOCUMENT_TYPE_INFO[value];
      expect(info.value).toBe(value);
      expect(info.label.length).toBeGreaterThan(0);
      expect(info.describes.length).toBeGreaterThan(0);
    }
  });

  it("has unique labels", () => {
    // Two types sharing a label make the picker ambiguous and the filter
    // unreadable — the user cannot tell which one they chose.
    const labels = DOCUMENT_TYPES.map((v) => DOCUMENT_TYPE_INFO[v].label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("includes an OTHER escape hatch, last", () => {
    // A closed list WILL be wrong for somebody. Without OTHER the failure is
    // that they cannot file the document at all.
    expect(DOCUMENT_TYPES).toContain("OTHER");
    expect(DOCUMENT_TYPES[DOCUMENT_TYPES.length - 1]).toBe("OTHER");
  });

  it("defaults to OTHER", () => {
    // The value existing rows get on migration, and the honest one: nothing
    // knows what those documents were.
    expect(DEFAULT_DOCUMENT_TYPE).toBe("OTHER");
    expect(isDocumentType(DEFAULT_DOCUMENT_TYPE)).toBe(true);
  });
});

describe("hasDocumentDate", () => {
  it("is true exactly for the types with a date of their own", () => {
    const dated = DOCUMENT_TYPES.filter(
      (v) => DOCUMENT_TYPE_INFO[v].hasDocumentDate,
    );
    expect(dated).toEqual([
      "MEETING_MINUTES",
      "FILING_RECEIPT",
      "CORRESPONDENCE",
    ]);
  });

  it("is false for OTHER, so the escape hatch never demands a date", () => {
    // OTHER is where a document goes when its kind is unknown. Requiring a date
    // there would put a required field in front of the person least able to
    // answer it.
    expect(requiresDocumentDate("OTHER")).toBe(false);
  });

  it("agrees with requiresDocumentDate for every type", () => {
    // One property, two consequences — ordering and requirement — and this is
    // what stops them drifting into two independent notions.
    for (const value of DOCUMENT_TYPES) {
      expect(requiresDocumentDate(value)).toBe(
        DOCUMENT_TYPE_INFO[value].hasDocumentDate,
      );
    }
  });
});

describe("isDocumentType — the guard that keeps the list closed", () => {
  it("accepts every known value", () => {
    for (const value of DOCUMENT_TYPES) {
      expect(isDocumentType(value)).toBe(true);
    }
  });

  it.each([
    ["an unknown string", "INVOICE"],
    ["the lowercase form", "meeting_minutes"],
    ["a label rather than a value", "Meeting minutes"],
    ["an empty string", ""],
    ["a whitespace-padded value", " OTHER "],
  ])("rejects %s", (_label, value) => {
    expect(isDocumentType(value)).toBe(false);
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["a number", 3],
    ["an object", { value: "OTHER" }],
    ["an array", ["OTHER"]],
  ])("rejects %s without throwing", (_label, value) => {
    // Takes `unknown` because every real caller holds something off the wire —
    // a form field, a JSON import, a row from an older version.
    expect(isDocumentType(value)).toBe(false);
  });
});

describe("toDocumentType — reading is lenient where writing is strict", () => {
  it("passes a known value through", () => {
    expect(toDocumentType("MEETING_MINUTES")).toBe("MEETING_MINUTES");
  });

  it.each([
    ["a value from a newer version", "BOARD_PACK"],
    ["a value from another system's vocabulary", "minutes"],
    ["null", null],
    ["undefined", undefined],
  ])("coerces %s to OTHER rather than throwing", (_label, value) => {
    // The asymmetry is deliberate. A document written by a newer version must
    // stay READABLE — the bytes and title are still the user's, and hiding it
    // loses more than mislabelling it does. Writing rejects the same value.
    expect(toDocumentType(value)).toBe(DEFAULT_DOCUMENT_TYPE);
  });

  it("always returns something the rest of the system accepts", () => {
    const inputs: unknown[] = ["OTHER", "nonsense", null, 7, {}];
    for (const input of inputs) {
      const result: DocumentType = toDocumentType(input);
      expect(isDocumentType(result)).toBe(true);
      expect(DOCUMENT_TYPE_INFO[result]).toBeDefined();
    }
  });
});
