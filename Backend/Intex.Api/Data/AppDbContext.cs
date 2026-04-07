using Intex.Api.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Data;

/// <summary>
/// Single DbContext for the application.
/// Inherits IdentityDbContext so all ASP.NET Identity tables (AspNetUsers,
/// AspNetRoles, AspNetUserRoles, etc.) are managed by EF migrations.
///
/// The 17 lighthouse_v7 data tables already exist in Supabase and are
/// excluded from migrations — EF can query them but will never create,
/// alter, or drop them.
/// </summary>
public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // ── Lighthouse data tables (read/write, excluded from migrations) ──────────
    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<PublicImpactSnapshot> PublicImpactSnapshots => Set<PublicImpactSnapshot>();
    public DbSet<SocialMediaPost> SocialMediaPosts => Set<SocialMediaPost>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<PartnerAssignment> PartnerAssignments => Set<PartnerAssignment>();
    public DbSet<DonationAllocation> DonationAllocations => Set<DonationAllocation>();
    public DbSet<InKindDonationItem> InKindDonationItems => Set<InKindDonationItem>();
    public DbSet<ProcessRecording> ProcessRecordings => Set<ProcessRecording>();
    public DbSet<HomeVisitation> HomeVisitations => Set<HomeVisitation>();
    public DbSet<EducationRecord> EducationRecords => Set<EducationRecord>();
    public DbSet<HealthWellbeingRecord> HealthWellbeingRecords => Set<HealthWellbeingRecord>();
    public DbSet<InterventionPlan> InterventionPlans => Set<InterventionPlan>();
    public DbSet<IncidentReport> IncidentReports => Set<IncidentReport>();
    public DbSet<SafehouseMonthlyMetric> SafehouseMonthlyMetrics => Set<SafehouseMonthlyMetric>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        // Must call base so Identity's own table mappings are applied first.
        base.OnModelCreating(builder);

        // Exclude all 17 pre-existing lighthouse tables from EF migrations.
        // EF Core will query them normally but will never CREATE, ALTER, or DROP them.
        builder.Entity<Safehouse>().ToTable(t => t.ExcludeFromMigrations());
        builder.Entity<Partner>().ToTable(t => t.ExcludeFromMigrations());
        builder.Entity<Supporter>().ToTable(t => t.ExcludeFromMigrations());
        builder.Entity<Resident>().ToTable(t => t.ExcludeFromMigrations());
        builder.Entity<PublicImpactSnapshot>().ToTable(t => t.ExcludeFromMigrations());
        builder.Entity<SocialMediaPost>().ToTable(t => t.ExcludeFromMigrations());
        builder.Entity<Donation>().ToTable(t => t.ExcludeFromMigrations());
        builder.Entity<PartnerAssignment>().ToTable(t => t.ExcludeFromMigrations());
        builder.Entity<DonationAllocation>().ToTable(t => t.ExcludeFromMigrations());
        builder.Entity<InKindDonationItem>().ToTable(t => t.ExcludeFromMigrations());
        builder.Entity<ProcessRecording>().ToTable(t => t.ExcludeFromMigrations());
        builder.Entity<HomeVisitation>().ToTable(t => t.ExcludeFromMigrations());
        builder.Entity<EducationRecord>().ToTable(t => t.ExcludeFromMigrations());
        builder.Entity<HealthWellbeingRecord>().ToTable(t => t.ExcludeFromMigrations());
        builder.Entity<InterventionPlan>().ToTable(t => t.ExcludeFromMigrations());
        builder.Entity<IncidentReport>().ToTable(t => t.ExcludeFromMigrations());
        builder.Entity<SafehouseMonthlyMetric>().ToTable(t => t.ExcludeFromMigrations());
    }
}
