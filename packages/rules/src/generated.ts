/**
 * GENERATED — do not hand-edit. Run `npm run rules:barrel`.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Rule } from "@optima-compliance/engine";

export const ALL_RULES: readonly Rule[] = [
  // us/de/corporation-annual-report.json
  {
    "id": "us-de-corporation-annual-report",
    "jurisdiction": "US-DE",
    "title": "Corporation Annual Report and Franchise Tax",
    "agency": "Delaware Division of Corporations",
    "entityTypes": [
      "s-corp",
      "c-corp",
      "b-corp"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "calendar",
      "month": 3,
      "day": 1
    },
    "citation": "8 Del. C. 502",
    "citationUrl": "https://delcode.delaware.gov/title8/c001/sc15/index.html",
    "agencyUrl": "https://corp.delaware.gov/paytaxes/",
    "lastVerified": "2026-08-01",
    "status": "active",
    "effectiveFrom": "2020-01-01",
    "notes": "DUE DATE VERIFIED 2026-08-05, 8 Del. C. 502(a) VERBATIM: \"Annually on or before March 1, every corporation now existing or hereafter incorporated under Chapter 1 of this title ... shall make an annual franchise tax report to the Secretary of State.\" The fixed 1 March calendar date is right. FEE IS THE REPORT FEE ONLY, AND ITS SOURCE WAS NOT FOUND — 8 Del. C. 502 sets the deadline but no filing fee, and the fee section was not located in the chapter read. The $50 here is unverified. THE REAL COST IS THE FRANCHISE TAX, AND IT DWARFS THIS. 8 Del. C. 503 VERBATIM: the tax is \"more than $200,000 nor less than $175\" by the authorised-shares method, or \"more than $200,000 nor less than $400\" by assumed-par-value. So the MINIMUM real cost is at least 3.5x the figure shown and the maximum is 4000x it. The schema has no way to express a computed fee, and presenting $50 as the total would badly understate what a corporation actually owes. Do not promote until either the schema supports computed fees or the UI surfaces these notes. 502(c) also imposes a $200 penalty for a late report. PROMOTED TO ACTIVE 2026-08-08 by owner decision: the initial set is approved as-is, and confirmation will be required for new rules and for updates from here on. FEE REMOVED on promotion: the $50 recorded here was the report fee only and its source was never found, while 8 Del. C. 503 sets the franchise tax at a $175/$400 minimum and a $200,000 maximum — so the figure understated the real cost by 3.5x to 4000x. An absent fee sends a filer to the agency's own page; a wrong one sends them to the wrong bank. Restore a fee only when the schema can express a computed one."
  },
  // us/de/llc-annual-tax.json
  {
    "id": "us-de-llc-annual-tax",
    "jurisdiction": "US-DE",
    "title": "Limited Liability Company Annual Tax",
    "agency": "Delaware Division of Corporations",
    "entityTypes": [
      "llc"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "calendar",
      "month": 6,
      "day": 1
    },
    "fee": {
      "amountMinorUnits": 40000,
      "currency": "USD"
    },
    "citation": "6 Del. C. 18-1107",
    "citationUrl": "https://delcode.delaware.gov/title6/c018/sc11/index.html",
    "agencyUrl": "https://corp.delaware.gov/paytaxes/",
    "lastVerified": "2026-08-01",
    "status": "active",
    "effectiveFrom": "2020-01-01",
    "notes": "AMOUNT CORRECTED 2026-08-05: was $300, now $400. The previous note asked for exactly this check and it was right to. 6 Del. C. 18-1107(b), VERBATIM: \"Every domestic limited liability company and every foreign limited liability company registered to do business in the State of Delaware shall pay an annual tax, for the use of the State of Delaware, in the amount of $400.\" Read twice from delcode.delaware.gov to be sure. DUE DATE VERIFIED: \"The annual tax for a domestic limited liability company shall be due and payable on the first day of June following the close of the calendar year\" — a fixed calendar date, which is what this rule already encodes. NO ANNUAL REPORT VERIFIED: 18-1107 requires the tax only; Delaware LLCs file no annual report. Unpaid tax accrues interest at 1.5% per month, which the schema has no way to express. PROMOTED TO ACTIVE 2026-08-08 by owner decision: the initial set is approved as-is, and confirmation will be required for new rules and for updates from here on."
  },
  // us/federal/form-990.json
  {
    "id": "us-federal-form-990",
    "jurisdiction": "US",
    "title": "Form 990 — Return of Organization Exempt From Income Tax",
    "agency": "Internal Revenue Service",
    "entityTypes": [
      "501c3"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "fiscal-year-end",
      "offsetMonths": 5,
      "dayOfMonth": 15
    },
    "form": "990",
    "conditions": [
      {
        "anyOf": [
          {
            "fact": "grossRevenueMinorUnits",
            "op": "gte",
            "value": 20000000
          },
          {
            "fact": "totalAssetsMinorUnits",
            "op": "gte",
            "value": 50000000
          }
        ]
      }
    ],
    "citation": "26 U.S.C. 6033; IRS Instructions for Form 990",
    "citationUrl": "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section6033",
    "agencyUrl": "https://www.irs.gov/forms-pubs/about-form-990",
    "lastVerified": "2026-08-01",
    "status": "active",
    "effectiveFrom": "2020-01-01",
    "notes": "DUE DATE VERIFIED 2026-08-05 against irs.gov: the annual return is due the 15th day of the 5th month after the tax year ends — 15 May for a calendar-year filer, which this cadence produces. WEEKEND RULE ADDED: the IRS states \"If a due date falls on a Saturday, Sunday, or legal holiday, the due date is delayed until the next business day.\" This is opted into explicitly because the agency says it, not assumed. It matters concretely: 15 May 2027 is a Saturday, so without it a calendar-year filer is shown a date two days before the real deadline. Federal legal holidays are not modelled, so a deadline landing on one is still off. THRESHOLDS VERIFIED, verbatim from the IRS filing-thresholds table: \"Gross receipts >= $200,000, or Total assets >= $500,000\". The anyOf and both gte operators match exactly. CITATION URL RETARGETED 2026-08-05: it pointed at the same IRS page as agencyUrl, which made the two fields one field wearing two names. The citation is 26 U.S.C. 6033, so it now links the STATUTE (uscode.house.gov, official) while agencyUrl keeps the IRS page a filer actually uses. The distinction matters most here: the IRS page is where the current thresholds live, and the statute is what a reviewer checks the rule against. PROMOTED TO ACTIVE 2026-08-08 by owner decision: the initial set is approved as-is, and confirmation will be required for new rules and for updates from here on. HOLIDAY CALENDAR ADDED 2026-08-14 (NEH-443): this rule already quoted the IRS in full — \"if a due date falls on a Saturday, Sunday, or legal holiday, the due date is delayed until the next business day\" — while implementing only two thirds of it. `holidayCalendar: us-federal` applies the eleven federal holidays of 5 U.S.C. 6103(a), including the weekend-observance shift, so a deadline landing on one now moves. The calendar is computed from the year, not listed, so there is nothing to drift. Federal only: state holidays are not modelled anywhere in this pack.",
    "weekendRule": "roll-forward",
    "holidayCalendar": "us-federal"
  },
  // us/federal/form-990-ez.json
  {
    "id": "us-federal-form-990-ez",
    "jurisdiction": "US",
    "title": "Form 990-EZ — Short Form Return of Organization Exempt From Income Tax",
    "agency": "Internal Revenue Service",
    "entityTypes": [
      "501c3"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "fiscal-year-end",
      "offsetMonths": 5,
      "dayOfMonth": 15
    },
    "form": "990-EZ",
    "conditions": [
      {
        "fact": "grossRevenueMinorUnits",
        "op": "gt",
        "value": 5000000
      },
      {
        "fact": "grossRevenueMinorUnits",
        "op": "lt",
        "value": 20000000
      },
      {
        "fact": "totalAssetsMinorUnits",
        "op": "lt",
        "value": 50000000
      }
    ],
    "citation": "26 U.S.C. 6033; IRS Instructions for Form 990-EZ",
    "citationUrl": "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section6033",
    "agencyUrl": "https://www.irs.gov/forms-pubs/about-form-990-ez",
    "lastVerified": "2026-08-01",
    "status": "active",
    "effectiveFrom": "2020-01-01",
    "notes": "DUE DATE VERIFIED 2026-08-05 against irs.gov: the annual return is due the 15th day of the 5th month after the tax year ends — 15 May for a calendar-year filer, which this cadence produces. WEEKEND RULE ADDED: the IRS states \"If a due date falls on a Saturday, Sunday, or legal holiday, the due date is delayed until the next business day.\" This is opted into explicitly because the agency says it, not assumed. It matters concretely: 15 May 2027 is a Saturday, so without it a calendar-year filer is shown a date two days before the real deadline. Federal legal holidays are not modelled, so a deadline landing on one is still off. THRESHOLDS VERIFIED: the IRS states \"Gross receipts < $200,000, and Total assets < $500,000\", which the upper bounds match. The >$50,000 LOWER bound is this pack's own modelling choice, not an IRS rule — the IRS lets a small organisation ELECT to file 990-EZ instead of 990-N. It is there so 990-N and 990-EZ are mutually exclusive and a small charity is not told it owes both. Deliberate; revisit only with the election in mind. CITATION URL RETARGETED 2026-08-05: it pointed at the same IRS page as agencyUrl, which made the two fields one field wearing two names. The citation is 26 U.S.C. 6033, so it now links the STATUTE (uscode.house.gov, official) while agencyUrl keeps the IRS page a filer actually uses. The distinction matters most here: the IRS page is where the current thresholds live, and the statute is what a reviewer checks the rule against. PROMOTED TO ACTIVE 2026-08-08 by owner decision: the initial set is approved as-is, and confirmation will be required for new rules and for updates from here on. HOLIDAY CALENDAR ADDED 2026-08-14 (NEH-443): this rule already quoted the IRS in full — \"if a due date falls on a Saturday, Sunday, or legal holiday, the due date is delayed until the next business day\" — while implementing only two thirds of it. `holidayCalendar: us-federal` applies the eleven federal holidays of 5 U.S.C. 6103(a), including the weekend-observance shift, so a deadline landing on one now moves. The calendar is computed from the year, not listed, so there is nothing to drift. Federal only: state holidays are not modelled anywhere in this pack.",
    "weekendRule": "roll-forward",
    "holidayCalendar": "us-federal"
  },
  // us/federal/form-990-n.json
  {
    "id": "us-federal-form-990-n",
    "jurisdiction": "US",
    "title": "Form 990-N (e-Postcard)",
    "agency": "Internal Revenue Service",
    "entityTypes": [
      "501c3"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "fiscal-year-end",
      "offsetMonths": 5,
      "dayOfMonth": 15
    },
    "form": "990-N",
    "conditions": [
      {
        "fact": "grossRevenueMinorUnits",
        "op": "lte",
        "value": 5000000
      },
      {
        "fact": "totalAssetsMinorUnits",
        "op": "lt",
        "value": 50000000
      }
    ],
    "citation": "26 U.S.C. 6033(i); IRS Annual Electronic Filing Requirement for Small Exempt Organizations",
    "citationUrl": "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section6033",
    "agencyUrl": "https://www.irs.gov/charities-non-profits/annual-electronic-filing-requirement-for-small-exempt-organizations-form-990-n-e-postcard",
    "lastVerified": "2026-08-01",
    "status": "active",
    "effectiveFrom": "2020-01-01",
    "notes": "DUE DATE VERIFIED 2026-08-05 against irs.gov: the annual return is due the 15th day of the 5th month after the tax year ends — 15 May for a calendar-year filer, which this cadence produces. WEEKEND RULE ADDED: the IRS states \"If a due date falls on a Saturday, Sunday, or legal holiday, the due date is delayed until the next business day.\" This is opted into explicitly because the agency says it, not assumed. It matters concretely: 15 May 2027 is a Saturday, so without it a calendar-year filer is shown a date two days before the real deadline. Federal legal holidays are not modelled, so a deadline landing on one is still off. THRESHOLD VERIFIED, verbatim from the IRS: \"Gross receipts normally <= $50,000\". Note \"normally\" — the IRS applies an averaging test across years that this pack evaluates as a single-year figure, so an organisation just over the line in one year may still qualify. Failing to file for three consecutive years revokes exempt status automatically — the single most consequential missed deadline for a small nonprofit, and worth surfacing prominently in any UI. CITATION URL RETARGETED 2026-08-05: it pointed at the same IRS page as agencyUrl, which made the two fields one field wearing two names. The citation is 26 U.S.C. 6033, so it now links the STATUTE (uscode.house.gov, official) while agencyUrl keeps the IRS page a filer actually uses. The distinction matters most here: the IRS page is where the current thresholds live, and the statute is what a reviewer checks the rule against. PROMOTED TO ACTIVE 2026-08-08 by owner decision: the initial set is approved as-is, and confirmation will be required for new rules and for updates from here on. ASSETS CEILING ADDED 2026-08-14 (NEH-410) AND IT IS THIS PACK'S MODELLING CHOICE, NOT AN IRS RULE. The IRS gross-receipts test for 990-N states no assets ceiling, and Form 990's own row states an assets test with no receipts floor, so the published thresholds table does not resolve an organisation that is low on receipts and high on assets: a $30,000-receipts, $9,000,000-assets charity satisfied BOTH rows and was told to file two annual returns. An organisation files one. The ceiling mirrors exactly what form-990-ez.json already carries for the same reason and records as the same kind of choice. The direction is deliberate: it pushes such an organisation to the FULLER return, because under-filing is the worse error for a compliance product to make on a customer's behalf. THE IRS INSTRUCTIONS HAVE NOT BEEN READ for this, and lastVerified is deliberately NOT bumped. Rule verification is deferred by owner direction of 2026-08-08 until the platform is usable; this change makes the pack self-consistent and is expected to be checked against the Form 990 instructions in that later pass. HOLIDAY CALENDAR ADDED 2026-08-14 (NEH-443): this rule already quoted the IRS in full — \"if a due date falls on a Saturday, Sunday, or legal holiday, the due date is delayed until the next business day\" — while implementing only two thirds of it. `holidayCalendar: us-federal` applies the eleven federal holidays of 5 U.S.C. 6103(a), including the weekend-observance shift, so a deadline landing on one now moves. The calendar is computed from the year, not listed, so there is nothing to drift. Federal only: state holidays are not modelled anywhere in this pack.",
    "weekendRule": "roll-forward",
    "holidayCalendar": "us-federal"
  },
  // us/or/corporation-annual-report.json
  {
    "id": "us-or-sos-corporation-annual-report",
    "jurisdiction": "US-OR",
    "title": "Business Corporation Annual Report",
    "agency": "Oregon Secretary of State, Corporation Division",
    "entityTypes": [
      "s-corp",
      "c-corp",
      "b-corp"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "formation-anniversary"
    },
    "fee": {
      "amountMinorUnits": 10000,
      "currency": "USD"
    },
    "citation": "ORS 60.787",
    "citationUrl": "https://www.oregonlegislature.gov/bills_laws/ors/ors060.html",
    "agencyUrl": "https://sos.oregon.gov/business/Pages/obr-annual-report-renewal.aspx",
    "lastVerified": "2026-08-01",
    "status": "active",
    "effectiveFrom": "2020-01-01",
    "notes": "DEADLINE FIXED 2026-08-05 (NEH-400). This rule used anchor \"formation-month\" with dayOfMonth \"last\" — the end of the anniversary month — and was therefore up to 30 days LATE, the direction that costs a customer a penalty. ORS 60.787(1) VERBATIM: the report is due \"by the corporation's anniversary\", which is the anniversary DATE. Oregon's SOS says the same: \"Your renewal is due on the anniversary date of the original filing.\" Now anchor \"formation-anniversary\", which takes the month and day from the entity. Leap days need no special case: 29 February clamps to the 28th in a common year, which is what ORS 65.001 defines the anniversary to be. FEE VERIFIED 2026-08-05: $100 — read directly from the SOS Business Registry Fee Schedule PDF, \"DOMESTIC CORPORATIONS > Business/Professional > Renewal (Annually) $100.00\". STILL DRAFT: the deadline and fee are now checked, but promotion to active means a PERSON has read the statute. See docs/rule-verification/. PROMOTED TO ACTIVE 2026-08-08 by owner decision: the initial set is approved as-is, and confirmation will be required for new rules and for updates from here on."
  },
  // us/or/llc-annual-report.json
  {
    "id": "us-or-sos-llc-annual-report",
    "jurisdiction": "US-OR",
    "title": "Limited Liability Company Annual Report",
    "agency": "Oregon Secretary of State, Corporation Division",
    "entityTypes": [
      "llc"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "formation-anniversary"
    },
    "fee": {
      "amountMinorUnits": 10000,
      "currency": "USD"
    },
    "citation": "ORS 63.787",
    "citationUrl": "https://www.oregonlegislature.gov/bills_laws/ors/ors063.html",
    "agencyUrl": "https://sos.oregon.gov/business/Pages/obr-annual-report-renewal.aspx",
    "lastVerified": "2026-08-01",
    "status": "active",
    "effectiveFrom": "2020-01-01",
    "notes": "DEADLINE FIXED 2026-08-05 (NEH-400). This rule used anchor \"formation-month\" with dayOfMonth \"last\" — the end of the anniversary month — and was therefore up to 30 days LATE, the direction that costs a customer a penalty. ORS 63.787(1) VERBATIM: the report is due \"by the limited liability company's anniversary\", which is the anniversary DATE. Oregon's SOS says the same: \"Your renewal is due on the anniversary date of the original filing.\" Now anchor \"formation-anniversary\", which takes the month and day from the entity. Leap days need no special case: 29 February clamps to the 28th in a common year, which is what ORS 65.001 defines the anniversary to be. FEE VERIFIED 2026-08-05: $100 — read directly from the SOS Business Registry Fee Schedule PDF, \"LIMITED LIABILITY COMPANIES > Domestic > Renewal (Annually) $100.00\". STILL DRAFT: the deadline and fee are now checked, but promotion to active means a PERSON has read the statute. See docs/rule-verification/. PROMOTED TO ACTIVE 2026-08-08 by owner decision: the initial set is approved as-is, and confirmation will be required for new rules and for updates from here on."
  },
  // us/or/nonprofit-annual-report.json
  {
    "id": "us-or-sos-nonprofit-annual-report",
    "jurisdiction": "US-OR",
    "title": "Nonprofit Corporation Annual Report",
    "agency": "Oregon Secretary of State, Corporation Division",
    "entityTypes": [
      "501c3",
      "nonprofit-corp"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "formation-anniversary"
    },
    "fee": {
      "amountMinorUnits": 5000,
      "currency": "USD"
    },
    "citation": "ORS 65.787",
    "citationUrl": "https://www.oregonlegislature.gov/bills_laws/ors/ors065.html",
    "agencyUrl": "https://sos.oregon.gov/business/Pages/obr-annual-report-renewal.aspx",
    "lastVerified": "2026-08-01",
    "status": "active",
    "effectiveFrom": "2020-01-01",
    "notes": "DEADLINE FIXED 2026-08-05 (NEH-400). This rule used anchor \"formation-month\" with dayOfMonth \"last\" — the end of the anniversary month — and was therefore up to 30 days LATE, the direction that costs a customer a penalty. ORS 65.787(1) VERBATIM: the report is due \"by the corporation's anniversary\", which is the anniversary DATE. Oregon's SOS says the same: \"Your renewal is due on the anniversary date of the original filing.\" Now anchor \"formation-anniversary\", which takes the month and day from the entity. Leap days need no special case: 29 February clamps to the 28th in a common year, which is what ORS 65.001 defines the anniversary to be. FEE VERIFIED 2026-08-05: $50 — read directly from the SOS Business Registry Fee Schedule PDF, \"DOMESTIC CORPORATIONS > Nonprofit > Renewal (Annually) $50.00\". STILL DRAFT: the deadline and fee are now checked, but promotion to active means a PERSON has read the statute. See docs/rule-verification/. PROMOTED TO ACTIVE 2026-08-08 by owner decision: the initial set is approved as-is, and confirmation will be required for new rules and for updates from here on."
  },
  // us/wa/charitable-solicitation-registration.json
  {
    "id": "us-wa-charitable-solicitation-registration",
    "jurisdiction": "US-WA",
    "title": "Charitable Organization Registration Renewal",
    "agency": "Washington Secretary of State, Charities Program",
    "entityTypes": [
      "501c3",
      "nonprofit-corp"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "fiscal-year-end",
      "offsetMonths": 11,
      "dayOfMonth": "last"
    },
    "fee": {
      "amountMinorUnits": 4000,
      "currency": "USD"
    },
    "conditions": [
      {
        "fact": "solicitsCharitableContributions",
        "op": "eq",
        "value": true
      }
    ],
    "weekendRule": "roll-backward",
    "citation": "RCW 19.09.075; RCW 19.09.085; WAC 434-120-140(2)(a); WAC 434-120-042",
    "citationUrl": "https://app.leg.wa.gov/wac/default.aspx?cite=434-120-140",
    "agencyUrl": "https://www.sos.wa.gov/corporations-charities/charities",
    "lastVerified": "2026-08-05",
    "status": "active",
    "effectiveFrom": "2020-01-01",
    "notes": "NARROWED 2026-08-05 (NEH-401): this rule used to ALSO trigger on holding $250,000+ in charitable assets, which is a different registration entirely — RCW 11.110 charitable TRUST registration, now us-wa-charitable-trust-registration. The deadlines coincide (both are the last business day of the eleventh month after the accounting year, WAC 434-120-025), which is why merging them looked harmless; the forms and the fees do not. An endowed non-soliciting charity was being sent to the wrong form at $40 instead of $25. FEE VERIFIED TWICE, independently: RCW 19.09.062(2) and WAC 434-120-042 both give $40 for a charitable organization ANNUAL RENEWAL against $60 for an initial registration. This rule is the renewal. DEADLINE VERIFIED, WAC 434-120-140(2)(a) VERBATIM: 'The completed form and fee shall be received no later than the last business day of the eleventh month after the end of the organization's accounting year.' The statute does NOT set this — RCW 19.09.085(2) delegates it to the secretary by rule — so the WAC is the citation that matters. KNOWN FALSE POSITIVE, NOT EXPRESSIBLE YET: RCW 19.09.081 EXEMPTS an organisation 'raising less than fifty thousand dollars in any accounting year when all the activities of the organization, including all fund-raising activities, are carried on by persons who are unpaid'. This rule cannot express that. It needs two facts the model does not have — contributions RAISED (grossRevenueMinorUnits is a different quantity: a nonprofit can have program revenue that is not contributions) and whether all fundraising is unpaid. So a small all-volunteer charity is told to register when it need not, which costs it $60 and an afternoon. Tracked separately; expressing it wrong would be worse than leaving it. KNOWN WRONG, NOT FIXABLE IN THIS SCHEMA: last BUSINESS day vs last calendar day — see NEH-404. AGENCY URL NOT CLICKABLE FROM CI: sos.wa.gov returns 403 to every automated request — including its own root and a path that does not exist, so the status carries no information about whether a URL is real. This one is the agency's own published page (search engines have crawled it) but nobody here has opened it. A person must, once. See NEH-402. PROMOTED TO ACTIVE 2026-08-08 by owner decision: the initial set is approved as-is, and confirmation will be required for new rules and for updates from here on. HOLIDAYS DELIBERATELY NOT APPLIED (NEH-443): this rule rolls BACKWARD to the last business day, and WAC 434-120-140(2)(a) means a business day — so a Friday that is a Washington state holiday is not one and this date can still be wrong. No `holidayCalendar` is named because state holidays are not modelled: Washington observes at least one day the federal calendar does not, and applying the federal set here would move some dates correctly and leave others wrong with nothing in the output to say which. Obligations from this rule therefore report NO holiday calendar, which is the honest signal that the date was not holiday-checked."
  },
  // us/wa/charitable-trust-registration.json
  {
    "id": "us-wa-charitable-trust-registration",
    "jurisdiction": "US-WA",
    "title": "Charitable Trust Registration Renewal",
    "agency": "Washington Secretary of State, Charities Program",
    "entityTypes": [
      "501c3",
      "nonprofit-corp"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "fiscal-year-end",
      "offsetMonths": 11,
      "dayOfMonth": "last"
    },
    "fee": {
      "amountMinorUnits": 2500,
      "currency": "USD"
    },
    "conditions": [
      {
        "fact": "charitableAssetsMinorUnits",
        "op": "gt",
        "value": 25000000
      }
    ],
    "citation": "RCW 11.110.051; WAC 434-120-305; WAC 434-120-025; WAC 434-120-042",
    "citationUrl": "https://app.leg.wa.gov/wac/default.aspx?cite=434-120-305",
    "agencyUrl": "https://www.sos.wa.gov/corporations-charities/charities",
    "lastVerified": "2026-08-05",
    "status": "active",
    "effectiveFrom": "2020-01-01",
    "notes": "SPLIT OUT OF us-wa-charitable-solicitation-registration on 2026-08-05 (NEH-401). That rule triggered on soliciting OR holding $250,000+ in charitable assets, but those are TWO DIFFERENT REGISTRATIONS under two different chapters, with their own forms, fees and deadlines. An endowed non-soliciting charity was being told to file the solicitation renewal — wrong form at nearly twice the price. THRESHOLD VERIFIED, WAC 434-120-305 VERBATIM: a trustee must register if 'the trustee holds assets, invested for income-producing purposes, exceeding a value of two hundred fifty thousand dollars'. Note 'EXCEEDING' — hence gt, not gte. A trust holding exactly $250,000 does not register, and the previous gte was off by one at precisely the boundary. Note also 'invested for income-producing purposes': charitableAssetsMinorUnits is the closest fact the model has and is not exactly that, so an entity holding $250k of non-income-producing charitable property (a building in program use) may be caught here when the statute would not catch it. DEADLINE VERIFIED, WAC 434-120-025 VERBATIM: 'Renewal date for charitable organizations, commercial fund-raisers, and charitable trusts means the last business day of the eleventh month after the close of the organization's accounting year.' The same date as the solicitation renewal, which is why merging them looked harmless — the deadlines coincide and only the form and the fee differ. FEE VERIFIED, WAC 434-120-042: charitable trusts pay $25.00 initial and $25.00 annual renewal, against $60/$40 for a charitable organization. KNOWN WRONG, NOT FIXABLE IN THIS SCHEMA: the WAC says last BUSINESS day; dayOfMonth 'last' gives the last calendar day, so a month ending at a weekend shows a deadline up to 2 days LATE. weekendRule offers only roll-forward and this needs backward — see NEH-404. STILL DRAFT: every value here was read from a primary source, but promotion means a PERSON read it. See docs/rule-verification/. AGENCY URL NOT CLICKABLE FROM CI: sos.wa.gov returns 403 to every automated request — including its own root and a path that does not exist, so the status carries no information about whether a URL is real. This one is the agency's own published page (search engines have crawled it) but nobody here has opened it. A person must, once. See NEH-402. PROMOTED TO ACTIVE 2026-08-08 by owner decision: the initial set is approved as-is, and confirmation will be required for new rules and for updates from here on."
  },
  // us/wa/corporation-annual-report.json
  {
    "id": "us-wa-sos-corporation-annual-report",
    "jurisdiction": "US-WA",
    "title": "Profit Corporation Annual Report",
    "agency": "Washington Secretary of State",
    "entityTypes": [
      "s-corp",
      "c-corp",
      "b-corp"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "formation-month",
      "dayOfMonth": "last"
    },
    "fee": {
      "amountMinorUnits": 7000,
      "currency": "USD"
    },
    "citation": "RCW 23.95.255(2); WAC 434-112-060(1); WAC 434-112-085(7)(p)",
    "citationUrl": "https://app.leg.wa.gov/rcw/default.aspx?cite=23.95",
    "agencyUrl": "https://www.sos.wa.gov/corporations-charities/business-entities/maintain-business-compliance/annual-reports",
    "lastVerified": "2026-08-08",
    "status": "active",
    "effectiveFrom": "2020-01-01",
    "notes": "VERIFIED 2026-08-08 — requirement, due date and fee all read from primary sources. REQUIREMENT: RCW 23.95.255(2) requires every domestic entity and registered foreign entity to deliver an annual report; a profit corporation is a \"business corporation\" and so an \"entity\" under RCW 23.95.105(6)(a). DUE DATE NOW CITED: WAC 434-112-060(1) — an entity defined by RCW 23.95.105(6) and subject to RCW 23.95.255 \"must file an annual report accompanied by the fee established under WAC 434-112-085 by the last day of the month that the entity was formed or registered by the division\". This REPLACES the earlier note that the date was not settleable: RCW 23.95.255(4) delegates the date to the secretary of state, and WAC 434-112-060(1) is where the secretary set it, so the end-of-formation-month cadence is a regulation rather than unwritten practice. WAC 434-112-060(2) also confirms the 180-day early-filing window the agency advertises. FEE CORRECTED to $70 and now citable: WAC 434-112-085(7)(p) \"Annual report Seventy dollars\", for entities under Title 23B RCW and chapters 23.78, 23.86, 25.05, 25.10 and 25.15 RCW. The SOS fee schedule agrees and states the increase from $60 explicitly, citing WAC 434-112-085(7). The $60 previously recorded here was wrong; this is a correction, not a restoration of the old value. NOT MODELLED: the $25 delinquent fee (WAC 434-112-085(7)(r); the agency shows \"Annual Report with delinquency fee $95\"), because the schema has no penalty field. sos.wa.gov IS reachable by an ordinary browser; the earlier \"403 to every automated request\" note was a property of the fetcher used, not of the site, and a wrong path returns a plain 404 — so response status does carry information after all. The agency page linked here was opened and read. See NEH-402."
  },
  // us/wa/llc-annual-report.json
  {
    "id": "us-wa-sos-llc-annual-report",
    "jurisdiction": "US-WA",
    "title": "Limited Liability Company Annual Report",
    "agency": "Washington Secretary of State",
    "entityTypes": [
      "llc"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "formation-month",
      "dayOfMonth": "last"
    },
    "fee": {
      "amountMinorUnits": 7000,
      "currency": "USD"
    },
    "citation": "RCW 25.15.106; RCW 23.95.255; WAC 434-112-060(1); WAC 434-112-085(7)(p)",
    "citationUrl": "https://app.leg.wa.gov/rcw/default.aspx?cite=25.15",
    "agencyUrl": "https://www.sos.wa.gov/corporations-charities/business-entities/maintain-business-compliance/annual-reports",
    "lastVerified": "2026-08-08",
    "status": "active",
    "effectiveFrom": "2020-01-01",
    "notes": "VERIFIED 2026-08-08 — requirement, due date and fee all read from primary sources. REQUIREMENT: RCW 25.15.106 requires each domestic LLC and each foreign LLC authorized to transact business here to deliver initial and annual reports \"in accordance with RCW 23.95.255\". DUE DATE NOW CITED: WAC 434-112-060(1) — an entity defined by RCW 23.95.105(6) and subject to RCW 23.95.255 \"must file an annual report accompanied by the fee established under WAC 434-112-085 by the last day of the month that the entity was formed or registered by the division\". This REPLACES the earlier note that the date was not settleable: RCW 23.95.255(4) delegates the date to the secretary of state, and WAC 434-112-060(1) is where the secretary set it, so the end-of-formation-month cadence is a regulation rather than unwritten practice. WAC 434-112-060(2) also confirms the 180-day early-filing window the agency advertises. An LLC is an \"entity\" under RCW 23.95.105(6)(e). FEE CORRECTED to $70 and now citable: WAC 434-112-085(7)(p) \"Annual report Seventy dollars\", for entities under Title 23B RCW and chapters 23.78, 23.86, 25.05, 25.10 and 25.15 RCW. The SOS fee schedule agrees and states the increase from $60 explicitly, citing WAC 434-112-085(7). The $60 previously recorded here was wrong; this is a correction, not a restoration of the old value. NOT MODELLED: the $25 delinquent fee (WAC 434-112-085(7)(r); the agency shows \"Annual Report with delinquency fee $95\"), because the schema has no penalty field. sos.wa.gov IS reachable by an ordinary browser; the earlier \"403 to every automated request\" note was a property of the fetcher used, not of the site, and a wrong path returns a plain 404 — so response status does carry information after all. The agency page linked here was opened and read. See NEH-402."
  },
  // us/wa/nonprofit-annual-report.json
  {
    "id": "us-wa-sos-nonprofit-annual-report",
    "jurisdiction": "US-WA",
    "title": "Nonprofit Corporation Annual Report",
    "agency": "Washington Secretary of State",
    "entityTypes": [
      "501c3",
      "nonprofit-corp"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "formation-month",
      "dayOfMonth": "last"
    },
    "citation": "RCW 24.03A.070; RCW 23.95.255(2); WAC 434-112-060(1); WAC 434-112-085(8)(m); RCW 24.03A.960(2)(b)",
    "citationUrl": "https://app.leg.wa.gov/rcw/default.aspx?cite=24.03A",
    "agencyUrl": "https://www.sos.wa.gov/corporations-charities/business-entities/maintain-business-compliance/annual-reports",
    "lastVerified": "2026-08-08",
    "status": "active",
    "effectiveFrom": "2022-01-01",
    "notes": "VERIFIED 2026-08-08 — requirement and due date settled; the fee is understood but still cannot be expressed. REQUIREMENT: RCW 24.03A.070 — \"Each domestic nonprofit corporation, and each registered foreign nonprofit corporation, shall deliver to the secretary of state for filing an annual report as required under RCW 23.95.255(2)\". (An earlier version of this rule cited RCW 24.03A.1010, which does not exist; that was corrected 2026-08-05.) DUE DATE NOW CITED: WAC 434-112-060(1) — an entity defined by RCW 23.95.105(6) and subject to RCW 23.95.255 \"must file an annual report accompanied by the fee established under WAC 434-112-085 by the last day of the month that the entity was formed or registered by the division\". This REPLACES the earlier note that the date was not settleable: RCW 23.95.255(4) delegates the date to the secretary of state, and WAC 434-112-060(1) is where the secretary set it, so the end-of-formation-month cadence is a regulation rather than unwritten practice. WAC 434-112-060(2) also confirms the 180-day early-filing window the agency advertises. A nonprofit corporation is an \"entity\" under RCW 23.95.105(6)(b), so this WAC reaches it. FEE STILL ABSENT, and the shape is now known precisely — it is NOT the flat \"$60 reduced to $20\" previously assumed. WAC 434-112-085(8)(m) sets the annual report at \"Ten dollars, plus the Charitable Asset Protection Account fee\", and RCW 24.03A.960(2)(b) sets that fee at \"fifty dollars per year, reduced to ten dollars if the corporation certifies that its total gross revenue in the most recent fiscal year was less than five hundred thousand dollars\". So $10 + $50 = $60, or $10 + $10 = $20 — matching the \"$20-60\" the SOS fee schedule shows. Two things this changes for the schema work in NEH-403: it is a base fee plus a conditional surcharge rather than one conditional amount, and the reduction turns on the corporation CERTIFYING its revenue, not on the revenue fact alone. A flat figure would still be wrong for one group or the other, and the group $60 overstates threefold is the larger one, so no fee is recorded. sos.wa.gov IS reachable by an ordinary browser; the earlier \"403 to every automated request\" note was a property of the fetcher used, not of the site, and a wrong path returns a plain 404 — so response status does carry information after all. The agency page linked here was opened and read. See NEH-402 and NEH-403."
  },
] as const;
