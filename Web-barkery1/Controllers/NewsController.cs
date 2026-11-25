using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_barkery1.data;
using Web_barkery1.Models;
namespace Web_barkery1.Controllers;
public class NewsController(BakeryDbContext db) : Controller
{
    public async Task<IActionResult> Index() => View(await db.NewsArticles.AsNoTracking()
        .Where(n => n.IsPublished).OrderByDescending(n => n.CreatedAt).ToListAsync());
    public async Task<IActionResult> Details(int id)
    {
        var item = await db.NewsArticles.AsNoTracking().FirstOrDefaultAsync(n => n.Id == id && n.IsPublished);
        return item == null ? NotFound() : View(item);
    }
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Manage() => View(await db.NewsArticles.AsNoTracking().OrderByDescending(n => n.CreatedAt).ToListAsync());
    [Authorize(Roles = "ADMIN"), HttpGet]
    public async Task<IActionResult> Edit(int? id)
    {
        if (id == null) return View(new NewsArticle());
        var item = await db.NewsArticles.FindAsync(id);
        return item == null ? NotFound() : View(item);
    }
    [Authorize(Roles = "ADMIN"), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit([Bind("Id,Title,Content,IsPublished")] NewsArticle model)
    {
        model.Title = (model.Title ?? "").Trim(); model.Content = (model.Content ?? "").Trim();
        if (string.IsNullOrWhiteSpace(model.Title)) ModelState.AddModelError("Title", "Nhập tiêu đề.");
        if (string.IsNullOrWhiteSpace(model.Content)) ModelState.AddModelError("Content", "Nhập nội dung.");
        if (!ModelState.IsValid) return View(model);
        if (model.Id == 0) db.NewsArticles.Add(model);
        else {
            var item = await db.NewsArticles.FindAsync(model.Id);
            if (item == null) return NotFound();
            item.Title = model.Title; item.Content = model.Content; item.IsPublished = model.IsPublished;
        }
        await db.SaveChangesAsync(); TempData["Success"] = "Đã lưu tin tức.";
        return RedirectToAction(nameof(Manage));
    }
    [Authorize(Roles = "ADMIN"), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.NewsArticles.FindAsync(id);
        if (item == null) return NotFound();
        db.NewsArticles.Remove(item); await db.SaveChangesAsync();
        TempData["Success"] = "Đã xóa tin."; return RedirectToAction(nameof(Manage));
    }
}
