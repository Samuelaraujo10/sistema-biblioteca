const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "..", "..", "database.sqlite");
const db = new sqlite3.Database(dbPath);

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
              CREATE TABLE IF NOT EXISTS loans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                copy_id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                loan_date TEXT NOT NULL,
                due_date TEXT NOT NULL,
                return_date TEXT,
                status TEXT NOT NULL DEFAULT 'emprestado',
                FOREIGN KEY (copy_id) REFERENCES book_copies(id),
                FOREIGN KEY (student_id) REFERENCES students(id)
              )
            `, (loansError) => {
              if (loansError) return reject(loansError);
              resolve();
            });
          });
        });
      });
    });
  });

module.exports = { db, initDatabase };
