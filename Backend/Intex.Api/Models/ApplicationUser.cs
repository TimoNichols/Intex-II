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
}
