import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs } from '../../lib/db';

// GET /api/audit-logs - Get audit logs with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('eventType') || undefined;
    const bookId = searchParams.get('bookId') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const logs = await getAuditLogs({
      eventType,
      bookId,
      limit
    });

    return NextResponse.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
