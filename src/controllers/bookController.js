const bookModel = require("../models/bookModel");

const index = async (req, res) => {
  const books = await bookModel.listAll();
  // Add available copies count
  for (const book of books) {
    const countResults = await bookModel.countAvailableCopies(book.id);
    book.availableCopies = countResults.length > 0 ? countResults[0].count : 0;
  }
  return res.render("books/index", { books });
};

const create = async (req, res) => {
  try {
    const { title, subtitle, author, isbn, publisher, quantity } = req.body;
    let cover_url = null;

    try {
      let query = '';
      if (isbn) {
        query = `isbn:${isbn}`;
      } else {
        query = `intitle:${title}+inauthor:${author}`;
      }
      // Se tiver globalThis.fetch usa ele, senão faz fallback seguro
      if (typeof fetch === 'function') {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const volumeInfo = data.items[0].volumeInfo;
          if (volumeInfo.imageLinks && volumeInfo.imageLinks.thumbnail) {
            cover_url = volumeInfo.imageLinks.thumbnail.replace('http:', 'https:');
          }
        }
      }
    } catch (apiError) {
      console.error("Erro ao buscar capa na API:", apiError);
    }

    const result = await bookModel.create({ title, subtitle, author, isbn, publisher, cover_url });
    const bookId = result.id; // run returns { id: this.lastID, changes: this.changes }
    await bookModel.createCopies(bookId, Number(quantity) || 1);
    return res.redirect("/books");
  } catch (error) {
    console.error("Erro ao criar livro:", error);
    return res.status(500).send("Erro ao cadastrar livro. Detalhes: " + error.message);
  }
};

const remove = async (req, res) => {
  await bookModel.remove(req.params.id);
  return res.redirect("/books");
};

const editBook = async (req, res) => {
  const book = await bookModel.getById(req.params.id);
  if (!book) return res.status(404).send("Livro não encontrado.");
  return res.render("books/edit", { book });
};

