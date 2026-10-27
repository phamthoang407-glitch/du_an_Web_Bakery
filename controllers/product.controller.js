const s=require("../services/product.service");
const ok=(res,data,message="Success")=>res.json({success:true,message,data});
function list(req,res,next){try{ok(res,s.list(req.query));}catch(e){next(e)}}
function get(req,res,next){try{const p=s.get(req.params.id);if(!p)return res.status(404).json({success:false,message:"Không tìm thấy sản phẩm."});ok(res,p)}catch(e){next(e)}}
function create(req,res,next){try{res.status(201).json({success:true,message:"Tạo sản phẩm thành công.",data:s.create(req.body)})}catch(e){next(e)}}
function update(req,res,next){try{ok(res,s.update(req.params.id,req.body),"Cập nhật sản phẩm thành công.")}catch(e){next(e)}}
function remove(req,res,next){try{s.remove(req.params.id);ok(res,null,"Xóa sản phẩm thành công.")}catch(e){next(e)}}
module.exports={list,get,create,update,remove};
