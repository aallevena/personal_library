import { NextRequest, NextResponse } from 'next/server';
import { getContainerById, updateContainer, deleteContainer } from '@/app/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const container = await getContainerById(id);

    if (!container) {
      return NextResponse.json(
        { success: false, error: 'Container not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, container });
  } catch (error) {
    console.error('Error fetching container:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch container' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Build updates object with only provided fields
    const updates: Partial<{
      name: string;
      owner: string;
      tags?: string;
      location?: string;
      parent_container_id?: string;
    }> = {};

    if (body.name !== undefined) {
      if (body.name.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updates.name = body.name.trim();
    }

    if (body.owner !== undefined) {
      if (body.owner.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'Owner cannot be empty' },
          { status: 400 }
        );
      }
      updates.owner = body.owner.trim();
    }

    if (body.tags !== undefined) {
      updates.tags = body.tags?.trim() || undefined;
    }

    if (body.location !== undefined) {
      updates.location = body.location?.trim() || undefined;
    }

    if (body.parent_container_id !== undefined) {
      updates.parent_container_id = body.parent_container_id || undefined;
    }

    const updatedContainer = await updateContainer(id, updates);

    return NextResponse.json({
      success: true,
      container: updatedContainer
    });
  } catch (error) {
    console.error('Error updating container:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update container';
    const status = errorMessage.includes('not found') ? 404 : 500;

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteContainer(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Container not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting container:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete container';

    // Provide more specific status codes based on error message
    let status = 500;
    if (errorMessage.includes('not found')) {
      status = 404;
    } else if (errorMessage.includes('Cannot delete')) {
      status = 400;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status }
    );
  }
}
