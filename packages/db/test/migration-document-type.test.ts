/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Migration 4 against a database that already has documents in it.
 *
 * ## Why this is the integration tier and not a unit test
 *
 * The thing that can go wrong is not the SQL text — it is what the SQL does to
 * **a database a self-hoster already has**. `ALTER TABLE ... ADD COLUMN NOT NULL
 * DEFAULT` behaves differently across SQLite versions and differently again when
 * the table has rows, and none of that is observable against a mock. So these
 * run the real migration runner against a real database file built up to the
 * previous migration, with real rows in it.
 *
 * The failure being guarded against is quiet: a self-hoster upgrades, the
 * migration half-applies or backfills something unexpected, and forty documents
 * come back mislabelled or invisible. Nobody reports that as a bug — they
 * conclude the feature does not work.
 *
 * A file on disk rather than `:memory:`, because the whole question is whether
 * an EXISTING database survives, and an in-memory database has no past.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DEFAULT_DOCUMENT_TYPE } from "@optima-compliance/engine";
import { MIGRATIONS } from "../src/schema.js";
import { EntityStore } from "../src/store.js";

/** The migration under test, and the state a database must be in before it. */
const NEW_MIGRATION_ID = 4;

let dir: string;
let path: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "optima-migration-"));
  path = join(dir, "test.sqlite");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/**
 * Build a database at the state BEFORE the new migration, the same way a real
 * install got there: by running the earlier migrations, in order, through the
 * same SQL that shipped.
 */
