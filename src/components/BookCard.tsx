'use client';

import { Book } from '../../types/book';

interface BookCardProps {
  book: Book;
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: Book['state']) => void;
}

export default function BookCard({ book, onEdit, onDelete, onUpdateStatus }: BookCardProps) {
  const getStateColor = (state: Book['state']) => {
    switch (state) {
      case 'In library':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Checked out':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Lost':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {book.title}
          </h3>
          {book.author && (
            <p className="text-gray-600 mb-2">by {book.author}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(book)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(book.id)}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs font-medium rounded border ${getStateColor(book.state)}`}
          >
            {book.state}
          </span>
          <select
            value={book.state}
            onChange={(e) => onUpdateStatus(book.id, e.target.value as Book['state'])}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-900"
          >
            <option value="In library">In library</option>
            <option value="Checked out">Checked out</option>
            <option value="Lost">Lost</option>
          </select>
        </div>

        <div className="text-sm text-gray-600">
          <p><span className="font-medium">Current possessor:</span> {book.current_possessor}</p>
          {book.publish_date && (
            <p><span className="font-medium">Published:</span> {book.publish_date}</p>
          )}
          {book.isbn && (
            <p><span className="font-medium">ISBN:</span> {book.isbn}</p>
          )}
        </div>

        {book.summary && (
          <div className="mt-3">
            <p className="text-sm text-gray-700 line-clamp-3">
              {book.summary}
            </p>
          </div>
        )}

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
          <div>
            <p>Times read: {book.times_read}</p>
            {book.last_read && <p>Last read: {formatDate(book.last_read)}</p>}
          </div>
          <p>Added: {formatDate(book.date_added)}</p>
        </div>
      </div>
    </div>
  );
}