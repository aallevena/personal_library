'use client';

import { useState, useEffect } from 'react';
import { BookFormData } from '../../types/book';
import { User } from '../../types/user';
import TagInput from './TagInput';

interface FastScanModalProps {
  onClose: () => void;
  onStartScan: (defaults: BookFormData) => void;
}

export default function FastScanModal({ onClose, onStartScan }: FastScanModalProps) {
  const [defaults, setDefaults] = useState<BookFormData>({
    title: '',
    author: '',
    publish_date: '',
    summary: '',
    state: 'In library',
    owner: '',
    current_possessor: '',
    times_read: 0,
    last_read: '',
    isbn: '',
    tags: '',
  });

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        if (data.success && data.users) {
          setUsers(data.users);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setDefaults(prev => ({
      ...prev,
      [name]: name === 'times_read' ? parseInt(value) || 0 : value,
    }));
  };

  const handleStartScan = () => {
    // Validate required fields
    if (!defaults.owner || !defaults.current_possessor) {
      alert('Please select both Owner and Current Possessor');
      return;
    }
    onStartScan(defaults);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-full sm:max-w-2xl my-4 sm:my-4 max-h-[calc(100vh-2rem)] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-6 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex justify-between items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex-1 min-w-0 truncate">
              Fast Scan Setup
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              Set default values below. These will be applied to all books scanned during the Fast Scan session.
              You can change these defaults during scanning.
            </p>
          </div>

          {/* Default Fields Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                  State *
                </label>
                <select
                  id="state"
                  name="state"
                  required
                  value={defaults.state}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="In library">In library</option>
                  <option value="Checked out">Checked out</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              <div>
                <label htmlFor="owner" className="block text-sm font-medium text-gray-700">
                  Owner *
                </label>
                <select
                  id="owner"
                  name="owner"
                  required
                  value={defaults.owner}
                  onChange={handleInputChange}
                  disabled={loadingUsers}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">
                    {loadingUsers ? 'Loading users...' : 'Select owner'}
                  </option>
                  {users.map((user) => (
                    <option key={user.id} value={user.name}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="current_possessor" className="block text-sm font-medium text-gray-700">
                  Current Possessor *
                </label>
                <select
                  id="current_possessor"
                  name="current_possessor"
                  required
                  value={defaults.current_possessor}
                  onChange={handleInputChange}
                  disabled={loadingUsers}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">
                    {loadingUsers ? 'Loading users...' : 'Select possessor'}
                  </option>
                  {users.map((user) => (
                    <option key={user.id} value={user.name}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="times_read" className="block text-sm font-medium text-gray-700">
                  Times Read
                </label>
                <input
                  type="number"
                  id="times_read"
                  name="times_read"
                  min="0"
                  value={defaults.times_read}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="last_read" className="block text-sm font-medium text-gray-700">
                  Last Read
                </label>
                <input
                  type="date"
                  id="last_read"
                  name="last_read"
                  value={defaults.last_read}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="summary" className="block text-sm font-medium text-gray-700">
                Summary (Optional)
              </label>
              <textarea
                id="summary"
                name="summary"
                rows={3}
                value={defaults.summary}
                onChange={handleInputChange}
                placeholder="Default summary for all scanned books (will be overridden by API if available)"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Tags */}
            <TagInput
              value={defaults.tags || ''}
              onChange={(value) => setDefaults(prev => ({ ...prev, tags: value }))}
              label="Tags (Optional)"
              id="tags"
            />
          </div>

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium min-h-[44px] touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStartScan}
              disabled={!defaults.owner || !defaults.current_possessor}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium min-h-[44px] touch-manipulation"
            >
              Start Fast Scan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
