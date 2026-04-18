import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Берём origin из текущего запроса — работает и локально, и на Vercel
  const url = new URL('/login', request.url);
  return NextResponse.redirect(url, { status: 303 });
}