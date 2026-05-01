import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUserFromRequest } from '@/lib/server/supabase-service';
import { loadCurrentAgreement } from '@/lib/server/contracts-fallback';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    const agreementType = request.nextUrl.searchParams.get('agreement_type') as 'merchant' | 'affiliate' | null;
    const result = await loadCurrentAgreement(user.id, agreementType || undefined);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Failed to load agreement.' }, { status: 400 });
  }
}
