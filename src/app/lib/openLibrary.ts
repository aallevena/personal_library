import { OpenLibraryBook } from '../../../types/book';

export interface BookLookupResult {
  success: boolean;
  book?: {
    title?: string;
    author?: string;
    publish_date?: string;
    summary?: string;
    isbn?: string;
  };
  error?: string;
}

class OpenLibraryService {
  private baseUrl = 'https://openlibrary.org';

  async searchByISBN(isbn: string): Promise<BookLookupResult> {
    try {
      // Clean the ISBN (remove hyphens and spaces)
      const cleanISBN = isbn.replace(/[-\s]/g, '');
      
      if (!this.isValidISBN(cleanISBN)) {
        return {
          success: false,
          error: 'Invalid ISBN format'
        };
      }

      // First try to get book details from ISBN API
      const response = await fetch(`${this.baseUrl}/isbn/${cleanISBN}.json`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: 'Book not found with this ISBN'
          };
        }
        throw new Error(`API responded with status: ${response.status}`);
      }

      const bookData: OpenLibraryBook = await response.json();
      
      // Extract and format the book information
      const book = this.formatBookData(bookData, cleanISBN);
      
      return {
        success: true,
        book
      };

    } catch (error) {
      console.error('Open Library API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to lookup book'
      };
    }
  }

  private formatBookData(data: OpenLibraryBook, isbn: string) {
    // Extract title
    const title = data.title || 'Unknown Title';

    // Extract authors - handle different possible formats
    let author = 'Unknown Author';
    if (data.authors && data.authors.length > 0) {
      if (typeof data.authors[0] === 'string') {
        author = data.authors[0] as string;
      } else if (data.authors[0].name) {
        author = data.authors[0].name;
      }
    }

    // Extract publish date
    const publish_date = data.publish_date || undefined;

    // Extract description/summary - handle different possible formats
    let summary = undefined;
    if (data.description) {
      if (typeof data.description === 'string') {
        summary = data.description;
      } else if (data.description.value) {
        summary = data.description.value;
      }
    }

    return {
      title,
      author,
      publish_date,
      summary,
      isbn
    };
  }

  private isValidISBN(isbn: string): boolean {
    // Remove any remaining non-digit characters
    const digits = isbn.replace(/\D/g, '');
    
    // Check if it's ISBN-10 or ISBN-13
    if (digits.length === 10) {
      return this.isValidISBN10(digits);
    } else if (digits.length === 13) {
      return this.isValidISBN13(digits);
    }
    
    return false;
  }

  private isValidISBN10(isbn: string): boolean {
    if (isbn.length !== 10) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      const digit = parseInt(isbn[i]);
      if (isNaN(digit)) return false;
      sum += digit * (10 - i);
    }
    
    const checkChar = isbn[9];
    const checkDigit = checkChar === 'X' ? 10 : parseInt(checkChar);
    if (isNaN(checkDigit) && checkChar !== 'X') return false;
    
    sum += checkDigit;
    return sum % 11 === 0;
  }

  private isValidISBN13(isbn: string): boolean {
    if (isbn.length !== 13) return false;
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(isbn[i]);
      if (isNaN(digit)) return false;
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    
    const checkDigit = parseInt(isbn[12]);
    if (isNaN(checkDigit)) return false;
    
    const remainder = sum % 10;
    const calculatedCheck = remainder === 0 ? 0 : 10 - remainder;
    
    return calculatedCheck === checkDigit;
  }

  // Alternative search method for when ISBN lookup fails
  async searchByTitle(title: string, author?: string): Promise<BookLookupResult> {
    try {
      let query = `title:${encodeURIComponent(title)}`;
      if (author) {
        query += ` AND author:${encodeURIComponent(author)}`;
      }

      const response = await fetch(
        `${this.baseUrl}/search.json?q=${query}&limit=1&fields=title,author_name,first_publish_year,isbn,key`
      );

      if (!response.ok) {
        throw new Error(`Search API responded with status: ${response.status}`);
      }

      const searchData = await response.json();
      
      if (!searchData.docs || searchData.docs.length === 0) {
        return {
          success: false,
          error: 'No books found matching the search criteria'
        };
      }

      const doc = searchData.docs[0];
      return {
        success: true,
        book: {
          title: doc.title || 'Unknown Title',
          author: doc.author_name?.[0] || 'Unknown Author',
          publish_date: doc.first_publish_year?.toString() || undefined,
          isbn: doc.isbn?.[0] || undefined
        }
      };

    } catch (error) {
      console.error('Open Library search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search for book'
      };
    }
  }
}

// Export a singleton instance
export const openLibraryService = new OpenLibraryService();