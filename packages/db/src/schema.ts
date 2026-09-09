/**
 * The self-host schema and its migrations.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * SQLite via **`node:sqlite`**, which ships with Node — so the self-host tier
 * has zero runtime dependencies and no native module to compile. That matters
 * more than it looks: the image is published multi-arch for people running it
 * on ARM boxes and Pis, and a native build is the usual reason such an image
 * works on one architecture and not the other.
 */

/**
 * Migrations, applied in order and recorded so they run once.
 *
 * **Append only. Never edit a migration that has shipped** — a self-hoster's
 * database has already run it, so an edit changes what new installs get without
 * changing existing ones, and the two silently diverge. Correct a mistake with
 * a new migration.
 */
export const MIGRATIONS: readonly { id: number; name: string; sql: string }[] = [
  {
    id: 1,
    name: "entities",
    sql: `
      CREATE TABLE entities (
        id                 TEXT PRIMARY KEY,
        name               TEXT NOT NULL,
        entity_types       TEXT NOT NULL,
        formed_on          TEXT NOT NULL,
        home_jurisdiction  TEXT NOT NULL,
        jurisdictions      TEXT NOT NULL,
        fiscal_year_end    TEXT NOT NULL,
        registered_on      TEXT,

        -- NULLABLE ON PURPOSE, all four. The engine distinguishes "we do not
        -- know" from a real value and reports the rule as indeterminate rather
        -- than guessing. A NOT NULL DEFAULT 0 here would destroy that
        -- distinction at the storage layer and quietly tell a large charity it
        -- qualifies for the postcard return.
        gross_revenue_minor_units  INTEGER,
        total_assets_minor_units   INTEGER,
        employee_count             INTEGER,
        solicits_charitable_contributions INTEGER,

        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX idx_entities_name ON entities (name);
    `,
  },
  {
    id: 2,
    name: "documents_and_actions",
    sql: `
      -- A document may belong to no entity. Someone filing their first
      -- paperwork often has the letter before they have modelled the entity,
      -- and refusing the upload until they do would lose the document.
      CREATE TABLE documents (
        id           TEXT PRIMARY KEY,
        entity_id    TEXT REFERENCES entities(id) ON DELETE SET NULL,
        title        TEXT NOT NULL,
        -- The name the user's file had. NOT a path: see storage_key.
        original_filename TEXT NOT NULL,
        content_type TEXT NOT NULL,
        byte_size    INTEGER NOT NULL,
        -- Opaque, generated, and the ONLY thing used to build a filesystem
        -- path. A user-supplied filename reaching the filesystem is how
        -- "../../etc/passwd" becomes a write primitive.
        storage_key  TEXT NOT NULL UNIQUE,
        notes        TEXT,
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL
      );

      CREATE INDEX idx_documents_entity ON documents (entity_id);
      CREATE INDEX idx_documents_title  ON documents (title);

      -- Reference numbers pulled out of a document so they are searchable
      -- rather than buried in a PDF: UBI, DUNS, EIN, account numbers.
      CREATE TABLE document_fields (
        id          TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        label       TEXT NOT NULL,
        -- As written on the document, so it can be matched by eye against the
        -- paper: "604 123 456".
        value       TEXT NOT NULL,
        -- Lowercased, alphanumeric only. Exists because people type reference
        -- numbers from memory WITHOUT the separators the agency printed —
        -- searching "604123456" must find "604 123 456", or the whole
        -- find-my-UBI use case fails at the first attempt.
        value_normalized TEXT NOT NULL
      );

      CREATE INDEX idx_document_fields_document   ON document_fields (document_id);
      CREATE INDEX idx_document_fields_value      ON document_fields (value);
      CREATE INDEX idx_document_fields_normalized ON document_fields (value_normalized);

      -- A user-authored obligation. Deliberately NOT derived from a rule:
      -- this is the escape hatch for everything the engine does not cover,
      -- and for users who would rather keep their own dates.
      CREATE TABLE actions (
        id           TEXT PRIMARY KEY,
        entity_id    TEXT REFERENCES entities(id) ON DELETE CASCADE,
        document_id  TEXT REFERENCES documents(id) ON DELETE SET NULL,
        title        TEXT NOT NULL,
        detail       TEXT,
        due_on       TEXT NOT NULL,
        -- NULL means outstanding. A date, not a boolean, because "when did we
        -- file it" is the question asked afterwards.
        completed_on TEXT,
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL
      );

      CREATE INDEX idx_actions_due       ON actions (due_on);
      CREATE INDEX idx_actions_entity    ON actions (entity_id);
      CREATE INDEX idx_actions_document  ON actions (document_id);
    `,
  },
  {
    id: 3,
    name: "recurring_actions",
    sql: `
      -- Nearly every compliance obligation is annual. Without this, someone
      -- tracking their own dates must re-add each filing every year, and the
      -- year they forget is the year they miss it.
      ALTER TABLE actions ADD COLUMN repeat_annually INTEGER NOT NULL DEFAULT 0;

      -- Records that the successor has been created, so reopen-then-recomplete
      -- — a normal path, when an agency rejects a filing — does not spawn a
      -- second copy. Inferring this from the data would mean guessing whether a
      -- similar-looking future action was ours or the user's.
      ALTER TABLE actions ADD COLUMN successor_spawned INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    id: 4,
    name: "document_type_and_date",
    sql: `
      -- What kind of document this is. The vocabulary lives in
      -- @optima-compliance/engine (DOCUMENT_TYPES) so the hosted tier imports the same
      -- list rather than mirroring it — see NEH-343 for what mirroring costs.
      --
      -- Stored as TEXT with no CHECK constraint on purpose. SQLite cannot alter
      -- a constraint without rebuilding the table, so a CHECK here would make
      -- adding a seventh type a table rebuild on every self-hoster's database.
      -- The vocabulary is enforced where values are written, which is the layer
      -- that can give a useful error anyway.
      --
      -- DEFAULT 'OTHER' is what existing rows get, and it is the honest answer:
      -- nothing knows what those documents were. A migration that guessed from
      -- the title would mislabel some of them, and a mislabelled document is
      -- worse than an unlabelled one because the filter hides it from the
      -- person who would have spotted the mistake.
      ALTER TABLE documents ADD COLUMN type TEXT NOT NULL DEFAULT 'OTHER';

      -- The date ON the document, as opposed to created_at, which is when
      -- somebody uploaded it. Minutes from the March meeting scanned in August
      -- belong in March.
      --
      -- A 'YYYY-MM-DD' civil date, never a timestamp — the same rule
      -- entities.formed_on follows. A meeting is a calendar fact in a place,
      -- not an instant, and a timestamp acquires a zone that shifts it a day.
      --
      -- NULLABLE, and it stays nullable even though the UI requires it for the
      -- dated types: every row that predates this migration has no date and
      -- none can be invented for them.
      ALTER TABLE documents ADD COLUMN document_date TEXT;

      -- Filtering by type is the point of the column.
      CREATE INDEX idx_documents_type ON documents (type);

      -- The list view's actual query: one type, most recent first. Composite
      -- rather than two single-column indexes, because SQLite uses one index
      -- per table in a query and a type-only index would still leave the sort
      -- to a scan.
      CREATE INDEX idx_documents_type_date ON documents (type, document_date);
    `,
  },
  {
    id: 5,
    name: "private_foundation",
    sql: `
      -- Whether a 501(c)(3) is a private foundation rather than a public
      -- charity. A private foundation files Form 990-PF and may never file the
      -- 990-N e-Postcard at any receipts level, so without this the engine
      -- matched one on its receipts alone and named the wrong return.
      --
      -- NULLABLE, AND NULL IS THE POINT. Three states, not two: yes, no, and
      -- nobody has been asked. Every row that predates this migration is the
      -- third, and it is the only honest value for them — a
      -- NOT NULL DEFAULT 0 would silently answer "public charity" on behalf of
      -- every existing self-hoster, which is exactly the wrong answer for the
      -- foundations this column exists to catch and restores the under-filing
      -- it removes.
      --
      -- The engine reads an absent fact as indeterminate and reports the rule
      -- with the question attached, so a NULL here produces "we need to ask
      -- you something" rather than a wrong deadline.
      ALTER TABLE entities ADD COLUMN is_private_foundation INTEGER;
    `,
  },
  {
    id: 6,
    name: "supporting_organization_and_prior_year_receipts",
    sql: `
      -- Whether a 501(c)(3) is a section 509(a)(3) SUPPORTING ORGANISATION.
      --
      -- A second carve-out from the 990-N e-Postcard, on a different authority
      -- from the private-foundation one and therefore a second column rather
      -- than a widening of the first. Rev. Proc. 2011-15 sec. 3.01 relieves
      -- from the annual return only an organisation "other than a private
      -- foundation or a § 509(a)(3) supporting organization", so a supporting
      -- organisation files Form 990 or Form 990-EZ however small it is.
      --
      -- NULLABLE, AND NULL IS AGAIN THE POINT. Yes, no, and nobody has been
      -- asked are three states. Every row that predates this migration is the
      -- third, and a NOT NULL DEFAULT 0 would answer "not a supporting
      -- organisation" on behalf of every existing self-hoster - which is the
      -- exact under-filing this column exists to remove.
      ALTER TABLE entities ADD COLUMN is_supporting_organization INTEGER;

      -- Gross receipts for the two taxable years before the one
      -- gross_revenue_minor_units describes.
      --
      -- The federal small-organisation test is not a test on one year. Rev.
      -- Proc. 2011-15 sec. 4 defines "normally not more than $50,000" as an
      -- AVERAGE, and evaluating a single year is wrong in both directions: a
      -- one-off bequest pushes a genuinely small organisation onto a fuller
      -- return, and a lean year after two large ones qualifies an organisation
      -- for a return it may not file. The second is under-filing, which is why
      -- these columns exist rather than the limitation being written down.
      --
      -- NULLABLE, and blank is a NORMAL answer here rather than an omission to
      -- chase: a new organisation has no prior years and never will. The
      -- engine averages whatever run of years it is given, starting from the
      -- current one. A DEFAULT 0 would not fail loudly either - it would claim
      -- every existing organisation earned nothing in both prior years and drag
      -- its averaged receipts toward zero, qualifying large ones for the
      -- postcard return.
      ALTER TABLE entities ADD COLUMN gross_revenue_prior_year_1_minor_units INTEGER;
      ALTER TABLE entities ADD COLUMN gross_revenue_prior_year_2_minor_units INTEGER;
    `,
  },
  {
    id: 7,
    name: "charitable_assets",
    sql: `
      -- The portion of an organisation's assets held for charitable purposes.
      --
      -- A SEPARATE column from total_assets_minor_units, and the separation is
      -- the whole point: an organisation may hold substantial non-charitable
      -- assets, and testing a charity-registration threshold against the total
      -- over-triggers it into a registration the statute does not ask for.
      -- \`EntityFacts\` has drawn that distinction since the fact was split out;
      -- storage had not, so every figure a self-hoster typed was accepted and
      -- discarded. Nothing failed - \`create()\` re-reads the row it wrote, so
      -- the value it returns looks right - and the field then read back blank
      -- on the edit screen, which looks like a failed save rather than a lost
      -- fact.
      --
      -- The visible cost is us-wa-charitable-trust-registration, the one rule
      -- that conditions on this fact: it could never be decided for a
      -- self-hoster, however carefully the form was filled in, and asked
      -- forever for a figure already given. WAC 434-120-305 requires a trustee
      -- to register where they hold assets "invested for income-producing
      -- purposes, exceeding a value of two hundred fifty thousand dollars".
      --
      -- NULLABLE, AND NULL IS THE POINT, for the third time in three
      -- migrations. A NOT NULL DEFAULT 0 would claim every organisation already
      -- in every self-hoster's database holds no charitable assets - a firm
      -- "below the line" rather than an honest "nobody has been asked", on a
      -- registration Washington does enforce. The engine reads an absent fact
      -- as indeterminate and attaches the question; it reads a zero as an
      -- answer.
      ALTER TABLE entities ADD COLUMN charitable_assets_minor_units INTEGER;
    `,
  },
  {
    id: 8,
    name: "wa_volunteer_exemption_and_income_producing_assets",
    sql: `
      -- Four columns for two Washington rules that were each asking a question
      -- the fact model could not answer, so each answered a NEARBY question
      -- instead and told some organisations to make a filing they do not owe.

      -- Contributions RAISED in the accounting year: money obtained by asking.
      --
      -- A SEPARATE column from gross_revenue_minor_units, and the separation is
      -- the point. Gross revenue also carries program-service revenue, ticket
      -- sales, investment income and government contracts, none of which is
      -- raised by solicitation. RCW 19.09.081(1) exempts a charity "raising
      -- less than fifty thousand dollars in any accounting year" when the other
      -- two limbs below also hold, and testing gross revenue against that line
      -- would deny the exemption to a theatre living on ticket sales.
      ALTER TABLE entities ADD COLUMN contributions_raised_minor_units INTEGER;

      -- Whether ALL the organisation's activities, fundraising included, are
      -- carried on by people unpaid for their services. The second limb of the
      -- same exemption, verbatim: "when all the activities of the organization,
      -- including all fund-raising activities, are carried on by persons who
      -- are unpaid for their services".
      --
      -- NULLABLE, AND NULL IS THE POINT, for the fourth time in four
      -- migrations. Both defaults are wrong in a way that hides: a
      -- NOT NULL DEFAULT 0 denies the exemption to every organisation already
      -- in every self-hoster's database, which is the over-filing this column
      -- exists to remove, and a DEFAULT 1 grants it to all of them, which is
      -- under-filing. The third state is the only honest value for a row
      -- nobody has asked.
      ALTER TABLE entities ADD COLUMN all_fundraising_unpaid INTEGER;

      -- Whether any part of assets or income inures to, or is paid to, an
      -- officer, director, member or trustee -- other than as part of a
      -- charitable class the organisation benefits. The THIRD limb of the same
      -- exemption, and it is stored rather than assumed because the exemption
      -- is conjunctive: leaving a limb out makes the exemption this pack
      -- implements broader than the statute's, exempting organisations the
      -- statute does not. That is under-filing.
      --
      -- Stored POSITIVELY -- 1 means inurement exists and the organisation
      -- must register -- so the rule reads as a plain condition rather than a
      -- negation of a negation. The statute phrases it the other way round, so
      -- read the sign before comparing the two.
      ALTER TABLE entities ADD COLUMN assets_or_income_inure_to_insiders INTEGER;

      -- The portion of charitable assets INVESTED FOR INCOME-PRODUCING
      -- PURPOSES.
      --
      -- Narrower than charitable_assets_minor_units, added one migration ago,
      -- and a separate column rather than a redefinition of it: a self-hoster
      -- has already answered the broader question, and narrowing a column's
      -- meaning in place re-answers it on their behalf with nothing failing
      -- anywhere. WAC 434-120-305 requires a trustee to register where "the
      -- trustee holds assets, invested for income-producing purposes,
      -- exceeding a value of two hundred fifty thousand dollars", and the
      -- qualifier is doing real work: a land trust holding easements, a museum
      -- holding a collection and a food bank holding its warehouse each hold
      -- charitable assets far over the line while holding nothing invested for
      -- income. All three were being told to register.
      --
      -- NULLABLE, and a genuine 0 is a real answer that must survive: an
      -- organisation really can hold no income-producing assets, which is a
      -- different fact from not having been asked. Only one of them is an
      -- answer, and the engine reads them differently.
      ALTER TABLE entities ADD COLUMN income_producing_charitable_assets_minor_units INTEGER;
    `,
  },
];
