using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using USAMKO.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/usamko-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// Add USAMKO Infrastructure (Database, Repositories, Encryption, JWT)
builder.Services.AddUsamkoInfrastructure(builder.Configuration);

// Authentication — YOUR JWT keys
var jwtSecret = builder.Configuration["Security:Jwt:Secret"]
    ?? throw new InvalidOperationException("JWT secret not configured");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Security:Jwt:Issuer"] ?? "USAMKO",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Security:Jwt:Audience"] ?? "USAMKO-Users",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// Add controllers and API explorer
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Swagger — YOUR API documentation
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "USAMKO API",
        Version = "v1",
        Description = "USAMKO Platform API — AI-Powered Social Media Automation",
        Contact = new OpenApiContact { Name = "USAMKO Platform" }
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// CORS — configure for YOUR domains
builder.Services.AddCors(options =>
{
    options.AddPolicy("USAMKO", policy =>
    {
        policy.AllowAnyOrigin() // Restrict in production to YOUR domain
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Health checks
builder.Services.AddHealthChecks();

var app = builder.Build();

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "USAMKO API v1");
        c.RoutePrefix = "api-docs";
    });
}

app.UseHttpsRedirection();
app.UseCors("USAMKO");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

// Startup banner
Log.Information("========================================");
Log.Information("  USAMKO Platform v1.0.0");
Log.Information("  AI-Powered Social Media Automation");
Log.Information("  Owner-Controlled. Modular. Scalable.");
Log.Information("========================================");
Log.Information("API Documentation: /api-docs");
Log.Information("Health Check: /health");

app.Run();
