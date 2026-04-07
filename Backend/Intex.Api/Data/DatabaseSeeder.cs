using Intex.Api.Models;
using Microsoft.AspNetCore.Identity;

namespace Intex.Api.Data;

/// <summary>
/// Idempotent startup seeder. Safe to run on every app boot — every operation
/// is guarded by an existence check so nothing is created twice.
///
/// Required environment variables (set in Azure App Service → Configuration, or
/// in a .env / launch profile locally — never commit real passwords to source control):
///
///   Seed__AdminEmail      e.g. admin@example.com
///   Seed__AdminPassword   e.g. Adm1n$ecure#2024!
///   Seed__DonorEmail      e.g. donor@example.com
///   Seed__DonorPassword   e.g. D0nor$ecure#2024!
/// </summary>
public static class DatabaseSeeder
{
    // The three application roles. Defined as constants so controllers can
    // reference the same strings without magic literals.
    public const string RoleAdmin = "Admin";
    public const string RoleDonor = "Donor";
    public const string RoleStaff = "Staff";

    public static async Task SeedAsync(IServiceProvider services, ILogger logger)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var config      = services.GetRequiredService<IConfiguration>();

        // ---------------------------------------------------------------
        // 1. Roles
        // ---------------------------------------------------------------
        await EnsureRoleAsync(roleManager, logger, RoleAdmin);
        await EnsureRoleAsync(roleManager, logger, RoleDonor);
        await EnsureRoleAsync(roleManager, logger, RoleStaff);

        // ---------------------------------------------------------------
        // 2. Seeded Admin user
        // ---------------------------------------------------------------
        var adminEmail    = config["Seed:AdminEmail"];
        var adminPassword = config["Seed:AdminPassword"];

        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            logger.LogWarning(
                "Seed:AdminEmail or Seed:AdminPassword is not set. " +
                "Skipping Admin seed user creation.");
        }
        else
        {
            var admin = await userManager.FindByEmailAsync(adminEmail);
            if (admin is null)
            {
                admin = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email    = adminEmail,
                    EmailConfirmed = true   // skip email-confirm flow for seed accounts
                };

                var result = await userManager.CreateAsync(admin, adminPassword);
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(admin, RoleAdmin);
                    logger.LogInformation("Seeded Admin user: {Email}", adminEmail);
                }
                else
                {
                    logger.LogError(
                        "Failed to create Admin seed user {Email}: {Errors}",
                        adminEmail,
                        string.Join(", ", result.Errors.Select(e => e.Description)));
                }
            }
            else
            {
                await userManager.RemovePasswordAsync(admin);
                await userManager.AddPasswordAsync(admin, adminPassword);
                logger.LogInformation("Reset password for existing Admin user: {Email}", adminEmail);
            }
        }

        // ---------------------------------------------------------------
        // 3. Seeded Donor user + sample donation history
        // ---------------------------------------------------------------
        var donorEmail    = config["Seed:DonorEmail"];
        var donorPassword = config["Seed:DonorPassword"];

        if (string.IsNullOrWhiteSpace(donorEmail) || string.IsNullOrWhiteSpace(donorPassword))
        {
            logger.LogWarning(
                "Seed:DonorEmail or Seed:DonorPassword is not set. " +
                "Skipping Donor seed user creation.");
        }
        else
        {
            var donor = await userManager.FindByEmailAsync(donorEmail);
            if (donor is null)
            {
                donor = new ApplicationUser
                {
                    UserName = donorEmail,
                    Email    = donorEmail,
                    EmailConfirmed = true
                };

                var result = await userManager.CreateAsync(donor, donorPassword);
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(donor, RoleDonor);
                    logger.LogInformation("Seeded Donor user: {Email}", donorEmail);
                }
                else
                {
                    logger.LogError(
                        "Failed to create Donor seed user {Email}: {Errors}",
                        donorEmail,
                        string.Join(", ", result.Errors.Select(e => e.Description)));
                }
            }
            else
            {
                await userManager.RemovePasswordAsync(donor);
                await userManager.AddPasswordAsync(donor, donorPassword);
                logger.LogInformation("Reset password for existing Donor user: {Email}", donorEmail);
            }
        }
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private static async Task EnsureRoleAsync(
        RoleManager<IdentityRole> roleManager,
        ILogger logger,
        string roleName)
    {
        if (!await roleManager.RoleExistsAsync(roleName))
        {
            var result = await roleManager.CreateAsync(new IdentityRole(roleName));
            if (result.Succeeded)
                logger.LogInformation("Created role: {Role}", roleName);
            else
                logger.LogError(
                    "Failed to create role {Role}: {Errors}",
                    roleName,
                    string.Join(", ", result.Errors.Select(e => e.Description)));
        }
    }
}
