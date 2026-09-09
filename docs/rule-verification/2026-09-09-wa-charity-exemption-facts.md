# Two Washington charity rules tested something adjacent to their regulation — 2026-09-09

Both `us-wa-charitable-solicitation-registration` and
`us-wa-charitable-trust-registration` recorded, in their own `notes`, that they
were testing the nearest fact the model had rather than the quantity their
regulation names. One said so as `KNOWN FALSE POSITIVE, NOT EXPRESSIBLE YET`;
the other said `charitableAssetsMinorUnits ... is not exactly that`. Both
sentences were true when written and both are now gone, because the thing they
described has been fixed rather than re-worded.

**Both rules are `active`, and have been since 2026-08-08.** The issue that
prompted this pass described them as `draft` and reasoned that neither defect
could reach a customer. That was true on 2026-08-05 and false by the time the
work was done — these were live defects, not latent ones. Worth recording,
because the priority argument in the ticket rested entirely on it.

| Rule | Field | Was | Now | Source |
|---|---|---|---|---|
| `us-wa-charitable-solicitation-registration` | `conditions` | `solicits eq true` | **+ `anyOf(contributionsRaised gte $50k, allFundraisingUnpaid eq false, assetsOrIncomeInureToInsiders eq true)`** | RCW 19.09.081(1) |
| `us-wa-charitable-trust-registration` | `conditions` | `charitableAssetsMinorUnits gt $250k` | **`incomeProducingCharitableAssetsMinorUnits gt $250k`** | WAC 434-120-305 |
| the fact model | `EntityFacts` | — | **four new facts, none with a default** | both |
| the self-host tier | schema + form + parser | — | **migration 8, four fields, four columns** | — |

## Sources read

- **RCW 19.09.081**, *Application requirements — Exemptions*, from
  `app.leg.wa.gov/rcw`. Quoted in full below.
- **WAC 434-120-305**, from `app.leg.wa.gov/wac`. The operative clause is quoted
  below; the `$250,000` figure and the word *exceeding* were verified on
  2026-08-05 and re-read here, and are unchanged.
- **RCW 19.09.020**, for the definition of *solicitation*, which is what fixes
  the sense of "raising" — the exemption itself does not define it.

## 1. RCW 19.09.081(1) has THREE limbs, and the ticket described two

Verbatim, because a conjunction quoted at two thirds of its length is a
different rule:

> The application requirements of RCW 19.09.075 do not apply to:
>
> (1) Any charitable organization **raising less than fifty thousand dollars in
> any accounting year** when **all the activities of the organization, including
> all fund-raising activities, are carried on by persons who are unpaid for
> their services** and **no part of the charitable organization's assets or
> income inures to the benefit of or is paid to any officer, director, member,
> or trustee of the organization**, other than as part of a charitable class
> benefited by the charitable organization.
>
> (2) Appeals for funds on behalf of a specific individual named in the
> solicitation, but only if all of the proceeds of the solicitation are given to
> or expended for the direct benefit of that individual.

### Why the third limb is modelled rather than acknowledged and dropped

The plan for this work proposed modelling the first two limbs and stating the
third in `notes` as an accepted limitation. **That is the wrong direction of
error, and the arithmetic is short enough to be worth writing down.**

```
exemption WE implement   = raised < $50k AND allUnpaid
exemption THE STATUTE gives = raised < $50k AND allUnpaid AND noInurement
```

The first set strictly **contains** the second. So dropping a limb of a
conjunctive exemption exempts organisations the statute does not — under-filing,
which is the one direction this pack refuses everywhere else. Every other
simplification recorded in these documents (the 990-N tiered figures, the
religious-order carve-out) errs toward over-filing; this one would have gone the
other way, and it would have done so silently.

The cost of including it is one boolean, and the three-valued evaluator makes
that boolean nearly free to the user:

- An organisation raising $50,000 or more matches the group's first member, and
  **is never asked the other two questions** — `testGroup` returns `true` on any
  known-true member without waiting on unknowns.
- An organisation that pays somebody matches the second and is not asked the
  third.
- Only a small, all-volunteer organisation is ever asked about inurement, which
  is exactly the population the exemption is for.

### Why it needed no schema change

An exemption is a negated conjunction, so the rule is the disjunction of its
failures:

```
applies  =  solicits AND NOT(raised < 50k AND allUnpaid AND noInurement)
         =  solicits AND (raised >= 50k OR NOT allUnpaid OR inurement)
```

which is a top-level `AND` containing one `anyOf` group — precisely the v1
schema's shape, one level deep, no nesting. `NEH-403`-style schema work was not
needed and was not done.

### "Raising" — what the new fact means, and the ambiguity in it

`contributionsRaisedMinorUnits` is the **gross** amount received in response to
charitable solicitation — gifts, donations, grants and pledges collected —
**before** deducting the cost of raising it. Gross, because a threshold on the
net would let an organisation spend its way under the line.

**It is deliberately not `grossRevenueMinorUnits`,** and that distinction is the
substance of this fact rather than a nicety. Gross revenue carries
program-service revenue, investment income and government contracts, none of
which is money the organisation *raised* by asking:

- a theatre with $500,000 of ticket sales and $12,000 of donations has raised
  $12,000, and testing gross revenue would deny it the exemption;
- an endowment-funded grantmaker whose revenue is investment income is in the
  same position.

