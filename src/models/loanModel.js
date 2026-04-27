const { all, run } = require("./baseModel");

const listDetailed = () =>
  all(`
    SELECT
      loans.*,
      books.title AS book_title,
      book_copies.copy_id AS copy_id,
      students.name AS student_name,
      students.registration AS registration,
      students.phone AS student_phone,
      students.class_name AS student_class,
      students.shift AS student_shift
    FROM loans
    JOIN book_copies ON book_copies.id = loans.copy_id
    JOIN books ON books.id = book_copies.book_id
    JOIN students ON students.id = loans.student_id
    ORDER BY loans.id DESC
  `);

const create = ({ copy_id: copyId, student_id: studentId, loan_date: loanDate, due_date: dueDate }) =>
  run(
    `
      INSERT INTO loans (copy_id, student_id, loan_date, due_date, status)
      VALUES (?, ?, ?, ?, 'emprestado')
    `,
    [copyId, studentId, loanDate, dueDate],
  );

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

const checkStudentHasBook = (studentId, bookId) =>
  all(`
    SELECT COUNT(*) as count FROM loans
    JOIN book_copies ON book_copies.id = loans.copy_id
    WHERE loans.student_id = ? AND book_copies.book_id = ? AND loans.status = 'emprestado'
  `, [studentId, bookId]);

const getAvailableCopy = (bookId) =>
  all("SELECT id FROM book_copies WHERE book_id = ? AND status = 'available' LIMIT 1", [bookId]);

const extendDueDate = (id, newDueDate) =>
  run("UPDATE loans SET due_date = ? WHERE id = ?", [newDueDate, id]);

const getById = (id) =>
  all("SELECT * FROM loans WHERE id = ?", [id]);

module.exports = { listDetailed, create, markAsReturned, countActive, checkStudentHasBook, getAvailableCopy, extendDueDate, getById };
