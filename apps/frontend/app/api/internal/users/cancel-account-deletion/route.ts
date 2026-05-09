import { NextRequest, NextResponse } from 'next/server';

import { cancelAccountDeletionForUser } from '@/lib/server/account-deletion';
import { getAuthenticatedUserFromRequest } from '@/lib/server/supabase-service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    const result = await cancelAccountDeletionForUser(user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Failed to cancel deletion.' }, { status: 400 });
  }
}
