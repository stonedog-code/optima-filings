/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * NEH-240. The text and the reasoning behind it live in `content/terms.ts`;
 * this file only renders them.
 *
 * ## Why this ships in the app rather than sitting in the repository
 *
 * A self-hoster runs this on their own machine, sometimes with no route to the
 * internet. A link to a document on GitHub is a link to something they may not
 * be able to open, about the software in front of them. Rendering it here means
 * the terms travel with the thing they govern.
 *
 * ## Why it is static
 *
 * No session, no data, nothing per-request. Left to prerender, so it is served
 * from the image with no work and is available even if the database is not —
 * which is the state somebody troubleshooting an install is most likely in.
 */
import { css } from "styled-system/css";
import {
  TERMS_EFFECTIVE_DATE,
  TERMS_SECTIONS,
  TERMS_SUMMARY,
  TERMS_TITLE,
} from "@/content/terms";

export const metadata = {
  title: `${TERMS_TITLE} — Optima Filings`,
  description: "How to rely on what Optima Filings tells you, and how not to.",
};

export default function TermsPage() {
  return (
    <main className={css({ maxWidth: "42rem" })}>
      <h1 className={css({ fontSize: "2xl", fontWeight: "bold", marginBottom: "2" })}>
        {TERMS_TITLE}
      </h1>

      {/*
        The summary before the sections, and it is not decoration. Somebody who
        reads one sentence of this page should not be misled by the one they
        read — which is the only test a summary of a legal document has to pass.
      */}
      <p className={css({ marginBottom: "2" })}>
        <strong>{TERMS_SUMMARY}</strong>
      </p>

      <p className={css({ fontSize: "sm", color: "boxTextSecondary", marginBottom: "8" })}>
        Effective {TERMS_EFFECTIVE_DATE}. These terms ship with this version of the software.
      </p>

      {TERMS_SECTIONS.map((section) => (
        <section key={section.heading} className={css({ marginBottom: "6" })}>
          <h2 className={css({ fontSize: "lg", fontWeight: "bold", marginBottom: "2" })}>
            {section.heading}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className={css({ marginBottom: "3" })}>
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      <p className={css({ fontSize: "sm", color: "boxTextSecondary", marginTop: "8" })}>
        Your licence to use, modify and share this software is the{" "}
        <a href="https://www.gnu.org/licenses/agpl-3.0.html">GNU AGPL-3.0</a>, which these
        terms do not change.
      </p>
    </main>
  );
}
