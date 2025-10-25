'use client';

import { useState, useEffect } from 'react';
import { Book, BookFormData } from '../../types/book';
import { User } from '../../types/user';
import BarcodeScanner from './BarcodeScanner';

interface AddBookFormProps {
  book?: Book | null;
  onSuccess: (book: Book) => void;
  onCancel: () => void;
}

export default function AddBookForm({ book, onSuccess, onCancel }: AddBookFormProps) {
  const [formData, setFormData] = useState<BookFormData>({
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
  });

  const [isbnLookup, setIsbnLookup] = useState({
    loading: false,
    error: null as string | null,
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
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

  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title,
        author: book.author || '',
        publish_date: book.publish_date || '',
        summary: book.summary || '',
        state: book.state,
        owner: book.owner,
        current_possessor: book.current_possessor,
        times_read: book.times_read,
        last_read: book.last_read || '',
        isbn: book.isbn || '',
      });
    }
  }, [book]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'times_read' ? parseInt(value) || 0 : value,
    }));
  };

  const handleIsbnLookup = async () => {
    if (!formData.isbn) return;
    
    setIsbnLookup({ loading: true, error: null });
    
    try {
      const response = await fetch(`/api/isbn/${formData.isbn}`);
      const data = await response.json();
      
      if (data.success && data.book) {
        setFormData(prev => ({
          ...prev,
          title: data.book.title || prev.title,
          author: data.book.author || prev.author,
          publish_date: data.book.publish_date || prev.publish_date,
          summary: data.book.summary || prev.summary,
        }));
        setIsbnLookup({ loading: false, error: null });
      } else {
        setIsbnLookup({ loading: false, error: data.error || 'Book not found' });
      }
    } catch (error) {
      setIsbnLookup({ loading: false, error: 'Failed to lookup book' });
      console.error('ISBN lookup error:', error);
    }
  };

  const handleScanSuccess = (isbn: string) => {
    // Update the ISBN field with scanned value
    setFormData(prev => ({ ...prev, isbn }));
    // Automatically trigger ISBN lookup
    setTimeout(async () => {
      if (!isbn) return;
      
      setIsbnLookup({ loading: true, error: null });
      
      try {
        const response = await fetch(`/api/isbn/${isbn}`);
        const data = await response.json();
        
        if (data.success && data.book) {
          setFormData(prev => ({
            ...prev,
            title: data.book.title || prev.title,
            author: data.book.author || prev.author,
            publish_date: data.book.publish_date || prev.publish_date,
            summary: data.book.summary || prev.summary,
          }));
          setIsbnLookup({ loading: false, error: null });
        } else {
          setIsbnLookup({ loading: false, error: data.error || 'Book not found' });
        }
      } catch (error) {
        setIsbnLookup({ loading: false, error: 'Failed to lookup book' });
        console.error('ISBN lookup error:', error);
      }
    }, 100);
  };

  const handleScanError = (error: string) => {
    setIsbnLookup({ loading: false, error });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const url = book ? `/api/books/${book.id}` : '/api/books';
      const method = book ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onSuccess(data.book);
      } else {
        // Check if it's a 4xx or 5xx error
        if (response.status >= 400 && response.status < 500) {
          // Client error - show specific error message
          setSubmitError(data.error || 'Invalid request. Please check your input.');
        } else if (response.status >= 500) {
          // Server error - show generic message
          setSubmitError('Something went wrong. Please try again.');
        } else {
          setSubmitError(data.error || 'Failed to save book.');
        }
      }
    } catch (error) {
      console.error('Error submitting book:', error);
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-full sm:max-w-2xl my-4 sm:my-4 max-h-[calc(100vh-2rem)] sm:max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex justify-between items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex-1 min-w-0 truncate">
              {book ? 'Edit Book' : 'Add New Book'}
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Barcode Scanner Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px] touch-manipulation w-full sm:w-auto justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              📷 Scan Barcode
            </button>
          </div>

          {/* Submit Error Message */}
          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}

          {/* ISBN Lookup Section */}
          <div className="space-y-2">
            <label htmlFor="isbn" className="block text-sm font-medium text-gray-700">
              ISBN (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="isbn"
                name="isbn"
                value={formData.isbn}
                onChange={handleInputChange}
                placeholder="Enter ISBN to auto-fill book details"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleIsbnLookup}
                disabled={!formData.isbn || isbnLookup.loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed min-h-[44px] touch-manipulation whitespace-nowrap"
              >
                {isbnLookup.loading ? 'Looking up...' : 'Lookup'}
              </button>
            </div>
            {isbnLookup.error && (
              <p className="text-sm text-red-600">{isbnLookup.error}</p>
            )}
          </div>

          {/* Required Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="author" className="block text-sm font-medium text-gray-700">
                Author
              </label>
              <input
                type="text"
                id="author"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                State *
              </label>
              <select
                id="state"
                name="state"
                required
                value={formData.state}
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
                value={formData.owner}
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
                value={formData.current_possessor}
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
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="publish_date" className="block text-sm font-medium text-gray-700">
                Publish Date
              </label>
              <input
                type="date"
                id="publish_date"
                name="publish_date"
                value={formData.publish_date}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="times_read" className="block text-sm font-medium text-gray-700">
                Times Read
              </label>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, times_read: Math.max(0, prev.times_read - 1) }))}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-bold min-h-[44px] min-w-[44px]"
                >
                  −
                </button>
                <input
                  type="number"
                  id="times_read"
                  name="times_read"
                  min="0"
                  value={formData.times_read}
                  onChange={handleInputChange}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, times_read: prev.times_read + 1 }))}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-bold min-h-[44px] min-w-[44px]"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="last_read" className="block text-sm font-medium text-gray-700">
                Last Read
              </label>
              <input
                type="date"
                id="last_read"
                name="last_read"
                value={formData.last_read}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="summary" className="block text-sm font-medium text-gray-700">
              Summary
            </label>
            <textarea
              id="summary"
              name="summary"
              rows={3}
              value={formData.summary}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium min-h-[44px] touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.title || !formData.owner || !formData.current_possessor}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium min-h-[44px] touch-manipulation"
            >
              {submitting ? 'Saving...' : (book ? 'Update Book' : 'Add Book')}
            </button>
          </div>
        </form>
      </div>

      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        onError={handleScanError}
      />
    </div>
  );
}