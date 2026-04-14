import { NextRequest, NextResponse } from 'next/server';

import { createServiceAdminClient, generateTemporaryPassword } from '@/lib/supabase/service-admin';

type ProvisionPayload = {
  kind: 'admin' | 'tutor';
  email: string;
  fullName: string;
  phoneNumber?: string;
  temporaryPassword?: string;
  adminRoleIds?: string[];
  requiresTotp?: boolean;
  tutorHeadline?: string;
  tutorBio?: string;
  tutorExpertise?: string[];
  googleMeetEmail?: string;
};

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
    .select('id, user_id, status, is_super_admin, full_name')
    .eq('user_id', userData.user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (adminError || !adminRecord) {
    return { error: NextResponse.json({ error: 'Admin access denied.' }, { status: 403 }) };
  }

  if (!adminRecord.is_super_admin) {
    return { error: NextResponse.json({ error: 'Only the super admin can provision managed accounts.' }, { status: 403 }) };
  }

  return { supabase, adminRecord, user: userData.user };
}

export async function POST(request: NextRequest) {
  const acting = await getActingAdmin(request);
  if ('error' in acting) return acting.error;

  const payload = (await request.json()) as ProvisionPayload;
  const email = payload.email?.trim().toLowerCase();
  const fullName = payload.fullName?.trim();
  const temporaryPassword = payload.temporaryPassword?.trim() || generateTemporaryPassword();

  if (!email || !fullName) {
    return NextResponse.json({ error: 'Email and full name are required.' }, { status: 400 });
  }

  if (payload.kind === 'tutor' && !payload.tutorBio?.trim()) {
    return NextResponse.json({ error: 'Tutor bio is required.' }, { status: 400 });
  }

  const { supabase, adminRecord } = acting;
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const existing = listData.users.find((entry) => entry.email?.toLowerCase() === email);
  if (existing) {
    return NextResponse.json({ error: 'A Supabase account with that email already exists.' }, { status: 409 });
  }

  const { data: createdUserData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      managed_account: true,
      managed_kind: payload.kind,
    },
  });
  if (createError || !createdUserData.user) {
    return NextResponse.json({ error: createError?.message || 'Failed to create auth user.' }, { status: 500 });
  }

  const createdUser = createdUserData.user;
  const commonProfile = {
    id: createdUser.id,
    full_name: fullName,
    phone_number: payload.phoneNumber || null,
    role: payload.kind === 'tutor' ? 'affiliate' : null,
    onboarding_complete: payload.kind === 'tutor',
    must_change_password: true,
    managed_by_admin: adminRecord.user_id,
    account_origin: 'admin_provisioned',
  };

  const { error: profileError } = await supabase.from('profiles').upsert(commonProfile, { onConflict: 'id' });
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (payload.kind === 'admin') {
    const { data: adminUpsert, error: adminUpsertError } = await supabase
      .from('admin_users')
      .upsert(
        {
          user_id: createdUser.id,
          email,
          full_name: fullName,
          status: 'active',
          is_super_admin: false,
          requires_totp: payload.requiresTotp ?? true,
          provisioned_by: adminRecord.user_id,
        },
        { onConflict: 'user_id' }
      )
      .select('id')
      .single();

    if (adminUpsertError || !adminUpsert) {
      return NextResponse.json({ error: adminUpsertError?.message || 'Failed to save admin record.' }, { status: 500 });
    }

    if (payload.adminRoleIds?.length) {
      const assignments = payload.adminRoleIds.map((roleId) => ({
        admin_user_id: adminUpsert.id,
        role_id: roleId,
      }));
      const { error: rolesError } = await supabase.from('admin_user_roles').upsert(assignments, { onConflict: 'admin_user_id,role_id' });
      if (rolesError) {
        return NextResponse.json({ error: rolesError.message }, { status: 500 });
      }
    }
  }

  if (payload.kind === 'tutor') {
    const expertise = Array.from(new Set((payload.tutorExpertise || []).map((item) => item.trim()).filter(Boolean)));

    const { error: membershipError } = await supabase.from('academy_memberships').upsert(
      {
        user_id: createdUser.id,
        access_level: 'premium',
        source: 'admin_provisioned',
        notes: `Provisioned by ${adminRecord.full_name || adminRecord.user_id}`,
      },
      { onConflict: 'user_id' }
    );
    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    const { error: tutorError } = await supabase.from('academy_tutor_profiles').upsert(
      {
        user_id: createdUser.id,
        headline: payload.tutorHeadline?.trim() || 'Affilia Academy Tutor',
        bio: payload.tutorBio?.trim(),
        expertise,
        google_meet_email: payload.googleMeetEmail?.trim() || email,
        status: 'approved',
        approved_by: adminRecord.user_id,
        approved_at: new Date().toISOString(),
        provisioned_by: adminRecord.user_id,
        source: 'admin_provisioned',
      },
      { onConflict: 'user_id' }
    );
    if (tutorError) {
      return NextResponse.json({ error: tutorError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    account: {
      userId: createdUser.id,
      email,
      fullName,
      kind: payload.kind,
      temporaryPassword,
      mustChangePassword: true,
    },
  });
}
