const express = require("express");
const multer = require("multer");
const studentController = require("../controllers/studentController");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.get("/", studentController.index);
router.get("/template", studentController.downloadTemplate);
router.get("/import", studentController.importForm);
router.post("/import", upload.single("csvFile"), studentController.importCsv);
router.post("/diagnose", upload.single("csvFile"), studentController.diagnoseCsv);
router.post("/import/preview", upload.single("students_csv"), studentController.previewImport);
router.post("/import/confirm", studentController.confirmImport);
router.get("/:id/edit", studentController.editStudent);
router.post("/", studentController.create);
router.put("/:id", studentController.updateStudent);
router.delete("/:id", studentController.remove);

module.exports = router;
