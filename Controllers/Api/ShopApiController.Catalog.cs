using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Security.Cryptography;
using System.Text;
using System.Globalization;
using System.Text.RegularExpressions;
using Web_barkery1.Models;
using Web_barkery1.data;

namespace Web_barkery1.Controllers;
public partial class ShopApiController
{
    object ProductDto(Product p) => new
    {
        id = p.Id,
        name = p.Name,
        description = p.Description,
        price = p.Price,
        old_price = p.OldPrice,
        rating = p.Rating,
        image = string.IsNullOrEmpty(p.ImageUrl) ? "/images/cake-placeholder.svg" : p.ImageUrl,
        stock = p.Stock,
        category_id = p.CategoryId,
        category = p.Category?.Name,
        status = p.Stock == 0 ? "Hết hàng" : p.Stock <= 5 ? "Sắp hết" : "Còn hàng"
    };
    [HttpGet("products")]
    public async Task<IActionResult> Products(string? search = null, string? category = null)
    {
        var q = db.Products.Include(x => x.Category).AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(x => x.Name.Contains(search));
        if (!string.IsNullOrWhiteSpace(category))
        {
            if (int.TryParse(category, out var cid))
                q = q.Where(x => x.CategoryId == cid);
            else
                q = q.Where(x => x.Category.Name == category);
        }

        return Good((await q.OrderBy(x => x.Id).ToListAsync()).Select(ProductDto));
    }

    [HttpGet("products/{id:int}")]
    public async Task<IActionResult> Product(int id)
    {
        var p = await db.Products.Include(x => x.Category).FirstOrDefaultAsync(x => x.Id == id);
        return p == null ? NotFound(new { message = "Không tìm thấy bánh." }) : Good(ProductDto(p));
    }

    [Authorize(Roles = "ADMIN"), HttpPost("products"), HttpPut("products/{id:int}")]
    public async Task<IActionResult> SaveProduct(JsonElement j, int? id = null)
    {
        var p = id == null ? new Product() : await db.Products.FindAsync(id);
        if (p == null)
            return NotFound();
        p.Name = Text(j, "name", 150);
        p.Description = Text(j, "description", 2000, false);
        p.Price = Money(j, "price", 0.01m);
        p.OldPrice = Money(j, "old_price");
        p.Rating = Money(j, "rating", 0, 5);
        p.ImageUrl = Image(j);
        p.CategoryId = Int(j, "category_id", 1, int.MaxValue);
        if (!await db.Categories.AnyAsync(x => x.Id == p.CategoryId))
            throw new ShopInputException("Danh mục không tồn tại.");
        if (id == null)
            db.Products.Add(p);
        await db.SaveChangesAsync();
        return Good(new { id = p.Id });
    }

    [Authorize(Roles = "ADMIN"), HttpPost("products/{id:int}/stock")]
    public async Task<IActionResult> Stock(int id, JsonElement j)
    {
        int n = Int(j, "quantity", 1, 1000000);
        var mode = Text(j, "mode", 10);
        int rows;
        if (mode == "IN")
            rows = await db.Products.Where(x => x.Id == id && x.Stock <= int.MaxValue - n).ExecuteUpdateAsync(s => s.SetProperty(x => x.Stock, x => x.Stock + n));
        else if (mode == "OUT")
            rows = await db.Products.Where(x => x.Id == id && x.Stock >= n).ExecuteUpdateAsync(s => s.SetProperty(x => x.Stock, x => x.Stock - n));
        else
            throw new ShopInputException("Chọn Nhập hoặc Xuất.");
        if (rows != 1)
            throw new ShopInputException("Không đủ tồn kho, vượt giới hạn hoặc sản phẩm không tồn tại.");
        return Good();
    }

    [HttpGet("categories")]
    public async Task<IActionResult> Categories() => Good(await db.Categories.Select(x => new { id = x.Id, name = x.Name, description = x.Description }).ToListAsync());
    [Authorize(Roles = "ADMIN"), HttpPost("categories"), HttpPut("categories/{id:int}")]
    public async Task<IActionResult> SaveCategory(JsonElement j, int? id = null)
    {
        var c = id == null ? new Category() : await db.Categories.FindAsync(id);
        if (c == null)
            return NotFound();
        c.Name = Text(j, "name", 100);
        c.Description = Text(j, "description", 1000, false);
        if (id == null)
            db.Categories.Add(c);
        await db.SaveChangesAsync();
        return Good();
    }

    [Authorize(Roles = "ADMIN"), HttpDelete("categories/{id:int}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        if (await db.Products.AnyAsync(x => x.CategoryId == id))
            throw new ShopInputException("Danh mục đang có sản phẩm, không thể xóa.");
        await db.Categories.Where(x => x.Id == id).ExecuteDeleteAsync();
        return Good();
    }

    [HttpGet("news")]
    public async Task<IActionResult> News()
    {
        var rows = await db.NewsArticles.Where(x => x.IsPublished || User.IsInRole("ADMIN")).OrderByDescending(x => x.CreatedAt).ToListAsync();
        return Good(rows.Select(x => new { id = x.Id, title = x.Title, description = x.Content, image = x.ImageUrl ?? "/images/cake-placeholder.svg", category = x.Category ?? "Tin quầy bánh", date = x.CreatedAt.ToString("dd/MM/yyyy") }));
    }

    [Authorize(Roles = "ADMIN"), HttpPost("news"), HttpPut("news/{id:int}")]
    public async Task<IActionResult> SaveNews(JsonElement j, int? id = null)
    {
        var n = id == null ? new NewsArticle() : await db.NewsArticles.FindAsync(id);
        if (n == null)
            return NotFound();
        n.Title = Text(j, "title", 200);
        n.Content = Text(j, "description", 10000);
        n.ImageUrl = Image(j);
        n.Category = Text(j, "category", 100);
        if (!DateTime.TryParseExact(Text(j, "date", 10), "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            throw new ShopInputException("Ngày phải có dạng dd/mm/yyyy.");
        n.CreatedAt = date;
        n.IsPublished = true;
        if (id == null)
            db.NewsArticles.Add(n);
        await db.SaveChangesAsync();
        return Good();
    }

    [Authorize(Roles = "ADMIN"), HttpDelete("news/{id:int}")]
    public async Task<IActionResult> DeleteNews(int id)
    {
        await db.NewsArticles.Where(x => x.Id == id).ExecuteDeleteAsync();
        return Good();
    }

    [HttpGet("stores")]
    public async Task<IActionResult> Stores() => Good(await db.StoreInfos.Select(x => new { id = x.Id, name = x.Name, address = x.Address, opening_time = x.OpeningHours, distance = "", phone = x.Phone }).ToListAsync());
    [Authorize(Roles = "ADMIN"), HttpPost("stores"), HttpPut("stores/{id:int}")]
    public async Task<IActionResult> SaveStore(JsonElement j, int? id = null)
    {
        if (id.HasValue && id != 1)
            return NotFound();
        var s = await db.StoreInfos.FindAsync(1);
        if (s == null)
        {
            s = new StoreInfo
            {
                Id = 1
            };
            db.StoreInfos.Add(s);
        }

        s.Address = Text(j, "address", 300);
        s.OpeningHours = Text(j, "opening_time", 100);
        await db.SaveChangesAsync();
        return Good();
    }
}
