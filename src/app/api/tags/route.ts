import { NextRequest, NextResponse } from 'next/server';
import { getAllBooks, getAllUsers } from '@/app/lib/db';
import { extractUniqueTags } from '@/app/lib/tagUtils';

// GET /api/tags - Retrieve all unique tags from books and users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // Optional: 'books', 'users', or null for all

    let tags: string[] = [];

    if (type === 'books') {
      // Get tags from books only
      const books = await getAllBooks();
      tags = extractUniqueTags(books);
    } else if (type === 'users') {
      // Get tags from users only
      const users = await getAllUsers();
      tags = extractUniqueTags(users);
    } else {
      // Get tags from both books and users
      const books = await getAllBooks();
      const users = await getAllUsers();
      const bookTags = extractUniqueTags(books);
      const userTags = extractUniqueTags(users);

      // Combine and deduplicate
      const allTags = new Set([...bookTags, ...userTags]);
      tags = Array.from(allTags).sort();
    }

    return NextResponse.json({
      success: true,
      tags,
      count: tags.length
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tags'
      },
      { status: 500 }
    );
  }
}
