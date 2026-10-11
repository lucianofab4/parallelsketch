export const PARTITION_COLORS = [
  '#06b6d4', // cyan-500
  '#8b5cf6', // violet-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#3b82f6', // blue-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
]

export function partitionColor(id: number): string {
  return PARTITION_COLORS[id % PARTITION_COLORS.length]
}
