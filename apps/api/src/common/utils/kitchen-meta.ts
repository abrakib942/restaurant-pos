/** Course 1 = apps, 2 = mains/sides/bar, 3 = dessert */
export function courseForCategoryName(categoryName: string): number {
  const name = categoryName.toLowerCase();
  if (name.includes('small') || name.includes('plate')) return 1;
  if (name.includes('sweet')) return 3;
  return 2;
}

export const COURSE_LABELS: Record<number, string> = {
  1: 'Apps',
  2: 'Mains',
  3: 'Dessert',
};

export function formatElapsedMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
}
