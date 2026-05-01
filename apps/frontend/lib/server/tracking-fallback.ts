import type { NextRequest } from 'next/server';

function serviceRoleHeaders() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ''),
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
  };
}

export async function resolveLinkViaSupabase(code: string) {
  const config = serviceRoleHeaders();
  if (!config) return null;

  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/affiliate_links?unique_code=eq.${encodeURIComponent(code)}&select=id,destination_url&limit=1`,
    {
      headers: config.headers,
      cache: 'no-store',
    },
  );

  if (!response.ok) return null;
  const rows = (await response.json()) as Array<{ id: string; destination_url: string }>;
  return rows[0] || null;
}

export async function recordClickViaSupabase(linkId: string, request: NextRequest, utm?: URLSearchParams) {
  const config = serviceRoleHeaders();
  if (!config) return;

  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const payload = {
    link_id: linkId,
    visitor_ip: forwardedFor,
    user_agent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    utm_source: utm?.get('utm_source') || null,
    utm_medium: utm?.get('utm_medium') || null,
    utm_campaign: utm?.get('utm_campaign') || null,
    geo_country: request.headers.get('x-vercel-ip-country'),
    geo_city: request.headers.get('x-vercel-ip-city'),
  };

  await fetch(`${config.supabaseUrl}/rest/v1/click_events`, {
    method: 'POST',
    headers: config.headers,
    body: JSON.stringify(payload),
    cache: 'no-store',
  }).catch(() => undefined);
}
