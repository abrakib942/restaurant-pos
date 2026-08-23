export function suggestQrSlug(label: string) {
  const trimmed = label.trim();
  if (/^\d+$/.test(trimmed)) {
    return `t-${trimmed.padStart(2, '0')}`;
  }
  return (
    trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'table'
  );
}
