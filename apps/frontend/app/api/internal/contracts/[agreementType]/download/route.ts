import { NextRequest, NextResponse } from 'next/server';

import { generateAgreementPdf } from '@/lib/server/contracts-fallback';
import { getAuthenticatedUserFromRequest } from '@/lib/server/supabase-service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: { params: Promise<{ agreementType: string }> }) {
  try {
    await getAuthenticatedUserFromRequest(request);
    const { agreementType } = await context.params;
    if (agreementType !== 'merchant' && agreementType !== 'affiliate') {
      return NextResponse.json({ detail: 'Invalid agreement type.' }, { status: 400 });
    }

    const output = await generateAgreementPdf(agreementType);
    const body = output instanceof Uint8Array ? output : await new Response(output as unknown as ReadableStream).arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Affilia_${agreementType}_Agreement_fallback.pdf"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Failed to generate agreement PDF.' }, { status: 400 });
  }
}
