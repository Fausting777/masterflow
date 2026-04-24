const FORMULA_PREFIX_RE = /^[=+\-@]/;

export function escapeCsvCell(value: string): string {
  const normalized = FORMULA_PREFIX_RE.test(value) ? `'${value}` : value;

  if (normalized.includes(';') || normalized.includes('"') || normalized.includes('\n')) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}
