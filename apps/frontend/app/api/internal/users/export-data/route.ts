import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUserFromRequest } from '@/lib/server/supabase-service';
import { buildUserExportZip } from '@/lib/server/user-export';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    const zip = await buildUserExportZip(user.id);
    return new NextResponse(zip, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="affilia-user-export-${user.id}.zip"`,
        'X-Export-Filename': `affilia-user-export-${user.id}.zip`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Failed to prepare your data export.' }, { status: 400 });
  }
}
