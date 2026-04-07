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
// ASP.NET Identity
// ---------------------------------------------------------------------------

builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.Password.RequiredLength         = 12;
        options.Password.RequireUppercase       = true;
        options.Password.RequireLowercase       = true;
        options.Password.RequireDigit           = true;
        options.Password.RequireNonAlphanumeric = true;
        options.Password.RequiredUniqueChars    = 6;

        options.Lockout.MaxFailedAccessAttempts = 15;
        options.Lockout.DefaultLockoutTimeSpan  = TimeSpan.FromMinutes(5);
        options.Lockout.AllowedForNewUsers      = true;

        options.User.RequireUniqueEmail = true;
    })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// ---------------------------------------------------------------------------
// JWT Authentication
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
            ValidateIssuer           = true,
            ValidIssuer              = jwtIssuer,
            ValidateAudience         = true,
            ValidAudience            = jwtAudience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = new SymmetricSecurityKey(
                                           Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateLifetime         = true,
            ClockSkew                = TimeSpan.Zero,
        };
    });

builder.Services.AddAuthorization();
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
        policy.WithOrigins(
                "http://localhost:5173",
                "https://localhost:5173",
                "https://purple-smoke-07f6d291e.2.azurestaticapps.net"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

// ---------------------------------------------------------------------------
// Database seeding
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

app.UseHttpsRedirection();

app.Use(async (context, next) =>
{
    context.Response.Headers.Append(
        "Content-Security-Policy",
        string.Join("; ",
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            "connect-src 'self' https://intex-4-14.azurewebsites.net https://purple-smoke-07f6d291e.2.azurestaticapps.net",
            "frame-ancestors 'none'"
)
    );
    await next();
});

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();