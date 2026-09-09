/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { StyledUnverified } from "@optima-compliance/ui";
import { css } from "styled-system/css";

/**
 * Shown when the calendar actually HOLDS an unverified rule — on the data, not
 * on the flag.
 *
 * The condition lives in `lib/calendar.ts` as `hasDraftItems`, exported and
 * pure so it can be asserted without rendering a page, and it counts both dated
 * obligations and the indeterminate rules in "Cannot tell yet": one of those is
 * no more verified for having no date.
 *
 * ## Why it is worth saying that it is the data
 *
 * This rendered on `includeDraft()` — the FLAG — until NEH-1255, and while the
 * whole seeded set was `draft` the two were the same statement: opting in
 * always did put unverified rows on screen. Since pack `2026.8.6` the shipped
 * set is entirely `active` and `npm run dev` sets the flag, so a contributor
 * with no draft rules of their own was told "Unverified rules are being shown"
 * with every row on the page verified.
 *
 * Crying wolf on an honesty surface is how the honesty surface stops being
 * read, and on a compliance product that surface is load-bearing.
 *
 * Both directions are asserted in a browser now that `OPTIMA_RULES_DIR` can put
 * a draft rule into a running install: `e2e/draft-rule.spec.ts` renders one and
 * expects this, and `e2e/calendar.spec.ts` expects its absence over a page of
 * verified rows.
 */
export function DraftBanner() {
  return (
    <div
      role="note"
      className={css({ padding: "3", borderRadius: "md", fontSize: "sm" })}
      style={{
        background: "var(--optima-box-info-bg)",
        borderLeft: "4px solid var(--optima-text-warning-text)",
      }}
    >
      <StyledUnverified title="Warning" />{" "}
      <strong>Unverified rules are being shown.</strong> Rows marked
      “unverified” come from rules nobody has checked against the statute they
      cite. Treat them as a prompt to verify, not as fact.
    </div>
  );
}
