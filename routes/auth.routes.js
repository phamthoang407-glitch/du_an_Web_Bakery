const router = require("express").Router();
const c = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");
router.post("/login", c.login);
router.post("/register", c.register);
router.get("/me", authenticate, c.me);
router.post("/logout", authenticate, c.logout);
module.exports = router;
