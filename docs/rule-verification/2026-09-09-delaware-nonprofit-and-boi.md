# Delaware nonprofit corporations, and BOI/FinCEN — 2026-09-09

**Scope: one new rule (`us-de-nonprofit-annual-report`), and one deliberate
non-rule (BOI/FinCEN).** NEH-194 named two gaps in the seed pack. The first is
closed by encoding a filing. The second is closed by establishing that there is
nothing to encode, which is the more valuable of the two answers: a rule
telling a nonprofit to file a beneficial-ownership report it is exempt from
would be exactly the wrong-obligation defect this pack exists to avoid.

| Rule | Status | Source |
|---|---|---|
| `us-de-nonprofit-annual-report` | **new, `status: draft`** | 8 Del. C. 502(a), 501(a)–(b), 391(a)(18), (j), 114(a), (d)(1); corp.delaware.gov |
| *BOI / FinCEN* | **assessed, no rule added** | 31 CFR 1010.380(c)(1), (c)(2)(xix), (c)(2)(xxiv); 91 FR 52528; 31 U.S.C. 5336(a)(11)(B); fincen.gov/boi |

Every URL below was opened on 2026-09-09. Where a fetch failed, that is
recorded rather than worked around — an unreachable source is a finding.

---

## Part 1 — Delaware nonprofit corporation annual report

### 1.1 Why the gap existed, and why it is not just an `entityTypes` widening

`packages/rules/us/de/` held `corporation-annual-report.json` (s-corp, c-corp,
b-corp) and `llc-annual-tax.json` (llc). WA and OR each had a nonprofit rule;
Delaware had none.

The tempting fix — add `nonprofit-corp` and `501c3` to the existing corporation
rule — is wrong, and wrong in the expensive direction. Both entities owe the
**same report on the same date**, but a stock corporation owes the franchise tax
of 8 Del. C. 503 (minimum $175 or $400, maximum $200,000) and an exempt
corporation owes **no franchise tax at all**. Merging them would show a charity
an obligation whose real cost belongs to somebody else. Hence a separate rule,
and hence the paired fixtures described in §1.6.

### 1.2 Delaware has no separate nonprofit act

This is the fact the whole rule rests on, and it is why the ordinary corporation
sections reach a nonprofit at all. A Delaware nonprofit incorporates under
**Chapter 1 of Title 8 — the DGCL** — as a *nonstock* corporation.

Read at <https://delcode.delaware.gov/title8/c001/sc01/index.html>.

> **§ 114(a).** Except as otherwise provided in subsections (b) and (c) of this
> section, the provisions of this chapter and of chapter 5 of this title shall
> apply to nonstock corporations in the manner specified in the following
> paragraphs (a)(1)-(4) of this section:

> **§ 114(d)(1).** A "charitable nonstock corporation" is any nonprofit nonstock
> corporation that is exempt from taxation under § 501(c)(3) of the United
> States Internal Revenue Code [26 U.S.C. § 501(c)(3)], or any successor
> provisions.

**Chapter 5 is the franchise tax chapter, and § 114(a) applies it to nonstock
corporations by name.** The carve-outs were checked rather than assumed:

- **§ 114(b)(1)** lists sections that "apply to nonstock corporations by their
  terms". The only Chapter 5 section named is **§ 503** — named as *applying*,
  not as excluded.
- **§ 114(b)(2)** lists "... 391 and 502(a)(5) of this title". This excludes them
  from § 114(a)'s *translation* rules (stockholders → members, shares →
  memberships); it does not switch the sections off. § 391 does not need
  translating because § 391(a)(18) addresses exempt corporations expressly, and
  § 502(a)(5) is the directors item.
- **§ 114(c)(3)** excludes "subchapter V, subchapter VI (other than §§ 204 and
  205) and subchapter XV of this chapter" — subchapters of **Chapter 1**, not
  Chapter 5. Subchapter XV is Public Benefit Corporations (§§ 361–368).

Neither § 501 nor § 502 is carved out on any of the three paths.

### 1.3 The requirement and the due date

Read at <https://delcode.delaware.gov/title8/c005/index.html> (Title 8,
Chapter 5, Corporation Franchise Tax).

> **§ 502(a).** Annually on or before March 1, every corporation now existing or
> hereafter incorporated under Chapter 1 of this title or which has accepted the
> Constitution of this State, shall make an annual franchise tax report to the
> Secretary of State.

**"Every corporation" is unqualified.** Being excused from the tax is not being
excused from the report, and the statute nowhere says otherwise. This yields
`{ type: "annual", anchor: "calendar", month: 3, day: 1 }` — the same fixed date
the sibling corporation rule already encodes.

Corroborated by the agency, at <https://corp.delaware.gov/paytaxes/>:

> All active Domestic Corporation Annual Reports and Franchise Taxes for the
> prior year are due annually on or before March 1st

