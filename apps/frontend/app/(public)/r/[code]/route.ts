import { NextRequest, NextResponse } from 'next/server';
import { recordClickViaSupabase, resolveLinkViaSupabase } from '@/lib/server/tracking-fallback';

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const { code } = await params;

  if (apiUrl) {
    try {
      await fetch(`${apiUrl}/api/track/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const res = await fetch(`${apiUrl}/api/track/resolve?code=${code}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.destination_url) {
          return NextResponse.redirect(data.destination_url, { status: 302 });
        }
      }
    } catch (err) {
      // silent
    }
  }

  try {
    const link = await resolveLinkViaSupabase(code);
    if (link?.destination_url) {
      await recordClickViaSupabase(link.id, request, request.nextUrl.searchParams);
      return NextResponse.redirect(link.destination_url, { status: 302 });
    }
  } catch (_error) {
    // silent
  }

  return NextResponse.redirect(new URL('/', request.url));
}
