/**
 * The Optima theme.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * @stonedogcode/style ships **no colours**: every one of its tokens resolves to a bare
 * CSS custom property that the host defines. This file is that definition for
 * Optima, under our own `--optima-*` namespace (NEH-170) rather than the
 * default `--hopper-*`.
 *
 * **A token with no matching custom property renders as nothing.** There is no
 * fallback, by design — an invisible element is a louder bug than a slightly
 * wrong shade, and it shows up in development rather than production. The
 * completeness test in `test/theme.test.ts` asserts this file covers every
 * property the preset requires, so an upstream addition fails here instead of
 * silently painting nothing.
 *
 * Palette intent: a business tool that has to look trustworthy at a glance and
 * stay readable in a spreadsheet-adjacent context. Deep blue for action, warm
 * amber and red reserved for genuine warnings — never decoration, because in a
 * compliance product a red row has to mean something.
 */

export const CSS_VAR_PREFIX = "optima";

/** Property suffix → colour. Keys are everything after `--optima-`. */
export type ThemeTokens = Record<string, string>;

export const LIGHT_THEME: ThemeTokens = {
  // Text that carries meaning on its own.
  //
  // `text-success-text` arrived with @stonedogcode/style 0.20.0 (upstream
  // NEH-519). The contract could say failure and caution and not success, so
  // consumers reached for `textAccent` — which is whatever a host sets it to,
  // with nothing constraining it to read as positive, so a confirmation could
  // land in an alarming colour.
  //
  // The value is `button-accent-hover-bg`'s green rather than a new colour: the
  // palette already commits to that hue for "this went well", and a second
  // green would be a second definition of the same idea. Measured against every
  // light surface — 8.95:1 on the page, 8.48 / 7.95 on the primary and
  // secondary panels — which is the band the other two meaning colours sit in
  // (error 7.84, warning 7.41). Like them it is deliberately NOT paired to a
  // background in the preset's TEXT_BACKGROUND_PAIRS: a meaning colour appears
  // on whatever surface the message happens to sit on.
  "text-pop-text": "#0b4f78",
  "text-error-text": "#a3160f",
  "text-warning-text": "#7a4b00",
  "text-success-text": "#07543e",

  // Surface text.
  "box-main-text": "#161b22",
  "box-primary-text": "#161b22",
  "box-secondary-text": "#3d4753",
  // The accent surface is a light tint (below), so its own text is the deep
  // blue rather than white — which also keeps Optima's blue as the thing the
  // eye reads on an accented panel.
  "box-accent-text": "#0b4f78",

  // Surfaces. **Every light surface is light, including the accent one.**
  // `box-accent-bg` was #0b4f78, a deep blue, and @stonedogcode/style's `inputText`
  // and `form` recipes paint the ordinary body colour (`textPrimary`, #161b22)
  // onto it — 1.98:1, well under AA. A dark surface in a light theme cannot
  // satisfy both its own text and the body text that lands on it from a
  // cross-group recipe, so the surface moved rather than the recipes. (NEH-275)
  "box-main-bg": "#ffffff",
  "box-primary-bg": "#f7f9fb",
  "box-secondary-bg": "#eef2f6",
  "box-accent-bg": "#dbeafe",
  "box-info-bg": "#e6f0f7",

  "box-primary-border": "#d5dde5",
  "box-secondary-border": "#c3ced9",
  // Stays the deep blue: it is an edge, not a surface, and it is also what the
  // app's `:focus-visible` outline is drawn in (8.74:1 on the page background,
  // comfortably past the 3:1 WCAG asks of a non-text indicator).
  "box-accent-border": "#0b4f78",

  // Disclosure arrows.
  "arrow-primary-bg": "#3d4753",
  "arrow-secondary-bg": "#5a6674",
  "arrow-accent-bg": "#0b4f78",
  "arrow-primary-border": "#d5dde5",
  "arrow-secondary-border": "#c3ced9",
  "arrow-accent-border": "#0b4f78",

  // Shadows are colours here, not blur values.
  "shadow-primary-bg": "rgba(22, 27, 34, 0.10)",
  "shadow-secondary-bg": "rgba(22, 27, 34, 0.06)",
  "shadow-accent-bg": "rgba(11, 79, 120, 0.24)",

  // Buttons. Contrast checked against their own text token, not against the
  // page — a button is its own surface.
  "button-primary-bg": "#0b4f78",
  "button-secondary-bg": "#eef2f6",
  "button-accent-bg": "#0a6b4f",
  "button-primary-hover-bg": "#083c5c",
  "button-secondary-hover-bg": "#dfe6ed",
  "button-accent-hover-bg": "#07543e",
  "button-primary-text": "#ffffff",
  "button-secondary-text": "#161b22",
  "button-accent-text": "#ffffff",
  "button-primary-hover-text": "#ffffff",
  "button-secondary-hover-text": "#161b22",
  "button-accent-hover-text": "#ffffff",
  "button-plain-bg": "transparent",
  "button-plain-text": "#0b4f78",

  // Icons. Two-tone sets read primary/secondary; single-tone ones use primary.
  "icon-primary-bg": "#0b4f78",
  "icon-secondary-bg": "#7d93a6",
  "icon-accent-bg": "#0a6b4f",
  "icon-primary-hover-bg": "#083c5c",
  "icon-secondary-hover-bg": "#5a6674",
  "icon-accent-hover-bg": "#07543e",
};

