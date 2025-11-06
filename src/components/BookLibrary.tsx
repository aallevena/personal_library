'use client';

import { useState, useEffect } from 'react';
import { Book } from '../../types/book';
import { User } from '../../types/user';
import BookCard from './BookCard';
import AddBookForm from './AddBookForm';
import FastScanModal, { ScanConfig } from './FastScanModal';
import FastScanScanner from './FastScanScanner';
import { parseTags, extractUniqueTags } from '../app/lib/tagUtils';
import { useFilter } from '../contexts/FilterContext';
import FilterChips from './FilterChips';

interface BookLibraryProps {
  initialBooks?: Book[];
}

export default function BookLibrary({ initialBooks = [] }: BookLibraryProps) {
  const { bookFilters, setBookFilters } = useFilter();

  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [filter, setFilter] = useState<Book['state'] | 'all'>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [possessorFilter, setPossessorFilter] = useState<string>('all');
  const [showFastScan, setShowFastScan] = useState(false);
  const [scanConfig, setScanConfig] = useState<ScanConfig | null>(null);
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [tagSearch, setTagSearch] = useState<string>('');
  const [neverUsedBookIds, setNeverUsedBookIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBooks();
    fetchUsers();
  }, []);

  // Sync with FilterContext when coming from Analytics
  useEffect(() => {
    if (bookFilters.state) {
      setFilter(bookFilters.state);
    }
    if (bookFilters.owner) {
      setOwnerFilter(bookFilters.owner);
    }
    if (bookFilters.possessor) {
      setPossessorFilter(bookFilters.possessor);
    }
    if (bookFilters.tags) {
      setTagSearch(bookFilters.tags);
    }
  }, [bookFilters]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success && data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchBooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/books');
      const data = await response.json();

      if (data.success) {
        setBooks(data.books);
      } else {
        setError(data.error || 'Failed to fetch books');
      }
    } catch (err) {
      setError('Failed to fetch books');
      console.error('Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check which books are "never used" when specialFilter is active
  useEffect(() => {
    const checkNeverUsedBooks = async () => {
      if (bookFilters.specialFilter === 'neverUsed' && books.length > 0) {
        try {
          const response = await fetch('/api/books/never-used', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookIds: books.map(b => b.id) })
          });
          const data = await response.json();

          if (data.success) {
            setNeverUsedBookIds(new Set(data.neverUsedIds));
          }
        } catch (err) {
          console.error('Error checking never used books:', err);
        }
      } else {
        setNeverUsedBookIds(new Set());
      }
    };

    checkNeverUsedBooks();
  }, [bookFilters.specialFilter, books]);

  const handleAddBook = (book: Book) => {
    setBooks(prev => [book, ...prev]);
    setShowAddForm(false);
  };

  const handleEditBook = (book: Book) => {
    setBooks(prev => prev.map(b =>
      b.id === book.id ? book : b
    ));
    setEditingBook(null);
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/books/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setBooks(prev => prev.filter(book => book.id !== id));
      } else {
        setError(data.error || 'Failed to delete book');
      }
    } catch (err) {
      setError('Failed to delete book');
      console.error('Error deleting book:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: Book['state']) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/books/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        setBooks(prev => prev.map(book =>
          book.id === id ? { ...book, state: newStatus } : book
        ));
      } else {
        setError(data.error || 'Failed to update book status');
      }
    } catch (err) {
      setError('Failed to update book status');
      console.error('Error updating book status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter chip removal handlers
  const handleRemoveStateFilter = () => {
    setFilter('all');
    setBookFilters({ ...bookFilters, state: 'all' });
  };

  const handleRemoveOwnerFilter = () => {
    setOwnerFilter('all');
    setBookFilters({ ...bookFilters, owner: undefined });
  };

  const handleRemovePossessorFilter = () => {
    setPossessorFilter('all');
    setBookFilters({ ...bookFilters, possessor: undefined });
  };

  const handleRemoveTagsFilter = () => {
    setTagSearch('');
    setBookFilters({ ...bookFilters, tags: undefined });
  };

  const handleRemoveSpecialFilter = () => {
    setBookFilters({ ...bookFilters, specialFilter: null });
  };

  // Get all unique tags from books
  const allBookTags = extractUniqueTags(books);

  const filteredBooks = books
    .filter(book => filter === 'all' || book.state === filter)
    .filter(book => ownerFilter === 'all' || book.owner === ownerFilter)
    .filter(book => possessorFilter === 'all' || book.current_possessor === possessorFilter)
    .filter(book => {
      // Tag dropdown filter
      if (tagFilter !== 'all') {
        const bookTags = parseTags(book.tags || '');
        if (!bookTags.includes(tagFilter)) {
          return false;
        }
      }
      return true;
    })
    .filter(book => {
      // Tag search filter
      if (tagSearch.trim()) {
        const bookTags = parseTags(book.tags || '');
        const searchLower = tagSearch.toLowerCase();
        const hasMatchingTag = bookTags.some(tag =>
          tag.toLowerCase().includes(searchLower)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }
      return true;
    })
    .filter(book => {
      // Special filter: Never Used
      if (bookFilters.specialFilter === 'neverUsed') {
        return neverUsedBookIds.has(book.id);
      }
      return true;
    });

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Personal Library</h1>
        
        <div className="flex flex-col gap-4">
          {/* Action Buttons Row */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium min-h-[44px] touch-manipulation"
            >
              Add Book
            </button>

            <button
              onClick={() => setShowFastScan(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium min-h-[44px] touch-manipulation"
            >
              Fast Scan
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 items-stretch sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as Book['state'] | 'all')}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 min-h-[44px] touch-manipulation"
              >
                <option value="all">All Books</option>
                <option value="In library">In Library</option>
                <option value="Checked out">Checked Out</option>
                <option value="Lost">Lost</option>
              </select>

              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 min-h-[44px] touch-manipulation"
              >
                <option value="all">All Owners</option>
                {users.map((user) => (
                  <option key={user.id} value={user.name}>
                    {user.name}
                  </option>
                ))}
              </select>

              <select
                value={possessorFilter}
                onChange={(e) => setPossessorFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 min-h-[44px] touch-manipulation"
              >
                <option value="all">All Possessors</option>
                {users.map((user) => (
                  <option key={user.id} value={user.name}>
                    {user.name}
                  </option>
                ))}
              </select>

              {allBookTags.length > 0 && (
                <>
                  <select
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 min-h-[44px] touch-manipulation"
                  >
                    <option value="all">All Tags</option>
                    {allBookTags.map((tag) => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="Search tags..."
                    className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 min-h-[44px] touch-manipulation"
                  />
                </>
              )}
            </div>

            <div className="text-sm text-gray-600 self-start sm:self-center">
              {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'}
              {filter !== 'all' && ` (${filter.toLowerCase()})`}
            </div>
          </div>

          {/* Filter Chips */}
          <FilterChips
            state={filter}
            owner={ownerFilter !== 'all' ? ownerFilter : undefined}
            possessor={possessorFilter !== 'all' ? possessorFilter : undefined}
            tags={tagSearch || undefined}
            specialFilter={bookFilters.specialFilter}
            onRemoveState={handleRemoveStateFilter}
            onRemoveOwner={handleRemoveOwnerFilter}
            onRemovePossessor={handleRemovePossessorFilter}
            onRemoveTags={handleRemoveTagsFilter}
            onRemoveSpecialFilter={handleRemoveSpecialFilter}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {loading && (
        <div className="mb-6 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg">
          Loading...
        </div>
      )}

      {filteredBooks.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'all' ? 'No books yet' : `No ${filter.toLowerCase()} books`}
          </h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'Get started by adding your first book!' 
              : `Try selecting a different filter or add some books.`
            }
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBooks.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onEdit={setEditingBook}
            onDelete={handleDeleteBook}
            onUpdateStatus={handleUpdateStatus}
          />
        ))}
      </div>

      {(showAddForm || editingBook) && (
        <AddBookForm
          book={editingBook}
          onSuccess={editingBook ? handleEditBook : handleAddBook}
          onCancel={() => {
            setShowAddForm(false);
            setEditingBook(null);
          }}
        />
      )}

      {showFastScan && !scanConfig && (
        <FastScanModal
          onClose={() => setShowFastScan(false)}
          onStartScan={(config) => {
            setScanConfig(config);
          }}
        />
      )}

      {showFastScan && scanConfig && (
        <FastScanScanner
          config={scanConfig}
          existingBooks={books}
          onClose={() => {
            setShowFastScan(false);
            setScanConfig(null);
            fetchBooks(); // Refresh book list
          }}
          onBookAdded={handleAddBook}
        />
      )}
    </div>
  );
}