### 1.4 No franchise tax — and what makes the corporation "exempt"

> **§ 501(a).** [...] No such tax shall be paid by any exempt corporation, any
> banking corporation, savings bank, building and loan association or any
> captive insurance company licensed under Chapter 69 of Title 18, or any
> corporation for drainage and reclamation of lowlands.

The term is defined in the next subsection, and it is **not** simply "has
501(c)(3) status" — a Delaware question with a Delaware answer, tested rather
than assumed:

> **§ 501(b).** As used in this chapter, the term "exempt corporation" shall be
> defined as any corporation organized under Chapter 1 of this title that:
> (1) Is exempt from taxation under § 501(c) of the United States Internal
> Revenue Code (26 U.S.C. § 501(c)) or any similar provisions of the Internal
> Revenue Code, or any successor provisions; (2) Qualifies as a civic
> organization under § 8110(a)(1) of Title 9 or § 6840 of Title 16;
> (3) Qualifies as a charitable/fraternal organization under § 2593(1) of
> Title 6; (4) Is listed in § 8106(a) of Title 9; (5) Is organized primarily or
> exclusively for religious or charitable purposes, or is a religious
> corporation or purely charitable or educational association, or is a company,
> association or society, which, by its certificate of incorporation, has for
> its object the assistance of sick, needy or disabled members, or the defraying
> of funeral expenses of deceased members, or to provide for the wants of the
> widows or widowers and families after death of its members; or (6) a. Is
> organized not for profit; and b. No part of its net earnings inures to the
> benefit of any member or individual.

Six independent grounds, and the rule's two entity types sit inside them on
**two different ones**:

| `entityTypes` value | ground |
|---|---|
| `501c3` | § 501(b)(1) — exempt under IRC § 501(c) |
| `nonprofit-corp` | § 501(b)(6) — organized not for profit, no inurement |

So the rule is right even for a nonprofit corporation that holds no federal
determination letter. That is the question §1 of the ticket warned against
answering with 501(c)(3) status alone, and it is why both types are listed.

### 1.5 The fee — recorded here, unlike the sibling rule

> **§ 391(a)(18).** For receiving and filing and/or indexing an annual franchise
> tax report of a corporation provided for by § 502 of this title, a fee of $25
> shall be paid by exempt corporations and a fee of $50 shall be paid by all
> other corporations.

> **§ 391(j).** As used in this section, the term "exempt corporation" shall have
> the meaning given to it in § 501(b) of this title.

Read at <https://delcode.delaware.gov/title8/c001/sc18/index.html>.

The agency's fee page agrees, at <https://corp.delaware.gov/paytaxes/>:

> Exempt Domestic Corporations – $25.00.

> Non-Exempt Domestic Corporations – $50.00.

**This is the one place where recording a fee is correct and the sibling rule's
silence is also correct.** `us-de-corporation-annual-report` deliberately
carries no `fee`, because a stock corporation's real cost is a computed
franchise tax the schema cannot hold. An exempt corporation owes no franchise
tax at all, so the $25 report fee **is** the entire cost — flat, statutory, and
safe to show. The fee shape needed nothing new;
`packages/rules/schema/rule.v1.json` was not touched.

**What `effectiveFrom: 2020-01-01` claims, and what it does not.** It matches
the two sibling Delaware rules and is a conservative floor for the *reporting
obligation*, which § 502 has imposed in substantially this form since 21 Del.
Laws, c. 166 (1899). It is **not** a sourced claim about when the $25 figure
took effect. § 391's session-law history runs to 85 Del. Laws, c. 273; that
session law was not read. The archived year-by-year code editions that would
settle it are on `law.justia.com`, which **returned HTTP 403** — and would not
have been used regardless, being a secondary source. The $25 is verified as the
**current** text of § 391(a)(18) on 2026-09-09 plus the agency's own fee page
the same day. Anyone needing a *historical* fee for a prior year must read the
session law first.

### 1.6 Fixtures — one that triggers it, one that does not

Both in `packages/engine/test/fixtures/entities.ts`.

- **`DE_NONPROFIT`** ("Example Brandywine Literacy Project") — a Delaware
  501(c)(3) nonstock corporation. Owes `us-de-nonprofit-annual-report` on
  `2026-03-01`.
- **`DE_CORP`** ("Example Nautilus Robotics Inc.", already present) — the
  near-miss, and about as near as one gets: **same state, same due date, same
  calendar anchor, differing only in entity type.** It must *not* owe the
  nonprofit report.

`packages/engine/test/rule-packs.test.ts` asserts the pair in **both**
directions, which is the point — a single-direction assertion would pass with a
rule that fires for everybody or for nobody:

1. `DE_NONPROFIT` owes the nonprofit report, due `2026-03-01`.
2. `DE_NONPROFIT` does **not** owe `us-de-corporation-annual-report` — the
   franchise-tax rule it is exempt from, and the specific defect a widened
   `entityTypes` would have introduced.
