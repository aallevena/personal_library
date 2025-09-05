import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/app/lib/db';

export async function GET() {
  try {
    const result = await initializeDatabase();
    
    if (result.success) {
      return NextResponse.json({ 
        message: 'Database initialized successfully',
        success: true 
      });
    } else {
      return NextResponse.json({ 
        message: 'Database initialization failed',
        success: false,
        error: result.error 
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ 
      message: 'Database initialization failed',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}