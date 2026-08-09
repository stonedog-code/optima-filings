#!/usr/bin/env bash
# Copyright (C) 2026 StoneDogCode L.L.C.
# SPDX-License-Identifier: AGPL-3.0-only
#
# Publish one of the three public packages, end to end.
#
#   npm run publish:engine
#   npm run publish:rules
#   npm run publish:export
#
# Run these from a terminal, interactively. npm prompts for the 2FA one-time
# password itself (the account is `auth-and-writes`), and the browser login flow
# needs a human — neither works unattended, which is why this is a script you
# run rather than a step in CI.
#
# ## Why this exists rather than two `npm publish` lines
#
# Because verifying a publish is genuinely harder than it looks. Minutes after
# the first successful publish, `npm view @optima-compliance/engine version`
# still answered 404 and `npm install` still failed, while `npm access list
# packages` already showed both names — a propagation window in which every
# obvious check disagrees with every other one.
#
# Two things fall out of that, and both are baked in below:
#
#   * **`npm view pkg@version` is the reliable probe** — it exits 1 when the
#     version is absent and 0 when present. The bare `npm view pkg` form 404s
#     during propagation and would report a successful publish as a failure.
#   * **Nothing short of an install proves it.** The script ends by installing
#     the package from the registry into a temp directory, because that is the
#     question a user actually asks, and it is the last one to start answering
#     "yes".
#
# ## The other trap it closes
#
# `dist/` is gitignored and no package here has a `prepare` hook, so a fresh
# clone plus `npm publish` would ship a package whose `files: ["dist"]` matches
# nothing — an empty package, published silently, on a version number that can
# then never be reused. This builds first and refuses to publish a tarball that
# does not contain what it should.
set -euo pipefail

PACKAGE_KIND="${1:-}"
case "$PACKAGE_KIND" in
  engine)
    PACKAGE_NAME="@optima-compliance/engine"
    PACKAGE_DIR="packages/engine"
    # Sanity floor for the tarball. Deliberately well under the real count (31)
    # so ordinary growth does not trip it, but far above what an unbuilt package
    # would produce (2: package.json and README).
    MIN_FILES=20
    ;;
  rules)
    PACKAGE_NAME="@optima-compliance/rules"
    PACKAGE_DIR="packages/rules"
    MIN_FILES=15
    ;;
  export)
    PACKAGE_NAME="@optima-compliance/export"
    PACKAGE_DIR="packages/export"
    # Three source modules compile to twelve files (.js, .d.ts and a map for
    # each) plus package.json and the README — 15 today, measured rather than
    # guessed. The floor sits below that so ordinary growth does not trip it,
    # and far above the 2 an unbuilt package would produce.
    MIN_FILES=10
    ;;
  *)
    echo "usage: $0 <engine|rules|export>" >&2
    exit 2
    ;;
