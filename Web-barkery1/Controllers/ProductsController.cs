using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Web_barkery1.data;
using Web_barkery1.Models;

namespace Web_barkery1.Controllers
{
    public class ProductsController : Controller
    {
        private readonly BakeryDbContext _context;

        public ProductsController(BakeryDbContext context)
        {
            _context = context;
        }

        // Danh sách sản phẩm
        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> Index()
        {
            var products = await _context.Products
                .AsNoTracking()
                .Include(p => p.Category)
                .OrderBy(p => p.Name)
                .ToListAsync();

            return View(products);
        }

        // Mở trang thêm bánh
        [Authorize(Roles = "ADMIN")]
        [HttpGet]
        public async Task<IActionResult> Create()
        {
            var model = new ProductCreateViewModel();

            await LoadCategoriesAsync(model);

            return View(model);
        }

        // Lưu bánh mới
        [Authorize(Roles = "ADMIN")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(
            ProductCreateViewModel model)
        {
            model.Name = (model.Name ?? string.Empty).Trim();
            model.Description = model.Description?.Trim();

            if (string.IsNullOrWhiteSpace(model.Name))
            {
                ModelState.AddModelError(
                    nameof(model.Name),
                    "Vui lòng nhập tên bánh.");
            }

            ValidateImage(model);

            var categoryExists = await _context.Categories
                .AnyAsync(c => c.Id == model.CategoryId);

            if (!categoryExists)
            {
                ModelState.AddModelError(
                    nameof(model.CategoryId),
                    "Danh mục không tồn tại. Vui lòng chọn lại.");
            }

            if (!ModelState.IsValid)
            {
                await LoadCategoriesAsync(model);
                return View(model);
            }

            var product = new Product
            {
                Name = model.Name,
                Description = model.Description,
                Price = model.Price,
                CategoryId = model.CategoryId,
                ImageUrl = model.ImageUrl,
                Stock = 0
            };

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            TempData["Success"] = "Đã thêm bánh thành công.";

            return RedirectToAction(nameof(Index));
        }

        // Mở trang nhập hoặc xuất
        [Authorize(Roles = "ADMIN")]
        [HttpGet]
        public async Task<IActionResult> AdjustStock(
            int id, bool isExport = false)
        {
            var product = await _context.Products
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id);

            if (product == null)
            {
                return NotFound();
            }

            return View(new StockAdjustmentViewModel
            {
                ProductId = product.Id,
                ProductName = product.Name,
                CurrentStock = product.Stock,
                IsExport = isExport
            });
        }

        // Lưu thay đổi số lượng
        [Authorize(Roles = "ADMIN")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AdjustStock(
            StockAdjustmentViewModel model)
        {
            var product = await _context.Products
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == model.ProductId);

            if (product == null)
            {
                return NotFound();
            }

            model.ProductName = product.Name;
            model.CurrentStock = product.Stock;

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            int updatedRows;

            if (model.IsExport)
            {
                updatedRows = await _context.Products
                    .Where(p => p.Id == model.ProductId
                        && p.Stock >= model.Quantity)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(
                            p => p.Stock,
                            p => p.Stock - model.Quantity));
            }
            else
            {
                int maximumStockBeforeImport =
                    int.MaxValue - model.Quantity;

                updatedRows = await _context.Products
                    .Where(p => p.Id == model.ProductId
                        && p.Stock <= maximumStockBeforeImport)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(
                            p => p.Stock,
                            p => p.Stock + model.Quantity));
            }

            if (updatedRows == 0)
            {
                var currentProduct = await _context.Products
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == model.ProductId);

                if (currentProduct == null)
                {
                    return NotFound();
                }

                model.CurrentStock = currentProduct.Stock;
                model.ProductName = currentProduct.Name;

                ModelState.AddModelError(
                    nameof(model.Quantity),
                    model.IsExport
                        ? $"Không đủ bánh để xuất. Hiện còn {model.CurrentStock} bánh."
                        : "Số lượng sau khi nhập vượt giới hạn cho phép.");

                return View(model);
            }

            TempData["Success"] = model.IsExport
                ? $"Đã xuất {model.Quantity} bánh."
                : $"Đã nhập thêm {model.Quantity} bánh.";

            return RedirectToAction(nameof(Index));
        }

        [Authorize(Roles = "ADMIN")]
        [HttpGet]
        public async Task<IActionResult> Edit(int id)
        {
            var p = await _context.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
            if (p == null) return NotFound();
            var model = new ProductEditViewModel { Id = p.Id, Name = p.Name,
                Description = p.Description, Price = p.Price, CategoryId = p.CategoryId, ImageUrl = p.ImageUrl };
            await LoadCategoriesAsync(model);
            return View(model);
        }

        [Authorize(Roles = "ADMIN")]
        [HttpPost, ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, ProductEditViewModel model)
        {
            if (id != model.Id) return BadRequest();
            model.Name = (model.Name ?? "").Trim();
            if (string.IsNullOrWhiteSpace(model.Name)) ModelState.AddModelError("Name", "Nhập tên bánh.");
            ValidateImage(model);
            if (!await _context.Categories.AnyAsync(c => c.Id == model.CategoryId))
                ModelState.AddModelError("CategoryId", "Danh mục không tồn tại.");
            if (!ModelState.IsValid) { await LoadCategoriesAsync(model); return View(model); }
            // Chỉ sửa thông tin, không ghi đè số lượng đang thay đổi ở phiên khác.
            var rows = await _context.Products.Where(p => p.Id == id).ExecuteUpdateAsync(s => s
                .SetProperty(p => p.Name, model.Name)
                .SetProperty(p => p.Description, model.Description)
                .SetProperty(p => p.Price, model.Price)
                .SetProperty(p => p.CategoryId, model.CategoryId)
                .SetProperty(p => p.ImageUrl, model.ImageUrl));
            if (rows == 0) return NotFound();
            TempData["Success"] = "Đã sửa thông tin bánh.";
            return RedirectToAction(nameof(Index));
        }

        private void ValidateImage(ProductCreateViewModel model)
        {
            model.ImageUrl = model.ImageUrl?.Trim();
            if (string.IsNullOrEmpty(model.ImageUrl)) { model.ImageUrl = null; return; }
            if (model.ImageUrl.StartsWith("/images/", StringComparison.Ordinal)
                && !model.ImageUrl.Contains("..") && !model.ImageUrl.Contains('\\')) return;
            if (Uri.TryCreate(model.ImageUrl, UriKind.Absolute, out var uri)
                && (uri.Scheme == "https" || uri.Scheme == "http")) return;
            ModelState.AddModelError("ImageUrl", "Dùng URL http/https hoặc đường dẫn /images/ten-anh.jpg.");
        }

        // Nạp danh mục cho form thêm bánh
        private async Task LoadCategoriesAsync(
            ProductCreateViewModel model)
        {
            model.Categories = await _context.Categories
                .AsNoTracking()
                .OrderBy(c => c.Name)
                .Select(c => new SelectListItem
                {
                    Value = c.Id.ToString(),
                    Text = c.Name
                })
                .ToListAsync();
        }
    }
}
