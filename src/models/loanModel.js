const { all, run } = require("./baseModel");

const listDetailed = () =>
  all(`
    SELECT
      loans.*,
      books.title AS book_title,
      book_copies.copy_id AS copy_id,
      COALESCE(students.name, staff.name) AS borrower_name,
      COALESCE(students.phone, staff.phone) AS borrower_phone,
      students.registration AS registration,
      students.class_name AS student_class,
      students.shift AS student_shift,
      staff.cpf AS staff_cpf,
      CASE WHEN loans.student_id IS NOT NULL THEN 'Aluno' ELSE staff.type END AS borrower_type
    FROM loans
    JOIN book_copies ON book_copies.id = loans.copy_id
    JOIN books ON books.id = book_copies.book_id
    LEFT JOIN students ON students.id = loans.student_id
    LEFT JOIN staff ON staff.id = loans.staff_id
    ORDER BY loans.id DESC
  `);

const create = ({ copy_id: copyId, borrower_id: borrowerId, borrower_type: borrowerType, loan_date: loanDate, due_date: dueDate }) => {
  if (!["student", "staff"].includes(borrowerType)) {
    return Promise.reject(new Error("Tipo de locatário inválido."));
  }

  const studentId = borrowerType === 'student' ? borrowerId : null;
  const staffId = borrowerType === 'staff' ? borrowerId : null;
  return run(
    `
      INSERT INTO loans (copy_id, student_id, staff_id, loan_date, due_date, status)
      VALUES (?, ?, ?, ?, ?, 'emprestado')
    `,
    [copyId, studentId, staffId, loanDate, dueDate],
  );
};

const markAsReturned = async (id, returnDate) => {
  // First update the loan status
  await run("UPDATE loans SET status = 'devolvido', return_date = ? WHERE id = ?", [returnDate, id]);
  
  // Then get the copy_id and update its status
  const loanData = await all("SELECT copy_id FROM loans WHERE id = ?", [id]);
  if (loanData.length > 0) {
    const copyId = loanData[0].copy_id;
    await run("UPDATE book_copies SET status = 'available' WHERE id = ?", [copyId]);
  }
};

const countActive = () => all("SELECT COUNT(*) AS total FROM loans WHERE status = 'emprestado'");

const checkBorrowerHasBook = (borrowerId, borrowerType, bookId) => {
  if (!["student", "staff"].includes(borrowerType)) {
    return Promise.reject(new Error("Tipo de locatário inválido."));
  }

  const condition = borrowerType === 'student' ? 'loans.student_id = ?' : 'loans.staff_id = ?';
  return all(`
    SELECT COUNT(*) as count FROM loans
    JOIN book_copies ON book_copies.id = loans.copy_id
    WHERE ${condition} AND book_copies.book_id = ? AND loans.status = 'emprestado'
  `, [borrowerId, bookId]);
};

const getAvailableCopy = (bookId) =>
  all("SELECT id FROM book_copies WHERE book_id = ? AND status = 'available' LIMIT 1", [bookId]);

const extendDueDate = (id, newDueDate) =>
  run("UPDATE loans SET due_date = ? WHERE id = ?", [newDueDate, id]);

const getById = (id) =>
  all("SELECT * FROM loans WHERE id = ?", [id]);

// ── Report queries ─────────────────────────────────────────────────────────

const getReportStats = (startDate, endDate) =>
  all(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'emprestado' THEN 1 ELSE 0 END) AS active,
       SUM(CASE WHEN status = 'devolvido'  THEN 1 ELSE 0 END) AS returned,
       SUM(CASE WHEN status = 'emprestado' AND due_date < date('now') THEN 1 ELSE 0 END) AS overdue
     FROM loans
     WHERE loan_date BETWEEN ? AND ?`,
    [startDate, endDate]
  );

const getReportByBook = (startDate, endDate) =>
  all(
    `SELECT
       books.title,
       books.author,
       COUNT(*) AS total_loans,
       SUM(CASE WHEN loans.status = 'devolvido' THEN 1 ELSE 0 END) AS returned,
       SUM(CASE WHEN loans.status = 'emprestado' THEN 1 ELSE 0 END) AS active
     FROM loans
     JOIN book_copies ON book_copies.id = loans.copy_id
     JOIN books       ON books.id = book_copies.book_id
     WHERE loans.loan_date BETWEEN ? AND ?
     GROUP BY books.id, books.title, books.author
     ORDER BY total_loans DESC`,
    [startDate, endDate]
  );

const getReportByBorrowerType = (startDate, endDate) =>
  all(
    `SELECT
       CASE WHEN student_id IS NOT NULL THEN 'Aluno' ELSE 'Funcionário' END AS tipo,
       COUNT(*) AS total_loans
     FROM loans
     WHERE loan_date BETWEEN ? AND ?
     GROUP BY tipo
     ORDER BY total_loans DESC`,
    [startDate, endDate]
  );

const getReportByMonth = (startDate, endDate) =>
  all(
    `SELECT
       strftime('%Y-%m', loan_date) AS mes,
       COUNT(*) AS total_loans,
       SUM(CASE WHEN status = 'devolvido' THEN 1 ELSE 0 END) AS returned,
       SUM(CASE WHEN status = 'emprestado' THEN 1 ELSE 0 END) AS active
     FROM loans
     WHERE loan_date BETWEEN ? AND ?
     GROUP BY mes
     ORDER BY mes ASC`,
    [startDate, endDate]
  );

const getReportLoansDetailed = (startDate, endDate) =>
  all(
    `SELECT
       loans.id,
       loans.status,
       loans.loan_date,
       loans.due_date,
       loans.return_date,
       books.title  AS book_title,
       book_copies.copy_id AS copy_id,
       COALESCE(students.name, staff.name) AS borrower_name,
       COALESCE(students.phone, staff.phone) AS borrower_phone,
       students.registration AS borrower_registration,
       staff.cpf            AS borrower_cpf,
       students.class_name AS student_class,
       students.shift      AS student_shift,
       CASE WHEN loans.student_id IS NOT NULL THEN 'Aluno' ELSE staff.type END AS borrower_type,
       CAST(julianday('now') - julianday(loans.due_date) AS INTEGER) AS days_late
     FROM loans
     JOIN book_copies ON book_copies.id = loans.copy_id
     JOIN books       ON books.id = book_copies.book_id
     LEFT JOIN students ON students.id = loans.student_id
     LEFT JOIN staff    ON staff.id    = loans.staff_id
     WHERE loans.loan_date BETWEEN ? AND ?
     ORDER BY loans.loan_date DESC`,
    [startDate, endDate]
  );

module.exports = {
  listDetailed, create, markAsReturned, countActive,
  checkBorrowerHasBook, getAvailableCopy, extendDueDate, getById,
  getReportStats, getReportByBook, getReportByBorrowerType, getReportByMonth,
  getReportLoansDetailed,
};
