export function isAllowedIp(ip: string | null | undefined, whitelist: string[]) {
  if (!whitelist.length) return true;
  if (!ip) return false;
  return whitelist.includes(ip);
}
