const express = require("express");
const studentController = require("../controllers/studentController");

const router = express.Router();

router.get("/", studentController.index);
router.get("/:id/edit", studentController.editStudent);
router.post("/", studentController.create);
router.put("/:id", studentController.updateStudent);
router.delete("/:id", studentController.remove);

module.exports = router;
