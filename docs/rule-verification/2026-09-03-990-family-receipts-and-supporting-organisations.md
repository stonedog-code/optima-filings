# The 990 family: the "normally" test, supporting organisations, and an assets ceiling that was not real — 2026-09-03

**This is the deferred verification pass `form-990-n.json` asked for by name.**
That rule's notes recorded, on 2026-08-14, that an assets ceiling had been added
to resolve an overlap, that the IRS instructions had **not** been read for it,
and that `lastVerified` was deliberately left unbumped until they were. They have
now been read. The ceiling has no basis and is removed.

Three findings, each of which changed a rule, and one gap deliberately left open
and named.

| Rule | Field | Was | Now | Source |
|---|---|---|---|---|
| `us-federal-form-990-n` | `conditions` | `grossRevenueMinorUnits lte $50k` | **`normalAnnualGrossReceiptsMinorUnits lte $50k`** | Rev. Proc. 2011-15 §§ 3.01, 4 |
| `us-federal-form-990-n` | `conditions` | — | **+ `isSupportingOrganization eq false`** | Rev. Proc. 2011-15 § 3.01; IRS, *Annual electronic notice FAQs: who must file* |
| `us-federal-form-990-n` | `conditions` | `totalAssetsMinorUnits lt $500k` | **removed** | Rev. Proc. 2011-15 §§ 3.01, 3.04 |
| `us-federal-form-990-ez` | `conditions` | `grossRevenueMinorUnits gt $50k` | **`anyOf(normalAnnualGrossReceipts gt $50k, isSupportingOrganization eq true)`** | Rev. Proc. 2011-15 §§ 3.01, 3.03, 4 |
| `us-federal-form-990` | `conditions` | *(no receipts floor)* | **+ the same `anyOf` group** | Rev. Proc. 2011-15 §§ 3.01, 3.04 |
| all four | *(product surface)* | revocation stated nowhere | **a standing notice in the web and CLI tiers** | 26 U.S.C. 6033(j) |

## Sources read

Primary, in the order they settle the questions below.

- **Rev. Proc. 2011-15, 2011-3 I.R.B. 322** — `irs.gov/pub/irs-drop/rp-11-15.pdf`.
  The authority for the $50,000 relief itself. Sections 2.04, 3.01, 3.03, 3.04
  and 4 are quoted below.
- **26 U.S.C. 6033** — subsections (a)(3)(A)(ii), (a)(3)(B), (a)(3)(C)(iv), (i)
  and (j).
- **IRS, *Annual electronic filing requirement for small exempt organizations
  (Form 990-N, e-Postcard)*.**
- **IRS, *Annual electronic notice (Form 990-N) for small organizations FAQs:
  who must file*** — the enumeration of organisations not permitted to file.
- **IRS, *Instructions for Form 990*, "A. Who Must File"** — the $200,000 /
  $500,000 thresholds, read in their own context rather than off the summary
  table.

## 1. "Normally" is an average, and a single year is wrong in BOTH directions

Rev. Proc. 2011-15 § 4, verbatim:

> For purposes of section 3 of this revenue procedure, the annual gross receipts
> of an organization are normally not more than $50,000 if —
> (1) in the case of an organization that has been in existence for one year or
> less, the organization's gross receipts, including amounts pledged by donors,
> are $75,000 or less during its first taxable year;
> (2) in the case of an organization that has been in existence for more than one
> year, but less than three years, the organization's average annual gross
> receipts for its first two taxable years is $60,000 or less; and,
> (3) in the case of an organization that has been in existence for three years
> or more, the organization's average annual gross receipts for the immediately
> preceding three taxable years, including the taxable year for which the return
> is filed, is $50,000 or less.

The pack evaluated one year's figure. The issue that reported this called the
resulting error direction *conservative* — over-filing an organisation that had a
one-off legacy year. **That is true of one half of the error and false of the
other, and the ticket's premise held only for the half it had looked at.** An
organisation with a lean year following two large ones — $20,000 after two years
of $200,000 — has normal receipts of $140,000 and may not file the e-Postcard,
while a single-year test reads $20,000 and names it. That is **under-filing**,
the direction this pack exists to avoid, and it is why the averaging was
implemented rather than the limitation merely written down.

