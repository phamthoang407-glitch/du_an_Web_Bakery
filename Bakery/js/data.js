/**
 * data.js
 * ---------------------------------------------------------------------------
 * Tầng dữ liệu (Data Layer) của website "Bơ Vàng Bakery" – tiệm bánh.
 *  - Mock data: sản phẩm (bánh), tin tức, cửa hàng.
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
      .replace(/[̀-ͯ]/g, '')
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
    name: 'Bơ Vàng Bakery',
    tagline: 'Bánh tươi nướng mỗi sáng – ngọt ngào từng khoảnh khắc',
    hotline: '1900 6969',
    email: 'xinchao@bovang.vn',
    address: '18 Phố Hàng Bài, Hoàn Kiếm, Hà Nội',
    workingHours: '07:00 – 21:30 (hằng ngày)',
    freeShipThreshold: 300000,
    shippingFee: 30000,
    socials: Object.freeze({
      facebook: 'https://facebook.com',
      instagram: 'https://instagram.com',
      tiktok: 'https://tiktok.com',
    }),
  });

  const CATEGORIES = Object.freeze([
    { id: 'banh-kem', name: 'Bánh kem', icon: '🎂' },
    { id: 'banh-ngot', name: 'Bánh ngọt & Cupcake', icon: '🧁' },
    { id: 'banh-mi', name: 'Bánh mì & Bánh mặn', icon: '🥐' },
    { id: 'cookie', name: 'Cookie & Bánh quy', icon: '🍪' },
    { id: 'hop-qua', name: 'Hộp quà bánh', icon: '🎁' },
  ]);

  const FLAVORS = Object.freeze([
    { id: 'kem-tuoi', name: 'Kem tươi & Vanilla' },
    { id: 'chocolate', name: 'Chocolate' },
    { id: 'trai-cay', name: 'Trái cây' },
    { id: 'tra-xanh', name: 'Trà xanh' },
    { id: 'pho-mai', name: 'Phô mai' },
    { id: 'bo-sua', name: 'Bơ sữa' },
    { id: 'man', name: 'Vị mặn' },
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
    { id: 'kien-thuc', name: 'Kiến thức làm bánh' },
    { id: 'cong-thuc', name: 'Công thức tại nhà' },
    { id: 'khuyen-mai', name: 'Khuyến mãi' },
    { id: 'cau-chuyen', name: 'Câu chuyện tiệm bánh' },
  ]);

  const STORE_SERVICES = Object.freeze({
    pickup: 'Nhận bánh tại tiệm',
    delivery: 'Giao hàng tận nơi',
    custom: 'Đặt bánh theo yêu cầu',
    cafe: 'Khu thưởng thức tại chỗ',
    parking: 'Chỗ đậu xe',
    wifi: 'Wi-Fi miễn phí',
  });

  /* ======================================================================
   * 3. MOCK DATA: SẢN PHẨM
   * ==================================================================== */

  const RAW_PRODUCTS = [
    {
      id: 1,
      name: 'Bánh Kem Dâu Tây Tươi 18cm',
      category: 'banh-kem',
      flavor: 'trai-cay',
      price: 450000,
      salePrice: 399000,
      rating: 4.9,
      reviews: 286,
      stock: 20,
      sold: 2140,
      badge: 'Bán chạy',
      size: 'Ø 18cm',
      serves: '6 – 8 người',
      shelfLife: 'Dùng ngon nhất trong 24 giờ (bảo quản lạnh 2–6°C)',
      leadTimeHours: 24,
      createdAt: '2026-02-10',
      shortDescription: 'Cốt bông lan vani mềm xốp, kem tươi nhẹ và dâu tây Đà Lạt chín mọng.',
      description:
        'Chiếc bánh sinh nhật được yêu thích nhất của Bơ Vàng. Cốt bông lan vani nướng mỗi sáng, kẹp mứt dâu tự nấu và kem tươi ít ngọt, phủ đầy dâu tây Đà Lạt tuyển chọn. Có thể viết chữ chúc mừng theo yêu cầu miễn phí.',
      features: ['Dâu tây tươi chọn lọc mỗi ngày', 'Kem tươi ít ngọt, không bơ thực vật', 'Viết chữ chúc mừng miễn phí', 'Tặng kèm nến và dao cắt bánh'],
      ingredients: ['Bột mì', 'Trứng gà', 'Bơ nhạt', 'Kem tươi', 'Dâu tây', 'Đường', 'Vani'],
      allergens: ['Gluten', 'Trứng', 'Sữa'],
      specs: { 'Kích thước': 'Ø 18cm, cao 10cm', 'Khẩu phần': '6 – 8 người', 'Cốt bánh': 'Bông lan vani', 'Nhân bánh': 'Mứt dâu & kem tươi', 'Bảo quản': 'Ngăn mát 2–6°C' },
      images: gallery(['🍓', '🎂', '🍰'], ['#f7b6c2', '#fde7d9']),
    },
    {
      id: 2,
      name: 'Bánh Kem Chocolate Truffle 20cm',
      category: 'banh-kem',
      flavor: 'chocolate',
      price: 520000,
      salePrice: null,
      rating: 4.8,
      reviews: 203,
      stock: 15,
      sold: 1730,
      badge: null,
      size: 'Ø 20cm',
      serves: '8 – 10 người',
      shelfLife: 'Dùng ngon nhất trong 48 giờ (bảo quản lạnh)',
      leadTimeHours: 24,
      createdAt: '2025-11-05',
      shortDescription: 'Ba lớp chocolate đen Bỉ 60% đậm đà, phủ ganache bóng mịn.',
      description:
        'Cốt bánh chocolate ẩm mềm xen kẽ với lớp kem truffle đậm vị, phủ ganache chocolate đen Bỉ 60% bóng loáng. Dành cho những tín đồ chocolate thực thụ.',
      features: ['Chocolate đen Bỉ 60%', 'Ganache bóng mịn thủ công', 'Ít ngọt, hậu vị đậm đà'],
      ingredients: ['Chocolate đen', 'Bột cacao', 'Trứng gà', 'Bơ', 'Kem tươi', 'Đường nâu'],
      allergens: ['Gluten', 'Trứng', 'Sữa'],
      specs: { 'Kích thước': 'Ø 20cm, cao 9cm', 'Khẩu phần': '8 – 10 người', 'Cốt bánh': 'Chocolate', 'Nhân bánh': 'Kem truffle', 'Bảo quản': 'Ngăn mát 2–6°C' },
      images: gallery(['🍫', '🎂', '🍰'], ['#7a4a3a', '#c79a82']),
    },
    {
      id: 3,
      name: 'Bánh Kem Matcha Đậu Đỏ 18cm',
      category: 'banh-kem',
      flavor: 'tra-xanh',
      price: 480000,
      salePrice: null,
      rating: 4.7,
      reviews: 119,
      stock: 12,
      sold: 860,
      badge: 'Mới',
      size: 'Ø 18cm',
      serves: '6 – 8 người',
      shelfLife: 'Dùng ngon nhất trong 24 giờ (bảo quản lạnh)',
      leadTimeHours: 24,
      createdAt: '2026-09-18',
      shortDescription: 'Matcha Uji thơm dịu quyện đậu đỏ Hokkaido bùi ngọt.',
      description:
        'Cốt bông lan matcha Uji xanh mướt, kẹp kem matcha và đậu đỏ ngâm đường nhẹ. Vị trà đắng nhẹ cân bằng cùng vị ngọt thanh của đậu đỏ.',
      features: ['Matcha Uji nhập khẩu', 'Đậu đỏ ninh thủ công', 'Ít ngọt, hợp người yêu trà'],
      ingredients: ['Bột matcha', 'Đậu đỏ', 'Trứng gà', 'Kem tươi', 'Bơ', 'Đường'],
      allergens: ['Gluten', 'Trứng', 'Sữa'],
      specs: { 'Kích thước': 'Ø 18cm, cao 10cm', 'Khẩu phần': '6 – 8 người', 'Cốt bánh': 'Bông lan matcha', 'Nhân bánh': 'Kem matcha & đậu đỏ', 'Bảo quản': 'Ngăn mát 2–6°C' },
      images: gallery(['🍵', '🎂', '🌿'], ['#a9cf9f', '#e6f1d6']),
    },
    {
      id: 4,
      name: 'Cheesecake Chanh Dây 16cm',
      category: 'banh-ngot',
      flavor: 'pho-mai',
      price: 360000,
      salePrice: 320000,
      rating: 4.8,
      reviews: 154,
      stock: 18,
      sold: 1260,
      badge: 'Giảm giá',
      size: 'Ø 16cm',
      serves: '4 – 6 người',
      shelfLife: 'Dùng trong 3 ngày (bảo quản lạnh)',
      leadTimeHours: 4,
      createdAt: '2026-04-22',
      shortDescription: 'Cream cheese béo mịn, đế bích quy bơ giòn, phủ sốt chanh dây chua nhẹ.',
      description:
        'Cheesecake nướng cách thủy cho kết cấu mịn như kem, đế bích quy bơ giòn tan, phủ lớp sốt chanh dây thơm lừng chua ngọt cân bằng.',
      features: ['Cream cheese nhập khẩu', 'Nướng cách thủy, không nứt mặt', 'Sốt chanh dây tự làm'],
      ingredients: ['Cream cheese', 'Bích quy', 'Bơ', 'Trứng gà', 'Chanh dây', 'Đường'],
      allergens: ['Gluten', 'Trứng', 'Sữa'],
      specs: { 'Kích thước': 'Ø 16cm, cao 6cm', 'Khẩu phần': '4 – 6 người', 'Đế bánh': 'Bích quy bơ', 'Phủ mặt': 'Sốt chanh dây', 'Bảo quản': 'Ngăn mát 2–6°C' },
      images: gallery(['🍋', '🍰', '🧀'], ['#f8d56b', '#fff1bd']),
    },
    {
      id: 5,
      name: 'Tiramisu Cốc Cà Phê (Hộp 4 cốc)',
      category: 'banh-ngot',
      flavor: 'bo-sua',
      price: 220000,
      salePrice: null,
      rating: 4.6,
      reviews: 97,
      stock: 40,
      sold: 940,
      badge: null,
      size: '4 cốc x 120g',
      serves: '4 người',
      shelfLife: 'Dùng trong 2 ngày (bảo quản lạnh)',
      leadTimeHours: 0,
      createdAt: '2026-01-15',
      shortDescription: 'Mascarpone mềm mịn, bánh ladyfinger thấm cà phê espresso, phủ cacao.',
      description:
        'Tiramisu kiểu Ý đóng cốc tiện lợi: lớp mascarpone béo nhẹ xen ladyfinger thấm espresso, rắc cacao đắng bên trên. Ăn lạnh là ngon nhất.',
      features: ['Mascarpone Ý', 'Espresso pha mới mỗi ngày', 'Cốc tiện mang đi'],
      ingredients: ['Mascarpone', 'Ladyfinger', 'Espresso', 'Trứng gà', 'Cacao', 'Đường'],
      allergens: ['Gluten', 'Trứng', 'Sữa', 'Caffeine'],
      specs: { 'Quy cách': 'Hộp 4 cốc x 120g', 'Hương vị': 'Cà phê, cacao', 'Bảo quản': 'Ngăn mát 2–6°C' },
      images: gallery(['☕', '🍮', '🍰'], ['#a77b5a', '#ead7c3']),
    },
    {
      id: 6,
      name: 'Cupcake Vanilla Kem Bơ (Hộp 6 chiếc)',
      category: 'banh-ngot',
      flavor: 'kem-tuoi',
      price: 180000,
      salePrice: 150000,
      rating: 4.5,
      reviews: 212,
      stock: 60,
      sold: 2580,
      badge: 'Giảm giá',
      size: '6 chiếc',
      serves: '3 – 6 người',
      shelfLife: 'Dùng trong 2 ngày (nhiệt độ mát)',
      leadTimeHours: 0,
      createdAt: '2025-12-12',
      shortDescription: 'Cupcake vani mềm ẩm, phủ kem bơ vắt hoa xinh xắn.',
      description:
        'Cốt cupcake vani mềm ẩm, phủ kem bơ Thụy Sĩ vắt hoa nhiều màu. Hộp 6 chiếc xinh xắn rất hợp tiệc sinh nhật nhỏ hoặc quà tặng đồng nghiệp.',
      features: ['Kem bơ Thụy Sĩ mịn', 'Nhiều màu kem theo mùa', 'Hộp giấy xinh xắn'],
      ingredients: ['Bột mì', 'Bơ', 'Trứng gà', 'Sữa tươi', 'Đường', 'Vani'],
      allergens: ['Gluten', 'Trứng', 'Sữa'],
      specs: { 'Quy cách': 'Hộp 6 chiếc', 'Khối lượng': '~ 70g / chiếc', 'Bảo quản': 'Nơi mát, tránh nắng' },
      images: gallery(['🧁', '🍰', '🌸'], ['#f9c4d8', '#fff0f5']),
    },
    {
      id: 7,
      name: 'Macaron Pháp Mix 12 Vị',
      category: 'banh-ngot',
      flavor: 'kem-tuoi',
      price: 320000,
      salePrice: null,
      rating: 4.7,
      reviews: 168,
      stock: 35,
      sold: 1120,
      badge: null,
      size: '12 chiếc',
      serves: '4 – 6 người',
      shelfLife: 'Dùng trong 5 ngày (bảo quản lạnh)',
      leadTimeHours: 12,
      createdAt: '2026-03-03',
      shortDescription: 'Vỏ giòn nhẹ, nhân ganache tan chảy, 12 hương vị rực rỡ trong một hộp.',
      description:
        'Mỗi hộp gồm 12 chiếc macaron với các vị: chocolate, matcha, dâu, chanh dây, caramel muối, cà phê… Vỏ bánh làm từ bột hạnh nhân, giòn nhẹ bên ngoài và mềm dẻo bên trong.',
      features: ['Bột hạnh nhân nhập khẩu', '12 hương vị khác nhau', 'Hộp quà sang trọng'],
      ingredients: ['Bột hạnh nhân', 'Lòng trắng trứng', 'Đường', 'Chocolate', 'Kem tươi'],
      allergens: ['Hạnh nhân', 'Trứng', 'Sữa'],
      specs: { 'Quy cách': 'Hộp 12 chiếc', 'Khối lượng': '~ 20g / chiếc', 'Bảo quản': 'Ngăn mát 2–6°C' },
      images: gallery(['🍬', '🧁', '🎀'], ['#e7c5f0', '#fde3ec']),
    },
    {
      id: 8,
      name: 'Bánh Su Kem Hộp 8 Chiếc',
      category: 'banh-ngot',
      flavor: 'kem-tuoi',
      price: 120000,
      salePrice: null,
      rating: 4.4,
      reviews: 301,
      stock: 80,
      sold: 3320,
      badge: 'Bán chạy',
      size: '8 chiếc',
      serves: '2 – 4 người',
      shelfLife: 'Dùng trong ngày (bảo quản lạnh)',
      leadTimeHours: 0,
      createdAt: '2025-10-08',
      shortDescription: 'Vỏ su giòn rụm, nhân kem custard vani béo nhẹ, bơm tươi khi đặt.',
      description:
        'Vỏ bánh su nướng giòn, nhân kem custard vani làm từ sữa tươi và trứng gà ta, bơm nhân ngay khi khách đặt để giữ độ giòn.',
      features: ['Bơm nhân tươi khi đặt', 'Custard vani sữa tươi', 'Giá dễ chịu'],
      ingredients: ['Bột mì', 'Bơ', 'Trứng gà', 'Sữa tươi', 'Đường', 'Vani'],
      allergens: ['Gluten', 'Trứng', 'Sữa'],
      specs: { 'Quy cách': 'Hộp 8 chiếc', 'Khối lượng': '~ 40g / chiếc', 'Bảo quản': 'Ngăn mát, dùng trong ngày' },
      images: gallery(['🥧', '🍮', '🍩'], ['#f8dfa8', '#fff3d6']),
    },
    {
      id: 9,
      name: 'Croissant Bơ Pháp (Hộp 4 chiếc)',
      category: 'banh-mi',
      flavor: 'bo-sua',
      price: 150000,
      salePrice: null,
      rating: 4.9,
      reviews: 245,
      stock: 50,
      sold: 2890,
      badge: 'Bán chạy',
      size: '4 chiếc',
      serves: '2 – 4 người',
      shelfLife: 'Ngon nhất trong ngày, hâm lại 3 phút ở 160°C',
      leadTimeHours: 0,
      createdAt: '2025-09-20',
      shortDescription: 'Hàng trăm lớp bơ giòn tan, thơm lừng ngay khi vừa ra lò.',
      description:
        'Croissant làm từ bơ AOP Pháp, cán gấp 27 lớp và ủ lạnh qua đêm. Vỏ vàng giòn, ruột mềm xốp, hương bơ thơm đậm đà.',
      features: ['Bơ AOP Pháp 100%', '27 lớp bột cán thủ công', 'Nướng mỗi sáng'],
      ingredients: ['Bột mì', 'Bơ Pháp', 'Sữa tươi', 'Men', 'Đường', 'Muối'],
      allergens: ['Gluten', 'Sữa'],
      specs: { 'Quy cách': 'Hộp 4 chiếc', 'Khối lượng': '~ 70g / chiếc', 'Bảo quản': 'Nhiệt độ phòng, dùng trong ngày' },
      images: gallery(['🥐', '🧈', '☕'], ['#e8b45e', '#f9e0a8']),
    },
    {
      id: 10,
      name: 'Bánh Mì Sourdough Nguyên Cám 500g',
      category: 'banh-mi',
      flavor: 'man',
      price: 85000,
      salePrice: null,
      rating: 4.6,
      reviews: 88,
      stock: 0,
      sold: 520,
      badge: null,
      size: '500g',
      serves: '4 – 6 người',
      shelfLife: 'Dùng trong 4 ngày (nhiệt độ phòng)',
      leadTimeHours: 0,
      createdAt: '2026-05-11',
      shortDescription: 'Men tự nhiên ủ 24 giờ, vỏ giòn dày, ruột dai nhẹ, vị chua thanh.',
      description:
        'Sourdough nuôi men tự nhiên từ năm 2019, ủ chậm 24 giờ để vị chua thanh và dễ tiêu hóa. Hợp ăn kèm bơ, phô mai hoặc làm sandwich.',
      features: ['Men tự nhiên, không phụ gia', 'Ủ chậm 24 giờ', 'Giàu chất xơ'],
      ingredients: ['Bột mì nguyên cám', 'Bột mì trắng', 'Men tự nhiên', 'Muối', 'Nước'],
      allergens: ['Gluten'],
      specs: { 'Khối lượng': '500g', 'Loại men': 'Sourdough tự nhiên', 'Bảo quản': 'Túi giấy, nơi khô ráo' },
      images: gallery(['🍞', '🥖', '🌾'], ['#c9a46a', '#efdcb8']),
    },
    {
      id: 11,
      name: 'Pizza Mini Phô Mai (Hộp 4 miếng)',
      category: 'banh-mi',
      flavor: 'man',
      price: 140000,
      salePrice: 119000,
      rating: 4.5,
      reviews: 72,
      stock: 30,
      sold: 610,
      badge: 'Giảm giá',
      size: '4 miếng',
      serves: '2 người',
      shelfLife: 'Dùng trong ngày, hâm lại bằng lò nướng',
      leadTimeHours: 0,
      createdAt: '2026-06-02',
      shortDescription: 'Đế mỏng giòn, phô mai mozzarella kéo sợi, topping xúc xích và ớt chuông.',
      description:
        'Pizza mini đế mỏng nướng giòn, phủ mozzarella Ý, xúc xích bò và ớt chuông tươi. Món ăn nhẹ tiện lợi cho bữa sáng hoặc tiệc nhỏ.',
      features: ['Mozzarella kéo sợi', 'Đế mỏng giòn', 'Hâm lại trong 5 phút'],
      ingredients: ['Bột mì', 'Mozzarella', 'Xúc xích bò', 'Ớt chuông', 'Sốt cà chua'],
      allergens: ['Gluten', 'Sữa'],
      specs: { 'Quy cách': 'Hộp 4 miếng', 'Khối lượng': '~ 60g / miếng', 'Bảo quản': 'Dùng trong ngày' },
      images: gallery(['🍕', '🧀', '🍅'], ['#f2a65a', '#fbd9a6']),
    },
    {
      id: 12,
      name: 'Brioche Hoa Cúc Bơ Sữa 300g',
      category: 'banh-mi',
      flavor: 'bo-sua',
      price: 95000,
      salePrice: null,
      rating: 4.7,
      reviews: 134,
      stock: 45,
      sold: 1090,
      badge: 'Mới',
      size: '300g',
      serves: '3 – 4 người',
      shelfLife: 'Dùng trong 3 ngày (nhiệt độ phòng)',
      leadTimeHours: 0,
      createdAt: '2026-10-02',
      shortDescription: 'Ruột bánh mềm bông, thơm bơ sữa, ăn kèm mứt hoặc nhúng sữa đều ngon.',
      description:
        'Brioche kiểu Pháp làm từ bột mì Nhật, nhiều bơ và trứng, tạo hình hoa cúc xinh xắn. Ruột mềm bông như mây, thơm ngọt vị bơ sữa.',
      features: ['Ruột mềm bông', 'Nhiều bơ và trứng', 'Tạo hình hoa cúc'],
      ingredients: ['Bột mì Nhật', 'Bơ', 'Trứng gà', 'Sữa tươi', 'Đường', 'Men'],
      allergens: ['Gluten', 'Trứng', 'Sữa'],
      specs: { 'Khối lượng': '300g', 'Hình dáng': 'Hoa cúc', 'Bảo quản': 'Túi kín, nhiệt độ phòng' },
      images: gallery(['🌼', '🍞', '🧈'], ['#f7d98b', '#fff4d1']),
    },
    {
      id: 13,
      name: 'Cookie Chocolate Chip (Hộp 12 chiếc)',
      category: 'cookie',
      flavor: 'chocolate',
      price: 160000,
      salePrice: 135000,
      rating: 4.8,
      reviews: 326,
      stock: 100,
      sold: 3640,
      badge: 'Giảm giá',
      size: '12 chiếc',
      serves: '4 – 6 người',
      shelfLife: 'Dùng trong 14 ngày (hộp kín)',
      leadTimeHours: 0,
      createdAt: '2025-10-30',
      shortDescription: 'Giòn rìa, mềm giữa, nhiều chocolate chip tan chảy.',
      description:
        'Cookie nướng từ bơ nhạt và đường nâu, trộn chocolate chip đen Bỉ. Rìa giòn nhẹ, giữa mềm dẻo, thơm mùi caramel.',
      features: ['Chocolate chip Bỉ', 'Bơ nhạt & đường nâu', 'Giữ được 14 ngày'],
      ingredients: ['Bột mì', 'Bơ', 'Đường nâu', 'Chocolate chip', 'Trứng gà', 'Vani'],
      allergens: ['Gluten', 'Trứng', 'Sữa'],
      specs: { 'Quy cách': 'Hộp 12 chiếc', 'Khối lượng': '~ 35g / chiếc', 'Bảo quản': 'Hộp kín, nơi khô ráo' },
      images: gallery(['🍪', '🍫', '🥛'], ['#c88f5a', '#f0d2a8']),
    },
    {
      id: 14,
      name: 'Bánh Quy Bơ Sữa Hộp Thiếc 250g',
      category: 'cookie',
      flavor: 'bo-sua',
      price: 190000,
      salePrice: null,
      rating: 4.6,
      reviews: 91,
      stock: 70,
      sold: 780,
      badge: null,
      size: '250g',
      serves: '4 – 6 người',
      shelfLife: 'Dùng trong 30 ngày',
      leadTimeHours: 0,
      createdAt: '2026-01-28',
      shortDescription: 'Bánh quy bơ tan trong miệng, đựng trong hộp thiếc tái sử dụng.',
      description:
        'Bánh quy bơ sữa làm từ bơ Pháp, tan ngay trong miệng, thơm béo nhẹ. Đựng trong hộp thiếc in họa tiết hoa, dùng làm quà biếu rất sang.',
      features: ['Bơ Pháp thơm béo', 'Hộp thiếc tái sử dụng', 'Hạn dùng 30 ngày'],
      ingredients: ['Bột mì', 'Bơ Pháp', 'Đường bột', 'Sữa bột', 'Trứng gà'],
      allergens: ['Gluten', 'Trứng', 'Sữa'],
      specs: { 'Khối lượng': '250g', 'Hộp': 'Thiếc in họa tiết', 'Bảo quản': 'Nơi khô ráo' },
      images: gallery(['🍪', '🎀', '🥨'], ['#ecc98e', '#fbeccd']),
    },
    {
      id: 15,
      name: 'Hộp Quà Bánh Premium (Macaron & Cookie)',
      category: 'hop-qua',
      flavor: 'kem-tuoi',
      price: 590000,
      salePrice: 520000,
      rating: 4.9,
      reviews: 118,
      stock: 25,
      sold: 690,
      badge: 'Bán chạy',
      size: '1,0 kg',
      serves: '6 – 8 người',
      shelfLife: 'Dùng trong 7 ngày',
      leadTimeHours: 12,
      createdAt: '2026-09-25',
      shortDescription: 'Gồm 8 macaron, 8 cookie, 4 bánh quy bơ và thiệp viết tay.',
      description:
        'Hộp quà cứng buộc nơ lụa, bên trong là bộ sưu tập bánh ngọt bán chạy nhất của tiệm. Kèm thiệp viết tay và túi giấy sang trọng. Lựa chọn lý tưởng cho dịp lễ, Tết hoặc tri ân đối tác.',
      features: ['Hộp cứng cao cấp, nơ lụa', 'Tặng thiệp viết tay', 'Giao nhanh nội thành 2 giờ'],
      ingredients: ['Macaron', 'Cookie chocolate chip', 'Bánh quy bơ'],
      allergens: ['Gluten', 'Hạnh nhân', 'Trứng', 'Sữa'],
      specs: { 'Gồm': '8 macaron, 8 cookie, 4 bánh quy bơ, thiệp', 'Kích thước hộp': '30 x 22 x 8 cm', 'Bảo quản': 'Nơi mát, tránh nắng' },
      images: gallery(['🎁', '🍬', '🍪'], ['#d96a7c', '#f6c1c8']),
    },
    {
      id: 16,
      name: 'Hộp Trà Chiều 6 Món',
      category: 'hop-qua',
      flavor: 'trai-cay',
      price: 450000,
      salePrice: null,
      rating: 4.7,
      reviews: 64,
      stock: 22,
      sold: 410,
      badge: 'Mới',
      size: '6 món',
      serves: '2 – 3 người',
      shelfLife: 'Dùng trong ngày (bảo quản lạnh)',
      leadTimeHours: 12,
      createdAt: '2026-10-08',
      shortDescription: 'Tart trái cây, su kem, scone, cheesecake mini và 2 gói trà thơm.',
      description:
        'Bộ trà chiều gọn gàng cho hai người: 2 tart trái cây, 2 su kem, 1 scone kèm mứt, 1 cheesecake mini và 2 gói trà hoa quả. Giao tận nơi, mở hộp là thưởng thức.',
      features: ['6 món bánh ngọt', 'Kèm 2 gói trà hoa quả', 'Giao lạnh tận nơi'],
      ingredients: ['Tart trái cây', 'Su kem', 'Scone', 'Cheesecake mini', 'Trà hoa quả'],
      allergens: ['Gluten', 'Trứng', 'Sữa'],
      specs: { 'Gồm': '2 tart, 2 su kem, 1 scone, 1 cheesecake mini, 2 gói trà', 'Khẩu phần': '2 – 3 người', 'Bảo quản': 'Ngăn mát 2–6°C' },
      images: gallery(['🫖', '🥧', '🍓'], ['#b8d8c8', '#f4e8d3']),
    },
  ];

  /* ======================================================================
   * 4. MOCK DATA: TIN TỨC
   * ==================================================================== */

  const RAW_ARTICLES = [
    {
      id: 1,
      title: 'Cách chọn bánh kem sinh nhật theo số người ăn',
      category: 'kien-thuc',
      author: 'Ngọc Anh',
      date: '2026-10-12',
      readMinutes: 4,
      featured: true,
      tags: ['bánh kem', 'sinh nhật', 'mẹo hay'],
      excerpt: 'Bánh 16cm, 18cm hay 20cm? Hướng dẫn nhanh để bạn chọn đúng kích thước, không thừa không thiếu.',
      content: [
        'Một chiếc bánh kem đường kính 16cm phù hợp cho 4–6 người, bánh 18cm đủ cho 6–8 người và bánh 20cm thường dành cho 8–10 người. Nếu có nhiều trẻ em, bạn có thể chọn cỡ nhỏ hơn một chút vì các bé thường ăn ít hơn.',
        'Với tiệc đông trên 15 người, nên đặt hai chiếc bánh nhỏ thay vì một chiếc quá lớn: dễ cắt chia, và bạn có thể chọn hai hương vị khác nhau để mọi người đều có lựa chọn.',
        'Đừng quên đặt trước ít nhất 24 giờ cho các mẫu bánh kem trang trí. Nếu cần bánh theo thiết kế riêng, hãy báo với tiệm trước 2–3 ngày.',
      ],
      image: svgImage('🎂', '#f7b6c2', '#fde7d9', 800, 450),
    },
    {
      id: 2,
      title: 'Bảo quản bánh kem đúng cách để luôn tươi ngon',
      category: 'kien-thuc',
      author: 'Minh Quân',
      date: '2026-10-03',
      readMinutes: 5,
      featured: false,
      tags: ['bảo quản', 'bánh kem'],
      excerpt: 'Kem tươi rất nhạy với nhiệt độ. Những nguyên tắc đơn giản giúp bánh giữ trọn hương vị đến miếng cuối cùng.',
      content: [
        'Bánh kem tươi nên được bảo quản trong ngăn mát tủ lạnh ở 2–6°C và dùng hết trong vòng 24–48 giờ. Hãy để bánh trong hộp kín để tránh hút mùi thức ăn khác.',
        'Trước khi thưởng thức, lấy bánh ra khỏi tủ lạnh khoảng 10–15 phút để kem mềm lại và hương vị bung tỏa. Với bánh có trái cây tươi, hãy ăn sớm nhất có thể.',
        'Khi đi tiệc ngoài trời hoặc di chuyển xa, hãy mang theo túi giữ nhiệt và đá khô để bánh không bị chảy.',
      ],
      image: svgImage('🍰', '#f6cdb6', '#fff0e0', 800, 450),
    },
    {
      id: 3,
      title: 'Tháng sinh nhật: tặng nến, thiệp và giảm 15% bánh kem',
      category: 'khuyen-mai',
      author: 'Bơ Vàng',
      date: '2026-10-10',
      readMinutes: 2,
      featured: false,
      tags: ['khuyến mãi', 'sinh nhật'],
      excerpt: 'Từ 10/10 đến 31/10, khách đặt bánh kem nhận ngay ưu đãi và miễn phí vận chuyển đơn từ 300.000đ.',
      content: [
        'Chào tháng 10, Bơ Vàng dành tặng khách hàng ưu đãi sinh nhật: giảm 15% cho tất cả bánh kem đặt qua website, tặng kèm bộ nến, thiệp chúc mừng và dao cắt bánh.',
        'Chương trình áp dụng đến hết ngày 31/10/2026, mỗi hóa đơn được áp dụng tối đa 3 bánh kem. Đơn từ 300.000đ được miễn phí giao hàng nội thành.',
      ],
      image: svgImage('🎉', '#f4b6a6', '#fde0a8', 800, 450),
    },
    {
      id: 4,
      title: 'Câu chuyện lò bánh nhỏ nướng mỗi sáng từ 4 giờ',
      category: 'cau-chuyen',
      author: 'Thu Hà',
      date: '2026-09-20',
      readMinutes: 6,
      featured: true,
      tags: ['câu chuyện', 'thương hiệu', 'lò bánh'],
      excerpt: 'Bơ Vàng bắt đầu từ chiếc lò nướng nhỏ trong bếp nhà và niềm tin rằng bánh ngon phải thật tươi.',
      content: [
        'Năm 2018, chị Thu Hà mở tiệm bánh đầu tiên chỉ với một chiếc lò nướng nhỏ. Mỗi sáng, lò bánh sáng đèn từ 4 giờ để kịp giao những mẻ croissant còn nóng hổi cho khách quen.',
        'Đến nay, Bơ Vàng đã có sáu cửa hàng nhưng vẫn giữ nguyên nguyên tắc: nướng trong ngày, dùng bơ thật, không chất bảo quản và không bán bánh tồn.',
        'Mỗi chiếc bánh đều được làm thủ công bởi chính những người thợ gắn bó với tiệm nhiều năm. Chúng tôi hy vọng mỗi hộp bánh đến tay bạn đều mang theo hơi ấm của lò nướng.',
      ],
      image: svgImage('🥖', '#e8b45e', '#f9e0a8', 800, 450),
    },
    {
      id: 5,
      title: 'Công thức cookie chocolate chip giòn rìa mềm giữa',
      category: 'cong-thuc',
      author: 'Ngọc Anh',
      date: '2026-08-28',
      readMinutes: 5,
      featured: false,
      tags: ['cookie', 'công thức', 'làm bánh tại nhà'],
      excerpt: 'Chỉ với 8 nguyên liệu quen thuộc, bạn có thể làm cookie thơm bơ ngay tại bếp nhà.',
      content: [
        'Chuẩn bị 115g bơ nhạt, 100g đường nâu, 50g đường trắng, 1 quả trứng, 170g bột mì, 1/2 thìa cà phê baking soda, một nhúm muối và 150g chocolate chip. Đánh bơ với hai loại đường đến khi bông nhẹ, thêm trứng rồi trộn đều.',
        'Rây bột với baking soda và muối, trộn vào hỗn hợp bơ, cuối cùng cho chocolate chip vào. Ủ bột trong tủ lạnh 30 phút để cookie không bị chảy khi nướng.',
        'Nướng ở 180°C trong 10–12 phút cho đến khi rìa vàng nhẹ. Để nguội trên khay 5 phút trước khi chuyển ra giá để cookie giữ được độ mềm ở giữa.',
      ],
      image: svgImage('🍪', '#c88f5a', '#f0d2a8', 800, 450),
    },
    {
      id: 6,
      title: 'Bánh mì men tự nhiên: vì sao chậm mà ngon?',
      category: 'kien-thuc',
      author: 'Minh Quân',
      date: '2026-07-15',
      readMinutes: 5,
      featured: false,
      tags: ['sourdough', 'men tự nhiên', 'bánh mì'],
      excerpt: 'Bánh mì sourdough cần 24 giờ để hoàn thiện. Thời gian dài đó mang lại hương vị và độ dễ tiêu mà men công nghiệp khó có được.',
      content: [
        'Sourdough sử dụng men tự nhiên được nuôi từ bột mì và nước. Quá trình lên men chậm giúp phân giải bớt gluten, tạo ra vị chua thanh đặc trưng và lớp vỏ giòn dày.',
        'Một ổ sourdough chuẩn cần ủ lạnh qua đêm để hương vị phát triển đầy đủ. Vì thế bánh ra lò có số lượng giới hạn mỗi ngày.',
        'Bạn có thể ăn kèm bơ lạt, mứt, phô mai hoặc dùng làm sandwich nướng. Bảo quản trong túi giấy ở nhiệt độ phòng để vỏ bánh luôn giòn.',
      ],
      image: svgImage('🍞', '#c9a46a', '#efdcb8', 800, 450),
    },
  ];

  /* ======================================================================
   * 5. MOCK DATA: CỬA HÀNG
   * ==================================================================== */

  const RAW_STORES = [
    {
      id: 1,
      name: 'Bơ Vàng Hàng Bài',
      city: 'Hà Nội',
      district: 'Hoàn Kiếm',
      address: '18 Phố Hàng Bài, Hoàn Kiếm, Hà Nội',
      phone: '024 3936 1001',
      open: '07:00',
      close: '21:30',
      lat: 21.0239,
      lng: 105.8493,
      services: ['pickup', 'delivery', 'custom', 'cafe', 'wifi'],
      description: 'Cửa hàng flagship hai tầng với lò nướng mở, nơi bạn có thể xem thợ bánh làm việc và thưởng thức bánh còn ấm.',
      image: svgImage('🏠', '#f6b9a6', '#fde7c4', 800, 450),
    },
    {
      id: 2,
      name: 'Bơ Vàng Cầu Giấy',
      city: 'Hà Nội',
      district: 'Cầu Giấy',
      address: '77 Trần Thái Tông, Cầu Giấy, Hà Nội',
      phone: '024 3795 2002',
      open: '06:30',
      close: '22:00',
      lat: 21.0333,
      lng: 105.79,
      services: ['pickup', 'delivery', 'custom', 'parking', 'wifi'],
      description: 'Điểm nhận bánh kem đặt trước thuận tiện cho khu văn phòng và khu dân cư Cầu Giấy, có chỗ đậu ô tô.',
      image: svgImage('🏢', '#e9c4a1', '#fbeedb', 800, 450),
    },
    {
      id: 3,
      name: 'Bơ Vàng Nguyễn Huệ',
      city: 'TP. Hồ Chí Minh',
      district: 'Quận 1',
      address: '45 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
      phone: '028 3822 3003',
      open: '07:00',
      close: '22:00',
      lat: 10.7745,
      lng: 106.7035,
      services: ['pickup', 'delivery', 'custom', 'cafe', 'wifi'],
      description: 'Tiệm bánh nằm gần phố đi bộ Nguyễn Huệ, có quầy bánh ngọt trưng bày đầy màu sắc và khu ngồi nhâm nhi trà chiều.',
      image: svgImage('🌆', '#f2b9c4', '#fcd9b8', 800, 450),
    },
    {
      id: 4,
      name: 'Bơ Vàng Võ Văn Tần',
      city: 'TP. Hồ Chí Minh',
      district: 'Quận 3',
      address: '215 Võ Văn Tần, Quận 3, TP. Hồ Chí Minh',
      phone: '028 3930 4004',
      open: '06:30',
      close: '21:30',
      lat: 10.7784,
      lng: 106.6851,
      services: ['pickup', 'delivery', 'custom', 'parking'],
      description: 'Cửa hàng chuyên bánh kem và bánh theo đơn đặt, có xưởng trang trí để bạn tham quan khi nhận bánh.',
      image: svgImage('🌳', '#bfd9b5', '#f1f0d2', 800, 450),
    },
    {
      id: 5,
      name: 'Bơ Vàng Sông Hàn',
      city: 'Đà Nẵng',
      district: 'Hải Châu',
      address: '90 Bạch Đằng, Hải Châu, Đà Nẵng',
      phone: '0236 3822 5005',
      open: '06:30',
      close: '22:00',
      lat: 16.0678,
      lng: 108.2247,
      services: ['pickup', 'delivery', 'cafe', 'parking', 'wifi'],
      description: 'Ngắm sông Hàn từ ban công tầng 2, thưởng thức croissant nóng và bánh ngọt theo mùa.',
      image: svgImage('🌉', '#a9d1e6', '#fdeedb', 800, 450),
    },
    {
      id: 6,
      name: 'Bơ Vàng Hải Phòng',
      city: 'Hải Phòng',
      district: 'Lê Chân',
      address: '12 Nguyễn Đức Cảnh, Lê Chân, Hải Phòng',
      phone: '0225 3858 6006',
      open: '07:00',
      close: '21:30',
      lat: 20.8449,
      lng: 106.6881,
      services: ['pickup', 'delivery', 'custom', 'wifi'],
      description: 'Tiệm bánh mới mở với không gian ấm cúng, nhận đặt bánh sinh nhật và hộp quà theo yêu cầu.',
      image: svgImage('🧁', '#f8c8d4', '#fff0e6', 800, 450),
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
    get flavorName() {
      const found = FLAVORS.find((f) => f.id === this.flavor);
      return found ? found.name : '';
    }
    /** Sản phẩm cần đặt trước (bánh kem, hộp quà…). */
    get requiresPreorder() {
      return this.leadTimeHours > 0;
    }
    /** Nhãn thời gian chuẩn bị: "Có sẵn trong ngày", "Đặt trước 4 giờ", "Đặt trước 1 ngày". */
    get leadTimeLabel() {
      const h = this.leadTimeHours;
      if (!h) return 'Có sẵn trong ngày';
      return h >= 24 ? `Đặt trước ${Math.round(h / 24)} ngày` : `Đặt trước ${h} giờ`;
    }
    /** Chuỗi gộp để tìm kiếm không dấu. */
    get searchIndex() {
      return normalizeText([this.name, this.categoryName, this.flavorName, this.shortDescription].join(' | '));
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
      return normalizeText([this.title, this.excerpt, this.tags.join(' | '), this.author].join(' | '));
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
      return normalizeText([this.name, this.address, this.district, this.city].join(' | '));
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
     * @param {string}  [opts.flavor]      id hương vị (xem FLAVORS).
     * @param {number}  [opts.minPrice]    Giá tối thiểu (theo giá hiện tại).
     * @param {number}  [opts.maxPrice]    Giá tối đa.
     * @param {boolean} [opts.onSale]      Chỉ sản phẩm đang giảm giá.
     * @param {boolean} [opts.inStockOnly] Chỉ sản phẩm còn hàng.
     * @param {boolean} [opts.readyToday]  Chỉ sản phẩm có sẵn trong ngày (không cần đặt trước).
     * @param {string}  [opts.sortBy]      Khóa trong SORT_OPTIONS.
     */
    static getProducts(opts = {}) {
      const {
        keyword = '',
        category = '',
        flavor = '',
        minPrice = 0,
        maxPrice = Infinity,
        onSale = false,
        inStockOnly = false,
        readyToday = false,
        sortBy = 'newest',
      } = opts;
      const kw = normalizeText(keyword);
      const sorter = PRODUCT_SORTERS[sortBy] || PRODUCT_SORTERS.newest;

      return PRODUCTS.filter((p) => {
        if (category && category !== 'all' && p.category !== category) return false;
        if (flavor && p.flavor !== flavor) return false;
        if (p.currentPrice < minPrice || p.currentPrice > maxPrice) return false;
        if (onSale && !p.isOnSale) return false;
        if (inStockOnly && !p.inStock) return false;
        if (readyToday && p.requiresPreorder) return false;
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
    FLAVORS,
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
