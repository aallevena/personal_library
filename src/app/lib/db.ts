import { sql } from '@vercel/postgres';

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

export async function initializeDatabase() {
  try {
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
    
    console.log('Database initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Database initialization error:', error);
    return { success: false, error };
  }
}

export async function getAllBooks(): Promise<Book[]> {
  try {
    const { rows } = await sql<Book>`SELECT * FROM books ORDER BY created_at DESC`;
    return rows;
  } catch (error) {
    console.error('Error fetching books:', error);
    throw error;
  }
}

export async function getBookById(id: string): Promise<Book | null> {
  try {
    const { rows } = await sql<Book>`SELECT * FROM books WHERE id = ${id}`;
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching book by ID:', error);
    throw error;
  }
}

export async function createBook(book: Omit<Book, 'id' | 'created_at' | 'updated_at'>): Promise<Book> {
  try {
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
    const { rowCount } = await sql`DELETE FROM books WHERE id = ${id}`;
    return (rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error deleting book:', error);
    throw error;
  }
}

export async function getBooksByState(state: Book['state']): Promise<Book[]> {
  try {
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