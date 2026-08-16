# Contributing

The most valuable contribution to this project is **telling us a rule is wrong**.

You do not need to know how to code, and you do not need to open a pull request.

## If you know a deadline or fee is wrong

[Open an issue using the "A deadline or fee changed" template.](../../issues/new/choose)
It asks for the jurisdiction, the filing, what changed, and — the one thing we
genuinely cannot do without — **where you found it**.

Turning that into a rule takes someone five minutes. Filling in the form takes
you two. That trade is the whole reason this project is open source.

## The one hard rule about sources

**Cite the primary source: the statute, the regulation, the form, or the
agency's own page.**

Please do not cite another compliance vendor's website. They are wrong often
enough that copying them would import their errors into a dataset other people
rely on — and their liability with it. If the only place you can find something
is a vendor site, say so in the issue and we will go and check the statute.

## If you want to write the rule yourself

Rules are JSON. The easiest way is to copy a neighbouring rule and change a few
fields.

```bash
npm install
npm run gate          # validate rules, typecheck, lint, test
```

To see your rule in the dashboard, `npm run dev` and open
<http://localhost:3000>. Nothing else to configure — it keeps its database in
`data/` inside the checkout and shows draft rules, which is what makes a rule
you just wrote visible.

1. **Find the right file.** `packages/rules/us/<state>/<slug>.json`, or
   `packages/rules/us/federal/` for federal filings. Rules are organised by
   jurisdiction, not by entity type, because one rule usually covers several
   entity types.

2. **Copy a neighbour and edit it.** Keep `$schema` pointing at
   `../../schema/rule.v1.json` — your editor will then autocomplete the fields
   and flag mistakes as you type.

3. **Be honest about `status`.**
   - `"draft"` — you wrote it from what you know, but have not read the statute.
   - `"active"` — you opened the primary source and confirmed it.

   **Draft is a perfectly good contribution.** It is not a lesser version of
   active to be cleaned up later; it is the truthful state for a rule nobody has
   checked, and submitting one is much better than guessing and calling it fact.

4. **Set `lastVerified`** to the date you actually read the source. If you did
   not read it, do not move the date. Bumping it without re-reading converts an
   honest "unknown" into a false "checked", which is worse than leaving it stale.

5. **Money is integer minor units.** `6000` is $60.00. Never a float.

6. **When a fee or deadline changes, do not edit the rule.** Set `effectiveTo`
   on the existing one and add a new rule. That keeps "what was due in 2024"
   answerable — which matters for late filings and penalty calculations — and it
   makes the change visible to a reviewer instead of silently overwriting it.

7. **Regenerate the barrel and add a test.**
   ```bash
   npm run rules:barrel     # updates packages/rules/src/generated.ts — commit it
   ```
   Add at least one fixture in `packages/engine/test/` showing an entity that
   triggers your rule and a nearby one that does not. Rule data has no compiler
   behind it, so those fixtures are the only thing standing between a
   schema-valid rule and a wrong date in someone's calendar.

8. **`npm run gate`**, then open the pull request.

## How rule pull requests are reviewed

On **the citation and the dates**, not on style. A formatter handles style; only
a person can check that the statute says what the JSON claims. Expect a reviewer
to open your citation and read it.

## Code contributions

Same gate, plus two constraints in `packages/engine` that are not negotiable and
are enforced by tests:

- **No I/O.** No filesystem, no network, no `process.env`. The engine has to run
  in a browser and be safe to expose directly as an API.
- **No clock.** Nothing calls `Date.now()`. Every entry point takes an explicit
  `asOf` date, which is what makes a result reproducible in a bug report,
  cacheable, and able to answer questions about the past.

Bug fixes start with a failing test that reproduces the bug on the pre-fix code.

Branch names are `feat/…`, `fix/…`, `docs/…`, `chore/…`. Pull request titles
follow [Conventional Commits](https://www.conventionalcommits.org/).

## The CLA

First-time contributors sign a [Contributor License Agreement](CLA.md) by
commenting on their pull request. **You keep the copyright in your work** — it
is a licence, not an assignment. The document explains what we are asking for
and why in plain terms; please read it rather than skimming, and ask if anything
is unclear before you sign.

## Reporting a security problem

Privately, please — see [SECURITY.md](SECURITY.md). Not as a public issue.

## Code of conduct

[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Short version: be decent to people.
