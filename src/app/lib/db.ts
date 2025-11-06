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
  owner: string;
  current_possessor: string;
  times_read: number;
  last_read?: string;
  date_added: string;
  isbn?: string;
  tags?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  tags?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  changed_field: string;
  old_value: string;
  new_value: string;
  changed_by: string;
  timestamp: string;
  book_id?: string;
  book_title?: string;
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
          owner TEXT NOT NULL,
          current_possessor TEXT NOT NULL,
          times_read INTEGER DEFAULT 0,
          last_read TEXT,
          date_added TEXT NOT NULL DEFAULT (date('now')),
          isbn TEXT,
          tags TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          UNIQUE(isbn, owner)
        )
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          tags TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          changed_field TEXT NOT NULL,
          old_value TEXT NOT NULL,
          new_value TEXT NOT NULL,
          changed_by TEXT NOT NULL,
          timestamp TEXT DEFAULT (datetime('now')),
          book_id TEXT,
          book_title TEXT
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
          owner TEXT NOT NULL,
          current_possessor TEXT NOT NULL,
          times_read INTEGER DEFAULT 0,
          last_read DATE,
          date_added DATE NOT NULL DEFAULT CURRENT_DATE,
          isbn TEXT,
          tags TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(isbn, owner)
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          tags TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          changed_field TEXT NOT NULL,
          old_value TEXT NOT NULL,
          new_value TEXT NOT NULL,
          changed_by TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          book_id TEXT,
          book_title TEXT
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
        INSERT INTO books (title, author, publish_date, summary, state, owner, current_possessor, times_read, last_read, date_added, isbn, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        book.title, book.author, book.publish_date, book.summary,
        book.state, book.owner, book.current_possessor, book.times_read,
        book.last_read, book.date_added, book.isbn, book.tags
      );
      const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid) as Omit<Book, 'id'> & { id: number };
      return { ...newBook, id: String(newBook.id) };
    }
    const { rows } = await sql<Book>`
      INSERT INTO books (
        title, author, publish_date, summary, state, owner,
        current_possessor, times_read, last_read, date_added, isbn, tags
      ) VALUES (
        ${book.title}, ${book.author}, ${book.publish_date}, ${book.summary},
        ${book.state}, ${book.owner}, ${book.current_possessor}, ${book.times_read},
        ${book.last_read}, ${book.date_added}, ${book.isbn}, ${book.tags}
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
    // Get existing book for audit logging
    const existingBook = await getBookById(id);
    if (!existingBook) {
      throw new Error('Book not found');
    }

    // Track fields we want to audit
    const trackedFields = ['state', 'owner', 'current_possessor', 'times_read'];

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

      // Create audit logs for tracked field changes
      for (const field of trackedFields) {
        const oldValue = existingBook[field as keyof Book];
        const newValue = updates[field as keyof typeof updates];
        if (newValue !== undefined && String(oldValue) !== String(newValue)) {
          await createAuditLog({
            changed_field: field,
            old_value: String(oldValue),
            new_value: String(newValue),
            changed_by: 'system',
            book_id: String(updated.id),
            book_title: updated.title
          });
        }
      }

      return { ...updated, id: String(updated.id) };
    }

    // Merge updates with existing book data to ensure all fields are present
    const updatedData = {
      ...existingBook,
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Use tagged template with proper typing to avoid parameter binding issues
    const { rows } = await sql<Book>`
      UPDATE books
      SET
        title = ${updatedData.title},
        author = ${updatedData.author || null},
        publish_date = ${updatedData.publish_date || null},
        summary = ${updatedData.summary || null},
        state = ${updatedData.state},
        owner = ${updatedData.owner},
        current_possessor = ${updatedData.current_possessor},
        times_read = ${updatedData.times_read},
        last_read = ${updatedData.last_read || null},
        date_added = ${updatedData.date_added},
        isbn = ${updatedData.isbn || null},
        tags = ${updatedData.tags || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    // Create audit logs for tracked field changes
    for (const field of trackedFields) {
      const oldValue = existingBook[field as keyof Book];
      const newValue = updates[field as keyof typeof updates];
      if (newValue !== undefined && String(oldValue) !== String(newValue)) {
        await createAuditLog({
          changed_field: field,
          old_value: String(oldValue),
          new_value: String(newValue),
          changed_by: 'system',
          book_id: rows[0].id,
          book_title: rows[0].title
        });
      }
    }

    return rows[0];
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
        INSERT INTO users (name, tags)
        VALUES (?, ?)
      `);
      const result = stmt.run(userData.name, userData.tags);
      const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as Omit<User, 'id'> & { id: number };
      return { ...newUser, id: String(newUser.id) };
    }
    const { rows } = await sql<User>`
      INSERT INTO users (name, tags)
      VALUES (${userData.name}, ${userData.tags})
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

export async function getUserById(id: string): Promise<User | null> {
  try {
    if (USE_SQLITE && db) {
      const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as (Omit<User, 'id'> & { id: number }) | undefined;
      return row ? { ...row, id: String(row.id) } : null;
    }
    const { rows } = await sql<User>`SELECT * FROM users WHERE id = ${id}`;
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    throw error;
  }
}

export async function updateUser(id: string, updates: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>): Promise<User> {
  try {
    // Get the current user to retrieve the old name
    const currentUser = await getUserById(id);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const oldName = currentUser.name;
    const newName = updates.name;

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

      const query = `UPDATE users SET ${setParts.join(', ')} WHERE id = ?`;
      db.prepare(query).run(...values);

      // If name was updated, update all books that reference the old name
      if (newName && newName !== oldName) {
        db.prepare('UPDATE books SET owner = ? WHERE owner = ?').run(newName, oldName);
        db.prepare('UPDATE books SET current_possessor = ? WHERE current_possessor = ?').run(newName, oldName);
      }

      const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Omit<User, 'id'> & { id: number };
      return { ...updated, id: String(updated.id) };
    }

    // Get current user data to merge with updates
    const currentUserData = await getUserById(id);
    if (!currentUserData) {
      throw new Error('User not found');
    }

    const updatedData = {
      ...currentUserData,
      ...updates
    };

    const { rows } = await sql<User>`
      UPDATE users
      SET
        name = ${updatedData.name},
        tags = ${updatedData.tags || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    if (!rows[0]) {
      throw new Error('User not found');
    }

    // If name was updated, update all books that reference the old name
    if (newName && newName !== oldName) {
      await sql`UPDATE books SET owner = ${newName} WHERE owner = ${oldName}`;
      await sql`UPDATE books SET current_possessor = ${newName} WHERE current_possessor = ${oldName}`;
    }

    return rows[0];
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    if (USE_SQLITE && db) {
      const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
      return result.changes > 0;
    }
    const { rowCount } = await sql`DELETE FROM users WHERE id = ${id}`;
    return (rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

export async function reassignUserBooks(fromUserId: string, toUserId: string): Promise<void> {
  try {
    if (USE_SQLITE && db) {
      // Update books owned by the user
      db.prepare('UPDATE books SET owner = ? WHERE owner = (SELECT name FROM users WHERE id = ?)').run(toUserId, fromUserId);
      // Update books possessed by the user
      db.prepare('UPDATE books SET current_possessor = ? WHERE current_possessor = (SELECT name FROM users WHERE id = ?)').run(toUserId, fromUserId);
    } else {
      // Get user names
      const fromUser = await getUserById(fromUserId);
      const toUser = await getUserById(toUserId);

      if (!fromUser || !toUser) {
        throw new Error('User not found');
      }

      // Update books owned by the user
      await sql`UPDATE books SET owner = ${toUser.name} WHERE owner = ${fromUser.name}`;
      // Update books possessed by the user
      await sql`UPDATE books SET current_possessor = ${toUser.name} WHERE current_possessor = ${fromUser.name}`;
    }
  } catch (error) {
    console.error('Error reassigning user books:', error);
    throw error;
  }
}

export async function createAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
  try {
    if (USE_SQLITE && db) {
      const stmt = db.prepare(`
        INSERT INTO audit_logs (changed_field, old_value, new_value, changed_by, book_id, book_title)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        log.changed_field,
        log.old_value,
        log.new_value,
        log.changed_by,
        log.book_id || null,
        log.book_title || null
      );
      const newLog = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(result.lastInsertRowid) as Omit<AuditLog, 'id'> & { id: number };
      return { ...newLog, id: String(newLog.id) };
    }
    const { rows } = await sql<AuditLog>`
      INSERT INTO audit_logs (changed_field, old_value, new_value, changed_by, book_id, book_title)
      VALUES (${log.changed_field}, ${log.old_value}, ${log.new_value}, ${log.changed_by}, ${log.book_id || null}, ${log.book_title || null})
      RETURNING *
    `;
    return rows[0];
  } catch (error) {
    console.error('Error creating audit log:', error);
    throw error;
  }
}

