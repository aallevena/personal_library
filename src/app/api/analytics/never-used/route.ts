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

interface BookForSnapshot {
  id: string;
  date_added: string;
  times_read: number;
  owner: string;
  current_possessor: string;
}

/**
 * Generate weekly snapshots showing % of books that were "never used" at each point in time
 * This reconstructs historical state by analyzing when books were added and audit log history
 */
async function generateWeeklySnapshots(books: BookForSnapshot[], weeks: number): Promise<WeeklySnapshot[]> {
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
 * A book is "never used" if times_read = 0 AND current_possessor = owner
 */
async function wasBookNeverUsedAtTime(book: BookForSnapshot, snapshotDate: Date): Promise<boolean> {
  // Import here to avoid circular dependency
  const { getAuditLogs } = await import('@/app/lib/db');

  // Get all audit logs for this book
  const allLogs = await getAuditLogs({ bookId: book.id, limit: 1000 });

  // Separate logs into before and after snapshot
  const logsAfterSnapshot = allLogs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate > snapshotDate;
  });

  // Reconstruct times_read at snapshot date
  // Start with current value and work backwards through logs after snapshot
  let timesReadAtSnapshot = book.times_read;
  const timesReadLogsAfter = logsAfterSnapshot.filter(log => log.changed_field === 'times_read');
  for (const log of timesReadLogsAfter.reverse()) {
    // This log happened after snapshot, so use old_value
    timesReadAtSnapshot = parseInt(log.old_value);
    break; // We only need the first one (closest to snapshot)
  }

  // If book was read at snapshot time, it was "used"
  if (timesReadAtSnapshot > 0) {
    return false;
  }

  // Reconstruct current_possessor at snapshot date
  let possessorAtSnapshot = book.current_possessor;
  const possessorLogsAfter = logsAfterSnapshot.filter(log => log.changed_field === 'current_possessor');
  for (const log of possessorLogsAfter.reverse()) {
    possessorAtSnapshot = log.old_value;
    break;
  }

  // Reconstruct owner at snapshot date
  let ownerAtSnapshot = book.owner;
  const ownerLogsAfter = logsAfterSnapshot.filter(log => log.changed_field === 'owner');
  for (const log of ownerLogsAfter.reverse()) {
    ownerAtSnapshot = log.old_value;
    break;
  }

  // Check if book was with owner (not checked out) at snapshot time
  return possessorAtSnapshot === ownerAtSnapshot;
}

/**
 * Format date as "MMM DD" for chart labels
 */
function formatWeekLabel(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}
