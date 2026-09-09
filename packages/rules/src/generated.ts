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
    "fee": {
      "basis": "computed",
      "minimumMinorUnits": 22500,
      "maximumMinorUnits": 25005000,
      "explanation": "Delaware computes this per corporation, so only your own figures give your number. The annual report fee is $50 (8 Del. C. § 391(a)(18)). On top of it the franchise tax is at least $175 by the authorised-shares method or at least $400 by the assumed-par-value-capital method, capped at $200,000 — or fixed at $250,000 for a large corporate filer (8 Del. C. § 503). Use the Division of Corporations' own calculator on the agency page to get your figure. Filing late adds $200 (§ 502(c)).",
      "currency": "USD"
    },
    "citation": "8 Del. C. 502; 8 Del. C. 503; 8 Del. C. 391(a)(18)",
    "citationUrl": "https://delcode.delaware.gov/title8/c005/index.html",
    "agencyUrl": "https://corp.delaware.gov/paytaxes/",
    "lastVerified": "2026-09-09",
    "status": "active",
    "effectiveFrom": "2020-01-01",
    "notes": "DUE DATE VERIFIED 2026-08-05, 8 Del. C. 502(a) VERBATIM: \"Annually on or before March 1, every corporation now existing or hereafter incorporated under Chapter 1 of this title ... shall make an annual franchise tax report to the Secretary of State.\" The fixed 1 March calendar date is right. FEE IS THE REPORT FEE ONLY, AND ITS SOURCE WAS NOT FOUND — 8 Del. C. 502 sets the deadline but no filing fee, and the fee section was not located in the chapter read. The $50 here is unverified. THE REAL COST IS THE FRANCHISE TAX, AND IT DWARFS THIS. 8 Del. C. 503 VERBATIM: the tax is \"more than $200,000 nor less than $175\" by the authorised-shares method, or \"more than $200,000 nor less than $400\" by assumed-par-value. So the MINIMUM real cost is at least 3.5x the figure shown and the maximum is 4000x it. The schema has no way to express a computed fee, and presenting $50 as the total would badly understate what a corporation actually owes. Do not promote until either the schema supports computed fees or the UI surfaces these notes. 502(c) also imposes a $200 penalty for a late report. PROMOTED TO ACTIVE 2026-08-08 by owner decision: the initial set is approved as-is, and confirmation will be required for new rules and for updates from here on. FEE REMOVED on promotion: the $50 recorded here was the report fee only and its source was never found, while 8 Del. C. 503 sets the franchise tax at a $175/$400 minimum and a $200,000 maximum — so the figure understated the real cost by 3.5x to 4000x. An absent fee sends a filer to the agency's own page; a wrong one sends them to the wrong bank. Restore a fee only when the schema can express a computed one. FEE RESTORED 2026-09-09 AS A RANGE, NOT A FLAT NUMBER (NEH-403). The schema now carries an inexact fee — bounds plus a required explanation — so this rule can state what a corporation actually pays instead of showing nothing. Read from the primary source this date: 8 Del. C. 391(a)(18) VERBATIM, which is the report fee whose source the previous note says was never found: \"For receiving and filing and/or indexing an annual franchise tax report of a corporation provided for by 502 of this title, a fee of $25 shall be paid by exempt corporations and a fee of $50 shall be paid by all other corporations.\" 8 Del. C. 503(a)(1) VERBATIM: \"in no case shall the tax on any corporation for a full taxable year ... be more than $200,000 nor less than $175\"; 503(a)(2) gives \"more than $200,000 nor less than $400\" for the assumed-par-value method. 503(c) fixes the tax at $250,000 for a large corporate filer, which is a listed company over the revenue and asset thresholds it names. SO THE RECORDED CEILING WAS TOO LOW: NEH-403 and the 2026-08-05 verification both give the maximum as $200,000, and 503(c) puts it at $250,000. The range here is $50 + $175 = $225 minimum and $50 + $250,000 = $250,050 maximum, because this filing is the report AND the tax, which is what the title says. CITATION URL WAS WRONG and is corrected: it pointed at title8/c001/sc15, Subchapter XV, PUBLIC BENEFIT CORPORATIONS (361-368), which contains neither 502 nor 503. Anyone following it to check this rule found unrelated text. The franchise-tax chapter is title8/c005."
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
  // us/de/nonprofit-annual-report.json
  {
    "id": "us-de-nonprofit-annual-report",
    "jurisdiction": "US-DE",
    "title": "Nonprofit (Exempt) Corporation Annual Report",
    "agency": "Delaware Division of Corporations",
    "entityTypes": [
      "501c3",
      "nonprofit-corp"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "calendar",
      "month": 3,
      "day": 1
    },
    "fee": {
      "amountMinorUnits": 2500,
      "currency": "USD"
    },
    "citation": "8 Del. C. 502(a); 8 Del. C. 501(a), (b); 8 Del. C. 391(a)(18), (j); 8 Del. C. 114(a), (d)(1)",
    "citationUrl": "https://delcode.delaware.gov/title8/c005/index.html",
    "agencyUrl": "https://corp.delaware.gov/paytaxes/",
    "lastVerified": "2026-09-09",
    "status": "draft",
    "effectiveFrom": "2020-01-01",
    "notes": "NEW 2026-09-09 (NEH-194). Delaware had a corporation rule and an LLC rule and no nonprofit rule, while WA and OR both had one. DELAWARE HAS NO SEPARATE NONPROFIT ACT: a Delaware nonprofit incorporates under Chapter 1 of Title 8 as a nonstock corporation, which is why the ordinary corporation sections reach it. 8 Del. C. 114(a) VERBATIM: \"Except as otherwise provided in subsections (b) and (c) of this section, the provisions of this chapter and of chapter 5 of this title shall apply to nonstock corporations...\". 8 Del. C. 114(d)(1) VERBATIM: \"A 'charitable nonstock corporation' is any nonprofit nonstock corporation that is exempt from taxation under § 501(c)(3) of the United States Internal Revenue Code\". Neither 114(b) nor 114(c) carves out § 501 or § 502; the only Chapter 5 section named in 114(b)(1) is § 503, and it is named as applying to nonstock corporations BY ITS TERMS, not as excluded. REQUIREMENT AND DUE DATE, 8 Del. C. 502(a) VERBATIM: \"Annually on or before March 1, every corporation now existing or hereafter incorporated under Chapter 1 of this title or which has accepted the Constitution of this State, shall make an annual franchise tax report to the Secretary of State.\" That sentence is unqualified — it reaches exempt corporations too, and being exempt from the TAX does not excuse the REPORT. The March 1 fixed calendar date is the same one the sibling us-de-corporation-annual-report encodes. NO FRANCHISE TAX, which is the whole reason this is a separate rule rather than an entityTypes addition to the corporation rule. 8 Del. C. 501(a) VERBATIM: \"No such tax shall be paid by any exempt corporation, any banking corporation, savings bank, building and loan association or any captive insurance company licensed under Chapter 69 of Title 18, or any corporation for drainage and reclamation of lowlands.\" 8 Del. C. 501(b) defines the term VERBATIM: \"As used in this chapter, the term 'exempt corporation' shall be defined as any corporation organized under Chapter 1 of this title that: (1) Is exempt from taxation under § 501(c) of the United States Internal Revenue Code (26 U.S.C. § 501(c)) or any similar provisions of the Internal Revenue Code, or any successor provisions; ... (5) Is organized primarily or exclusively for religious or charitable purposes...; or (6) a. Is organized not for profit; and b. No part of its net earnings inures to the benefit of any member or individual.\" A 501(c)(3) qualifies under 501(b)(1); a nonprofit corporation that is not federally exempt still qualifies under 501(b)(6). Both of this rule's entityTypes are therefore inside the definition. FEE IS RECORDED HERE, AND THAT IS THE DELIBERATE DIFFERENCE FROM THE SIBLING CORPORATION RULE, which carries no fee because its real cost is a computed franchise tax the schema cannot express (8 Del. C. 503: \"more than $200,000 nor less than $175\" / \"nor less than $400\"). An exempt corporation owes NO franchise tax, so the report fee is the entire cost and it is flat and statutory. 8 Del. C. 391(a)(18) VERBATIM: \"For receiving and filing and/or indexing an annual franchise tax report of a corporation provided for by § 502 of this title, a fee of $25 shall be paid by exempt corporations and a fee of $50 shall be paid by all other corporations.\" 8 Del. C. 391(j) VERBATIM: \"As used in this section, the term 'exempt corporation' shall have the meaning given to it in § 501(b) of this title.\" The agency's own page agrees: corp.delaware.gov/paytaxes/ lists \"Exempt Domestic Corporations - $25.00\" against \"Non-Exempt Domestic Corporations - $50.00\", and \"All active Domestic Corporation Annual Reports and Franchise Taxes for the prior year are due annually on or before March 1st\". WHAT effectiveFrom DOES AND DOES NOT CLAIM. 2020-01-01 matches the two sibling Delaware rules and is a conservative floor for the REPORTING OBLIGATION, which § 502 has imposed in substantially this form since 1899 (21 Del. Laws, c. 166). It is NOT a sourced claim about when the $25 figure took effect: § 391's session-law history runs to 85 Del. Laws, c. 273, that session law was not read, and the archived year-by-year code editions that would settle it are on secondary sites (law.justia.com returned HTTP 403 and was not used regardless, per the no-vendor-sources rule). The $25 is verified as the CURRENT text of § 391(a)(18) read from delcode.delaware.gov on 2026-09-09, corroborated by the agency's own fee page the same day. If a historical answer for a prior year is ever needed, read the session law first. LATE PENALTY NOT MODELLED: 8 Del. C. 502(c) adds \"$200 to be recovered by adding that amount to the franchise tax\" for a late or incomplete report. The schema has no penalty field, and the sibling corporation rule records the same fact the same way. NO WEEKEND RULE: § 502 says nothing about a March 1 that falls on a weekend, and neither does the agency page, so none is asserted — inventing a direction would be a legal position this rule never checked. STATUS IS DRAFT. Promotion to active is an owner decision, per the \"PROMOTED TO ACTIVE 2026-08-08 by owner decision\" note on the sibling rules. See docs/rule-verification/2026-09-09-delaware-nonprofit-and-boi.md for every URL opened."
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
        "fact": "isPrivateFoundation",
        "op": "eq",
        "value": false
      },
      {
        "anyOf": [
          {
            "fact": "normalAnnualGrossReceiptsMinorUnits",
            "op": "gt",
            "value": 5000000
          },
          {
            "fact": "isSupportingOrganization",
            "op": "eq",
            "value": true
          }
        ]
      },
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
    "citation": "26 U.S.C. 6033(a); Rev. Proc. 2011-15, 2011-3 I.R.B. 322, secs. 3-4; IRS Instructions for Form 990",
    "citationUrl": "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section6033",
    "agencyUrl": "https://www.irs.gov/forms-pubs/about-form-990",
    "lastVerified": "2026-09-03",
    "status": "active",
    "effectiveFrom": "2020-01-01",
    "notes": "DUE DATE VERIFIED 2026-08-05 against irs.gov: the annual return is due the 15th day of the 5th month after the tax year ends — 15 May for a calendar-year filer, which this cadence produces. WEEKEND RULE ADDED: the IRS states \"If a due date falls on a Saturday, Sunday, or legal holiday, the due date is delayed until the next business day.\" This is opted into explicitly because the agency says it, not assumed. It matters concretely: 15 May 2027 is a Saturday, so without it a calendar-year filer is shown a date two days before the real deadline. Federal legal holidays are not modelled, so a deadline landing on one is still off. THRESHOLDS VERIFIED, verbatim from the IRS filing-thresholds table: \"Gross receipts >= $200,000, or Total assets >= $500,000\". The anyOf and both gte operators match exactly. CITATION URL RETARGETED 2026-08-05: it pointed at the same IRS page as agencyUrl, which made the two fields one field wearing two names. The citation is 26 U.S.C. 6033, so it now links the STATUTE (uscode.house.gov, official) while agencyUrl keeps the IRS page a filer actually uses. The distinction matters most here: the IRS page is where the current thresholds live, and the statute is what a reviewer checks the rule against. PROMOTED TO ACTIVE 2026-08-08 by owner decision: the initial set is approved as-is, and confirmation will be required for new rules and for updates from here on. HOLIDAY CALENDAR ADDED 2026-08-14 (NEH-443): this rule already quoted the IRS in full — \"if a due date falls on a Saturday, Sunday, or legal holiday, the due date is delayed until the next business day\" — while implementing only two thirds of it. `holidayCalendar: us-federal` applies the eleven federal holidays of 5 U.S.C. 6103(a), including the weekend-observance shift, so a deadline landing on one now moves. The calendar is computed from the year, not listed, so there is nothing to drift. Federal only: state holidays are not modelled anywhere in this pack. PRIVATE FOUNDATIONS EXCLUDED 2026-08-26 (NEH-1146). A private foundation IS a 501(c)(3), so before this condition existed one landed in this rule on its receipts and assets alone. It does not file this return: it files Form 990-PF, and the IRS says so on the page listing the organisations not permitted to use Form 990-N — \"Private foundations — must file Form 990-PF instead\". `isPrivateFoundation` deliberately has NO default, so an entity that has never been asked reports this rule as indeterminate rather than as decided. That is the honest answer and the safe direction: defaulting it to false would restore exactly the under-filing this condition removes. See us-federal-form-990-pf for the return a foundation does owe. THIS CARVE-OUT DOES NOT COVER 509(a)(3) SUPPORTING ORGANISATIONS, which the IRS excludes from Form 990-N separately and on a different shape of test (most must file 990 or 990-EZ; one supporting a religious organisation with gross receipts normally $5,000 or less may still use 990-N). Modelling that needs its own fact AND a change to this pack's 990-EZ receipts floor, or a small supporting organisation would match no federal return at all — silence, which is under-filing wearing a clean calendar. Tracked separately. Applied to THIS rule as well as to 990-N, which was a decision rather than symmetry: a foundation large enough to clear the receipts-or-assets test would otherwise match this rule AND us-federal-form-990-pf and be told to file two annual returns. An organisation files one. That is the same reason this pack gave form-990-n.json an assets ceiling under NEH-410. THE “NORMALLY” TEST AND THE SUPPORTING-ORGANISATION CARVE-OUT, VERIFIED 2026-09-03. This is the deferred verification pass form-990-n.json's own notes asked for, and it read the primary sources rather than the summary table: Rev. Proc. 2011-15, 2011-3 I.R.B. 322 (the authority for the $50,000 relief), 26 U.S.C. 6033(a)(3), (i) and (j), and the IRS pages “Annual electronic filing requirement for small exempt organizations” and “Annual electronic notice (Form 990-N) FAQs: who must file”. Three findings, all of which changed a rule. (1) SUPPORTING ORGANISATIONS ARE EXCLUDED FROM THE $50,000 RELIEF ENTIRELY. Rev. Proc. 2011-15 sec. 3.01 relieves from the annual-return requirement an organisation described in sec. 501(c) “(other than a private foundation or a § 509(a)(3) supporting organization)” whose gross receipts are normally not more than $50,000, and sec. 3.03 makes Form 990-N the notice such a relieved organisation files instead. So a supporting organisation files Form 990 or Form 990-EZ at any size. The exclusion is statutory in origin: sec. 2.04 records that the Pension Protection Act of 2006 amended § 6033(a)(3)(B) to remove the Secretary's authority to relieve supporting organisations at all. `isSupportingOrganization` has NO default, exactly as `isPrivateFoundation` has none, because reading an unanswered question as “no” restores the under-filing it removes. (2) “NORMALLY” IS AN AVERAGE, AND A SINGLE YEAR IS WRONG IN BOTH DIRECTIONS. Rev. Proc. 2011-15 sec. 4 defines it: $75,000 or less in the first taxable year for an organisation one year old or less; average of the first two taxable years, $60,000 or less, for one under three; and for three years or more, “the organization's average annual gross receipts for the immediately preceding three taxable years, including the taxable year for which the return is filed, is $50,000 or less”. Testing one year over-files an organisation with a one-off bequest, and UNDER-files one whose lean year follows two large ones — the second direction is the hazard, and it is the reason this was not left as a fidelity gap. The rules now test `normalAnnualGrossReceiptsMinorUnits`, which the engine derives from gross revenue and two optional prior years; see packages/engine/src/derived.ts for what it implements and, just as importantly, what it does not — the tiered $75,000 and $60,000 figures for organisations under three years old are NOT modelled, because the tier turns on the organisation's age in the taxable year being filed and this engine resolves conditions once per rule rather than once per due date. $50,000 is the strictest of the three, so that simplification can only over-file. (3) THE ASSETS CEILING ON 990-N WAS AN INVENTION AND IS REMOVED — see form-990-n.json. docs/rule-verification/2026-09-03-990-family-receipts-and-supporting-organisations.md records every page read, so the next pass can check this against the same sources rather than starting over. NOT MODELLED, AND SAID OUT LOUD RATHER THAN LEFT AS A SILENT GAP: § 6033(a)(3)(A)(ii) with (a)(3)(C)(iv) keeps a MANDATORY exception for an organisation “operated, supervised, or controlled by or in connection with a religious organization” whose gross receipts are normally not more than $5,000, which the IRS restates as a 509(a)(3) supporting organisation of a religious organisation. Such an organisation may still use Form 990-N. This pack does not model it, because it cannot be expressed in the v1 schema — the schema allows one level of `anyOf` and forbids nesting, and every arrangement that admits the exception also lets that organisation match Form 990-EZ, so it would be told to file two returns. The consequence of the omission is that such an organisation is shown Form 990-EZ, which is over-filing and a return the IRS permits any organisation to file voluntarily. Also unmodelled, and equally out of reach of `ENTITY_TYPES`: integrated auxiliaries of churches, the exclusively religious activities of religious orders, sec. 527 political organisations, and § 4947(a)(1) charitable trusts. A RECEIPTS FLOOR ADDED 2026-09-03, and it is a correction rather than a refinement. This rule fired on the assets test alone, so a charity with $30,000 of receipts and $9,000,000 of assets owed a full Form 990 — and, once 990-N's invented assets ceiling is removed, would have owed the e-Postcard as well. Rev. Proc. 2011-15 sec. 3.01 relieves that organisation from filing an annual return at all, and sec. 3.04 makes gross receipts the only condition whose loss revives the duty. The $200,000 receipts and $500,000 assets figures are unchanged and still verified verbatim from the IRS filing-thresholds table; they decide WHICH return an organisation required to file must use, and this floor decides WHETHER it is required to file. The `anyOf` with `isSupportingOrganization eq true` is there because a supporting organisation is required to file whatever its receipts.",
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
        "fact": "isPrivateFoundation",
        "op": "eq",
        "value": false
      },
      {
        "anyOf": [
          {
            "fact": "normalAnnualGrossReceiptsMinorUnits",
            "op": "gt",
            "value": 5000000
          },
          {
            "fact": "isSupportingOrganization",
            "op": "eq",
            "value": true
          }
        ]
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
    "citation": "26 U.S.C. 6033(a); Rev. Proc. 2011-15, 2011-3 I.R.B. 322, secs. 3-4; IRS Instructions for Form 990-EZ",
    "citationUrl": "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section6033",
    "agencyUrl": "https://www.irs.gov/forms-pubs/about-form-990-ez",
    "lastVerified": "2026-09-03",
    "status": "active",
    "effectiveFrom": "2020-01-01",
    "notes": "DUE DATE VERIFIED 2026-08-05 against irs.gov: the annual return is due the 15th day of the 5th month after the tax year ends — 15 May for a calendar-year filer, which this cadence produces. WEEKEND RULE ADDED: the IRS states \"If a due date falls on a Saturday, Sunday, or legal holiday, the due date is delayed until the next business day.\" This is opted into explicitly because the agency says it, not assumed. It matters concretely: 15 May 2027 is a Saturday, so without it a calendar-year filer is shown a date two days before the real deadline. Federal legal holidays are not modelled, so a deadline landing on one is still off. THRESHOLDS VERIFIED: the IRS states \"Gross receipts < $200,000, and Total assets < $500,000\", which the upper bounds match. The >$50,000 LOWER bound is this pack's own modelling choice, not an IRS rule — the IRS lets a small organisation ELECT to file 990-EZ instead of 990-N. It is there so 990-N and 990-EZ are mutually exclusive and a small charity is not told it owes both. Deliberate; revisit only with the election in mind. CITATION URL RETARGETED 2026-08-05: it pointed at the same IRS page as agencyUrl, which made the two fields one field wearing two names. The citation is 26 U.S.C. 6033, so it now links the STATUTE (uscode.house.gov, official) while agencyUrl keeps the IRS page a filer actually uses. The distinction matters most here: the IRS page is where the current thresholds live, and the statute is what a reviewer checks the rule against. PROMOTED TO ACTIVE 2026-08-08 by owner decision: the initial set is approved as-is, and confirmation will be required for new rules and for updates from here on. HOLIDAY CALENDAR ADDED 2026-08-14 (NEH-443): this rule already quoted the IRS in full — \"if a due date falls on a Saturday, Sunday, or legal holiday, the due date is delayed until the next business day\" — while implementing only two thirds of it. `holidayCalendar: us-federal` applies the eleven federal holidays of 5 U.S.C. 6103(a), including the weekend-observance shift, so a deadline landing on one now moves. The calendar is computed from the year, not listed, so there is nothing to drift. Federal only: state holidays are not modelled anywhere in this pack. PRIVATE FOUNDATIONS EXCLUDED 2026-08-26 (NEH-1146). A private foundation IS a 501(c)(3), so before this condition existed one landed in this rule on its receipts and assets alone. It does not file this return: it files Form 990-PF, and the IRS says so on the page listing the organisations not permitted to use Form 990-N — \"Private foundations — must file Form 990-PF instead\". `isPrivateFoundation` deliberately has NO default, so an entity that has never been asked reports this rule as indeterminate rather than as decided. That is the honest answer and the safe direction: defaulting it to false would restore exactly the under-filing this condition removes. See us-federal-form-990-pf for the return a foundation does owe. THIS CARVE-OUT DOES NOT COVER 509(a)(3) SUPPORTING ORGANISATIONS, which the IRS excludes from Form 990-N separately and on a different shape of test (most must file 990 or 990-EZ; one supporting a religious organisation with gross receipts normally $5,000 or less may still use 990-N). Modelling that needs its own fact AND a change to this pack's 990-EZ receipts floor, or a small supporting organisation would match no federal return at all — silence, which is under-filing wearing a clean calendar. Tracked separately. Applied to THIS rule as well as to 990-N, which was a decision rather than symmetry: a foundation large enough to clear the receipts-or-assets test would otherwise match this rule AND us-federal-form-990-pf and be told to file two annual returns. An organisation files one. That is the same reason this pack gave form-990-n.json an assets ceiling under NEH-410. THE “NORMALLY” TEST AND THE SUPPORTING-ORGANISATION CARVE-OUT, VERIFIED 2026-09-03. This is the deferred verification pass form-990-n.json's own notes asked for, and it read the primary sources rather than the summary table: Rev. Proc. 2011-15, 2011-3 I.R.B. 322 (the authority for the $50,000 relief), 26 U.S.C. 6033(a)(3), (i) and (j), and the IRS pages “Annual electronic filing requirement for small exempt organizations” and “Annual electronic notice (Form 990-N) FAQs: who must file”. Three findings, all of which changed a rule. (1) SUPPORTING ORGANISATIONS ARE EXCLUDED FROM THE $50,000 RELIEF ENTIRELY. Rev. Proc. 2011-15 sec. 3.01 relieves from the annual-return requirement an organisation described in sec. 501(c) “(other than a private foundation or a § 509(a)(3) supporting organization)” whose gross receipts are normally not more than $50,000, and sec. 3.03 makes Form 990-N the notice such a relieved organisation files instead. So a supporting organisation files Form 990 or Form 990-EZ at any size. The exclusion is statutory in origin: sec. 2.04 records that the Pension Protection Act of 2006 amended § 6033(a)(3)(B) to remove the Secretary's authority to relieve supporting organisations at all. `isSupportingOrganization` has NO default, exactly as `isPrivateFoundation` has none, because reading an unanswered question as “no” restores the under-filing it removes. (2) “NORMALLY” IS AN AVERAGE, AND A SINGLE YEAR IS WRONG IN BOTH DIRECTIONS. Rev. Proc. 2011-15 sec. 4 defines it: $75,000 or less in the first taxable year for an organisation one year old or less; average of the first two taxable years, $60,000 or less, for one under three; and for three years or more, “the organization's average annual gross receipts for the immediately preceding three taxable years, including the taxable year for which the return is filed, is $50,000 or less”. Testing one year over-files an organisation with a one-off bequest, and UNDER-files one whose lean year follows two large ones — the second direction is the hazard, and it is the reason this was not left as a fidelity gap. The rules now test `normalAnnualGrossReceiptsMinorUnits`, which the engine derives from gross revenue and two optional prior years; see packages/engine/src/derived.ts for what it implements and, just as importantly, what it does not — the tiered $75,000 and $60,000 figures for organisations under three years old are NOT modelled, because the tier turns on the organisation's age in the taxable year being filed and this engine resolves conditions once per rule rather than once per due date. $50,000 is the strictest of the three, so that simplification can only over-file. (3) THE ASSETS CEILING ON 990-N WAS AN INVENTION AND IS REMOVED — see form-990-n.json. docs/rule-verification/2026-09-03-990-family-receipts-and-supporting-organisations.md records every page read, so the next pass can check this against the same sources rather than starting over. NOT MODELLED, AND SAID OUT LOUD RATHER THAN LEFT AS A SILENT GAP: § 6033(a)(3)(A)(ii) with (a)(3)(C)(iv) keeps a MANDATORY exception for an organisation “operated, supervised, or controlled by or in connection with a religious organization” whose gross receipts are normally not more than $5,000, which the IRS restates as a 509(a)(3) supporting organisation of a religious organisation. Such an organisation may still use Form 990-N. This pack does not model it, because it cannot be expressed in the v1 schema — the schema allows one level of `anyOf` and forbids nesting, and every arrangement that admits the exception also lets that organisation match Form 990-EZ, so it would be told to file two returns. The consequence of the omission is that such an organisation is shown Form 990-EZ, which is over-filing and a return the IRS permits any organisation to file voluntarily. Also unmodelled, and equally out of reach of `ENTITY_TYPES`: integrated auxiliaries of churches, the exclusively religious activities of religious orders, sec. 527 political organisations, and § 4947(a)(1) charitable trusts. THE $50,000 FLOOR IS NO LONGER THIS PACK'S INVENTION, 2026-09-03. It used to be a modelling choice made only to keep 990-N and 990-EZ mutually exclusive. It is now the floor Rev. Proc. 2011-15 sec. 3.01 actually draws: an organisation under it is RELIEVED from filing an annual return, and files the e-Postcard under sec. 3.03 instead. Two changes follow. It tests `normalAnnualGrossReceiptsMinorUnits` rather than one year, because “normally” is an average. And it sits in an `anyOf` with `isSupportingOrganization eq true`, because a supporting organisation is outside that relief at any size and must land on a real return — without that branch, excluding it from 990-N would drop it below this floor and it would match NOTHING, which is under-filing wearing a clean calendar and worse than naming the wrong form. The IRS still lets a relieved organisation ELECT to file Form 990-EZ; this rule reports the minimum it owes, not the most it may file.",
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
        "fact": "isPrivateFoundation",
        "op": "eq",
        "value": false
      },
      {
        "fact": "isSupportingOrganization",
        "op": "eq",
        "value": false
      },
      {
        "fact": "normalAnnualGrossReceiptsMinorUnits",
        "op": "lte",
        "value": 5000000
      }
    ],
    "citation": "26 U.S.C. 6033(a)(3), (i); Rev. Proc. 2011-15, 2011-3 I.R.B. 322, secs. 3-4; IRS Annual Electronic Filing Requirement for Small Exempt Organizations",
    "citationUrl": "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section6033",
    "agencyUrl": "https://www.irs.gov/charities-non-profits/annual-electronic-filing-requirement-for-small-exempt-organizations-form-990-n-e-postcard",
    "lastVerified": "2026-09-03",
    "status": "active",
    "effectiveFrom": "2020-01-01",
    "notes": "DUE DATE VERIFIED 2026-08-05 against irs.gov: the annual return is due the 15th day of the 5th month after the tax year ends — 15 May for a calendar-year filer, which this cadence produces. WEEKEND RULE ADDED: the IRS states \"If a due date falls on a Saturday, Sunday, or legal holiday, the due date is delayed until the next business day.\" This is opted into explicitly because the agency says it, not assumed. It matters concretely: 15 May 2027 is a Saturday, so without it a calendar-year filer is shown a date two days before the real deadline. Federal legal holidays are not modelled, so a deadline landing on one is still off. THRESHOLD VERIFIED, verbatim from the IRS: \"Gross receipts normally <= $50,000\". Note \"normally\" — the IRS applies an averaging test across years that this pack evaluates as a single-year figure, so an organisation just over the line in one year may still qualify. Failing to file for three consecutive years revokes exempt status automatically — the single most consequential missed deadline for a small nonprofit, and worth surfacing prominently in any UI. CITATION URL RETARGETED 2026-08-05: it pointed at the same IRS page as agencyUrl, which made the two fields one field wearing two names. The citation is 26 U.S.C. 6033, so it now links the STATUTE (uscode.house.gov, official) while agencyUrl keeps the IRS page a filer actually uses. The distinction matters most here: the IRS page is where the current thresholds live, and the statute is what a reviewer checks the rule against. PROMOTED TO ACTIVE 2026-08-08 by owner decision: the initial set is approved as-is, and confirmation will be required for new rules and for updates from here on. ASSETS CEILING ADDED 2026-08-14 (NEH-410) AND IT IS THIS PACK'S MODELLING CHOICE, NOT AN IRS RULE. The IRS gross-receipts test for 990-N states no assets ceiling, and Form 990's own row states an assets test with no receipts floor, so the published thresholds table does not resolve an organisation that is low on receipts and high on assets: a $30,000-receipts, $9,000,000-assets charity satisfied BOTH rows and was told to file two annual returns. An organisation files one. The ceiling mirrors exactly what form-990-ez.json already carries for the same reason and records as the same kind of choice. The direction is deliberate: it pushes such an organisation to the FULLER return, because under-filing is the worse error for a compliance product to make on a customer's behalf. THE IRS INSTRUCTIONS HAVE NOT BEEN READ for this, and lastVerified is deliberately NOT bumped. Rule verification is deferred by owner direction of 2026-08-08 until the platform is usable; this change makes the pack self-consistent and is expected to be checked against the Form 990 instructions in that later pass. HOLIDAY CALENDAR ADDED 2026-08-14 (NEH-443): this rule already quoted the IRS in full — \"if a due date falls on a Saturday, Sunday, or legal holiday, the due date is delayed until the next business day\" — while implementing only two thirds of it. `holidayCalendar: us-federal` applies the eleven federal holidays of 5 U.S.C. 6103(a), including the weekend-observance shift, so a deadline landing on one now moves. The calendar is computed from the year, not listed, so there is nothing to drift. Federal only: state holidays are not modelled anywhere in this pack. PRIVATE FOUNDATIONS EXCLUDED 2026-08-26 (NEH-1146). A private foundation IS a 501(c)(3), so before this condition existed one landed in this rule on its receipts and assets alone. It does not file this return: it files Form 990-PF, and the IRS says so on the page listing the organisations not permitted to use Form 990-N — \"Private foundations — must file Form 990-PF instead\". `isPrivateFoundation` deliberately has NO default, so an entity that has never been asked reports this rule as indeterminate rather than as decided. That is the honest answer and the safe direction: defaulting it to false would restore exactly the under-filing this condition removes. See us-federal-form-990-pf for the return a foundation does owe. THIS CARVE-OUT DOES NOT COVER 509(a)(3) SUPPORTING ORGANISATIONS, which the IRS excludes from Form 990-N separately and on a different shape of test (most must file 990 or 990-EZ; one supporting a religious organisation with gross receipts normally $5,000 or less may still use 990-N). Modelling that needs its own fact AND a change to this pack's 990-EZ receipts floor, or a small supporting organisation would match no federal return at all — silence, which is under-filing wearing a clean calendar. Tracked separately. THE “NORMALLY” TEST AND THE SUPPORTING-ORGANISATION CARVE-OUT, VERIFIED 2026-09-03. This is the deferred verification pass form-990-n.json's own notes asked for, and it read the primary sources rather than the summary table: Rev. Proc. 2011-15, 2011-3 I.R.B. 322 (the authority for the $50,000 relief), 26 U.S.C. 6033(a)(3), (i) and (j), and the IRS pages “Annual electronic filing requirement for small exempt organizations” and “Annual electronic notice (Form 990-N) FAQs: who must file”. Three findings, all of which changed a rule. (1) SUPPORTING ORGANISATIONS ARE EXCLUDED FROM THE $50,000 RELIEF ENTIRELY. Rev. Proc. 2011-15 sec. 3.01 relieves from the annual-return requirement an organisation described in sec. 501(c) “(other than a private foundation or a § 509(a)(3) supporting organization)” whose gross receipts are normally not more than $50,000, and sec. 3.03 makes Form 990-N the notice such a relieved organisation files instead. So a supporting organisation files Form 990 or Form 990-EZ at any size. The exclusion is statutory in origin: sec. 2.04 records that the Pension Protection Act of 2006 amended § 6033(a)(3)(B) to remove the Secretary's authority to relieve supporting organisations at all. `isSupportingOrganization` has NO default, exactly as `isPrivateFoundation` has none, because reading an unanswered question as “no” restores the under-filing it removes. (2) “NORMALLY” IS AN AVERAGE, AND A SINGLE YEAR IS WRONG IN BOTH DIRECTIONS. Rev. Proc. 2011-15 sec. 4 defines it: $75,000 or less in the first taxable year for an organisation one year old or less; average of the first two taxable years, $60,000 or less, for one under three; and for three years or more, “the organization's average annual gross receipts for the immediately preceding three taxable years, including the taxable year for which the return is filed, is $50,000 or less”. Testing one year over-files an organisation with a one-off bequest, and UNDER-files one whose lean year follows two large ones — the second direction is the hazard, and it is the reason this was not left as a fidelity gap. The rules now test `normalAnnualGrossReceiptsMinorUnits`, which the engine derives from gross revenue and two optional prior years; see packages/engine/src/derived.ts for what it implements and, just as importantly, what it does not — the tiered $75,000 and $60,000 figures for organisations under three years old are NOT modelled, because the tier turns on the organisation's age in the taxable year being filed and this engine resolves conditions once per rule rather than once per due date. $50,000 is the strictest of the three, so that simplification can only over-file. (3) THE ASSETS CEILING ON 990-N WAS AN INVENTION AND IS REMOVED — see form-990-n.json. docs/rule-verification/2026-09-03-990-family-receipts-and-supporting-organisations.md records every page read, so the next pass can check this against the same sources rather than starting over. NOT MODELLED, AND SAID OUT LOUD RATHER THAN LEFT AS A SILENT GAP: § 6033(a)(3)(A)(ii) with (a)(3)(C)(iv) keeps a MANDATORY exception for an organisation “operated, supervised, or controlled by or in connection with a religious organization” whose gross receipts are normally not more than $5,000, which the IRS restates as a 509(a)(3) supporting organisation of a religious organisation. Such an organisation may still use Form 990-N. This pack does not model it, because it cannot be expressed in the v1 schema — the schema allows one level of `anyOf` and forbids nesting, and every arrangement that admits the exception also lets that organisation match Form 990-EZ, so it would be told to file two returns. The consequence of the omission is that such an organisation is shown Form 990-EZ, which is over-filing and a return the IRS permits any organisation to file voluntarily. Also unmodelled, and equally out of reach of `ENTITY_TYPES`: integrated auxiliaries of churches, the exclusively religious activities of religious orders, sec. 527 political organisations, and § 4947(a)(1) charitable trusts. ASSETS CEILING REMOVED 2026-09-03, AND THIS REVERSES THE 2026-08-14 DECISION ABOVE. `totalAssetsMinorUnits < $500,000` never had an IRS basis — the note that added it said so, and deliberately left `lastVerified` unbumped pending the reading now done. It has none. Rev. Proc. 2011-15 sec. 3.01 conditions the relief on gross receipts and on the organisation not being a private foundation or a supporting organisation, and on nothing else; sec. 3.04 says the duty to file a return returns only “if at any time an organization ceases to meet ANY CONDITION set forth in section 3.01”, and total assets are not among those conditions. The IRS page listing the organisations not permitted to file Form 990-N names no assets test either, and the Instructions for Form 990 apply the $500,000 assets figure to choosing BETWEEN Form 990 and Form 990-EZ — that is, to an organisation already required to file a return — not to whether the relief applies. So the overlap NEH-410 found is resolved the other way: a charity with $30,000 of receipts and $9,000,000 of assets is relieved from filing a return and submits the e-Postcard. The one-return invariant is preserved not by capping 990-N but by giving Form 990 and Form 990-EZ the receipts floor Rev. Proc. 2011-15 sec. 3.01 actually creates, which also turns this pack's previously invented 990-EZ floor into a cited rule. This CHANGES A SHIPPED ANSWER for a high-asset, low-receipts public charity, from Form 990 to Form 990-N; it is recorded here rather than only in a commit message because it is the most consequential change in this pass.",
    "weekendRule": "roll-forward",
    "holidayCalendar": "us-federal"
  },
  // us/federal/form-990-pf.json
  {
    "id": "us-federal-form-990-pf",
    "jurisdiction": "US",
    "title": "Form 990-PF — Return of Private Foundation",
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
    "form": "990-PF",
    "conditions": [
      {
        "fact": "isPrivateFoundation",
        "op": "eq",
        "value": true
      }
    ],
    "citation": "26 U.S.C. 6033; IRS Instructions for Form 990-PF",
    "citationUrl": "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section6033",
    "agencyUrl": "https://www.irs.gov/forms-pubs/about-form-990-pf",
    "lastVerified": "2026-08-26",
    "status": "active",
    "effectiveFrom": "2020-01-01",
    "notes": "VERIFIED 2026-08-26 against irs.gov, for a rule that did not exist before (NEH-1146). WHO MUST FILE, from the Instructions for Form 990-PF: the return \"must be filed by\" private foundations exempt under section 501(a) and described in section 501(c)(3), taxable private foundations, organisations with a pending exemption application that agree to private foundation classification, and section 4947(a)(1) nonexempt charitable trusts treated as private foundations. THERE IS NO RECEIPTS OR ASSETS THRESHOLD — every private foundation files, at every size — which is why this rule's only condition is the foundation question itself. That is also what makes the gap this closes a real one: a foundation with modest receipts previously matched us-federal-form-990-n, a return the IRS lists it as not permitted to file. DUE DATE VERIFIED: \"the 15th day of the 5th month following the close of the foundation's tax year\", which is what this cadence produces — 15 May for a calendar-year filer. WEEKEND RULE VERIFIED from the same instructions: \"If the regular due date falls on a Saturday, Sunday, or legal holiday, file by the next business day\", so roll-forward is opted into because the agency says it, and holidayCalendar us-federal applies the eleven federal holidays of 5 U.S.C. 6103(a) rather than treating a holiday as an ordinary weekday. SCOPE: entityTypes is [\"501c3\"] because that is the vocabulary this pack has. A section 4947(a)(1) nonexempt charitable trust is NOT a 501(c)(3) and cannot currently be modelled here at all; it is out of scope rather than silently covered. NO FEE: filing Form 990-PF costs nothing, and the field is absent rather than zero so a consumer renders \"—\" instead of asserting $0.00. STATUS: active. docs/rule-verification/2026-08-26-private-foundations.md records exactly which pages were read, so a later verification pass can check this rule against the same sources rather than starting over.",
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
    "fee": {
      "basis": "conditional",
      "minimumMinorUnits": 2000,
      "maximumMinorUnits": 6000,
      "explanation": "Either $20 or $60, and which one is up to you. The annual report itself is $10 (WAC 434-112-085(8)(m)), plus a Charitable Asset Protection Account fee of $50 — reduced to $10 if the corporation certifies that its total gross revenue in the most recent fiscal year was under $500,000 (RCW 24.03A.960(2)(b)). The reduction turns on making that certification, not on the revenue alone, so a corporation that qualifies and does not certify pays $60.",
      "currency": "USD"
    },
    "citation": "RCW 24.03A.070; RCW 23.95.255(2); WAC 434-112-060(1); WAC 434-112-085(8)(m); RCW 24.03A.960(2)(b)",
    "citationUrl": "https://app.leg.wa.gov/rcw/default.aspx?cite=24.03A",
    "agencyUrl": "https://www.sos.wa.gov/corporations-charities/business-entities/maintain-business-compliance/annual-reports",
    "lastVerified": "2026-08-08",
    "status": "active",
    "effectiveFrom": "2022-01-01",
    "notes": "VERIFIED 2026-08-08 — requirement and due date settled; the fee is understood but still cannot be expressed. REQUIREMENT: RCW 24.03A.070 — \"Each domestic nonprofit corporation, and each registered foreign nonprofit corporation, shall deliver to the secretary of state for filing an annual report as required under RCW 23.95.255(2)\". (An earlier version of this rule cited RCW 24.03A.1010, which does not exist; that was corrected 2026-08-05.) DUE DATE NOW CITED: WAC 434-112-060(1) — an entity defined by RCW 23.95.105(6) and subject to RCW 23.95.255 \"must file an annual report accompanied by the fee established under WAC 434-112-085 by the last day of the month that the entity was formed or registered by the division\". This REPLACES the earlier note that the date was not settleable: RCW 23.95.255(4) delegates the date to the secretary of state, and WAC 434-112-060(1) is where the secretary set it, so the end-of-formation-month cadence is a regulation rather than unwritten practice. WAC 434-112-060(2) also confirms the 180-day early-filing window the agency advertises. A nonprofit corporation is an \"entity\" under RCW 23.95.105(6)(b), so this WAC reaches it. FEE STILL ABSENT, and the shape is now known precisely — it is NOT the flat \"$60 reduced to $20\" previously assumed. WAC 434-112-085(8)(m) sets the annual report at \"Ten dollars, plus the Charitable Asset Protection Account fee\", and RCW 24.03A.960(2)(b) sets that fee at \"fifty dollars per year, reduced to ten dollars if the corporation certifies that its total gross revenue in the most recent fiscal year was less than five hundred thousand dollars\". So $10 + $50 = $60, or $10 + $10 = $20 — matching the \"$20-60\" the SOS fee schedule shows. Two things this changes for the schema work in NEH-403: it is a base fee plus a conditional surcharge rather than one conditional amount, and the reduction turns on the corporation CERTIFYING its revenue, not on the revenue fact alone. A flat figure would still be wrong for one group or the other, and the group $60 overstates threefold is the larger one, so no fee is recorded. sos.wa.gov IS reachable by an ordinary browser; the earlier \"403 to every automated request\" note was a property of the fetcher used, not of the site, and a wrong path returns a plain 404 — so response status does carry information after all. The agency page linked here was opened and read. See NEH-402 and NEH-403. FEE RECORDED 2026-09-09 AS AN INEXACT FEE (NEH-403). The note above says the shape is \"a base fee plus a conditional surcharge rather than one conditional amount, and the reduction turns on the corporation CERTIFYING its revenue, not on the revenue fact alone\" — which is exactly why the conditional-fee list considered under NEH-403 was rejected. Keying the surcharge on grossRevenueMinorUnits would confidently show $20 to a corporation that qualifies but does not certify, and be wrong. The range $20-$60 with the reason stated is the honest form, and it matches the \"$20-60\" the SOS fee schedule publishes. Figures unchanged from the 2026-08-08 verification recorded above and in docs/rule-verification/2026-08-08-wa-annual-reports.md; no new primary-source reading was done for them on this date, and lastVerified is deliberately NOT bumped."
  },
] as const;
