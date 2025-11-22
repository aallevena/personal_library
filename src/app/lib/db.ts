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
  container_id: string;
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

export interface Container {
  id: string;
  name: string;
  owner: string;
  tags?: string;
  location?: string;
  parent_container_id?: string;
  shareable_code: string;
  is_household: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContainerAuditLog {
  id: string;
  book_id: string;
  from_container_id: string;
  to_container_id: string;
  moved_at: string;
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
          container_id TEXT,
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

      db.exec(`
        CREATE TABLE IF NOT EXISTS containers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          owner TEXT NOT NULL,
          tags TEXT,
          location TEXT,
          parent_container_id TEXT,
          shareable_code TEXT NOT NULL UNIQUE,
          is_household INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS container_audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id TEXT NOT NULL,
          from_container_id TEXT NOT NULL,
          to_container_id TEXT NOT NULL,
          moved_at TEXT DEFAULT (datetime('now'))
        )
      `);

      // Create Household container if it doesn't exist
      const household = db.prepare('SELECT * FROM containers WHERE is_household = 1').get();
      if (!household) {
        db.prepare(`
          INSERT INTO containers (name, owner, shareable_code, is_household)
          VALUES (?, ?, ?, 1)
        `).run('Household', 'Alleven Family', 'household');

        // Get the household container ID
        const householdContainer = db.prepare('SELECT id FROM containers WHERE is_household = 1').get() as { id: number };
        const householdId = String(householdContainer.id);

        // Migrate all books without a container_id to the Household container
        const migrationResult = db.prepare('UPDATE books SET container_id = ? WHERE container_id IS NULL').run(householdId);

        console.log(`Household container created and ${migrationResult.changes} books migrated`);
      }
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
          container_id TEXT,
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

      await sql`
        CREATE TABLE IF NOT EXISTS containers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          owner TEXT NOT NULL,
          tags TEXT,
          location TEXT,
          parent_container_id TEXT,
          shareable_code TEXT NOT NULL UNIQUE,
          is_household BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS container_audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          book_id TEXT NOT NULL,
          from_container_id TEXT NOT NULL,
          to_container_id TEXT NOT NULL,
          moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create Household container if it doesn't exist
      const { rows: existingHousehold } = await sql`SELECT * FROM containers WHERE is_household = true`;
      if (existingHousehold.length === 0) {
        const { rows: newHousehold } = await sql<Container>`
          INSERT INTO containers (name, owner, shareable_code, is_household)
          VALUES ('Household', 'Alleven Family', 'household', true)
          RETURNING *
        `;

        const householdId = newHousehold[0].id;

        // Migrate all books without a container_id to the Household container
        const { rowCount } = await sql`UPDATE books SET container_id = ${householdId} WHERE container_id IS NULL`;

        console.log(`Household container created and ${rowCount || 0} books migrated`);
      }
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
        INSERT INTO books (title, author, publish_date, summary, state, owner, current_possessor, times_read, last_read, date_added, isbn, tags, container_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        book.title, book.author, book.publish_date, book.summary,
        book.state, book.owner, book.current_possessor, book.times_read,
        book.last_read, book.date_added, book.isbn, book.tags, book.container_id
      );
      const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid) as Omit<Book, 'id'> & { id: number };
      return { ...newBook, id: String(newBook.id) };
    }
    const { rows } = await sql<Book>`
      INSERT INTO books (
        title, author, publish_date, summary, state, owner,
        current_possessor, times_read, last_read, date_added, isbn, tags, container_id
      ) VALUES (
        ${book.title}, ${book.author}, ${book.publish_date}, ${book.summary},
        ${book.state}, ${book.owner}, ${book.current_possessor}, ${book.times_read},
        ${book.last_read}, ${book.date_added}, ${book.isbn}, ${book.tags}, ${book.container_id}
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
        container_id = ${updatedData.container_id},
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

// ============================================================================
// CONTAINER FUNCTIONS
// ============================================================================

/**
 * Generate a fun shareable code like "small-horse" or "happy-mountain"
 */
export function generateShareableCode(): string {
  const adjectives = [
    'happy', 'sunny', 'bright', 'cheerful', 'brave', 'clever', 'gentle',
    'swift', 'calm', 'bold', 'wise', 'kind', 'proud', 'merry', 'cool',
    'warm', 'small', 'tall', 'quick', 'slow', 'fuzzy', 'sleek', 'shiny'
  ];

  const nouns = [
    'horse', 'bird', 'tree', 'mountain', 'river', 'ocean', 'forest', 'meadow',
    'star', 'moon', 'cloud', 'flower', 'garden', 'stone', 'butterfly', 'rabbit',
    'fox', 'deer', 'bear', 'wolf', 'eagle', 'hawk', 'owl', 'swan'
  ];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${adjective}-${noun}`;
}

/**
 * Create a new container
 */
export async function createContainer(
  containerData: Omit<Container, 'id' | 'created_at' | 'updated_at' | 'shareable_code' | 'is_household'>
): Promise<Container> {
  try {
    const shareable_code = generateShareableCode();
    const is_household = false;

    if (USE_SQLITE && db) {
      const stmt = db.prepare(`
        INSERT INTO containers (name, owner, tags, location, parent_container_id, shareable_code, is_household)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        containerData.name,
        containerData.owner,
        containerData.tags || null,
        containerData.location || null,
        containerData.parent_container_id || null,
        shareable_code,
        is_household ? 1 : 0
      );
      const newContainer = db.prepare('SELECT * FROM containers WHERE id = ?').get(result.lastInsertRowid) as Omit<Container, 'id' | 'is_household'> & { id: number; is_household: number };
      return { ...newContainer, id: String(newContainer.id), is_household: Boolean(newContainer.is_household) };
    }

    const { rows } = await sql<Container>`
      INSERT INTO containers (name, owner, tags, location, parent_container_id, shareable_code, is_household)
      VALUES (
        ${containerData.name},
        ${containerData.owner},
        ${containerData.tags || null},
        ${containerData.location || null},
        ${containerData.parent_container_id || null},
        ${shareable_code},
        ${is_household}
      )
      RETURNING *
    `;
    return rows[0];
  } catch (error) {
    console.error('Error creating container:', error);
    throw error;
  }
}

