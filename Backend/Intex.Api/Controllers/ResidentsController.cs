using Intex.Api.Data;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/residents")]
[Authorize(Roles = $"{DatabaseSeeder.RoleAdmin},{DatabaseSeeder.RoleStaff}")]
public class ResidentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ResidentsController(AppDbContext db) => _db = db;

    private bool IsAdmin => User.IsInRole(DatabaseSeeder.RoleAdmin);

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? q, [FromQuery] string? phase, [FromQuery] int skip = 0, [FromQuery] int take = 200)
    {
        take = Math.Clamp(take, 1, 500);
        skip = Math.Max(0, skip);

        // Load join in SQL; filter/sort by derived DisplayName/Phase in-memory (EF cannot translate static helpers).
        var rows = await (
            from r in _db.Residents.AsNoTracking()
            join sh in _db.Safehouses.AsNoTracking() on r.SafehouseId equals sh.SafehouseId into shJoin
            from sh in shJoin.DefaultIfEmpty()
            select new { r, SafehouseName = sh != null ? sh.Name : "—" }
        ).ToListAsync();

        IEnumerable<(Resident r, string SafehouseName)> filtered = rows.Select(x => (x.r, x.SafehouseName));

        if (!string.IsNullOrWhiteSpace(phase) && !phase.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            var p = phase.Trim();
            filtered = filtered.Where(x => ResidentLabels.MapPhase(x.r) == p);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            var s = q.Trim().ToLowerInvariant();
            filtered = filtered.Where(x =>
                ResidentLabels.DisplayName(x.r).ToLower().Contains(s) ||
                x.r.ResidentId.ToString() == s ||
                (x.SafehouseName != null && x.SafehouseName.ToLower().Contains(s)) ||
                (x.r.AssignedSocialWorker != null && x.r.AssignedSocialWorker.ToLower().Contains(s)) ||
                (x.r.CaseControlNo != null && x.r.CaseControlNo.ToLower().Contains(s)) ||
                (x.r.InternalCode != null && x.r.InternalCode.ToLower().Contains(s)));
        }

        var sorted = filtered
            .OrderByDescending(x => ResidentLabels.SortKey(x.r))
            .ThenBy(x => x.r.ResidentId)
            .ToList();

        var total = sorted.Count;
        var page = sorted.Skip(skip).Take(take).Select(x =>
        {
            var r = x.r;
            var updated = ResidentLabels.UpdatedAt(r);
            return new ResidentListItemDto(
                r.ResidentId,
                ResidentLabels.DisplayName(r),
                x.SafehouseName,
                ResidentLabels.MapPhase(r),
                r.AssignedSocialWorker ?? "—",
                updated.HasValue ? updated.Value.UtcDateTime.ToString("yyyy-MM-dd") : "—");
        }).ToList();

        return Ok(new PagedResult<ResidentListItemDto>(page, total, skip, take));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var row = await (
            from res in _db.Residents.AsNoTracking()
            join sh in _db.Safehouses.AsNoTracking() on res.SafehouseId equals sh.SafehouseId into shJoin
            from sh in shJoin.DefaultIfEmpty()
            where res.ResidentId == id
            select new { res, SafehouseName = sh != null ? sh.Name : "—" }).FirstOrDefaultAsync();

        if (row is null) return NotFound();

        var r = row.res;
        var updated = r.CreatedAt?.UtcDateTime.ToString("yyyy-MM-dd")
            ?? r.DateOfAdmission?.ToString("yyyy-MM-dd")
            ?? "—";

        var dto = new ResidentDetailDto(
            r.ResidentId,
            ResidentLabels.DisplayName(r),
            row.SafehouseName,
            ResidentLabels.MapPhase(r),
            r.AssignedSocialWorker ?? "—",
            updated,
            IsAdmin ? r.NotesRestricted : null,
            r.CaseStatus,
            r.ReintegrationStatus);

        return Ok(dto);
    }

    [HttpGet("{id:int}/process-recordings")]
    public async Task<IActionResult> ProcessRecordings(int id)
    {
        if (!await _db.Residents.AsNoTracking().AnyAsync(r => r.ResidentId == id))
            return NotFound();

        var rows = await _db.ProcessRecordings
            .AsNoTracking()
            .Where(p => p.ResidentId == id && p.SessionDate != null)
            .OrderByDescending(p => p.SessionDate)
            .ThenByDescending(p => p.RecordingId)
            .Select(p => new ProcessRecordingRowDto(
                p.SessionDate!.Value.ToString("yyyy-MM-dd"),
                p.SessionType ?? "—",
                p.SocialWorker ?? "—",
                p.SessionDurationMinutes.HasValue ? $"{p.SessionDurationMinutes} min" : "—",
                p.SessionNarrative,
                IsAdmin ? p.NotesRestricted : null))
            .ToListAsync();

        return Ok(rows);
    }

    [HttpGet("{id:int}/visitations")]
    public async Task<IActionResult> Visitations(int id)
    {
        if (!await _db.Residents.AsNoTracking().AnyAsync(r => r.ResidentId == id))
            return NotFound();

        var raw = await _db.HomeVisitations
            .AsNoTracking()
            .Where(v => v.ResidentId == id && v.VisitDate != null)
            .OrderByDescending(v => v.VisitDate)
            .ThenByDescending(v => v.VisitationId)
            .ToListAsync();

        var rows = raw.Select(v =>
        {
            var parts = new[] { v.VisitType, v.Purpose }.Where(x => !string.IsNullOrWhiteSpace(x));
            var vp = string.Join(" — ", parts);
            if (string.IsNullOrEmpty(vp)) vp = "—";
            return new VisitationRowDto(
                v.VisitDate!.Value.ToString("yyyy-MM-dd"),
                vp,
                v.LocationVisited ?? "—",
                v.VisitOutcome ?? (v.FollowUpNeeded == true ? "Follow-up needed" : "Completed"));
        }).ToList();

        return Ok(rows);
    }

    [HttpGet("{id:int}/conferences")]
    public async Task<IActionResult> Conferences(int id)
    {
        if (!await _db.Residents.AsNoTracking().AnyAsync(r => r.ResidentId == id))
            return NotFound();

        var rows = await _db.InterventionPlans
            .AsNoTracking()
            .Where(p => p.ResidentId == id && (p.CaseConferenceDate != null || p.TargetDate != null))
            .OrderByDescending(p => p.CaseConferenceDate ?? p.TargetDate)
            .ThenByDescending(p => p.PlanId)
            .Select(p => new ConferenceRowDto(
                (p.CaseConferenceDate ?? p.TargetDate)!.Value.ToString("yyyy-MM-dd"),
                (p.PlanCategory ?? p.PlanDescription) ?? "Conference",
                p.ServicesProvided ?? "—",
                p.Status ?? "—"))
            .ToListAsync();

        return Ok(rows);
    }
}

