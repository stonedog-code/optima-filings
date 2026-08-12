/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Terms of Use for the self-hosted dashboard — NEH-240.
 *
 * ## THIS HAS NOT BEEN REVIEWED BY A LAWYER
 *
 * Stated first because it is the most important thing about this file. It is a
 * careful draft, not counsel, and it should be read by one before the project
 * relies on it. The same is true of every other legal-adjacent thing here — the
 * trademark is uncleared (NEH-199) and E&O insurance is an open decision — and
 * this file is written to be *narrow enough to be safe while unreviewed*
 * rather than broad enough to look impressive.
 *
 * ## Why a Terms of Use exists at all for software you run yourself
 *
 * NEH-240 asked the right question before writing anything: what does a ToS
 * even mean here? There is no service, no account, and no data flowing to
 * StoneDogCode. The AGPL already governs the code, and `Disclaimer` already
 * governs the advice. Writing a full Terms of Service for a relationship that
 * does not exist would invent obligations rather than limit them.
 *
 * So this is deliberately **not** a Terms of Service. It covers the one thing
 * the licence arguably does not, and stops:
 *
 * > **Reliance on the compliance data.**
 *
 * AGPL §15–17 disclaim warranty and limit liability for *the Program*. The rule
 * packs ship inside the Program, so a reading where they are covered is
 * available — but "the software has a bug" and "the deadline you published was
 * wrong" are different claims, and only the first is obviously a software
 * warranty question. This closes that gap explicitly rather than relying on the
 * generous reading.
 *
 * ## Why there is no TERMS.md at the repository root
 *
 * One canonical location. This module is rendered at `/terms`, which ships
 * inside the Docker image and works with no network — which is the situation a
 * self-hoster is actually in. A markdown file at the root would be a second
 * copy of a legal document, and two copies of a legal document is the drift
 * that matters most.
 *
 * ## Why the effective date is a constant and not `new Date()`
 *
 * The opposite of the footer's derived year, and for the opposite reason. A
 * footer's copyright year should track today; a legal document's effective date
 * is a fact about when these words took effect. Deriving it would silently
 * re-date the terms every time somebody loaded the page.
 */

export interface TermsSection {
  heading: string;
  paragraphs: string[];
}

export const TERMS_EFFECTIVE_DATE = "2026-08-12";

export const TERMS_TITLE = "Terms of Use";

/**
 * The one-line summary, shown before the sections.
 *
 * Written so somebody who reads only this sentence is not misled by it, which
 * is the test any summary of a legal document has to pass.
 */
export const TERMS_SUMMARY =
  "This software is free, you run it yourself, and nobody has checked your filings but you.";

export const TERMS_SECTIONS: TermsSection[] = [
  {
    heading: "What this covers",
    paragraphs: [
      "Optima Filings is free software you install and run on your own computer or server. There is no account, no service, and no information about you or your filings is sent to StoneDogCode L.L.C. by running it.",
      "Your rights to use, modify and redistribute the software are granted by the GNU Affero General Public License, version 3. Those terms are not changed by anything here. This page covers one thing the licence does not clearly address: what it means to rely on the compliance information the software shows you.",
    ],
  },
  {
    heading: "The compliance data is information, not advice",
    paragraphs: [
      "Optima Filings tells you what appears to be due, when, to whom, and for how much. It is not a lawyer, an accountant or a filing agent, and it does not know your circumstances. Nothing it shows you is legal, tax or financial advice.",
      "Every rule cites the statute or agency page it came from, and carries the date it was last checked. Those citations are there to be used: if a deadline or a fee matters to you, follow the link and confirm it against the agency itself. Where the agency and this software disagree, the agency is right.",
      "You remain responsible for your own filings. That responsibility does not transfer to StoneDogCode L.L.C. by your having installed this software.",
    ],
  },
  {
    heading: "The data can be wrong, and how it gets wrong",
    paragraphs: [
      "Regulatory data does not fail loudly. A rule stays perfectly valid-looking while a legislature moves a deadline or an agency changes a fee, and the software has no way to know. Rules are contributed and maintained by volunteers, and coverage is uneven: a jurisdiction may be absent, incomplete, or out of date.",
      "A rule shown as unverified, or one the software says it cannot decide, is telling you something real. Treat an empty calendar as \"nothing is known here\" rather than as \"nothing is due\".",
    ],
  },
  {
    heading: "No warranty, and no liability for reliance",
    paragraphs: [
      "The software and its compliance data are provided \"as is\", without warranty of any kind, express or implied — including any warranty of merchantability, fitness for a particular purpose, accuracy, or completeness. This restates and extends the disclaimer in sections 15 and 16 of the AGPL so that it plainly covers the rule data as well as the code.",
      "To the fullest extent permitted by law, StoneDogCode L.L.C. is not liable for any loss arising from your use of, or reliance on, this software or its data — including missed deadlines, penalties, interest, late fees, loss of good standing, or administrative dissolution.",
      "Some jurisdictions do not allow the exclusion of certain warranties or the limitation of certain liabilities. Where that is so, the exclusions and limitations above apply to the fullest extent those laws permit, and nothing here limits liability for fraud or for anything else that cannot lawfully be limited.",
    ],
  },
  {
    heading: "If you host this for other people",
    paragraphs: [
      "Running Optima Filings for somebody else — colleagues, clients, or the public — is permitted by the licence, and the AGPL requires that you offer those users the source code of your version. It also makes you, not StoneDogCode L.L.C., the person they are relying on.",
      "If you remove or alter the disclaimers, the citations, or the last-checked dates, you are changing what your users can see about how reliable the answer is. That is your decision to make and your responsibility to carry.",
    ],
  },
  {
    heading: "Changes to this page",
    paragraphs: [
      "These terms ship with the software. A later version may carry different ones, and the version you are running is the one that applies to you. The effective date above is the date this text was written, not the date you installed it.",
    ],
  },
];
