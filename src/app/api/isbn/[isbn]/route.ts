import { NextRequest, NextResponse } from 'next/server';
import { openLibraryService } from '@/app/lib/openLibrary';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ isbn: string }> }
) {
  try {
    const { isbn } = await params;

    if (!isbn) {
      return NextResponse.json(
        { success: false, error: 'ISBN parameter is required' },
        { status: 400 }
      );
    }

    // Lookup book by ISBN
    const result = await openLibraryService.searchByISBN(isbn);

    if (result.success) {
      return NextResponse.json({
        success: true,
        book: result.book
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Book not found' 
        },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('ISBN lookup API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during book lookup' 
      },
      { status: 500 }
    );
  }
}