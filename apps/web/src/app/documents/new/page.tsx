/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import Link from "next/link";
import { css } from "styled-system/css";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_INFO } from "@optima-compliance/engine";
import { getStore } from "@/lib/server";
import { uploadDocument } from "./actions";
import { MAX_UPLOAD_BYTES } from "@/lib/files";
import {
  ActionSuggestions,
  fieldClass,
  hintClass,
  inputClass,
  labelClass,
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

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const entities = getStore().list();

  return (
    <main className={css({ maxWidth: "3xl", margin: "0 auto", padding: "6" })}>
      <h1 className={css({ fontSize: "2xl" })}>Upload a document</h1>

      {error && (
        <p role="alert" style={{ color: "var(--optima-text-error-text)" }}>
          {error}
        </p>
      )}

      <form action={uploadDocument}>
        {/*
          Type first, before the file — PRD-0002 §4. It governs whether a
          document date is wanted, and asking after the file is chosen means
          changing the form under the person filling it in.

          No default selection. Defaulting to "Other" would make it the most
          common value by accident, and defaulting to Meeting Minutes would
          mislabel whatever someone uploads without reading.
        */}
        <div className={fieldClass}>
          <StyledFormLabel htmlFor="doc-type" required>
            Kind of document
          </StyledFormLabel>
          <StyledInputSelect
            id="doc-type"
            name="type"
            defaultValue=""
            placeholder="Choose a kind…"
            required
            aria-describedby="doc-type-hint"
            options={DOCUMENT_TYPES.map((value) => ({
              value,
              label: DOCUMENT_TYPE_INFO[value].label,
            }))}
          />
          <span className={hintClass} id="doc-type-hint">
            This is what lets you filter your paperwork later.{" "}
            {DOCUMENT_TYPE_INFO.OTHER.label} is fine if nothing fits.
          </span>
        </div>

        {/*
          Always rendered, never revealed by JavaScript. The self-hosted tier
          cannot assume JS, and a required field that only appears when a script
          runs is a form that silently cannot be submitted. The hint carries the
          conditionality instead; the server enforces it.
        */}
        <div className={fieldClass}>
          <StyledFormLabel htmlFor="doc-date" optional>
            Date on the document
          </StyledFormLabel>
          <input
            id="doc-date"
            className={inputClass}
            type="date"
            name="documentDate"
            aria-describedby="doc-date-hint"
          />
          <span className={hintClass} id="doc-date-hint">
            The date the document itself carries — the day of the meeting, the
            date of the letter — not today. Required for{" "}
            {DOCUMENT_TYPES.filter((t) => DOCUMENT_TYPE_INFO[t].hasDocumentDate)
              .map((t) => DOCUMENT_TYPE_INFO[t].label)
              .join(", ")}
            , which are listed in date order.
          </span>
        </div>

        <div className={fieldClass}>
          <StyledFormLabel htmlFor="doc-file" required>
            File
          </StyledFormLabel>
          {/* A native file input, deliberately. @stonedogcode/style has no file
              control, and styling one to look like a text field is how you get
              a picker that does not behave like either. */}
          <input
            id="doc-file"
            className={inputClass}
            type="file"
            name="file"
            required
            aria-describedby="doc-file-hint"
          />
          <span className={hintClass} id="doc-file-hint">
            PDF, image, plain text, or Word document, up to{" "}
            {MAX_UPLOAD_BYTES / 1024 / 1024} MB.
          </span>
        </div>

        <div className={fieldClass}>
          <StyledFormLabel htmlFor="doc-title">Title</StyledFormLabel>
          <StyledInputText
            id="doc-title"
            name="title"
            placeholder="WA SOS formation letter"
            aria-describedby="doc-title-hint"
          />
          <span className={hintClass} id="doc-title-hint">Defaults to the filename.</span>
        </div>

        {entities.length > 0 && (
          <div className={fieldClass}>
            <StyledFormLabel htmlFor="doc-entity" optional>
              Entity
            </StyledFormLabel>
            <StyledInputSelect
              id="doc-entity"
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

        <div className={fieldClass}>
          <StyledFormLabel htmlFor="doc-fields" optional>
            Reference numbers
          </StyledFormLabel>
          <StyledInputTextArea
            id="doc-fields"
            name="fields"
            rows={4}
            placeholder={"UBI number: 604 123 456\nEIN: 91-1234567\nDUNS: 123456789"}
            aria-describedby="doc-fields-hint"
          />
          <span className={hintClass} id="doc-fields-hint">
            One per line, as <code>Label: value</code>. This is what makes a
            number findable later without opening the file — copy them straight
            off the letter.
          </span>
        </div>

        <div className={fieldClass}>
          <StyledFormLabel htmlFor="doc-notes" optional>
            Notes
          </StyledFormLabel>
          <StyledInputTextArea id="doc-notes" name="notes" rows={2} />
        </div>

        <fieldset
          className={css({
            border: "1px solid",
            borderColor: "boxBorderPrimary",
            borderRadius: "md",
            padding: "4",
            marginBottom: "4",
          })}
        >
          <legend className={labelClass}>Does this need an action? (optional)</legend>
          <p className={hintClass}>
            Leave blank to just file the document away. Storing something so you
            can find it later is a perfectly good reason to upload it.
          </p>

          <div className={fieldClass}>
            <StyledFormLabel htmlFor="doc-action-title">What needs doing</StyledFormLabel>
            <StyledInputText
              id="doc-action-title"
              name="actionTitle"
              list="action-suggestions"
              placeholder="File an annual report"
            />
            <ActionSuggestions />
          </div>

          <div className={fieldClass}>
            <StyledFormLabel htmlFor="doc-action-due-on">Due by</StyledFormLabel>
            <StyledInputText id="doc-action-due-on" type="date" name="dueOn" />
          </div>

          <div className={css({ marginBottom: "3" })}>
            <StyledInputBool
              name="repeatAnnually"
              value="true"
              label="Repeats every year"
            />
          </div>

          <div>
            <StyledFormLabel htmlFor="doc-action-detail" optional>
              Notes for the action
            </StyledFormLabel>
            <StyledInputTextArea id="doc-action-detail" name="actionDetail" rows={2} />
          </div>
        </fieldset>

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
          Upload
        </button>{" "}
        <Link href="/documents">Cancel</Link>
      </form>
      <Disclaimer />
    </main>
  );
}
