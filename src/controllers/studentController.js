const studentModel = require("../models/studentModel");

const VALID_CLASSES = ["1ª série", "2ª série", "3ª série"];
const VALID_SHIFTS = ["Matutino", "Vespertino"];
const REGISTRATION_PATTERN = /^\d{11}$/;
const REGISTRATION_ERROR = "A matricula deve conter exatamente 11 digitos numericos.";

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

const readCsvContent = (file) => {
  let content = file.buffer.toString("utf-8").replace(/^\uFEFF/, "");
  if (content.includes("\uFFFD")) content = file.buffer.toString("latin1");
  return content;
};

const parseCsvLine = (line, delimiter) => {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === "\"" && inQuotes && next === "\"") {
      current += "\"";
      i += 1;
    } else if (char === "\"") {
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
  if (!REGISTRATION_PATTERN.test(student.registration)) errors.push("matricula deve ter 11 digitos");

  return errors;
};

const setFlash = (req, type, message) => {
  if (req.session) {
    req.session.flash = { type, message };
  }
};

const index = async (req, res) => {
  const students = await studentModel.listAll();
  return res.render("students/index", { students });
};

const importForm = async (req, res) => res.render("students/import", { preview: null, summary: null });

const previewImport = async (req, res) => {
  if (!req.file) {
    setFlash(req, "error", "Envie um arquivo CSV para importar.");
    return res.redirect("/students/import");
  }

  const rows = parseCsv(readCsvContent(req.file));
  const seenRegistrations = new Set();
  const preview = [];

  for (const row of rows) {
    const student = normalizeImportedStudent(row);
    const errors = validateImportedStudent(student);
    const duplicateInFile = student.registration && seenRegistrations.has(student.registration);

    if (duplicateInFile) {
      errors.push("matricula repetida no arquivo");
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
  setFlash(req, "success", `${validRows.length} aluno(s) importado(s) com sucesso.`);
  return res.redirect("/students");
};

const create = async (req, res) => {
  const { name, class_name: className, shift, phone, registration } = req.body;
  const normalizedRegistration = String(registration || "").replace(/\D/g, "");

  if (!REGISTRATION_PATTERN.test(normalizedRegistration)) {
    const error = new Error(REGISTRATION_ERROR);
    error.status = 400;
    throw error;
  }

  if (!VALID_CLASSES.includes(className)) {
    const error = new Error("Turma invalida. Escolha entre 1ª série, 2ª série ou 3ª série.");
    error.status = 400;
    throw error;
  }

  if (!VALID_SHIFTS.includes(shift)) {
    const error = new Error("Turno invalido. Escolha entre Matutino, Vespertino.");
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
  if (!student) return res.status(404).send("Aluno nao encontrado.");
  return res.render("students/edit", { student, VALID_CLASSES, VALID_SHIFTS });
};

const updateStudent = async (req, res) => {
  const { name, class_name: className, shift, phone, registration } = req.body;
  const normalizedRegistration = String(registration || "").replace(/\D/g, "");

  if (!REGISTRATION_PATTERN.test(normalizedRegistration)) {
    const error = new Error(REGISTRATION_ERROR);
    error.status = 400;
    throw error;
  }

  if (!VALID_CLASSES.includes(className)) {
    const error = new Error("Turma invalida. Escolha entre 1ª série, 2ª série ou 3ª série.");
    error.status = 400;
    throw error;
  }

  if (!VALID_SHIFTS.includes(shift)) {
    const error = new Error("Turno invalido. Escolha entre Matutino, Vespertino.");
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

const downloadTemplate = (req, res) => {
  const csv = "\uFEFF" + "nome;turma;turno;matricula;telefone\n" +
    "\"Ana Souza\";\"1ª série\";\"Matutino\";\"12345678901\";\"(85) 99999-9999\"\n" +
    "\"Bruno Lima\";\"2ª série\";\"Vespertino\";\"12345678902\";\"\"\n";

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=\"modelo_importacao_alunos.csv\"");
  res.send(csv);
};

const diagnoseCsv = (req, res) => {
  if (!req.file) {
    setFlash(req, "error", "Nenhum arquivo enviado.");
    return res.redirect("/students");
  }

  const rows = parseCsv(readCsvContent(req.file));
  const sample = rows.slice(0, 5).map((row) => {
    const student = normalizeImportedStudent(row);
    return `Linha ${row.line}: nome="${student.name || "???"}" | matricula="${student.registration || "???"}"`;
  });

  setFlash(req, "info", `CSV lido com ${rows.length} linha(s). ${sample.join(" | ")}`);
  return res.redirect("/students");
};

const importCsv = async (req, res) => {
  try {
    if (!req.file) {
      setFlash(req, "error", "Nenhum arquivo enviado.");
      return res.redirect("/students");
    }

    const rows = parseCsv(readCsvContent(req.file));
    if (!rows.length) {
      setFlash(req, "error", "Arquivo CSV vazio ou invalido.");
      return res.redirect("/students");
    }

    const results = { ok: 0, errors: [] };

    for (const row of rows) {
      const student = normalizeImportedStudent(row);
      const errors = validateImportedStudent(student);

      if (errors.length) {
        results.errors.push(`Linha ${row.line}: ${errors.join(", ")}`);
        continue;
      }

      if (!VALID_CLASSES.includes(student.class_name)) {
        results.errors.push(`Linha ${row.line} ("${student.name}"): turma invalida.`);
        continue;
      }

      if (!VALID_SHIFTS.includes(student.shift)) {
        results.errors.push(`Linha ${row.line} ("${student.name}"): turno invalido.`);
        continue;
      }

      try {
        const existingStudent = await studentModel.getByRegistration(student.registration);
        if (existingStudent) {
          await studentModel.update(existingStudent.id, student);
        } else {
          await studentModel.create(student);
        }
        results.ok += 1;
      } catch (error) {
        const message = error.message && error.message.includes("UNIQUE")
          ? `matricula "${student.registration}" ja existe no banco`
          : error.message;
        results.errors.push(`Linha ${row.line} ("${student.name}"): ${message}`);
      }
    }

    const message = results.errors.length
      ? `${results.ok} aluno(s) importado(s). ${results.errors.length} linha(s) com erro: ${results.errors.slice(0, 3).join(" | ")}`
      : `${results.ok} de ${rows.length} aluno(s) importado(s) com sucesso.`;

    setFlash(req, results.errors.length ? "error" : "success", message);
    return res.redirect("/students");
  } catch (error) {
    console.error("Erro ao importar CSV de alunos:", error);
    setFlash(req, "error", "Erro ao processar o arquivo CSV. Detalhes: " + error.message);
    return res.redirect("/students");
  }
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
  downloadTemplate,
  importCsv,
  diagnoseCsv,
};
