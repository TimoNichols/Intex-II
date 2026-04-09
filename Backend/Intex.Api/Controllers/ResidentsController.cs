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

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? q,
        [FromQuery] string? caseStatus,
        [FromQuery] int? safehouseId,
        [FromQuery] string? caseCategory,
        [FromQuery] string? assignedSocialWorker,
        [FromQuery] string? reintegrationStatus,
        [FromQuery] string? currentRiskLevel,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 25)
    {
        take = Math.Clamp(take, 1, 500);
        skip = Math.Max(0, skip);

        var query = _db.Residents.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(caseStatus))
        {
            var value = caseStatus.Trim().ToLowerInvariant();
            query = query.Where(r => r.CaseStatus != null && r.CaseStatus.ToLower() == value);
        }

        if (safehouseId.HasValue)
            query = query.Where(r => r.SafehouseId == safehouseId.Value);

        if (!string.IsNullOrWhiteSpace(caseCategory))
        {
            var value = caseCategory.Trim().ToLowerInvariant();
            query = query.Where(r => r.CaseCategory != null && r.CaseCategory.ToLower() == value);
        }

        if (!string.IsNullOrWhiteSpace(assignedSocialWorker))
        {
            var value = assignedSocialWorker.Trim().ToLowerInvariant();
            query = query.Where(r => r.AssignedSocialWorker != null && r.AssignedSocialWorker.ToLower() == value);
        }

        if (!string.IsNullOrWhiteSpace(reintegrationStatus))
        {
            var value = reintegrationStatus.Trim().ToLowerInvariant();
            query = query.Where(r => r.ReintegrationStatus != null && r.ReintegrationStatus.ToLower() == value);
        }

        if (!string.IsNullOrWhiteSpace(currentRiskLevel))
        {
            var value = currentRiskLevel.Trim().ToLowerInvariant();
            query = query.Where(r => r.CurrentRiskLevel != null && r.CurrentRiskLevel.ToLower() == value);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            var s = q.Trim().ToLowerInvariant();
            query = query.Where(r =>
                (r.CaseControlNo != null && r.CaseControlNo.ToLower().Contains(s)) ||
                (r.InternalCode != null && r.InternalCode.ToLower().Contains(s)) ||
                (r.ReferringAgencyPerson != null && r.ReferringAgencyPerson.ToLower().Contains(s)));
        }

        var total = await query.CountAsync();

        var pageBase = await (
            from r in query
            join sh in _db.Safehouses.AsNoTracking() on r.SafehouseId equals sh.SafehouseId into shJoin
            from sh in shJoin.DefaultIfEmpty()
            orderby r.DateOfAdmission descending, r.ResidentId
            select new { r, SafehouseName = sh != null ? sh.Name : "—" }
        )
        .Skip(skip)
        .Take(take)
        .ToListAsync();

        var page = pageBase.Select(x =>
        {
            var r = x.r;
            return new ResidentListItemDtoV2(
                r.ResidentId,
                r.CaseControlNo,
                r.InternalCode,
                ResidentLabels.DisplayCode(r),
                r.CaseStatus,
                r.CaseCategory,
                x.SafehouseName,
                r.AssignedSocialWorker,
                r.DateOfAdmission.HasValue ? r.DateOfAdmission.Value.ToString("yyyy-MM-dd") : null,
                r.CurrentRiskLevel,
                r.ReintegrationStatus);
        }).ToList();

        return Ok(new PagedResult<ResidentListItemDtoV2>(page, total, skip, take));
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
        var dto = new ResidentDetailDtoV2(
            r.ResidentId,
            r.CaseControlNo,
            r.InternalCode,
            ResidentLabels.DisplayCode(r),
            row.SafehouseName,
            r.SafehouseId,
            r.CaseStatus,
            r.CaseCategory,
            r.AssignedSocialWorker,
            r.DateOfAdmission?.ToString("yyyy-MM-dd"),
            r.CurrentRiskLevel,
            r.ReintegrationStatus,
            r.Sex,
            r.DateOfBirth?.ToString("yyyy-MM-dd"),
            r.BirthStatus,
            r.PlaceOfBirth,
            r.Religion,
            r.SubCatOrphaned,
            r.SubCatTrafficked,
            r.SubCatChildLabor,
            r.SubCatPhysicalAbuse,
            r.SubCatSexualAbuse,
            r.SubCatOsaec,
            r.SubCatCicl,
            r.SubCatAtRisk,
            r.SubCatStreetChild,
            r.SubCatChildWithHiv,
            r.IsPwd,
            r.PwdType,
            r.HasSpecialNeeds,
            r.SpecialNeedsDiagnosis,
            r.FamilyIs4ps,
            r.FamilySoloParent,
            r.FamilyIndigenous,
            r.FamilyParentPwd,
            r.FamilyInformalSettler,
            r.AgeUponAdmission,
            r.PresentAge,
            r.LengthOfStay,
            r.ReferralSource,
            r.ReferringAgencyPerson,
            r.DateCaseStudyPrepared?.ToString("yyyy-MM-dd"),
            r.DateColbRegistered?.ToString("yyyy-MM-dd"),
            r.DateColbObtained?.ToString("yyyy-MM-dd"),
            r.InitialCaseAssessment,
            r.ReintegrationType,
            r.InitialRiskLevel,
            r.DateEnrolled?.ToString("yyyy-MM-dd"),
            r.DateClosed?.ToString("yyyy-MM-dd"));

        return Ok(dto);
    }

    [HttpPost]
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    public async Task<IActionResult> Create([FromBody] ResidentUpsertRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.InternalCode) && string.IsNullOrWhiteSpace(req.CaseControlNo))
            return BadRequest(new { message = "Provide at least caseControlNo or internalCode." });

        var resident = new Resident();
        ApplyResidentUpsert(resident, req);
        resident.CreatedAt = DateTimeOffset.UtcNow;

        _db.Residents.Add(resident);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = resident.ResidentId }, new { residentId = resident.ResidentId });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    public async Task<IActionResult> Update(int id, [FromBody] ResidentUpsertRequest req)
    {
        var resident = await _db.Residents.FirstOrDefaultAsync(r => r.ResidentId == id);
        if (resident is null) return NotFound();

        ApplyResidentUpsert(resident, req);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    public async Task<IActionResult> Delete(int id)
    {
        var resident = await _db.Residents.FirstOrDefaultAsync(r => r.ResidentId == id);
        if (resident is null) return NotFound();
        _db.Residents.Remove(resident);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:int}/process-recordings")]
    public async Task<IActionResult> ProcessRecordings(
        int id,
        [FromQuery] string? worker,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 25,
        [FromQuery] string sort = "desc")
    {
        if (!await _db.Residents.AsNoTracking().AnyAsync(r => r.ResidentId == id))
            return NotFound();

        take = Math.Clamp(take, 1, 200);
        skip = Math.Max(0, skip);
        var query = _db.ProcessRecordings.AsNoTracking().Where(p => p.ResidentId == id);

        if (!string.IsNullOrWhiteSpace(worker))
        {
            var w = worker.Trim().ToLowerInvariant();
            query = query.Where(p => p.SocialWorker != null && p.SocialWorker.ToLower() == w);
        }
        if (DateOnly.TryParse(fromDate, out var from))
            query = query.Where(p => p.SessionDate >= from);
        if (DateOnly.TryParse(toDate, out var to))
            query = query.Where(p => p.SessionDate <= to);

        query = sort.Equals("asc", StringComparison.OrdinalIgnoreCase)
            ? query.OrderBy(p => p.SessionDate).ThenBy(p => p.RecordingId)
            : query.OrderByDescending(p => p.SessionDate).ThenByDescending(p => p.RecordingId);

        var total = await query.CountAsync();
        var rows = await query
            .Skip(skip)
            .Take(take)
            .Select(p => new ProcessRecordingListItemDto(
                p.RecordingId,
                p.SessionDate.HasValue ? p.SessionDate.Value.ToString("yyyy-MM-dd") : null,
                p.SocialWorker,
                p.SessionType,
                p.SessionDurationMinutes,
                p.EmotionalStateObserved,
                p.EmotionalStateEnd,
                p.ProgressNoted,
                p.ConcernsFlagged,
                p.ReferralMade))
            .ToListAsync();

        return Ok(new PagedResult<ProcessRecordingListItemDto>(rows, total, skip, take));
    }

    [HttpGet("{id:int}/process-recordings/{recordingId:int}")]
    public async Task<IActionResult> ProcessRecordingById(int id, int recordingId)
    {
        if (!await _db.Residents.AsNoTracking().AnyAsync(r => r.ResidentId == id))
            return NotFound();

        var row = await _db.ProcessRecordings.AsNoTracking()
            .Where(p => p.ResidentId == id && p.RecordingId == recordingId)
            .Select(p => new ProcessRecordingDetailDto(
                p.RecordingId,
                p.ResidentId,
                p.SessionDate.HasValue ? p.SessionDate.Value.ToString("yyyy-MM-dd") : null,
                p.SocialWorker,
                p.SessionType,
                p.SessionDurationMinutes,
                p.EmotionalStateObserved,
                p.EmotionalStateEnd,
                p.SessionNarrative,
                p.InterventionsApplied,
                p.FollowUpActions,
                p.ProgressNoted,
                p.ConcernsFlagged,
                p.ReferralMade))
            .FirstOrDefaultAsync();

        if (row is null) return NotFound();
        return Ok(row);
    }

    [HttpPost("{id:int}/process-recordings")]
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    public async Task<IActionResult> CreateProcessRecording(int id, [FromBody] ProcessRecordingUpsertRequest req)
    {
        if (!await _db.Residents.AsNoTracking().AnyAsync(r => r.ResidentId == id))
            return NotFound();

        var row = new ProcessRecording { ResidentId = id };
        ApplyProcessRecordingUpsert(row, req);
        _db.ProcessRecordings.Add(row);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(ProcessRecordingById), new { id, recordingId = row.RecordingId }, new { row.RecordingId });
    }

    [HttpPut("{id:int}/process-recordings/{recordingId:int}")]
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    public async Task<IActionResult> UpdateProcessRecording(int id, int recordingId, [FromBody] ProcessRecordingUpsertRequest req)
    {
        var row = await _db.ProcessRecordings.FirstOrDefaultAsync(p => p.ResidentId == id && p.RecordingId == recordingId);
        if (row is null) return NotFound();
        ApplyProcessRecordingUpsert(row, req);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}/process-recordings/{recordingId:int}")]
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    public async Task<IActionResult> DeleteProcessRecording(int id, int recordingId)
    {
        var row = await _db.ProcessRecordings.FirstOrDefaultAsync(p => p.ResidentId == id && p.RecordingId == recordingId);
        if (row is null) return NotFound();
        _db.ProcessRecordings.Remove(row);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:int}/home-visitations")]
    public async Task<IActionResult> HomeVisitations(
        int id,
        [FromQuery] string? visitType,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 25)
    {
        if (!await _db.Residents.AsNoTracking().AnyAsync(r => r.ResidentId == id))
            return NotFound();

        take = Math.Clamp(take, 1, 200);
        skip = Math.Max(0, skip);
        var query = _db.HomeVisitations.AsNoTracking().Where(v => v.ResidentId == id);
        if (!string.IsNullOrWhiteSpace(visitType))
        {
            var vt = visitType.Trim().ToLowerInvariant();
            query = query.Where(v => v.VisitType != null && v.VisitType.ToLower() == vt);
        }
        if (DateOnly.TryParse(fromDate, out var from))
            query = query.Where(v => v.VisitDate >= from);
        if (DateOnly.TryParse(toDate, out var to))
            query = query.Where(v => v.VisitDate <= to);

        var total = await query.CountAsync();
        var rows = await query.OrderByDescending(v => v.VisitDate).ThenByDescending(v => v.VisitationId)
            .Skip(skip).Take(take)
            .Select(v => new HomeVisitationListItemDto(
                v.VisitationId,
                v.VisitDate.HasValue ? v.VisitDate.Value.ToString("yyyy-MM-dd") : null,
                v.SocialWorker,
                v.VisitType,
                v.LocationVisited,
                v.FamilyCooperationLevel,
                v.SafetyConcernsNoted,
                v.FollowUpNeeded,
                v.VisitOutcome))
            .ToListAsync();
        return Ok(new PagedResult<HomeVisitationListItemDto>(rows, total, skip, take));
    }

    [HttpGet("{id:int}/home-visitations/{visitationId:int}")]
    public async Task<IActionResult> HomeVisitationById(int id, int visitationId)
    {
        var row = await _db.HomeVisitations.AsNoTracking()
            .Where(v => v.ResidentId == id && v.VisitationId == visitationId)
            .Select(v => new HomeVisitationDetailDto(
                v.VisitationId,
                v.ResidentId,
                v.VisitDate.HasValue ? v.VisitDate.Value.ToString("yyyy-MM-dd") : null,
                v.SocialWorker,
                v.VisitType,
                v.LocationVisited,
                v.FamilyMembersPresent,
                v.Purpose,
                v.Observations,
                v.FamilyCooperationLevel,
                v.SafetyConcernsNoted,
                v.FollowUpNeeded,
                v.FollowUpNotes,
                v.VisitOutcome))
            .FirstOrDefaultAsync();
        if (row is null) return NotFound();
        return Ok(row);
    }

    [HttpPost("{id:int}/home-visitations")]
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    public async Task<IActionResult> CreateHomeVisitation(int id, [FromBody] HomeVisitationUpsertRequest req)
    {
        if (!await _db.Residents.AsNoTracking().AnyAsync(r => r.ResidentId == id))
            return NotFound();
        var row = new HomeVisitation { ResidentId = id };
        ApplyHomeVisitationUpsert(row, req);
        _db.HomeVisitations.Add(row);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(HomeVisitationById), new { id, visitationId = row.VisitationId }, new { row.VisitationId });
    }

    [HttpPut("{id:int}/home-visitations/{visitationId:int}")]
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    public async Task<IActionResult> UpdateHomeVisitation(int id, int visitationId, [FromBody] HomeVisitationUpsertRequest req)
    {
        var row = await _db.HomeVisitations.FirstOrDefaultAsync(v => v.ResidentId == id && v.VisitationId == visitationId);
        if (row is null) return NotFound();
        ApplyHomeVisitationUpsert(row, req);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}/home-visitations/{visitationId:int}")]
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    public async Task<IActionResult> DeleteHomeVisitation(int id, int visitationId)
    {
        var row = await _db.HomeVisitations.FirstOrDefaultAsync(v => v.ResidentId == id && v.VisitationId == visitationId);
        if (row is null) return NotFound();
        _db.HomeVisitations.Remove(row);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:int}/intervention-plans")]
    public async Task<IActionResult> InterventionPlans(int id, [FromQuery] bool upcomingOnly = false)
    {
        if (!await _db.Residents.AsNoTracking().AnyAsync(r => r.ResidentId == id))
            return NotFound();

        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var query = _db.InterventionPlans.AsNoTracking().Where(p => p.ResidentId == id);
        if (upcomingOnly)
        {
            query = query.Where(p =>
                p.TargetDate.HasValue &&
                p.TargetDate >= today &&
                p.Status != null &&
                p.Status.ToLower() == "active");
        }

        var rows = await query
            .OrderByDescending(p => p.CaseConferenceDate ?? p.TargetDate)
            .ThenByDescending(p => p.PlanId)
            .Select(p => new InterventionPlanItemDto(
                p.PlanId,
                p.ResidentId,
                p.PlanCategory,
                p.PlanDescription,
                p.ServicesProvided,
                p.TargetValue,
                p.TargetDate.HasValue ? p.TargetDate.Value.ToString("yyyy-MM-dd") : null,
                p.Status,
                p.CaseConferenceDate.HasValue ? p.CaseConferenceDate.Value.ToString("yyyy-MM-dd") : null,
                p.CreatedAt,
                p.UpdatedAt))
            .ToListAsync();

        return Ok(rows);
    }

    [HttpPost("{id:int}/intervention-plans")]
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    public async Task<IActionResult> CreateInterventionPlan(int id, [FromBody] InterventionPlanUpsertRequest req)
    {
        if (!await _db.Residents.AsNoTracking().AnyAsync(r => r.ResidentId == id))
            return NotFound();
        var row = new InterventionPlan { ResidentId = id, CreatedAt = DateTimeOffset.UtcNow };
        ApplyInterventionPlanUpsert(row, req);
        _db.InterventionPlans.Add(row);
        await _db.SaveChangesAsync();
        return Ok(new { row.PlanId });
    }

    [HttpPut("{id:int}/intervention-plans/{planId:int}")]
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    public async Task<IActionResult> UpdateInterventionPlan(int id, int planId, [FromBody] InterventionPlanUpsertRequest req)
    {
        var row = await _db.InterventionPlans.FirstOrDefaultAsync(p => p.ResidentId == id && p.PlanId == planId);
        if (row is null) return NotFound();
        ApplyInterventionPlanUpsert(row, req);
        row.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("/api/safehouses")]
    public async Task<IActionResult> Safehouses()
    {
        var items = await _db.Safehouses.AsNoTracking()
            .OrderBy(s => s.Name)
            .Select(s => new SafehouseOptionDto(s.SafehouseId, s.Name, s.City, s.Region, s.Status))
            .ToListAsync();
        return Ok(items);
    }

    private static void ApplyResidentUpsert(Resident resident, ResidentUpsertRequest req)
    {
        resident.CaseControlNo = req.CaseControlNo?.Trim();
        resident.InternalCode = req.InternalCode?.Trim();
        resident.SafehouseId = req.SafehouseId;
        resident.CaseStatus = req.CaseStatus?.Trim();
        resident.Sex = req.Sex?.Trim();
        resident.DateOfBirth = ParseDate(req.DateOfBirth);
        resident.BirthStatus = req.BirthStatus?.Trim();
        resident.PlaceOfBirth = req.PlaceOfBirth?.Trim();
        resident.Religion = req.Religion?.Trim();
        resident.CaseCategory = req.CaseCategory?.Trim();
        resident.SubCatOrphaned = req.SubCatOrphaned;
        resident.SubCatTrafficked = req.SubCatTrafficked;
        resident.SubCatChildLabor = req.SubCatChildLabor;
        resident.SubCatPhysicalAbuse = req.SubCatPhysicalAbuse;
        resident.SubCatSexualAbuse = req.SubCatSexualAbuse;
        resident.SubCatOsaec = req.SubCatOsaec;
        resident.SubCatCicl = req.SubCatCicl;
        resident.SubCatAtRisk = req.SubCatAtRisk;
        resident.SubCatStreetChild = req.SubCatStreetChild;
        resident.SubCatChildWithHiv = req.SubCatChildWithHiv;
        resident.IsPwd = req.IsPwd;
        resident.PwdType = req.PwdType?.Trim();
        resident.HasSpecialNeeds = req.HasSpecialNeeds;
        resident.SpecialNeedsDiagnosis = req.SpecialNeedsDiagnosis?.Trim();
        resident.FamilyIs4ps = req.FamilyIs4ps;
        resident.FamilySoloParent = req.FamilySoloParent;
        resident.FamilyIndigenous = req.FamilyIndigenous;
        resident.FamilyParentPwd = req.FamilyParentPwd;
        resident.FamilyInformalSettler = req.FamilyInformalSettler;
        resident.DateOfAdmission = ParseDate(req.DateOfAdmission);
        resident.AgeUponAdmission = req.AgeUponAdmission?.Trim();
        resident.PresentAge = req.PresentAge?.Trim();
        resident.LengthOfStay = req.LengthOfStay?.Trim();
        resident.ReferralSource = req.ReferralSource?.Trim();
        resident.ReferringAgencyPerson = req.ReferringAgencyPerson?.Trim();
        resident.DateColbRegistered = ParseDate(req.DateColbRegistered);
        resident.DateColbObtained = ParseDate(req.DateColbObtained);
        resident.AssignedSocialWorker = req.AssignedSocialWorker?.Trim();
        resident.InitialCaseAssessment = req.InitialCaseAssessment?.Trim();
        resident.DateCaseStudyPrepared = ParseDate(req.DateCaseStudyPrepared);
        resident.ReintegrationType = req.ReintegrationType?.Trim();
        resident.ReintegrationStatus = req.ReintegrationStatus?.Trim();
        resident.InitialRiskLevel = req.InitialRiskLevel?.Trim();
        resident.CurrentRiskLevel = req.CurrentRiskLevel?.Trim();
        resident.DateEnrolled = ParseDate(req.DateEnrolled);
        resident.DateClosed = ParseDate(req.DateClosed);
    }

    private static void ApplyProcessRecordingUpsert(ProcessRecording row, ProcessRecordingUpsertRequest req)
    {
        row.SessionDate = ParseDate(req.SessionDate);
        row.SocialWorker = req.SocialWorker?.Trim();
        row.SessionType = req.SessionType?.Trim();
        row.SessionDurationMinutes = req.SessionDurationMinutes;
        row.EmotionalStateObserved = req.EmotionalStateObserved?.Trim();
        row.EmotionalStateEnd = req.EmotionalStateEnd?.Trim();
        row.SessionNarrative = req.SessionNarrative?.Trim();
        row.InterventionsApplied = req.InterventionsApplied?.Trim();
        row.FollowUpActions = req.FollowUpActions?.Trim();
        row.ProgressNoted = req.ProgressNoted;
        row.ConcernsFlagged = req.ConcernsFlagged;
        row.ReferralMade = req.ReferralMade;
    }

    private static void ApplyHomeVisitationUpsert(HomeVisitation row, HomeVisitationUpsertRequest req)
    {
        row.VisitDate = ParseDate(req.VisitDate);
        row.SocialWorker = req.SocialWorker?.Trim();
        row.VisitType = req.VisitType?.Trim();
        row.LocationVisited = req.LocationVisited?.Trim();
        row.FamilyMembersPresent = req.FamilyMembersPresent?.Trim();
        row.Purpose = req.Purpose?.Trim();
        row.Observations = req.Observations?.Trim();
        row.FamilyCooperationLevel = req.FamilyCooperationLevel?.Trim();
        row.SafetyConcernsNoted = req.SafetyConcernsNoted;
        row.FollowUpNeeded = req.FollowUpNeeded;
        row.FollowUpNotes = req.FollowUpNotes?.Trim();
        row.VisitOutcome = req.VisitOutcome?.Trim();
    }

    private static void ApplyInterventionPlanUpsert(InterventionPlan row, InterventionPlanUpsertRequest req)
    {
        row.PlanCategory = req.PlanCategory?.Trim();
        row.PlanDescription = req.PlanDescription?.Trim();
        row.ServicesProvided = req.ServicesProvided?.Trim();
        row.TargetValue = req.TargetValue;
        row.TargetDate = ParseDate(req.TargetDate);
        row.Status = req.Status?.Trim();
        row.CaseConferenceDate = ParseDate(req.CaseConferenceDate);
    }

    private static DateOnly? ParseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return DateOnly.TryParse(value, out var date) ? date : null;
    }
}

