/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The export route serves BOTH kinds of deadline — NEH-1147.
 *
 * `packages/export` has its own tests for the serialisers. This one covers the
 * seam those cannot see: the route built its file from `result.obligations`
 * alone, so every user-authored action was silently absent from the `.ics` and
 * the `.csv` while both files were produced successfully. A serialiser test
 * passes against that defect, because the serialiser was never handed the
 * actions to drop.
 *
 * The store is a REAL in-memory `EntityStore` installed on the same
 * `globalThis` handle `getStore` caches on — not a mock. A mocked store would
 * agree with whatever shape this test imagined, and the point here is that a
 * row written the way the app writes one comes out the other end.
 */
import { EntityStore } from "@optima-compliance/db";

const NOW = "2026-08-24T00:00:00.000Z";
const globalForStore = globalThis as unknown as { optimaStore?: EntityStore };

let store: EntityStore;

beforeEach(() => {
  store = new EntityStore({ path: ":memory:", now: () => NOW });
  globalForStore.optimaStore = store;
});

afterEach(() => {
  delete globalForStore.optimaStore;
});

async function fetchExport(format: "ics" | "csv"): Promise<string> {
  const { GET } = await import("../src/app/api/export/route");
  const response = GET(new Request(`http://localhost/api/export?format=${format}`));
  return response.text();
}

describe("GET /api/export", () => {
  it("carries a user-authored action into the .ics", async () => {
    store.documents.createAction(
      { title: "Respond to the IRS letter", dueOn: "2026-09-15" },
      "act-1",
    );

    const body = await fetchExport("ics");

    expect(body).toContain("SUMMARY:Respond to the IRS letter");
    expect(body).toContain("UID:action-act-1@optimafilings.com");
  });

  it("carries it into the .csv too", async () => {
    store.documents.createAction(
      { title: "Respond to the IRS letter", dueOn: "2026-09-15" },
      "act-1",
    );

    const body = await fetchExport("csv");

    expect(body).toContain("Respond to the IRS letter");
    expect(body).toContain("user");
  });

  it("emits one event per action, so a dropped one is visible as a count", async () => {
    // THE ASSERTION THAT SEES THE ORIGINAL DEFECT. Content checks alone can be
    // satisfied by one surviving row; only the count says none went missing.
    for (const n of [1, 2, 3]) {
      store.documents.createAction({ title: `Action ${n}`, dueOn: `2026-0${n}-15` }, `act-${n}`);
    }

    const body = await fetchExport("ics");

    expect(body.match(/BEGIN:VEVENT/g)).toHaveLength(3);
  });

  it("says how many rows it wrote, rather than only that it wrote a file", async () => {
    for (const n of [1, 2, 3]) {
      store.documents.createAction({ title: `Action ${n}`, dueOn: `2026-0${n}-15` }, `act-${n}`);
    }

    const rows = (await fetchExport("csv")).trimEnd().split("\r\n");

    // Header plus three. An export over an empty set and an export that dropped
    // everything produce the same file, which is exactly the failure this issue
    // was about.
    expect(rows).toHaveLength(4);
  });

  it("produces a well-formed, empty calendar when there is nothing to export", async () => {
    // The control. Without it the count assertions above could be satisfied by
    // a route that emits events unconditionally.
    const body = await fetchExport("ics");

    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("END:VCALENDAR");
    expect(body.match(/BEGIN:VEVENT/g)).toBeNull();
  });
});
