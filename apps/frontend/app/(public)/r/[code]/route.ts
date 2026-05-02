import { NextRequest, NextResponse } from 'next/server';
import { recordClickViaSupabase, resolveLinkViaSupabase } from '@/lib/server/tracking-fallback';

function getSafeRedirectTarget(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

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
        const redirectTarget = getSafeRedirectTarget(data?.destination_url);
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
    const redirectTarget = getSafeRedirectTarget(link?.destination_url);
    if (link && redirectTarget) {
      await recordClickViaSupabase(link.id, request, request.nextUrl.searchParams);
      return NextResponse.redirect(redirectTarget, { status: 302 });
    }
  } catch (_error) {
    // silent
  }

  return NextResponse.redirect(new URL('/', request.url));
}
