# Chạy bản MVC giao diện giống Bakery_new

Bản này dùng ASP.NET Core MVC, Identity và SQL Server. Giao diện được chuyển trực tiếp từ HTML/CSS/JS trong Bakery_new.zip. Không cần chạy Node.js, npm hay SQLite.

## 1. Dừng bản cũ và giải nén

Trong cửa sổ đang chạy web cũ, nhấn Ctrl+C. Nếu chạy bằng Visual Studio, nhấn Shift+F5. Giải nén ZIP mới ra một thư mục riêng; giữ thư mục cũ để đối chiếu. Không mở project trực tiếp bên trong ZIP.

## 2. Nâng cấp database hiện có (bắt buộc)

1. Mở SSMS, kết nối đúng `(localdb)\MSSQLLocalDB` bằng tài khoản quản trị có quyền tạo bảng/sửa cột.
2. Mở file `Web-barkery1/Database/02_Upgrade_Shop.sql` trong bản vừa giải nén.
3. Chạy toàn bộ file bằng Execute. Kiểm tra Messages không có lỗi.
4. Refresh Tables trong `Web_Bakery`. Bản mới bổ sung `ShopOrders`, `ShopOrderItems`, `ShopCartItems` và các cột hỗ trợ giao diện.

Script dùng lịch sử migration để bỏ qua phần đã chạy, không xóa tài khoản hoặc sản phẩm cũ. Script cũng thêm phần tin tức/vị trí quầy nếu migration CompleteManagement chưa được áp dụng. Database cần đã có Categories, Products và các bảng Identity như bản bạn đang chạy.

`00_Create_New.sql` chỉ dùng cho database mới; không cần chạy file đó cho trường hợp hiện tại. Không xóa database cũ.

## 3. Cấu hình kết nối

Giữ nguyên cấu hình đã chạy thành công. Project vẫn dùng UserSecretsId `150e7157-8935-499f-a26d-d45d6cba79cc`, nên trên cùng tài khoản Windows sẽ đọc lại User Secrets cũ.

Nếu cấu hình trước nằm trong appsettings.json/appsettings.Development.json của bản cũ, hãy chuyển riêng mục ConnectionStrings sang file tương ứng ở bản mới. User Secrets có thể ghi đè appsettings trong môi trường Development.

`secrets.example.json` chỉ là mẫu, ứng dụng không tự đọc file này. Không gửi mật khẩu vào nhóm/chat. Không tạo lại tài khoản chủ quầy nếu tài khoản cũ vẫn đăng nhập được.

## 4. Chạy web

Nhấp đúp `CHAY_WEB.cmd` ở thư mục ngoài cùng. File tự chọn đúng thư mục project.

Khi thấy `Now listening on: http://localhost:5025`, mở http://localhost:5025 trong trình duyệt. Giữ cửa sổ lệnh đang chạy. Không bấm chạy thêm lần nữa trong Visual Studio.

Muốn chạy thủ công: mở terminal tại thư mục chứa Web-barkery1.csproj rồi chạy:

```powershell
dotnet run --project .\Web-barkery1.csproj --launch-profile http
```

Để sửa code bằng Visual Studio: File > Open > Project/Solution > chọn Web-barkery1.csproj. Không cần dùng Folder View.

## 5. Kiểm tra theo thứ tự

1. Trang chủ: kiểm tra sản phẩm hiện có và các mục Trang chủ / Sản phẩm / Tin tức / Vị trí quầy.
2. Tài khoản > đăng nhập bằng tài khoản chủ quầy cũ. Vào Quản lý.
3. Tạo danh mục, thêm sản phẩm, nhập 10 bánh. Sản phẩm mới bắt đầu tồn kho 0; bấm Nhập để có bánh bán.
4. Xuất 2 bánh hỏng: tồn còn 8. Thử xuất 9: phải báo không đủ. Xuất không xóa loại bánh.
5. Mở cửa sổ ẩn danh, thêm 2 bánh vào giỏ và đặt hàng. Máy chủ tự lấy giá, trừ kho khi đặt thành công. Lưu đường dẫn theo dõi đơn khách vãng lai.
6. Chủ quầy hoặc nhân viên mở đơn, xác nhận > chuẩn bị > giao > hoàn thành. Đơn hoàn thành xuất hiện trong doanh thu theo ngày Việt Nam.
7. Thử hủy một đơn chưa giao: tồn kho được hoàn. Không thể hủy lại hay thay đổi đơn đã hoàn thành.
8. Thêm tài khoản STAFF. Tài khoản này chỉ xử lý đơn; không có quyền thêm/sửa sản phẩm, nhập/xuất kho hoặc xem doanh thu.
9. Vô hiệu hóa STAFF: lần truy cập tiếp theo phải hết phiên; không đăng nhập lại được.
10. Thử sửa danh mục, tin tức, địa chỉ quầy; đăng ký khách hàng và lưu hồ sơ cá nhân.

## Chức năng và giới hạn

- Giao diện trang chủ, sản phẩm, giỏ hàng, đặt hàng, theo dõi đơn, tài khoản và dashboard lấy từ bản VS Code.
- Chủ quầy quản lý bánh, danh mục, tin tức, vị trí một quầy, tài khoản nhân viên; theo dõi doanh thu 7 ngày và bánh bán chạy.
- Khách có thể mua không đăng nhập hoặc đăng ký/đăng nhập. Khách đã đăng nhập chỉ xem đơn của mình.
- Cookie Identity và chống CSRF bảo vệ các thao tác. Quyền được kiểm tra tại máy chủ, không dựa vào localStorage.
- Chuyển khoản chỉ ghi nhận lựa chọn thanh toán thủ công; không có cổng thanh toán/QR đối soát tự động. Hoàn thành đơn là mốc tính doanh thu.
- Dữ liệu tài khoản/đơn hàng SQLite của bản Node không tự chuyển sang SQL Server. Dữ liệu SQL hiện tại được giữ nguyên.
- Ảnh banner và một số ảnh dùng URL bên ngoài như bản gốc; cần Internet. Có ảnh thay thế nếu tải ảnh thất bại.
- Các view MVC quản lý của bản trước vẫn được giữ để tham khảo. Giao diện mới nằm trong Views/Shop; API chia theo chức năng ở Controllers/Api; CSS/JS ở wwwroot.

## Khi gặp lỗi

- `Invalid object name 'ShopOrders'` hoặc `Invalid column name 'OldPrice'`: chưa chạy xong 02_Upgrade_Shop.sql trên đúng database.
- `MSB1003`: terminal sai thư mục; dùng CHAY_WEB.cmd.
- File exe đang được dùng / cổng 5025 đang bận: dừng cửa sổ web cũ bằng Ctrl+C rồi chạy lại một lần.
- `Login failed` / lỗi 18456: kiểm tra cấu hình đang thực sự được dùng trong User Secrets; không sửa secrets.example.json để kết nối.
- Không có ảnh/tên bánh giống bản mẫu: trang đọc dữ liệu SQL hiện có, không chèn đè dữ liệu mẫu. Chủ quầy sửa tên, ảnh và giá trong Quản lý.
- Nếu đặt hàng báo hết thời gian chờ, kiểm tra danh sách đơn trước khi đặt lại; tránh tạo hai đơn khi kết nối chập chờn.
