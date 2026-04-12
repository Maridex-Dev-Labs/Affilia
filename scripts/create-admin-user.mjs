import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '../apps/admin/node_modules/@supabase/supabase-js/dist/index.mjs';

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const values = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    values[key] = value;
  }
  return values;
}

async function main() {
  const repoRoot = process.cwd();
  const backendEnv = readEnvFile(path.join(repoRoot, 'apps/backend/.env'));
  const adminEnv = readEnvFile(path.join(repoRoot, 'apps/admin/.env.local'));

  const url = process.env.SUPABASE_URL || backendEnv.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || backendEnv.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.ADMIN_ACCESS_EMAIL || adminEnv.ADMIN_ACCESS_EMAIL;
  const password = process.env.ADMIN_ACCESS_PASSWORD || adminEnv.ADMIN_ACCESS_PASSWORD;
  const fullName = process.env.ADMIN_ACCESS_FULL_NAME || 'Edusei Lisamba';

  if (!url || !serviceRoleKey || !email || !password) {
    throw new Error(
      'Missing required values. Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_ACCESS_EMAIL, ADMIN_ACCESS_PASSWORD.'
    );
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const existing = usersData.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());

  let userId = existing?.id;

  if (!existing) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Created auth user: ${email}`);
  } else {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: { ...(existing.user_metadata || {}), full_name: fullName }
    });
    if (error) throw error;
    console.log(`Updated auth user password: ${email}`);
  }

  if (!userId) throw new Error('Failed to resolve admin user id.');

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      full_name: fullName,
      account_origin: 'admin_provisioned'
    },
    { onConflict: 'id' }
  );
  if (profileError) throw profileError;

  const { error: adminError } = await supabase.from('admin_users').upsert(
    {
      user_id: userId,
      email,
      full_name: fullName,
      is_super_admin: true,
      requires_totp: false,
      status: 'active',
      provisioned_by: userId,
    },
    { onConflict: 'user_id' }
  );
  if (adminError) throw adminError;

  const { data: adminRecord, error: adminRecordError } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .single();
  if (adminRecordError) throw adminRecordError;

  const { data: superAdminRole, error: superAdminRoleError } = await supabase
    .from('admin_roles')
    .select('id')
    .eq('code', 'super_admin')
    .maybeSingle();
  if (!superAdminRoleError && superAdminRole?.id) {
    const { error: assignmentError } = await supabase.from('admin_user_roles').upsert(
      {
        admin_user_id: adminRecord.id,
        role_id: superAdminRole.id,
      },
      { onConflict: 'admin_user_id,role_id' }
    );
    if (assignmentError) throw assignmentError;
  }

  console.log(`Admin allowlisted: ${email}`);
  console.log('You can now sign in on http://localhost:6200/login');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
