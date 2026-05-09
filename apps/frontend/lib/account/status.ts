export type AccountControl = {
  status?: 'active' | 'warned' | 'blocked' | 'scheduled_for_deletion' | 'deleted' | string;
  warning_message?: string | null;
  block_reason?: string | null;
  scheduled_for?: string | null;
  reason?: string | null;
};

export function getAccountControl(documents: unknown): AccountControl {
  const source = (documents && typeof documents === 'object' ? (documents as Record<string, unknown>) : {});
  const control = (source.account_control && typeof source.account_control === 'object'
    ? (source.account_control as Record<string, unknown>)
    : {}) as AccountControl;
  return {
    status: control.status || 'active',
    warning_message: typeof control.warning_message === 'string' ? control.warning_message : null,
    block_reason: typeof control.block_reason === 'string' ? control.block_reason : null,
    scheduled_for: typeof control.scheduled_for === 'string' ? control.scheduled_for : null,
    reason: typeof control.reason === 'string' ? control.reason : null,
  };
}

export function isBlockedAccount(control: AccountControl) {
  return control.status === 'blocked';
}

export function isDeletionScheduled(control: AccountControl) {
  return control.status === 'scheduled_for_deletion';
}

export function formatAccountDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
