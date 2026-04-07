using Intex.Api.Data;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/donors")]
public class DonorController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _users;

    public DonorController(AppDbContext db, UserManager<ApplicationUser> users)
    {
        _db    = db;
        _users = users;
    }

    // -----------------------------------------------------------------------
    // GET endpoints
    // -----------------------------------------------------------------------

    /// <summary>
    /// Returns donation records from the lighthouse dataset.
    /// Admins see all; Donors see all (no personal link exists yet between
    /// an Identity account and a supporter_id).
    /// </summary>
    [Authorize(Roles = $"{DatabaseSeeder.RoleAdmin},{DatabaseSeeder.RoleDonor}")]
    [HttpGet("history")]
    public async Task<IActionResult> GetDonationHistory()
    {
        var donations = await _db.Donations
            .OrderByDescending(d => d.DonationDate)
            .Select(d => new
            {
                d.DonationId,
                d.SupporterId,
                d.DonationType,
                d.DonationDate,
                d.IsRecurring,
                d.CampaignName,
                d.ChannelSource,
                d.CurrencyCode,
                d.Amount,
                d.EstimatedValue,
                d.ImpactUnit,
                d.Notes,
                d.ReferralPostId
            })
            .ToListAsync();

        return Ok(donations);
    }

    /// <summary>
    /// Returns impact summary aggregated from the lighthouse donations table.
    /// </summary>
    [Authorize(Roles = $"{DatabaseSeeder.RoleAdmin},{DatabaseSeeder.RoleDonor}")]
    [HttpGet("impact")]
    public async Task<IActionResult> GetImpactData()
    {
        var totalRaised = await _db.Donations.SumAsync(d => d.Amount ?? 0m);
        var totalDonors = await _db.Supporters.CountAsync(s => s.Status == "Active");

        return Ok(new
        {
            totalRaised,
            totalDonors,
            totalDonations = await _db.Donations.CountAsync()
        });
    }

    // -----------------------------------------------------------------------
    // Mutating endpoints — Admin only
    // -----------------------------------------------------------------------

    /// <summary>Records a new donation.</summary>
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    [HttpPost]
    public async Task<IActionResult> CreateDonation([FromBody] CreateDonationRequest request)
    {
        var donation = new Donation
        {
            SupporterId   = request.SupporterId,
            DonationType  = request.DonationType,
            DonationDate  = request.DonationDate,
            IsRecurring   = request.IsRecurring,
            CampaignName  = request.CampaignName,
            ChannelSource = request.ChannelSource,
            CurrencyCode  = request.CurrencyCode ?? "PHP",
            Amount        = request.Amount,
            Notes         = request.Notes
        };

        _db.Donations.Add(donation);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetDonationHistory), new { }, donation);
    }

    /// <summary>Updates an existing donation record.</summary>
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateDonation(int id, [FromBody] CreateDonationRequest request)
    {
        var donation = await _db.Donations.FindAsync(id);
        if (donation is null) return NotFound();

        donation.Amount       = request.Amount;
        donation.Notes        = request.Notes;
        donation.CampaignName = request.CampaignName;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Deletes a donation record.</summary>
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteDonation(int id)
    {
        var donation = await _db.Donations.FindAsync(id);
        if (donation is null) return NotFound();

        _db.Donations.Remove(donation);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record CreateDonationRequest(
    int? SupporterId,
    string? DonationType,
    DateOnly? DonationDate,
    bool? IsRecurring,
    string? CampaignName,
    string? ChannelSource,
    string? CurrencyCode,
    decimal? Amount,
    string? Notes);
