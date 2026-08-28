/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { StyledUnverified } from "@optima-compliance/ui";
import { css } from "styled-system/css";

/**
 * Shown whenever unverified rules are switched ON — on the flag alone, not on
 * any row actually being draft.
 *
 * That was the same thing when this was written: the whole seeded set was
 * `draft`, so opting in always did show unverified rows, and someone who had
 * opted in needed it stated plainly and repeatedly, because the rows look
 * exactly as authoritative as verified ones.
 *
 * Since pack `2026.8.6` the shipped set is entirely `active`, so the two have
 * come apart, and `npm run dev` sets the flag — which means a contributor with
 * no draft rules of their own is told unverified rules are being shown when
 * none are. Crying wolf on an honesty surface is how the honesty surface stops
 * being read. The fix is to condition this on the evaluation actually
 * containing a draft obligation, which also gives the per-row badge something
 * to assert: NEH-1255.
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
