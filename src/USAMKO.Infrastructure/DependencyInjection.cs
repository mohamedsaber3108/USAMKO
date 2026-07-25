using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using USAMKO.Core.Domain;
using USAMKO.Core.Interfaces;
using USAMKO.Infrastructure.Data.Contexts;
using USAMKO.Infrastructure.Data.Repositories;
using USAMKO.Infrastructure.Encryption;
using USAMKO.Infrastructure.Identity;

namespace USAMKO.Infrastructure;

/// <summary>
/// Registers all infrastructure services.
/// Every service is owned by YOU — no external auth providers unless you opt in.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddUsamkoInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Database — choose PostgreSQL or SQLite (YOUR database, YOUR data)
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        if (connectionString != null && connectionString.Contains("Host="))
        {
            services.AddDbContext<UsamkoDbContext>(options =>
                options.UseNpgsql(connectionString, npgsql =>
                    npgsql.MigrationsAssembly(typeof(UsamkoDbContext).Assembly.FullName)));
        }
        else
        {
            services.AddDbContext<UsamkoDbContext>(options =>
                options.UseSqlite(connectionString ?? "Data Source=usamko.db",
                    sqlite => sqlite.MigrationsAssembly(typeof(UsamkoDbContext).Assembly.FullName)));
        }

        // Repositories
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

        // Encryption — YOUR keys, YOUR control
        services.AddSingleton<IEncryptionService, EncryptionService>();

        // JWT — YOUR signing keys
        services.AddSingleton<IJwtTokenService, JwtTokenService>();

        return services;
    }
}
