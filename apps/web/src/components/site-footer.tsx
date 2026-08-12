/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { css } from "styled-system/css";

/**
 * The ownership notice, on every page.
 *
 * ## Why this is separate from `Disclaimer`
 *
 * They answer different questions and deliberately live in different places.
 * `Disclaimer` ("this is not legal or tax advice") sits **beside every
 * deadline**, because it qualifies the answer and a caveat in a footer is a
 * caveat nobody reads twice. This is a *provenance* notice — who owns the code
 * and under what licence — which is exactly the thing a footer is for.
 *
 * ## Why it names the licence
 *
 * This repo is AGPL-3.0-only, and §5 requires that a work carrying the licence
 * keeps its notices intact. For a network-facing application the practical form
 * of that is a visible statement of authorship and licence where a user can see
 * it, alongside a route to the source. Self-hosters inherit this by running the
 * app; removing it is the one edit here that has a legal consequence rather
 * than a cosmetic one.
 *
 * ## Why the year is derived
 *
 * A hard-coded year is wrong every January and stays wrong for months because
 * nobody is looking at the footer. `getFullYear()` costs nothing and cannot
 * rot.
 *
 * ## Why it claims no trademark
 *
 * It used to, and that was wrong (NEH-371). "Optima" has never had a clearance
 * search (NEH-199), and the previous product name was abandoned *because* of a
 * real conflict — so an ownership claim here is unsupported in precisely the
 * direction the project already knows it can be wrong. Everything left in this
 * footer is a fact: who holds the copyright, which licence applies, where the
 * source is. `apps/web/test/no-trademark-claim.test.ts` keeps it that way until
 * NEH-199 resolves.
 */
export function SiteFooter() {
  return (
    <footer
      className={css({
        fontSize: "sm",
        marginTop: "10",
        paddingTop: "4",
        paddingBottom: "8",
        borderTop: "1px solid",
        borderColor: "boxBorderPrimary",
        color: "boxTextSecondary",
        display: "flex",
        flexDirection: "column",
        gap: "1",
      })}
    >
      <span>
        © {new Date().getFullYear()} StoneDogCode L.L.C. Optima Filings is free
        software, licensed under{" "}
        <a href="https://www.gnu.org/licenses/agpl-3.0.html">AGPL-3.0-only</a>.
      </span>
      <span>
        Source:{" "}
        <a href="https://github.com/stonedog-code/optima-filings">
          github.com/stonedog-code/optima-filings
        </a>
        .
      </span>
      {/*
        NEH-240. A RELATIVE link, deliberately: the terms ship inside this
        application, so a self-hoster with no route to the internet can still
        read the terms governing the software in front of them. Pointing at
        GitHub would put a document they may not be able to open in the one
        place they might go looking for it.

        In the footer rather than beside every deadline — the opposite of
        `Disclaimer`, and for the reason that component's own note gives. A
        caveat that qualifies an answer belongs next to the answer; a document
        somebody goes looking for belongs where documents are kept.
      */}
      <span>
        <a href="/terms">Terms of Use</a>
      </span>
    </footer>
  );
}
