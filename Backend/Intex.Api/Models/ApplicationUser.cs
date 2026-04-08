using Microsoft.AspNetCore.Identity;

namespace Intex.Api.Models;

/// <summary>
/// Extends the default Identity user with app-specific profile fields.
/// Any new columns added here require a new EF Core migration.
/// </summary>
public class ApplicationUser : IdentityUser
{
    /// <summary>
    /// Human-readable name shown in the UI (e.g. "Jane Smith").
    /// Falls back to Email in the JWT claims if not set.
    /// </summary>
    public string? DisplayName { get; set; }

    /// <summary>
    /// Links this Identity account to a row in the lighthouse <c>supporters</c> table.
    /// Set for Donor role accounts so donation history can be scoped to this individual.
    /// Null for Admin / Staff accounts.
    /// </summary>
    public int? SupporterId { get; set; }
}
