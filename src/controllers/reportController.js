const loanModel = require("../models/loanModel");
const XLSX = require("xlsx");

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (val) => {
  if (!val) return "";
  // SQLite devolve YYYY-MM-DD — força hora meio-dia para evitar problema de fuso
  return new Date(val + "T12:00:00").toLocaleDateString("pt-BR");
};

const colWidths = (rows) =>
  rows[0]
    ? Object.keys(rows[0]).map((k) => ({
        wch: Math.max(
          k.length,
          ...rows.map((r) => String(r[k] ?? "").length)
        ),
      }))
    : [];

// ── Monta aba de empréstimos detalhados ───────────────────────────────────────

const buildLoanRows = (loans, showReturn) =>
  loans.map((l) => {
    const base = {
      Livro:               l.book_title,
      "Nº Cópia":          l.copy_id,
      Locatário:           l.borrower_name,
      "Matrícula/CPF":     l.borrower_registration || l.borrower_cpf || "",
      Tipo:                l.borrower_type,
      Série:               l.student_class  || "",
      Turno:               l.student_shift  || "",
      Telefone:            l.borrower_phone || "",
      "Data Empréstimo":   fmtDate(l.loan_date),
      "Devolução Prevista":fmtDate(l.due_date),
    };
    if (showReturn) {
      base["Devolvido Em"] = fmtDate(l.return_date);
    } else {
      base["Dias de Atraso"] =
        l.days_late > 0 ? l.days_late : 0;
      base["Situação"] =
        l.days_late > 0 ? `Vencido há ${l.days_late} dia(s)` : "No prazo";
    }
    return base;
  });

// ── Controller: página HTML ───────────────────────────────────────────────────

const report = async (req, res) => {
  const today     = new Date().toISOString().slice(0, 10);
  const yearStart = today.slice(0, 4) + "-01-01";

  const startDate = req.query.start || yearStart;
  const endDate   = req.query.end   || today;

  const [statsRows, byBook, byBorrowerType, byMonth, allLoans] = await Promise.all([
    loanModel.getReportStats(startDate, endDate),
    loanModel.getReportByBook(startDate, endDate),
    loanModel.getReportByBorrowerType(startDate, endDate),
    loanModel.getReportByMonth(startDate, endDate),
    loanModel.getReportLoansDetailed(startDate, endDate),
  ]);

  const stats = statsRows[0] || { total: 0, active: 0, returned: 0, overdue: 0 };

  const loansTotal    = allLoans;
  const loansActive   = allLoans.filter((l) => l.status === "emprestado" && l.days_late <= 0);
  const loansReturned = allLoans.filter((l) => l.status === "devolvido");
  const loansOverdue  = allLoans.filter((l) => l.status === "emprestado" && l.days_late > 0);

  return res.render("loans/report", {
    stats, byBook, byBorrowerType, byMonth,
    startDate, endDate,
    loansTotal, loansActive, loansReturned, loansOverdue,
  });
};

// ── Controller: exportação Excel ─────────────────────────────────────────────