internal static class ResidentLabels
{
    public static string DisplayName(Resident r) => DisplayCode(r);

    public static string DisplayCode(Resident r)
    {
        if (!string.IsNullOrWhiteSpace(r.InternalCode)) return r.InternalCode.Trim();
        if (!string.IsNullOrWhiteSpace(r.CaseControlNo)) return r.CaseControlNo.Trim();
        return $"Resident #{r.ResidentId}";
    }
}

public record ResidentListItemDtoV2(
    int ResidentId,
    string? CaseControlNo,
    string? InternalCode,
    string DisplayCode,
    string? CaseStatus,
    string? CaseCategory,
    string Safehouse,
    string? AssignedSocialWorker,
    string? AdmissionDate,
    string? CurrentRiskLevel,
    string? ReintegrationStatus);

public record ResidentDetailDtoV2(
    int ResidentId,
    string? CaseControlNo,
    string? InternalCode,
    string DisplayCode,
    string Safehouse,
    int? SafehouseId,
    string? CaseStatus,
    string? CaseCategory,
    string? AssignedSocialWorker,
    string? DateOfAdmission,
    string? CurrentRiskLevel,
    string? ReintegrationStatus,
    string? Sex,
    string? DateOfBirth,
    string? BirthStatus,
    string? PlaceOfBirth,
    string? Religion,
    bool? SubCatOrphaned,
    bool? SubCatTrafficked,
    bool? SubCatChildLabor,
    bool? SubCatPhysicalAbuse,
    bool? SubCatSexualAbuse,
    bool? SubCatOsaec,
    bool? SubCatCicl,
    bool? SubCatAtRisk,
    bool? SubCatStreetChild,
    bool? SubCatChildWithHiv,
    bool? IsPwd,
    string? PwdType,
    bool? HasSpecialNeeds,
    string? SpecialNeedsDiagnosis,
    bool? FamilyIs4ps,
    bool? FamilySoloParent,
    bool? FamilyIndigenous,
    bool? FamilyParentPwd,
    bool? FamilyInformalSettler,
    string? AgeUponAdmission,
    string? PresentAge,
    string? LengthOfStay,
    string? ReferralSource,
    string? ReferringAgencyPerson,
    string? DateCaseStudyPrepared,
    string? DateColbRegistered,
    string? DateColbObtained,
    string? InitialCaseAssessment,
    string? ReintegrationType,
    string? InitialRiskLevel,
    string? DateEnrolled,
    string? DateClosed);

