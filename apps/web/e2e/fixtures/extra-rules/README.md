# `OPTIMA_RULES_DIR` fixture — NEH-1255

Two **fake** rules, loaded by `apps/web/playwright.config.ts` into a second
server through `OPTIMA_RULES_DIR`. They are what `e2e/draft-rule.spec.ts`
asserts the per-row *unverified* badge against.

They live here rather than in `packages/rules/us/` for the reason the badge
exists at all: **the shipped pack is entirely `active`**, and promoting a real
rule back to `draft` to give a test something to look at would put an
unverified marker on a filing somebody has actually checked. It would also
make the test pass for a reason that has nothing to do with the feature.

Nothing here is a real filing. The agency, the citation and the county do not
exist, and `rules:validate` never sees these files — they are outside
`packages/rules/us/`, which is the point.
