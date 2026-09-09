/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { css } from "styled-system/css";
import type { Bucketed, DatedItem, WindowName } from "@optima-compliance/reminders";
import { WINDOW_DEFINITIONS } from "@optima-compliance/reminders";
import { StyledCheck, StyledStatute, StyledUnverified, StyledWarning } from "@optima-compliance/ui";
import Link from "next/link";
import { formatDate, relativeDue } from "@/lib/format";
import { reportRuleUrl } from "@/lib/report-rule";
import { toggleActionCompleted } from "@/app/actions/actions";

function Item({ item, asOf }: { item: DatedItem; asOf: string }) {
  const done = item.completedOn !== undefined;
  return (
    <li className={css({ paddingBlock: "2", display: "flex", gap: "3" })}>
      {/* Only user actions can be ticked off. A rule-derived obligation is a
          statement about the law, not a task list entry — marking one "done"
          would imply we know a filing was accepted, which we do not. */}
      {item.source === "user" ? (
        <form action={toggleActionCompleted}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="completed" value={String(done)} />
          <button
            type="submit"
            /*
             * The DATE is part of the name, not decoration.
             *
             * A recurring action puts two rows with the same title on the page
             * — this year's and next year's — and identically-named buttons
             * leave a screen-reader user no way to tell which one they are
             * about to tick off. Found by a test runner refusing to click an
             * ambiguous selector, which is the same ambiguity a person hears.
             */
            aria-label={
              done
                ? `Reopen ${item.title}, due ${formatDate(item.dueOn)}`
                : `Mark ${item.title}, due ${formatDate(item.dueOn)}, done`
            }
            className={css({
              minWidth: "44px",
              minHeight: "44px",
              cursor: "pointer",
              borderRadius: "sm",
              border: "1px solid",
              borderColor: "boxBorderSecondary",
              background: "transparent",
            })}
          >
            {done ? <StyledCheck /> : " "}
          </button>
        </form>
      ) : (
        <span className={css({ minWidth: "44px" })} aria-hidden="true" />
      )}

      <div>
        <div
          className={css({ fontWeight: "600" })}
          style={done ? { textDecoration: "line-through", opacity: 0.7 } : undefined}
        >
          {item.title}
          {item.status === "draft" && (
            <span
              className={css({ fontSize: "sm", marginLeft: "2" })}
              style={{ color: "var(--optima-text-warning-text)" }}
            >
              <StyledUnverified title="Unverified" /> unverified
            </span>
          )}
        </div>
        <div className={css({ fontSize: "sm", color: "boxTextSecondary" })}>
          {formatDate(item.dueOn)} · {relativeDue(asOf, item.dueOn)}
          {done ? ` · done ${formatDate(item.completedOn!)}` : ""}
        </div>
        {item.detail && <div className={css({ fontSize: "sm" })}>{item.detail}</div>}
        {/*
          What it costs. This row showed no fee at all until NEH-403 — the app
          had a `formatFee` helper, a test for it, and no caller, because the
          projection in lib/calendar.ts never carried a fee to a component. The
          number reached the CLI, the spreadsheet and the calendar invite, and
          never the screen most people actually use.

          `item.fee` is already words, so a range says "$20.00 – $60.00" here
          exactly as it does everywhere else. An ABSENT fee renders nothing
          rather than an em dash or "$0.00": on a row, silence reads as "not
          stated", while "$0.00" reads as "free" and would be a claim we cannot
          make.
        */}
        {item.fee && (
          <div className={css({ fontSize: "sm" })}>
            Fee: {item.fee}
            {item.feeReason && (
              /*
                Visible text, never a `title` tooltip — invisible to a screen
                reader and to anyone on a touch device, and this sentence is
                what makes a range actionable rather than merely honest.
              */
              <span
                className={css({
                  display: "block",
                  fontSize: "xs",
                  color: "boxTextSecondary",
                })}
              >
                {item.feeReason}
              </span>
            )}
          </div>
        )}
        {/* Provenance, always. A deadline derived from a cited statute and one
            a person typed are different kinds of claim. */}
        <div className={css({ fontSize: "xs", color: "boxTextSecondary" })}>
          {item.source === "rule" ? (
            <>
              <StyledStatute />{" "}
              {/*
                Linked when the rule carries a URL. It always did carry one —
                the projection in lib/calendar.ts simply dropped it, so this
                rendered as unclickable text for as long as the screen has
                existed. Still falls back to plain text, because a citation
                without a deep link is a legitimate state.
              */}
              {item.citationUrl ? (
                <a href={item.citationUrl} rel="noreferrer noopener">
                  {item.citation}
                </a>
              ) : (
                item.citation
              )}
              {/*
                The agency's own page, and a different question from the
                citation. The citation answers "is this rule faithful to the
                law"; this answers "what is true today, and where do I file it"
                — which the statute frequently cannot: Washington sets no
                annual-report due date in statute at all, and Delaware's
                8 Del. C. 502 names no fee.

                Worded as an instruction rather than a bare URL. "Check the
                agency" tells someone what to do with the link; a naked domain
                leaves them to infer why it is there. This tier exists for
                people who would rather confirm a date themselves than take
                ours on trust, and this is the link that lets them.
              */}
              {item.agencyUrl && (
                <span className={css({ display: "block" })}>
                  <a href={item.agencyUrl} rel="noreferrer noopener">
                    Check the agency for the current fee and deadline
                  </a>
                </span>
              )}
              {/*
                Directly beneath the agency link, and the order is the point. We
                have just told them to go and check us. If they check and we are
                wrong, THIS is the moment they need somewhere to say so — a link
                on a contributing page they would have to go looking for is a
                link that catches nobody.

                The audience is a CPA or an attorney who knows the statute and
                does not know git, so it goes to the issue FORM, prefilled with
                the jurisdiction, the rule id and the filing. Everything between
                noticing and reporting is attrition, and those three are
                questions this screen can already answer.

                `target="_blank"`: they are mid-task on their own calendar and
                sending them away from it is how a report becomes an intention.

                Nothing about the entity is in that URL — see report-rule.ts.
                This link is the only path in the self-hosted product that sends
                anything to a third party at all, and it carries facts about the
                RULE, every one of which is already published in the rule pack.
              */}
              <span className={css({ display: "block" })}>
                <a
                  href={reportRuleUrl({
                    ...(item.ruleId === undefined ? {} : { ruleId: item.ruleId }),
                    ...(item.jurisdiction === undefined
                      ? {}
                      : { jurisdiction: item.jurisdiction }),
                    title: item.title,
                    ...(item.agencyUrl === undefined ? {} : { agencyUrl: item.agencyUrl }),
                  })}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  Report this as wrong
                </a>
              </span>
            </>
          ) : (
            <>
              Your own action
              {item.repeatAnnually && !done && " · repeats yearly"}
              {" · "}
              <Link href={`/actions/${item.id}/edit`}>Edit</Link>
              {/* Said before the click, not after. Someone who does not expect
                  a new row appearing reads it as a duplicate. */}
              {item.repeatAnnually && !done && (
                <span className={css({ display: "block" })}>
                  Marking this done will create next year&apos;s.
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}

export function WindowList({ bucketed, asOf }: { bucketed: Bucketed; asOf: string }) {
  /*
   * Each item appears ONCE here, in its tightest window, even though the
   * windows themselves nest. A digest is a standalone message and repeats
   * items on purpose; a screen showing the same deadline four times would just
   * look broken.
   */
  const seen = new Set<string>();
  const sections: { name: WindowName; items: DatedItem[] }[] = (
    ["day-before", "weekly", "monthly", "quarterly"] as const
  ).map((name) => {
    const items = bucketed.windows[name].filter((item) => !seen.has(item.id));
    items.forEach((item) => seen.add(item.id));
    return { name, items };
  });

  const nothingOutstanding =
    bucketed.overdue.length === 0 &&
    sections.every((s) => s.items.length === 0) &&
    bucketed.later.length === 0;

  /*
   * The completed list renders even when nothing is outstanding.
   *
   * Without this, ticking off your only action made it vanish and the screen
   * said "Nothing is due" — which reads as "I just deleted it", not as "well
   * done". Anything a user marks complete has to stay visible somewhere, or the
   * tick feels destructive and they stop using it.
   */
  return (
    <>
      {nothingOutstanding && (
        <p className={css({ padding: "6", color: "boxTextSecondary" })}>
          {bucketed.completed.length > 0
            ? "Nothing outstanding. Completed items are below."
            : "Nothing is due. Add an entity to see what the rules say you owe, or add your own action if you would rather track it yourself."}
        </p>
      )}
      {bucketed.overdue.length > 0 && (
        <section
          className={css({ marginBottom: "6", padding: "4", borderRadius: "md" })}
          style={{
            background: "var(--optima-box-info-bg)",
            borderLeft: "4px solid var(--optima-text-error-text)",
          }}
        >
          <h2 className={css({ fontSize: "lg", marginTop: "0" })}>
            <StyledWarning title="Overdue" /> Overdue
          </h2>
          <ul className={css({ listStyle: "none", padding: "0", margin: "0" })}>
            {bucketed.overdue.map((item) => (
              <Item key={item.id} item={item} asOf={asOf} />
            ))}
          </ul>
        </section>
      )}

      {sections.map(({ name, items }) =>
        items.length === 0 ? null : (
          <section key={name} className={css({ marginBottom: "6" })}>
            <h2 className={css({ fontSize: "lg" })}>{WINDOW_DEFINITIONS[name].label}</h2>
            <p className={css({ fontSize: "sm", color: "boxTextSecondary", marginTop: "0" })}>
              {WINDOW_DEFINITIONS[name].heading}
            </p>
            <ul className={css({ listStyle: "none", padding: "0", margin: "0" })}>
              {items.map((item) => (
                <Item key={item.id} item={item} asOf={asOf} />
              ))}
            </ul>
          </section>
        ),
      )}

      {bucketed.later.length > 0 && (
        <section className={css({ marginBottom: "6" })}>
          <h2 className={css({ fontSize: "lg" })}>Later</h2>
          <ul className={css({ listStyle: "none", padding: "0", margin: "0" })}>
            {bucketed.later.map((item) => (
              <Item key={item.id} item={item} asOf={asOf} />
            ))}
          </ul>
        </section>
      )}

      {bucketed.completed.length > 0 && (
        <details className={css({ marginBottom: "6" })}>
          <summary className={css({ cursor: "pointer" })}>
            Completed ({bucketed.completed.length})
          </summary>
          <ul className={css({ listStyle: "none", padding: "0" })}>
            {bucketed.completed.map((item) => (
              <Item key={item.id} item={item} asOf={asOf} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
