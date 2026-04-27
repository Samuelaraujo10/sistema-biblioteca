const fs = require("fs");
const path = require("path");
const { all, run } = require("../models/baseModel");

const DATABASE_PATH = path.join(__dirname, "..", "..", "database.sqlite");
const BACKUP_DIR = path.join(__dirname, "..", "..", "backups");
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MAX_BACKUPS = 30;

const ensureBackupDirectory = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
};

const getTimestamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
};

const pruneOldBackups = () => {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((file) => file.startsWith("database-backup-") && file.endsWith(".sqlite"))
    .map((file) => {
      const fullPath = path.join(BACKUP_DIR, file);
      try {
        return {
          file,
          fullPath,
          mtime: fs.statSync(fullPath).mtimeMs,
        };
      } catch (err) {
        // Arquivo pode ter sido deletado, ignorar
        return null;
      }
    })
    .filter(item => item !== null)
    .sort((a, b) => b.mtime - a.mtime);

  files.slice(MAX_BACKUPS).forEach((item) => {
    try {
      if (fs.existsSync(item.fullPath)) {
        fs.unlinkSync(item.fullPath);
      }
    } catch (err) {
      console.error(`Erro ao deletar backup: ${item.fullPath}`, err.message);
    }
  });
};

const exportBooks = async () => {
  ensureBackupDirectory();
  const books = await all("SELECT * FROM books");
  const bookCopies = await all("SELECT * FROM book_copies");
  const data = { books, bookCopies, exportedAt: new Date().toISOString() };
  const filePath = path.join(BACKUP_DIR, `books-backup-${getTimestamp()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Backup de livros criado: ${filePath}`);
};

const exportLoans = async () => {
  ensureBackupDirectory();
  const loans = await all("SELECT * FROM loans");
  const data = { loans, exportedAt: new Date().toISOString() };
  const filePath = path.join(BACKUP_DIR, `loans-backup-${getTimestamp()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Backup de empréstimos criado: ${filePath}`);
};

const exportStudents = async () => {
  ensureBackupDirectory();
  const students = await all("SELECT * FROM students");
  const data = { students, exportedAt: new Date().toISOString() };
  const filePath = path.join(BACKUP_DIR, `students-backup-${getTimestamp()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Backup de alunos criado: ${filePath}`);
};

const exportAllData = async () => {
  await exportBooks();
  await exportLoans();
  await exportStudents();
};

const importBooks = async (filePath) => {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  await run("DELETE FROM book_copies");
  await run("DELETE FROM books");
  for (const book of data.books) {
    await run("INSERT INTO books (id, title, author, isbn, created_at) VALUES (?, ?, ?, ?, ?)", [book.id, book.title, book.author, book.isbn, book.created_at]);
  }
  for (const copy of data.bookCopies) {
    await run("INSERT INTO book_copies (id, book_id, copy_id, status, created_at) VALUES (?, ?, ?, ?, ?)", [copy.id, copy.book_id, copy.copy_id, copy.status, copy.created_at]);
  }
  console.log("Livros importados com sucesso.");
};

const importLoans = async (filePath) => {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  await run("DELETE FROM loans");
  for (const loan of data.loans) {
    await run("INSERT INTO loans (id, copy_id, student_id, loan_date, due_date, return_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)", [loan.id, loan.copy_id, loan.student_id, loan.loan_date, loan.due_date, loan.return_date, loan.status]);
  }
  console.log("Empréstimos importados com sucesso.");
};

const importStudents = async (filePath) => {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  await run("DELETE FROM students");
  for (const student of data.students) {
    await run("INSERT INTO students (id, name, class_name, registration) VALUES (?, ?, ?, ?)", [student.id, student.name, student.class_name, student.registration]);
  }
  console.log("Alunos importados com sucesso.");
};

const createDatabaseBackup = async () => {
  if (!fs.existsSync(DATABASE_PATH)) {
    return;
  }

  ensureBackupDirectory();
  const backupName = `database-backup-${getTimestamp()}.sqlite`;
  const backupPath = path.join(BACKUP_DIR, backupName);
  fs.copyFileSync(DATABASE_PATH, backupPath);
  pruneOldBackups();
  await exportAllData();
  console.log(`Backup criado: ${backupPath}`);
};

const startBackupScheduler = async () => {
  await createDatabaseBackup();
  setInterval(async () => {
    await createDatabaseBackup();
  }, BACKUP_INTERVAL_MS);
};

module.exports = { startBackupScheduler, exportBooks, exportLoans, exportStudents, exportAllData, importBooks, importLoans, importStudents };
