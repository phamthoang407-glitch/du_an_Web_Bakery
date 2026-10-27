const s=require("../services/order.service");
const ok=(res,data,message="Success")=>res.json({success:true,message,data});
function list(req,res,next){try{ok(res,s.list(req.user))}catch(e){next(e)}}
function get(req,res,next){try{const o=s.get(req.params.id,req.user);if(!o)return res.status(404).json({success:false,message:"Không tìm thấy đơn hàng."});ok(res,o)}catch(e){next(e)}}
function create(req,res,next){try{res.status(201).json({success:true,message:"Đặt hàng thành công.",data:s.create(req.user,req.body)})}catch(e){next(e)}}
function updateStatus(req,res,next){try{ok(res,s.updateStatus(req.params.id,req.body.status),"Cập nhật trạng thái thành công.")}catch(e){next(e)}}
module.exports={list,get,create,updateStatus};
