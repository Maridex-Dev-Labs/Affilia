import { NextRequest, NextResponse } from 'next/server';

import { getAccountDeletionStatusForUser } from '@/lib/server/account-deletion';
import { getAuthenticatedUserFromRequest } from '@/lib/server/supabase-service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    const result = await getAccountDeletionStatusForUser(user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Failed to load deletion status.' }, { status: 400 });
  }
}