**What is implemented:** the averaging, over however many of the three years the
entity supplies, in a derived fact `normalAnnualGrossReceiptsMinorUnits`
(`packages/engine/src/derived.ts`). Two new optional entity facts carry the prior
years.

**What is NOT implemented, and why:** the tiered dollar figures. Clauses (1) and
(2) apply $75,000 and $60,000 to organisations under three years old, and which
clause applies turns on the organisation's age **in the taxable year being
filed**. The engine resolves a rule's conditions once, before computing that
rule's due dates, and one evaluation spans several filing years across the
horizon — so a year-dependent condition is not expressible without restructuring
`evaluate`, which is a larger change than a rule correction should carry.
Every tier is therefore compared against clause (3)'s $50,000, which is the
**strictest** of the three: the simplification can only move a young organisation
onto a fuller return than it strictly owes, never off one it owes.

**A residual limitation, stated because it is the honest thing to state:** an
organisation that supplies only the current year, and had larger earlier years,
gets a lower normal figure than the regulation would produce. That is not a
regression — it is precisely what the pack did for every organisation before the
prior-year facts existed — but it is why the entity form now asks for them, and
why the hint next to those fields explains what turns on them.

## 2. A section 509(a)(3) supporting organisation is excluded from Form 990-N entirely

Rev. Proc. 2011-15 § 3.01, verbatim:

> An organization exempt from federal income tax under § 501(a) because it is
> described in § 501(c) (**other than a private foundation or a § 509(a)(3)
> supporting organization**) that normally has annual gross receipts … of not
> more than $50,000 … is not required to file an annual return under § 6033(a).

and § 3.03:

> An organization that is not required to file an annual return by virtue of
> section 3.01 or 3.02 of this revenue procedure must submit a Form 990-N
> e-Postcard annually in electronic format …

So Form 990-N is the notice filed by the organisations § 3 relieves, and a
supporting organisation is not one of them. It files Form 990 or Form 990-EZ at
any size.

The exclusion is statutory in origin rather than an administrative choice. § 2.04
records that **the Pension Protection Act of 2006 amended § 6033(a)(3)(B) to
remove the Secretary's authority** to relieve § 509(a)(3) organisations from
filing an annual information return at all.

The IRS states the same on *Annual electronic notice FAQs: who must file* —
"Section 509(a)(3) supporting organizations must file Form 990 or Form 990-EZ" —
and it is printed on **Notice CP299**, the letter that prompts the filing: *"All
other supporting organizations generally must file Forms 990 or 990-EZ, even if
gross receipts are normally $50,000 or less."*

**Both halves of the fix were needed.** Excluding a supporting organisation from
990-N alone would have dropped a small one below this pack's 990-EZ receipts
floor, leaving it matching **no federal return at all** — silence, which is
under-filing wearing a clean calendar and strictly worse than naming the wrong
form, because nothing on the screen invites a second look. So Form 990-EZ and
Form 990 each gained a branch: *required to file* is now "normal receipts over
$50,000 **or** a supporting organisation".

### The gap deliberately left open

**26 U.S.C. 6033(a)(3)(A)(ii)**, read with **(a)(3)(C)(iv)**, keeps a *mandatory*
statutory exception the PPA did not touch — the PPA removed only the
*discretionary* authority in (a)(3)(B). (A)(ii) excepts from the annual return
"any organization (other than a private foundation …) described in subparagraph
(C), the gross receipts of which in each taxable year are normally not more than
$5,000", and (C)(iv) is "an organization described in section 501(c)(3), if such
organization is operated, supervised, or controlled by or in connection with a
religious organization". § 6033(i) then requires the e-Postcard from an
organisation relieved under (a)(3)(A)(ii). The IRS restates this as a 509(a)(3)
supporting organisation of a religious organisation with gross receipts normally
$5,000 or less — **which may still use Form 990-N.**

**This pack does not model it.** It cannot be expressed in the v1 rule schema,
which permits one level of `anyOf` and forbids nesting: every arrangement that
admits the exception also lets such an organisation match Form 990-EZ, so it
would be told to file two returns — breaking the one-return invariant, which is a
worse failure than the one it fixes.

**The consequence, named rather than left to be discovered:** an organisation in
that narrow class is shown Form 990-EZ when Form 990-N would have done. That is
over-filing, the direction this pack chooses when it must choose, and Form 990-EZ
is a return the IRS permits any small organisation to file voluntarily.

