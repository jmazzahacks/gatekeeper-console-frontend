import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'healthy',
    service: 'Gatekeeper Console Frontend',
    timestamp: Math.floor(Date.now() / 1000),
  });
}
