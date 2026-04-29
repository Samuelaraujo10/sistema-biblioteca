const studentModel = require("../models/studentModel");

const VALID_CLASSES = ["1ª série", "2ª série", "3ª série"];
const VALID_SHIFTS = ["Matutino", "Vespertino"];
const IMPORT_HEADER_ALIASES = {
  registration: ["matricula", "matricula sigeduc", "registration"],
  name: ["nome", "nome do aluno", "aluno", "estudante", "name"],
  class_name: ["turma", "serie", "série", "classe", "class_name"],
  shift: ["turno", "shift"],
  phone: ["telefone", "celular", "whatsapp", "phone"],
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const parseCsvLine = (line, delimiter) => {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
};

const parseCsv = (content) => {
  const normalizedContent = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalizedContent.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ";" : ",";
  const headers = parseCsvLine(lines[0], delimiter).map((header) => normalizeText(header));
  const aliases = Object.fromEntries(
    Object.entries(IMPORT_HEADER_ALIASES).map(([field, fieldAliases]) => [
      field,
      fieldAliases.map(normalizeText),
    ]),
  );
  const indexes = {};

  Object.entries(aliases).forEach(([field, fieldAliases]) => {
    indexes[field] = headers.findIndex((header) => fieldAliases.includes(header));
  });

  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line, delimiter);
    const row = { line: index + 2 };

    Object.entries(indexes).forEach(([field, fieldIndex]) => {
      row[field] = fieldIndex >= 0 ? String(cells[fieldIndex] || "").trim() : "";
    });

    return row;
  });
};

const normalizeImportedStudent = (row) => ({
  name: String(row.name || "").trim(),
  class_name: String(row.class_name || "").trim(),
  shift: String(row.shift || "").trim(),
  phone: String(row.phone || "").trim() || null,
  registration: String(row.registration || "").replace(/\D/g, ""),
});

const validateImportedStudent = (student) => {
  const errors = [];

  if (!student.name) errors.push("nome ausente");
  if (!student.class_name) errors.push("turma ausente");
  if (!student.shift) errors.push("turno ausente");
  if (!/^\d{12}$/.test(student.registration)) errors.push("matrícula deve ter 12 dígitos");

  return errors;
};

const index = async (req, res) => {
  const students = await studentModel.listAll();
  return res.render("students/index", { students });
};

const importForm = async (req, res) => res.render("students/import", { preview: null, summary: null });

const previewImport = async (req, res) => {
  if (!req.file) {
    return res.status(400).send("Envie um arquivo CSV para importar.");
  }

  const rows = parseCsv(req.file.buffer.toString("utf8"));
  const seenRegistrations = new Set();
  const preview = [];

  for (const row of rows) {
    const student = normalizeImportedStudent(row);
    const errors = validateImportedStudent(student);
    const duplicateInFile = student.registration && seenRegistrations.has(student.registration);

    if (duplicateInFile) {
      errors.push("matrícula repetida no arquivo");
    }

    if (student.registration) {
      seenRegistrations.add(student.registration);
    }

    const existingStudent = student.registration
      ? await studentModel.getByRegistration(student.registration)
      : null;

    preview.push({
      ...student,
      line: row.line,
      action: errors.length > 0 ? "error" : existingStudent ? "update" : "create",
      errors,
      existingId: existingStudent ? existingStudent.id : null,
    });
  }

  req.session.studentImportPreview = preview;

  const summary = {
    total: preview.length,
    create: preview.filter((row) => row.action === "create").length,
    update: preview.filter((row) => row.action === "update").length,
    error: preview.filter((row) => row.action === "error").length,
  };

  return res.render("students/import", { preview, summary });
};

const confirmImport = async (req, res) => {
  const preview = req.session.studentImportPreview || [];
  const validRows = preview.filter((row) => row.action !== "error");

  for (const row of validRows) {
    const existingStudent = await studentModel.getByRegistration(row.registration);
    const payload = {
      name: row.name,
      class_name: row.class_name,
      shift: row.shift,
      phone: row.phone || null,
      registration: row.registration,
    };

    if (existingStudent) {
      await studentModel.update(existingStudent.id, payload);
    } else {
      await studentModel.create(payload);
    }
  }

  req.session.studentImportPreview = null;
  return res.redirect("/students");
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

module.exports = {
  index,
  importForm,
  previewImport,
  confirmImport,
  create,
  editStudent,
  updateStudent,
  remove,
};
