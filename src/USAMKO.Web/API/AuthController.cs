using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using USAMKO.Core.Constants;
using USAMKO.Core.Domain;
using USAMKO.Core.Interfaces;
using USAMKO.Infrastructure.Encryption;
using USAMKO.Infrastructure.Identity;

namespace USAMKO.Web.API;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IRepository<User> _userRepo;
    private readonly IJwtTokenService _jwtService;
    private readonly IEncryptionService _encryption;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IRepository<User> userRepo,
        IJwtTokenService jwtService,
        IEncryptionService encryption,
        ILogger<AuthController> logger)
    {
        _userRepo = userRepo;
        _jwtService = jwtService;
        _encryption = encryption;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userRepo.FirstOrDefaultAsync(u => u.Username == request.Username || u.Email == request.Username);

        if (user == null)
            return Unauthorized(new { message = ErrorMessages.InvalidCredentials });

        if (!user.IsActive)
            return Unauthorized(new { message = ErrorMessages.AccountLocked });

        if (user.LockoutEnd.HasValue && user.LockoutEnd > DateTime.UtcNow)
            return Unauthorized(new { message = ErrorMessages.AccountLocked });

        if (!_encryption.VerifyPassword(request.Password, user.PasswordHash))
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= SystemConstants.MaxLoginAttempts)
            {
                user.LockoutEnd = DateTime.UtcNow.AddMinutes(SystemConstants.LockoutDurationMinutes);
            }
            await _userRepo.UpdateAsync(user);
            return Unauthorized(new { message = ErrorMessages.InvalidCredentials });
        }

        // Successful login
        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;
        user.LastLoginAt = DateTime.UtcNow;
        user.LastLoginIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _userRepo.UpdateAsync(user);

        var accessToken = _jwtService.GenerateAccessToken(user);
        var refreshToken = _jwtService.GenerateRefreshToken();

        _logger.LogInformation("User logged in: {Username}", user.Username);

        return Ok(new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresIn = SystemConstants.SessionTimeoutMinutes * 60,
            User = new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role.ToString(),
                SubscriptionTier = user.SubscriptionTier.ToString()
            }
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var existingUser = await _userRepo.FirstOrDefaultAsync(
            u => u.Username == request.Username || u.Email == request.Email);

        if (existingUser != null)
            return Conflict(new { message = ErrorMessages.DuplicateUsername });

        var user = new User
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = _encryption.HashPassword(request.Password),
            FirstName = request.FirstName,
            LastName = request.LastName,
            Role = UserRole.User,
            IsActive = true
        };

        await _userRepo.AddAsync(user);

        _logger.LogInformation("New user registered: {Username}", user.Username);

        return Ok(new { message = "Registration successful", userId = user.Id });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "");
        var user = await _userRepo.GetByIdAsync(userId);

        if (user == null) return NotFound();

        if (!_encryption.VerifyPassword(request.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Current password is incorrect" });

        user.PasswordHash = _encryption.HashPassword(request.NewPassword);
        await _userRepo.UpdateAsync(user);

        return Ok(new { message = "Password changed successfully" });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "");
        var user = await _userRepo.GetByIdAsync(userId);

        if (user == null) return NotFound();

        return Ok(new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            SubscriptionTier = user.SubscriptionTier.ToString()
        });
    }
}

// Request/Response DTOs
public record LoginRequest(string Username, string Password);
public record RegisterRequest(string Username, string Email, string Password, string? FirstName, string? LastName);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public class LoginResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public int ExpiresIn { get; set; }
    public UserDto User { get; set; } = null!;
}

public class UserDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string SubscriptionTier { get; set; } = string.Empty;
}
