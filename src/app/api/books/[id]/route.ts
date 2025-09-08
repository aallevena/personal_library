import { NextRequest, NextResponse } from 'next/server';
import { getBookById, updateBook, deleteBook } from '@/app/lib/db';
import { BookFormData } from '../../../../../types/book';

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

    // Check if book exists
    const existingBook = await getBookById(id);
    if (!existingBook) {
      return NextResponse.json(
        { success: false, error: 'Book not found' },
        { status: 404 }
      );
    }

    // Update the book
    const updatedBook = await updateBook(id, body);

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