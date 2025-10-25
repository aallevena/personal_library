'use client';

import { useState, useEffect } from 'react';
import { Book } from '../app/lib/db';

interface AnalyticsStats {
  totalBooks: number;
  totalUsers: number;
  booksInLibrary: number;
  booksCheckedOut: number;
  booksLost: number;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
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

      const books = booksData.books;
      const users = usersData.users;

      // Calculate stats
      const analyticsStats: AnalyticsStats = {
        totalBooks: books.length,
        totalUsers: users.length,
        booksInLibrary: books.filter((b: Book) => b.state === 'In library').length,
        booksCheckedOut: books.filter((b: Book) => b.state === 'Checked out').length,
        booksLost: books.filter((b: Book) => b.state === 'Lost').length,
      };

      setStats(analyticsStats);
    } catch (err) {
      setError('Failed to load analytics');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Total Books */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Books</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalBooks}</div>
        </div>

        {/* Total Users */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Users</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalUsers}</div>
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
