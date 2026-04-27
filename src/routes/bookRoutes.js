const express = require("express");
const multer = require("multer");
const bookController = require("../controllers/bookController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", bookController.index);
router.get("/export", bookController.exportExcel);
router.get("/template", bookController.downloadTemplate);
router.get("/:id/edit", bookController.editBook);
router.post("/", bookController.create);
router.post("/import", upload.single("csvFile"), bookController.importCsv);
router.post("/diagnose", upload.single("csvFile"), bookController.diagnoseCsv);
router.put("/:id", bookController.updateBook);
router.delete("/:id", bookController.remove);

module.exports = router;
