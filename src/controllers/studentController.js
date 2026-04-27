const studentModel = require("../models/studentModel");
const VALID_CLASSES = ["1ª série", "2ª série", "3ª série"];

const VALID_SHIFTS = ["Matutino", "Vespertino"];

const index = async (req, res) => {
  const students = await studentModel.listAll();
  return res.render("students/index", { students });
};

const create = async (req, res) => {
  const { name, class_name: className, shift, phone, registration } = req.body;
  const normalizedRegistration = String(registration || "").replace(/\D/g, "");

  if (!/^\d{12}$/.test(normalizedRegistration)) {
    const error = new Error("A matricula deve conter exatamente 12 digitos numericos.");
    error.status = 400;
    throw error;
  }

  if (!VALID_CLASSES.includes(className)) {
    const error = new Error("Turma invalida. Escolha entre 1ª série, 2ª série ou 3ª série.");
    error.status = 400;
    throw error;
  }

  if (!VALID_SHIFTS.includes(shift)) {
    const error = new Error("Turno inválido. Escolha entre Matutino, Vespertino.");
    error.status = 400;
    throw error;
  }

  await studentModel.create({
    name,
    class_name: className,
    shift,
    phone: phone || null,
    registration: normalizedRegistration,
  });
  return res.redirect("/students");
};

const editStudent = async (req, res) => {
  const student = await studentModel.getById(req.params.id);
  if (!student) return res.status(404).send("Aluno não encontrado.");
  return res.render("students/edit", { student, VALID_CLASSES, VALID_SHIFTS });
};

const updateStudent = async (req, res) => {
  const { name, class_name: className, shift, phone, registration } = req.body;
  const normalizedRegistration = String(registration || "").replace(/\D/g, "");

  if (!/^\d{12}$/.test(normalizedRegistration)) {
    const error = new Error("A matricula deve conter exatamente 12 digitos numericos.");
    error.status = 400;
    throw error;
  }

  if (!VALID_CLASSES.includes(className)) {
    const error = new Error("Turma invalida. Escolha entre 1ª série, 2ª série ou 3ª série.");
    error.status = 400;
    throw error;
  }

  if (!VALID_SHIFTS.includes(shift)) {
    const error = new Error("Turno inválido. Escolha entre Matutino, Vespertino.");
    error.status = 400;
    throw error;
  }

  await studentModel.update(req.params.id, {
    name,
    class_name: className,
    shift,
    phone: phone || null,
    registration: normalizedRegistration,
  });
  return res.redirect("/students");
};

const remove = async (req, res) => {
  await studentModel.remove(req.params.id);
  return res.redirect("/students");
};

module.exports = { index, create, editStudent, updateStudent, remove };