export const DARK_THEME: ThemeTokens = {
  "text-pop-text": "#7cc4ee",
  "text-error-text": "#ff9c94",
  "text-warning-text": "#f0c674",
  // `icon-accent-hover-bg`'s lighter green, for the same reason the light theme
  // reuses the darker one. 10.05:1 on the page, 9.16 / 7.99 on the panels —
  // alongside dark error (8.95) and warning (11.18).
  "text-success-text": "#6fd4b0",

  "box-main-text": "#e7edf3",
  "box-primary-text": "#e7edf3",
  "box-secondary-text": "#adbac7",
  "box-accent-text": "#ffffff",

  "box-main-bg": "#12171d",
  "box-primary-bg": "#1a2027",
  "box-secondary-bg": "#232b34",
  "box-accent-bg": "#1d6a9c",
  "box-info-bg": "#16303f",

  "box-primary-border": "#2c353f",
  "box-secondary-border": "#3a4552",
  "box-accent-border": "#1d6a9c",

  "arrow-primary-bg": "#adbac7",
  "arrow-secondary-bg": "#7d93a6",
  "arrow-accent-bg": "#7cc4ee",
  "arrow-primary-border": "#2c353f",
  "arrow-secondary-border": "#3a4552",
  "arrow-accent-border": "#1d6a9c",

  "shadow-primary-bg": "rgba(0, 0, 0, 0.45)",
  "shadow-secondary-bg": "rgba(0, 0, 0, 0.30)",
  "shadow-accent-bg": "rgba(29, 106, 156, 0.40)",

  "button-primary-bg": "#1d6a9c",
  "button-secondary-bg": "#232b34",
  "button-accent-bg": "#12805e",
  "button-primary-hover-bg": "#2a80b8",
  "button-secondary-hover-bg": "#2c353f",
  "button-accent-hover-bg": "#169a71",
  "button-primary-text": "#ffffff",
  "button-secondary-text": "#e7edf3",
  "button-accent-text": "#ffffff",
  "button-primary-hover-text": "#ffffff",
  "button-secondary-hover-text": "#ffffff",
  "button-accent-hover-text": "#ffffff",
  "button-plain-bg": "transparent",
  "button-plain-text": "#7cc4ee",

  "icon-primary-bg": "#7cc4ee",
  "icon-secondary-bg": "#5a6674",
  "icon-accent-bg": "#3fbf94",
  "icon-primary-hover-bg": "#a5d8f5",
  "icon-secondary-hover-bg": "#7d93a6",
  "icon-accent-hover-bg": "#6fd4b0",
};

/**
 * A standard web type scale.
 *
 * @stonedogcode/style's own fallbacks are deliberately large — it came from a product
 * for an often-elderly, sometimes cognitively-impaired audience, where `md` is
 * 1.375rem (~22px). Optima is a business tool for a general audience, so it
 * supplies a conventional scale here. **rem throughout, never px**, so the
 * whole UI still responds to the browser's own font-size setting, which is the
 * accessibility affordance users with low vision actually reach for.
 */
export const FONT_SIZE_SCALE: Record<string, string> = {
  xs: "0.75rem",
  sm: "0.875rem",
  md: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
  "4xl": "2.25rem",
  "5xl": "3rem",
  "6xl": "3.75rem",
  "7xl": "4.5rem",
  "8xl": "6rem",
  "9xl": "8rem",
};

function block(selector: string, tokens: ThemeTokens): string {
  const body = Object.entries(tokens)
    .map(([suffix, value]) => `  --${CSS_VAR_PREFIX}-${suffix}: ${value};`)
    .join("\n");
  return `${selector} {\n${body}\n}`;
}

/**
 * The theme as a stylesheet.
 *
 * Dark mode is driven by an explicit `data-theme="dark"` attribute **and** by
 * `prefers-color-scheme`, in that order. A user who has chosen a theme in the
 * app must win over their OS setting — otherwise the toggle appears not to
 * work for anyone whose system is set the other way, which reads as a bug.
 */
export function themeCss(): string {
  const fontScale = Object.entries(FONT_SIZE_SCALE)
    .map(([key, value]) => `  --font-sizes-${key}: ${value};`)
    .join("\n");

  return [
    block(":root", LIGHT_THEME),
    `:root {\n${fontScale}\n}`,
    `@media (prefers-color-scheme: dark) {\n${block(
      "  :root:not([data-theme='light'])",
      DARK_THEME,
    )}\n}`,
    block(":root[data-theme='dark']", DARK_THEME),
  ].join("\n\n");
}
