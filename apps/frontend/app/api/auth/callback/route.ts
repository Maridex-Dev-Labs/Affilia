import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectUrl = new URL('/auth/callback', url.origin);
  redirectUrl.search = url.search;
  return NextResponse.redirect(redirectUrl);
}
