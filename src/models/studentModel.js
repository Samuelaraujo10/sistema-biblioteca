const { all, run } = require("./baseModel");

const listAll = () => all("SELECT * FROM students ORDER BY name ASC");

const getById = async (id) => {
  const rows = await all("SELECT * FROM students WHERE id = ?", [id]);
  return rows[0] || null;
};

const getByRegistration = async (registration) => {
  const rows = await all("SELECT * FROM students WHERE registration = ?", [registration]);
  return rows[0] || null;
};

const create = ({ name, class_name: className, shift, phone, registration }) =>
  run("INSERT INTO students (name, class_name, shift, phone, registration) VALUES (?, ?, ?, ?, ?)", [
    name,
    className,
    shift,
    phone,
    registration,
  ]);

const update = (id, { name, class_name: className, shift, phone, registration }) =>
  run("UPDATE students SET name = ?, class_name = ?, shift = ?, phone = ?, registration = ? WHERE id = ?", [
    name,
    className,
    shift,
    phone,
    registration,
    id,
  ]);

const remove = (id) => run("DELETE FROM students WHERE id = ?", [id]);

module.exports = { listAll, getById, getByRegistration, create, update, remove };
