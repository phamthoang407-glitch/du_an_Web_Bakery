using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_barkery1.data;
using Web_barkery1.Models;

namespace Web_barkery1.Controllers
{
    [Authorize(Roles = "ADMIN")]
    public class CategoriesController : Controller
    {
        private readonly BakeryDbContext _context;

        public CategoriesController(BakeryDbContext context)
        {
            _context = context;
        }

        public async Task<IActionResult> Index()
        {
            var categories = await _context.Categories
                .AsNoTracking()
                .OrderBy(c => c.Name)
                .ToListAsync();

            return View(categories);
        }

        [HttpGet]
        public IActionResult Create()
        {
            return View(new Category());
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(
            [Bind("Name")] Category category)
        {
            category.Name = (category.Name ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(category.Name))
            {
                ModelState.AddModelError(
                    "Name", "Vui lòng nhập tên danh mục.");
            }

            if (!ModelState.IsValid)
            {
                return View(category);
            }

            var exists = await _context.Categories
                .AnyAsync(c => c.Name == category.Name);

            if (exists)
            {
                ModelState.AddModelError(
                    "Name", "Danh mục này đã tồn tại.");

                return View(category);
            }

            _context.Categories.Add(category);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
                when (ex.InnerException is Microsoft.Data.SqlClient.SqlException sql
                      && (sql.Number == 2601 || sql.Number == 2627))
            {
                ModelState.AddModelError(
                    "Name", "Danh mục này đã tồn tại.");

                return View(category);
            }

            TempData["Success"] = "Đã thêm danh mục.";
            return RedirectToAction(nameof(Index));
        }

        [HttpGet]
        public async Task<IActionResult> Edit(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            return category == null ? NotFound() : View(category);
        }

        [HttpPost, ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, [Bind("Id,Name")] Category model)
        {
            if (id != model.Id) return BadRequest();
            model.Name = (model.Name ?? "").Trim();
            if (string.IsNullOrWhiteSpace(model.Name)) ModelState.AddModelError("Name", "Nhập tên danh mục.");
            if (await _context.Categories.AnyAsync(c => c.Id != id && c.Name == model.Name))
                ModelState.AddModelError("Name", "Tên danh mục đã tồn tại.");
            if (!ModelState.IsValid) return View(model);
            var category = await _context.Categories.FindAsync(id);
            if (category == null) return NotFound();
            category.Name = model.Name;
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateException ex) when (ex.InnerException is Microsoft.Data.SqlClient.SqlException sql
                && (sql.Number == 2601 || sql.Number == 2627))
            { ModelState.AddModelError("Name", "Tên danh mục đã tồn tại."); return View(model); }
            TempData["Success"] = "Đã sửa danh mục.";
            return RedirectToAction(nameof(Index));
        }

        [HttpPost, ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null) return NotFound();
            if (await _context.Products.AnyAsync(p => p.CategoryId == id))
                TempData["Error"] = "Danh mục đang chứa bánh. Hãy chuyển bánh sang danh mục khác trước.";
            else
            {
                _context.Categories.Remove(category);
                try { await _context.SaveChangesAsync(); TempData["Success"] = "Đã xóa danh mục."; }
                catch (DbUpdateException ex) when (ex.InnerException is Microsoft.Data.SqlClient.SqlException sql && sql.Number == 547)
                { TempData["Error"] = "Danh mục đang được sử dụng, không thể xóa."; }
            }
            return RedirectToAction(nameof(Index));
        }
    }
}
