/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import Link from "next/link";
import { css } from "styled-system/css";
import {
  StyledCalendar,
  StyledCalendarAdd,
  StyledDownload,
  StyledEntity,
  StyledForm,
  StyledUnverified,
} from "@optima-compliance/ui";
import { getStore, today } from "@/lib/server";
import {
  hasAnnualExemptOrganizationReturn,
  hasDraftItems,
  mergedCalendar,
} from "@/lib/calendar";
import { WindowList } from "@/components/window-list";
import { Disclaimer } from "@/components/disclaimer";
import { DraftBanner } from "@/components/draft-banner";
import { RevocationNotice } from "@/components/revocation-notice";
import { describeMissingFacts } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Getting the deadlines out of the tool.
 *
 * `/api/export` has worked since NEH-211 and **nothing linked to it** — so a
 * user who did not read the source could not find it, and the issue that built
 * it ("Deadlines cannot leave the tool, so nobody will actually see them") was
 * closed with its user-facing half missing. Found by the E2E suite, which went
 * looking for a control to click and found none (NEH-378).
 *
 * ## Why this is a section and not another entry in the header nav
 *
 * The nav is already four links of roughly equal weight, and this one needs a
 * sentence: "export" alone does not tell a person that the point is to get
 * these dates into the calendar they already look at. That sentence is the
 * feature — a compliance calendar nobody is reminded by is a spreadsheet.
 *
 * ## Why the wording leads with the outcome
 *
 * "Add to your calendar", not ".ics". The people this product is for know they
 * want the dates in Outlook or Google Calendar; almost none of them know that
 * is called iCalendar, and a link labelled by its file extension is one they
 * will not press. The extension is still shown, in parentheses, for the person
 * who does care.
 *
 * Plain anchors, so this works with no JavaScript and is keyboard-reachable
 * without anything further — the self-hosted tier cannot assume either.
 */
function ExportSection({ hasAnything }: { hasAnything: boolean }) {
  // Nothing to export is not worth offering. An empty .ics file downloads
  // successfully and teaches the user the feature is broken.
  if (!hasAnything) return null;

  return (
    <section className={css({ marginTop: "8" })}>
      <h2 className={css({ fontSize: "lg", marginBottom: "1" })}>
        Take these dates with you
      </h2>
      <p className={css({ fontSize: "sm", color: "boxTextSecondary", marginTop: "0" })}>
        A calendar you never look at is a calendar you will miss. Subscribe or
        import these deadlines wherever you already keep your dates.
      </p>
      <p className={css({ marginTop: "2" })}>
        {/*
          `download` so the browser saves rather than navigates. The route
          already sets `content-disposition: attachment`, but a server header
          and a client hint disagreeing is exactly the kind of thing that
          behaves differently in one browser.
        */}
        <a href="/api/export?format=ics" download>
          <StyledCalendarAdd /> Add to your calendar (.ics)
        </a>{" "}
        ·{" "}
        <a href="/api/export?format=csv" download>
          <StyledDownload /> Download as a spreadsheet (.csv)
        </a>
      </p>
    </section>
  );
}

