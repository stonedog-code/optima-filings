# Washington annual reports — 2026-08-08

**Scope: the three Washington annual-report rules.** This pass closes the two
gaps the 2026-08-05 seed-set pass left open for Washington — the uncited due
date and the two unverified fees — and it closes them from the regulation and
the agency's own fee schedule rather than from search summaries.

| Rule | Field | Was | Now | Source |
|---|---|---|---|---|
| `us-wa-sos-corporation-annual-report` | fee | *(absent)* | **$70** | WAC 434-112-085(7)(p) |
| `us-wa-sos-llc-annual-report` | fee | *(absent)* | **$70** | WAC 434-112-085(7)(p) |
| all three | citation | statute only | **+ WAC 434-112-060(1)** | the regulation that sets the date |
| `us-wa-sos-nonprofit-annual-report` | fee | *(absent)* | *(still absent)* | see finding 3 |

## The premise that turned out to be false

Both open findings were recorded as needing "a human with a browser", because
`sos.wa.gov` returned **403 to every automated request** — including its own
root and paths that do not exist, so the status carried no information about
whether a URL was real.

**The domain is reachable.** An ordinary browser engine gets normal responses,
and a wrong path returns a plain `404` — so status *does* discriminate. The 403
was a property of the fetcher, not of the site. The agency pages linked from
these rules have now been opened and read, and the "not clickable from CI" note
has been removed from all three rules.

Worth stating plainly because the false premise cost three days and had been
written into the rules themselves as a standing instruction to a future reader.

---

## 1. The due date is a regulation, not unwritten practice

RCW 23.95.255(4) says annual reports are delivered "on a date determined by the
secretary of state", so the statute deliberately does not fix the date. The
seed-set pass concluded the end-of-formation-month cadence therefore rested on
administrative practice with no citation of its own — and guessed that, as with
the charities deadline in WAC 434-120-140(2)(a), the answer would be in WAC
Title 434.

It is. **WAC 434-112-060(1):**

> An entity defined by RCW 23.95.105(6) and subject to RCW 23.95.255 must file
> an annual report accompanied by the fee established under WAC 434-112-085 **by
> the last day of the month that the entity was formed or registered by the
> division.**

That is precisely `{ anchor: "formation-month", dayOfMonth: "last" }`. The
cadence was right; only the citation was missing.

It reaches all three rules through the definition it points at:

- **RCW 23.95.105(6)** — "'Entity' means: (a) A business corporation; (b) A
  nonprofit corporation; … (e) A limited liability company; …"
- **RCW 24.03A.070** — a nonprofit corporation's annual report is the one
  "required under RCW 23.95.255(2)", so nonprofits are in scope of -060 too.

**WAC 434-112-060(2)** independently confirms the 180-day early-filing window
the agency advertises.

## 2. The profit-entity fee is $70, and the $60 in the seed was wrong

**WAC 434-112-085(7)** covers "domestic and foreign business entities under Title
23B RCW, chapters 23.78, 23.86, 25.05, 25.10, 25.15 … RCW" — profit corporations
and LLCs both — and **(7)(p)** reads:

> (p) Annual report **Seventy dollars**

The agency's fee schedule agrees, in the tables headed *Profit Corporations (RCW
23B)* and *Limited Liability Companies (RCW 25.15)*, and says so explicitly:
"Per WAC 434-112-085(7) the Annual Report fee for Profit Business Entity types
has increased to $70."

So the $60 seeded here was wrong, the 2026-08-05 suspicion was right, and the
figure is now taken from the regulation rather than from the summary that
raised the suspicion. Restored on both rules with a fixture pinning it.

**Not modelled:** the $25 delinquent fee — WAC 434-112-085(7)(r), which the
agency surfaces as "Annual Report with delinquency fee $95". The schema has no
penalty field. This is the same gap Delaware's §502(c) $200 penalty hits, and it
belongs with NEH-403 rather than being approximated here.

## 3. The nonprofit fee has a different shape than anyone assumed — still absent

The pack, the issue, and the rule's own notes all described this as **$60,
reduced to $20** where gross revenue was under $500,000. That is the right
range for the wrong reason, and the difference matters to the schema work.

**WAC 434-112-085(8)(m)**, for nonprofits under Title 24 RCW:

> (m) Annual report **Ten dollars, plus the Charitable Asset Protection Account
> fee**

**RCW 24.03A.960(2)(b):**

> The charitable asset protection fee is **fifty dollars per year, reduced to ten
> dollars if the corporation certifies that its total gross revenue in the most
> recent fiscal year was less than five hundred thousand dollars.**

So $10 + $50 = **$60**, or $10 + $10 = **$20** — matching the "$20-60" the fee
schedule shows. Two consequences for NEH-403:

1. It is a **base fee plus a conditional surcharge**, not one amount with two
   values. A conditional-fee design that only supports "first match wins" over
   whole amounts can express this, but only by duplicating the $10 base into
   every branch — which is how the base and the surcharge later drift apart.
2. The reduction turns on the corporation **certifying** its revenue, not on the
   revenue fact alone. The engine knows `grossRevenueMinorUnits`; it does not
   know whether a certification was made, and those are not the same question.
   A rule that quietly treats them as one asserts something about the filer's
   paperwork that the fact model cannot support.

**No fee is recorded.** The reasoning is unchanged from the promotion pass and
now better evidenced: any single figure is wrong for one group or the other, and
the group $60 overstates threefold is the larger one. This remains the only
Washington rule producing a visible date for a typical customer, so its fee
would be the most-read number in the product.

---

## What this does not settle

- **The delinquent/penalty fees** (WA $25, DE $200, DE LLC 1.5%/month) — no
  schema field. NEH-403.
- **The nonprofit fee** — needs the conditional-fee decision *and* a fact for
  the certification. NEH-403.
- **`us-de-corporation-annual-report`** — untouched here and still the severe
  case; the franchise tax makes the displayed $50 wrong by 3.5× to 4000×.
