/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { css } from "styled-system/css";

/**
 * Starting points, not a fixed list.
 *
 * The whole reason this feature exists is to cover what the rules engine does
 * not, so a closed dropdown would defeat it. These are datalist suggestions:
 * they save typing for the common cases and are freely overwritten.
 *
 * Later these can carry links to the agency's filing page — which is why the
 * list lives in one place rather than being inlined in the form.
 */
export const ACTION_SUGGESTIONS = [
  "File an annual report",
  "Renew charity registration",
  "File Form 990",
  "Renew business licence",
  "Pay franchise tax",
  "Update registered agent",
  "Hold annual board meeting",
  "Renew city business licence",
] as const;

export const fieldClass = css({ marginBottom: "4", display: "block" });
export const labelClass = css({ display: "block", fontWeight: "600", marginBottom: "1" });
export const inputClass = css({
  width: "full",
  padding: "2",
  borderRadius: "sm",
  border: "1px solid",
  borderColor: "boxBorderSecondary",
  fontSize: "md",
});
export const hintClass = css({ fontSize: "sm", color: "boxTextSecondary", marginTop: "1" });

export function ActionSuggestions() {
  return (
    <datalist id="action-suggestions">
      {ACTION_SUGGESTIONS.map((suggestion) => (
        <option key={suggestion} value={suggestion} />
      ))}
    </datalist>
  );
}