3. `DE_CORP` does **not** owe `us-de-nonprofit-annual-report`.
4. The fee is pinned at `2_500` minor units, alongside the existing assertions
   that pin the DE LLC's $400 and WA's $40.

### 1.7 What was NOT verified

- **The late penalty is not modelled.** § 502(c): a corporation that fails to
  file "shall pay the sum of $200 to be recovered by adding that amount to the
  franchise tax". The schema has no penalty field; the sibling rule records the
  same fact the same way.
- **No `weekendRule`.** Neither § 502 nor the agency page says what happens when
  1 March falls on a weekend, so nothing is asserted. Guessing a direction would
  invent a legal position the rule never checked.
- **Foreign nonprofit corporations qualified to do business in Delaware** are not
  covered. § 391(a)(8) sets a separate $250 annual report fee for a foreign
  corporation with a **30 June** deadline; that is a different filing and would
  need its own rule and its own reading.
- **`corp.delaware.gov` refuses `curl`** — it answers HTTP 200 with a WAF page
  ("Request Rejected ... Your support ID is"). The quotations above came from a
  browser-equivalent fetch of the same URL, which succeeded. The status code
  carries no information here; the body does.

---

## Part 2 — BOI / FinCEN: assessed, and deliberately not encoded

The ticket asked whether beneficial-ownership reporting is "currently in force"
for this pack's audience. **It is not**, and the answer is now
over-determined — four independent grounds, each sufficient on its own.

### 2.1 The regulation no longer defines a domestic reporting company

Read at
<https://www.ecfr.gov/current/title-31/subtitle-B/chapter-X/part-1010/subpart-C/section-1010.380>.

> **§ 1010.380(c)(1)** Definition of reporting company. For purposes of this
> section, the term "reporting company" means:
> **(i) [Reserved]**
> (ii) Any entity that is: (A) A corporation, limited liability company, or
> other entity; (B) **Formed under the law of a foreign country**; and
> (C) Registered to do business in any State or tribal jurisdiction by the
> filing of a document with a secretary of state or any similar office under the
> law of that State or Indian tribe.

Paragraph (c)(1)(i) is where the domestic reporting company used to be defined.
It is **`[Reserved]`**. The only surviving limb requires formation under
**foreign** law.

The same shift shows in the report contents at (b)(1)(i)(D), which now asks for
"**The foreign jurisdiction of formation** of the reporting company" — a field
that would be meaningless if domestic entities were still in scope.

### 2.2 And separately, it exempts domestic entities by name

> **§ 1010.380(c)(2)(xxiv)** Domestic entity. Any entity that is: (A) A
> corporation, limited liability company, or other entity; and (B) Created by
> the filing of a document with a secretary of state or any similar office under
> the law of a State or Indian tribe.

Belt and braces: even read into the definition, a domestic entity is exempt.

### 2.3 And separately again, 501(c) organisations are exempt

> **§ 1010.380(c)(2)(xix)** Tax-exempt entity. Any entity that is: (A) An
> organization that is described in section 501(c) of the Internal Revenue Code
> of 1986 (Code) (determined without regard to section 508(a) of the Code) and
> exempt from tax under section 501(a) of the Code, except that in the case of
> any such organization that ceases to be described in section 501(c) and exempt
> from tax under section 501(a), such organization shall be considered to
> continue to be described in this paragraph (c)(1)(xix)(A) for the 180-day
> period beginning on the date of the loss of such tax-exempt status; (B) A
> political organization, as defined in section 527(e)(1) of the Code, that is
> exempt from tax under section 527(a) of the Code; or (C) A trust described in
> paragraph (1) or (2) of section 4947(a) of the Code.

This is the ground that would still hold for a 501(c)(3) even if it had somehow
been formed abroad. The ticket's pointer to the statutory exemption list is
confirmed at **31 U.S.C. 5336(a)(11)(B)**, read at
<https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title31-section5336&num=0&edition=prelim>
— clause (xix) is the tax-exempt entity, and clause (xxiv) is the Secretary's
authority to exempt a "class of entities", which is the authority FinCEN used.

**Note the statute and the regulation do not say the same thing**, and that
distinction matters for anyone re-checking this later: 31 U.S.C. 5336 still
*defines* reporting companies to include domestic entities. What removed the
obligation is the implementing regulation, issued under the (a)(11)(B)(xxiv)
exemption power. So reading only the statute would give the opposite answer.

### 2.4 The change is final, not interim

The amendment note on § 1010.380 reads:

> [87 FR 59591, Sept. 30, 2022, as amended at 88 FR 76997, Nov. 8, 2023;
> 88 FR 83504, Nov. 30, 2023; 89 FR 83783, Oct. 18, 2024; **90 FR 13697,
> Mar. 26, 2025**; **91 FR 52528, Aug. 14, 2026**]

