const { all, run } = require("./baseModel");

const listAll = () => all("SELECT * FROM books ORDER BY title ASC");

const getById = async (id) => {
  const rows = await all("SELECT * FROM books WHERE id = ?", [id]);
  return rows[0] || null;
};

const create = ({ title, subtitle, author, isbn, publisher, cover_url }) =>
  run("INSERT INTO books (title, subtitle, author, isbn, publisher, cover_url) VALUES (?, ?, ?, ?, ?, ?)", [
    title,
    subtitle || null,
    author,
    isbn || `AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    publisher || null,
    cover_url || null,
  ]);

const update = (id, { title, subtitle, author, isbn, publisher, cover_url }) =>
  run("UPDATE books SET title = ?, subtitle = ?, author = ?, isbn = ?, publisher = ?, cover_url = ? WHERE id = ?", [
    title,
    subtitle || null,
    author,
    isbn || null,
    publisher || null,
    cover_url || null,
    id,
  ]);

const createCopies = (bookId, quantity) => {
  const copies = [];
  for (let i = 1; i <= quantity; i++) {
    copies.push(run("INSERT INTO book_copies (book_id, copy_id, status) VALUES (?, ?, 'available')", [bookId, i]));
  }
  return Promise.all(copies);
};

const listAvailableCopies = (bookId) =>
  all("SELECT * FROM book_copies WHERE book_id = ? AND status = 'available'", [bookId]);

const countAvailableCopies = (bookId) =>
  all("SELECT COUNT(*) as count FROM book_copies WHERE book_id = ? AND status = 'available'", [bookId]);

const remove = (id) => run("DELETE FROM books WHERE id = ?", [id]);

module.exports = { listAll, getById, create, update, createCopies, listAvailableCopies, countAvailableCopies, remove };
