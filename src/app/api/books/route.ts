import { NextRequest, NextResponse } from 'next/server';
import { getAllBooks, createBook } from '@/app/lib/db';
import { BookFormData } from '../../../../types/book';

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

    // Validate required fields
    if (!body.title || !body.state || !body.owner || !body.current_possessor) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: title, state, owner, and current_possessor are required'
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

    // Create the book with default values for missing fields
    // Convert empty strings to undefined for optional fields, especially dates
    const bookData = {
      title: body.title,
      author: body.author?.trim() || undefined,
      publish_date: body.publish_date?.trim() || undefined,
      summary: body.summary?.trim() || undefined,
      state: body.state,
      owner: body.owner,
      current_possessor: body.current_possessor,
      times_read: body.times_read || 0,
      last_read: body.last_read?.trim() || undefined,
      date_added: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      isbn: body.isbn?.trim() || undefined
    };

    const newBook = await createBook(bookData);

    return NextResponse.json({
      success: true,
      book: newBook
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating book:', error);

    // Check if it's a duplicate constraint error
    const errorMsg = error instanceof Error ? error.message : String(error);
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

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create book'
      },
      { status: 500 }
    );
  }
}