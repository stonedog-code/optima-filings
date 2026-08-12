# optima-filings — the open-source core (AGPLv3)

**Repo tier.** Project-wide context (the open-core boundary, ownership and the
CLA, the rule contract, the design system, cross-repo ordering) is in
`~/src/stonedogcode/optima/CLAUDE.md`. Machine-wide conventions are in
`~/.claude/CLAUDE.md`. This file covers only what's true inside this repo.

**This repo is public.** Every commit, comment, and branch name is visible to
the world, permanently, from the moment it's pushed. Never commit a real EIN,
customer name, filing document, credential, or internal pricing discussion here.
Test fixtures use obviously-fake entities.

Copyright is **StoneDogCode L.L.C.** — in the AGPL headers, in every
`package.json` `author`, and as the CLA's assignee.

## Layout

Nx + npm workspaces (`packages/*`, `apps/*`), the same arrangement HopperGuard
uses.

```
packages/
  engine/        @optima-compliance/engine  — pure TS evaluator, zero runtime deps
  rules/         @optima-compliance/rules   — rule packs + JSON Schema, published as data
  db/            @optima-compliance/db      — SQLite persistence for self-host
  ui/            @optima-compliance/ui      — the Lucide icon set + app primitives
  stonedog-style/  SUBMODULE → stonedog-code/stonedog-style (Apache-2.0)
apps/
  web/                            — self-host dashboard, single-tenant
  cli/                            — `optima check`, rule linting, imports
docker/                           — the one-container self-host image
```

`engine` is the crown jewel and the thing the SaaS imports. Keep it **pure**: no
filesystem, no network, no database, no `process.env`. Rules and entities go in,
obligations come out. That purity is what makes it testable against thousands of
fixture cases, embeddable in a browser, and safe to expose as the B2B API.

Dependency direction is one-way: `web`/`cli` → `db` → `engine` ← `rules`, and
`web` → `ui` → `@stonedogcode/style`. **`engine` imports nothing from the others.**

`packages/stonedog-style` is a submodule, so a change to it is a PR in *that* repo
followed by a pointer bump here — never an edit in place. It has three consumers;
see the project file.

## Design system & icons

Primitives come from `@stonedogcode/style`. Wiring is four steps and two of them get
missed — read @stonedogcode/style's CLAUDE.md, but the short version: add
`stonedogStylePreset()` to `presets` **alongside** `@pandacss/preset-base` and
`@pandacss/preset-panda` (listing `presets` replaces Panda's defaults rather than
extending them, and the loss is silent), add
`./packages/stonedog-style/src/**/*.tsx` to the Panda `include` globs, and define
the `--optima-*` custom properties — this repo passes `cssVarPrefix: "optima"`
(NEH-170), so the default `--hopper-*` namespace is NOT what it reads.

**No Font Awesome. Ever.** `stonedog-icons` vendors licensed Pro artwork and this
repo is public and ships a public Docker image — see the project file. Icons here
are Lucide, wrapped one line each through @stonedogcode/style's seam in
`packages/ui/src/icons/`:

```tsx
import { CalendarClock } from "lucide-react";
export const StyledCalendar = createIconFromComponent("StyledCalendar", CalendarClock);
```

**Keep the exported names identical to the SaaS's** so a screen ports between
the repos without icon edits.

**Standard sizing, not HopperGuard's.** Set it once, at the provider:

```tsx
<StonedogStyleProvider fontSizeProfile="md" iconSize="md" variant="solid">
```

plus a standard `--font-sizes-*` scale (`md` = 1rem) in the theme CSS, which
overrides @stonedogcode/style's elder-audience fallbacks. Never pass `size` at an icon
call site to compensate — that's how an app ends up with three icon scales and
no way to retune any of them.

## The fact model comes first

`packages/engine/src/facts.ts` defines what the system knows about an entity —
formation date, fiscal year end, entity type, jurisdictions registered in,
revenue and asset bands, employee count, charitable-solicitation status. **A rule
may only reference a fact that exists there.**

This ordering is load-bearing. Write rules first and you discover each missing
fact one rule at a time, versioning the schema repeatedly in a month; every
version is a migration for self-hosters and a breaking change for the B2B API.
Adding a fact is cheap, changing what one *means* is not.

## Product vocabularies live in `engine`, and are imported — never mirrored

`ENTITY_TYPES`, jurisdictions, and **`DOCUMENT_TYPES`** (NEH-362) are all
defined in `packages/engine` and imported by everything else, including the
hosted tier.

