/**
 * Tag utility functions for parsing and validating tags
 */

export interface TagValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a tag string
 * Rules:
 * - Tags must be space-separated
 * - Each tag must start with #
 * - No spaces allowed within individual tags
 *
 * @param tags - Tag string to validate (e.g., "#fiction #thriller #2024")
 * @returns Validation result with error message if invalid
 */
export function validateTags(tags: string | undefined): TagValidationResult {
  // Empty or undefined tags are valid
  if (!tags || tags.trim() === '') {
    return { isValid: true };
  }

  const trimmedTags = tags.trim();
  const tagArray = trimmedTags.split(/\s+/); // Split by whitespace

  for (const tag of tagArray) {
    // Each tag must start with #
    if (!tag.startsWith('#')) {
      return {
        isValid: false,
        error: `Invalid tag "${tag}": tags must start with #`
      };
    }

    // Tag must have content after #
    if (tag.length === 1) {
      return {
        isValid: false,
        error: 'Tags cannot be empty (just #)'
      };
    }

    // Check for spaces within tag (shouldn't happen after split, but being thorough)
    if (tag.includes(' ')) {
      return {
        isValid: false,
        error: `Invalid tag "${tag}": tags cannot contain spaces`
      };
    }
  }

  return { isValid: true };
}

/**
 * Parses a tag string into an array of individual tags
 *
 * @param tags - Tag string (e.g., "#fiction #thriller #2024")
 * @returns Array of individual tags (e.g., ["#fiction", "#thriller", "#2024"])
 */
export function parseTags(tags: string | undefined): string[] {
  if (!tags || tags.trim() === '') {
    return [];
  }

  return tags.trim().split(/\s+/).filter(tag => tag.length > 0);
}

/**
 * Extracts all unique tags from a collection of items (books or users)
 *
 * @param items - Array of items with tags field
 * @returns Array of unique tags sorted alphabetically
 */
export function extractUniqueTags(items: Array<{ tags?: string }>): string[] {
  const tagSet = new Set<string>();

  for (const item of items) {
    if (item.tags) {
      const tags = parseTags(item.tags);
      tags.forEach(tag => tagSet.add(tag));
    }
  }

  return Array.from(tagSet).sort();
}

/**
 * Normalizes a tag string by removing extra whitespace
 *
 * @param tags - Tag string to normalize
 * @returns Normalized tag string
 */
export function normalizeTags(tags: string | undefined): string {
  if (!tags || tags.trim() === '') {
    return '';
  }

  const tagArray = parseTags(tags);
  return tagArray.join(' ');
}

/**
 * Checks if an item has a specific tag
 *
 * @param item - Item with tags field
 * @param tag - Tag to search for (with or without #)
 * @returns True if item has the tag
 */
export function hasTag(item: { tags?: string }, tag: string): boolean {
  if (!item.tags) {
    return false;
  }

  const normalizedSearchTag = tag.startsWith('#') ? tag : `#${tag}`;
  const tags = parseTags(item.tags);
  return tags.includes(normalizedSearchTag);
}