/**
 * Get all containers
 */
export async function getAllContainers(): Promise<Container[]> {
  try {
    if (USE_SQLITE && db) {
      const rows = db.prepare('SELECT * FROM containers ORDER BY created_at DESC').all() as Array<Omit<Container, 'id' | 'is_household'> & { id: number; is_household: number }>;
      return rows.map(row => ({ ...row, id: String(row.id), is_household: Boolean(row.is_household) }));
    }
    const { rows } = await sql<Container>`SELECT * FROM containers ORDER BY created_at DESC`;
    return rows;
  } catch (error) {
    console.error('Error fetching containers:', error);
    throw error;
  }
}

/**
 * Get container by ID
 */
export async function getContainerById(id: string): Promise<Container | null> {
  try {
    if (USE_SQLITE && db) {
      const row = db.prepare('SELECT * FROM containers WHERE id = ?').get(id) as (Omit<Container, 'id' | 'is_household'> & { id: number; is_household: number }) | undefined;
      return row ? { ...row, id: String(row.id), is_household: Boolean(row.is_household) } : null;
    }
    const { rows } = await sql<Container>`SELECT * FROM containers WHERE id = ${id}`;
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching container by ID:', error);
    throw error;
  }
}

/**
 * Get container by shareable code
 */
export async function getContainerByCode(code: string): Promise<Container | null> {
  try {
    if (USE_SQLITE && db) {
      const row = db.prepare('SELECT * FROM containers WHERE shareable_code = ?').get(code) as (Omit<Container, 'id' | 'is_household'> & { id: number; is_household: number }) | undefined;
      return row ? { ...row, id: String(row.id), is_household: Boolean(row.is_household) } : null;
    }
    const { rows } = await sql<Container>`SELECT * FROM containers WHERE shareable_code = ${code}`;
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching container by code:', error);
    throw error;
  }
}

/**
 * Update a container
 */