This is not tidiness. NEH-343 records what the other arrangement costs: entity
vocabulary was *mirrored* into the cloud repo rather than imported, and the two
copies drift. For documents the drift is worse than untidy — a document filed
as `MEETING_MINUTES` in a self-hosted install would import into the cloud as
nothing at all, which is data loss wearing the costume of a successful import.

- **The string values are permanent public identifiers**, exactly like rule ids.
  They are persisted in every self-hoster's database and cross the tier
  boundary. **Add a value; never rename one** — a rename silently reclassifies
  every stored row that used it.
- **`DOCUMENT_TYPE_INFO` is a `Record` keyed by the union**, so adding a value
  without describing it is a *type error* rather than a blank row in a picker.
- **Reading is lenient, writing is strict.** `toDocumentType()` coerces an
  unrecognised value to `OTHER` so a row from a newer version stays readable;
  `isDocumentType()` guards writes so the closed list stays closed. Do not
  collapse the two — a document that becomes unlistable is worse than one that
  is mislabelled.
- **`hasDocumentDate` is one property with two consequences**: it decides both
  whether the list orders by `documentDate` and whether entry requires it. They
  coincide because a type is worth ordering by its own date exactly when it has
  one. Splitting them invites a type ordered by a date it never collects, which
  sorts most of a list by `NULL`.

## Rule packs — the heart of the project

Rules live at `packages/rules/us/<state>/<slug>.json`, e.g.
`packages/rules/us/wa/nonprofit-annual-report.json`. Federal rules go under
`packages/rules/us/federal/`.