The March 2025 entry is the interim final rule. **The August 2026 entry is the
final rule**, read at
<https://www.govinfo.gov/content/pkg/FR-2026-08-14/pdf/2026-16576.pdf>
(91 FR 52508 et seq., RIN 1506-AB67):

> **ACTION:** Final rule.

> **SUMMARY:** FinCEN is issuing this final rule to adopt as final and with
> certain limited changes the interim final rule issued on March 26, 2025, which
> narrowed beneficial ownership information (BOI) reporting requirements under
> FinCEN's regulations implementing the Corporate Transparency Act (CTA).

> **DATES:** This rule is effective August 14, 2026.

And on the mechanism, from the same document:

> The IFR did so by excluding all domestic entities from 31 CFR 1010.380's
> definition of "reporting company" pursuant to the Secretary's authority under
> 31 U.S.C. 5336(a)(11)(B)(xxiv) of the CTA [...] to exempt "class[es] of
> entities" from BOI reporting obligations if the Secretary determines that
> collecting this BOI "would not serve the public interest" and "would not be
> highly useful in national security, intelligence, and law enforcement agency
> efforts."

> The IFR eliminated domestic entities from the definition of a reporting
> company. It also added language under which any entity that fit the old
> definition of a domestic reporting company would now be exempted from the new
> definition.

**This is why the question had to be re-read rather than answered from memory.**
BOI has been in force, then suspended from enforcement, then narrowed by interim
rule, then finalised — four states in under two years. Any summary older than
14 August 2026 is describing a rule that no longer exists.

### 2.5 The agency's own page

<https://www.fincen.gov/boi>:

> All entities created in the United States — including those previously known
> as "domestic reporting companies" — and their beneficial owners are now exempt
> from the requirement to report beneficial ownership information (BOI)

> U.S. companies are exempt from the Beneficial Ownership Information (BOI)
> reporting requirements and therefore, are no longer required to file BOI
> reports.

### 2.6 Currency of the text read

The eCFR snapshot quoted above is current — confirmed against the versioner API
at <https://www.ecfr.gov/api/versioner/v1/titles.json>, which reports Title 31
`latest_amended_on: 2026-08-26`, `up_to_date_as_of: 2026-09-04`. So the
`[Reserved]` at (c)(1)(i) is the live text, not a stale render.

`https://www.ecfr.gov/current/...` **redirects an automated fetch to
`unblock.federalregister.gov`**; the text was obtained from the eCFR renderer
API for the same section instead. Recorded because the next person will hit it.

### 2.7 The conclusion, and the guard

Every entity this pack serves is formed in **Washington, Oregon or Delaware** —
i.e. "under the law of a State". **None of them is a reporting company**, and a
501(c)(3) is doubly exempt. **No BOI rule is added, and none should be.**

Because the failure mode here is *addition* rather than omission — someone
copying a compliance vendor's page that has not caught up with the August 2026
final rule — the absence is asserted rather than merely written down.
`packages/engine/test/rule-packs.test.ts` scans every rule's title, citation and
agency for `fincen`, `beneficial ownership`, `1010.380` and
`corporate transparency`, and requires the match set to be empty. It carries the
citations above, so anyone who trips it is sent to the rule text rather than
back to a vendor.

---

## Pack state after this change

`npm run rules:validate` reports **15 rules checked, 15 distinct ids, 0 errors,
0 warnings; 1 draft**. That reaches the low end of the M1 target of 15–20
hand-verified rules.

Coverage of the M1 grid (WA, OR, DE × 501(c)(3), LLC, S-Corp) is now:

| | 501(c)(3) / nonprofit | LLC | S-Corp / C-Corp |
|---|---|---|---|
| **WA** | ✅ annual report (+ 2 charity registrations) | ✅ | ✅ |
| **OR** | ✅ | ✅ | ✅ |
| **DE** | ✅ **new** | ✅ | ✅ |

Plus four federal returns (990, 990-EZ, 990-N, 990-PF). **The jurisdiction ×
entity-type grid is complete.** What remains is depth rather than breadth, and
the two candidates are named here as candidates only — neither was researched
in this pass, and neither should be treated as an established gap until someone
reads the primary source:

- **Charity registration outside Washington.** WA has two rules
  (`charitable-solicitation-registration`, `charitable-trust-registration`) and
  OR and DE have none. Whether that is a gap or the correct answer depends on
  what each state actually requires, which was **not** checked here.
- **Foreign-qualified entities.** Every rule in the pack addresses a *domestic*
  entity. The Delaware reading above turned up 8 Del. C. 391(a)(8), a $250
  annual report for a foreign corporation due **30 June** — a different filing
  on a different date, deliberately not encoded (see §1.7).
