// app/api/discover/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { discover } from '@/lib/services/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const { query, limit } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    const results = await discover(query, limit || 10);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Discover API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      },
      { status: 500 }
    );
  }
}