**Organised by jurisdiction, not by entity type**, because `entityTypes` is a
list — one Washington annual report covers `s-corp`, `c-corp` and `b-corp`, and
a directory per entity type would have to pick one or duplicate the rule.

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
  "citation": "RCW 24.03A.070; RCW 23.95.255(2)",
  "lastVerified": "2026-08-01",
  "status": "draft",
  "effectiveFrom": "2022-01-01"
}
```

### The two formation anchors are different, and confusing them is silent

`formation-month` takes the day from the **rule** — Washington's "last day of
your formation month" is the same day for every entity in the state.
`formation-anniversary` takes the month *and day* from the **entity** — Oregon's
"by the corporation's anniversary" is a different date for everyone.

They produce identical dates when an entity was formed on a month end, and that
is exactly how the wrong one shipped: all three Oregon rules used
`formation-month` and were up to **30 days late**, while the entire fixture
suite agreed with them because the only Oregon fixture was formed on the 31st
(NEH-400).

- **Pick the anchor from the statute's wording, not from what looks similar.**
  "By the anniversary" and "in the anniversary month" are different rules.
- **A leap-day fixture does not catch this** — February's month end is where a
  leap-day anniversary clamps to. Only a **mid-month** formation distinguishes
  them.
- More generally: **a fixture that coincides under both the right and the wrong
  implementation tests nothing, and looks exactly like one that does.** When
  adding a boundary case, name the wrong implementation it would catch. If there
  isn't one, it is documentation.
- `formation-anniversary` deliberately has **no `dayOfMonth`**. The day is a
  fact about the entity, so a rule naming one would assert something it cannot
  know.

`src/generated.ts` inlines every rule into a TypeScript module, because the
engine is pure and must run in a browser — a consumer that had to read a file
could not. It is **committed and generated**: run `npm run rules:barrel` after
adding a rule, and `rules:barrel:check` in the gate fails when it is stale, so a
rule added without regenerating is caught at merge rather than going silently
missing from everyone's calendar.

### `status`: draft vs active

**`draft` is not a lesser form of `active` to be tidied up later.** It is the
honest state for a rule written from general knowledge rather than from reading
the statute, and it exists so that contributing a rule you are unsure about is
possible without asserting something false. Promotion to `active` means a person
read the primary source.

`evaluate()` **excludes drafts by default.** The default protects the consumer
who did not think about it; a caller that wants them passes `includeDraft` and
gets `status` on every obligation so it can label them.

**The entire seed set is currently `draft`** — see the seeding note in the README
and NEH-194. Nothing in it should be shown to a user as fact until a human has
worked through it.

**Money is integer minor units.** `6000` is $60.00. Never a float, anywhere in
this repo — a rounding error in a fee is a support ticket and a credibility hit.

**Dates are the whole product; treat them accordingly.**
- Store and compare as plain calendar dates (`YYYY-MM-DD`), never `Date` objects
  carrying a time or a zone. A due date is a civil date in the filing
  jurisdiction, not an instant.
- The engine is **deterministic and clock-free**: every entry point takes an
  explicit "as of" date. Nothing in `engine` calls `Date.now()`. This is what
  makes results reproducible, cacheable, and testable — and it's what lets a
  user ask "what was due in 2024".
- Weekend/holiday rolling is a rule property, not a global assumption — states
  differ on whether a due date rolls forward.

**Every rule needs a citation.** Statute, form number, or the agency page it came
from. CI rejects a rule without one, and reviewers reject one whose citation
doesn't say what the rule says.

**Every rule needs `lastVerified`** — the date a human last checked it against
the primary source. `npm run rules:staleness` reports rules unverified for over
twelve months, and that report is a work queue, not a warning to scroll past.
Bumping the date without re-reading the statute is worse than leaving it stale,
because it converts an honest "unknown" into a false "checked".

**Superseding, not editing.** When a fee or deadline changes, set `effectiveTo`
on the old rule and add a new one. Overwriting destroys the historical answer
and hides the change from review. The only edits in place are corrections of
rules that were *always* wrong.

### Adding or changing a rule

1. Verify against the primary source — the statute or the agency's own page, not
   a blog or another compliance vendor. Vendor sites are wrong often enough that
   copying them imports their errors and their liability. If you have not done
   this, the rule is `status: "draft"` — say so rather than guessing.
2. Add the JSON, with `citation`, `effectiveFrom`, `lastVerified`, and `status`.
3. `npm run rules:barrel` to regenerate `src/generated.ts`, and commit it.
4. Add fixture cases in `packages/engine/test/` — at minimum one entity that
   triggers it and one nearby entity that doesn't. Boundary cases (formation on
   the 31st, leap day, a fiscal year that isn't calendar) are where this engine
   will actually break, and all three are already in the fixture entities.
5. `npm run gate` — validation, barrel freshness, typecheck, lint, tests.

**`npm run gate` is the merge bar for a rule PR.** Maintainers sequence
verification as its own bulk pass rather than blocking a green PR on it, so do
not wait on a citation review to merge. The sequencing itself is a maintainer
decision and lives outside this repo.

## Testing

Rule data has no compiler to catch it, so **the fixture suite is the only thing
standing between a schema-valid rule and a wrong deadline in someone's
calendar.** A rule PR without fixtures is not mergeable, however obvious the
rule looks.

Prefer table-driven fixtures (entity + as-of date → expected obligations) over
hand-written assertions. They're what a non-developer contributor can actually
read and extend, and they double as the regression corpus when the engine's date
math changes.

Every bug fix starts with a failing fixture that reproduces it (per
`~/.claude/CLAUDE.md`).

`npm run gate` — rule validation, barrel freshness, typecheck, lint, tests — is
the merge bar.

### The E2E tier — `npm run test:e2e` (NEH-373)

Playwright, in `apps/web/e2e`, at **two viewports** (desktop and a 375px
mobile), covering the Milestone 1 journey: add an entity → obligations render
with real dates → citations present → the disclaimer is visible → draft rules
are marked unverified → both exports work.

Four things about it that are decisions rather than accidents:

- **It runs the PRODUCTION build** (`next build && next start`), not `next dev`.
  The hosted tier's harness cannot — its verification-email link is only printed
  outside production — but nothing here needs email, so this suite exercises the
  artefact rather than a dev server that resembles it.
- **It gates the merge.** A separate `e2e` job in `gate.yml`, blocking. This repo
  is public so branch protection works; the hosted repo's cannot block at all
  (NEH-351), which is why only this one is wired in.
- **Drafts are switched ON** (`OPTIMA_INCLUDE_DRAFT=true`). The whole seed set is
  `draft` and `evaluate()` excludes drafts by default, so a stock launch shows an
  empty calendar — correct, and untestable. Opting in also makes the draft banner
  and the per-row "unverified" badge assertable.
- **A throwaway SQLite file per run**, never the default `/data/optima.sqlite`,
  which is where a self-hoster's volume is mounted.

**`test.fixme` marks a real defect, not a flaky test.** Two are pinned that way
today — no skip link (NEH-379) and a 21px button against WCAG 2.2's 24px floor
(NEH-380). Both assertions are correct and start passing the moment the fix
lands; deleting them instead is how a known defect becomes an unknown one. Both
were found by this tier on its first run, which is the argument for having it.

### In a worktree, run a real `npm install`

**Do not symlink `node_modules` to the canonical checkout here.** That works for
a single-package repo, but this is an npm workspace: the canonical
`node_modules/@optima-compliance/engine` links to the *canonical* `packages/engine`, so a
worktree borrowing it type-checks your edits against **whatever branch the
canonical checkout happens to be on**.

The failure is thoroughly misleading. `tsc` reports a type error in
`packages/rules/src/generated.ts` about a field you just added and can see
plainly in the source — because the `.d.ts` it is reading belongs to another
branch. Nothing in the message points at the symlink, and the obvious next moves
(regenerate the barrel, tweak the type) all fail for reasons that look unrelated.

`npm install` in the worktree takes seconds and links `@optima-compliance/*` to that
worktree's own packages.

## Public API surface & versioning

- `@optima-compliance/engine` — **semver, strictly.** Third parties and the SaaS build on
  it. Anything exported from the package root is a promise; keep internals
  behind `src/internal/` and out of the entry point.
- `@optima-compliance/rules` — **date-versioned** `YYYY.M.PATCH` (`2026.7.0`). It's data;
  it changes weekly and semver doesn't describe it. A *schema* change is what
  bumps `rule.v1.json` to `v2`, and v1 rules keep working.
- **Rule ids are permanent public identifiers.** Never rename one — customers,
  the B2B API, and downstream integrations key off them. Supersede instead.

Publishing is what the SaaS consumes; see the project file for the mandatory
OSS-first ordering.

## Self-host container

One container, `docker run`, SQLite on a mounted volume, no external services
required. That constraint is the product for this tier — the moment self-hosting
needs Postgres plus Redis plus an SMTP relay, the audience it exists for stops
installing it.

Follows the house Docker conventions from `~/.claude/CLAUDE.md` where they
apply, but note this image is **published for the public to run**, not deployed
to a Lightsail service. Build multi-arch (`amd64` + `arm64`) — a meaningful share
of self-hosters are on ARM boxes and Pis.

## Contributions from outside

- **CLA before the first outside PR, and before the repo gets attention.** The
  bot must be green on every external PR. See the project file for why this is
  load-bearing rather than paperwork.
- The target contributor is a **CPA or attorney who knows the statute but may
  not know git.** The highest-leverage file in the repo is the structured
  **"a deadline or fee changed" issue template** — jurisdiction, what changed,
  citation. Someone who will never open a PR will happily fill out a form, and
  converting that to JSON is five minutes.
- For those who do open PRs: optimize the authoring guide for copy-paste — take
  a neighbouring rule, change three fields, submit. Any friction here is friction
  on the one thing the project can't buy.
- Review rule PRs on **the citation and the dates**, not on style — a formatter
  handles style, and only a human can check that RCW 24.03A.075 says what the
  JSON claims. **But do not block a green PR on that review**; it is sequenced
  as its own pass, per "Adding or changing a rule" above.

## Not legal advice

The README, the dashboard, and the CLI all carry it, and it is not a footer
afterthought — this software tells people when to file with the government.
See the project file.

### Terms of Use — and deliberately not a Terms of Service (NEH-240)

`apps/web/src/content/terms.ts`, rendered at `/terms`, linked from the footer.

There is no service here: no account, no data leaving the machine. The AGPL
governs the code and `Disclaimer` governs the advice, so a full ToS would invent
obligations rather than limit them. This covers the one gap the licence arguably
leaves — **reliance on the compliance data**. AGPL §15–17 disclaim warranty for
*the Program*, and "the software has a bug" is a different claim from "the
deadline you published was wrong".

Four things `apps/web/test/terms.test.ts` holds in place, and each is there
because it is the kind of sentence that drifts into a legal document unnoticed:

- **No trademark claim.** Same ban the footer is under (NEH-371/NEH-199), and a
  terms page is exactly where `Optima Filings®` would appear without thought.
- **No insurance, certification or audit claim.** E&O is an open decision; until
  it is made, the document must not imply cover.
- **No account, no server, no data we hold.** That vocabulary belongs to the
  hosted tier. The assertion exists so this document cannot quietly become the
  other one by copy-paste.
- **The agency wins a disagreement.** The product's honest position. A terms
  page that reversed it would be the more dangerous document, because it reads
  as more protective.

**It ships inside the app rather than as a root `TERMS.md`** — one canonical
copy, and it works with no network, which is the situation a self-hoster is in.

**It has not been reviewed by a lawyer.** Written to be narrow enough to be safe
while unreviewed rather than broad enough to look impressive.

## AGPL hygiene

- Keep `LICENSE` (AGPLv3) at the root, unmodified.
- New source files carry the standard AGPL header with **StoneDogCode L.L.C.**
  as the copyright holder; rule JSON files don't (no comments in JSON, and the
  repo-level licence covers them).
- **Never paste code in from the SaaS repo.** The proprietary tree may only
  *depend* on this one, and any leak in the other direction muddies the licence
  story that the whole business model rests on.
- **Nothing licensed-but-not-redistributable may land here** — Font Awesome Pro
  above all. `packages/stonedog-style` is Apache-2.0 and safe; `stonedog-icons` is
  not and must never appear in this repo's dependency tree, submodules, or
  Docker image.
