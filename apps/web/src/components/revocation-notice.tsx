/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { AUTOMATIC_REVOCATION } from "@optima-compliance/engine";
import { css } from "styled-system/css";

/**
 * The consequence that is not a late fee.
 *
 * Every other deadline in the pack costs money. This one costs the
 * organisation its charitable status: 26 U.S.C. 6033(j), added by the Pension
 * Protection Act of 2006, revokes exempt status automatically when an annual
 * return or e-Postcard goes unfiled for three consecutive years, effective on
 * the due date of the third. The rule pack has recorded that in a `notes` field
 * since the first federal rule was written, and no customer has ever seen it —
 * a rendered row for Form 990-N looked exactly like a rendered row for a state
 * annual report.
 *
 * ## Why it states the rule and says nothing about the reader
 *
 * Nothing in this product records what anybody filed in a prior year. So it can
 * say what the law is; it cannot say "you have missed two years", and it must
 * not imply it. An absent reminder is not evidence of an absent filing, and a
 * compliance tool that tells somebody their exemption is at risk on evidence it
 * does not have has made a worse claim than the silence it replaced.
 *
 * That constraint is why this is one standing paragraph rather than an alert
 * that escalates. Escalation needs a filing history to escalate against.
 *
 * ## Why it renders only when a 990-family row is on the page
 *
 * A warning that is always there is furniture. This appears when the calendar
 * actually contains an obligation it applies to — including an undecided one,
 * because an organisation that has not answered the foundation question still
 * owes one of these returns and is arguably the reader who most needs telling.
 */
export function RevocationNotice() {
  return (
    <section
      className={css({
        marginTop: "6",
        padding: "4",
        borderRadius: "md",
        fontSize: "sm",
      })}
      style={{
        // The same surface the draft banner uses, with the same warning-coloured
        // edge. A new theme token would need its own contrast pair proved in
        // both modes; this surface already has one, and the edge is a
        // non-text indicator.
        background: "var(--optima-box-info-bg)",
        borderLeft: "4px solid var(--optima-text-warning-text)",
      }}
    >
      <h2 className={css({ fontSize: "md", marginTop: "0", marginBottom: "1" })}>
        Three missed years ends the exemption
      </h2>
      <p className={css({ margin: "0" })}>
        An organisation that does not file its annual return or e-Postcard —
        Form 990, 990-EZ, 990-N or 990-PF — for{" "}
        <strong>{AUTOMATIC_REVOCATION.consecutiveYears} consecutive years</strong>{" "}
        loses its tax-exempt status automatically, on the due date of the third
        one. There is no notice first and no penalty to pay instead: getting the
        exemption back means a new application and a user fee, and gifts made in
        the meantime may not be deductible.
      </p>
      <p className={css({ marginTop: "2", marginBottom: "0" })}>
        {/*
          The honest limit, stated in the same breath as the warning. This tool
          holds no record of past filings, so the sentence above is the rule and
          not a finding about this organisation.
        */}
        This is the rule, not a statement about your filings — nothing here
        knows what you have filed in past years.{" "}
        <a href={AUTOMATIC_REVOCATION.agencyUrl}>What the IRS says</a> ·{" "}
        <a href={AUTOMATIC_REVOCATION.citationUrl}>
          {AUTOMATIC_REVOCATION.citation}
        </a>
      </p>
    </section>
  );
}
