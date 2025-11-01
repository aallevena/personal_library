'use client';

import React, { useState } from 'react';
import { validateTags, parseTags } from '@/app/lib/tagUtils';
import TagBadge from './TagBadge';

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  id?: string;
}

/**
 * TagInput - Input field for entering space-separated hashtags with live validation
 *
 * @param value - Current tag string value (e.g., "#fiction #thriller")
 * @param onChange - Handler called when tags change
 * @param label - Optional label for the input
 * @param placeholder - Optional placeholder text
 * @param id - Optional ID for the input element
 */
export default function TagInput({ value, onChange, label, placeholder, id }: TagInputProps) {
  const [focused, setFocused] = useState(false);

  const validation = validateTags(value);
  const tags = parseTags(value);
  const hasError = !validation.isValid && value.trim().length > 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <input
        type="text"
        id={id}
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder || 'e.g., #fiction #thriller #2024'}
        className={`w-full border rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:outline-none ${
          hasError
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:ring-blue-500'
        }`}
      />

      {/* Tag Preview */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <TagBadge key={`${tag}-${index}`} tag={tag} />
          ))}
        </div>
      )}

      {/* Error Message */}
      {hasError && (
        <p className="text-sm text-red-600">
          {validation.error}
        </p>
      )}

      {/* Helper Text */}
      {!hasError && (focused || value.length === 0) && (
        <p className="text-sm text-gray-500">
          Enter tags separated by spaces. Each tag must start with # and cannot contain spaces.
        </p>
      )}
    </div>
  );
}
