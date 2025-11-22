import { NextRequest, NextResponse } from 'next/server';
import { getContainerByCode, getAllContainerContentsRecursive } from '@/app/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const container = await getContainerByCode(code);

    if (!container) {
      return NextResponse.json(
        { success: false, error: 'Container not found' },
        { status: 404 }
      );
    }

    // Get all contents recursively (books and nested containers)
    const { books, containers: childContainers } = await getAllContainerContentsRecursive(container.id);

    return NextResponse.json({
      success: true,
      container,
      books,
      childContainers
    });
  } catch (error) {
    console.error('Error fetching container by code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch container' },
      { status: 500 }
    );
  }
}
