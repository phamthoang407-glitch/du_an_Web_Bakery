const router=require("express").Router();const c=require("../controllers/dashboard.controller");const {authenticate}=require("../middleware/auth.middleware");const {allowRoles}=require("../middleware/role.middleware");
router.use(authenticate,allowRoles("STAFF","ADMIN"));
router.get("/",c.dashboard);router.get("/statistics",c.dashboard);router.get("/revenue",c.dashboard);router.get("/orders",c.dashboard);router.get("/products",c.dashboard);
module.exports=router;
