export function makeReferralCode(name: string) {
  return `${name.toUpperCase().replace(/\s+/g, '')}-${Math.floor(Math.random() * 9000 + 1000)}`;
}