export async function updateContainer(
  id: string,
  updates: Partial<Omit<Container, 'id' | 'created_at' | 'updated_at' | 'shareable_code' | 'is_household'>>
): Promise<Container> {
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

      const query = `UPDATE containers SET ${setParts.join(', ')} WHERE id = ?`;
      db.prepare(query).run(...values);
      const updated = db.prepare('SELECT * FROM containers WHERE id = ?').get(id) as Omit<Container, 'id' | 'is_household'> & { id: number; is_household: number };
      return { ...updated, id: String(updated.id), is_household: Boolean(updated.is_household) };
    }

    const currentContainer = await getContainerById(id);
    if (!currentContainer) {
      throw new Error('Container not found');
    }

    const updatedData = {
      ...currentContainer,
      ...updates
    };

    const { rows } = await sql<Container>`
      UPDATE containers
      SET
        name = ${updatedData.name},
        owner = ${updatedData.owner},
        tags = ${updatedData.tags || null},
        location = ${updatedData.location || null},
        parent_container_id = ${updatedData.parent_container_id || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0];
  } catch (error) {
    console.error('Error updating container:', error);
    throw error;
  }
}

/**
 * Delete a container (only if it's not the household and has no contents)
 */
export async function deleteContainer(id: string): Promise<boolean> {
  try {
    // Check if container is household
    const container = await getContainerById(id);
    if (!container) {
      throw new Error('Container not found');
    }
    if (container.is_household) {
      throw new Error('Cannot delete household container');
    }

    // Check for books in container
    const books = await getBooksByContainer(id);
    if (books.length > 0) {
      throw new Error('Cannot delete container with books. Move books first.');
    }

    // Check for child containers
    const children = await getContainerChildren(id);
    if (children.length > 0) {
      throw new Error('Cannot delete container with child containers. Move or delete children first.');
    }

    if (USE_SQLITE && db) {
      const result = db.prepare('DELETE FROM containers WHERE id = ?').run(id);
      return result.changes > 0;
    }
    const { rowCount } = await sql`DELETE FROM containers WHERE id = ${id}`;
    return (rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error deleting container:', error);
    throw error;
  }
}

/**
 * Get books in a specific container
 */
export async function getBooksByContainer(containerId: string): Promise<Book[]> {
  try {
    if (USE_SQLITE && db) {
      const rows = db.prepare('SELECT * FROM books WHERE container_id = ? ORDER BY created_at DESC').all(containerId) as Array<Omit<Book, 'id'> & { id: number }>;
      return rows.map(row => ({ ...row, id: String(row.id) }));
    }
    const { rows } = await sql<Book>`
      SELECT * FROM books
      WHERE container_id = ${containerId}
      ORDER BY created_at DESC
    `;
    return rows;
  } catch (error) {
    console.error('Error fetching books by container:', error);
    throw error;
  }
}

/**
 * Get child containers of a parent container
 */
export async function getContainerChildren(parentId: string): Promise<Container[]> {
  try {
    if (USE_SQLITE && db) {
      const rows = db.prepare('SELECT * FROM containers WHERE parent_container_id = ? ORDER BY created_at DESC').all(parentId) as Array<Omit<Container, 'id' | 'is_household'> & { id: number; is_household: number }>;
      return rows.map(row => ({ ...row, id: String(row.id), is_household: Boolean(row.is_household) }));
    }
    const { rows } = await sql<Container>`
      SELECT * FROM containers
      WHERE parent_container_id = ${parentId}
      ORDER BY created_at DESC
    `;
    return rows;
  } catch (error) {
    console.error('Error fetching container children:', error);
    throw error;
  }
}

/**
 * Get all books in a container recursively (includes books in nested containers)
 */
export async function getAllContainerContentsRecursive(containerId: string): Promise<{
  books: Book[];
  containers: Container[];
}> {
  try {
    const books: Book[] = [];
    const containers: Container[] = [];

    async function collectContents(id: string) {
      // Get direct books
      const directBooks = await getBooksByContainer(id);
      books.push(...directBooks);

      // Get child containers
      const children = await getContainerChildren(id);
      containers.push(...children);

      // Recursively get contents of child containers
      for (const child of children) {
        await collectContents(child.id);
      }
    }

    await collectContents(containerId);

    return { books, containers };
  } catch (error) {
    console.error('Error fetching container contents recursively:', error);
    throw error;
  }
}

/**
 * Move a book to a different container
 */
export async function moveBookToContainer(bookId: string, toContainerId: string): Promise<Book> {
  try {
    const book = await getBookById(bookId);
    if (!book) {
      throw new Error('Book not found');
    }

    const toContainer = await getContainerById(toContainerId);
    if (!toContainer) {
      throw new Error('Destination container not found');
    }

    const fromContainerId = (book as any).container_id;

    // Update the book's container
    if (USE_SQLITE && db) {
      db.prepare('UPDATE books SET container_id = ?, updated_at = datetime(\'now\') WHERE id = ?').run(toContainerId, bookId);

      // Create audit log
      if (fromContainerId) {
        db.prepare(`
          INSERT INTO container_audit_logs (book_id, from_container_id, to_container_id)
          VALUES (?, ?, ?)
        `).run(bookId, fromContainerId, toContainerId);
      }

      const updated = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId) as Omit<Book, 'id'> & { id: number };
      return { ...updated, id: String(updated.id) };
    }

    const { rows } = await sql<Book>`
      UPDATE books
      SET container_id = ${toContainerId}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${bookId}
      RETURNING *
    `;

    // Create audit log
    if (fromContainerId) {
      await sql`
        INSERT INTO container_audit_logs (book_id, from_container_id, to_container_id)
        VALUES (${bookId}, ${fromContainerId}, ${toContainerId})
      `;
    }

    return rows[0];
  } catch (error) {
    console.error('Error moving book to container:', error);
    throw error;
  }
}

/**
 * Get the household container
 */
export async function getHouseholdContainer(): Promise<Container | null> {
  try {
    if (USE_SQLITE && db) {
      const row = db.prepare('SELECT * FROM containers WHERE is_household = 1').get() as (Omit<Container, 'id' | 'is_household'> & { id: number; is_household: number }) | undefined;
      return row ? { ...row, id: String(row.id), is_household: Boolean(row.is_household) } : null;
    }
    const { rows } = await sql<Container>`SELECT * FROM containers WHERE is_household = true`;
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching household container:', error);
    throw error;
  }
}

/**
 * Validate container move to prevent circular references
 */
export async function validateContainerMove(containerId: string, newParentId: string | null): Promise<boolean> {
  if (!newParentId) {
    return true; // Moving to top level is always valid
  }

  // Check if we're trying to make a container its own parent
  if (containerId === newParentId) {
    return false;
  }

  // Check if the new parent is a descendant of this container
  async function isDescendant(potentialDescendantId: string, ancestorId: string): Promise<boolean> {
    const container = await getContainerById(potentialDescendantId);
    if (!container) return false;
    if (!container.parent_container_id) return false;
    if (container.parent_container_id === ancestorId) return true;
    return isDescendant(container.parent_container_id, ancestorId);
  }

  const wouldCreateCycle = await isDescendant(newParentId, containerId);
  return !wouldCreateCycle;
}