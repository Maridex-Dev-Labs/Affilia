import { NextRequest, NextResponse } from 'next/server';

import { createServiceAdminClient } from '@/lib/supabase/service-admin';

async function getActingAdmin(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 }) };
  }

  const token = authorization.slice('Bearer '.length).trim();
  const supabase = createServiceAdminClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return { error: NextResponse.json({ error: 'Invalid admin session.' }, { status: 401 }) };
  }

  const { data: adminRecord, error: adminError } = await supabase
    .from('admin_users')
    .select('id,user_id,status,is_super_admin')
    .eq('user_id', userData.user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (adminError || !adminRecord) {
    return { error: NextResponse.json({ error: 'Admin access denied.' }, { status: 403 }) };
  }

  if (!adminRecord.is_super_admin) {
    const { data: roleLinks } = await supabase.from('admin_user_roles').select('role_id').eq('admin_user_id', adminRecord.id);
    const roleIds = (roleLinks || []).map((item) => item.role_id);
    if (roleIds.length === 0) {
      return { error: NextResponse.json({ error: 'Admin access denied.' }, { status: 403 }) };
    }
    const { data: perms } = await supabase.from('admin_role_permissions').select('permission_code').in('role_id', roleIds);
    const granted = new Set((perms || []).map((item) => item.permission_code));
    if (!granted.has('merchant.verify') && !granted.has('affiliate.verify') && !granted.has('legal.review')) {
      return { error: NextResponse.json({ error: 'Admin access denied.' }, { status: 403 }) };
    }
  }

  return { supabase, user: userData.user };
}

export async function POST(request: NextRequest) {
  const acting = await getActingAdmin(request);
  if ('error' in acting) return acting.error;

  const { bucket, path, expiresIn } = await request.json();
  if (!bucket || !path) {
    return NextResponse.json({ error: 'Bucket and path are required.' }, { status: 400 });
  }

  const { data, error } = await acting.supabase.storage.from(bucket).createSignedUrl(path, Number(expiresIn || 60));
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || 'Failed to create signed URL.' }, { status: 400 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl });
}
