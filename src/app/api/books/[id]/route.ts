import { NextRequest, NextResponse } from 'next/server';
import { getBookById, updateBook, deleteBook } from '@/app/lib/db';
import { BookFormData } from '../../../../../types/book';
import { validateTags, normalizeTags } from '@/app/lib/tagUtils';

// GET /api/books/[id] - Get a specific book
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Book ID is required' },
        { status: 400 }
      );
    }

    const book = await getBookById(id);

    if (!book) {
      return NextResponse.json(
        { success: false, error: 'Book not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      book
    });

  } catch (error) {
    console.error('Error fetching book:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch book' 
      },
      { status: 500 }
    );
  }
}

// PUT /api/books/[id] - Update a specific book
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Book ID is required' },
        { status: 400 }
      );
    }

    const body: Partial<BookFormData> = await request.json();

    // Validate state field if provided
    if (body.state) {
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
    }

    // Validate tags field if provided
    if (body.tags !== undefined) {
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
    }

    // Check if book exists
    const existingBook = await getBookById(id);
    if (!existingBook) {
      return NextResponse.json(
        { success: false, error: 'Book not found' },
        { status: 404 }
      );
    }

    // Sanitize the update data - convert empty strings to undefined for optional fields
    const sanitizedData: Partial<BookFormData> = {};
    if (body.title !== undefined) sanitizedData.title = body.title;
    if (body.author !== undefined) sanitizedData.author = body.author?.trim() || undefined;
    if (body.publish_date !== undefined) sanitizedData.publish_date = body.publish_date?.trim() || undefined;
    if (body.summary !== undefined) sanitizedData.summary = body.summary?.trim() || undefined;
    if (body.state !== undefined) sanitizedData.state = body.state;
    if (body.owner !== undefined) sanitizedData.owner = body.owner;
    if (body.current_possessor !== undefined) sanitizedData.current_possessor = body.current_possessor;
    if (body.times_read !== undefined) sanitizedData.times_read = body.times_read;
    if (body.last_read !== undefined) sanitizedData.last_read = body.last_read?.trim() || undefined;
    if (body.isbn !== undefined) sanitizedData.isbn = body.isbn?.trim() || undefined;
    if (body.tags !== undefined) sanitizedData.tags = normalizeTags(body.tags) || undefined;

    // Update the book
    const updatedBook = await updateBook(id, sanitizedData);

    return NextResponse.json({
      success: true,
      book: updatedBook
    });

  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update book' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/books/[id] - Delete a specific book
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Book ID is required' },
        { status: 400 }
      );
    }

    // Check if book exists
    const existingBook = await getBookById(id);
    if (!existingBook) {
      return NextResponse.json(
        { success: false, error: 'Book not found' },
        { status: 404 }
      );
    }

    // Delete the book
    const deleted = await deleteBook(id);

    if (deleted) {
      return NextResponse.json({
        success: true,
        message: 'Book deleted successfully'
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to delete book' 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete book' 
      },
      { status: 500 }
    );
  }
}