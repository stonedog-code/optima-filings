/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The Terms of Use say the things they exist to say, and claim nothing they
 * cannot support — NEH-240.
 *
 * ## Why a legal document gets a test at all
 *
 * The same reasoning as `no-trademark-claim.test.ts` next door, which exists
 * because an unsupported trademark assertion shipped to `main` inside a PR
 * about something else. Copy is edited by people who are thinking about layout,
 * and a sentence removed from a legal document leaves no gap where it used to
 * be.
 *
 * This repo makes that worse in a specific way: it is public and AGPL-3.0, and
 * its distribution model is self-hosters running and redistributing the app. A
 * bad sentence propagates to every deployment, and no later commit recalls the
 * copies.
 *
 * ## What this does NOT check
 *
 * Whether the terms are *legally effective*. Nothing here can answer that, and
 * pretending otherwise would be the worst version of this file. **These terms
 * have not been reviewed by a lawyer** — that is recorded in `content/terms.ts`
 * and in the issue, and it is why the assertions below are about the document
 * staying narrow rather than about it being strong.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  TERMS_EFFECTIVE_DATE,
  TERMS_SECTIONS,
  TERMS_SUMMARY,
  TERMS_TITLE,
} from "../src/content/terms";

const allText = [
  TERMS_SUMMARY,
  ...TERMS_SECTIONS.flatMap((s) => [s.heading, ...s.paragraphs]),
].join("\n");

describe("the Terms of Use say what they exist to say", () => {
  it("covers reliance on the compliance data, which is the whole point", () => {
    /*
      NEH-240's finding: the AGPL disclaims warranty for *the Program*, and
      "the software has a bug" is a different claim from "the deadline you
      published was wrong". A generous reading covers the rule packs, since they
      ship inside the Program — this document exists so the project does not
      depend on the generous reading.
    */
    expect(allText).toMatch(/reliance/i);
    expect(allText).toMatch(/compliance (data|information)/i);
    expect(allText).toMatch(/missed deadlines?/i);
  });

  it("disclaims warranty and limits liability in terms that name the data", () => {
    expect(allText).toMatch(/as is/i);
    expect(allText).toMatch(/without warranty/i);
    expect(allText).toMatch(/not liable/i);
    // The extension beyond the licence is the reason this file exists, so it is
    // asserted rather than left to a reader to notice.
    expect(allText).toMatch(/rule data as well as the code/i);
  });

  it("says the agency wins a disagreement", () => {
    // The product's honest position, already stated in the cloud repo's docs.
    // A terms page that quietly reversed it would be the more dangerous
    // document, because it reads as more protective.
    expect(allText).toMatch(/the agency is right/i);
  });

  it("keeps the AGPL untouched rather than layering over it", () => {
    expect(allText).toMatch(/Affero General Public License/i);
    expect(allText).toMatch(/not changed by anything here|these terms do not change/i);
  });

  it("tells a self-hoster that redistributing makes them the relied-upon party", () => {
    // The case most likely to be misread: the licence permits hosting for
    // others, and doing so moves who the user is relying on.
    expect(allText).toMatch(/host(ing)? this for (other people|somebody else)|for somebody else/i);
  });
});

describe("the Terms of Use claim nothing they cannot support", () => {
  it("asserts no trademark", () => {
    // NEH-199 is still open and NEH-371 is why. The same ban the footer is
    // under, applied to the other legal-adjacent surface — a terms page is
    // exactly where somebody would add "Optima Filings® is a trademark of…"
    // without thinking about it.
    expect(allText).not.toMatch(/™|®|\btrademarks?\b|\bservice marks?\b/i);
  });

  it("does not claim insurance, certification or an audit", () => {
    /*
      E&O insurance is an open decision in the project CLAUDE.md, and whether it
      exists changes what a liability limitation can credibly say. Until it is
      decided, the document must not imply cover — and "insured", "bonded" or
      "certified" is the kind of reassuring word that arrives in a legal
      document precisely because it sounds reassuring.
    */
    expect(allText).not.toMatch(/\binsured\b|\binsurance\b|\bbonded\b|\bcertified\b|\baudited\b/i);
  });

  it("does not describe a service, an account or data we hold", () => {
    // There is none of that in the self-hosted tier, and inventing the
    // vocabulary of one is how a document for a relationship that does not
    // exist starts creating obligations rather than limiting them. The hosted
    // tier needs genuine terms; they are not these, and must not be copied
    // from here.
    expect(allText).not.toMatch(/\byour account\b|\bour servers?\b|\bwe (store|collect|process)\b/i);
  });

  it("carries no internal engineering detail", () => {
    // The house rule, and a terms page is a public surface on a public repo.
    expect(allText).not.toMatch(/NEH-\d+|linear\.app|optima-cloud-saas/i);
  });
});

describe("the page and the footer actually reach it", () => {
  const src = (...parts: string[]) =>
    readFileSync(join(__dirname, "..", "src", ...parts), "utf8");

  /**
   * Comments stripped, so a rule can be *explained* without breaking itself.
   *
   * The `new Date()` assertion below failed on its first run against the very
   * comment justifying it — `content/terms.ts` explains why the effective date
   * is a constant and *not* `new Date()`, and the guard matched the
   * explanation. Same lesson `noInternalLeaks` records for issue ids: strip
   * comments, or the guard makes its own rationale unwriteable and the next
   * person deletes the reasoning to get a green test.
   */
  const code = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("is rendered by a page rather than only existing as data", () => {
    // The guard-on-the-guard. Every assertion above reads the content module,
    // so all of them would keep passing if the page were deleted and the terms
    // were published nowhere at all.
    const page = src("app", "terms", "page.tsx");
    expect(page).toContain("TERMS_SECTIONS");
    expect(page).toContain("TERMS_SUMMARY");
  });

  it("is linked from the footer, relatively", () => {
    // Relative on purpose: the terms ship inside the app, so a self-hoster with
    // no internet can still read them. An absolute GitHub link in the one place
    // somebody goes looking would be a link they cannot open.
    const footer = src("components", "site-footer.tsx");
    expect(footer).toContain('href="/terms"');
    expect(footer).toMatch(/Terms of Use/);
  });

  it("has a fixed effective date, not a derived one", () => {
    // The opposite of the footer's copyright year, and deliberately. A
    // legal document's effective date is a fact about when the words took
    // effect; deriving it would silently re-date the terms on every page load.
    expect(TERMS_EFFECTIVE_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(code(src("content", "terms.ts"))).not.toMatch(/new Date\(\)/);
    // And the stripper really strips — otherwise the assertion above passes
    // against an empty string and proves nothing.
    expect(code(src("content", "terms.ts"))).toContain("TERMS_EFFECTIVE_DATE");
    expect(code(src("content", "terms.ts"))).not.toContain("HAS NOT BEEN REVIEWED");
  });

  it("is titled as Terms of Use, not Terms of Service", () => {
    // Not pedantry — NEH-240 settled that this is narrower than a ToS, because
    // there is no service. The title is the first thing that would drift back.
    expect(TERMS_TITLE).toBe("Terms of Use");
    expect(allText).not.toMatch(/terms of service/i);
  });
});
