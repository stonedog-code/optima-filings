/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import Link from "next/link";
import { css } from "styled-system/css";
import { getStore } from "@/lib/server";
import { createStandaloneAction } from "../actions";
import {
  ActionSuggestions,
  fieldClass,
  hintClass,
} from "@/components/action-fields";
import {
  StyledFormLabel,
  StyledInputText,
  StyledInputTextArea,
  StyledInputBool,
  StyledInputSelect,
} from "@optima-compliance/ui";
import { Disclaimer } from "@/components/disclaimer";

export const dynamic = "force-dynamic";

export default async function NewActionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; documentId?: string }>;
}) {
  const { error, documentId } = await searchParams;
  const store = getStore();
  const entities = store.list();
  const document = documentId ? store.documents.getDocument(documentId) : undefined;

  return (
    <main className={css({ maxWidth: "3xl", margin: "0 auto", padding: "6" })}>
      <h1 className={css({ fontSize: "2xl" })}>Add an action</h1>
      <p className={css({ color: "boxTextSecondary" })}>
        Anything you need to do by a date. Use this for whatever the rules do not
        cover — or for everything, if you would rather keep your own dates.
      </p>

      {error && (
        <p role="alert" style={{ color: "var(--optima-text-error-text)" }}>
          {error}
        </p>
      )}

      <form action={createStandaloneAction}>
        {document && <input type="hidden" name="documentId" value={document.id} />}
        {document && (
          <p className={hintClass}>
            Attached to <strong>{document.title}</strong>.
          </p>
        )}

        <div className={fieldClass}>
          <StyledFormLabel htmlFor="action-title" required>
            What needs doing
          </StyledFormLabel>
          <StyledInputText
            id="action-title"
            name="title"
            list="action-suggestions"
            placeholder="File an annual report"
            required
            autoFocus
            aria-describedby="action-title-hint"
          />
          <ActionSuggestions />
          <span className={hintClass} id="action-title-hint">
            Suggestions are a starting point — type anything.
          </span>
        </div>

        <div className={fieldClass}>
          <StyledFormLabel htmlFor="action-due-on" required>
            Due by
          </StyledFormLabel>
          <StyledInputText id="action-due-on" type="date" name="dueOn" required />
        </div>

        <div className={css({ marginBottom: "4" })}>
          <StyledInputBool
            name="repeatAnnually"
            value="true"
            label="Repeats every year"
            aria-describedby="action-repeat-hint"
          />
          <span className={hintClass} id="action-repeat-hint">
            Most compliance filings do. When you mark this done, next year's is
            created for you with the same notes.
          </span>
        </div>

        <div className={fieldClass}>
          <StyledFormLabel htmlFor="action-detail" optional>
            Notes
          </StyledFormLabel>
          <StyledInputTextArea
            id="action-detail"
            name="detail"
            rows={3}
            aria-describedby="action-detail-hint"
          />
          <span className={hintClass} id="action-detail-hint">
            Where to file, a login, a reference number — whatever you will want in
            front of you on the day.
          </span>
        </div>

        {entities.length > 0 && (
          <div className={fieldClass}>
            <StyledFormLabel htmlFor="action-entity" optional>
              Entity
            </StyledFormLabel>
            <StyledInputSelect
              id="action-entity"
              name="entityId"
              defaultValue=""
              placeholder="Not tied to an entity"
              options={entities.map((entity) => ({
                value: entity.id,
                label: entity.name,
              }))}
            />
          </div>
        )}

        <button
          type="submit"
          className={css({
            padding: "3",
            paddingInline: "5",
            borderRadius: "sm",
            border: "none",
            fontSize: "md",
            cursor: "pointer",
            minHeight: "44px",
          })}
          style={{
            background: "var(--optima-button-primary-bg)",
            color: "var(--optima-button-primary-text)",
          }}
        >
          Add action
        </button>{" "}
        <Link href="/">Cancel</Link>
      </form>
      <Disclaimer />
    </main>
  );
}
