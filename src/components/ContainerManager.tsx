'use client';

import { useState } from 'react';
import { Container } from '../../types/container';
import { Book } from '../../types/book';
import ContainerTreeView from './ContainerTreeView';
import AddContainerForm from './AddContainerForm';
import AddBookForm from './AddBookForm';

interface ContainerManagerProps {
  initialContainers: Container[];
  initialBooks: Book[];
}

export default function ContainerManager({ initialContainers, initialBooks }: ContainerManagerProps) {
  const [containers, setContainers] = useState<Container[]>(initialContainers);
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddContainerForm, setShowAddContainerForm] = useState(false);
  const [editingContainer, setEditingContainer] = useState<Container | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  // Get top-level containers (no parent)
  const topLevelContainers = containers.filter(c => !c.parent_container_id);

  const handleAddContainer = (container: Container) => {
    setContainers(prev => [container, ...prev]);
    setShowAddContainerForm(false);
  };

  const handleEditContainer = (container: Container) => {
    setContainers(prev => prev.map(c => c.id === container.id ? container : c));
    setEditingContainer(null);
  };

  const handleDeleteContainer = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/containers/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setContainers(prev => prev.filter(c => c.id !== id));
      } else {
        setError(data.error || 'Failed to delete container');
        alert(data.error || 'Failed to delete container');
      }
    } catch (error) {
      console.error('Error deleting container:', error);
      setError('Failed to delete container');
      alert('Failed to delete container');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBook = (book: Book) => {
    setBooks(prev => prev.map(b => b.id === book.id ? book : b));
    setEditingBook(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Container Management</h1>
            <p className="text-gray-600 mt-2">
              Organize books into containers like little free libraries
            </p>
          </div>
          <button
            onClick={() => setShowAddContainerForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Container
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Total Containers</p>
            <p className="text-2xl font-bold text-blue-900">{containers.length}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Total Books</p>
            <p className="text-2xl font-bold text-green-900">{books.length}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium">Top-Level Containers</p>
            <p className="text-2xl font-bold text-purple-900">{topLevelContainers.length}</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      )}

      {/* Container Tree */}
      {!loading && topLevelContainers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            All Containers
          </h2>
          {topLevelContainers.map(container => (
            <ContainerTreeView
              key={container.id}
              container={container}
              allContainers={containers}
              allBooks={books}
              onEditContainer={setEditingContainer}
              onDeleteContainer={handleDeleteContainer}
              onEditBook={setEditingBook}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && topLevelContainers.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No containers</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new container.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowAddContainerForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Add Container
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddContainerForm && (
        <AddContainerForm
          onSuccess={handleAddContainer}
          onCancel={() => setShowAddContainerForm(false)}
        />
      )}

      {editingContainer && (
        <AddContainerForm
          container={editingContainer}
          onSuccess={handleEditContainer}
          onCancel={() => setEditingContainer(null)}
        />
      )}

      {editingBook && (
        <AddBookForm
          book={editingBook}
          onSuccess={handleEditBook}
          onCancel={() => setEditingBook(null)}
        />
      )}
    </div>
  );
}
