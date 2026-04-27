const express = require("express");
const path = require("path");

const router = express.Router();

const { exportBooks, exportLoans, exportStudents, exportAllData, importBooks, importLoans, importStudents } = require("../services/backupService");

const BACKUP_DIR = path.join(__dirname, "..", "..", "backups");

// Rota para página de backup
router.get("/", (req, res) => {
  res.render("backups/index", { message: req.query.message, error: req.query.error });
});

// Rotas para exportar dados
router.get("/export/books", async (req, res) => {
  try {
    await exportBooks();
    res.redirect("/backups?message=Backup de livros criado com sucesso!");
  } catch (error) {
    res.redirect("/backups?error=Erro ao criar backup: " + error.message);
  }
});

router.get("/export/loans", async (req, res) => {
  try {
    await exportLoans();
    res.redirect("/backups?message=Backup de empréstimos criado com sucesso!");
  } catch (error) {
    res.redirect("/backups?error=Erro ao criar backup: " + error.message);
  }
});

router.get("/export/students", async (req, res) => {
  try {
    await exportStudents();
    res.redirect("/backups?message=Backup de alunos criado com sucesso!");
  } catch (error) {
    res.redirect("/backups?error=Erro ao criar backup: " + error.message);
  }
});

router.get("/export/all", async (req, res) => {
  try {
    await exportAllData();
    res.redirect("/backups?message=Todos os backups criados com sucesso!");
  } catch (error) {
    res.redirect("/backups?error=Erro ao criar backups: " + error.message);
  }
});

// Rotas para importar dados (simples, assumindo arquivo na pasta backups)
router.post("/import/books", async (req, res) => {
  try {
    const fileName = req.body.fileName;
    const filePath = path.join(BACKUP_DIR, fileName);
    await importBooks(filePath);
    res.redirect("/backups?message=Livros importados com sucesso!");
  } catch (error) {
    res.redirect("/backups?error=Erro ao importar: " + error.message);
  }
});

router.post("/import/loans", async (req, res) => {
  try {
    const fileName = req.body.fileName;
    const filePath = path.join(BACKUP_DIR, fileName);
    await importLoans(filePath);
    res.redirect("/backups?message=Empréstimos importados com sucesso!");
  } catch (error) {
    res.redirect("/backups?error=Erro ao importar: " + error.message);
  }
});

router.post("/import/students", async (req, res) => {
  try {
    const fileName = req.body.fileName;
    const filePath = path.join(BACKUP_DIR, fileName);
    await importStudents(filePath);
    res.redirect("/backups?message=Alunos importados com sucesso!");
  } catch (error) {
    res.redirect("/backups?error=Erro ao importar: " + error.message);
  }
});

module.exports = router;