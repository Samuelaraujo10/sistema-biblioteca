const express = require("express");
const router = express.Router();
const staffController = require("../controllers/staffController");

router.get("/", staffController.index);
router.post("/", staffController.create);
router.get("/:id/edit", staffController.editStaff);
router.patch("/:id", staffController.updateStaff);
router.delete("/:id", staffController.remove);

module.exports = router;
