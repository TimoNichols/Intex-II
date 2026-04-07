# Lighthouse tables → UI mapping and PHI notes

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

Expected JSON in `metric_payload_json` (camelCase when serialized from API):

```json
{
  "landingStats": [{ "value": "340+", "label": "Girls Served" }],
  "impactStats": [{ "value": "340+", "label": "Girls served since launch" }],
  "utilization": [{ "label": "Safe housing & residential", "pct": 42 }],
  "headline": "optional override",
  "summary": "optional body"
}
```

Anonymous `GET /api/public/impact` returns parsed payload plus snapshot metadata. Missing keys fall back to static copy on the frontend.

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
