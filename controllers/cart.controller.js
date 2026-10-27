const s=require("../services/cart.service");
const ok=(res,data,message="Success")=>res.json({success:true,message,data});
function get(req,res,next){try{ok(res,s.get(req.user.id))}catch(e){next(e)}}
function add(req,res,next){try{ok(res,s.add(req.user.id,Number(req.body.product_id),Number(req.body.quantity||1)),"Đã thêm vào giỏ hàng.")}catch(e){next(e)}}
function update(req,res,next){try{ok(res,s.update(req.user.id,Number(req.params.id),Number(req.body.quantity)),"Đã cập nhật giỏ hàng.")}catch(e){next(e)}}
function remove(req,res,next){try{ok(res,s.remove(req.user.id,req.params.id),"Đã xóa sản phẩm.")}catch(e){next(e)}}
function clear(req,res,next){try{ok(res,s.clear(req.user.id),"Đã xóa toàn bộ giỏ hàng.")}catch(e){next(e)}}
module.exports={get,add,update,remove,clear};
