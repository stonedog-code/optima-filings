# Optima Filings

**Know what your business owes, and when.**

Given an entity and the jurisdictions it is registered in, this tells you what is
due, when, to whom, and for how much — annual reports, franchise taxes, charity
registrations, federal returns.

Free and self-hostable. A paid cloud service at
[optimafilings.com](https://optimafilings.com) adds reminders, filing
integrations and document storage, but **the rules and the engine are open, and
every rule is the same on both sides.**

---

> ### ⚠️ This is not legal or tax advice
>
> This software helps you track deadlines. It does not replace an attorney or an
> accountant, and it does not guarantee that its data is current or correct for
> your situation. Filing deadlines and fees change, agencies interpret their own
> rules, and your circumstances may be unusual.
>
> **Verify anything that matters against the cited primary source** — every rule
> names the statute it came from, so you can. You remain responsible for your own
> filings.

> ### 🚧 The rule data is not ready to rely on yet
>
> Every rule currently shipped is `status: "draft"` — written from general
> knowledge and **not yet checked against its statute by a human**. The engine
> excludes drafts by default for exactly this reason. Do not use this to run a
> real compliance calendar until the seed set has been verified
> (tracked as NEH-194).

---

## Why open source

Compliance is a data-coverage problem, not a software problem. Fifty states,
thousands of municipalities, a dozen entity types, and legislatures that move
deadlines and fees every session — that is more than any one company can track
accurately.

So the rule data is public and the people who actually know it — CPAs,
attorneys, and business owners — can correct it directly. **You do not need to
be a developer to help.** If a deadline or a fee is wrong where you live,
[open an issue](../../issues/new/choose) and say so; converting that into a rule
is five minutes of someone's time.

## What is in here

| Package | What it is |
|---|---|
| `@optima-compliance/engine` | The evaluator. Pure and clock-free: entity facts and rules in, obligations out. No I/O, no `Date.now()`, so a result is reproducible and you can ask what was due in 2024. |
| `@optima-compliance/rules` | The rule packs, as JSON, plus the JSON Schema that validates them. Every rule carries a citation and the date a human last verified it. |

## Quick start

```bash
npm install
npm run dev           # the dashboard, on http://localhost:3000
```

That is the whole setup. `npm run dev` puts the SQLite database in `data/`
inside the checkout (gitignored) and switches unverified rules on, because the
seed set is entirely `draft` and a calendar with nothing in it looks like a
broken app rather than an honest empty one. Both are defaults, not
overrides — export `OPTIMA_DB_PATH` or `OPTIMA_INCLUDE_DRAFT` and you get what
you asked for. To run the real self-host artefact instead, see
[`docker/README.md`](docker/README.md).

```bash
npm run gate          # validate rules, typecheck, lint, test
npm run test:e2e      # the browser journey, against a production build
npm run rules:staleness   # which rules nobody has re-verified lately
```

## A rule

```json
{
  "$schema": "../../schema/rule.v1.json",
  "id": "us-wa-sos-nonprofit-annual-report",
  "jurisdiction": "US-WA",
  "title": "Nonprofit Corporation Annual Report",
  "agency": "Washington Secretary of State",
  "entityTypes": ["501c3", "nonprofit-corp"],
  "cadence": { "type": "annual", "anchor": "formation-month", "dayOfMonth": "last" },
  "fee": { "amountMinorUnits": 6000, "currency": "USD" },
  "citation": "RCW 24.03A.1010",
  "lastVerified": "2026-08-01",
  "status": "draft",
  "effectiveFrom": "2022-01-01"
}
```

Three things about that are deliberate and worth knowing before you write one:

- **`citation` is required.** A rule nobody can check is a rumour.
- **`lastVerified` is required**, because crowdsourced regulatory data does not
  fail loudly — it rots quietly, staying valid-looking while the fee changes.
  Bumping the date without re-reading the statute is worse than leaving it
  stale: it turns an honest "unknown" into a false "checked".
- **Fees are integer minor units.** `6000` is $60.00. Never a float.

When a fee or deadline changes, **do not edit the rule** — set `effectiveTo` on
the old one and add a new one. That is what keeps "what was due in 2024"
answerable, and what makes the change visible to a reviewer.

## Found a rule that looks wrong? Say so — you do not need to know git

Every obligation the dashboard shows carries two links, and they answer
different questions:

- the **citation** — the statute or regulation the rule came from, for checking
  whether the rule is faithful to the law
- **"Check *&lt;agency&gt;* for the current fee and deadline"** — the agency's
  own page, for checking whether the law is still what we think it is

The second link exists because the first one often cannot answer it. Washington
does not set its annual-report due date in statute at all — RCW 23.95.255(4)
hands it to the Secretary of State — and Delaware's 8 Del. C. § 502 sets the
1 March deadline with no fee attached. **If the agency page and this software
disagree, the agency is right and we have a bug.**

When that happens:

**[→ Open a "A deadline or fee changed" issue](https://github.com/stonedog-code/optima-filings/issues/new?template=rule-change.yml)**

You do not have to come here to do it. **Every rule-derived deadline in the
dashboard carries a "Report this as wrong" link**, right under the agency link,
and it opens that same form with the jurisdiction, the rule id and the filing
already filled in. That link is the only thing in this software that talks to
anything outside your own machine, and it carries facts about the *rule* —
every one of which is already published in this repository. Nothing about your
entity goes with it.

It is a form: which jurisdiction, what is wrong, and where you saw it. **No pull
request, no JSON, no git.** Converting a filled-in form into a rule change takes
us about five minutes, and it is the single most valuable thing an outside
contributor can do here — the people who notice a fee changed are the ones
filing, not the ones reading the repository.

A few things that make a report immediately actionable, none of them required:

- **The agency page you saw it on.** A link beats a description.
- **The rule id**, if the screen shows one (`us-wa-sos-nonprofit-annual-report`).
- **What you expected instead.** "The fee is $70, not $60" is enough.

**Every report and its resolution stay public**, in the issue tracker, where
anyone can read what was checked and what changed. That is deliberate: this is a
shared dataset, and a correction that arrived through a private channel would
mean some users quietly get better data than others.

**Please do not include an EIN, an account number, or anything from a real
filing.** The tracker is public and permanent. The jurisdiction and entity type
are all we need.

### Not sure whether it is wrong?

Report it anyway. A rule marked **unverified** in the dashboard has not been
checked against its primary source by a person, and "this looked odd to me" is
useful information about one — see [`docs/rule-verification/`](docs/rule-verification/)
for what a verification pass actually found the last time someone did this
properly. Four values in the seed set were wrong, including a fee that had been
correct in an earlier year and quietly stopped being so.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Contributions require signing a CLA
assigning copyright to StoneDogCode L.L.C., which is what allows the project to
be dual-licensed.

## Licence

AGPL-3.0-only. Copyright © 2026 StoneDogCode L.L.C.

If you run a modified version as a network service, the AGPL requires you to
offer your users its source. That is the point: it keeps improvements to a
shared public dataset shared.
