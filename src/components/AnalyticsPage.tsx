'use client';

import { useState, useEffect } from 'react';
import { Book, User, AuditLog } from '../app/lib/db';
import NeverUsedChart from './NeverUsedChart';

interface AnalyticsStats {
  totalBooks: number;
  booksInLibrary: number;
  booksCheckedOut: number;
  booksLost: number;
}

interface NeverUsedData {
  count: number;
  total: number;
  percentage: number;
}

interface WeeklyDataPoint {
  weekLabel: string;
  weekEndDate: string;
  neverUsedCount: number;
  totalBooks: number;
  percentage: number;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('all');

  // Never used stats
  const [neverUsedData, setNeverUsedData] = useState<NeverUsedData | null>(null);
  const [neverUsedWeeklyData, setNeverUsedWeeklyData] = useState<WeeklyDataPoint[]>([]);
  const [neverUsedLoading, setNeverUsedLoading] = useState(false);

  // Audit log states
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [bookIdFilter, setBookIdFilter] = useState<string>('');

  useEffect(() => {
    fetchData();
    fetchAuditLogs();
    fetchNeverUsedData();
  }, []);

  useEffect(() => {
    if (books.length > 0 || users.length > 0) {
      calculateStats();
    }
  }, [selectedUser, books, users]);

  useEffect(() => {
    fetchNeverUsedData();
  }, [selectedUser]);

  useEffect(() => {
    fetchAuditLogs();
  }, [eventTypeFilter, bookIdFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch books and users in parallel
      const [booksRes, usersRes] = await Promise.all([
        fetch('/api/books'),
        fetch('/api/users')
      ]);

      const booksData = await booksRes.json();
      const usersData = await usersRes.json();

      if (!booksData.success || !usersData.success) {
        throw new Error('Failed to fetch data');
      }

      setBooks(booksData.books);
      setUsers(usersData.users);
    } catch (err) {
      setError('Failed to load analytics');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    // Filter books by selected user if not "all"
    const filteredBooks = selectedUser === 'all'
      ? books
      : books.filter((b: Book) => b.owner === selectedUser);

    // Calculate stats
    const analyticsStats: AnalyticsStats = {
      totalBooks: filteredBooks.length,
      booksInLibrary: filteredBooks.filter((b: Book) => b.state === 'In library').length,
      booksCheckedOut: filteredBooks.filter((b: Book) => b.state === 'Checked out').length,
      booksLost: filteredBooks.filter((b: Book) => b.state === 'Lost').length,
    };

    setStats(analyticsStats);
  };

  const fetchNeverUsedData = async () => {
    try {
      setNeverUsedLoading(true);
      const params = new URLSearchParams();

      if (selectedUser !== 'all') {
        params.append('user', selectedUser);
      }

      const response = await fetch(`/api/analytics/never-used?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setNeverUsedData(data.current);
        setNeverUsedWeeklyData(data.weekly || []);
      }
    } catch (err) {
      console.error('Error fetching never-used data:', err);
    } finally {
      setNeverUsedLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const params = new URLSearchParams();

      if (eventTypeFilter !== 'all') {
        params.append('eventType', eventTypeFilter);
      }

      if (bookIdFilter) {
        params.append('bookId', bookIdFilter);
      }

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getEventTypeBadgeColor = (eventType: string) => {
    switch (eventType) {
      case 'state':
        return 'bg-blue-100 text-blue-800';
      case 'owner':
        return 'bg-green-100 text-green-800';
      case 'current_possessor':
        return 'bg-purple-100 text-purple-800';
      case 'times_read':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case 'state':
        return 'Status';
      case 'owner':
        return 'Owner';
      case 'current_possessor':
        return 'Possessor';
      case 'times_read':
        return 'Read Count';
      default:
        return eventType;
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Analytics</h1>

      {/* User Filter */}
      <div className="mb-6">
        <label htmlFor="user-filter" className="block text-sm font-medium text-gray-700 mb-2">
          Filter by User
        </label>
        <select
          id="user-filter"
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="w-full md:w-64 border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
        >
          <option value="all">All Users</option>
          {users.map((user) => (
            <option key={user.id} value={user.name}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Total Books */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">
            {selectedUser === 'all' ? 'Total Books' : `Books Owned by ${selectedUser}`}
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalBooks}</div>
        </div>

        {/* Books In Library */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">In Library</div>
          <div className="text-3xl font-bold text-green-600">{stats.booksInLibrary}</div>
        </div>

        {/* Books Checked Out */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Checked Out</div>
          <div className="text-3xl font-bold text-blue-600">{stats.booksCheckedOut}</div>
        </div>

        {/* Books Lost */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Lost</div>
          <div className="text-3xl font-bold text-red-600">{stats.booksLost}</div>
        </div>

        {/* Never Used Books */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Never Used</div>
          {neverUsedLoading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : neverUsedData ? (
            <>
              <div className="text-3xl font-bold text-orange-600">
                {neverUsedData.count}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {neverUsedData.percentage}% of total
              </div>
            </>
          ) : (
            <div className="text-3xl font-bold text-gray-400">-</div>
          )}
        </div>
      </div>

      {/* Never Used Books Chart */}
      <NeverUsedChart data={neverUsedWeeklyData} loading={neverUsedLoading} />

      {/* Audit Log Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Activity Log</h2>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label htmlFor="event-type-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Event Type
            </label>
            <select
              id="event-type-filter"
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            >
              <option value="all">All Events</option>
              <option value="state">Status Changes</option>
              <option value="owner">Owner Changes</option>
              <option value="current_possessor">Possessor Changes</option>
              <option value="times_read">Read Count Changes</option>
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="book-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Book
            </label>
            <select
              id="book-filter"
              value={bookIdFilter}
              onChange={(e) => setBookIdFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            >
              <option value="">All Books</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Audit Logs Table */}
        {auditLoading ? (
          <div className="text-center py-8 text-gray-600">Loading activity log...</div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No activity recorded yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 font-semibold text-gray-700 text-sm">Time</th>
                  <th className="text-left p-3 font-semibold text-gray-700 text-sm">Book</th>
                  <th className="text-left p-3 font-semibold text-gray-700 text-sm">Event</th>
                  <th className="text-left p-3 font-semibold text-gray-700 text-sm">Change</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="p-3 text-sm text-gray-900">
                      {log.book_title || 'Unknown Book'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEventTypeBadgeColor(log.changed_field)}`}>
                        {getEventTypeLabel(log.changed_field)}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-900">
                      <span className="text-gray-500">{log.old_value}</span>
                      {' → '}
                      <span className="font-medium">{log.new_value}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {auditLogs.length === 50 && (
              <p className="text-sm text-gray-500 mt-4 text-center">
                Showing last 50 events. Use filters to narrow down results.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Coming Soon Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Coming Soon</h2>
        <div className="space-y-3 text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <span>Reading statistics and trends</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📈</span>
            <span>Book utilization rate charts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <span>Most read books</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">👥</span>
            <span>User activity metrics</span>
          </div>
        </div>
      </div>
    </div>
  );
}
