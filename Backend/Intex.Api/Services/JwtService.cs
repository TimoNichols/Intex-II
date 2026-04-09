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
    private const string MfaPendingClaim = "mfa_pending";

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

    /// <summary>
    /// Issues a short-lived (5-minute) token that only grants permission to
    /// complete the MFA verification step. It contains no role claims and cannot
    /// access any protected API — the <c>mfa_pending</c> claim identifies it.
    /// </summary>
    public string GenerateMfaPendingToken(string userId)
    {
        var secret   = RequireConfig("Jwt:Secret");
        var issuer   = RequireConfig("Jwt:Issuer");
        var audience = RequireConfig("Jwt:Audience");

        var signingKey  = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId),
            new Claim(ClaimTypes.NameIdentifier,   userId),
            new Claim(MfaPendingClaim,              "true"),
            new Claim(JwtRegisteredClaimNames.Jti,  Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer:             issuer,
            audience:           audience,
            claims:             claims,
            notBefore:          DateTime.UtcNow,
            expires:            DateTime.UtcNow.AddMinutes(5),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// Validates an MFA-pending token. Returns the contained <see cref="ClaimsPrincipal"/>
    /// when the token is valid and carries the <c>mfa_pending</c> claim; otherwise null.
    /// </summary>
    public ClaimsPrincipal? ValidateMfaPendingToken(string rawToken)
    {
        var secret   = RequireConfig("Jwt:Secret");
        var issuer   = RequireConfig("Jwt:Issuer");
        var audience = RequireConfig("Jwt:Audience");

        try
        {
            var handler   = new JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(rawToken, new TokenValidationParameters
            {
                ValidateIssuer           = true,
                ValidIssuer              = issuer,
                ValidateAudience         = true,
                ValidAudience            = audience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
                ValidateLifetime         = true,
                ClockSkew                = TimeSpan.Zero,
            }, out _);

            // Reject tokens that are not explicitly marked as MFA-pending.
            return principal.FindFirstValue(MfaPendingClaim) == "true" ? principal : null;
        }
        catch
        {
            return null;
        }
    }

    private string RequireConfig(string key) =>
        _config[key] ?? throw new InvalidOperationException(
            $"{key} is not configured. Set the {key.Replace(":", "__")} environment variable.");
}
