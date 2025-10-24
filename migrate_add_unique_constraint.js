const Database = require('better-sqlite3');
const path = require('path');

// Open the database
const dbPath = path.join(__dirname, 'local.db');
const db = new Database(dbPath);

console.log('Starting migration to add UNIQUE constraint...');

try {
  // Start a transaction
  db.exec('BEGIN TRANSACTION');

  // Create new table with UNIQUE constraint
  db.exec(`
    CREATE TABLE books_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT,
      publish_date TEXT,
      summary TEXT,
      state TEXT NOT NULL CHECK (state IN ('In library', 'Checked out', 'Lost')),
      owner TEXT NOT NULL,
      current_possessor TEXT NOT NULL,
      times_read INTEGER DEFAULT 0,
      last_read TEXT,
      date_added TEXT NOT NULL DEFAULT (date('now')),
      isbn TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(isbn, owner)
    )
  `);

  // Copy data from old table to new table
  // Old table has: id, title, author, publish_date, summary, state, current_possessor, times_read, last_read, date_added, isbn, created_at, updated_at
  // New table adds: owner (use current_possessor as default for migration)
  db.exec(`
    INSERT INTO books_new (id, title, author, publish_date, summary, state, owner, current_possessor, times_read, last_read, date_added, isbn, created_at, updated_at)
    SELECT id, title, author, publish_date, summary, state, current_possessor, current_possessor, times_read, last_read, date_added, isbn, created_at, updated_at
    FROM books
  `);

  // Drop old table
  db.exec('DROP TABLE books');

  // Rename new table to books
  db.exec('ALTER TABLE books_new RENAME TO books');

  // Commit the transaction
  db.exec('COMMIT');

  console.log('Migration completed successfully!');
  console.log('UNIQUE constraint added to (isbn, owner)');
} catch (error) {
  // Rollback on error
  db.exec('ROLLBACK');
  console.error('Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
