using Microsoft.EntityFrameworkCore;
using USAMKO.Core.Domain;

namespace USAMKO.Infrastructure.Data.Contexts;

public class UsamkoDbContext : DbContext
{
    public UsamkoDbContext(DbContextOptions<UsamkoDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<PlatformAccount> PlatformAccounts => Set<PlatformAccount>();
    public DbSet<Workflow> Workflows => Set<Workflow>();
    public DbSet<WorkflowExecution> WorkflowExecutions => Set<WorkflowExecution>();
    public DbSet<ContentItem> ContentItems => Set<ContentItem>();
    public DbSet<PromptTemplate> PromptTemplates => Set<PromptTemplate>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Username).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.PasswordHash).IsRequired().HasMaxLength(500);
            entity.Property(e => e.FirstName).HasMaxLength(100);
            entity.Property(e => e.LastName).HasMaxLength(100);
            entity.Property(e => e.PhoneNumber).HasMaxLength(20);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<PlatformAccount>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.UserId, e.Platform, e.PlatformAccountId }).IsUnique();
            entity.Property(e => e.AccountName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.DisplayName).HasMaxLength(255);
            entity.Property(e => e.PlatformAccountId).HasMaxLength(255);
            entity.HasOne(e => e.User)
                  .WithMany(u => u.PlatformAccounts)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<Workflow>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Configuration).IsRequired();
            entity.Property(e => e.Schedule).HasMaxLength(100);
            entity.Property(e => e.TimeZone).HasMaxLength(50);
            entity.HasOne(e => e.User)
                  .WithMany(u => u.Workflows)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<WorkflowExecution>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Workflow)
                  .WithMany(w => w.Executions)
                  .HasForeignKey(e => e.WorkflowId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.WorkflowId);
            entity.HasIndex(e => e.Status);
        });

        modelBuilder.Entity<ContentItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.Title).HasMaxLength(500);
            entity.Property(e => e.Language).HasMaxLength(10);
            entity.HasOne(e => e.User)
                  .WithMany(u => u.ContentLibrary)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<PromptTemplate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Template).IsRequired();
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = DateTime.UtcNow;
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    break;
                case EntityState.Deleted:
                    entry.State = EntityState.Modified;
                    entry.Entity.IsDeleted = true;
                    entry.Entity.DeletedAt = DateTime.UtcNow;
                    break;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