function seedAtPreviousMigration(): void {
  const db = new DatabaseSync(path);
  db.exec(
    "CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)",
  );
  for (const migration of MIGRATIONS) {
    if (migration.id >= NEW_MIGRATION_ID) continue;
    db.exec(migration.sql);
    db.prepare(
      "INSERT INTO migrations (id, name, applied_at) VALUES (?, ?, ?)",
    ).run(migration.id, migration.name, "2026-01-01T00:00:00.000Z");
  }

  // Two documents that predate the new columns entirely.
  for (const [id, title] of [
    ["doc-old-1", "WA SOS formation letter"],
    ["doc-old-2", "March board minutes"],
  ]) {
    db.prepare(
      `INSERT INTO documents (id, entity_id, title, original_filename,
         content_type, byte_size, storage_key, notes, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      id,
      null,
      title,
      `${id}.pdf`,
      "application/pdf",
      1024,
      `key-${id}`,
      null,
      "2026-01-02T00:00:00.000Z",
      "2026-01-02T00:00:00.000Z",
    );
  }
  db.close();
}

const openStore = () =>
  new EntityStore({
    path,
    now: () => "2026-08-05T00:00:00.000Z",
    newId: () => "field-1",
  });

describe("migration 4, on a database that already has documents", () => {
  it("is in the list, in order, and does not edit an earlier one", () => {
    // The append-only rule from schema.ts, asserted rather than trusted. An
    // edit to a shipped migration changes what NEW installs get without
    // changing existing ones, and the two then diverge in silence.
    const ids = MIGRATIONS.map((m) => m.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(new Set(ids).size).toBe(ids.length);
    // Present, NOT last. This asserted "is the final migration" until
    // migration 5 arrived, which is a test that goes red for every future
    // migration and whose easiest green is to renumber or fold the new one
    // into an earlier entry — the exact append-only violation the assertion
    // above exists to catch. Each migration's own file guards its own id.
    expect(ids).toContain(NEW_MIGRATION_ID);
  });

  it("applies cleanly and records itself", () => {
    seedAtPreviousMigration();
    openStore().close();

    const db = new DatabaseSync(path);
    const applied = (
      db.prepare("SELECT id FROM migrations ORDER BY id").all() as unknown as {
        id: number;
      }[]
    ).map((r) => r.id);
    db.close();

    expect(applied).toContain(NEW_MIGRATION_ID);
  });

  it("gives every pre-existing row the OTHER type and no document date", () => {
    // The honest outcome. Nothing knows what those documents were, and a
    // migration that guessed from the title would mislabel some of them — worse
    // than leaving them unlabelled, because the filter then HIDES a document
    // from the person who would have spotted the mistake.
    //
    // Note "March board minutes" is deliberately named so a title-guessing
    // backfill would classify it. It must still land on OTHER.
    seedAtPreviousMigration();
    const store = openStore();

    const documents = store.documents.listDocuments();
    expect(documents).toHaveLength(2);
    for (const document of documents) {
      expect(document.type).toBe(DEFAULT_DOCUMENT_TYPE);
      expect(document.documentDate).toBeUndefined();
    }
    store.close();
  });

  it("loses nothing that was already there", () => {
    seedAtPreviousMigration();
    const store = openStore();

    const titles = store.documents
      .listDocuments()
      .map((d) => d.title)
      .sort();
    expect(titles).toEqual(["March board minutes", "WA SOS formation letter"]);
    store.close();
  });

  it("is idempotent across a reopen", () => {
    // Every start-up runs the migration step. Applying twice must be a no-op,
    // or the second launch after an upgrade fails with "duplicate column".
    seedAtPreviousMigration();
    openStore().close();
    expect(() => openStore().close()).not.toThrow();
  });

  it("applies to a brand-new database too", () => {
    // The other install path: someone who has never run an earlier version.
    // Both must end at the same schema, or new and upgraded installs diverge.
    const store = openStore();
    expect(store.documents.listDocuments()).toEqual([]);
    store.close();

    const db = new DatabaseSync(path);
    const columns = (
      db.prepare("PRAGMA table_info(documents)").all() as unknown as {
        name: string;
      }[]
    ).map((c) => c.name);
    db.close();

    expect(columns).toContain("type");
    expect(columns).toContain("document_date");
  });
});

describe("filtering and ordering against a real database", () => {
  const base = {
    originalFilename: "f.pdf",
    contentType: "application/pdf",
    byteSize: 10,
  };

  it("returns only the requested type", () => {
    const store = openStore();
    store.documents.createDocument(
      { ...base, title: "March minutes", storageKey: "k1", type: "MEETING_MINUTES", documentDate: "2026-03-04" },
      "d1",
    );
    store.documents.createDocument(
      { ...base, title: "EIN letter", storageKey: "k2", type: "DOCUMENT_OF_RECORD" },
      "d2",
    );

    expect(
      store.documents.listDocuments("MEETING_MINUTES").map((d) => d.id),
    ).toEqual(["d1"]);
    expect(
      store.documents.listDocuments("DOCUMENT_OF_RECORD").map((d) => d.id),
    ).toEqual(["d2"]);
    expect(store.documents.listDocuments()).toHaveLength(2);
    store.close();
  });

  it("orders a dated type by the document date, not the upload date", () => {
    // The point of the whole feature. All three are uploaded in one call, so
    // created_at cannot separate them — only document_date can.
    const store = openStore();
    store.documents.createDocument(
      { ...base, title: "January", storageKey: "k1", type: "MEETING_MINUTES", documentDate: "2026-01-10" },
      "jan",
    );
    store.documents.createDocument(
      { ...base, title: "March", storageKey: "k2", type: "MEETING_MINUTES", documentDate: "2026-03-10" },
      "mar",
    );
    store.documents.createDocument(
      { ...base, title: "February", storageKey: "k3", type: "MEETING_MINUTES", documentDate: "2026-02-10" },
      "feb",
    );

    expect(
      store.documents.listDocuments("MEETING_MINUTES").map((d) => d.id),
    ).toEqual(["mar", "feb", "jan"]);
    store.close();
  });

  it("falls back to the upload date for rows with no document date", () => {
    // Without the coalesce, every pre-migration row sinks below everything
    // under a NULL sort — which looks exactly like the upgrade lost them.
    seedAtPreviousMigration();
    const store = openStore();
    store.documents.createDocument(
      { ...base, title: "Recent minutes", storageKey: "k9", type: "MEETING_MINUTES", documentDate: "2026-07-01" },
      "new",
    );

    const all = store.documents.listDocuments();
    expect(all).toHaveLength(3);
    // The dated 2026-07-01 row sorts above the two 2026-01-02 uploads.
    expect(all[0]?.id).toBe("new");
    store.close();
  });

  it("ANDs the type filter with a search rather than replacing it", () => {
    // Someone who has filtered to Meeting Minutes and then searches expects to
    // search WITHIN the minutes. Dropping the filter would resurrect documents
    // they had just excluded.
    const store = openStore();
    store.documents.createDocument(
      { ...base, title: "Budget minutes", storageKey: "k1", type: "MEETING_MINUTES", documentDate: "2026-03-04" },
      "d1",
    );
    store.documents.createDocument(
      { ...base, title: "Budget policy", storageKey: "k2", type: "POLICY" },
      "d2",
    );

    expect(store.documents.searchDocuments("Budget")).toHaveLength(2);
    expect(
      store.documents.searchDocuments("Budget", "MEETING_MINUTES").map((d) => d.id),
    ).toEqual(["d1"]);
    store.close();
  });

  it("counts every type, including the empty ones", () => {
    // Zero is information: a filter that only lists types you already have
    // cannot tell you the category exists.
    const store = openStore();
    store.documents.createDocument(
      { ...base, title: "EIN letter", storageKey: "k1", type: "DOCUMENT_OF_RECORD" },
      "d1",
    );

    const counts = store.documents.countDocumentsByType();
    expect(counts.DOCUMENT_OF_RECORD).toBe(1);
    expect(counts.MEETING_MINUTES).toBe(0);
    expect(counts.OTHER).toBe(0);
    store.close();
  });
});

describe("writing rejects what reading tolerates", () => {
  const base = {
    originalFilename: "f.pdf",
    contentType: "application/pdf",
    byteSize: 10,
  };

  it("refuses an unknown type", () => {
    const store = openStore();
    expect(() =>
      store.documents.createDocument(
        // Cast because the whole point is a caller that got this from outside
        // the type system — a form post, a JSON import.
        { ...base, title: "x", storageKey: "k1", type: "INVOICE" as never },
        "d1",
      ),
    ).toThrow(/Unknown document type/);
    store.close();
  });

  it("refuses a dated type with no date", () => {
    // Enforced in the store, not only the form, because the CLI and any
    // importer reach this path without passing through a form.
    const store = openStore();
    expect(() =>
      store.documents.createDocument(
        { ...base, title: "Minutes", storageKey: "k1", type: "MEETING_MINUTES" },
        "d1",
      ),
    ).toThrow(/needs a documentDate/);
    store.close();
  });

  it("allows an undated type with no date", () => {
    const store = openStore();
    expect(() =>
      store.documents.createDocument(
        { ...base, title: "Bylaws", storageKey: "k1", type: "DOCUMENT_OF_RECORD" },
        "d1",
      ),
    ).not.toThrow();
    store.close();
  });

  it("defaults a document with no type at all to OTHER", () => {
    // An importer that does not know the kind must still be able to store the
    // document.
    const store = openStore();
    const created = store.documents.createDocument(
      { ...base, title: "Mystery", storageKey: "k1" },
      "d1",
    );
    expect(created.type).toBe(DEFAULT_DOCUMENT_TYPE);
    store.close();
  });

  it("reads a row written with an unrecognised type as OTHER", () => {
    // A row from a newer version. It must stay readable — the bytes and the
    // title are still the user's, and hiding it loses more than mislabelling.
    const store = openStore();
    store.documents.createDocument(
      { ...base, title: "Future", storageKey: "k1", type: "OTHER" },
      "d1",
    );
    store.close();

    const db = new DatabaseSync(path);
    db.prepare("UPDATE documents SET type = ? WHERE id = ?").run(
      "BOARD_PACK",
      "d1",
    );
    db.close();

    const reopened = openStore();
    const document = reopened.documents.getDocument("d1");
    expect(document?.type).toBe(DEFAULT_DOCUMENT_TYPE);
    expect(document?.title).toBe("Future");
    // And it still counts, so the totals add up to the documents that exist.
    expect(reopened.documents.countDocumentsByType().OTHER).toBe(1);
    reopened.close();
  });
});
