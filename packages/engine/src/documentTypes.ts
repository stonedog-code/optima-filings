/**
 * What kind of document this is.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Product vocabulary, in the same family as `ENTITY_TYPES` and jurisdictions,
 * and it lives here for the same reason they do: **defined once, imported by
 * both tiers.**
 *
 * NEH-343 already records what the other arrangement costs. Entity vocabulary
 * is *mirrored* into the hosted tier rather than imported, and the two copies
 * now drift. For documents the drift would be worse than untidy: a document
 * filed as `MEETING_MINUTES` in a self-hosted install would import into the
 * cloud as nothing at all, which is data loss wearing the costume of a
 * successful import.
 *
 * ## Why a closed list
 *
 * Free text means one person types "minutes" and another "Meeting Minutes",
 * and the filter silently splits one kind of document in two. A type is only
 * worth storing if it groups, and it only groups if the values are fixed.
 *
 * `OTHER` is what makes a closed list survivable — see its entry below.
 *
 * ## Why this is in `engine` and not `db`
 *
 * `engine` is the package the hosted tier depends on, and it is the one with no
 * filesystem, no database and no environment. A vocabulary is pure data, so it
 * belongs on the side of the boundary both tiers can reach.
 */

/**
 * The vocabulary. Order is presentation order in a picker, so it runs from what
 * people upload most to the escape hatch.
 *
 * **These strings are persisted and cross the tier boundary, so they are
 * permanent public identifiers** — the same rule rule ids follow. Renaming one
 * silently reclassifies every stored document that used it. Add a type; never
 * rename one.
 */
export const DOCUMENT_TYPES = [
  "MEETING_MINUTES",
  "DOCUMENT_OF_RECORD",
  "FILING_RECEIPT",
  "CORRESPONDENCE",
  "POLICY",
  "OTHER",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/**
 * What a caller needs to render and validate one type.
 */
export interface DocumentTypeInfo {
  /** The persisted value. */
  readonly value: DocumentType;
  /** What a person calls it. */
  readonly label: string;
  /** What belongs in it, for a picker's help text and the authoring guide. */
  readonly describes: string;
  /**
   * Whether this kind of document carries a meaningful date of its own.
   *
   * **One property, two consequences**, and they are deliberately not two
   * fields. A type is ordered by its document date exactly when it *has* one
   * worth ordering by, which is exactly when a form should insist the user
   * supplies it. Modelling them separately would invite a state where a type is
   * ordered by a date it never requires — which sorts most of a list by `null`.
   *
   * So `true` means both: order by `documentDate`, and require it at entry.
   * `false` means order by upload time and do not ask.
   */
  readonly hasDocumentDate: boolean;
}

/**
 * The types, with everything needed to present one.
 *
 * A `Record` keyed by the union rather than an array of objects: adding a value
 * to `DOCUMENT_TYPES` without describing it here is then a **type error**, not
 * a picker with a blank row. That is the whole reason for the shape.
 */
export const DOCUMENT_TYPE_INFO: Readonly<
  Record<DocumentType, DocumentTypeInfo>
> = {
  MEETING_MINUTES: {
    value: "MEETING_MINUTES",
    label: "Meeting minutes",
    describes:
      "Board and member meeting minutes, and resolutions adopted at a meeting.",
    // The meeting is the date that matters. Minutes from March uploaded in
    // August belong in March, and sorting them into August defeats the point
    // of keeping them.
    hasDocumentDate: true,
  },
  DOCUMENT_OF_RECORD: {
    value: "DOCUMENT_OF_RECORD",
    label: "Documents of record",
    describes:
      "Business license, EIN letter, 501(c)(3) determination letter, articles of incorporation, bylaws.",
    // A determination letter is a standing fact, not an event. It has an issue
    // date, but nobody browses these chronologically — they look for the one
    // document they need.
    hasDocumentDate: false,
  },
  FILING_RECEIPT: {
    value: "FILING_RECEIPT",
    label: "Filing receipts",
    describes:
      "Proof a filing was made — annual report confirmation, a stamped return, a payment receipt.",
    // The evidence half of every obligation the engine derives, and the date of
    // the filing is exactly what makes it evidence.
    hasDocumentDate: true,
  },
  CORRESPONDENCE: {
    value: "CORRESPONDENCE",
    label: "Agency correspondence",
    describes:
      "Letters from the IRS, a Secretary of State, or a revenue department — including the ones that carry a deadline.",
    // Where an agency-imposed deadline actually arrives, which makes this the
    // most likely source of a document-derived reminder. The letter's date is
    // what any deadline in it counts from.
    hasDocumentDate: true,
  },
  POLICY: {
    value: "POLICY",
    label: "Policies",
    describes:
      "Conflict-of-interest, whistleblower and document-retention policies.",
    // Adopted once and revised rarely. Superseding a policy is a new upload,
    // not a date to sort by.
    hasDocumentDate: false,
  },
  OTHER: {
    value: "OTHER",
    label: "Other",
    describes: "Anything that does not fit the categories above.",
    // Deliberately last, deliberately not a default, and deliberately present.
    //
    // A closed list WILL be wrong for somebody, and the failure mode without an
    // escape hatch is that a person cannot file their document at all. `OTHER`
    // is also what makes adding a seventh type cheap later: the documents that
    // would have belonged to it are already gathered in one place.
    //
    // It is what existing rows get on migration, because nothing knows what
    // those documents were and a migration that guesses is worse than one that
    // admits it.
    hasDocumentDate: false,
  },
};

/**
 * The type an unclassified document gets.
 *
 * Named rather than written as a literal at each call site, so the migration,
 * the store and any importer cannot disagree about it.
 */
export const DEFAULT_DOCUMENT_TYPE: DocumentType = "OTHER";

/**
 * Whether a value is one of the known types.
 *
 * Takes `unknown` because every real caller is holding something off the wire —
 * a form field, a JSON import, a database row written by an older version. A
 * signature of `(value: DocumentType)` would type-check at exactly the places
 * that never needed checking.
 */
export function isDocumentType(value: unknown): value is DocumentType {
  return (
    typeof value === "string" &&
    (DOCUMENT_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Coerce a stored or imported value to a known type.
 *
 * **Falls back to `OTHER` rather than throwing**, and that asymmetry is
 * deliberate: this is for reading. A row written by a newer version, or an
 * import from a system with its own vocabulary, must not make a document
 * unreadable — the bytes and the title are still the user's, and refusing to
 * list them loses more than mislabelling them does.
 *
 * **Writing is the opposite** and must reject an unknown value outright, or the
 * closed list is not closed. Use `isDocumentType` there.
 */
export function toDocumentType(value: unknown): DocumentType {
  return isDocumentType(value) ? value : DEFAULT_DOCUMENT_TYPE;
}

/**
 * Whether this type wants a document date, per `hasDocumentDate`.
 *
 * A function rather than reaching into `DOCUMENT_TYPE_INFO` at each call site,
 * because "does this need a date" is asked by the form, the store and the
 * ordering, and one of the three would otherwise get it wrong.
 */
export function requiresDocumentDate(type: DocumentType): boolean {
  return DOCUMENT_TYPE_INFO[type].hasDocumentDate;
}
