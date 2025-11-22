'use client';

import { useState, useEffect } from 'react';
import { Book } from '../../types/book';
import { User } from '../../types/user';
import { Container } from '../../types/container';
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
  const [ownerFilter, setOwnerFilter] = useState<string>('Alleven Family');
  const [possessorFilter, setPossessorFilter] = useState<string>('Alleven Family');
  const [showFastScan, setShowFastScan] = useState(false);
  const [scanConfig, setScanConfig] = useState<ScanConfig | null>(null);
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [neverUsedBookIds, setNeverUsedBookIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>('');

  useEffect(() => {
    fetchBooks();
    fetchUsers();
    fetchContainers();
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
      setSearchQuery(bookFilters.tags);
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

  const fetchContainers = async () => {
    try {
      const response = await fetch('/api/containers');
      const data = await response.json();
      if (data.success && data.containers) {
        setContainers(data.containers);
      }
    } catch (err) {
      console.error('Error fetching containers:', err);
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

  const handleToggleSelection = (bookId: string) => {
    setSelectedBooks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
      } else {
        newSet.add(bookId);
      }
      return newSet;
    });
  };

  const handleStartSelection = () => {
    setSelectionMode(true);
    // Select all visible books by default
    const allBookIds = filteredBooks.map(b => b.id);
    setSelectedBooks(new Set(allBookIds));
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedBooks(new Set());
  };

  const handleOpenMoveModal = () => {
    if (selectedBooks.size === 0) {
      alert('Please select at least one book to move');
      return;
    }
    setShowMoveModal(true);
  };

  const handleMoveBooks = async () => {
    if (!selectedContainer) {
      alert('Please select a container');
      return;
    }

    setLoading(true);
    try {
      // Move all selected books
      const promises = Array.from(selectedBooks).map(bookId =>
        fetch(`/api/books/${bookId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ container_id: selectedContainer })
        })
      );

      await Promise.all(promises);

      // Refresh books to show updated container assignments
      await fetchBooks();

      // Exit selection mode
      setSelectionMode(false);
      setSelectedBooks(new Set());
      setShowMoveModal(false);
      setSelectedContainer('');
    } catch (err) {
      console.error('Error moving books:', err);
      alert('Failed to move some books. Please try again.');
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

  const handleRemoveSearchFilter = () => {
    setSearchQuery('');
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
      // Search filter (title, author, or tags)
      if (searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase();

        // Check title
        const titleMatch = book.title?.toLowerCase().includes(searchLower);

        // Check author
        const authorMatch = book.author?.toLowerCase().includes(searchLower);

        // Check tags
        const bookTags = parseTags(book.tags || '');
        const tagMatch = bookTags.some(tag =>
          tag.toLowerCase().includes(searchLower)
        );

        // Return true if any field matches
        if (!titleMatch && !authorMatch && !tagMatch) {
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
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {!selectionMode ? (
              <>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 font-medium min-h-[44px] touch-manipulation text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">Add Book</span>
                  <span className="sm:hidden">Add</span>
                </button>

                <button
                  onClick={() => setShowFastScan(true)}
                  className="bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-purple-700 font-medium min-h-[44px] touch-manipulation text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">Fast Scan</span>
                  <span className="sm:hidden">Multiscan</span>
                </button>

                <button
                  onClick={handleStartSelection}
                  className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 font-medium min-h-[44px] touch-manipulation text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">Move to Container</span>
                  <span className="sm:hidden">Move</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleOpenMoveModal}
                  disabled={selectedBooks.size === 0}
                  className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 font-medium min-h-[44px] touch-manipulation disabled:bg-gray-300 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  Move {selectedBooks.size} Book{selectedBooks.size !== 1 ? 's' : ''}
                </button>
                <button
                  onClick={handleCancelSelection}
                  className="bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-700 font-medium min-h-[44px] touch-manipulation text-sm sm:text-base"
                >
                  Cancel
                </button>
              </>
            )}
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search books..."
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
            tags={searchQuery || undefined}
            specialFilter={bookFilters.specialFilter}
            onRemoveState={handleRemoveStateFilter}
            onRemoveOwner={handleRemoveOwnerFilter}
            onRemovePossessor={handleRemovePossessorFilter}
            onRemoveTags={handleRemoveSearchFilter}
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
            selectionMode={selectionMode}
            isSelected={selectedBooks.has(book.id)}
            onToggleSelection={() => handleToggleSelection(book.id)}
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

      {showMoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Move {selectedBooks.size} Book{selectedBooks.size !== 1 ? 's' : ''} to Container
            </h2>

            <div className="mb-6">
              <label htmlFor="container-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select Container
              </label>
              <select
                id="container-select"
                value={selectedContainer}
                onChange={(e) => setSelectedContainer(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a container...</option>
                {containers.map(container => (
                  <option key={container.id} value={container.id}>
                    {container.name} {container.is_household ? '(Household)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setSelectedContainer('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleMoveBooks}
                disabled={!selectedContainer || loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Moving...' : 'Move Books'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}