import { NextRequest, NextResponse } from 'next/server';
import { getAllBooks, createBook, getHouseholdContainer } from '@/app/lib/db';
import { BookFormData } from '../../../../types/book';
import { validateTags, normalizeTags } from '@/app/lib/tagUtils';

// GET /api/books - Retrieve all books
export async function GET() {
  try {
    const books = await getAllBooks();
    return NextResponse.json({
      success: true,
      books
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch books' 
      },
      { status: 500 }
    );
  }
}

// POST /api/books - Create a new book
export async function POST(request: NextRequest) {
  try {
    const body: BookFormData = await request.json();

    // Validate required fields with specific error messages
    const missingFields = [];
    if (!body.title?.trim()) missingFields.push('Title');
    if (!body.state) missingFields.push('State');
    if (!body.owner?.trim()) missingFields.push('Owner');
    if (!body.current_possessor?.trim()) missingFields.push('Current Possessor');

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing required field${missingFields.length > 1 ? 's' : ''}: ${missingFields.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Validate state field
    const validStates = ['In library', 'Checked out', 'Lost'];
    if (!validStates.includes(body.state)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid state. Must be one of: In library, Checked out, Lost'
        },
        { status: 400 }
      );
    }

    // Validate tags field
    const tagValidation = validateTags(body.tags);
    if (!tagValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: tagValidation.error || 'Invalid tags format'
        },
        { status: 400 }
      );
    }

    // Helper function to validate date format (YYYY-MM-DD or YYYY)
    const validateDate = (dateStr: string | undefined): string | undefined => {
      if (!dateStr) return undefined;
      const trimmed = dateStr.trim();
      if (!trimmed) return undefined;

      // Accept YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }

      // Accept YYYY format and convert to YYYY-01-01
      if (/^\d{4}$/.test(trimmed)) {
        return `${trimmed}-01-01`;
      }

      // Reject invalid formats
      return undefined;
    };

    // Get container_id, default to Household if not provided
    let container_id = (body as any).container_id;
    if (!container_id) {
      const household = await getHouseholdContainer();
      if (!household) {
        return NextResponse.json(
          {
            success: false,
            error: 'Household container not found. Please initialize the database first.'
          },
          { status: 500 }
        );
      }
      container_id = household.id;
    }

    // Create the book with default values for missing fields
    // Convert empty strings to undefined for optional fields, especially dates
    const bookData = {
      title: body.title,
      author: body.author?.trim() || undefined,
      publish_date: validateDate(body.publish_date),
      summary: body.summary?.trim() || undefined,
      state: body.state,
      owner: body.owner,
      current_possessor: body.current_possessor,
      times_read: body.times_read || 0,
      last_read: validateDate(body.last_read),
      date_added: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      isbn: body.isbn?.trim() || undefined,
      tags: normalizeTags(body.tags) || undefined,
      container_id
    };

    const newBook = await createBook(bookData);

    return NextResponse.json({
      success: true,
      book: newBook
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating book:', error);

    const errorMsg = error instanceof Error ? error.message : String(error);

    // Check if it's a duplicate constraint error
    if (errorMsg.includes('UNIQUE constraint failed') ||
        errorMsg.includes('unique constraint') ||
        errorMsg.includes('duplicate key')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate book: A book with this ISBN and Owner already exists'
        },
        { status: 409 } // 409 Conflict for duplicates
      );
    }

    // Check for NOT NULL constraint violations
    if (errorMsg.includes('NOT NULL constraint failed')) {
      // Extract field name from error message like "NOT NULL constraint failed: books.title"
      const fieldMatch = errorMsg.match(/books\.(\w+)/);
      const fieldName = fieldMatch ? fieldMatch[1].replace('_', ' ') : 'a required field';
      return NextResponse.json(
        {
          success: false,
          error: `Missing required field: ${fieldName}`
        },
        { status: 400 }
      );
    }

    // Check for CHECK constraint violations (invalid state)
    if (errorMsg.includes('CHECK constraint failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid state value. Must be: In library, Checked out, or Lost'
        },
        { status: 400 }
      );
    }

    // Check for invalid date syntax
    if (errorMsg.toLowerCase().includes('invalid date') ||
        errorMsg.toLowerCase().includes('date syntax')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Dates must be in YYYY-MM-DD format (e.g., 2024-01-15)'
        },
        { status: 400 }
      );
    }

    // Generic database error
    return NextResponse.json(
      {
        success: false,
        error: `Database error: ${errorMsg}`
      },
      { status: 500 }
    );
  }
}