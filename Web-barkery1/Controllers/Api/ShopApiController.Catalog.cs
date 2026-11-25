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

        var products = await q.OrderBy(x => x.Id).ToListAsync();
        var now = VietnamToday;
        var batches = await db.StockBatches.AsNoTracking().Where(x => x.Quantity > 0).ToListAsync();
        return Good(products.Select(p => ProductWithExpiry(p, batches, now)));
    }

    [HttpGet("products/{id:int}")]
    public async Task<IActionResult> Product(int id)
    {
        var p = await db.Products.Include(x => x.Category).FirstOrDefaultAsync(x => x.Id == id);
        return p == null ? NotFound(new { message = "Không tìm thấy bánh." }) : Good(ProductWithExpiry(p, await db.StockBatches.Where(x => x.ProductId == id && x.Quantity > 0).ToListAsync(), VietnamToday));
    }

    object ProductWithExpiry(Product p, IEnumerable<StockBatch> all, DateTime now)
    {
        var batches = all.Where(x => x.ProductId == p.Id).ToList();
        var sellable = batches.Where(x => x.ExpiryDate >= now).Sum(x => x.Quantity);
        var earliest = batches.Where(x => x.ExpiryDate >= now).OrderBy(x => x.ExpiryDate).FirstOrDefault()?.ExpiryDate;
        var expiring = batches.Where(x => x.ExpiryDate >= now && x.ExpiryDate <= now.AddDays(3)).Sum(x => x.Quantity);
        var expired = batches.Where(x => x.ExpiryDate < now).Sum(x => x.Quantity);
        var unknown = batches.Where(x => x.ExpiryDate == null).Sum(x => x.Quantity);
        return new { id=p.Id, name=p.Name, description=p.Description, price=p.Price, old_price=p.OldPrice, rating=p.Rating,
            image=string.IsNullOrEmpty(p.ImageUrl) ? "/images/cake-placeholder.svg" : p.ImageUrl, stock=sellable, total_stock=p.Stock,
            category_id=p.CategoryId, category=p.Category?.Name, status=sellable == 0 ? "Hết hàng" : sellable <= 5 ? "Sắp hết" : "Còn hàng",
            expiry_date=earliest?.ToString("yyyy-MM-dd"), expiring_quantity=expiring, expired_quantity=expired, unknown_expiry_quantity=unknown };
    }

    [Authorize(Roles="ADMIN,STAFF"), HttpGet("stock/alerts")]
    public async Task<IActionResult> ExpiryAlerts()
    {
        var today = VietnamToday;
        var rows = await db.StockBatches.Include(x => x.Product).Where(x => x.Quantity > 0).OrderBy(x => x.ExpiryDate).ToListAsync();
        return Good(rows.Where(x => x.ExpiryDate == null || x.ExpiryDate <= today.AddDays(3)).Select(x => new {
            batch_id=x.Id, product_id=x.ProductId, product_name=x.Product.Name, quantity=x.Quantity,
            expiry_date=x.ExpiryDate?.ToString("yyyy-MM-dd"),
            level=x.ExpiryDate == null ? "UNKNOWN" : x.ExpiryDate < today ? "EXPIRED" : "SOON"
        }));
    }

    [Authorize(Roles="ADMIN"), HttpPut("stock/batches/{id:int}/expiry")]
    public async Task<IActionResult> SetBatchExpiry(int id, JsonElement j)
    {
        var expiry = ParseExpiry(j);
        var batch = await db.StockBatches.FindAsync(id);
        if (batch == null) return NotFound();
        batch.ExpiryDate = expiry;
        await db.SaveChangesAsync();
        return Good();
    }

    static DateTime VietnamToday => DateTime.UtcNow.AddHours(7).Date;
    static DateTime ParseExpiry(JsonElement j)
    {
        if (!DateTime.TryParseExact(Text(j, "expiry_date", 10), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var expiry))
            throw new ShopInputException("Hạn sử dụng phải theo định dạng yyyy-MM-dd.");
        if (expiry.Date <= VietnamToday) throw new ShopInputException("Hạn sử dụng phải sau ngày hôm nay (giờ Việt Nam).");
        return expiry.Date;
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
        {
            var initial = j.TryGetProperty("initial_quantity", out var raw) && raw.ValueKind == JsonValueKind.Number ? Int(j, "initial_quantity", 0, 1000000) : 0;
            if (initial > 0)
            {
                var expiry = ParseExpiry(j);
                p.Stock = initial;
                db.StockBatches.Add(new StockBatch { Product = p, Quantity = initial, ExpiryDate = expiry });
            }
            db.Products.Add(p);
        }
        await db.SaveChangesAsync();
        return Good(new { id = p.Id });
    }
    // nhập, xuất bánh
    [Authorize(Roles = "ADMIN"), HttpPost("products/{id:int}/stock")]
    public async Task<IActionResult> Stock(int id, JsonElement j)
    {
        int n = Int(j, "quantity", 1, 1000000);
        var mode = Text(j, "mode", 10);
        if (mode is not ("IN" or "OUT")) throw new ShopInputException("Chọn Nhập hoặc Xuất.");
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        var product = await db.Products.FindAsync(id);
        if (product == null) return NotFound();
        if (mode == "IN")
        {
            var expiry = ParseExpiry(j);
            if (product.Stock > int.MaxValue - n) throw new ShopInputException("Số lượng nhập vượt giới hạn.");
            db.StockBatches.Add(new StockBatch { ProductId=id, Quantity=n, ExpiryDate=expiry });
            product.Stock += n;
        }
        else
        {
            if (product.Stock < n) throw new ShopInputException("Không đủ tồn kho để xuất.");
            var batches = await db.StockBatches.Where(x => x.ProductId == id && x.Quantity > 0).OrderBy(x => x.ExpiryDate).ThenBy(x => x.Id).ToListAsync();
            var remaining = n;
            foreach (var batch in batches) { var take = Math.Min(remaining, batch.Quantity); batch.Quantity -= take; remaining -= take; if (remaining == 0) break; }
            if (remaining != 0) throw new ShopInputException("Dữ liệu lô bánh chưa được đồng bộ.");
            product.Stock -= n;
        }
        await db.SaveChangesAsync();
        await tx.CommitAsync();
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