public record ProcessRecordingListItemDto(
    int RecordingId,
    string? SessionDate,
    string? SocialWorker,
    string? SessionType,
    int? SessionDurationMinutes,
    string? EmotionalStateObserved,
    string? EmotionalStateEnd,
    bool? ProgressNoted,
    bool? ConcernsFlagged,
    bool? ReferralMade);

public record ProcessRecordingDetailDto(
    int RecordingId,
    int? ResidentId,
    string? SessionDate,
    string? SocialWorker,
    string? SessionType,
    int? SessionDurationMinutes,
    string? EmotionalStateObserved,
    string? EmotionalStateEnd,
    string? SessionNarrative,
    string? InterventionsApplied,
    string? FollowUpActions,
    bool? ProgressNoted,
    bool? ConcernsFlagged,
    bool? ReferralMade);

public record HomeVisitationListItemDto(
    int VisitationId,
    string? VisitDate,
    string? SocialWorker,
    string? VisitType,
    string? LocationVisited,
    string? FamilyCooperationLevel,
    bool? SafetyConcernsNoted,
    bool? FollowUpNeeded,
    string? VisitOutcome);

public record HomeVisitationDetailDto(
    int VisitationId,
    int? ResidentId,
    string? VisitDate,
    string? SocialWorker,
    string? VisitType,
    string? LocationVisited,
    string? FamilyMembersPresent,
    string? Purpose,
    string? Observations,
    string? FamilyCooperationLevel,
    bool? SafetyConcernsNoted,
    bool? FollowUpNeeded,
    string? FollowUpNotes,
    string? VisitOutcome);

