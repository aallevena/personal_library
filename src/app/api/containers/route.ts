import { NextRequest, NextResponse } from 'next/server';
import { getAllContainers, createContainer } from '@/app/lib/db';

export async function GET() {
  try {
    const containers = await getAllContainers();
    return NextResponse.json({ success: true, containers });
  } catch (error) {
    console.error('Error fetching containers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch containers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Missing required field: name is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!body.owner || body.owner.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Missing required field: owner is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Create container (shareable_code and is_household will be set by createContainer)
    const containerData = {
      name: body.name.trim(),
      owner: body.owner.trim(),
      tags: body.tags?.trim() || undefined,
      location: body.location?.trim() || undefined,
      parent_container_id: body.parent_container_id || undefined
    };

    const newContainer = await createContainer(containerData);

    return NextResponse.json({
      success: true,
      container: newContainer
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating container:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create container' },
      { status: 500 }
    );
  }
}
