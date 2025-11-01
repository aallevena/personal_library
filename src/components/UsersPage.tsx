'use client';

import { useState, useEffect } from 'react';
import { User, Book } from '../app/lib/db';
import AddUserForm from './AddUserForm';
import TagBadge from './TagBadge';
import { parseTags, extractUniqueTags } from '../app/lib/tagUtils';

interface UserWithStats extends User {
  booksOwned: number;
  booksPossessed: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [reassignUserId, setReassignUserId] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [tagSearch, setTagSearch] = useState<string>('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch users and books in parallel
      const [usersRes, booksRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/books')
      ]);

      const usersData = await usersRes.json();
      const booksData = await booksRes.json();

      if (!usersData.success || !booksData.success) {
        throw new Error('Failed to fetch data');
      }

      // Calculate book counts for each user
      const usersWithStats: UserWithStats[] = usersData.users.map((user: User) => {
        const booksOwned = booksData.books.filter((book: Book) => book.owner === user.name).length;
        const booksPossessed = booksData.books.filter((book: Book) => book.current_possessor === user.name).length;
        return { ...user, booksOwned, booksPossessed };
      });

      setUsers(usersWithStats);
    } catch (err) {
      setError('Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = (user: User) => {
    setUsers(prev => [{ ...user, booksOwned: 0, booksPossessed: 0 }, ...prev]);
    setShowAddUserForm(false);
  };

  const handleEditClick = (user: UserWithStats) => {
    setEditingUserId(user.id);
    setEditingName(user.name);
  };

  const handleEditCancel = () => {
    setEditingUserId(null);
    setEditingName('');
  };

  const handleEditSave = async (userId: string) => {
    if (!editingName.trim()) {
      alert('Name cannot be empty');
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, name: data.user.name } : u
        ));
        setEditingUserId(null);
        setEditingName('');
      } else {
        alert(data.error || 'Failed to update user');
      }
    } catch (err) {
      alert('Failed to update user');
      console.error('Error updating user:', err);
    }
  };

  const handleDeleteClick = (userId: string) => {
    setDeletingUserId(userId);
    setReassignUserId('');
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUserId) return;

    const user = users.find(u => u.id === deletingUserId);
    if (!user) return;

    const hasBooks = user.booksOwned > 0 || user.booksPossessed > 0;

    if (hasBooks && !reassignUserId) {
      alert('Please select a user to reassign books to');
      return;
    }

    try {
      const url = hasBooks
        ? `/api/users/${deletingUserId}?reassignTo=${reassignUserId}`
        : `/api/users/${deletingUserId}`;

      const response = await fetch(url, { method: 'DELETE' });
      const data = await response.json();

      if (response.ok && data.success) {
        setUsers(prev => prev.filter(u => u.id !== deletingUserId));
        setDeletingUserId(null);
        setReassignUserId('');
        // Refresh to update book counts
        fetchUsers();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      alert('Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <p className="text-gray-600">Loading users...</p>
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

  const deletingUser = users.find(u => u.id === deletingUserId);
  const availableUsersForReassign = users.filter(u => u.id !== deletingUserId);

  // Get all unique tags from users
  const allUserTags = extractUniqueTags(users);

  // Filter users by tag
  const filteredUsers = users.filter(user => {
    // Tag dropdown filter
    if (tagFilter !== 'all') {
      const userTags = parseTags(user.tags || '');
      if (!userTags.includes(tagFilter)) {
        return false;
      }
    }

    // Tag search filter
    if (tagSearch.trim()) {
      const userTags = parseTags(user.tags || '');
      const searchLower = tagSearch.toLowerCase();
      const hasMatchingTag = userTags.some(tag =>
        tag.toLowerCase().includes(searchLower)
      );
      if (!hasMatchingTag) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button
          onClick={() => setShowAddUserForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 min-h-[44px]"
        >
          Add User
        </button>
      </div>

      {/* Tag Filters */}
      {allUserTags.length > 0 && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tag Dropdown Filter */}
            <div>
              <label htmlFor="tagFilter" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Tag
              </label>
              <select
                id="tagFilter"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 min-h-[44px]"
              >
                <option value="all">All Tags</option>
                {allUserTags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            {/* Tag Search */}
            <div>
              <label htmlFor="tagSearch" className="block text-sm font-medium text-gray-700 mb-2">
                Search Tags
              </label>
              <input
                type="text"
                id="tagSearch"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Search by tag..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 min-h-[44px]"
              />
            </div>
          </div>

          {/* Active Filters Display */}
          {(tagFilter !== 'all' || tagSearch.trim()) && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {tagFilter !== 'all' && (
                <button
                  onClick={() => setTagFilter('all')}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
                >
                  {tagFilter} ×
                </button>
              )}
              {tagSearch.trim() && (
                <button
                  onClick={() => setTagSearch('')}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
                >
                  Search: &quot;{tagSearch}&quot; ×
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Users Table */}
      {filteredUsers.length === 0 && users.length > 0 ? (
        <div className="text-center py-12 text-gray-500">
          No users match the selected filters.
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No users yet. Add your first user to get started!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-lg shadow">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left p-4 font-semibold text-gray-700">Name</th>
                <th className="text-left p-4 font-semibold text-gray-700">Tags</th>
                <th className="text-left p-4 font-semibold text-gray-700">Books Owned</th>
                <th className="text-left p-4 font-semibold text-gray-700">Books Possessed</th>
                <th className="text-left p-4 font-semibold text-gray-700">Created</th>
                <th className="text-right p-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    {editingUserId === user.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-gray-900 flex-1 min-h-[44px]"
                          autoFocus
                        />
                        <button
                          onClick={() => handleEditSave(user.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 min-h-[44px]"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 min-h-[44px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer hover:text-blue-600 flex items-center gap-2"
                        onClick={() => handleEditClick(user)}
                      >
                        <span className="font-medium text-gray-900">{user.name}</span>
                        <span className="text-gray-400 text-sm">✎</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {user.tags && parseTags(user.tags).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {parseTags(user.tags).map((tag, index) => (
                          <TagBadge key={`${tag}-${index}`} tag={tag} />
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">No tags</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-900">{user.booksOwned}</td>
                  <td className="p-4 text-gray-900">{user.booksPossessed}</td>
                  <td className="p-4 text-gray-600 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDeleteClick(user.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 min-h-[44px]"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserForm && (
        <AddUserForm
          onSuccess={handleAddUser}
          onCancel={() => setShowAddUserForm(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingUserId && deletingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Delete User</h2>
            <p className="mb-4 text-gray-700">
              Are you sure you want to delete <strong>{deletingUser.name}</strong>?
            </p>

            {(deletingUser.booksOwned > 0 || deletingUser.booksPossessed > 0) && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  This user has {deletingUser.booksOwned} book(s) owned and {deletingUser.booksPossessed} book(s) possessed.
                  Please select a user to reassign these books to:
                </p>
                <select
                  value={reassignUserId}
                  onChange={(e) => setReassignUserId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 min-h-[44px]"
                >
                  <option value="">Select a user...</option>
                  {availableUsersForReassign.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setDeletingUserId(null);
                  setReassignUserId('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 min-h-[44px]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
