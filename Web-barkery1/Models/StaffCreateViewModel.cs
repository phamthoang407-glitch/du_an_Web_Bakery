using System.ComponentModel.DataAnnotations;
namespace Web_barkery1.Models;
public class StaffCreateViewModel
{
    [Required, StringLength(100)] public string FullName { get; set; } = string.Empty;
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required, DataType(DataType.Password), MinLength(8)] public string Password { get; set; } = string.Empty;
}
