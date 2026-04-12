import { NextRequest, NextResponse } from 'next/server';

const whitelist = (process.env.ADMIN_IP_WHITELIST ?? '')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

function isAllowedIp(ip?: string | null) {
  if (whitelist.length === 0) return true;
  if (!ip) return false;
  return whitelist.includes(ip);
}

export function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (!isAllowedIp(ip)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
};
