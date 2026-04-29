const staffModel = require("../models/staffModel");
const VALID_TYPES = ["Professor", "Funcionário"];

const index = async (req, res) => {
  const staffList = await staffModel.listAll();
  return res.render("staff/index", { staffList });
};

const create = async (req, res) => {
  const { name, cpf, phone, type } = req.body;
  const normalizedCpf = String(cpf || "").replace(/\D/g, "");

  if (!/^\d{11}$/.test(normalizedCpf)) {
    const error = new Error("O CPF deve conter exatamente 11 dígitos numéricos.");
    error.status = 400;
    throw error;
  }

  if (!VALID_TYPES.includes(type)) {
    const error = new Error("Tipo inválido. Escolha entre Professor ou Funcionário.");
    error.status = 400;
    throw error;
  }

  await staffModel.create({
    name,
    cpf: normalizedCpf,
    phone: phone || null,
    type,
  });
  return res.redirect("/staff");
};

const editStaff = async (req, res) => {
  const staff = await staffModel.getById(req.params.id);
  if (!staff) return res.status(404).send("Funcionário não encontrado.");
  return res.render("staff/edit", { staff, VALID_TYPES });
};

const updateStaff = async (req, res) => {
  const { name, cpf, phone, type } = req.body;
  const normalizedCpf = String(cpf || "").replace(/\D/g, "");

  if (!/^\d{11}$/.test(normalizedCpf)) {
    const error = new Error("O CPF deve conter exatamente 11 dígitos numéricos.");
    error.status = 400;
    throw error;
  }

  if (!VALID_TYPES.includes(type)) {
    const error = new Error("Tipo inválido. Escolha entre Professor ou Funcionário.");
    error.status = 400;
    throw error;
  }

  await staffModel.update(req.params.id, {
    name,
    cpf: normalizedCpf,
    phone: phone || null,
    type,
  });
  return res.redirect("/staff");
};

const remove = async (req, res) => {
  const loanCount = await staffModel.countLoans(req.params.id);
  if (loanCount > 0) {
    return res
      .status(400)
      .send("Não é possível excluir este cadastro porque ele possui empréstimos vinculados.");
  }

  await staffModel.remove(req.params.id);
  return res.redirect("/staff");
};

module.exports = { index, create, editStaff, updateStaff, remove };
