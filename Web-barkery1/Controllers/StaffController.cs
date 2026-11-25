using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Web_barkery1.Models;
namespace Web_barkery1.Controllers;
[Authorize(Roles = "ADMIN")]
public class StaffController(UserManager<ApplicationUser> users) : Controller
{
    public async Task<IActionResult> Index() => View(await users.GetUsersInRoleAsync("STAFF"));
    [HttpGet] public IActionResult Create() => View(new StaffCreateViewModel());
    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(StaffCreateViewModel model)
    {
        model.FullName = (model.FullName ?? "").Trim(); model.Email = (model.Email ?? "").Trim();
        if (string.IsNullOrWhiteSpace(model.FullName)) ModelState.AddModelError("FullName", "Nhập họ tên.");
        if (!ModelState.IsValid) return View(model);
        var user = new ApplicationUser { UserName = model.Email, Email = model.Email, FullName = model.FullName };
        var result = await users.CreateAsync(user, model.Password);
        if (result.Succeeded) {
            result = await users.AddToRoleAsync(user, "STAFF");
            if (!result.Succeeded) await users.DeleteAsync(user);
        }
        if (!result.Succeeded) {
            foreach (var error in result.Errors) ModelState.AddModelError("", error.Description);
            return View(model);
        }
        TempData["Success"] = "Đã tạo nhân viên."; return RedirectToAction(nameof(Index));
    }
    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(string id)
    {
        var user = await users.FindByIdAsync(id);
        if (user == null) return NotFound();
        var roles = await users.GetRolesAsync(user);
        // Chỉ xóa tài khoản chỉ có quyền STAFF, không cho xóa chủ quầy.
        if (roles.Count != 1 || roles[0] != "STAFF") return Forbid();
        var result = await users.DeleteAsync(user);
        TempData[result.Succeeded ? "Success" : "Error"] = result.Succeeded
            ? "Đã xóa tài khoản nhân viên." : string.Join("; ", result.Errors.Select(e => e.Description));
        return RedirectToAction(nameof(Index));
    }
}
