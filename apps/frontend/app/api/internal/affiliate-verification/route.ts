import { NextRequest, NextResponse } from 'next/server';

import { submitAffiliateVerification } from '@/lib/server/affiliate-verification';
import { getAuthenticatedUserFromRequest } from '@/lib/server/supabase-service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    const payload = await request.json();
    const result = await submitAffiliateVerification(user.id, payload);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Affiliate verification submission failed.' }, { status: 400 });
  }
}
