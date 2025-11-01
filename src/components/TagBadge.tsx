import React from 'react';

interface TagBadgeProps {
  tag: string;
  onClick?: (tag: string) => void;
  removable?: boolean;
  onRemove?: (tag: string) => void;
}

/**
 * TagBadge - Displays a single tag as a styled badge/chip
 *
 * @param tag - The tag text to display (e.g., "#fiction")
 * @param onClick - Optional click handler for filtering by tag
 * @param removable - If true, shows a remove button
 * @param onRemove - Handler for removing the tag
 */
export default function TagBadge({ tag, onClick, removable, onRemove }: TagBadgeProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(tag);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onClick
    if (onRemove) {
      onRemove(tag);
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300 ${
        onClick ? 'cursor-pointer hover:bg-blue-200' : ''
      }`}
      onClick={handleClick}
      title={onClick ? `Filter by ${tag}` : tag}
    >
      {tag}
      {removable && onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className="ml-1 text-blue-600 hover:text-blue-900 focus:outline-none"
          aria-label={`Remove ${tag}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
