import { NextResponse } from 'next/server';
import { getAllBooks, isBookNeverUsed } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

interface WeeklySnapshot {
  weekLabel: string;
  weekEndDate: string;
  neverUsedCount: number;
  totalBooks: number;
  percentage: number;
}

/**
 * GET /api/analytics/never-used
 * Returns current stats and weekly time series for "never used" books
 * Query params:
 * - user: Filter by owner (optional)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userFilter = searchParams.get('user');

    // Get all books
    let books = await getAllBooks();

    // Apply user filter if provided
    if (userFilter && userFilter !== 'all') {
      books = books.filter(book => book.owner === userFilter);
    }

    // Calculate current stats
    const neverUsedFlags = await Promise.all(
      books.map(book => isBookNeverUsed(book.id))
    );

    const currentNeverUsedCount = neverUsedFlags.filter(flag => flag).length;
    const currentTotal = books.length;
    const currentPercentage = currentTotal > 0
      ? Math.round((currentNeverUsedCount / currentTotal) * 100)
      : 0;

    // Generate weekly snapshots for the last 12 weeks
    const weeklyData = await generateWeeklySnapshots(books, 12);

    return NextResponse.json({
      success: true,
      current: {
        count: currentNeverUsedCount,
        total: currentTotal,
        percentage: currentPercentage
      },
      weekly: weeklyData
    });
  } catch (error) {
    console.error('Error fetching never-used analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch never-used analytics' },
      { status: 500 }
    );
  }
}

/**
 * Generate weekly snapshots showing % of books that were "never used" at each point in time
 * This reconstructs historical state by analyzing when books were added and audit log history
 */
async function generateWeeklySnapshots(books: any[], weeks: number): Promise<WeeklySnapshot[]> {
  const snapshots: WeeklySnapshot[] = [];
  const now = new Date();

  // For each week going backwards
  for (let i = 0; i < weeks; i++) {
    const weekEndDate = new Date(now);
    weekEndDate.setDate(now.getDate() - (i * 7));
    weekEndDate.setHours(23, 59, 59, 999);

    // Books that existed at this point in time
    const existingBooks = books.filter(book => {
      const dateAdded = new Date(book.date_added);
      return dateAdded <= weekEndDate;
    });

    // For each existing book, check if it was "never used" at that snapshot time
    const neverUsedPromises = existingBooks.map(book =>
      wasBookNeverUsedAtTime(book, weekEndDate)
    );
    const neverUsedFlags = await Promise.all(neverUsedPromises);
    const neverUsedCount = neverUsedFlags.filter(flag => flag).length;

    const percentage = existingBooks.length > 0
      ? Math.round((neverUsedCount / existingBooks.length) * 100)
      : 0;

    snapshots.unshift({
      weekLabel: formatWeekLabel(weekEndDate),
      weekEndDate: weekEndDate.toISOString(),
      neverUsedCount,
      totalBooks: existingBooks.length,
      percentage
    });
  }

  return snapshots;
}

/**
 * Check if a book was "never used" at a specific point in time
 * Reconstructs state by checking audit log history up to that date
 */
async function wasBookNeverUsedAtTime(book: any, snapshotDate: Date): Promise<boolean> {
  // Import here to avoid circular dependency
  const { getAuditLogs } = await import('@/app/lib/db');

  // Get all audit logs for this book
  const allLogs = await getAuditLogs({ bookId: book.id, limit: 1000 });

  // Filter logs that occurred before the snapshot date
  const logsBeforeSnapshot = allLogs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate <= snapshotDate;
  });

  // Check if times_read was ever incremented before this date
  const timesReadLogs = logsBeforeSnapshot.filter(log => log.changed_field === 'times_read');
  let timesReadAtSnapshot = book.times_read;

  // Work backwards from current state
  for (const log of timesReadLogs) {
    const logDate = new Date(log.timestamp);
    if (logDate > snapshotDate) {
      // This log happened after snapshot, so subtract the change
      timesReadAtSnapshot = parseInt(log.old_value);
    }
  }

  // If the book was created after snapshot or had reads, it was "used"
  if (timesReadAtSnapshot > 0) {
    return false;
  }

  // Check if possessor ever changed before this date
  const possessorChanges = logsBeforeSnapshot.filter(log => log.changed_field === 'current_possessor');

  // If there were any possessor changes before the snapshot, the book was "used"
  return possessorChanges.length === 0;
}

/**
 * Format date as "MMM DD" for chart labels
 */
function formatWeekLabel(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}
