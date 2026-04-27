const { all } = require("../models/baseModel");
const loanModel = require("../models/loanModel");

const index = async (req, res) => {
  const [books, students, activeLoans, loans] = await Promise.all([
    all("SELECT COUNT(*) AS total FROM books"),
    all("SELECT COUNT(*) AS total FROM students"),
    loanModel.countActive(),
    loanModel.listDetailed(),
  ]);

  // Calcula status de vencimento para cada empréstimo
  const today = new Date();
  const daysThreshold = 3;
  loans.forEach(loan => {
    if (loan.status === 'emprestado') {
      const dueDate = new Date(loan.due_date);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      loan.dueDateStatus = daysUntilDue < 0 ? 'overdue' : daysUntilDue <= daysThreshold ? 'warning' : 'ok';
      loan.daysUntilDue = daysUntilDue;
    }
  });

  const overdueLoans  = loans.filter(l => l.dueDateStatus === 'overdue'  && l.status === 'emprestado');
  const warningLoans  = loans.filter(l => l.dueDateStatus === 'warning'  && l.status === 'emprestado');

  return res.render("index", {
    cards: {
      books: books[0].total,
      students: students[0].total,
      activeLoans: activeLoans[0].total,
    },
    overdueLoans,
    warningLoans,
  });
};

module.exports = { index };
