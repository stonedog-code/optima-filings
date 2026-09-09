/**
 * The entity form, shared by create and edit.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * One component on purpose. When the create and edit forms were separate, a
 * field added to one could silently not exist on the other — and the field most
 * likely to be missed is an optional one, which is exactly where "I cannot
 * clear this value" bugs live.
 *
 * ## Built from @stonedogcode/style, not from local classes
 *
 * Fields used to be hand-rolled `labelClass` / `inputClass` markup. Those
 * classes were not bad, but they were a *second* definition of what a field
 * looks like, and two definitions drift. The shared controls also carry things
 * the local markup did not: the app-wide text-size profile, the theme variant,
 * and a checkbox whose label is part of its tap target.
 *
 * The structure changed with them. The old shape wrapped the control inside the
 * label and put the visible text in a `<span>`:
 *
 *     <label className={fieldClass}>
 *       <span className={labelClass}>Name</span>
 *       <input className={inputClass} name="name" />
 *     </label>
 *
 * `StyledFormLabel` renders a real `<label>`, and a label inside a label is
 * invalid, so each field is now an explicit `htmlFor`/`id` pair. That is the
 * better structure anyway: the association is stated rather than implied by
 * nesting, and every control has an `id` that an error message can point at.
 */
import { ENTITY_TYPES } from "@optima-compliance/engine";
import type { StoredEntity } from "@optima-compliance/db";
import {
  StyledFormLabel,
  StyledInputText,
  StyledInputBool,
  StyledInputSelect,
} from "@optima-compliance/ui";
import { css } from "styled-system/css";
import { entityTypeLabel } from "@/lib/format";
import { fieldClass, hintClass, labelClass } from "./action-fields";

/**
 * A tri-state answer back to the select's value.
 *
 * `""` is the unanswered state and it round-trips as itself: an entity nobody
 * has asked must come back into the form still unanswered, or editing any
 * other field would quietly answer this one.
 */
function triStateValue(value: boolean | undefined): string {
  return value === true ? "yes" : value === false ? "no" : "";
}

/** Minor units back to a decimal string for an editable field. */
function toDollars(minorUnits: number | undefined): string {
  return minorUnits === undefined ? "" : (minorUnits / 100).toFixed(2);
}

