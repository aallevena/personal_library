import { NextResponse } from 'next/server';
import { isBookNeverUsed } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/books/never-used
 * Check which books are "never used" from a list of book IDs
 * Body: { bookIds: string[] }
 * Returns: { success: true, neverUsedIds: string[] }
 */
export async function POST(request: Request) {
  try {
    const { bookIds } = await request.json();

    if (!Array.isArray(bookIds)) {
      return NextResponse.json(
        { success: false, error: 'bookIds must be an array' },
        { status: 400 }
      );
    }

    // Check each book
    const results = await Promise.all(
      bookIds.map(async (id) => ({
        id,
        neverUsed: await isBookNeverUsed(id)
      }))
    );

    // Filter to only never-used book IDs
    const neverUsedIds = results
      .filter(result => result.neverUsed)
      .map(result => result.id);

    return NextResponse.json({
      success: true,
      neverUsedIds
    });
  } catch (error) {
    console.error('Error checking never-used books:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check never-used books' },
      { status: 500 }
    );
  }
}
