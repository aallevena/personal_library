'use client';

import { Book } from '../../types/book';

interface FilterChip {
  label: string;
  onRemove: () => void;
}

interface FilterChipsProps {
  state?: Book['state'] | 'all';
  owner?: string;
  possessor?: string;
  tags?: string;
  specialFilter?: 'neverUsed' | null;
  onRemoveState: () => void;
  onRemoveOwner: () => void;
  onRemovePossessor: () => void;
  onRemoveTags: () => void;
  onRemoveSpecialFilter: () => void;
}

export default function FilterChips({
  state,
  owner,
  possessor,
  tags,
  specialFilter,
  onRemoveState,
  onRemoveOwner,
  onRemovePossessor,
  onRemoveTags,
  onRemoveSpecialFilter
}: FilterChipsProps) {
  const chips: FilterChip[] = [];

  // Add state chip if not "all"
  if (state && state !== 'all') {
    chips.push({
      label: `State: ${state}`,
      onRemove: onRemoveState
    });
  }

  // Add owner chip
  if (owner) {
    chips.push({
      label: `Owner: ${owner}`,
      onRemove: onRemoveOwner
    });
  }

  // Add possessor chip
  if (possessor) {
    chips.push({
      label: `Possessor: ${possessor}`,
      onRemove: onRemovePossessor
    });
  }

  // Add search chip
  if (tags) {
    chips.push({
      label: `Search: ${tags}`,
      onRemove: onRemoveTags
    });
  }

  // Add special filter chip
  if (specialFilter === 'neverUsed') {
    chips.push({
      label: 'Never Used',
      onRemove: onRemoveSpecialFilter
    });
  }

  // Don't render if no chips
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <span className="text-sm text-gray-600 self-center">Active filters:</span>
      {chips.map((chip, index) => (
        <button
          key={index}
          onClick={chip.onRemove}
          className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
        >
          {chip.label}
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}
