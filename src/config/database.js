const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "..", "..", "database.sqlite");
const db = new sqlite3.Database(dbPath);

const runSql = (sql) =>
  new Promise((resolve, reject) => {
    db.run(sql, (error) => {
      if (error) return reject(error);
      return resolve();
    });
  });

const migrateLoansTable = async (createLoansSql) => {
  await runSql("BEGIN TRANSACTION");

  try {
    await runSql("ALTER TABLE loans RENAME TO loans_old");
    await runSql(createLoansSql);
    await runSql(`
      INSERT INTO loans (id, copy_id, student_id, loan_date, due_date, return_date, status)
      SELECT id, copy_id, student_id, loan_date, due_date, return_date, status FROM loans_old
    `);
    await runSql("DROP TABLE loans_old");
    await runSql("COMMIT");
  } catch (error) {
    await runSql("ROLLBACK").catch(() => {});
    throw error;
  }
};

const initDatabase = () =>
  new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create all tables if they don't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS books (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          subtitle TEXT,
          author TEXT NOT NULL,
          isbn TEXT UNIQUE,
          publisher TEXT,
          cover_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (booksError) => {
        if (booksError) return reject(booksError);
        // Add subtitle column if it doesn't exist (for existing databases)
        db.run(`ALTER TABLE books ADD COLUMN subtitle TEXT`, (alterError) => {
          // Ignore error if column already exists
        });
        db.run(`ALTER TABLE books ADD COLUMN cover_url TEXT`, (alterError) => {
          // Ignore error if column already exists
        });
        db.run(`ALTER TABLE books ADD COLUMN publisher TEXT`, (alterError) => {
          // Ignore error if column already exists
        });

        db.run(`
          CREATE TABLE IF NOT EXISTS book_copies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER NOT NULL,
            copy_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'available',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books(id),
            UNIQUE(book_id, copy_id)
          )
        `, (copiesError) => {
          if (copiesError) return reject(copiesError);

          db.run(`
            CREATE TABLE IF NOT EXISTS students (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              class_name TEXT NOT NULL,
              shift TEXT,
              phone TEXT,
              registration TEXT UNIQUE NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (studentsError) => {
            if (studentsError) return reject(studentsError);
            
            db.run(`ALTER TABLE students ADD COLUMN shift TEXT`, (alterError) => {
              // Ignore error if column already exists
            });
            db.run(`ALTER TABLE students ADD COLUMN phone TEXT`, (alterError) => {
              // Ignore error if column already exists
            });

            db.run(`
              CREATE TABLE IF NOT EXISTS staff (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                cpf TEXT UNIQUE NOT NULL,
                phone TEXT,
                type TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )
            `, (staffError) => {
              if (staffError) return reject(staffError);

              // Migração ou criação da tabela loans
              db.all("PRAGMA table_info(loans)", (pragmaErr, columns) => {
                if (pragmaErr) return reject(pragmaErr);

                const hasStaffId = columns && columns.some(c => c.name === 'staff_id');
                const tableExists = columns && columns.length > 0;

                const createLoansSql = `
                  CREATE TABLE IF NOT EXISTS loans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    copy_id INTEGER NOT NULL,
                    student_id INTEGER,
                    staff_id INTEGER,
                    loan_date TEXT NOT NULL,
                    due_date TEXT NOT NULL,
                    return_date TEXT,
                    status TEXT NOT NULL DEFAULT 'emprestado',
                    FOREIGN KEY (copy_id) REFERENCES book_copies(id),
                    FOREIGN KEY (student_id) REFERENCES students(id),
                    FOREIGN KEY (staff_id) REFERENCES staff(id)
                  )
                `;

                if (!tableExists) {
                  db.run(createLoansSql, (createErr) => {
                    if (createErr) return reject(createErr);
                    resolve();
                  });
                } else if (!hasStaffId) {
                  // Precisa migrar (tirar NOT NULL do student_id e adicionar staff_id)
                  migrateLoansTable(createLoansSql).then(resolve).catch(reject);
                } else {
                  // Tudo certo
                  resolve();
                }
              });
            });
          });
        });
      });
    });
  });

module.exports = { db, initDatabase };
