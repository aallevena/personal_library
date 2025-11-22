'use client';

import { Container } from '../../types/container';
import { Book } from '../../types/book';

interface ContainerCardProps {
  container: Container;
  allContainers: Container[];
  allBooks: Book[];
  onEdit: (container: Container) => void;
  onDelete: (id: string) => void;
  onToggle: () => void;
  isExpanded: boolean;
}

export default function ContainerCard({
  container,
  allContainers,
  allBooks,
  onEdit,
  onDelete,
  onToggle,
  isExpanded
}: ContainerCardProps) {

  // Calculate recursive book count
  const getRecursiveBookCount = (containerId: string): number => {
    // Get books directly in this container
    const directBooks = allBooks.filter((b: Book & { container_id?: string }) => b.container_id === containerId).length;

    // Get child containers
    const childContainers = allContainers.filter(c => c.parent_container_id === containerId);

    // Recursively count books in child containers
    const childBooks = childContainers.reduce((sum, child) => sum + getRecursiveBookCount(child.id), 0);

    return directBooks + childBooks;
  };

  const bookCount = getRecursiveBookCount(container.id);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/lfl/${container.shareable_code}`;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  const handleDelete = () => {
    if (container.is_household) {
      alert('Cannot delete the Household container');
      return;
    }

    if (confirm(`Are you sure you want to delete "${container.name}"? This container must be empty first.`)) {
      onDelete(container.id);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
      {/* Header with expand button */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={onToggle}
          className="text-gray-600 hover:text-gray-900 focus:outline-none"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg
            className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <h3 className="text-lg font-semibold text-gray-900 truncate">
          {container.name}
          {container.is_household && (
            <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Household
            </span>
          )}
        </h3>
      </div>

      {/* Container details */}
      <div className="ml-3 space-y-1 text-sm">
        <p className="text-gray-600">
          <span className="font-medium">Owner:</span> {container.owner}
        </p>

        <p className="text-gray-600">
          <span className="font-medium">Total books:</span> {bookCount}
        </p>

        {container.location && (
          <p className="text-gray-600">
            <span className="font-medium">Location:</span> {container.location}
          </p>
        )}

        {container.tags && (
          <div className="flex flex-wrap gap-1 mt-2">
            {container.tags.split(' ').filter(tag => tag.startsWith('#')).map((tag, index) => (
              <span
                key={index}
                className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Shareable link */}
        <div className="mt-2 pt-2 border-t border-gray-200">
          <button
            onClick={handleCopyLink}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy shareable link ({container.shareable_code})
          </button>
        </div>

        {/* Action buttons - moved down */}
        {!container.is_household && (
          <div className="flex gap-2 mt-2 pt-2 border-t border-gray-200">
            <button
              onClick={() => onEdit(container)}
              className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