const updateBook = async (req, res) => {
  try {
    const { title, subtitle, author, isbn, publisher } = req.body;
    const currentBook = await bookModel.getById(req.params.id);
    let cover_url = currentBook ? currentBook.cover_url : null;

    // Se o ISBN mudou, busca nova capa
    if (isbn && isbn !== currentBook?.isbn) {
      try {
        if (typeof fetch === 'function') {
          const query = `isbn:${isbn}`;
          const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`);
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            const volumeInfo = data.items[0].volumeInfo;
            if (volumeInfo.imageLinks && volumeInfo.imageLinks.thumbnail) {
              cover_url = volumeInfo.imageLinks.thumbnail.replace('http:', 'https:');
            }
          }
        }
      } catch (apiError) {
        console.error("Erro ao buscar capa na API:", apiError);
      }
    }

    await bookModel.update(req.params.id, { title, subtitle, author, isbn, publisher, cover_url });
    return res.redirect("/books");
  } catch (error) {
    console.error("Erro ao atualizar livro:", error);
    return res.status(500).send("Erro ao atualizar livro. Detalhes: " + error.message);
  }
};

const exportExcel = async (req, res) => {
  try {
    const books = await bookModel.listAll();

    let csv = '\uFEFF';
    csv += 'ID;Título;Subtítulo;Autor;ISBN;Disponíveis\n';

    for (const book of books) {
      const countResults = await bookModel.countAvailableCopies(book.id);
      const availableCopies = countResults.length > 0 ? countResults[0].count : 0;

      const safeTitle = (book.title || '').replace(/"/g, '""');
      const safeSubtitle = (book.subtitle || '').replace(/"/g, '""');
      const safeAuthor = (book.author || '').replace(/"/g, '""');
      const safeIsbn = (book.isbn || '').replace(/"/g, '""');

      csv += `"${book.id}";"${safeTitle}";"${safeSubtitle}";"${safeAuthor}";"${safeIsbn}";"${availableCopies}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="acervo_livros.csv"');
    res.send(csv);
  } catch (error) {
    console.error("Erro ao exportar livros:", error);
    return res.status(500).send("Erro ao gerar exportação.");
  }
};

const downloadTemplate = (req, res) => {
  const csv = '\uFEFF' + 'titulo;subtitulo;autor;editora;isbn;quantidade\n' +
    '"Dom Casmurro";"";  "Machado de Assis";"Globo";"9786556926650";"2"\n' +
    '"O Cortiço";"";"Aluísio Azevedo";"Ática";"9788508057405";"3"\n';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="modelo_importacao_livros.csv"');
  res.send(csv);
};

// Rota de diagnóstico: analisa o CSV sem importar nada
const diagnoseCsv = (req, res) => {
  if (!req.file) return res.status(400).send("Nenhum arquivo enviado.");

  let content = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
  if (content.includes('\uFFFD')) content = req.file.buffer.toString('latin1');

  const allLines = content.split(/\r?\n/);
  const lines = allLines.filter(l => l.trim());

  const headerLine = lines[0] || '';
  const sep = headerLine.includes(';') ? ';' : ',';

  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === sep && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(headerLine);
  let html = `<pre style="font-family:monospace;padding:20px;font-size:13px;line-height:1.7">`;
  html += `<b>📋 DIAGNÓSTICO DO ARQUIVO CSV</b>\n\n`;
  html += `Tamanho do arquivo: ${req.file.size} bytes\n`;
  html += `Separador detectado: "${sep}"\n`;
  html += `Total de linhas (incluindo vazias): ${allLines.length}\n`;
  html += `Total de linhas válidas (sem vazias): ${lines.length}\n`;
  html += `Total de dados (excluindo cabeçalho): ${lines.length - 1}\n\n`;
  html += `<b>Cabeçalho detectado (${headers.length} colunas):</b>\n`;
  headers.forEach((h, i) => { html += `  [${i}] "${h}"\n`; });
  html += `\n<b>Primeiras 5 linhas de dados:</b>\n`;

  for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
    const cols = parseLine(lines[i]);
    const titulo = cols[headers.map(h => h.toLowerCase()).indexOf('titulo')] ||
                   cols[headers.map(h => h.toLowerCase()).indexOf('title')] || '???';
    const autor  = cols[headers.map(h => h.toLowerCase()).indexOf('autor')]  ||
                   cols[headers.map(h => h.toLowerCase()).indexOf('author')]  || '???';
    html += `  Linha ${i + 1}: ${cols.length} colunas | titulo="${titulo}" | autor="${autor}"\n`;
  }

  html += `\n<b>Últimas 3 linhas de dados:</b>\n`;
  for (let i = Math.max(1, lines.length - 3); i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    html += `  Linha ${i + 1}: ${cols.length} colunas | raw="${lines[i].substring(0, 80)}..."\n`;
  }

  html += `\n<a href="/books">← Voltar para Livros</a></pre>`;
  res.send(html);
};

const importCsv = async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("Nenhum arquivo enviado.");

    // Lê o arquivo - tenta UTF-8, depois latin1 como fallback (Excel antigo)
    let content = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
    if (content.includes('\uFFFD')) {
      content = req.file.buffer.toString('latin1');
    }

    const lines = content.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return res.status(400).send("Arquivo CSV vazio ou inválido.");

    // Detecta separador automaticamente (vírgula ou ponto e vírgula)
    const headerLine = lines[0];
    const sep = headerLine.includes(';') ? ';' : ',';

    // Parser robusto que respeita campos entre aspas com separador interno
    const parseLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (ch === sep && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(headerLine).map(h => h.toLowerCase());
    const results = { ok: 0, errors: [] };

    console.log(`[CSV Import] Separador: "${sep}" | Linhas: ${lines.length - 1} | Colunas: [${headers.join(', ')}]`);

    // Processa cada linha SEM chamadas externas — inserts diretos no banco
    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => { row[h] = cols[idx] || ''; });

      const title = (row['titulo'] || row['title'] || '').trim();
      const author = (row['autor'] || row['author'] || '').trim();

      if (!title || !author) {
        results.errors.push(`Linha ${i + 1}: título/autor em branco (recebido: "${cols.join(' | ')}")`);
        continue;
      }

      // ISBN: ignora valores AUTO-xxx gerados pelo sistema ou string vazia
      const rawIsbn = (row['isbn'] || '').trim();
      const isbn = (rawIsbn && !rawIsbn.startsWith('AUTO-')) ? rawIsbn : null;

      try {
        const result = await bookModel.create({
          title,
          subtitle: (row['subtitulo'] || row['subtitle'] || '').trim() || null,
          author,
          isbn,
          publisher: (row['editora'] || row['publisher'] || '').trim() || null,
          cover_url: null,
        });
        const qty = parseInt(row['quantidade'] || row['quantity'] || '1', 10);
        await bookModel.createCopies(result.id, qty > 0 ? qty : 1);
        results.ok++;
      } catch (e) {
        const msg = e.message && e.message.includes('UNIQUE')
          ? `ISBN "${isbn}" já existe no banco (duplicado)`
          : e.message;
        results.errors.push(`Linha ${i + 1} ("${title}"): ${msg}`);
      }
    }

    const msg = `✅ ${results.ok} de ${lines.length - 1} livro(s) importado(s) com sucesso.` +
      (results.errors.length ? `\n\n⚠️ ${results.errors.length} linha(s) com erro:\n${results.errors.join('\n')}` : '\n\nℹ️ Dica: as capas não são buscadas na importação em lote. Use o botão "Editar" em cada livro para adicionar um ISBN e buscar a capa.');
    return res.send(`<pre style="font-family:sans-serif;padding:20px;max-width:900px;line-height:1.6">${msg}\n\n<a href="/books">← Voltar para Livros</a></pre>`);
  } catch (error) {
    console.error("Erro ao importar CSV:", error);
    return res.status(500).send("Erro ao processar o arquivo CSV. Detalhes: " + error.message);
  }
};

module.exports = { index, create, editBook, updateBook, remove, exportExcel, downloadTemplate, importCsv, diagnoseCsv };
