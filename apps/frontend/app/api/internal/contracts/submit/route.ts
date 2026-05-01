import { NextRequest, NextResponse } from 'next/server';

import { submitAgreement } from '@/lib/server/contracts-fallback';
import { getAuthenticatedUserFromRequest } from '@/lib/server/supabase-service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    const payload = await request.json();
    const result = await submitAgreement(user.id, payload, request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Agreement submission failed.' }, { status: 400 });
  }
}