export default function HomePage() {
  const asOf = today();
  const { bucketed, indeterminate } = mergedCalendar(asOf);
  const store = getStore();
  const entityCount = store.list().length;
  // Whether the export would contain anything. Derived from the same bucketed
  // calendar the list renders, so the link cannot appear when the page is empty
  // or disappear when it is not.
  //
  // All three branches, explicitly. `windows` is a Record of arrays rather than
  // an array, so a flat `Object.values(bucketed).some(...)` silently skips it —
  // which would hide the link in the most common case of all, an entity whose
  // deadlines are simply upcoming.
  const hasDatedItems =
    bucketed.overdue.length > 0 ||
    bucketed.later.length > 0 ||
    Object.values(bucketed.windows).some((items) => items.length > 0);
  const documentCount = store.documents.listDocuments().length;

  return (
    <main className={css({ maxWidth: "5xl", margin: "0 auto", padding: "6" })}>
      <header className={css({ marginBottom: "6" })}>
        <h1 className={css({ fontSize: "3xl", margin: "0" })}>
          <StyledCalendar /> Compliance calendar
        </h1>
        <p className={css({ color: "boxTextSecondary", marginTop: "1" })}>
          Everything with a date, as of {asOf} — what the rules say you owe, and
          whatever you are tracking yourself.
        </p>
        <nav className={css({ marginTop: "2", fontSize: "sm" })}>
          <Link href="/actions/new">Add an action</Link> ·{" "}
          <Link href="/documents/new">Upload a document</Link> ·{" "}
          <Link href="/documents">
            <StyledForm /> Documents ({documentCount})
          </Link>{" "}
          ·{" "}
          <Link href="/entities/new">
            <StyledEntity /> Add an entity ({entityCount})
          </Link>
        </nav>
      </header>

      {/*
        The DATA, not the flag. `includeDraft()` is what lets a draft through;
        it is not evidence that one came through. See `hasDraftItems`.
      */}
      {hasDraftItems({ bucketed, indeterminate }) && <DraftBanner />}

      <WindowList bucketed={bucketed} asOf={asOf} />

      {/*
        The DATA again, not a flag and not an unconditional paragraph. A
        standing warning on every calendar is furniture; this one appears when
        the calendar actually holds a return whose non-filing revokes the
        exemption. See `hasAnnualExemptOrganizationReturn`.
      */}
      {hasAnnualExemptOrganizationReturn({ bucketed, indeterminate }) && (
        <RevocationNotice />
      )}

      <ExportSection hasAnything={hasDatedItems} />

      {indeterminate.length > 0 && (
        <section
          className={css({ marginTop: "6", padding: "4", borderRadius: "md" })}
          style={{ background: "var(--optima-box-info-bg)" }}
        >
          <h2 className={css({ fontSize: "lg", marginTop: "0" })}>Cannot tell yet</h2>
          <p className={css({ fontSize: "sm", marginTop: "1" })}>
            These rules depend on something an entity has not told us. They have
            no date, so they cannot appear above — but they are not ruled out
            either.
          </p>
          {/*
            The payoff of keeping a missing fact missing rather than defaulting
            it. Decide it and a private foundation is quietly told to file the
            990-N e-Postcard, which it may never file — wrong in the customer's
            favour, the worst direction for a compliance product.

            Phrased as the question it is, and pointing at the one screen that
            answers it. A row that says "cannot tell" with nothing to do about
            it is the state this section exists to avoid, not to describe.
          */}
          <ul className={css({ fontSize: "sm" })}>
            {indeterminate.map((rule) => (
              <li key={`${rule.entityName}-${rule.ruleId}`}>
                <strong>{rule.title}</strong> ({rule.jurisdiction})
                {/*
                  Same marker as a dated row, for the same reason. An
                  indeterminate rule carries `status` exactly as an obligation
                  does, and a draft one is no more verified for having no date
                  — but this list rendered it with nothing to say so, which is
                  the gap the banner above would otherwise be describing
                  without pointing at anything.
                */}
                {rule.status === "draft" && (
                  <span
                    className={css({ fontSize: "sm", marginLeft: "2" })}
                    style={{ color: "var(--optima-text-warning-text)" }}
                  >
                    <StyledUnverified title="Unverified" /> unverified
                  </span>
                )}{" "}
                — we need to know {describeMissingFacts(rule.missingFacts)} for{" "}
                {rule.entityName}.{" "}
                <Link href={`/entities/${rule.entityId}/edit`}>
                  Add that detail
                </Link>{" "}
                and we will work it out.
              </li>
            ))}
          </ul>
        </section>
      )}

      {store.list().length > 0 && (
        <section className={css({ marginTop: "8" })}>
          <h2 className={css({ fontSize: "lg" })}>Entities</h2>
          <ul className={css({ listStyle: "none", padding: "0" })}>
            {store.list().map((entity) => (
              <li key={entity.id} className={css({ paddingBlock: "1" })}>
                <StyledEntity /> {entity.name}{" "}
                <span className={css({ fontSize: "sm", color: "boxTextSecondary" })}>
                  formed {entity.formedOn}
                </span>{" "}
                <Link href={`/entities/${entity.id}/edit`}>Edit</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Disclaimer />
    </main>
  );
}
