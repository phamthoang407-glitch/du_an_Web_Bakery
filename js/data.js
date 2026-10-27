/**
 * data.js
 * ---------------------------------------------------------------------------
 * Tầng dữ liệu (Data Layer) của website "Hương Rừng Coffee".
 *  - Mock data: sản phẩm, tin tức, cửa hàng.
 *  - Các lớp mô hình (Product, Article, Store) bổ sung thuộc tính tính toán.
 *  - DataService: truy vấn / tìm kiếm / lọc / sắp xếp / phân trang.
 *
 * File này KHÔNG thao tác DOM. Nạp bằng thẻ <script> thường (không cần module),
 * xuất ra các biến toàn cục: AppData, DataService, Product, Article, Store.
 *
 * Thứ tự nạp script: data.js -> main.js -> js của từng trang.
 * ---------------------------------------------------------------------------
 */
(function (global) {
  'use strict';

  /* ======================================================================
   * 1. HÀM TIỆN ÍCH NỘI BỘ
   * ==================================================================== */

  /** Chuẩn hóa chuỗi: bỏ dấu tiếng Việt, về chữ thường (phục vụ tìm kiếm). */
  const normalizeText = (str = '') =>
    String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();

  /**
   * Tạo ảnh minh họa SVG (data URI) để không phụ thuộc ảnh bên ngoài.
   * Có thể thay bằng đường dẫn ảnh thật bất cứ lúc nào.
   */
  const svgImage = (emoji, from, to, width = 600, height = 600) => {
    const fontSize = Math.round(Math.min(width, height) * 0.38);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
      `</linearGradient></defs>` +
      `<rect width="${width}" height="${height}" fill="url(#g)"/>` +
      `<text x="50%" y="52%" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle">${emoji}</text>` +
      `</svg>`;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  };

  /** Tạo bộ 3 ảnh (thư viện ảnh) cho một sản phẩm. */
  const gallery = (emojis, [from, to]) => emojis.map((e, i) => svgImage(e, i % 2 ? to : from, i % 2 ? from : to));

  /* ======================================================================
   * 2. CẤU HÌNH CHUNG & DANH MỤC
   * ==================================================================== */

  const SITE = Object.freeze({
    name: 'Hương Rừng Coffee',
    tagline: 'Cà phê Việt – Từ cao nguyên đến tách của bạn',
    hotline: '1900 6868',
    email: 'xinchao@huongrung.coffee',
    address: '25 Phố Tràng Tiền, Hoàn Kiếm, Hà Nội',
    workingHours: '07:00 – 22:00 (hằng ngày)',
    socials: Object.freeze({
      facebook: 'https://facebook.com',
      instagram: 'https://instagram.com',
      youtube: 'https://youtube.com',
    }),
  });

  const CATEGORIES = Object.freeze([
    { id: 'ca-phe-rang', name: 'Cà phê rang xay', icon: '🫘' },
    { id: 'cold-brew-hoa-tan', name: 'Cold brew & Hòa tan', icon: '🧊' },
    { id: 'dung-cu', name: 'Dụng cụ pha chế', icon: '🫖' },
    { id: 'qua-tang', name: 'Quà tặng', icon: '🎁' },
  ]);

  const ROAST_LEVELS = Object.freeze([
    { id: 'light', name: 'Rang sáng' },
    { id: 'medium', name: 'Rang vừa' },
    { id: 'dark', name: 'Rang đậm' },
  ]);

  const SORT_OPTIONS = Object.freeze([
    { value: 'newest', label: 'Mới nhất' },
    { value: 'bestseller', label: 'Bán chạy nhất' },
    { value: 'price-asc', label: 'Giá tăng dần' },
    { value: 'price-desc', label: 'Giá giảm dần' },
    { value: 'rating-desc', label: 'Đánh giá cao' },
    { value: 'name-asc', label: 'Tên A → Z' },
  ]);

  const NEWS_CATEGORIES = Object.freeze([
    { id: 'kien-thuc', name: 'Kiến thức cà phê' },
    { id: 'cong-thuc', name: 'Công thức pha chế' },
    { id: 'khuyen-mai', name: 'Khuyến mãi' },
    { id: 'cau-chuyen', name: 'Câu chuyện thương hiệu' },
  ]);

  const STORE_SERVICES = Object.freeze({
    wifi: 'Wi-Fi miễn phí',
    parking: 'Chỗ đậu xe',
    takeaway: 'Mang đi',
    workspace: 'Không gian làm việc',
    delivery: 'Giao hàng tận nơi',
  });

  /* ======================================================================
   * 3. MOCK DATA: SẢN PHẨM
   * ==================================================================== */

  const RAW_PRODUCTS = [
    {
      id: 1,
      name: 'Arabica Cầu Đất Rang Vừa 250g',
      category: 'ca-phe-rang',
      price: 189000,
      salePrice: 159000,
      rating: 4.8,
      reviews: 214,
      stock: 120,
      sold: 1840,
      badge: 'Bán chạy',
      roast: 'medium',
      origin: 'Cầu Đất, Đà Lạt',
      weight: '250g',
      createdAt: '2026-03-12',
      shortDescription: 'Hậu vị ngọt thanh, hương hoa và caramel đặc trưng của cao nguyên Cầu Đất.',
      description:
        'Arabica Cầu Đất được trồng ở độ cao 1.500m, thu hái chín đỏ bằng tay và sơ chế ướt. Mức rang vừa giữ trọn vị chua nhẹ, hương hoa và hậu ngọt caramel, phù hợp pha phin, pour over và espresso.',
      features: ['100% Arabica nguyên chất', 'Rang tươi theo đơn đặt hàng', 'Đóng gói túi van một chiều giữ hương', 'Phù hợp pha phin, pour over, espresso'],
      specs: { 'Giống cà phê': 'Arabica Catimor', 'Độ cao': '1.500 m', 'Sơ chế': 'Ướt (Washed)', 'Hương vị': 'Hoa, caramel, cam quýt', 'Hạn sử dụng': '12 tháng' },
      images: gallery(['☕', '🫘', '🌿'], ['#8a5a3b', '#d9a066']),
    },
    {
      id: 2,
      name: 'Robusta Buôn Ma Thuột Rang Đậm 500g',
      category: 'ca-phe-rang',
      price: 175000,
      salePrice: null,
      rating: 4.6,
      reviews: 168,
      stock: 200,
      sold: 2310,
      badge: null,
      roast: 'dark',
      origin: 'Buôn Ma Thuột, Đắk Lắk',
      weight: '500g',
      createdAt: '2026-01-20',
      shortDescription: 'Đậm đà, đắng mạnh, hậu vị chocolate – chuẩn vị cà phê phin truyền thống.',
      description:
        'Robusta Đắk Lắk rang đậm cho tách cà phê phin mạnh mẽ, nhiều crema, hậu vị chocolate đen và hạt dẻ. Lựa chọn quen thuộc cho cà phê sữa đá kiểu Việt.',
      features: ['100% Robusta chọn lọc', 'Hàm lượng caffeine cao', 'Rang đậm, xay sẵn hoặc nguyên hạt', 'Ngon nhất khi pha phin với sữa đặc'],
      specs: { 'Giống cà phê': 'Robusta', 'Độ cao': '600 m', 'Sơ chế': 'Khô (Natural)', 'Hương vị': 'Chocolate đen, hạt dẻ', 'Hạn sử dụng': '12 tháng' },
      images: gallery(['🫘', '☕', '🔥'], ['#3b2a20', '#7a4a2b']),
    },
    {
      id: 3,
      name: 'Culi Đắk Lắk Nguyên Chất 500g',
      category: 'ca-phe-rang',
      price: 210000,
      salePrice: null,
      rating: 4.7,
      reviews: 96,
      stock: 75,
      sold: 760,
      badge: null,
      roast: 'dark',
      origin: 'Cư M’gar, Đắk Lắk',
      weight: '500g',
      createdAt: '2026-04-02',
      shortDescription: 'Hạt culi tròn đều, vị đậm gắt, hương thơm nồng nàn đặc trưng.',
      description:
        'Culi (peaberry) là những hạt cà phê tròn do chỉ có một nhân trong quả. Hạt culi rang lên cho vị đậm, hương thơm sâu và độ sánh cao, dành cho người thích tách cà phê mạnh.',
      features: ['100% hạt culi tuyển chọn', 'Độ sánh cao, hậu vị kéo dài', 'Rang xay mới mỗi tuần'],
      specs: { 'Giống cà phê': 'Robusta Culi', 'Độ cao': '700 m', 'Sơ chế': 'Khô (Natural)', 'Hương vị': 'Đậm, khói nhẹ, cacao', 'Hạn sử dụng': '12 tháng' },
      images: gallery(['🫘', '🌱', '☕'], ['#4a2f1f', '#9b6a3f']),
    },
    {
      id: 4,
      name: 'Blend Signature Hương Rừng 1kg',
      category: 'ca-phe-rang',
      price: 389000,
      salePrice: 329000,
      rating: 4.9,
      reviews: 342,
      stock: 60,
      sold: 2950,
      badge: 'Giảm giá',
      roast: 'medium',
      origin: 'Phối trộn Tây Nguyên',
      weight: '1kg',
      createdAt: '2025-11-08',
      shortDescription: 'Công thức độc quyền: 60% Robusta, 40% Arabica – cân bằng đắng, ngọt và thơm.',
      description:
        'Signature Blend là công thức bán chạy nhất của Hương Rừng. Sự kết hợp giữa Robusta Đắk Lắk và Arabica Cầu Đất tạo nên tách cà phê đậm đà nhưng vẫn mềm mại, thơm hương trái cây chín.',
      features: ['Công thức độc quyền 60/40', 'Gói 1kg tiết kiệm cho quán và gia đình', 'Hợp mọi cách pha: phin, máy, moka pot'],
      specs: { 'Giống cà phê': 'Robusta & Arabica', 'Tỉ lệ': '60% Robusta – 40% Arabica', 'Hương vị': 'Cacao, trái cây chín, mật ong', 'Mức rang': 'Vừa', 'Hạn sử dụng': '12 tháng' },
      images: gallery(['☕', '⭐', '🫘'], ['#6f4e37', '#c8873a']),
    },
    {
      id: 5,
      name: 'Arabica Sơn La Rang Sáng 250g',
      category: 'ca-phe-rang',
      price: 205000,
      salePrice: null,
      rating: 4.5,
      reviews: 58,
      stock: 40,
      sold: 320,
      badge: 'Mới',
      roast: 'light',
      origin: 'Thuận Châu, Sơn La',
      weight: '250g',
      createdAt: '2026-09-15',
      shortDescription: 'Specialty coffee vùng Tây Bắc, chua thanh, hương trái cây nhiệt đới.',
      description:
        'Arabica Sơn La rang sáng nhấn mạnh vị chua sáng, hương mận, cam và hoa nhài. Dành cho người yêu cà phê specialty và các phương pháp pha filter.',
      features: ['Điểm cupping 84+', 'Rang sáng giữ nguyên hương vị nguyên bản', 'Lô nhỏ giới hạn theo mùa vụ'],
      specs: { 'Giống cà phê': 'Arabica Typica', 'Độ cao': '1.100 m', 'Sơ chế': 'Mật ong (Honey)', 'Hương vị': 'Mận, cam, hoa nhài', 'Hạn sử dụng': '9 tháng' },
      images: gallery(['🍊', '☕', '🌸'], ['#c9803f', '#e8b873']),
    },
    {
      id: 6,
      name: 'Cold Brew Chai Sẵn Uống 500ml',
      category: 'cold-brew-hoa-tan',
      price: 99000,
      salePrice: 85000,
      rating: 4.4,
      reviews: 132,
      stock: 150,
      sold: 1420,
      badge: 'Giảm giá',
      roast: 'medium',
      origin: 'Cầu Đất, Đà Lạt',
      weight: '500ml',
      createdAt: '2026-06-05',
      shortDescription: 'Ủ lạnh 18 giờ, vị êm mượt, ít đắng, uống liền hoặc pha cùng sữa.',
      description:
        'Cold brew được ủ trong nước lạnh suốt 18 giờ để chiết xuất vị ngọt tự nhiên, giảm độ chua và đắng. Chỉ cần rót ra ly đá là có ngay một tách cà phê mát lạnh.',
      features: ['Ủ lạnh 18 giờ', 'Không chất bảo quản', 'Bảo quản lạnh, dùng trong 14 ngày'],
      specs: { 'Dung tích': '500 ml', 'Nguyên liệu': 'Arabica Cầu Đất', 'Bảo quản': '2–6°C', 'Hạn sử dụng': '14 ngày sau sản xuất' },
      images: gallery(['🧊', '🥤', '☕'], ['#4b6b7a', '#9fc5d6']),
    },
    {
      id: 7,
      name: 'Cà Phê Sữa Đá Hòa Tan (Hộp 18 gói)',
      category: 'cold-brew-hoa-tan',
      price: 85000,
      salePrice: null,
      rating: 4.3,
      reviews: 301,
      stock: 400,
      sold: 4120,
      badge: 'Bán chạy',
      roast: 'medium',
      origin: 'Tây Nguyên',
      weight: '18 gói x 16g',
      createdAt: '2025-12-01',
      shortDescription: 'Pha nhanh trong 30 giây, vị cà phê sữa đá đậm đà kiểu Việt.',
      description:
        'Cà phê hòa tan sữa đá làm từ cà phê rang xay sấy lạnh, kết hợp sữa béo thơm. Chỉ cần hòa với nước nóng hoặc lạnh, rất tiện cho văn phòng và chuyến đi.',
      features: ['Sấy lạnh giữ hương', 'Gói tiện lợi 16g', 'Hòa tan hoàn toàn trong nước lạnh'],
      specs: { 'Quy cách': 'Hộp 18 gói x 16g', 'Thành phần': 'Cà phê, đường, sữa bột', 'Hạn sử dụng': '18 tháng' },
      images: gallery(['🥛', '☕', '🧊'], ['#a8744f', '#e3c19b']),
    },
    {
      id: 8,
      name: 'Cold Brew Túi Lọc (Hộp 10 túi)',
      category: 'cold-brew-hoa-tan',
      price: 129000,
      salePrice: null,
      rating: 4.6,
      reviews: 87,
      stock: 90,
      sold: 640,
      badge: 'Mới',
      roast: 'light',
      origin: 'Cầu Đất, Đà Lạt',
      weight: '10 túi x 20g',
      createdAt: '2026-08-22',
      shortDescription: 'Ngâm túi lọc với nước lạnh qua đêm, sáng dậy có ngay cold brew.',
      description:
        'Mỗi túi lọc chứa 20g Arabica xay thô chuyên dụng cho cold brew. Thả túi vào bình 600ml nước lạnh, ngâm 12 giờ trong tủ lạnh là có bình cold brew thơm mát.',
      features: ['Túi lọc tiện dụng, không cặn', 'Xay thô chuyên cho cold brew', 'Mỗi túi cho 600ml'],
      specs: { 'Quy cách': 'Hộp 10 túi x 20g', 'Giống': 'Arabica', 'Thời gian ủ': '12 giờ', 'Hạn sử dụng': '12 tháng' },
      images: gallery(['🫙', '🧊', '🍃'], ['#5d7f6a', '#b5d3bd']),
    },
    {
      id: 9,
      name: 'Phin Inox Cao Cấp Size M',
      category: 'dung-cu',
      price: 79000,
      salePrice: null,
      rating: 4.7,
      reviews: 410,
      stock: 500,
      sold: 5230,
      badge: 'Bán chạy',
      roast: null,
      origin: 'Việt Nam',
      weight: '120g',
      createdAt: '2025-10-10',
      shortDescription: 'Inox 304 dày dặn, lỗ lọc đều giúp cà phê nhỏ giọt đẹp mắt.',
      description:
        'Phin cà phê inox 304 không gỉ, đáy lọc đục laser đều, nắp đậy giữ nhiệt. Dung tích 150ml, phù hợp pha 1–2 tách cà phê.',
      features: ['Inox 304 an toàn thực phẩm', 'Đáy lọc đục laser', 'Dễ vệ sinh, bền bỉ'],
      specs: { 'Chất liệu': 'Inox 304', 'Dung tích': '150 ml', 'Kích thước': 'Size M (Ø 7cm)', 'Bảo hành': '6 tháng' },
      images: gallery(['🫖', '☕', '✨'], ['#8d8d8d', '#d6d6d6']),
    },
    {
      id: 10,
      name: 'Bộ Pour Over V60 Thủy Tinh',
      category: 'dung-cu',
      price: 459000,
      salePrice: 399000,
      rating: 4.8,
      reviews: 74,
      stock: 35,
      sold: 410,
      badge: 'Giảm giá',
      roast: null,
      origin: 'Nhật Bản',
      weight: '780g',
      createdAt: '2026-02-18',
      shortDescription: 'Bộ phễu V60, bình server 600ml và 40 giấy lọc cho người mới bắt đầu.',
      description:
        'Bộ dụng cụ pour over gồm phễu V60 thủy tinh chịu nhiệt, bình server 600ml chia vạch và 40 giấy lọc. Cho tách cà phê sạch vị, nổi bật hương hoa quả.',
      features: ['Thủy tinh borosilicate chịu nhiệt', 'Bình server chia vạch', 'Tặng kèm 40 giấy lọc'],
      specs: { 'Chất liệu': 'Thủy tinh borosilicate', 'Dung tích server': '600 ml', 'Gồm': 'Phễu, server, 40 giấy lọc', 'Bảo hành': '3 tháng' },
      images: gallery(['🫗', '☕', '🧪'], ['#7aa0b5', '#d3e6ef']),
    },
    {
      id: 11,
      name: 'Máy Xay Cà Phê Cầm Tay Lưỡi Thép',
      category: 'dung-cu',
      price: 890000,
      salePrice: 790000,
      rating: 4.9,
      reviews: 126,
      stock: 28,
      sold: 530,
      badge: 'Giảm giá',
      roast: null,
      origin: 'Đài Loan',
      weight: '650g',
      createdAt: '2026-05-14',
      shortDescription: 'Lưỡi xay thép không gỉ, 30 mức chỉnh độ mịn từ espresso đến French press.',
      description:
        'Máy xay cầm tay với lưỡi xay conical bằng thép, vòng bi kép cho thao tác êm và nhẹ. Hộc chứa 25g hạt, thích hợp mang đi du lịch hoặc dùng tại nhà.',
      features: ['Lưỡi conical thép không gỉ', '30 mức chỉnh độ mịn', 'Vòng bi kép, quay êm', 'Hộc chứa 25g hạt'],
      specs: { 'Chất liệu': 'Thép không gỉ & nhôm', 'Dung tích hộc': '25 g', 'Điều chỉnh': '30 nấc', 'Bảo hành': '12 tháng' },
      images: gallery(['⚙️', '🫘', '☕'], ['#4d4d4d', '#9a9a9a']),
    },
    {
      id: 12,
      name: 'Bình French Press 600ml',
      category: 'dung-cu',
      price: 329000,
      salePrice: null,
      rating: 4.5,
      reviews: 64,
      stock: 0,
      sold: 290,
      badge: null,
      roast: null,
      origin: 'Châu Âu',
      weight: '520g',
      createdAt: '2025-09-25',
      shortDescription: 'Khung inox, bình thủy tinh dày, pha cà phê đậm vị chỉ trong 4 phút.',
      description:
        'French Press 600ml với bộ lọc 3 lớp giữ trọn tinh dầu cà phê. Khung inox bền chắc, tay cầm cách nhiệt, pha được 3–4 tách mỗi lần.',
      features: ['Bộ lọc 3 lớp', 'Tay cầm cách nhiệt', 'Pha 3–4 tách mỗi lần'],
      specs: { 'Chất liệu': 'Thủy tinh & inox', 'Dung tích': '600 ml', 'Bảo hành': '6 tháng' },
      images: gallery(['🫖', '☕', '🥄'], ['#6b5a4a', '#bba48e']),
    },
    {
      id: 13,
      name: 'Hộp Quà Tặng Hương Rừng Premium',
      category: 'qua-tang',
      price: 650000,
      salePrice: 590000,
      rating: 4.9,
      reviews: 88,
      stock: 50,
      sold: 470,
      badge: 'Bán chạy',
      roast: 'medium',
      origin: 'Tây Nguyên',
      weight: '900g',
      createdAt: '2026-09-30',
      shortDescription: 'Gồm 2 gói cà phê 250g, phin inox, 2 ly sứ và thiệp chúc mừng.',
      description:
        'Hộp quà sang trọng cho dịp lễ, Tết hoặc tri ân đối tác. Bên trong gồm Arabica Cầu Đất, Signature Blend, một phin inox cao cấp, hai ly sứ và thiệp viết tay.',
      features: ['Hộp cứng cao cấp, nơ lụa', 'Tặng thiệp viết tay', 'Giao nhanh nội thành trong 2 giờ'],
      specs: { 'Gồm': '2 gói cà phê 250g, phin, 2 ly sứ, thiệp', 'Kích thước hộp': '30 x 22 x 10 cm', 'Hạn sử dụng': '12 tháng' },
      images: gallery(['🎁', '☕', '🎀'], ['#9c2f3a', '#e08a8f']),
    },
    {
      id: 14,
      name: 'Bộ 2 Ly Sứ Thủ Công Men Rạn',
      category: 'qua-tang',
      price: 249000,
      salePrice: null,
      rating: 4.6,
      reviews: 45,
      stock: 80,
      sold: 360,
      badge: 'Mới',
      roast: null,
      origin: 'Bát Tràng, Hà Nội',
      weight: '600g',
      createdAt: '2026-10-05',
      shortDescription: 'Gốm Bát Tràng men rạn, dung tích 180ml, đi kèm đĩa lót.',
      description:
        'Bộ hai ly sứ làm thủ công tại làng gốm Bát Tràng, phủ men rạn tự nhiên, mỗi chiếc có vân độc đáo. Đóng hộp giấy kraft kèm đĩa lót gỗ.',
      features: ['Làm thủ công 100%', 'Men rạn độc bản', 'Đóng hộp kraft sẵn sàng làm quà'],
      specs: { 'Chất liệu': 'Gốm sứ Bát Tràng', 'Dung tích': '180 ml / ly', 'Số lượng': '2 ly + 2 đĩa lót' },
      images: gallery(['🍵', '☕', '🏺'], ['#c4b6a3', '#efe5d6']),
    },
  ];

  /* ======================================================================
   * 4. MOCK DATA: TIN TỨC
   * ==================================================================== */

  const RAW_ARTICLES = [
    {
      id: 1,
      title: '5 cách pha cà phê phin ngon như quán ngay tại nhà',
      category: 'cong-thuc',
      author: 'Ngọc Anh',
      date: '2026-10-12',
      readMinutes: 5,
      featured: true,
      tags: ['phin', 'pha chế', 'tại nhà'],
      excerpt: 'Chỉ với vài thay đổi nhỏ về độ xay, nhiệt độ nước và thời gian ủ, tách phin của bạn sẽ khác biệt hoàn toàn.',
      content: [
        'Cà phê phin là cách pha quen thuộc nhất của người Việt, nhưng để có một tách ngon thật sự cần chú ý đến vài chi tiết nhỏ: độ xay, lượng cà phê, nhiệt độ nước và thời gian ủ.',
        'Hãy dùng 18–20g cà phê xay vừa cho một phin size M. Tráng phin bằng nước nóng, cho bột vào, lắc nhẹ cho phẳng rồi nén nhẹ nắp gài. Rót khoảng 30ml nước 92–95°C, đợi 30 giây cho cà phê nở đều rồi mới rót đầy.',
        'Một tách phin chuẩn nhỏ giọt khoảng 4–5 phút. Nếu nhỏ quá nhanh, hãy xay mịn hơn; nếu quá chậm hoặc đắng gắt, hãy xay thô hơn. Thử điều chỉnh từng bước và ghi lại để tìm ra công thức riêng cho bạn.',
      ],
      image: svgImage('☕', '#8a5a3b', '#d9a066', 800, 450),
    },
    {
      id: 2,
      title: 'Arabica và Robusta: khác nhau thế nào?',
      category: 'kien-thuc',
      author: 'Minh Quân',
      date: '2026-10-03',
      readMinutes: 6,
      featured: false,
      tags: ['arabica', 'robusta', 'kiến thức'],
      excerpt: 'Hai giống cà phê phổ biến nhất thế giới có hương vị, hàm lượng caffeine và điều kiện trồng rất khác nhau.',
      content: [
        'Arabica thường được trồng ở độ cao trên 1.000m, cho vị chua thanh, hương hoa quả và hậu ngọt. Robusta lại phát triển tốt ở vùng thấp hơn, cho vị đậm, đắng mạnh và hàm lượng caffeine cao gần gấp đôi.',
        'Việt Nam là nước xuất khẩu Robusta lớn nhất thế giới, tập trung ở Đắk Lắk, Gia Lai và Lâm Đồng. Trong khi đó Arabica chất lượng cao được trồng ở Cầu Đất, Sơn La và Quảng Trị.',
        'Không có giống nào “tốt hơn”, chỉ có giống phù hợp với khẩu vị của bạn. Nhiều người chọn blend giữa hai loại để cân bằng giữa độ đậm và độ thơm.',
      ],
      image: svgImage('🌱', '#4f7a55', '#a9cfa4', 800, 450),
    },
    {
      id: 3,
      title: 'Ưu đãi mùa thu: giảm đến 25% toàn bộ cà phê rang xay',
      category: 'khuyen-mai',
      author: 'Hương Rừng',
      date: '2026-10-10',
      readMinutes: 2,
      featured: false,
      tags: ['khuyến mãi', 'mùa thu'],
      excerpt: 'Từ 10/10 đến 31/10, nhận ngay ưu đãi khi mua cà phê rang xay và miễn phí vận chuyển đơn từ 300.000đ.',
      content: [
        'Chào thu 2026, Hương Rừng gửi tặng khách hàng chương trình ưu đãi lớn: giảm đến 25% cho toàn bộ dòng cà phê rang xay, kèm miễn phí vận chuyển cho đơn từ 300.000đ.',
        'Chương trình áp dụng đến hết ngày 31/10/2026 tại website và toàn bộ cửa hàng trên toàn quốc. Mỗi khách hàng được áp dụng tối đa 5 sản phẩm cho mỗi đơn hàng.',
      ],
      image: svgImage('🍂', '#b5561f', '#f0a868', 800, 450),
    },
    {
      id: 4,
      title: 'Hành trình từ cây cà phê Cầu Đất đến tách cà phê của bạn',
      category: 'cau-chuyen',
      author: 'Thu Hà',
      date: '2026-09-20',
      readMinutes: 7,
      featured: true,
      tags: ['câu chuyện', 'Cầu Đất', 'nông trại'],
      excerpt: 'Chúng tôi cùng bạn ghé thăm nông trại ở độ cao 1.500m để hiểu vì sao mỗi hạt cà phê đều có câu chuyện riêng.',
      content: [
        'Ở độ cao 1.500m, sương sớm phủ trắng những đồi cà phê Cầu Đất. Những người nông dân ở đây thức dậy từ 4 giờ sáng để hái từng quả chín đỏ, vì chỉ quả chín mới cho vị ngọt tròn đầy.',
        'Sau khi hái, quả được rửa, phơi và sơ chế trong vòng 24 giờ. Hương Rừng làm việc trực tiếp với các hộ nông dân, mua với giá cao hơn thị trường để khuyến khích canh tác bền vững.',
        'Hạt cà phê sau đó được rang tại xưởng nhỏ của chúng tôi, đóng gói ngay trong ngày để mang đến cho bạn hương vị tươi nhất.',
      ],
      image: svgImage('⛰️', '#476b5a', '#b8d4be', 800, 450),
    },
    {
      id: 5,
      title: 'Cold brew tại nhà: công thức 12 giờ cho ngày hè',
      category: 'cong-thuc',
      author: 'Ngọc Anh',
      date: '2026-08-28',
      readMinutes: 4,
      featured: false,
      tags: ['cold brew', 'công thức'],
      excerpt: 'Chỉ cần cà phê xay thô, nước lọc và một chiếc bình, bạn đã có cold brew mát lạnh, ít đắng.',
      content: [
        'Tỉ lệ vàng của cold brew là 1:8, tức 100g cà phê xay thô cho 800ml nước lọc. Cho cà phê và nước vào bình, khuấy nhẹ để thấm đều rồi đậy nắp.',
        'Ủ trong tủ lạnh 12–16 giờ. Sau đó lọc qua giấy lọc hoặc túi vải để loại bỏ cặn. Cold brew có thể bảo quản trong tủ lạnh tối đa 7–10 ngày.',
        'Thưởng thức cùng đá, thêm chút sữa tươi hoặc tonic để có những thức uống sáng tạo.',
      ],
      image: svgImage('🧊', '#4b6b7a', '#9fc5d6', 800, 450),
    },
    {
      id: 6,
      title: 'Cách bảo quản cà phê để giữ hương vị lâu nhất',
      category: 'kien-thuc',
      author: 'Minh Quân',
      date: '2026-07-15',
      readMinutes: 4,
      featured: false,
      tags: ['bảo quản', 'mẹo'],
      excerpt: 'Ánh sáng, độ ẩm và không khí là ba kẻ thù của cà phê. Hãy cùng tìm hiểu cách bảo quản đúng chuẩn.',
      content: [
        'Cà phê rang bắt đầu mất hương ngay sau khi rang xong. Để giữ được lâu, hãy cất cà phê trong hộp kín, đặt nơi khô ráo, thoáng mát và tránh ánh nắng trực tiếp.',
        'Không nên cho cà phê vào tủ lạnh vì độ ẩm có thể làm hạt hút mùi. Nếu mua số lượng lớn, hãy chia nhỏ thành từng phần và chỉ mở túi khi cần dùng.',
        'Tốt nhất bạn nên dùng hết cà phê xay trong 3–4 tuần và cà phê nguyên hạt trong 6–8 tuần kể từ ngày rang.',
      ],
      image: svgImage('🫙', '#7a5a3a', '#cfae86', 800, 450),
    },
  ];

  /* ======================================================================
   * 5. MOCK DATA: CỬA HÀNG
   * ==================================================================== */

  const RAW_STORES = [
    {
      id: 1,
      name: 'Hương Rừng Tràng Tiền',
      city: 'Hà Nội',
      district: 'Hoàn Kiếm',
      address: '25 Phố Tràng Tiền, Hoàn Kiếm, Hà Nội',
      phone: '024 3825 1001',
      open: '07:00',
      close: '22:00',
      lat: 21.0245,
      lng: 105.8552,
      services: ['wifi', 'takeaway', 'delivery', 'workspace'],
      description: 'Cửa hàng flagship với không gian 3 tầng, quầy rang xay trực tiếp và khu thưởng thức cà phê specialty.',
      image: svgImage('🏬', '#6f4e37', '#c8873a', 800, 450),
    },
    {
      id: 2,
      name: 'Hương Rừng Cầu Giấy',
      city: 'Hà Nội',
      district: 'Cầu Giấy',
      address: '112 Trần Thái Tông, Cầu Giấy, Hà Nội',
      phone: '024 3795 2002',
      open: '06:30',
      close: '22:30',
      lat: 21.0333,
      lng: 105.79,
      services: ['wifi', 'parking', 'takeaway', 'workspace', 'delivery'],
      description: 'Không gian rộng rãi phù hợp làm việc và học nhóm, gần khu văn phòng và các trường đại học.',
      image: svgImage('🏢', '#5a4636', '#b89674', 800, 450),
    },
    {
      id: 3,
      name: 'Hương Rừng Nguyễn Huệ',
      city: 'TP. Hồ Chí Minh',
      district: 'Quận 1',
      address: '68 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
      phone: '028 3822 3003',
      open: '07:00',
      close: '23:00',
      lat: 10.7745,
      lng: 106.7035,
      services: ['wifi', 'takeaway', 'delivery'],
      description: 'Nằm ngay phố đi bộ Nguyễn Huệ, view đẹp để ngắm thành phố về đêm cùng tách cà phê.',
      image: svgImage('🌆', '#3d4a66', '#9bb0d6', 800, 450),
    },
    {
      id: 4,
      name: 'Hương Rừng Võ Văn Tần',
      city: 'TP. Hồ Chí Minh',
      district: 'Quận 3',
      address: '215 Võ Văn Tần, Quận 3, TP. Hồ Chí Minh',
      phone: '028 3930 4004',
      open: '06:30',
      close: '22:00',
      lat: 10.7784,
      lng: 106.6851,
      services: ['wifi', 'parking', 'takeaway', 'workspace'],
      description: 'Quán nằm trong con hẻm yên tĩnh có sân vườn xanh mát, thích hợp họp nhóm nhỏ.',
      image: svgImage('🌳', '#4f7a55', '#c0dcb4', 800, 450),
    },
    {
      id: 5,
      name: 'Hương Rừng Sông Hàn',
      city: 'Đà Nẵng',
      district: 'Hải Châu',
      address: '90 Bạch Đằng, Hải Châu, Đà Nẵng',
      phone: '0236 3822 5005',
      open: '06:00',
      close: '22:30',
      lat: 16.0678,
      lng: 108.2247,
      services: ['wifi', 'parking', 'takeaway'],
      description: 'Ngắm sông Hàn và cầu Rồng từ ban công tầng 2, thưởng thức cà phê muối đặc trưng.',
      image: svgImage('🌉', '#2f6a8a', '#9fd3e6', 800, 450),
    },
    {
      id: 6,
      name: 'Hương Rừng Đà Lạt',
      city: 'Đà Lạt',
      district: 'Phường 1',
      address: '12 Trần Phú, Phường 1, Đà Lạt, Lâm Đồng',
      phone: '0263 3822 6006',
      open: '06:30',
      close: '21:30',
      lat: 11.9421,
      lng: 108.4375,
      services: ['wifi', 'parking', 'takeaway', 'delivery'],
      description: 'Nhà rang xay nhỏ giữa đồi thông, nơi du khách trải nghiệm quy trình rang cà phê và tham quan nông trại.',
      image: svgImage('🌲', '#3f6b4f', '#a8cba6', 800, 450),
    },
  ];

  /* ======================================================================
   * 6. LỚP MÔ HÌNH (MODELS)
   * ==================================================================== */

  class Product {
    constructor(raw) {
      Object.assign(this, raw);
    }
    /** Giá thực tế khách phải trả. */
    get currentPrice() {
      return this.isOnSale ? this.salePrice : this.price;
    }
    get isOnSale() {
      return this.salePrice != null && this.salePrice < this.price;
    }
    get discountPercent() {
      return this.isOnSale ? Math.round((1 - this.salePrice / this.price) * 100) : 0;
    }
    get inStock() {
      return this.stock > 0;
    }
    get thumbnail() {
      return this.images[0];
    }
    get categoryName() {
      const found = CATEGORIES.find((c) => c.id === this.category);
      return found ? found.name : '';
    }
    get roastName() {
      const found = ROAST_LEVELS.find((r) => r.id === this.roast);
      return found ? found.name : '';
    }
    /** Chuỗi gộp để tìm kiếm không dấu. */
    get searchIndex() {
      return normalizeText([this.name, this.categoryName, this.origin, this.shortDescription].join(' '));
    }
  }

  class Article {
    constructor(raw) {
      Object.assign(this, raw);
    }
    get dateObj() {
      return new Date(this.date);
    }
    get categoryName() {
      const found = NEWS_CATEGORIES.find((c) => c.id === this.category);
      return found ? found.name : '';
    }
    get searchIndex() {
      return normalizeText([this.title, this.excerpt, this.tags.join(' '), this.author].join(' '));
    }
  }

  class Store {
    constructor(raw) {
      Object.assign(this, raw);
    }
    get hoursLabel() {
      return `${this.open} – ${this.close}`;
    }
    get serviceLabels() {
      return this.services.map((s) => STORE_SERVICES[s]).filter(Boolean);
    }
    get mapUrl() {
      return `https://www.google.com/maps/search/?api=1&query=${this.lat},${this.lng}`;
    }
    /** Kiểm tra cửa hàng có đang mở cửa tại thời điểm `date` không. */
    isOpenNow(date = new Date()) {
      const toMinutes = (hhmm) => {
        const [h, m] = hhmm.split(':').map(Number);
        return h * 60 + m;
      };
      const now = date.getHours() * 60 + date.getMinutes();
      return now >= toMinutes(this.open) && now < toMinutes(this.close);
    }
    get searchIndex() {
      return normalizeText([this.name, this.address, this.district, this.city].join(' '));
    }
  }

  /* ======================================================================
   * 7. DỮ LIỆU ĐÃ KHỞI TẠO
   * ==================================================================== */

  const PRODUCTS = Object.freeze(RAW_PRODUCTS.map((p) => new Product(p)));
  const ARTICLES = Object.freeze(RAW_ARTICLES.map((a) => new Article(a)));
  const STORES = Object.freeze(RAW_STORES.map((s) => new Store(s)));

  /* ======================================================================
   * 8. DATA SERVICE – TRUY VẤN, LỌC, SẮP XẾP, PHÂN TRANG
   * ==================================================================== */

  const PRODUCT_SORTERS = {
    newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    bestseller: (a, b) => b.sold - a.sold,
    'price-asc': (a, b) => a.currentPrice - b.currentPrice,
    'price-desc': (a, b) => b.currentPrice - a.currentPrice,
    'rating-desc': (a, b) => b.rating - a.rating || b.reviews - a.reviews,
    'name-asc': (a, b) => a.name.localeCompare(b.name, 'vi'),
  };

  class DataService {
    /** Chuẩn hóa chuỗi (bỏ dấu, chữ thường) – dùng chung cho tìm kiếm phía UI. */
    static normalize(text) {
      return normalizeText(text);
    }

    /* ---------------------------- Sản phẩm ---------------------------- */

    /**
     * Lấy danh sách sản phẩm theo bộ lọc.
     * @param {Object}  [opts]
     * @param {string}  [opts.keyword]     Từ khóa tìm kiếm (không phân biệt dấu).
     * @param {string}  [opts.category]    id danh mục, '' hoặc 'all' = tất cả.
     * @param {string}  [opts.roast]       Mức rang: light | medium | dark.
     * @param {number}  [opts.minPrice]    Giá tối thiểu (theo giá hiện tại).
     * @param {number}  [opts.maxPrice]    Giá tối đa.
     * @param {boolean} [opts.onSale]      Chỉ sản phẩm đang giảm giá.
     * @param {boolean} [opts.inStockOnly] Chỉ sản phẩm còn hàng.
     * @param {string}  [opts.sortBy]      Khóa trong SORT_OPTIONS.
     */
    static getProducts(opts = {}) {
      const { keyword = '', category = '', roast = '', minPrice = 0, maxPrice = Infinity, onSale = false, inStockOnly = false, sortBy = 'newest' } = opts;
      const kw = normalizeText(keyword);
      const sorter = PRODUCT_SORTERS[sortBy] || PRODUCT_SORTERS.newest;

      return PRODUCTS.filter((p) => {
        if (category && category !== 'all' && p.category !== category) return false;
        if (roast && p.roast !== roast) return false;
        if (p.currentPrice < minPrice || p.currentPrice > maxPrice) return false;
        if (onSale && !p.isOnSale) return false;
        if (inStockOnly && !p.inStock) return false;
        if (kw && !p.searchIndex.includes(kw)) return false;
        return true;
      }).sort(sorter);
    }

    static getProductById(id) {
      return PRODUCTS.find((p) => p.id === Number(id)) || null;
    }

    static getFeaturedProducts(limit = 8) {
      return [...PRODUCTS].sort(PRODUCT_SORTERS.bestseller).slice(0, limit);
    }

    static getNewArrivals(limit = 4) {
      return [...PRODUCTS].sort(PRODUCT_SORTERS.newest).slice(0, limit);
    }

    static getSaleProducts(limit = 4) {
      return PRODUCTS.filter((p) => p.isOnSale)
        .sort((a, b) => b.discountPercent - a.discountPercent)
        .slice(0, limit);
    }

    /** Sản phẩm liên quan: cùng danh mục (ưu tiên đánh giá cao), bổ sung từ nơi khác nếu thiếu. */
    static getRelatedProducts(id, limit = 4) {
      const current = DataService.getProductById(id);
      if (!current) return [];
      const others = PRODUCTS.filter((p) => p.id !== current.id);
      const same = others.filter((p) => p.category === current.category).sort(PRODUCT_SORTERS['rating-desc']);
      const rest = others.filter((p) => p.category !== current.category).sort(PRODUCT_SORTERS.bestseller);
      return [...same, ...rest].slice(0, limit);
    }

    /** Danh mục kèm số lượng sản phẩm. */
    static getCategoriesWithCount() {
      return CATEGORIES.map((c) => ({ ...c, count: PRODUCTS.filter((p) => p.category === c.id).length }));
    }

    static getPriceRange() {
      const prices = PRODUCTS.map((p) => p.currentPrice);
      return { min: Math.min(...prices), max: Math.max(...prices) };
    }

    /* ----------------------------- Tin tức ---------------------------- */

    static getArticles({ category = '', keyword = '' } = {}) {
      const kw = normalizeText(keyword);
      return ARTICLES.filter((a) => {
        if (category && category !== 'all' && a.category !== category) return false;
        if (kw && !a.searchIndex.includes(kw)) return false;
        return true;
      }).sort((a, b) => b.dateObj - a.dateObj);
    }

    static getArticleById(id) {
      return ARTICLES.find((a) => a.id === Number(id)) || null;
    }

    static getLatestArticles(limit = 3) {
      return [...ARTICLES].sort((a, b) => b.dateObj - a.dateObj).slice(0, limit);
    }

    static getFeaturedArticles(limit = 2) {
      return ARTICLES.filter((a) => a.featured).slice(0, limit);
    }

    /* ---------------------------- Cửa hàng ---------------------------- */

    static getStores({ city = '', keyword = '', service = '' } = {}) {
      const kw = normalizeText(keyword);
      return STORES.filter((s) => {
        if (city && city !== 'all' && s.city !== city) return false;
        if (service && !s.services.includes(service)) return false;
        if (kw && !s.searchIndex.includes(kw)) return false;
        return true;
      });
    }

    static getStoreById(id) {
      return STORES.find((s) => s.id === Number(id)) || null;
    }

    static getCities() {
      return [...new Set(STORES.map((s) => s.city))];
    }

    /* ---------------------------- Phân trang -------------------------- */

    /** Trả về { items, page, totalPages, total, perPage } cho mảng bất kỳ. */
    static paginate(list, page = 1, perPage = 8) {
      const total = list.length;
      const totalPages = Math.max(1, Math.ceil(total / perPage));
      const current = Math.min(Math.max(1, Number(page) || 1), totalPages);
      const start = (current - 1) * perPage;
      return { items: list.slice(start, start + perPage), page: current, totalPages, total, perPage };
    }
  }

  /* ======================================================================
   * 9. XUẤT RA PHẠM VI TOÀN CỤC
   * ==================================================================== */

  global.AppData = Object.freeze({
    SITE,
    CATEGORIES,
    ROAST_LEVELS,
    SORT_OPTIONS,
    NEWS_CATEGORIES,
    STORE_SERVICES,
    PRODUCTS,
    ARTICLES,
    STORES,
  });
  global.DataService = DataService;
  global.Product = Product;
  global.Article = Article;
  global.Store = Store;
})(typeof window !== 'undefined' ? window : globalThis);
