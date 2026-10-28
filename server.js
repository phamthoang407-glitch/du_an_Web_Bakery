require("dotenv").config();
const express=require("express");
const cors=require("cors");
const {initDatabase}=require("./config/database");
const {notFound,errorHandler}=require("./middleware/error.middleware");

initDatabase();
const app=express();
const PORT=process.env.PORT||3000;
const FRONTEND_ORIGINS=(process.env.FRONTEND_ORIGINS||"http://localhost:5500,http://127.0.0.1:5500").split(",");

app.use(cors({origin:(origin,cb)=>{if(!origin||FRONTEND_ORIGINS.includes(origin))return cb(null,true);cb(new Error("CORS origin not allowed"));}}));
app.use(express.json({limit:"1mb"}));

app.get("/api/health",(req,res)=>res.json({success:true,message:"Bakery API đang hoạt động.",data:{time:new Date().toISOString()}}));
app.use("/api/auth",require("./routes/auth.routes"));
app.use("/api/products",require("./routes/products.routes"));
app.use("/api/categories",require("./routes/categories.routes"));
app.use("/api/cart",require("./routes/cart.routes"));
app.use("/api/orders",require("./routes/orders.routes"));
app.use("/api/dashboard",require("./routes/dashboard.routes"));
app.use("/api/stores",require("./routes/stores.routes"));
app.use("/api/news",require("./routes/news.routes"));

app.use(notFound);
app.use(errorHandler);
app.listen(PORT,()=>console.log(`Bakery API running at http://localhost:${PORT}`));
