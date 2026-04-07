using System.Text;
using Intex.Api.Data;
using Intex.Api.Models;
using Intex.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------------
// Database — Supabase (PostgreSQL via Npgsql)
// ---------------------------------------------------------------------------

builder.Services.AddDbContext<AppDbContext>(options =>
    options
        .UseNpgsql(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            o => o.MigrationsHistoryTable("__EFMigrationsHistory"))
        .UseSnakeCaseNamingConvention());

// ---------------------------------------------------------------------------
// ASP.NET Identity (core services only — no cookie scheme)
//
// We use AddIdentityCore instead of AddIdentity so that JWT becomes the sole
// default authentication scheme. AddIdentity would register cookie auth as
// the default and conflict with JwtBearer below.
// ---------------------------------------------------------------------------

builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        // --- Password policy (stricter than Microsoft defaults) ---
        options.Password.RequiredLength        = 12;   // min 12 characters
        options.Password.RequireUppercase      = true; // at least one A-Z
        options.Password.RequireLowercase      = true; // at least one a-z
        options.Password.RequireDigit          = true; // at least one 0-9
        options.Password.RequireNonAlphanumeric = true; // at least one symbol
        options.Password.RequiredUniqueChars   = 6;   // at least 6 distinct chars

        // --- Lockout policy ---
        options.Lockout.MaxFailedAccessAttempts = 5;                        // lock after 5 bad attempts
        options.Lockout.DefaultLockoutTimeSpan  = TimeSpan.FromMinutes(15); // 15-min lockout window
        options.Lockout.AllowedForNewUsers      = true;                     // new accounts protected too

        // --- User settings ---
        options.User.RequireUniqueEmail = true; // no duplicate email addresses
    })
    .AddRoles<IdentityRole>()              // registers RoleManager<IdentityRole>
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();           // needed for password-reset / email-confirm tokens

// ---------------------------------------------------------------------------
// JWT Authentication
//
// Reads three required values from IConfiguration. Locally, put them in
// appsettings.Development.json (gitignored). In Azure, set them as App Service
// Application Settings using double-underscore notation:
//   Jwt__Secret   Jwt__Issuer   Jwt__Audience
//
// The secret must be at least 32 characters for HMAC-SHA256.
// ---------------------------------------------------------------------------

var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException(
        "Jwt:Secret is not configured — set the Jwt__Secret environment variable.");

var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException(
        "Jwt:Issuer is not configured — set the Jwt__Issuer environment variable.");

var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException(
        "Jwt:Audience is not configured — set the Jwt__Audience environment variable.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            // Verify the token was issued by us.
            ValidateIssuer           = true,
            ValidIssuer              = jwtIssuer,

            // Verify the token is intended for our frontend.
            ValidateAudience         = true,
            ValidAudience            = jwtAudience,

            // Verify the HMAC-SHA256 signature using our secret key.
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = new SymmetricSecurityKey(
                                           Encoding.UTF8.GetBytes(jwtSecret)),

            // Reject tokens whose exp claim has passed.
            ValidateLifetime         = true,

            // No grace period — tokens expire exactly at the 8-hour mark.
            // A small non-zero value (e.g. 5 minutes) is acceptable for
            // distributed systems with clock skew; zero is fine for a single API.
            ClockSkew                = TimeSpan.Zero,
        };
    });

builder.Services.AddAuthorization();

// Register the token-generation service so controllers can inject it.
builder.Services.AddScoped<JwtService>();

// ---------------------------------------------------------------------------
// Other services
// ---------------------------------------------------------------------------

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// ---------------------------------------------------------------------------
// Database seeding — roles + seed users created on every startup if missing
// ---------------------------------------------------------------------------

using (var scope = app.Services.CreateScope())
{
    var seederLogger = scope.ServiceProvider
        .GetRequiredService<ILoggerFactory>()
        .CreateLogger("DatabaseSeeder");

    try
    {
        await DatabaseSeeder.SeedAsync(scope.ServiceProvider, seederLogger);
    }
    catch (Exception ex)
    {
        seederLogger.LogError(ex, "Database seeding failed — app will continue without seed data. Check the connection string.");
    }
}

// ---------------------------------------------------------------------------
// Middleware pipeline (order matters)
// ---------------------------------------------------------------------------

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// 1. Redirect all plain-HTTP requests to HTTPS before anything else touches them.
app.UseHttpsRedirection();

// 2. Inject a Content-Security-Policy header on every response.
//    Runs early so it is present on error responses too.
app.Use(async (context, next) =>
{
    context.Response.Headers.Append(
        "Content-Security-Policy",
        string.Join("; ",
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self'",
            "frame-ancestors 'none'"
        )
    );
    await next();
});

app.UseCors();

// 3. Validate the JWT on every request that carries an Authorization header.
app.UseAuthentication();

// 4. Evaluate [Authorize] attributes — must come after UseAuthentication.
app.UseAuthorization();

app.MapControllers();

app.Run();
