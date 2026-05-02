const TECHNICAL_PATTERNS = [
  /supabase/i,
  /schema/i,
  /relation/i,
  /column/i,
  /postgres/i,
  /postgrest/i,
  /pgrst/i,
  /rls/i,
  /policy/i,
  /jwt/i,
  /anon key/i,
  /service role/i,
  /next_public_/i,
  /environment variable/i,
  /missing .*credential/i,
  /missing .*key/i,
  /fetch failed/i,
  /network error/i,
  /failed to fetch/i,
  /timeout/i,
  /origin not allowed/i,
  /duplicate key/i,
  /violates/i,
  /not configured/i,
  /invalid api key/i,
  /permission denied/i,
  /typeerror/i,
  /internal server error/i,
  /undefined/i,
  /null value/i,
];

const SAFE_MESSAGES = [
  /^please sign in/i,
  /^enter a valid amount/i,
  /^type delete to confirm/i,
  /^reserve the package first/i,
  /^enter the m-pesa/i,
  /^fill in all required fields/i,
  /^you must confirm/i,
  /^a digital signature is required/i,
  /^upload the signed contract/i,
  /^all legal acknowledgements/i,
  /^no active user session/i,
  /^verification link is incomplete/i,
  /^we could not complete verification/i,
  /^failed to upload business document/i,
  /^you do not have access/i,
  /^complete affiliate verification/i,
  /^activate an affiliate package/i,
  /^activate a merchant package/i,
  /^fund your merchant escrow/i,
  /^the affiliate tied to this code/i,
  /^this customer or order reference/i,
  /^your available escrow balance/i,
];

export function isTechnicalErrorMessage(message: string) {
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(message));
}

export function sanitizeUserFacingError(error: unknown, fallback = 'This workspace is temporarily unavailable. Please try again later.') {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : fallback;
  if (!message) return fallback;
  if (SAFE_MESSAGES.some((pattern) => pattern.test(message))) return message;
  if (isTechnicalErrorMessage(message)) return fallback;
  return message;
}

export function genericWorkspaceError(area = 'workspace') {
  return `The ${area} is temporarily unavailable. Please try again later.`;
}
