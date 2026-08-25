/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
export default {
  /**
   * Point `styled-system/*` at THIS app's generated directory for every module,
   * including the ones inside node_modules.
   *
   * Required as of NEH-1004, and it is the second half of installing
   * `@stonedogcode/style` from the registry rather than as a submodule. The
   * package ships TypeScript source that imports `styled-system/jsx`,
   * `styled-system/css` and `styled-system/recipes` — a bare specifier that
   * has to resolve to whatever the CONSUMER generated, because the whole point
   * is that the consumer's Panda config decides what those modules contain.
   *
   * While it was `packages/stonedog-style`, that resolved by accident: the
   * submodule ran `panda codegen` against its own source in its own `prepare`
   * script, so a sibling `styled-system/` sat right next to the imports. A
   * registry install has no `prepare` and no generated directory, and node
   * resolution from `node_modules/@stonedogcode/style/src/components/` finds
   * nothing.
   *
   * `tsconfig.json` already maps the same specifier, which is what keeps `tsc`
   * quiet — but Next's tsconfig-paths resolver deliberately skips files under
   * node_modules. So the type-check passes and the BUILD fails with
   *
   *     Module not found: Can't resolve 'styled-system/jsx'
   *
   * pointing at a file nobody in this repo wrote. `optima-cloud-saas` hit this
   * on the same migration and carries the same alias.
   *
   * A prefix alias, so `styled-system/anything` resolves too.
   */
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "styled-system": path.join(appDir, "styled-system"),
    };
    return config;
  },
  /**
   * `standalone` traces exactly the files the server needs into one directory,
   * so the runtime image can be a bare node:alpine with no node_modules install
   * and no package manager. That is what keeps the self-host image small enough
   * to pull on a Pi.
   */
  output: "standalone",
  /**
   * Both packages ship TypeScript source rather than a bundle, for Panda's
   * sake, so Next has to compile them itself.
   */
  transpilePackages: ["@stonedogcode/style", "@optima-compliance/ui"],
  experimental: {
    // The store is a singleton holding an open SQLite handle. Without this,
    // Next's bundler would try to trace node:sqlite into the client graph.
    serverComponentsExternalPackages: ["node:sqlite"],
  },
};
