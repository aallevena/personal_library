'use client';

import { useState } from 'react';
import { Container } from '../../types/container';
import { Book } from '../../types/book';
import ContainerCard from './ContainerCard';

interface ContainerTreeViewProps {
  container: Container;
  allContainers: Container[];
  allBooks: Book[];
  onEditContainer: (container: Container) => void;
  onDeleteContainer: (id: string) => void;
  onEditBook: (book: Book) => void;
  level?: number;
}

export default function ContainerTreeView({
  container,
  allContainers,
  allBooks,
  onEditContainer,
  onDeleteContainer,
  onEditBook,
  level = 0
}: ContainerTreeViewProps) {
  const [isExpanded, setIsExpanded] = useState(level === 0); // Top-level containers expanded by default

  // Get child containers
  const childContainers = allContainers.filter(c => c.parent_container_id === container.id);

  // Get books in this container
  const booksInContainer = allBooks.filter((b: Book & { container_id?: string }) => b.container_id === container.id);

  const hasContent = childContainers.length > 0 || booksInContainer.length > 0;

  return (
    <div className={`${level > 0 ? 'ml-8 mt-4' : 'mt-4'}`}>
      <ContainerCard
        container={container}
        onEdit={onEditContainer}
        onDelete={onDeleteContainer}
        onToggle={() => setIsExpanded(!isExpanded)}
        isExpanded={isExpanded}
      />

      {/* Show content when expanded */}
      {isExpanded && hasContent && (
        <div className="ml-8 mt-2 space-y-2">
          {/* Show books */}
          {booksInContainer.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Books ({booksInContainer.length})
              </h4>
              <div className="space-y-1">
                {booksInContainer.map((book: Book & { container_id?: string }) => (
                  <div
                    key={book.id}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => onEditBook(book)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{book.title}</p>
                        {book.author && (
                          <p className="text-sm text-gray-600 truncate">by {book.author}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            book.state === 'In library'
                              ? 'bg-green-100 text-green-800'
                              : book.state === 'Checked out'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {book.state}
                          </span>
                          <span className="text-xs text-gray-500">
                            Owner: {book.owner}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Show nested containers */}
          {childContainers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Containers ({childContainers.length})
              </h4>
              {childContainers.map(child => (
                <ContainerTreeView
                  key={child.id}
                  container={child}
                  allContainers={allContainers}
                  allBooks={allBooks}
                  onEditContainer={onEditContainer}
                  onDeleteContainer={onDeleteContainer}
                  onEditBook={onEditBook}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Show empty state */}
      {isExpanded && !hasContent && (
        <div className="ml-8 mt-2 p-4 bg-gray-50 border border-gray-200 rounded-md text-center">
          <p className="text-sm text-gray-500">This container is empty</p>
        </div>
      )}
    </div>
  );
}