const exportExcel = async (req, res) => {
  const today     = new Date().toISOString().slice(0, 10);
  const yearStart = today.slice(0, 4) + "-01-01";

  const startDate = req.query.start || yearStart;
  const endDate   = req.query.end   || today;

  const [statsRows, byBook, byBorrowerType, byMonth, allLoans] = await Promise.all([
    loanModel.getReportStats(startDate, endDate),
    loanModel.getReportByBook(startDate, endDate),
    loanModel.getReportByBorrowerType(startDate, endDate),
    loanModel.getReportByMonth(startDate, endDate),
    loanModel.getReportLoansDetailed(startDate, endDate),
  ]);

  const stats         = statsRows[0] || { total: 0, active: 0, returned: 0, overdue: 0 };
  const loansActive   = allLoans.filter((l) => l.status === "emprestado" && l.days_late <= 0);
  const loansReturned = allLoans.filter((l) => l.status === "devolvido");
  const loansOverdue  = allLoans.filter((l) => l.status === "emprestado" && l.days_late > 0);

  const wb = XLSX.utils.book_new();

  // ── Aba 1: Resumo ─────────────────────────────────────────────────────────
  const resumoData = [
    ["Relatório de Empréstimos"],
    [`Período: ${fmtDate(startDate)} a ${fmtDate(endDate)}`],
    [`Gerado em: ${new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" })}`],
    [],
    ["Indicador", "Quantidade"],
    ["Total de Empréstimos",   stats.total],
    ["Em Aberto (no prazo)",   loansActive.length],
    ["Devolvidos",             stats.returned],
    ["Vencidos (em aberto)",   stats.overdue],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
  wsResumo["!cols"] = [{ wch: 30 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  // ── Aba 2: Todos os Empréstimos ───────────────────────────────────────────
  const totalRows = buildLoanRows(allLoans, false);
  if (totalRows.length) {
    const wsTotal = XLSX.utils.json_to_sheet(totalRows);
    wsTotal["!cols"] = colWidths(totalRows);
    XLSX.utils.book_append_sheet(wb, wsTotal, "Todos");
  }

  // ── Aba 3: Em Aberto ─────────────────────────────────────────────────────
  const activeRows = buildLoanRows(loansActive, false);
  if (activeRows.length) {
    const wsActive = XLSX.utils.json_to_sheet(activeRows);
    wsActive["!cols"] = colWidths(activeRows);
    XLSX.utils.book_append_sheet(wb, wsActive, "Em Aberto");
  }

  // ── Aba 4: Devolvidos ─────────────────────────────────────────────────────
  const returnedRows = buildLoanRows(loansReturned, true);
  if (returnedRows.length) {
    const wsReturned = XLSX.utils.json_to_sheet(returnedRows);
    wsReturned["!cols"] = colWidths(returnedRows);
    XLSX.utils.book_append_sheet(wb, wsReturned, "Devolvidos");
  }

  // ── Aba 5: Vencidos ───────────────────────────────────────────────────────
  const overdueRows = buildLoanRows(loansOverdue, false);
  if (overdueRows.length) {
    const wsOverdue = XLSX.utils.json_to_sheet(overdueRows);
    wsOverdue["!cols"] = colWidths(overdueRows);
    XLSX.utils.book_append_sheet(wb, wsOverdue, "Vencidos");
  }

  // ── Aba 6: Ranking de Livros ─────────────────────────────────────────────
  if (byBook.length) {
    const bookRows = byBook.map((b, i) => ({
      "#":          i + 1,
      Título:       b.title,
      Autor:        b.author || "",
      "Total Empréstimos": b.total_loans,
      "Em Aberto":  b.active,
      "Devolvidos": b.returned,
    }));
    const wsBooks = XLSX.utils.json_to_sheet(bookRows);
    wsBooks["!cols"] = colWidths(bookRows);
    XLSX.utils.book_append_sheet(wb, wsBooks, "Ranking Livros");
  }

  // ── Aba 7: Por Mês ────────────────────────────────────────────────────────
  const mNamesLong = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                      "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  if (byMonth.length) {
    const monthRows = byMonth.map((m) => {
      const [y, mo] = m.mes.split("-");
      const rate = m.total_loans > 0
        ? `${Math.round((m.returned / m.total_loans) * 100)}%`
        : "0%";
      return {
        Mês:               mNamesLong[parseInt(mo, 10) - 1] + " " + y,
        Total:             m.total_loans,
        "Em Aberto":       m.active,
        Devolvidos:        m.returned,
        "Taxa Devolução":  rate,
      };
    });
    const wsMonth = XLSX.utils.json_to_sheet(monthRows);
    wsMonth["!cols"] = colWidths(monthRows);
    XLSX.utils.book_append_sheet(wb, wsMonth, "Por Mês");
  }

  // ── Aba 8: Por Tipo de Locatário ─────────────────────────────────────────
  if (byBorrowerType.length) {
    const typeRows = byBorrowerType.map((t) => ({
      Tipo:              t.tipo,
      "Total Empréstimos": t.total_loans,
    }));
    const wsType = XLSX.utils.json_to_sheet(typeRows);
    wsType["!cols"] = colWidths(typeRows);
    XLSX.utils.book_append_sheet(wb, wsType, "Por Tipo");
  }

  // ── Gera buffer e envia como download ────────────────────────────────────
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `relatorio_emprestimos_${startDate}_${endDate}.xlsx`;

  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  return res.send(buf);
};

module.exports = { report, exportExcel };

