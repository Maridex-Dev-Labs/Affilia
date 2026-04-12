import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  if (!url.pathname.startsWith('/r/')) return NextResponse.next();

  const code = url.pathname.split('/r/')[1];
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const country = request.headers.get('x-vercel-ip-country');
  const city = request.headers.get('x-vercel-ip-city');

  if (apiUrl) {
    fetch(`${apiUrl}/api/track/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        ip: forwardedFor,
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
        utm_source: url.searchParams.get('utm_source'),
        utm_medium: url.searchParams.get('utm_medium'),
        utm_campaign: url.searchParams.get('utm_campaign'),
        geo: {
          country,
          city,
        },
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});

    try {
      const resolve = await fetch(`${apiUrl}/api/track/resolve?code=${code}`);
      if (resolve.ok) {
        const data = await resolve.json();
        if (data?.destination_url) {
          return NextResponse.redirect(data.destination_url, { status: 302 });
        }
      }
    } catch (err) {
      // ignore
    }
  }

  return NextResponse.redirect(new URL('/', request.url), { status: 302 });
}

export const config = {
  matcher: ['/r/:path*'],
};
