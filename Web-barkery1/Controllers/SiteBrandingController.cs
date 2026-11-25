using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Web_barkery1.Controllers;

public sealed class SiteBrandingSettings
{
    public string ShopName { get; set; } = "BAKERY";
    public string Tagline { get; set; } = "TIỆM BÁNH THỦ CÔNG · FRESH BAKERY";
    public string Title { get; set; } = "Một chút bánh ngon,";
    public string Highlight { get; set; } = "thêm nhiều niềm vui.";
    public string Description { get; set; } = "Khám phá bánh kem, bánh ngọt và bánh mì thơm mềm, được chọn lựa cẩn thận cho những khoảnh khắc đáng nhớ.";
    public string HeroImage { get; set; } = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=85";
    public string LogoImage { get; set; } = "/images/bakery-logo.svg";
    public string StoreImage { get; set; } = "";
}

[ApiController]
[Route("api/site-branding")]
public sealed class SiteBrandingController(IWebHostEnvironment host) : ControllerBase
{
    private static readonly SemaphoreSlim Gate = new(1, 1);
    private string SettingsPath => Path.Combine(host.ContentRootPath, "App_Data", "site-branding.json");

    private async Task<SiteBrandingSettings> ReadSettings()
    {
        if (!System.IO.File.Exists(SettingsPath)) return new();
        try
        {
            await using var stream = System.IO.File.OpenRead(SettingsPath);
            return await JsonSerializer.DeserializeAsync<SiteBrandingSettings>(stream) ?? new();
        }
        catch (JsonException) { return new(); }
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        // Avoid stale branding after an owner makes edits.
        Response.Headers.CacheControl = "no-store";
        await Gate.WaitAsync();
        try { return Ok(new { success = true, data = await ReadSettings() }); }
        finally { Gate.Release(); }
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    [ValidateAntiForgeryToken]
    [RequestSizeLimit(14_000_000)]
    public async Task<IActionResult> Save([FromForm] SiteBrandingSettings data,
        [FromForm] IFormFile? heroFile, [FromForm] IFormFile? logoFile,
        [FromForm] IFormFile? storeFile)
    {
        static bool ValidText(string? v, int max) => !string.IsNullOrWhiteSpace(v) && v.Length <= max;
        if (!ValidText(data.ShopName, 60) || !ValidText(data.Tagline, 120) ||
            !ValidText(data.Title, 110) || !ValidText(data.Highlight, 110) ||
            !ValidText(data.Description, 500))
            return BadRequest(new { success = false, message = "Nội dung không được bỏ trống hoặc quá dài." });

        var uploads = new[] { heroFile, logoFile, storeFile }.Where(f => f is not null).ToArray();
        foreach (var file in uploads)
        {
            if (file!.Length < 1 || file.Length > 4 * 1024 * 1024 || !AllowedImage(file))
                return BadRequest(new { success = false, message = "Chỉ nhận ảnh JPG, PNG, WebP hợp lệ, tối đa 4MB mỗi ảnh." });
        }
        await Gate.WaitAsync();
        try
        {
            var current = await ReadSettings();
            // Image paths are never accepted from the form, only created by the server.
            var replacement = new SiteBrandingSettings
            {
                ShopName = data.ShopName.Trim(), Tagline = data.Tagline.Trim(),
                Title = data.Title.Trim(), Highlight = data.Highlight.Trim(),
                Description = data.Description.Trim(),
                HeroImage = current.HeroImage, LogoImage = current.LogoImage, StoreImage = current.StoreImage
            };
            if (heroFile is not null) replacement.HeroImage = await SaveImage(heroFile);
            if (logoFile is not null) replacement.LogoImage = await SaveImage(logoFile);
            if (storeFile is not null) replacement.StoreImage = await SaveImage(storeFile);
            Directory.CreateDirectory(Path.GetDirectoryName(SettingsPath)!);
            var tmp = SettingsPath + ".tmp";
            await System.IO.File.WriteAllTextAsync(tmp, JsonSerializer.Serialize(replacement));
            System.IO.File.Move(tmp, SettingsPath, true);
            return Ok(new { success = true, data = replacement });
        }
        finally { Gate.Release(); }
    }

    private static bool AllowedImage(IFormFile file)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png" or ".webp")) return false;
        using var stream = file.OpenReadStream();
        Span<byte> head = stackalloc byte[12];
        if (stream.Read(head) < 12) return false;
        return ext switch
        {
            ".jpg" or ".jpeg" => head[0] == 0xff && head[1] == 0xd8 && head[2] == 0xff,
            ".png" => head[..8].SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }),
            ".webp" => head[..4].SequenceEqual("RIFF"u8) && head[8..12].SequenceEqual("WEBP"u8),
            _ => false
        };
    }
    private async Task<string> SaveImage(IFormFile file)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext == ".jpeg") ext = ".jpg";
        var name = $"{Guid.NewGuid():N}{ext}";
        var dir = Path.Combine(host.WebRootPath, "uploads", "branding");
        Directory.CreateDirectory(dir);
        await using var output = System.IO.File.Create(Path.Combine(dir, name));
        await file.CopyToAsync(output);
        return "/uploads/branding/" + name;
    }
}
