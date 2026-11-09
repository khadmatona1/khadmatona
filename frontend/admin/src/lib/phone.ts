/**
 * Written with a "+" country code (any country), the number must total 12
 * digits; written locally with no country code instead, it must total 10
 * digits.
 */
export function isValidPhoneNumber(value: string): boolean {
  const hasCountryCode = value.trim().startsWith("+");
  const digits = value.replace(/\D/g, "");
  return hasCountryCode ? digits.length === 12 : digits.length === 10;
}
