export function isValidBangladeshiMobile(mobile: string) {
  return /^01[3-9]\d{8}$/.test(mobile.trim());
}

export function isNonEmpty(value: string) {
  return value.trim().length > 0;
}