export function EntityFormFields({ entity }: { entity?: StoredEntity }) {
  return (
    <>
      <div className={fieldClass}>
        <StyledFormLabel htmlFor="entity-name" required>
          Name
        </StyledFormLabel>
        <StyledInputText id="entity-name" name="name" required defaultValue={entity?.name} />
      </div>

      <fieldset className={css({ marginBottom: "4", border: "none", padding: "0" })}>
        {/* A legend, not a StyledFormLabel — it names the group, and a <label>
            here would claim to label a single control. */}
        <legend className={labelClass}>Legal form</legend>
        <p className={hintClass}>
          Pick every form this entity holds. A 501(c)(3) is almost always also a
          nonprofit corporation — state and federal rules key off different ones,
          so selecting both is usually correct.
        </p>
        {ENTITY_TYPES.map((type) => (
          <StyledInputBool
            key={type}
            name="entityTypes"
            value={type}
            defaultChecked={entity?.entityTypes.includes(type)}
            label={entityTypeLabel(type)}
          />
        ))}
      </fieldset>

      <div className={fieldClass}>
        <StyledFormLabel htmlFor="entity-formed-on" required>
          Date formed
        </StyledFormLabel>
        <StyledInputText
          id="entity-formed-on"
          type="date"
          name="formedOn"
          required
          defaultValue={entity?.formedOn}
          aria-describedby="entity-formed-on-hint"
        />
        <span className={hintClass} id="entity-formed-on-hint">
          Most state annual reports are due in the anniversary month of this
          date, so it needs to be right — getting it wrong shifts every state
          deadline for this entity.
        </span>
      </div>

      <div className={fieldClass}>
        <StyledFormLabel htmlFor="entity-home-jurisdiction" required>
          Home jurisdiction
        </StyledFormLabel>
        <StyledInputText
          id="entity-home-jurisdiction"
          name="homeJurisdiction"
          placeholder="US-WA"
          pattern="US-[A-Z]{2}"
          required
          defaultValue={entity?.homeJurisdiction}
          aria-describedby="entity-home-jurisdiction-hint"
        />
        <span className={hintClass} id="entity-home-jurisdiction-hint">
          The state it was formed in, e.g. US-WA.
        </span>
      </div>

      <div className={fieldClass}>
        <StyledFormLabel htmlFor="entity-jurisdictions" required>
          Registered in
        </StyledFormLabel>
        <StyledInputText
          id="entity-jurisdictions"
          name="jurisdictions"
          placeholder="US, US-WA"
          required
          defaultValue={entity?.jurisdictions.join(", ")}
          aria-describedby="entity-jurisdictions-hint"
        />
        <span className={hintClass} id="entity-jurisdictions-hint">
          Comma-separated. Include <code>US</code> for federal filings and every
          state you are registered in — registering in a state is what creates
          the obligation to it.
        </span>
      </div>

      <div className={fieldClass}>
        <StyledFormLabel htmlFor="entity-fiscal-year-end" required>
          Fiscal year ends
        </StyledFormLabel>
        <StyledInputText
          id="entity-fiscal-year-end"
          name="fiscalYearEnd"
          placeholder="12-31"
          pattern="\d{2}-\d{2}"
          defaultValue={entity?.fiscalYearEnd ?? "12-31"}
          required
          aria-describedby="entity-fiscal-year-end-hint"
        />
        <span className={hintClass} id="entity-fiscal-year-end-hint">
          MM-DD. The federal return is due five months after this, so a
          non-calendar year changes the date.
        </span>
      </div>

      <div className={fieldClass}>
        {/* `optional` rather than "(optional)" typed into the label text: it is
            announced as part of the accessible name either way, but this way
            the styling and the wording stay consistent across every form. */}
        <StyledFormLabel htmlFor="entity-gross-revenue" optional>
          Gross annual revenue
        </StyledFormLabel>
        <StyledInputText
          id="entity-gross-revenue"
          type="number"
          name="grossRevenue"
          min="0"
          step="0.01"
          defaultValue={toDollars(entity?.grossRevenueMinorUnits)}
          aria-describedby="entity-gross-revenue-hint"
        />
        <span className={hintClass} id="entity-gross-revenue-hint">
          In dollars. <strong>Leave blank if you do not know</strong> — an
          unknown is reported as “cannot tell yet”, whereas a guess is reported
          as an answer. Clearing this field puts it back to unknown.
        </span>
      </div>

      {/*
        The two prior years, asked for because the federal small-organisation
        test is not a test on one year. "Gross receipts normally $50,000 or
        less" is an average across three, and evaluating the current year alone
        is wrong in BOTH directions — a legacy year pushes a genuinely small
        organisation onto a fuller return, and a lean year after two large ones
        qualifies one for a return it may not file.

        Optional in the strong sense, and the hint says so: a new organisation
        has no prior years and never will, so blank is a real answer and not a
        gap to nag about.
      */}
      <div className={fieldClass}>
        <StyledFormLabel htmlFor="entity-gross-revenue-prior-1" optional>
          Gross revenue, previous year
        </StyledFormLabel>
        <StyledInputText
          id="entity-gross-revenue-prior-1"
          type="number"
          name="grossRevenuePriorYear1"
          min="0"
          step="0.01"
          defaultValue={toDollars(entity?.grossRevenuePriorYear1MinorUnits)}
          aria-describedby="entity-gross-revenue-prior-1-hint"
        />
        <span className={hintClass} id="entity-gross-revenue-prior-1-hint">
          The year before the figure above. Whether you may file the 990-N
          e-Postcard turns on an <strong>average of three years</strong>, not on
          one, so filling these in changes the answer for an organisation that
          had one unusual year. Leave blank if the organisation is too new, or
          if you do not have the figure.
        </span>
      </div>

      <div className={fieldClass}>
        <StyledFormLabel htmlFor="entity-gross-revenue-prior-2" optional>
          Gross revenue, two years before
        </StyledFormLabel>
        <StyledInputText
          id="entity-gross-revenue-prior-2"
          type="number"
          name="grossRevenuePriorYear2"
          min="0"
          step="0.01"
          defaultValue={toDollars(entity?.grossRevenuePriorYear2MinorUnits)}
          aria-describedby="entity-gross-revenue-prior-2-hint"
        />
        <span className={hintClass} id="entity-gross-revenue-prior-2-hint">
          Only used alongside the year above it.
        </span>
      </div>

      <div className={fieldClass}>
        <StyledFormLabel htmlFor="entity-total-assets" optional>
          Total assets
        </StyledFormLabel>
        <StyledInputText
          id="entity-total-assets"
          type="number"
          name="totalAssets"
          min="0"
          step="0.01"
          defaultValue={toDollars(entity?.totalAssetsMinorUnits)}
        />
      </div>

      <div className={fieldClass}>
        <StyledFormLabel htmlFor="entity-contributions-raised" optional>
          Contributions raised
        </StyledFormLabel>
        <StyledInputText
          id="entity-contributions-raised"
          type="number"
          name="contributionsRaised"
          min="0"
          step="0.01"
          defaultValue={toDollars(entity?.contributionsRaisedMinorUnits)}
          aria-describedby="entity-contributions-raised-hint"
        />
        <span className={hintClass} id="entity-contributions-raised-hint">
          Money you raised by <strong>asking</strong> — gifts, donations, grants
          and pledges — before deducting what it cost to raise. <strong>Not the
          same as gross revenue</strong>: ticket sales, tuition, fees, contracts
          and investment income are revenue you earned, not money you raised.
          Washington exempts a charity raising under $50,000 a year from
          registration, but only if it also runs entirely on volunteers.
        </span>
      </div>

      <div className={fieldClass}>
        <StyledFormLabel htmlFor="entity-charitable-assets" optional>
          Charitable assets
        </StyledFormLabel>
        <StyledInputText
          id="entity-charitable-assets"
          type="number"
          name="charitableAssets"
          min="0"
          step="0.01"
          defaultValue={toDollars(entity?.charitableAssetsMinorUnits)}
          aria-describedby="entity-charitable-assets-hint"
        />
        <span className={hintClass} id="entity-charitable-assets-hint">
          The portion held for charitable purposes — <strong>not the same as
          total assets</strong>. Several states require charity registration
          above a threshold on this figure alone, even for an organisation that
          never asks the public for money.
        </span>
      </div>

      <div className={fieldClass}>
        <StyledFormLabel htmlFor="entity-income-producing-charitable-assets" optional>
          Charitable assets invested for income
        </StyledFormLabel>
        <StyledInputText
          id="entity-income-producing-charitable-assets"
          type="number"
          name="incomeProducingCharitableAssets"
          min="0"
          step="0.01"
          defaultValue={toDollars(entity?.incomeProducingCharitableAssetsMinorUnits)}
          aria-describedby="entity-income-producing-charitable-assets-hint"
        />
        <span
          className={hintClass}
          id="entity-income-producing-charitable-assets-hint"
        >
          The part of the figure above that is <strong>invested to produce
          income</strong> — an endowment, a reserve, a portfolio, property held
          as an investment. Property in direct charitable use does not count,
          however valuable: a museum's collection, a food bank's warehouse, land
          held under a conservation easement. Washington's charitable-trust
          registration turns on this narrower figure, so an organisation whose
          assets are all in program use may owe nothing here.
        </span>
      </div>

      <div className={fieldClass}>
        {/*
          A select, not a checkbox, and not because a dropdown looks better.
          A checkbox has two states and this question has three: yes, no, and
          nobody has been asked. An unticked box posts nothing, so an entity
          created before the question existed would arrive as a firm "not a
          foundation" — and a private foundation read that way is told to file
          the 990-N e-Postcard, which it may never file at any income level.
          The unanswered state has to survive the form, so it needs a value of
          its own.
        */}
        <StyledFormLabel htmlFor="entity-private-foundation" optional>
          Private foundation
        </StyledFormLabel>
        <StyledInputSelect
          id="entity-private-foundation"
          name="isPrivateFoundation"
          defaultValue={triStateValue(entity?.isPrivateFoundation)}
          aria-describedby="entity-private-foundation-hint"
          options={[
            { value: "", label: "I do not know yet" },
            { value: "no", label: "No — a public charity" },
            { value: "yes", label: "Yes — a private foundation" },
          ]}
        />
        <span className={hintClass} id="entity-private-foundation-hint">
          For 501(c)(3) organisations. Which federal return you file turns on
          this: a private foundation files <strong>Form 990-PF</strong> whatever
          its income, and cannot use the 990-N e-Postcard or Form 990.{" "}
          <strong>Leave it blank if you do not know</strong> — the 990 family is
          then reported as “cannot tell yet” rather than being decided for you.
        </span>
      </div>

      <div className={fieldClass}>
        {/*
          A select for the same reason the question above it is one: three
          states, and the unanswered one has to survive the form. A supporting
          organisation may not file the 990-N e-Postcard at any size, so an
          unticked box arriving as a firm "no" is the under-filing this
          question exists to remove.
        */}
        <StyledFormLabel htmlFor="entity-supporting-organization" optional>
          Supporting organisation
        </StyledFormLabel>
        <StyledInputSelect
          id="entity-supporting-organization"
          name="isSupportingOrganization"
          defaultValue={triStateValue(entity?.isSupportingOrganization)}
          aria-describedby="entity-supporting-organization-hint"
          options={[
            { value: "", label: "I do not know yet" },
            { value: "no", label: "No" },
            { value: "yes", label: "Yes — a 509(a)(3) supporting organisation" },
          ]}
        />
        <span className={hintClass} id="entity-supporting-organization-hint">
          A 509(a)(3) supporting organisation exists to support another public
          charity. It files <strong>Form 990 or Form 990-EZ</strong> however
          small it is, and cannot use the 990-N e-Postcard.{" "}
          <strong>Leave it blank if you do not know</strong> — the 990 family is
          then reported as “cannot tell yet” rather than being decided for you.
        </span>
      </div>

      <div className={fieldClass}>
        {/*
          A select rather than a checkbox, and here BOTH readings of an unticked
          box are wrong rather than one. Read as "no", every organisation that
          predates this question is denied the Washington volunteer exemption
          and told to register - the over-filing the question exists to remove.
          Read as "yes", every one of them is granted it - under-filing. The
          unanswered state has to survive the form.
        */}
        <StyledFormLabel htmlFor="entity-all-fundraising-unpaid" optional>
          Run entirely by volunteers
        </StyledFormLabel>
        <StyledInputSelect
          id="entity-all-fundraising-unpaid"
          name="allFundraisingUnpaid"
          defaultValue={triStateValue(entity?.allFundraisingUnpaid)}
          aria-describedby="entity-all-fundraising-unpaid-hint"
          options={[
            { value: "", label: "I do not know yet" },
            { value: "no", label: "No — somebody is paid" },
            { value: "yes", label: "Yes — everyone is unpaid" },
          ]}
        />
        <span className={hintClass} id="entity-all-fundraising-unpaid-hint">
          <strong>All</strong> the organisation's work, not only its
          fundraising. One paid part-time bookkeeper is enough for this to be
          “no”, even if every dollar is raised by volunteers. Reimbursing a
          volunteer's expenses is not pay. Washington exempts a charity from
          registration only when this and the contributions figure above{" "}
          <em>both</em> qualify.
        </span>
      </div>

      <div className={fieldClass}>
        <StyledFormLabel htmlFor="entity-inurement" optional>
          Payments to officers, directors, members or trustees
        </StyledFormLabel>
        <StyledInputSelect
          id="entity-inurement"
          name="assetsOrIncomeInureToInsiders"
          defaultValue={triStateValue(entity?.assetsOrIncomeInureToInsiders)}
          aria-describedby="entity-inurement-hint"
          options={[
            { value: "", label: "I do not know yet" },
            { value: "no", label: "No" },
            { value: "yes", label: "Yes — some goes to an insider" },
          ]}
        />
        <span className={hintClass} id="entity-inurement-hint">
          Whether any of the organisation's money or property goes to an
          officer, director, member or trustee. A payment made to someone{" "}
          <strong>on the same terms as everyone else the charity helps</strong>{" "}
          does not count — a trustee's child winning a scholarship on the open
          criteria is not this. Only asked because Washington's exemption for
          small volunteer-run charities requires it; it has no effect unless the
          other two answers already place you inside that exemption.
        </span>
      </div>

      <div className={css({ marginBottom: "6" })}>
        <StyledInputBool
          name="solicits"
          value="true"
          defaultChecked={entity?.solicitsCharitableContributions === true}
          label="This organisation solicits charitable contributions"
          aria-describedby="entity-solicits-hint"
        />
        <span className={hintClass} id="entity-solicits-hint">
          Charity registration is a separate obligation from the corporate
          annual report, and it is the one most often missed.
        </span>
      </div>
    </>
  );
}
