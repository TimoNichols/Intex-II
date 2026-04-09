using System.Security.Claims;
using Intex.Api.Data;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using NpgsqlTypes;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/donations")]
public class DonationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _users;

    public DonationsController(AppDbContext db, UserManager<ApplicationUser> users)
    {
        _db    = db;
        _users = users;
    }

    /// <summary>
    /// Records a donation submitted by the logged-in supporter.
    /// Reads supporter_id from the JWT claim (set at login); falls back to a DB
    /// lookup if the token pre-dates the claim addition.
    /// </summary>
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateDonation([FromBody] SubmitDonationRequest request)
    {
        // Prefer the supporter_id JWT claim to avoid a round-trip.
        var supporterIdClaim = User.FindFirstValue("supporter_id");
        int? supporterId = null;

        if (int.TryParse(supporterIdClaim, out var sid) && sid > 0)
        {
            supporterId = sid;
        }
        else
        {
            var userId  = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var appUser = await _users.FindByIdAsync(userId!);
            supporterId = appUser?.SupporterId;
        }

        if (supporterId is null)
            return BadRequest(new { message = "No supporter record is linked to your account." });

        var isMonetary   = request.DonationType == "Monetary";
        var donationDate = DateOnly.FromDateTime(DateTime.UtcNow);
        var campaignName = request.CampaignName?.Trim();
        var currencyCode = isMonetary ? (request.CurrencyCode ?? "PHP") : null;
        var amount       = isMonetary ? request.Amount : null;
        var notes        = request.Notes?.Trim();

        const string sql = """
            INSERT INTO donations
                (supporter_id, donation_type, donation_date, amount, estimated_value,
                 impact_unit, currency_code, campaign_name, channel_source, is_recurring, notes)
            VALUES
                (@supporterId, @donationType, @donationDate, @amount, @estimatedValue,
                 @impactUnit, @currencyCode, @campaignName, @channelSource, @isRecurring, @notes)
            RETURNING donation_id
            """;

        var conn = (NpgsqlConnection)_db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync();

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("supporterId",   supporterId);
        cmd.Parameters.AddWithValue("donationType",  request.DonationType);
        cmd.Parameters.AddWithValue("donationDate",  donationDate);
        cmd.Parameters.AddWithValue("amount",        (object?)amount       ?? DBNull.Value);
        cmd.Parameters.AddWithValue("estimatedValue",(object?)DBNull.Value);
        cmd.Parameters.AddWithValue("impactUnit",    (object?)DBNull.Value);
        cmd.Parameters.AddWithValue("currencyCode",  (object?)currencyCode ?? DBNull.Value);
        cmd.Parameters.AddWithValue("campaignName",  (object?)campaignName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("channelSource", request.ChannelSource);
        cmd.Parameters.AddWithValue("isRecurring",   request.IsRecurring);
        cmd.Parameters.AddWithValue("notes",         (object?)notes        ?? DBNull.Value);

        var newId = (int)(await cmd.ExecuteScalarAsync())!;

        return Created("", new
        {
            donationId     = newId,
            supporterId,
            donationType   = request.DonationType,
            donationDate,
            isRecurring    = request.IsRecurring,
            campaignName,
            channelSource  = request.ChannelSource,
            currencyCode,
            amount,
            estimatedValue = (decimal?)null,
            impactUnit     = (string?)null,
            notes,
        });
    }
}

public record SubmitDonationRequest(
    string  DonationType,
    decimal? Amount,
    string? CampaignName,
    string  ChannelSource,
    bool    IsRecurring,
    string? Notes,
    string? CurrencyCode);
