import { NextRequest, NextResponse } from 'next/server';
import { recordClickViaSupabase, resolveLinkViaSupabase } from '@/lib/server/tracking-fallback';
import { normalizeRedirectTarget } from '@/lib/server/smart-link-redirect';

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
        const redirectTarget = normalizeRedirectTarget(data?.destination_url, request.url);
        if (redirectTarget) {
          return NextResponse.redirect(redirectTarget, { status: 302 });
        }
      }
    } catch (err) {
      // silent
    }
  }

  try {
    const link = await resolveLinkViaSupabase(code);
    const redirectTarget = normalizeRedirectTarget(link?.destination_url, request.url);
    if (link && redirectTarget) {
      await recordClickViaSupabase(link.id, request, request.nextUrl.searchParams);
      return NextResponse.redirect(redirectTarget, { status: 302 });
    }
  } catch (_error) {
    // silent
  }

  return NextResponse.redirect(new URL('/', request.url));
}