esac

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[31mREFUSING: %s\033[0m\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Publish from a clean, current `main`.
#
# The house rule, and it has a specific failure behind it: a checkout one commit
# behind publishes a tarball missing the very thing you are publishing for, and
# it looks like a success. A tag or a version can then never be reused.
# ---------------------------------------------------------------------------
say "Checking the working tree"
BRANCH="$(git branch --show-current)"
[ "$BRANCH" = "main" ] || fail "on branch '$BRANCH'. Publish from main, never a feature branch."
[ -z "$(git status --porcelain | grep -v '^??')" ] || fail "the working tree has uncommitted changes."

git fetch --quiet origin
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  fail "HEAD is not origin/main. Run: git pull"
fi
echo "  clean, on main, at $(git rev-parse --short HEAD)"

# ---------------------------------------------------------------------------
# 2. Authenticate.
#
# `npm whoami` is the honest check. A 404 from `npm publish` means AUTH far more
# often than it means a missing package — npm answers 404 rather than 403 so it
# cannot leak whether a scope exists — so establishing identity here turns that
# confusing failure into a clear one.
# ---------------------------------------------------------------------------
say "Checking npm authentication"
if ! NPM_USER="$(npm whoami 2>/dev/null)"; then
  echo "  not logged in — starting the browser login flow"
  npm login
  NPM_USER="$(npm whoami)"
fi
echo "  authenticated as $NPM_USER"

npm org ls optima-compliance >/dev/null 2>&1 \
  || fail "'$NPM_USER' is not a member of the optima-compliance org, so publishing to @optima-compliance/* will fail with a misleading 404."

# ---------------------------------------------------------------------------
# 3. A version may be published at most once, ever.
# ---------------------------------------------------------------------------
VERSION="$(node -p "require('./$PACKAGE_DIR/package.json').version")"
say "Preparing $PACKAGE_NAME@$VERSION"

if npm view "$PACKAGE_NAME@$VERSION" version >/dev/null 2>&1; then
  fail "$PACKAGE_NAME@$VERSION is already published. A version can never be reused — bump it instead."
fi

# ---------------------------------------------------------------------------
# 4. Dependency order. `rules` and `export` both pin `engine` exactly, so
#    publishing either one first yields a package that installs and then
#    immediately fails to resolve.
#
#    The pin is checked against the registry rather than against the workspace,
#    because npm workspaces link `@optima-compliance/engine` to the local
#    directory whatever the manifest says — so a stale pin builds, tests and
#    packs perfectly here and is broken for everybody else. `export` shipped
#    pinned at 0.1.0 while the engine was at 0.4.0 for exactly that reason, and
#    nothing in this repo could have noticed.
# ---------------------------------------------------------------------------
case "$PACKAGE_KIND" in
  rules|export)
    ENGINE_PIN="$(node -p "require('./$PACKAGE_DIR/package.json').dependencies['@optima-compliance/engine']")"
    npm view "@optima-compliance/engine@$ENGINE_PIN" version >/dev/null 2>&1 \
      || fail "$PACKAGE_KIND depends on @optima-compliance/engine@$ENGINE_PIN, which is not on the registry. Publish the engine first: npm run publish:engine"
    echo "  engine@$ENGINE_PIN is on the registry"

    # And that the pin is the engine this repo actually builds against. A pin
    # that resolves on the registry can still be an OLD engine: pair the current
    # rules with one predating the `formation-anniversary` anchor and the
    # affected rules produce no obligations at all — silently, while every other
    # jurisdiction keeps computing. A clean calendar with filings missing from
    # it is worse than a wrong date.
    ENGINE_LOCAL="$(node -p "require('./packages/engine/package.json').version")"
    [ "$ENGINE_PIN" = "$ENGINE_LOCAL" ] \
      || fail "$PACKAGE_KIND pins engine@$ENGINE_PIN but this repo builds engine@$ENGINE_LOCAL. The workspace link hides that difference locally and consumers get the pinned one — move the pin, or publish a matching engine."
    ;;
esac

# ---------------------------------------------------------------------------
# 5. Build. See the header — without this the tarball can be empty.
# ---------------------------------------------------------------------------
say "Installing and building"
npm ci --silent
npm run build --workspace="$PACKAGE_NAME"

# ---------------------------------------------------------------------------
# 6. Read the tarball before trusting it.
#
# `npm pack --dry-run` is the only place the real payload is shown. A manifest
# that looks right and a tarball that is empty are indistinguishable until here.
# ---------------------------------------------------------------------------
say "Verifying the tarball"
PACK_OUTPUT="$(cd "$PACKAGE_DIR" && npm pack --dry-run 2>&1)"
FILE_COUNT="$(printf '%s' "$PACK_OUTPUT" | sed -n 's/.*total files:[[:space:]]*\([0-9]*\).*/\1/p' | tail -1)"

[ -n "$FILE_COUNT" ] || fail "could not read a file count from npm pack."
[ "$FILE_COUNT" -ge "$MIN_FILES" ] \
  || fail "the tarball has only $FILE_COUNT files (expected >= $MIN_FILES). The build did not produce dist/ — publishing this would ship an empty package on a version number that can never be reused."
printf '%s' "$PACK_OUTPUT" | grep -q 'README.md' \
  || fail "no README.md in the tarball — npmjs.com would show 'This package does not have a README'."
echo "  $FILE_COUNT files, README present"

# ---------------------------------------------------------------------------
# 7. Publish. npm prompts for the OTP here; `publishConfig.access` in the
#    manifest already makes it public, so no flag is needed.
# ---------------------------------------------------------------------------
say "Publishing $PACKAGE_NAME@$VERSION — npm will ask for your 2FA code"
npm publish --workspace="$PACKAGE_NAME"

# ---------------------------------------------------------------------------
# 8. PROVE IT. The step whose absence is the reason this script exists.
#
# The registry is eventually consistent for a few seconds after a publish, so
# this polls rather than asserting once. It ends with a real install into a
# throwaway directory, because "the org lists the name" and "a user can install
# it" turned out to be very different claims.
# ---------------------------------------------------------------------------
say "Verifying it is actually installable"
PROBE_DIR="$(mktemp -d)"
trap 'rm -rf "$PROBE_DIR"' EXIT

for attempt in $(seq 1 20); do
  if npm view "$PACKAGE_NAME@$VERSION" version >/dev/null 2>&1; then break; fi
  [ "$attempt" -lt 20 ] || fail "$PACKAGE_NAME@$VERSION is still not on the registry after publishing. The publish did NOT succeed, whatever it printed."
  sleep 3
done

printf '{"name":"probe","version":"1.0.0"}' > "$PROBE_DIR/package.json"
(cd "$PROBE_DIR" && npm install --silent "$PACKAGE_NAME@$VERSION" >/dev/null 2>&1) \
  || fail "$PACKAGE_NAME@$VERSION resolves but cannot be installed."

INSTALLED="$(node -p "require('$PROBE_DIR/node_modules/$PACKAGE_NAME/package.json').version")"
[ "$INSTALLED" = "$VERSION" ] || fail "installed $INSTALLED but published $VERSION."

printf '\n\033[32m✓ %s@%s is published and installable.\033[0m\n' "$PACKAGE_NAME" "$VERSION"
echo "  https://www.npmjs.com/package/$PACKAGE_NAME"
