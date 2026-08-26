# Private foundations and Form 990-PF — 2026-08-26

**Scope: one new rule (`us-federal-form-990-pf`) and one new exclusion applied to
the three existing federal returns.** This pass does not re-verify any threshold
or fee, and is not the deferred verification pass. What it records is a
*distinction* the pack did not model at all — no amount in any rule was wrong,
and the answer was still wrong — plus the pages read while writing the new rule,
so a later pass can check it against the same sources rather than starting over.

| Rule | Field | Was | Now | Source |
|---|---|---|---|---|
| `us-federal-form-990-n` | `conditions` | receipts + assets only | **+ `isPrivateFoundation eq false`** | IRS, *Form 990-N (e-Postcard): Organizations not permitted to file* |
| `us-federal-form-990-ez` | `conditions` | receipts + assets only | **+ `isPrivateFoundation eq false`** | as above, plus the one-return invariant |
| `us-federal-form-990` | `conditions` | receipts-or-assets group | **+ `isPrivateFoundation eq false`** | as above, plus the one-return invariant |
| `us-federal-form-990-pf` | *(rule did not exist)* | — | **new, `status: active`** | IRS, *Instructions for Form 990-PF*; *About Form 990-PF* |

## 1. A private foundation may not file Form 990-N

Read on **irs.gov**, *Form 990-N (e-Postcard): Organizations not permitted to
file*. The page enumerates the categories excluded from the e-Postcard **even
when gross receipts are normally $50,000 or less**, and private foundations are
the second entry: they must file **Form 990-PF** instead.

This is not obscure guidance. The same carve-out is printed on **Notice CP299**,
the letter that prompts the filing in the first place — "A small tax-exempt
organization (other than a private foundation or political or foreign
organizations) whose annual gross receipts are normally $50,000 or less". A
customer holding that notice can read the exclusion and our old answer at the
same time.

The same page lists further categories this pack still cannot express, recorded
here so the gap is measured rather than assumed: section 527 political
organisations; section 501(c)(1), (c)(20), (c)(23), (c)(24) and 501(d)
organisations; section 529 qualified tuition programs; section 4947(a)(2)
split-interest trusts; and section 4947(a)(1) charitable trusts treated as
private foundations. None of them is a value in `ENTITY_TYPES`, so none is
covered by the new rule and none is silently mis-covered by it either.

## 2. Who must file Form 990-PF, and at what size

From the **Instructions for Form 990-PF**, "Who Must File": the return must be
filed by private foundations exempt under section 501(a) and described in
section 501(c)(3); taxable private foundations; organisations with a pending
exemption application that agree to private foundation classification; and
section 4947(a)(1) nonexempt charitable trusts treated as private foundations.

**There is no gross-receipts or assets threshold that excuses a private
foundation from filing.** That is the load-bearing fact for the rule's shape: it
is why `us-federal-form-990-pf` has exactly one condition — the foundation
question itself — and no amounts at all. A threshold copied across from its
neighbours would have created the silence this change exists to prevent.

Only the first of the four categories is modelled. `entityTypes: ["501c3"]` is
the whole vocabulary available, and a section 4947(a)(1) trust is not a
501(c)(3); it is out of scope, and the rule's `notes` say so rather than letting
the omission look like coverage.

## 3. The due date, and the weekend and holiday handling

Same instructions, "When, Where, and How to File": the return is due **the 15th
day of the 5th month following the close of the foundation's tax year** — 15 May
for a calendar-year filer, which is what
`{ anchor: "fiscal-year-end", offsetMonths: 5, dayOfMonth: 15 }` produces.

> If the regular due date falls on a Saturday, Sunday, or legal holiday, file by
> the next business day.

So `weekendRule: "roll-forward"` is opted into because the agency says it, not
assumed — the same standard the rest of the federal family is held to. And
because the sentence names legal holidays as well as weekends,
`holidayCalendar: "us-federal"` is set, applying the eleven federal holidays of
5 U.S.C. 6103(a) including their weekend-observance shift. Implementing two
thirds of a sentence the rule quotes in full was the NEH-443 defect; it is not
repeated here.

Cross-check against the entity that reported the bug: a calendar-year foundation
evaluated as of 2026-08-26 is due **2027-05-17** — 15 May 2027 is a Saturday,
rolled forward to the Monday. That is the *identical* date the wrong return
carried, which is the point: the form was wrong and the arithmetic was not, and
a fix that also moved the date would be a second defect hiding inside the first.

## 4. What was NOT checked

- **No threshold in any existing rule was re-read.** The $50,000, $200,000 and
  $500,000 lines, the 990-EZ receipts floor and the 990-N assets ceiling are
  untouched and carry the same `lastVerified` they had. Two of those are this
  pack's own modelling choices rather than IRS rules, and both still say so in
  their notes.
- **`lastVerified` was not bumped on 990, 990-EZ or 990-N.** Only their
  `conditions` and `notes` changed. Bumping the date on the strength of reading
  a *different* IRS page would convert an honest "unknown" into a false
  "checked", which this repo treats as worse than staleness.
- **509(a)(3) supporting organisations were read but not modelled.** The
  exclusion is real and differently shaped — most must file 990 or 990-EZ, while
  one supporting a religious organisation with gross receipts normally $5,000 or
  less may still use 990-N. Modelling it needs its own fact and a change to the
  990-EZ floor, or such an organisation matches no federal return at all. See
  `docs/prd/private-foundation-fact.md`.

## 5. Why the rule ships `active` rather than `draft`

`evaluate()` excludes drafts by default. A `draft` 990-PF would therefore have
excluded a private foundation from three returns and shown it the fourth only
where the operator had opted into unverified rules — an empty federal calendar
for exactly the organisations this change exists for. The exclusion and the
replacement have to arrive together or the fix is a different under-filing, so
`active` is the only status that makes the change coherent.
