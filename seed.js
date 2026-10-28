const bcrypt=require("bcryptjs");
const {db,initDatabase}=require("./config/database");
initDatabase();

const products=[
["Bánh kem dâu tây","Gateaux kem tươi",450000,0,4.9,"Còn hàng","https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80","Cốt bánh vani mềm xốp, kem tươi nhẹ vị và dâu tây tươi. Phù hợp cho sinh nhật và những buổi gặp gỡ ấm áp."],
["Bánh socola hạnh nhân","Bánh ngọt",320000,0,4.8,"Còn hàng","https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=800&q=80","Lớp socola đậm đà kết hợp hạnh nhân rang thơm, vị ngọt vừa phải."],
["Gateaux kem tươi","Gateaux kem tươi",390000,0,4.9,"Còn hàng","https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80","Mẫu bánh kinh điển với kem tươi mịn và cốt bánh mềm, trang trí thanh lịch."],
["Bánh tiramisu","Bánh ngọt",280000,0,4.7,"Còn hàng","https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80","Tiramisu mềm mịn với cà phê thơm và lớp cacao nhẹ nhàng."],
["Bánh mì bơ sữa","Bánh mì",45000,0,4.8,"Còn hàng","https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80","Bánh mì bơ sữa mềm thơm, nướng mới mỗi ngày."],
["Bánh croissant bơ","Bánh mì",55000,0,4.9,"Còn hàng","https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80","Croissant nhiều lớp, vỏ vàng giòn và ruột mềm thơm bơ."],
["Bánh matcha kem tươi","Bánh sinh nhật",430000,0,4.8,"Còn hàng","https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80","Cốt bánh matcha thanh nhẹ, kem tươi và trang trí tối giản."],
["Bánh red velvet","Bánh sinh nhật",420000,0,4.8,"Sắp hết","https://images.unsplash.com/photo-1586788224331-947f68671cf1?auto=format&fit=crop&w=800&q=80","Red velvet mềm ẩm, kem phô mai béo nhẹ, phù hợp tiệc sinh nhật."]
];
const stores=[
["Bakery Quận 1","125 Nguyễn Huệ, Quận 1","2.5 km","07:30 - 21:30"],
["Bakery Quận 3","86 Võ Văn Tần, Quận 3","5.2 km","08:00 - 21:30"],
["Bakery Tân Bình","42 Cộng Hòa, Tân Bình","7.8 km","08:00 - 21:00"]
];
const news=[
["Top 5 loại bánh sinh nhật được yêu thích","12/10/2026","Gợi ý","https://images.unsplash.com/photo-1558636508-e0db3814bd1d?auto=format&fit=crop&w=900&q=80","Gợi ý những mẫu bánh vừa đẹp mắt vừa dễ chọn cho ngày đặc biệt."],
["Mẹo bảo quản bánh kem tươi tại nhà","08/10/2026","Mẹo hay","https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80","Một vài cách đơn giản để bánh giữ được độ mềm ngon và lớp kem đẹp."],
["Xu hướng bánh ngọt 2026","02/10/2026","Xu hướng","https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=900&q=80","Từ tối giản đến hoa kem, cùng khám phá những phong cách bánh đang được yêu thích."]
];

const categories=["Gateaux kem tươi","Bánh ngọt","Bánh mì","Bánh sinh nhật"];
const insertCategory=db.prepare("INSERT OR IGNORE INTO categories(name) VALUES(?)");
categories.forEach(x=>insertCategory.run(x));

const count=db.prepare("SELECT COUNT(*) count FROM products").get().count;
if(count===0){
  const ins=db.prepare(`INSERT INTO products(name,category_id,price,old_price,rating,status,image,description) VALUES(?,?,?,?,?,?,?,?)`);
  for(const p of products){
    const c=db.prepare("SELECT id FROM categories WHERE name=?").get(p[1]);
    ins.run(p[0],c.id,p[2],p[3],p[4],p[5],p[6],p[7]);
  }
}
const storeCount=db.prepare("SELECT COUNT(*) count FROM stores").get().count;
if(storeCount===0){const ins=db.prepare("INSERT INTO stores(name,address,distance,opening_time) VALUES(?,?,?,?)");stores.forEach(x=>ins.run(...x));}
const newsCount=db.prepare("SELECT COUNT(*) count FROM news").get().count;
if(newsCount===0){const ins=db.prepare("INSERT INTO news(title,date,category,image,description) VALUES(?,?,?,?,?)");news.forEach(x=>ins.run(...x));}

const users=[
["Nguyễn Thị Hoa","customer@bakery.vn","0901234567","customer123","CUSTOMER","125 Nguyễn Huệ, Quận 1"],
["Nguyễn Minh Anh","staff@bakery.vn","0908123456","staff123","STAFF","Bakery Quận 1"],
["Chủ quầy Bakery","admin@bakery.vn","0909999999","admin123","ADMIN","Bakery Quận 1"]
];
const insUser=db.prepare(`INSERT OR IGNORE INTO users(full_name,email,phone,password_hash,role,address) VALUES(?,?,?,?,?,?)`);
for(const u of users)insUser.run(u[0],u[1],u[2],bcrypt.hashSync(u[3],10),u[4],u[5]);

console.log("Seed hoàn tất.");
console.log("Demo: customer@bakery.vn / customer123");
console.log("Staff: staff@bakery.vn / staff123");
console.log("Admin: admin@bakery.vn / admin123");