export async function getAuditLogs(filters?: {
  eventType?: string;
  bookId?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  try {
    const limit = filters?.limit || 50;

    if (USE_SQLITE && db) {
      let query = 'SELECT * FROM audit_logs';
      const conditions: string[] = [];
      const values: unknown[] = [];

      if (filters?.eventType && filters.eventType !== 'all') {
        conditions.push('changed_field = ?');
        values.push(filters.eventType);
      }

      if (filters?.bookId) {
        conditions.push('book_id = ?');
        values.push(filters.bookId);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY timestamp DESC LIMIT ?';
      values.push(limit);

      const rows = db.prepare(query).all(...values) as Array<Omit<AuditLog, 'id'> & { id: number }>;
      return rows.map(row => ({ ...row, id: String(row.id) }));
    }

    let query = sql`SELECT * FROM audit_logs`;

    if (filters?.eventType && filters.eventType !== 'all' && filters?.bookId) {
      query = sql`SELECT * FROM audit_logs WHERE changed_field = ${filters.eventType} AND book_id = ${filters.bookId} ORDER BY timestamp DESC LIMIT ${limit}`;
    } else if (filters?.eventType && filters.eventType !== 'all') {
      query = sql`SELECT * FROM audit_logs WHERE changed_field = ${filters.eventType} ORDER BY timestamp DESC LIMIT ${limit}`;
    } else if (filters?.bookId) {
      query = sql`SELECT * FROM audit_logs WHERE book_id = ${filters.bookId} ORDER BY timestamp DESC LIMIT ${limit}`;
    } else {
      query = sql`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ${limit}`;
    }

    const { rows } = await query;
    return rows as AuditLog[];
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
}

/**
 * Check if a book has never been used
 * A book is "never used" if:
 * 1. times_read = 0 (never read) AND
 * 2. current_possessor = owner (currently not checked out)
 */
export async function isBookNeverUsed(bookId: string): Promise<boolean> {
  try {
    const book = await getBookById(bookId);
    if (!book) {
      return false;
    }

    // Check if never read AND currently with owner (not checked out)
    return book.times_read === 0 && book.current_possessor === book.owner;
  } catch (error) {
    console.error('Error checking if book is never used:', error);
    throw error;
  }
}