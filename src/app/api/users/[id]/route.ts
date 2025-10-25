import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser, deleteUser, reassignUserBooks, getAllBooks } from '../../../lib/db';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/users/[id] - Get a single user
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getUserById(id);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update a user
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate name field
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Missing required field: name is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await getUserById(id);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const updatedUser = await updateUser(id, { name: body.name.trim() });

    return NextResponse.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const reassignToUserId = searchParams.get('reassignTo');

    // Check if user exists
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has any books (as owner or possessor)
    const allBooks = await getAllBooks();
    const userBooks = allBooks.filter(
      book => book.owner === user.name || book.current_possessor === user.name
    );

    if (userBooks.length > 0) {
      if (!reassignToUserId) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot delete user. User has ${userBooks.length} book(s). Please provide a reassignTo user ID.`,
            bookCount: userBooks.length
          },
          { status: 400 }
        );
      }

      // Validate reassign user exists
      const reassignUser = await getUserById(reassignToUserId);
      if (!reassignUser) {
        return NextResponse.json(
          { success: false, error: 'Reassign user not found' },
          { status: 400 }
        );
      }

      // Reassign books
      await reassignUserBooks(id, reassignToUserId);
    }

    // Delete the user
    const deleted = await deleteUser(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      booksReassigned: userBooks.length
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