**Washington does not define "raising" in this section.** This is therefore
*this pack's reading* and is labelled as such rather than presented as the
statute's: the sense is fixed by RCW 19.09.020's definition of *solicitation* —
an oral or written request for a contribution. Where a receipt is genuinely
ambiguous, such as a sponsorship that is part gift and part advertising,
**counting it IN is the reading taken**, because a larger figure can only push an
organisation toward registering.

### Scope: the exemption is written against a different section number

RCW 19.09.081 exempts from *"the application requirements of RCW 19.09.075"*.
The rule it now gates is the annual **renewal** (RCW 19.09.085, WAC
434-120-140(2)(a)). Reading the exemption across to the renewal is a judgement,
and it is the only coherent one: an organisation never required to apply has no
registration to renew.

### Not modelled

**Subsection (2)** — an appeal on behalf of a specific named individual, where
all proceeds go to that person. Not modelled, and unlikely to be worth it: it
describes a single fundraising appeal rather than a standing property of an
organisation, and this fact model describes organisations. An organisation whose
*only* activity is such an appeal would be over-triggered into registering. Over-
filing, the direction chosen when one must be.

## 2. WAC 434-120-305 reaches only assets invested for income

The operative clause, verbatim:

> a trustee shall be required to register or report if, as to a particular
> charitable trust, the trustee holds assets, **invested for income-producing
> purposes**, exceeding a value of two hundred fifty thousand dollars

`charitableAssetsMinorUnits` — everything held for charitable purposes — was the
closest available fact and is a materially different quantity. The qualifier
does real work, and the organisations it separates are ordinary ones:

| holds | charitable assets | invested for income | registers? |
|---|---|---|---|
| a land trust's easements and trailheads | $4,150,000 | $0 | **no** |
| a museum's collection | large | $0 | **no** |
| a food bank's warehouse | large | $0 | **no** |
| an endowment | $8,000,000 | $8,000,000 | yes |

All of the first three were being told to register and pay $25 for a filing the
regulation does not ask of them.

### A new fact, not a narrowed one

`charitableAssetsMinorUnits` **keeps its meaning and stays in the model.**
Narrowing it in place would have re-answered, on their behalf, a question every
self-hoster has already answered — `packages/engine/src/facts.ts` names that as
the one change that is not cheap, and migration 7 added the column for it eight
days ago.

The consequence is stated rather than left to be found: an organisation that
answered only the broad figure now gets an **undecided** trust registration
naming the narrow one. That is a deliberate move from a confident wrong answer
to an honest question, and it is asserted as such in
`apps/web/test/charitable-assets-round-trip.test.ts`.

After this change **no shipped rule conditions on `charitableAssetsMinorUnits`**.
That is a fact about the current pack, not about the fact — several other states
test the broader figure — and there is now a test asserting it, so a future rule
reaching for the wider fact where a statute names the narrower one has to argue
with a failing assertion rather than pass unnoticed.

### The two rules use different operators at their thresholds, and both are right

- RCW 19.09.081(1): *"raising **less than** fifty thousand dollars"* → the
  exemption stops at $49,999.99, so the rule's money limb is **`gte`**.
- WAC 434-120-305: *"**exceeding** a value of two hundred fifty thousand
  dollars"* → $250,000 exactly does not register, so the asset test is **`gt`**.

Two Washington charity rules, two operators, one line apart in the pack. Nothing
but a fixture at each boundary will stop them being "tidied" into agreement, and
there is now one on both sides of both.

## 3. Evidence that the fixtures are not vacuous

Per NEH-400's lesson: a fixture that passes under both the right and the wrong
model is not a test. This was measured rather than asserted — the **pre-change
conditions were planted back into both rule files**, the barrel regenerated, and
the new suites re-run:

```
Tests: 13 failed, 186 passed, 199 total
```

The thirteen include every assertion that carries the correction:

- *EXEMPTS a small all-volunteer charity that takes nothing out*
- *DOES exempt one cent under* ($49,999.99)
- *reports an unanswered third limb as a question, not as an answer*
- *does not register a land trust holding $4.15M of program property*
- *registers the same organisation once it is endowed*
- *asks for the narrow figure when only the broad one was given*
- *the shipped CLI example leaves no Washington rule undecided*

Two of the boundary assertions correctly **pass** under both models — *does NOT
exempt at exactly $50,000* and *still registers a small all-volunteer charity
that pays an insider* — because those organisations register either way. They
are the far side of each pair, and their job is to stop the assertions above
being satisfied by a rule that never fires at all.

**A fixture bug this control caught, worth recording because it is the failure
this repo keeps finding.** `WA_VOLUNTEER_EXEMPT_CHARITY` was first written
without `solicitsCharitableContributions`. The rule was therefore indeterminate
on its *first* condition, so both "is exempt" assertions passed for entirely the
wrong reason. Only the assertion naming the expected `missingFacts` exposed it —
an assertion on the *content* of the question, not merely on its absence.

## What this pass did NOT do

- It did **not** re-verify either rule's **fee, deadline, cadence or weekend
  rule**. Those carry their 2026-08-05 and 2026-08-08 verifications. Both rules'
  `lastVerified` was bumped to 2026-09-09 because the condition set changed on a
  source that was read, and both `notes` now say in as many words which fields
  that bump does and does not cover.
- It did **not** address `NEH-404` — `dayOfMonth: "last"` gives the last calendar
  day where both WACs say the last **business** day. Still wrong, still recorded
  in both rules.
- It did **not** open the agency URL. `sos.wa.gov` returns 403 to every
  automated request, so that remains a task for a person (`NEH-402`).
- It did **not** touch any other jurisdiction, or any federal rule.
