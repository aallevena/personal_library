import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// GET /api/cleanup-duplicates - Find and remove duplicate books (keeps oldest)
export async function GET() {
  try {
    // Find duplicates
    const duplicates = await sql`
      SELECT isbn, owner, COUNT(*) as count
      FROM books
      WHERE isbn IS NOT NULL AND isbn != ''
      GROUP BY isbn, owner
      HAVING COUNT(*) > 1
    `;

    if (duplicates.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No duplicates found',
        duplicates: []
      });
    }

    // For each duplicate group, keep the oldest and delete the rest
    let deletedCount = 0;
    const duplicateGroups = [];

    for (const dup of duplicates.rows) {
      const { isbn, owner, count } = dup;

      // Get all books with this ISBN + Owner combination
      const books = await sql`
        SELECT id, title, created_at
        FROM books
        WHERE isbn = ${isbn} AND owner = ${owner}
        ORDER BY created_at ASC
      `;

      // Keep the first (oldest), delete the rest
      const toKeep = books.rows[0];
      const toDelete = books.rows.slice(1);

      for (const book of toDelete) {
        await sql`DELETE FROM books WHERE id = ${book.id}`;
        deletedCount++;
      }

      duplicateGroups.push({
        isbn,
        owner,
        count: Number(count),
        kept: toKeep.id,
        deleted: toDelete.map(b => b.id)
      });
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} duplicate books`,
      duplicatesFound: duplicates.rows.length,
      duplicatesRemoved: deletedCount,
      details: duplicateGroups
    });

  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup duplicates'
      },
      { status: 500 }
    );
  }
}
