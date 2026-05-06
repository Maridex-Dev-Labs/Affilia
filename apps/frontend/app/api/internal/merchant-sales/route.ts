import { NextRequest, NextResponse } from 'next/server';

import { submitMerchantAffiliateSale } from '@/lib/server/merchant-sales';
import { getAuthenticatedUserFromRequest } from '@/lib/server/supabase-service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    const payload = await request.json();
    const result = await submitMerchantAffiliateSale(user.id, payload);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Affiliate sale submission failed.' }, { status: 400 });
  }
}