public record InterventionPlanItemDto(
    int PlanId,
    int? ResidentId,
    string? PlanCategory,
    string? PlanDescription,
    string? ServicesProvided,
    decimal? TargetValue,
    string? TargetDate,
    string? Status,
    string? CaseConferenceDate,
    DateTimeOffset? CreatedAt,
    DateTimeOffset? UpdatedAt);

public record SafehouseOptionDto(int SafehouseId, string Name, string? City, string? Region, string? Status);

public record ResidentUpsertRequest(
    string? CaseControlNo,
    string? InternalCode,
    int? SafehouseId,
    string? CaseStatus,
    string? Sex,
    string? DateOfBirth,
    string? BirthStatus,
    string? PlaceOfBirth,
    string? Religion,
    string? CaseCategory,
    bool? SubCatOrphaned,
    bool? SubCatTrafficked,
    bool? SubCatChildLabor,
    bool? SubCatPhysicalAbuse,
    bool? SubCatSexualAbuse,
    bool? SubCatOsaec,
    bool? SubCatCicl,
    bool? SubCatAtRisk,
    bool? SubCatStreetChild,
    bool? SubCatChildWithHiv,
    bool? IsPwd,
    string? PwdType,
    bool? HasSpecialNeeds,
    string? SpecialNeedsDiagnosis,
    bool? FamilyIs4ps,
    bool? FamilySoloParent,
    bool? FamilyIndigenous,
    bool? FamilyParentPwd,
    bool? FamilyInformalSettler,
    string? DateOfAdmission,
    string? AgeUponAdmission,
    string? PresentAge,
    string? LengthOfStay,
    string? ReferralSource,
    string? ReferringAgencyPerson,
    string? DateColbRegistered,
    string? DateColbObtained,
    string? AssignedSocialWorker,
    string? InitialCaseAssessment,
    string? DateCaseStudyPrepared,
    string? ReintegrationType,
    string? ReintegrationStatus,
    string? InitialRiskLevel,
    string? CurrentRiskLevel,
    string? DateEnrolled,
    string? DateClosed);

public record ProcessRecordingUpsertRequest(
    string? SessionDate,
    string? SocialWorker,
    string? SessionType,
    int? SessionDurationMinutes,
    string? EmotionalStateObserved,
    string? EmotionalStateEnd,
    string? SessionNarrative,
    string? InterventionsApplied,
    string? FollowUpActions,
    bool? ProgressNoted,
    bool? ConcernsFlagged,
    bool? ReferralMade);

public record HomeVisitationUpsertRequest(
    string? VisitDate,
    string? SocialWorker,
    string? VisitType,
    string? LocationVisited,
    string? FamilyMembersPresent,
    string? Purpose,
    string? Observations,
    string? FamilyCooperationLevel,
    bool? SafetyConcernsNoted,
    bool? FollowUpNeeded,
    string? FollowUpNotes,
    string? VisitOutcome);

public record InterventionPlanUpsertRequest(
    string? PlanCategory,
    string? PlanDescription,
    string? ServicesProvided,
    decimal? TargetValue,
    string? TargetDate,
    string? Status,
    string? CaseConferenceDate);
