import { NextRequest, NextResponse } from 'next/server';

import { deleteAccountForUser } from '@/lib/server/account-deletion';
import { getAuthenticatedUserFromRequest } from '@/lib/server/supabase-service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    const payload = await request.json();
    const result = await deleteAccountForUser(user.id, payload.confirmation_text || '');
    return NextResponse.json(result);
  } catch (error: any) {
    const message = error.message || 'Failed to delete account.';
    const status = /pending|unsettled|escrow/i.test(message) ? 409 : 400;
    return NextResponse.json({ detail: message }, { status });
  }
}
