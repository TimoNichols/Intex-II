# Harbor of Hope data tables → UI mapping and PHI notes

EF maps Supabase tables under [`Data/AppDbContext.cs`](../Data/AppDbContext.cs). These rows are excluded from migrations.

## Supporters (`supporters`) + Donations (`donations`)

| UI surface | Columns / source |
|------------|------------------|
| Donors list / profile name | `DisplayName`, `OrganizationName`, or `FirstName` + `LastName` |
| Email | `Email` |
| Lifetime / last gift | Aggregates from `donations.Amount`, `DonationDate` |
| Status pill | `Status` when set; else derived (Major / Active / Lapsed) from totals and recency |
| Giving history rows | `DonationDate`, `Amount`, `CampaignName`, `DonationType` |

## Residents (`residents`) + Safehouses (`safehouses`)

| UI surface | Columns / source |
|------------|------------------|
| Pseudonymous label | `InternalCode`, else `CaseControlNo`, else `Resident #{ResidentId}` |
| Safehouse | Join `safehouses.Name` via `SafehouseId` |
| Phase filter | Mapped from `CaseStatus`, `ReintegrationStatus`, `DateClosed` (see `ResidentsController`) |
| Social worker | `AssignedSocialWorker` |
| Updated | `CreatedAt` or `DateOfAdmission` (display date only) |

**PHI:** `NotesRestricted` is never returned to the client for Staff; Admin receives it only on explicit detail DTOs where needed. Process recording `NotesRestricted` follows the same rule.

## Process recordings (`process_recordings`)

| UI | Columns |
|----|---------|
| Date / type / clinician / duration | `SessionDate`, `SessionType`, `SocialWorker`, `SessionDurationMinutes` |
| Narrative (optional) | `SessionNarrative` — omit for Staff if policy tightens; currently included for Admin + Staff |
| Restricted | `NotesRestricted` — **Admin only** |

## Home visitations (`home_visitations`)

| UI | Columns |
|----|---------|
| Date | `VisitDate` |
| Visitor / purpose | `VisitType`, `Purpose` |
| Location | `LocationVisited` |
| Status | `VisitOutcome` or `FollowUpNeeded` |

## Conferences (MDT) — `intervention_plans`

| UI | Columns |
|----|---------|
| Date | `CaseConferenceDate` or `TargetDate` |
| Title | `PlanCategory` + `PlanDescription` (truncated) |
| Attendees / outcome | `ServicesProvided`, `Status` |

## Public impact (`public_impact_snapshots`)

Published rows (`IsPublished == true`, latest `PublishedAt` or `SnapshotDate`) drive marketing stats.

Expected JSON in `metric_payload_json` (camelCase in DB and API):

```json
{
  "landingStats": [{ "value": "340+", "label": "Girls Served" }],
  "impactStats": [{ "value": "340+", "label": "Girls served since launch" }],
  "utilization": [{ "label": "Safe housing & residential", "pct": 42 }],
  "landingHero": {
    "eyebrow": "501(c)(3) Nonprofit Organization",
    "titleLine1": "Restoring Safety.",
    "titleEmphasis": "Rebuilding Lives.",
    "sub": "Short hero paragraph shown on the home page."
  },
  "missionSection": {
    "sectionLabel": "Our Mission",
    "heading": "Everything a child needs to heal",
    "subtitle": "Optional intro under the heading."
  },
  "missionCards": [
    {
      "title": "Safe Homes",
      "description": "Card body text.",
      "iconKey": "home"
    }
  ],
  "journeySection": {
    "sectionLabel": "The Journey",
    "heading": "How we walk alongside every resident",
    "subtitle": "Optional."
  },
  "journeySteps": [{ "title": "Referral & Intake", "desc": "Step description." }],
  "testimonial": {
    "quote": "Quote text only — no PII.",
    "attribution": "Former resident, age 17"
  },
  "programTags": ["Education", "Counseling"],
  "trustStrip": ["Verified 501(c)(3)", "Secure Transactions"]
}
```

`iconKey` for mission cards is optional: `home` | `heart` | `refresh` (default `home`).

Row-level `headline` and `summary_text` on `public_impact_snapshots` still apply to the Impact page hero; `metric_payload_json` can also include legacy `headline` / `summary` keys for the payload object (not merged into the HTTP DTO unless you copy them into columns).

Anonymous `GET /api/public/impact` returns parsed payload plus snapshot metadata. The **landing page** only shows mission/journey/testimonial/trust sections when the corresponding arrays/objects exist in JSON; it does not invent metrics. See [`seed_public_impact_snapshot_example.sql`](seed_public_impact_snapshot_example.sql) for a sample insert.

## Dashboard aggregates

| Stat | Source |
|------|--------|
| Active residents | `residents` with `DateClosed == null` |
| Donors this year | Distinct `SupporterId` on `donations` in current calendar year |
| YTD program funds | Sum `donations.Amount` for current year |
| Open MDT actions | `intervention_plans` where `Status` is null or not completed/closed |

Activity feed blends recent donations, new residents, and upcoming/recent intervention plans.

## Identity users (`AspNetUsers`)

| UI | Source |
|----|--------|
| Name | `DisplayName` or `Email` |
| Email | `Email` |
| Role | First assigned role name |
| Status | Locked out → Locked; `EmailConfirmed` false → Invited; else Active |
