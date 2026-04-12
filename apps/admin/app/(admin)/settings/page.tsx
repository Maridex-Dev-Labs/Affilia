'use client';

import { useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase/admin-client';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

type ProvisionResult = {
  email: string;
  fullName: string;
  kind: 'admin' | 'tutor';
  temporaryPassword: string;
};

const emptyAdminForm = {
  email: '',
  fullName: '',
  phoneNumber: '',
  temporaryPassword: '',
  requiresTotp: true,
  roleIds: [] as string[],
};

const emptyTutorForm = {
  email: '',
  fullName: '',
  phoneNumber: '',
  temporaryPassword: '',
  tutorHeadline: '',
  tutorBio: '',
  tutorExpertise: '',
  googleMeetEmail: '',
};

export default function Page() {
  const { user, session } = useAdminAuth();
  const { adminUser, can, loading: accessLoading } = useAdminAccess();
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [tutorForm, setTutorForm] = useState(emptyTutorForm);
  const [provisioning, setProvisioning] = useState<'admin' | 'tutor' | null>(null);
  const [latestProvision, setLatestProvision] = useState<ProvisionResult | null>(null);

  const isSuperAdmin = Boolean(adminUser?.is_super_admin);

  const loadAccessData = async () => {
    const [{ data: adminUsers }, { data: roleRows }, { data: assignedRows }] = await Promise.all([
      supabase.from('admin_users').select('*').order('created_at'),
      supabase.from('admin_roles').select('*').order('name'),
      supabase.from('admin_user_roles').select('admin_user_id, role_id'),
    ]);
    setAdmins(adminUsers || []);
    setRoles(roleRows || []);
    const grouped = (assignedRows || []).reduce((acc: Record<string, string[]>, row: any) => {
      acc[row.admin_user_id] ||= [];
      acc[row.admin_user_id].push(row.role_id);
      return acc;
    }, {});
    setAssignments(grouped);
  };

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
      setFullName(data?.full_name || '');
      setPhone(data?.phone_number || '');
    };
    load();
    loadAccessData();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setStatus(null);
    const { error } = await supabase.from('profiles').update({ full_name: fullName, phone_number: phone }).eq('id', user.id);
    setStatus(error ? 'Failed to update profile.' : 'Profile updated.');
  };

  const toggleRole = async (adminUserId: string, roleId: string, enabled: boolean) => {
    if (!isSuperAdmin) return;
    if (enabled) {
      await supabase.from('admin_user_roles').upsert({ admin_user_id: adminUserId, role_id: roleId });
    } else {
      await supabase.from('admin_user_roles').delete().eq('admin_user_id', adminUserId).eq('role_id', roleId);
    }
    await loadAccessData();
  };

  const roleSummary = useMemo(() => {
    const map = new Map(roles.map((role) => [role.id, role.name]));
    return (adminId: string) => (assignments[adminId] || []).map((roleId) => map.get(roleId) || roleId).join(', ');
  }, [roles, assignments]);

  const sendProvisionRequest = async (payload: Record<string, unknown>) => {
    const token = session?.access_token;
    if (!token) throw new Error('No admin session available.');
    const response = await fetch('/api/provision-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Provisioning failed.');
    return data.account as ProvisionResult;
  };

  const createAdmin = async () => {
    if (!isSuperAdmin || provisioning) return;
    setStatus(null);
    setProvisioning('admin');
    try {
      const account = await sendProvisionRequest({
        kind: 'admin',
        email: adminForm.email,
        fullName: adminForm.fullName,
        phoneNumber: adminForm.phoneNumber || undefined,
        temporaryPassword: adminForm.temporaryPassword || undefined,
        requiresTotp: adminForm.requiresTotp,
        adminRoleIds: adminForm.roleIds,
      });
      setLatestProvision(account);
      setAdminForm(emptyAdminForm);
      await loadAccessData();
      setStatus('Admin account provisioned. Share the temporary password securely.');
    } catch (error: any) {
      setStatus(error.message || 'Failed to provision admin.');
    } finally {
      setProvisioning(null);
    }
  };

  const createTutor = async () => {
    if (!isSuperAdmin || provisioning) return;
    setStatus(null);
    setProvisioning('tutor');
    try {
      const account = await sendProvisionRequest({
        kind: 'tutor',
        email: tutorForm.email,
        fullName: tutorForm.fullName,
        phoneNumber: tutorForm.phoneNumber || undefined,
        temporaryPassword: tutorForm.temporaryPassword || undefined,
        tutorHeadline: tutorForm.tutorHeadline || undefined,
        tutorBio: tutorForm.tutorBio,
        tutorExpertise: tutorForm.tutorExpertise.split(',').map((item) => item.trim()).filter(Boolean),
        googleMeetEmail: tutorForm.googleMeetEmail || undefined,
      });
      setLatestProvision(account);
      setTutorForm(emptyTutorForm);
      setStatus('Tutor account provisioned with premium academy access.');
    } catch (error: any) {
      setStatus(error.message || 'Failed to provision tutor.');
    } finally {
      setProvisioning(null);
    }
  };

  if (accessLoading) return <div className="text-muted">Loading access...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black italic">Settings</h1>

      <div className="card-surface p-6 space-y-4">
        <h3 className="text-lg font-bold">Admin Profile</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <input className="input-shell" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="input-shell" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="input-shell sm:col-span-2" placeholder="Role" value={isSuperAdmin ? 'super admin' : profile?.role || 'separate admin access'} disabled />
        </div>
        {status ? <p className="text-xs text-muted">{status}</p> : null}
        <button className="border border-white/20 rounded-full px-4 py-2 text-xs" onClick={saveProfile}>Save Changes</button>
      </div>

      {!can('admin.manage') ? (
        <div className="card-surface p-6 text-sm text-muted">You do not have permission to manage admin roles and access separation.</div>
      ) : (
        <div className="card-surface p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold">Admin Access Separation</h3>
            <p className="mt-2 text-sm text-muted">Only the super admin can provision new managed accounts. Operational roles then decide which areas each admin can access.</p>
          </div>

          <div className="space-y-5">
            {admins.map((admin) => (
              <div key={admin.id} className="rounded-2xl border border-white/8 bg-black/20 p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white">
                      {admin.full_name || admin.email}
                      {admin.is_super_admin ? <span className="ml-2 rounded-full bg-red-500/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-red-200">Super Admin</span> : null}
                    </div>
                    <div className="text-sm text-[#8f98ab]">{admin.email}</div>
                    <div className="mt-2 text-xs text-[#8f98ab]">{roleSummary(admin.id) || 'No operational roles assigned'}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${admin.status === 'active' ? 'bg-[#009A44]/15 text-[#009A44]' : 'bg-[#BB0000]/15 text-[#BB0000]'}`}>{admin.status}</span>
                </div>
                {isSuperAdmin && !admin.is_super_admin ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {roles.map((role) => {
                      const checked = (assignments[admin.id] || []).includes(role.id);
                      return (
                        <label key={role.id} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-[#d5dbe8]">
                          <div className="flex items-start gap-3">
                            <input type="checkbox" checked={checked} onChange={(e) => toggleRole(admin.id, role.id, e.target.checked)} className="mt-1" />
                            <div>
                              <div className="font-bold text-white">{role.name}</div>
                              <div className="text-xs text-[#8f98ab] mt-1">{role.description}</div>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {isSuperAdmin ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="card-surface p-6">
            <h2 className="text-xl font-bold">Provision Admin Account</h2>
            <p className="mt-2 text-sm text-muted">Creates the Supabase auth record, stores the admin allowlist, and forces a password change on first login.</p>
            <div className="mt-5 grid gap-4">
              <input className="input-shell" placeholder="Admin email" value={adminForm.email} onChange={(e) => setAdminForm((current) => ({ ...current, email: e.target.value }))} />
              <input className="input-shell" placeholder="Full name" value={adminForm.fullName} onChange={(e) => setAdminForm((current) => ({ ...current, fullName: e.target.value }))} />
              <input className="input-shell" placeholder="Phone number" value={adminForm.phoneNumber} onChange={(e) => setAdminForm((current) => ({ ...current, phoneNumber: e.target.value }))} />
              <input className="input-shell" placeholder="Temporary password (leave blank to auto-generate)" value={adminForm.temporaryPassword} onChange={(e) => setAdminForm((current) => ({ ...current, temporaryPassword: e.target.value }))} />
              <label className="flex items-center gap-3 text-sm text-white">
                <input type="checkbox" checked={adminForm.requiresTotp} onChange={(e) => setAdminForm((current) => ({ ...current, requiresTotp: e.target.checked }))} />
                Require TOTP after password change
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {roles.filter((role) => role.code !== 'super_admin').map((role) => {
                  const checked = adminForm.roleIds.includes(role.id);
                  return (
                    <label key={role.id} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-[#d5dbe8]">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setAdminForm((current) => ({
                              ...current,
                              roleIds: e.target.checked
                                ? [...current.roleIds, role.id]
                                : current.roleIds.filter((item) => item !== role.id),
                            }))
                          }
                          className="mt-1"
                        />
                        <div>
                          <div className="font-bold text-white">{role.name}</div>
                          <div className="text-xs text-[#8f98ab] mt-1">{role.description}</div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <button className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition disabled:opacity-60" disabled={provisioning !== null} onClick={createAdmin}>
              {provisioning === 'admin' ? 'Provisioning...' : 'Create Admin Account'}
            </button>
          </div>

          <div className="card-surface p-6">
            <h2 className="text-xl font-bold">Provision Tutor Account</h2>
            <p className="mt-2 text-sm text-muted">Creates a premium affiliate tutor account, auto-approves Academy access, and forces a password change on first login.</p>
            <div className="mt-5 grid gap-4">
              <input className="input-shell" placeholder="Tutor email" value={tutorForm.email} onChange={(e) => setTutorForm((current) => ({ ...current, email: e.target.value }))} />
              <input className="input-shell" placeholder="Full name" value={tutorForm.fullName} onChange={(e) => setTutorForm((current) => ({ ...current, fullName: e.target.value }))} />
              <input className="input-shell" placeholder="Phone number" value={tutorForm.phoneNumber} onChange={(e) => setTutorForm((current) => ({ ...current, phoneNumber: e.target.value }))} />
              <input className="input-shell" placeholder="Temporary password (leave blank to auto-generate)" value={tutorForm.temporaryPassword} onChange={(e) => setTutorForm((current) => ({ ...current, temporaryPassword: e.target.value }))} />
              <input className="input-shell" placeholder="Tutor headline" value={tutorForm.tutorHeadline} onChange={(e) => setTutorForm((current) => ({ ...current, tutorHeadline: e.target.value }))} />
              <input className="input-shell" placeholder="Google Meet email" value={tutorForm.googleMeetEmail} onChange={(e) => setTutorForm((current) => ({ ...current, googleMeetEmail: e.target.value }))} />
              <input className="input-shell" placeholder="Expertise comma separated" value={tutorForm.tutorExpertise} onChange={(e) => setTutorForm((current) => ({ ...current, tutorExpertise: e.target.value }))} />
              <textarea className="input-shell min-h-36" placeholder="Tutor bio and teaching angle" value={tutorForm.tutorBio} onChange={(e) => setTutorForm((current) => ({ ...current, tutorBio: e.target.value }))} />
            </div>
            <button className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition disabled:opacity-60" disabled={provisioning !== null} onClick={createTutor}>
              {provisioning === 'tutor' ? 'Provisioning...' : 'Create Tutor Account'}
            </button>
          </div>
        </div>
      ) : null}

      {latestProvision ? (
        <div className="card-surface p-6">
          <h3 className="text-lg font-bold">Latest Provisioned Account</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-[#d8deea]">
            <div><span className="text-white/45">Type:</span> {latestProvision.kind}</div>
            <div><span className="text-white/45">Name:</span> {latestProvision.fullName}</div>
            <div><span className="text-white/45">Email:</span> {latestProvision.email}</div>
            <div><span className="text-white/45">Temporary Password:</span> <span className="font-mono">{latestProvision.temporaryPassword}</span></div>
          </div>
          <p className="mt-4 text-xs text-[#8f98ab]">The user must sign in with this temporary password and immediately change it before they can use the platform.</p>
        </div>
      ) : null}
    </div>
  );
}
