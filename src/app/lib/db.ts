import { sql } from '@vercel/postgres';
import Database from 'better-sqlite3';
import path from 'path';

const USE_SQLITE = process.env.USE_SQLITE === 'true';
let db: Database.Database | null = null;

if (USE_SQLITE) {
  const dbPath = path.join(process.cwd(), 'local.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  publish_date?: string;
  summary?: string;
  state: 'In library' | 'Checked out' | 'Lost';
  current_possessor: string;
  times_read: number;
  last_read?: string;
  date_added: string;
  isbn?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export async function initializeDatabase() {
  try {
    if (USE_SQLITE && db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS books (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          author TEXT,
          publish_date TEXT,
          summary TEXT,
          state TEXT NOT NULL CHECK (state IN ('In library', 'Checked out', 'Lost')),
          current_possessor TEXT NOT NULL,
          times_read INTEGER DEFAULT 0,
          last_read TEXT,
          date_added TEXT NOT NULL DEFAULT (date('now')),
          isbn TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);
    } else {
      await sql`
        CREATE TABLE IF NOT EXISTS books (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          author TEXT,
          publish_date DATE,
          summary TEXT,
          state TEXT NOT NULL CHECK (state IN ('In library', 'Checked out', 'Lost')),
          current_possessor TEXT NOT NULL,
          times_read INTEGER DEFAULT 0,
          last_read DATE,
          date_added DATE NOT NULL DEFAULT CURRENT_DATE,
          isbn TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
    }

    console.log(`Database initialized successfully (${USE_SQLITE ? 'SQLite' : 'Postgres'})`);
    return { success: true };
  } catch (error) {
    console.error('Database initialization error:', error);
    return { success: false, error };
  }
}

export async function getAllBooks(): Promise<Book[]> {
  try {
    if (USE_SQLITE && db) {
      const rows = db.prepare('SELECT * FROM books ORDER BY created_at DESC').all() as Array<Omit<Book, 'id'> & { id: number }>;
      return rows.map(row => ({ ...row, id: String(row.id) }));
    }
    const { rows } = await sql<Book>`SELECT * FROM books ORDER BY created_at DESC`;
    return rows;
  } catch (error) {
    console.error('Error fetching books:', error);
    throw error;
  }
}

export async function getBookById(id: string): Promise<Book | null> {
  try {
    if (USE_SQLITE && db) {
      const row = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as (Omit<Book, 'id'> & { id: number }) | undefined;
      return row ? { ...row, id: String(row.id) } : null;
    }
    const { rows } = await sql<Book>`SELECT * FROM books WHERE id = ${id}`;
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching book by ID:', error);
    throw error;
  }
}

export async function createBook(book: Omit<Book, 'id' | 'created_at' | 'updated_at'>): Promise<Book> {
  try {
    if (USE_SQLITE && db) {
      const stmt = db.prepare(`
        INSERT INTO books (title, author, publish_date, summary, state, current_possessor, times_read, last_read, date_added, isbn)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        book.title, book.author, book.publish_date, book.summary,
        book.state, book.current_possessor, book.times_read,
        book.last_read, book.date_added, book.isbn
      );
      const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid) as Omit<Book, 'id'> & { id: number };
      return { ...newBook, id: String(newBook.id) };
    }
    const { rows } = await sql<Book>`
      INSERT INTO books (
        title, author, publish_date, summary, state,
        current_possessor, times_read, last_read, date_added, isbn
      ) VALUES (
        ${book.title}, ${book.author}, ${book.publish_date}, ${book.summary},
        ${book.state}, ${book.current_possessor}, ${book.times_read},
        ${book.last_read}, ${book.date_added}, ${book.isbn}
      )
      RETURNING *
    `;
    return rows[0];
  } catch (error) {
    console.error('Error creating book:', error);
    throw error;
  }
}

export async function updateBook(id: string, updates: Partial<Omit<Book, 'id' | 'created_at' | 'updated_at'>>): Promise<Book> {
  try {
    if (USE_SQLITE && db) {
      const setParts: string[] = [];
      const values: unknown[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          setParts.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (setParts.length === 0) {
        throw new Error('No fields to update');
      }

      setParts.push(`updated_at = datetime('now')`);
      values.push(id);

      const query = `UPDATE books SET ${setParts.join(', ')} WHERE id = ?`;
      db.prepare(query).run(...values);
      const updated = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as Omit<Book, 'id'> & { id: number };
      return { ...updated, id: String(updated.id) };
    }

    const setParts: string[] = [];
    const values: (string | number | Date)[] = [];
    let valueIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        setParts.push(`${key} = $${valueIndex}`);
        values.push(value);
        valueIndex++;
      }
    });

    if (setParts.length === 0) {
      throw new Error('No fields to update');
    }

    setParts.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE books
      SET ${setParts.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING *
    `;
    values.push(id);

    const { rows } = await sql.query(query, values);
    return rows[0] as Book;
  } catch (error) {
    console.error('Error updating book:', error);
    throw error;
  }
}

export async function deleteBook(id: string): Promise<boolean> {
  try {
    if (USE_SQLITE && db) {
      const result = db.prepare('DELETE FROM books WHERE id = ?').run(id);
      return result.changes > 0;
    }
    const { rowCount } = await sql`DELETE FROM books WHERE id = ${id}`;
    return (rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error deleting book:', error);
    throw error;
  }
}

export async function getBooksByState(state: Book['state']): Promise<Book[]> {
  try {
    if (USE_SQLITE && db) {
      const rows = db.prepare('SELECT * FROM books WHERE state = ? ORDER BY created_at DESC').all(state) as Array<Omit<Book, 'id'> & { id: number }>;
      return rows.map(row => ({ ...row, id: String(row.id) }));
    }
    const { rows } = await sql<Book>`
      SELECT * FROM books
      WHERE state = ${state}
      ORDER BY created_at DESC
    `;
    return rows;
  } catch (error) {
    console.error('Error fetching books by state:', error);
    throw error;
  }
}

export async function createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
  try {
    if (USE_SQLITE && db) {
      const stmt = db.prepare(`
        INSERT INTO users (name)
        VALUES (?)
      `);
      const result = stmt.run(userData.name);
      const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as Omit<User, 'id'> & { id: number };
      return { ...newUser, id: String(newUser.id) };
    }
    const { rows } = await sql<User>`
      INSERT INTO users (name)
      VALUES (${userData.name})
      RETURNING *
    `;
    return rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    if (USE_SQLITE && db) {
      const rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as Array<Omit<User, 'id'> & { id: number }>;
      return rows.map(row => ({ ...row, id: String(row.id) }));
    }
    const { rows } = await sql<User>`SELECT * FROM users ORDER BY created_at DESC`;
    return rows;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}