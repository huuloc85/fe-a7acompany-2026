// Account identifiers are text: grouping must never remove leading zeros.
export function formatPayrollAccount(value: string | number | null) {
  const raw = String(value ?? '').trim();
  const digits = raw.replace(/[\s.]/g, '');
  return /^\d{6,19}$/.test(digits)
    ? digits.replace(/(\d{4})(?=\d)/g, '$1 ')
    : raw || '—';
}