Also read on the same FAQ page and equally out of reach of `ENTITY_TYPES`, listed
so the gap is measured rather than assumed: integrated auxiliaries of churches;
the exclusively religious activities of religious orders; section 527 political
organisations; and § 4947(a)(1) charitable trusts.

## 3. The assets ceiling on Form 990-N was this pack's invention, and it is removed

**This reverses a shipped answer, and it is the most consequential change in this
pass.**

The ceiling was added on 2026-08-14 to resolve a real overlap: a charity with
$30,000 of receipts and $9,000,000 of assets satisfied both 990-N's row and Form
990's row of the published thresholds table, and was told to file two annual
returns. Capping 990-N's assets resolved it toward the fuller return. The note
that made the change said plainly that the IRS instructions had not been read for
it and that `lastVerified` was not being bumped.

**Reading them settles it, and the other way.** Rev. Proc. 2011-15 § 3.01
conditions the relief on gross receipts and on the organisation not being a
private foundation or a supporting organisation — **and on nothing else.** § 3.04
then makes that exhaustive:

> If at any time an organization **ceases to meet any condition set forth in
> section 3.01 or 3.02** of this revenue procedure, the organization is required
> to file an annual return on Form 990 for the year in which it first ceased to
> qualify for relief …

Total assets are not among those conditions, so growing a balance sheet does not
revive the duty to file. The IRS page listing the organisations not permitted to
file Form 990-N names no assets test either. And the **Instructions for Form
990** apply the $500,000 assets figure to choosing *between* Form 990 and Form
990-EZ — that is, to an organisation already required to file a return — not to
whether the relief applies at all.

So that charity is **relieved from filing an annual return and submits the
e-Postcard.** The one-return invariant is preserved not by capping 990-N but by
giving Form 990 and Form 990-EZ the receipts floor § 3.01 actually creates.

A side effect worth recording: the 990-EZ floor of "$50,000" **stops being this
pack's invention**. It was previously documented as a modelling choice made only
to keep two rules mutually exclusive; it is now the line the revenue procedure
draws, cited as such.

## 4. Missing three years running revokes exempt status, and no surface said so

26 U.S.C. 6033(j)(1), added by the Pension Protection Act of 2006: an
organisation that "fails to file an annual return or notice required under either
subsection for 3 consecutive years" has its exempt status "considered revoked on
and after the date set by the Secretary for the filing of the third annual return
or notice". Reinstatement under (j)(2) requires a fresh exemption application;
Rev. Proc. 2014-11 sets out the procedures, and a user fee applies. The IRS's
revocation list covers Forms 990, 990-EZ, 990-PF **and** 990-N.

`form-990-n.json`'s notes have said this since the rule was written, and added
that it was "worth surfacing prominently in any UI". It was surfaced nowhere: a
rendered row for Form 990-N looked exactly like a rendered row for a state annual
report, and every other deadline in the pack costs a late fee rather than the
organisation's charitable status.

**What was added:** a standing notice in the self-host dashboard and in the CLI,
shown when the calendar actually contains one of the four returns — including an
*undecided* one, because an organisation that has not answered the foundation or
supporting-organisation question still owes one of them.

**What it deliberately does not do.** Nothing in this product records what
anybody filed in a prior year. So the notice states the rule and says explicitly
that it is not a statement about the reader's filings. An escalating warning —
"you appear to have missed two years" — would need a filing history to escalate
against, and absence of a completed reminder is not evidence of an unfiled
return. A compliance tool telling somebody their exemption is at risk, on
evidence it does not have, is a worse failure than the silence it replaces.

The rule ids it applies to live in `packages/engine/src/annualReturn.ts` rather
than in either consumer, so both tiers warn about the same set; the rule-pack
suite asserts that list against what the pack actually ships, in both directions,
so a new annual return fails the suite rather than quietly never triggering it.

## What this pass did NOT do

- It did not re-verify the **due dates**. They were verified on 2026-08-05 and an
  earlier sweep re-measured them as correct; nothing here touches the cadences,
  the weekend rule, or the holiday calendar.
- It did not re-verify the **$200,000 and $500,000** figures. Those were verified
  verbatim from the IRS filing-thresholds table and are unchanged; what changed is
  the question they answer, which is *which* return rather than *whether*.
- It did not touch any **state** rule, or any fee.
