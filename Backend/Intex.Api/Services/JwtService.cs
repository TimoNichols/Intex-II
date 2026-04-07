using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Intex.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace Intex.Api.Services;

/// <summary>
/// Generates signed JWT access tokens for authenticated users.
/// Reads configuration from IConfiguration (backed by environment variables):
///   Jwt:Secret   — HMAC-SHA256 signing key, must be at least 32 characters
///   Jwt:Issuer   — token issuer claim (iss), e.g. "https://api.yourapp.com"
///   Jwt:Audience — intended recipient claim (aud), e.g. "https://yourapp.com"
/// </summary>
public sealed class JwtService
{
    private readonly IConfiguration _config;

    public JwtService(IConfiguration config) => _config = config;

    /// <summary>
    /// Builds and signs a JWT valid for 8 hours containing the user's
    /// identity and role claims.
    /// </summary>
    public string GenerateToken(ApplicationUser user, IList<string> roles)
    {
        var secret   = RequireConfig("Jwt:Secret");
        var issuer   = RequireConfig("Jwt:Issuer");
        var audience = RequireConfig("Jwt:Audience");

        var keyBytes = Encoding.UTF8.GetBytes(secret);
        if (keyBytes.Length < 32)
            throw new InvalidOperationException(
                "Jwt:Secret must be at least 32 characters for HMAC-SHA256.");

        var signingKey  = new SymmetricSecurityKey(keyBytes);
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var claims = BuildClaims(user, roles);

        var token = new JwtSecurityToken(
            issuer:             issuer,
            audience:           audience,
            claims:             claims,
            notBefore:          DateTime.UtcNow,
            expires:            DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private static List<Claim> BuildClaims(ApplicationUser user, IList<string> roles)
    {
        var claims = new List<Claim>
        {
            // Standard JWT claims
            new(JwtRegisteredClaimNames.Sub,   user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? ""),
            new(JwtRegisteredClaimNames.Name,  user.DisplayName ?? user.Email ?? user.Id),

            // Unique token ID — lets a future blocklist identify this exact token.
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),

            // ASP.NET Core's [Authorize] reads ClaimTypes.NameIdentifier for user ID
            // and ClaimTypes.Role for [Authorize(Roles = "...")].
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email,          user.Email ?? ""),
            new(ClaimTypes.Name,           user.DisplayName ?? user.Email ?? user.Id),
        };

        // Add one Role claim per role so IsInRole() and [Authorize(Roles)] both work.
        foreach (var role in roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        return claims;
    }

    private string RequireConfig(string key) =>
        _config[key] ?? throw new InvalidOperationException(
            $"{key} is not configured. Set the {key.Replace(":", "__")} environment variable.");
}
