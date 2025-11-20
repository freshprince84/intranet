/**
 * Farb-Palette für Standorte (Branch)
 * 15 verschiedene Farben für gute Unterscheidung
 */
export const BRANCH_COLORS = [
  '#3b82f6', // Blau
  '#10b981', // Grün
  '#f59e0b', // Orange
  '#ef4444', // Rot
  '#8b5cf6', // Lila
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Limette
  '#f97316', // Orange-Rot
  '#6366f1', // Indigo
  '#14b8a6', // Türkis
  '#a855f7', // Violett
  '#eab308', // Gelb
  '#22c55e', // Grün-Hell
  '#64748b'  // Grau
];

/**
 * Farb-Palette für Rollen
 * 15 verschiedene Farben (etwas heller als Branch-Farben)
 */
export const ROLE_COLORS = [
  '#60a5fa', // Blau-Hell
  '#34d399', // Grün-Hell
  '#fbbf24', // Orange-Hell
  '#f87171', // Rot-Hell
  '#a78bfa', // Lila-Hell
  '#f472b6', // Pink-Hell
  '#22d3ee', // Cyan-Hell
  '#a3e635', // Limette-Hell
  '#fb923c', // Orange-Rot-Hell
  '#818cf8', // Indigo-Hell
  '#2dd4bf', // Türkis-Hell
  '#c084fc', // Violett-Hell
  '#fde047', // Gelb-Hell
  '#4ade80', // Grün-Hell-2
  '#94a3b8'  // Grau-Hell
];

/**
 * Status-Farben (für Rand)
 */
export const STATUS_COLORS = {
  scheduled: '#3b82f6', // Blau
  confirmed: '#10b981', // Grün
  cancelled: '#ef4444', // Rot
  swapped: '#f59e0b'    // Orange
};

/**
 * Gibt eine Farbe für einen Standort zurück (basierend auf ID)
 */
export function getBranchColor(branchId: number | null | undefined): string {
  if (!branchId) {
    return '#64748b'; // Grau für keine Branch
  }
  return BRANCH_COLORS[branchId % BRANCH_COLORS.length];
}

/**
 * Gibt eine Farbe für eine Rolle zurück (basierend auf ID)
 */
export function getRoleColor(roleId: number | null | undefined): string {
  if (!roleId) {
    return '#94a3b8'; // Grau-Hell für keine Rolle
  }
  return ROLE_COLORS[roleId % ROLE_COLORS.length];
}

/**
 * Gibt eine Farbe für einen Status zurück
 */
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#64748b';
}

