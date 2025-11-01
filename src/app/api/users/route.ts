import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, createUser } from '@/app/lib/db';
import { UserFormData } from '../../../../types/user';
import { validateTags, normalizeTags } from '@/app/lib/tagUtils';

// GET /api/users - Retrieve all users
export async function GET() {
  try {
    const users = await getAllUsers();
    return NextResponse.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch users'
      },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const body: UserFormData = await request.json();

    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: name is required and cannot be empty'
        },
        { status: 400 }
      );
    }

    // Validate tags field if provided
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

    // Create the user
    const userData = {
      name: body.name.trim(),
      tags: normalizeTags(body.tags) || undefined
    };

    const newUser = await createUser(userData);

    return NextResponse.json({
      success: true,
      user: newUser
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create user'
      },
      { status: 500 }
    );
  }
}
