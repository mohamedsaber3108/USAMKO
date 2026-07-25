using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace USAMKO.Infrastructure.Encryption;

/// <summary>
/// Credential Vault — ALL credentials stored encrypted on YOUR system.
/// No cloud key management unless YOU explicitly configure it.
/// No third-party has access to your credentials.
///
/// This replaces the old plain-text Sender Pro.exe.config approach.
/// </summary>
public interface ICredentialVault
{
    Task<string?> GetSecretAsync(string key);
    Task SetSecretAsync(string key, string value);
    Task DeleteSecretAsync(string key);
    Task<Dictionary<string, string>> GetAllSecretsAsync(string prefix);
    Task<bool> HasSecretAsync(string key);
}

public class CredentialVault : ICredentialVault
{
    private readonly IEncryptionService _encryption;
    private readonly ILogger<CredentialVault> _logger;
    private readonly string _vaultPath;
    private Dictionary<string, string> _secrets = new();
    private readonly SemaphoreSlim _lock = new(1, 1);

    public CredentialVault(
        IEncryptionService encryption,
        IConfiguration configuration,
        ILogger<CredentialVault> logger)
    {
        _encryption = encryption;
        _logger = logger;
        _vaultPath = configuration["Security:VaultPath"]
            ?? Path.Combine(AppContext.BaseDirectory, "data", "vault.encrypted");

        LoadVault();
    }

    public Task<string?> GetSecretAsync(string key)
    {
        _secrets.TryGetValue(key, out var value);
        return Task.FromResult(value);
    }

    public async Task SetSecretAsync(string key, string value)
    {
        await _lock.WaitAsync();
        try
        {
            _secrets[key] = value;
            await SaveVaultAsync();
            _logger.LogDebug("Secret stored: {Key}", key);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task DeleteSecretAsync(string key)
    {
        await _lock.WaitAsync();
        try
        {
            _secrets.Remove(key);
            await SaveVaultAsync();
            _logger.LogDebug("Secret deleted: {Key}", key);
        }
        finally
        {
            _lock.Release();
        }
    }

    public Task<Dictionary<string, string>> GetAllSecretsAsync(string prefix)
    {
        var filtered = _secrets
            .Where(kv => kv.Key.StartsWith(prefix))
            .ToDictionary(kv => kv.Key, kv => kv.Value);

        return Task.FromResult(filtered);
    }

    public Task<bool> HasSecretAsync(string key)
    {
        return Task.FromResult(_secrets.ContainsKey(key));
    }

    private void LoadVault()
    {
        try
        {
            if (!File.Exists(_vaultPath))
            {
                _secrets = new Dictionary<string, string>();
                return;
            }

            var encryptedData = File.ReadAllText(_vaultPath);
            var decryptedJson = _encryption.Decrypt(encryptedData);
            _secrets = JsonSerializer.Deserialize<Dictionary<string, string>>(decryptedJson)
                ?? new Dictionary<string, string>();

            _logger.LogInformation("Credential vault loaded: {Count} secrets", _secrets.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load credential vault. Starting fresh.");
            _secrets = new Dictionary<string, string>();
        }
    }

    private async Task SaveVaultAsync()
    {
        try
        {
            var directory = Path.GetDirectoryName(_vaultPath);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
                Directory.CreateDirectory(directory);

            var json = JsonSerializer.Serialize(_secrets);
            var encrypted = _encryption.Encrypt(json);
            await File.WriteAllTextAsync(_vaultPath, encrypted);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save credential vault");
            throw;
        }
    }
}
