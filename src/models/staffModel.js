const { all, run } = require("./baseModel");

const listAll = () => all("SELECT * FROM staff ORDER BY name ASC");

const getById = (id) => all("SELECT * FROM staff WHERE id = ?", [id]).then((res) => res[0]);

const create = ({ name, cpf, phone, type }) =>
  run("INSERT INTO staff (name, cpf, phone, type) VALUES (?, ?, ?, ?)", [name, cpf, phone, type]);

const update = (id, { name, cpf, phone, type }) =>
  run("UPDATE staff SET name = ?, cpf = ?, phone = ?, type = ? WHERE id = ?", [
    name,
    cpf,
    phone,
    type,
    id,
  ]);

const countLoans = (id) =>
  all("SELECT COUNT(*) AS total FROM loans WHERE staff_id = ?", [id]).then((res) => res[0].total);

const remove = (id) => run("DELETE FROM staff WHERE id = ?", [id]);

module.exports = { listAll, getById, create, update, countLoans, remove };
