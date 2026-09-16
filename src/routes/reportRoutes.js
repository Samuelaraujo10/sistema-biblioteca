const express = require("express");
const reportController = require("../controllers/reportController");

const router = express.Router();

router.get("/loans", reportController.report);
router.get("/loans/export", reportController.exportExcel);

module.exports = router;

