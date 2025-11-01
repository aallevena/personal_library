'use client';

import { useState, useEffect } from 'react';
import { BookFormData } from '../../types/book';
import { User } from '../../types/user';
import TagInput from './TagInput';

type ScanMode = 'add' | 'edit';

interface EditFields {
  state?: boolean;
  owner?: boolean;
  current_possessor?: boolean;
  times_read?: { enabled: boolean; incrementBy: number };
  last_read?: boolean;
  tags?: { enabled: boolean; mode: 'append' | 'replace' };
}

export interface ScanConfig {
  mode: ScanMode;
  defaults: BookFormData;
  editFields?: EditFields;
}

interface FastScanModalProps {
  onClose: () => void;
  onStartScan: (config: ScanConfig) => void;
}

export default function FastScanModal({ onClose, onStartScan }: FastScanModalProps) {
  const [mode, setMode] = useState<ScanMode>('add');
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

  const [editFields, setEditFields] = useState<EditFields>({
    state: false,
    owner: false,
    current_possessor: false,
    times_read: { enabled: false, incrementBy: 1 },
    last_read: false,
    tags: { enabled: false, mode: 'replace' },
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
    // Validate required fields based on mode
    if (mode === 'add') {
      if (!defaults.owner || !defaults.current_possessor) {
        alert('Please select both Owner and Current Possessor');
        return;
      }
    } else {
      // Edit mode: at least one field must be selected
      const hasSelection =
        editFields.state ||
        editFields.owner ||
        editFields.current_possessor ||
        editFields.times_read?.enabled ||
        editFields.last_read ||
        editFields.tags?.enabled;

      if (!hasSelection) {
        alert('Please select at least one field to edit');
        return;
      }
    }

    const config: ScanConfig = {
      mode,
      defaults,
      editFields: mode === 'edit' ? editFields : undefined,
    };

    onStartScan(config);
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

          {/* Mode Toggle */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">Mode</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="add"
                  checked={mode === 'add'}
                  onChange={() => setMode('add')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-900">Add Books</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="edit"
                  checked={mode === 'edit'}
                  onChange={() => setMode('edit')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-900">Edit Books</span>
              </label>
            </div>
          </div>

          {/* Mode Description */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              {mode === 'add'
                ? 'Set default values below. These will be applied to all books scanned during the Fast Scan session. You can change these defaults during scanning.'
                : 'Select which fields to edit and set their values. Scanned books will be collected for review before applying changes.'}
            </p>
          </div>

          {/* Fields Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* State Field */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {mode === 'edit' && (
                    <input
                      type="checkbox"
                      id="edit-state"
                      checked={editFields.state || false}
                      onChange={(e) =>
                        setEditFields((prev) => ({ ...prev, state: e.target.checked }))
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                  )}
                  <label htmlFor="state" className="text-sm font-medium text-gray-700">
                    State {mode === 'add' && '*'}
                  </label>
                </div>
                {(mode === 'add' || editFields.state) && (
                  <select
                    id="state"
                    name="state"
                    required={mode === 'add'}
                    value={defaults.state}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="In library">In library</option>
                    <option value="Checked out">Checked out</option>
                    <option value="Lost">Lost</option>
                  </select>
                )}
              </div>

              {/* Owner Field */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {mode === 'edit' && (
                    <input
                      type="checkbox"
                      id="edit-owner"
                      checked={editFields.owner || false}
                      onChange={(e) =>
                        setEditFields((prev) => ({ ...prev, owner: e.target.checked }))
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                  )}
                  <label htmlFor="owner" className="text-sm font-medium text-gray-700">
                    Owner {mode === 'add' && '*'}
                  </label>
                </div>
                {(mode === 'add' || editFields.owner) && (
                  <select
                    id="owner"
                    name="owner"
                    required={mode === 'add'}
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
                )}
              </div>

              {/* Current Possessor Field */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {mode === 'edit' && (
                    <input
                      type="checkbox"
                      id="edit-current-possessor"
                      checked={editFields.current_possessor || false}
                      onChange={(e) =>
                        setEditFields((prev) => ({ ...prev, current_possessor: e.target.checked }))
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                  )}
                  <label htmlFor="current_possessor" className="text-sm font-medium text-gray-700">
                    Current Possessor {mode === 'add' && '*'}
                  </label>
                </div>
                {(mode === 'add' || editFields.current_possessor) && (
                  <select
                    id="current_possessor"
                    name="current_possessor"
                    required={mode === 'add'}
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
                )}
              </div>

              {/* Times Read Field */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {mode === 'edit' && (
                    <input
                      type="checkbox"
                      id="edit-times-read"
                      checked={editFields.times_read?.enabled || false}
                      onChange={(e) =>
                        setEditFields((prev) => ({
                          ...prev,
                          times_read: { ...prev.times_read!, enabled: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                  )}
                  <label htmlFor="times_read" className="text-sm font-medium text-gray-700">
                    Times Read {mode === 'edit' && editFields.times_read?.enabled && '(Increment by)'}
                  </label>
                </div>
                {(mode === 'add' || editFields.times_read?.enabled) && (
                  <input
                    type="number"
                    id="times_read"
                    name="times_read"
                    min={mode === 'edit' ? 1 : 0}
                    value={
                      mode === 'edit'
                        ? editFields.times_read?.incrementBy || 1
                        : defaults.times_read
                    }
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      if (mode === 'edit') {
                        setEditFields((prev) => ({
                          ...prev,
                          times_read: { ...prev.times_read!, incrementBy: value },
                        }));
                      } else {
                        handleInputChange(e);
                      }
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>

              {/* Last Read Field */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {mode === 'edit' && (
                    <input
                      type="checkbox"
                      id="edit-last-read"
                      checked={editFields.last_read || false}
                      onChange={(e) =>
                        setEditFields((prev) => ({ ...prev, last_read: e.target.checked }))
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                  )}
                  <label htmlFor="last_read" className="text-sm font-medium text-gray-700">
                    Last Read
                  </label>
                </div>
                {(mode === 'add' || editFields.last_read) && (
                  <input
                    type="date"
                    id="last_read"
                    name="last_read"
                    value={defaults.last_read}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
            </div>

            {/* Summary Field - Add mode only */}
            {mode === 'add' && (
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
            )}

            {/* Tags Field */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                {mode === 'edit' && (
                  <input
                    type="checkbox"
                    id="edit-tags"
                    checked={editFields.tags?.enabled || false}
                    onChange={(e) =>
                      setEditFields((prev) => ({
                        ...prev,
                        tags: { ...prev.tags!, enabled: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                )}
                <label className="text-sm font-medium text-gray-700">
                  Tags (Optional)
                </label>
              </div>

              {/* Append/Replace toggle for edit mode */}
              {mode === 'edit' && editFields.tags?.enabled && (
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tags-mode"
                      value="replace"
                      checked={editFields.tags?.mode === 'replace'}
                      onChange={() =>
                        setEditFields((prev) => ({
                          ...prev,
                          tags: { ...prev.tags!, mode: 'replace' },
                        }))
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Replace</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tags-mode"
                      value="append"
                      checked={editFields.tags?.mode === 'append'}
                      onChange={() =>
                        setEditFields((prev) => ({
                          ...prev,
                          tags: { ...prev.tags!, mode: 'append' },
                        }))
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Append</span>
                  </label>
                </div>
              )}

              {(mode === 'add' || editFields.tags?.enabled) && (
                <TagInput
                  value={defaults.tags || ''}
                  onChange={(value) => setDefaults((prev) => ({ ...prev, tags: value }))}
                  label=""
                  id="tags"
                />
              )}
            </div>
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
              disabled={
                mode === 'add'
                  ? !defaults.owner || !defaults.current_possessor
                  : false
              }
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium min-h-[44px] touch-manipulation"
            >
              {mode === 'add' ? 'Start Fast Scan' : 'Start Scanning Books'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
