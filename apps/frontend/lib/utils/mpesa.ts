export function isValidMpesaCode(code: string) {
  return /^[A-Z0-9]{8,10}$/.test(code);
}