internal static class ResidentLabels
{
    public static DateTimeOffset SortKey(Resident r) =>
        r.CreatedAt
        ?? (r.DateOfAdmission != null
            ? new DateTimeOffset(r.DateOfAdmission.Value.ToDateTime(TimeOnly.MinValue))
            : DateTimeOffset.MinValue);

    public static DateTimeOffset? UpdatedAt(Resident r) =>
        r.CreatedAt
        ?? (r.DateOfAdmission != null
            ? new DateTimeOffset(r.DateOfAdmission.Value.ToDateTime(TimeOnly.MinValue))
            : null);

    public static string DisplayName(Resident r)
    {
        if (!string.IsNullOrWhiteSpace(r.InternalCode)) return r.InternalCode.Trim();
        if (!string.IsNullOrWhiteSpace(r.CaseControlNo)) return r.CaseControlNo.Trim();
        return $"Resident #{r.ResidentId}";
    }

    public static string MapPhase(Resident r)
    {
        if (r.DateClosed.HasValue) return "Alumni";

        var rs = r.ReintegrationStatus?.ToLowerInvariant() ?? "";
        if (rs.Contains("reintegrat") || rs.Contains("transition")) return "Reintegration";

        var cs = r.CaseStatus?.ToLowerInvariant() ?? "";
        if (cs.Contains("intake") || cs.Contains("admit")) return "Intake";
        if (cs.Contains("reintegrat")) return "Reintegration";
        if (cs.Contains("closed") || cs.Contains("discharg") || cs.Contains("alumni")) return "Alumni";

        return "Active care";
    }
}

public record ResidentListItemDto(
    int ResidentId,
    string DisplayName,
    string Safehouse,
    string Phase,
    string SocialWorker,
    string Updated);

public record ResidentDetailDto(
    int ResidentId,
    string DisplayName,
    string Safehouse,
    string Phase,
    string SocialWorker,
    string Updated,
    string? NotesRestricted,
    string? CaseStatus,
    string? ReintegrationStatus);

public record ProcessRecordingRowDto(
    string Date,
    string SessionType,
    string Clinician,
    string Duration,
    string? Narrative,
    string? NotesRestricted);

public record VisitationRowDto(string Date, string VisitorPurpose, string Location, string Status);

public record ConferenceRowDto(string Date, string Title, string Attendees, string Outcome);
