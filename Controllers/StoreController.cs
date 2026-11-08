using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web_barkery1.data;
using Web_barkery1.Models;
namespace Web_barkery1.Controllers;
public class StoreController(BakeryDbContext db) : Controller
{
    public async Task<IActionResult> Index() => View(await db.StoreInfos.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1) ?? new StoreInfo { Id = 1 });
    [Authorize(Roles = "ADMIN"), HttpGet]
    public async Task<IActionResult> Edit() => View("Edit", await db.StoreInfos.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1) ?? new StoreInfo { Id = 1 });
    [Authorize(Roles = "ADMIN"), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit([Bind("Name,Address,Phone,OpeningHours")] StoreInfo model)
    {
        model.Name = (model.Name ?? "").Trim(); model.Address = (model.Address ?? "").Trim();
        if (string.IsNullOrWhiteSpace(model.Name)) ModelState.AddModelError("Name", "Nhập tên quầy.");
        if (string.IsNullOrWhiteSpace(model.Address)) ModelState.AddModelError("Address", "Nhập địa chỉ.");
        if (!ModelState.IsValid) return View(model);
        var item = await db.StoreInfos.FindAsync(1);
        if (item == null) { item = new StoreInfo { Id = 1 }; db.StoreInfos.Add(item); }
        item.Name = model.Name; item.Address = model.Address;
        item.Phone = model.Phone; item.OpeningHours = model.OpeningHours;
        await db.SaveChangesAsync(); TempData["Success"] = "Đã cập nhật quầy bánh.";
        return RedirectToAction(nameof(Index));
    }
}
