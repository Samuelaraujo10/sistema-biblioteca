const loanModel = require("../models/loanModel");
const bookModel = require("../models/bookModel");
const studentModel = require("../models/studentModel");
const staffModel = require("../models/staffModel");

const index = async (req, res) => {
  const [loans, books, students, staffList] = await Promise.all([
    loanModel.listDetailed(),
    bookModel.listAll(),
    studentModel.listAll(),
    staffModel.listAll(),
  ]);

  // Add available copies count to each book
  for (const book of books) {
    const countResults = await bookModel.countAvailableCopies(book.id);
    book.availableCopies = countResults.length > 0 ? countResults[0].count : 0;
  }

  // Add status de vencimento para cada empréstimo ativo
  const today = new Date();
  const daysThreshold = 3; // Alerta com 3 dias antes do vencimento
  
  loans.forEach(loan => {
    if (loan.status === 'emprestado') {
      const dueDate = new Date(loan.due_date);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue < 0) {
        loan.dueDateStatus = 'overdue'; // Vencido
      } else if (daysUntilDue <= daysThreshold) {
        loan.dueDateStatus = 'warning'; // Próximo do vencimento
      } else {
        loan.dueDateStatus = 'ok'; // Tranquilo
      }
      loan.daysUntilDue = daysUntilDue;
    }
  });

  return res.render("loans/index", { loans, books, students, staffList });
};

const create = async (req, res) => {
  try {
    const { id_livro: bookId, borrower, loan_date: loanDate, due_date: dueDate } = req.body;

    if (!borrower) {
      return res.status(400).send("É obrigatório selecionar um locatário.");
    }

    // O formato de borrower esperado é "student_ID" ou "staff_ID"
    const [borrowerType, borrowerId] = borrower.split('_');

    // Valida prazo máximo de 14 dias
    const loanDateObj = new Date(loanDate);
    const dueDateObj = new Date(dueDate);
    const daysDiff = (dueDateObj - loanDateObj) / (1000 * 60 * 60 * 24);
    if (daysDiff > 14) {
      return res.status(400).send("O prazo de empréstimo não pode exceder 14 dias.");
    }

    // Check se o due_date é anterior ao loan_date
    if (daysDiff < 0) {
      return res.status(400).send("A data de devolução não pode ser anterior à data de empréstimo.");
    }

    // Check if user already has this book loaned
    const hasBookResults = await loanModel.checkBorrowerHasBook(borrowerId, borrowerType, bookId);
    if (hasBookResults.length > 0 && hasBookResults[0].count > 0) {
      return res.status(400).send("O locatário já possui uma cópia deste livro emprestada.");
    }

    // Get an available copy
    const availableCopies = await loanModel.getAvailableCopy(bookId);
    if (availableCopies.length === 0) {
      return res.status(400).send("Nenhuma cópia disponível para empréstimo.");
    }

    const copyId = availableCopies[0].id;

    // Update copy status to loaned
    const { run } = require("../models/baseModel");
    await run("UPDATE book_copies SET status = 'loaned' WHERE id = ?", [copyId]);

    // Create loan
    await loanModel.create({ copy_id: copyId, borrower_id: borrowerId, borrower_type: borrowerType, loan_date: loanDate, due_date: dueDate });

    return res.redirect("/loans");
  } catch (error) {
    console.error("Erro ao criar empréstimo:", error);
    return res.status(500).send("Erro ao processar empréstimo. Detalhes: " + error.message);
  }
};

const markAsReturned = async (req, res) => {
  const returnDate = new Date().toISOString().slice(0, 10);
  await loanModel.markAsReturned(req.params.id, returnDate);
  return res.redirect("/loans");
};

const extendLoan = async (req, res) => {
  try {
    const loanId = req.params.id;
    const loans = await loanModel.getById(loanId);
    
    if (loans.length === 0) {
      return res.status(404).send("Empréstimo não encontrado.");
    }
    
    const loan = loans[0];
    if (loan.status !== 'emprestado') {
      return res.status(400).send("Apenas empréstimos ativos podem ser renovados.");
    }
    
    // Adiciona 7 dias ao due_date atual
    const currentDueDate = new Date(loan.due_date);
    // Para evitar problemas de timezone ao adicionar dias, vamos lidar com a data UTC
    currentDueDate.setUTCDate(currentDueDate.getUTCDate() + 7);
    const newDueDate = currentDueDate.toISOString().slice(0, 10);
    
    await loanModel.extendDueDate(loanId, newDueDate);
    return res.redirect("/loans");
  } catch (error) {
    console.error("Erro ao renovar empréstimo:", error);
    return res.status(500).send("Erro ao processar renovação.");
  }
};

module.exports = { index, create, markAsReturned, extendLoan };
