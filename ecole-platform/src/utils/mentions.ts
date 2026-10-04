/**
 * Barème officiel des mentions, appliqué de façon identique partout dans
 * l'appli (bulletin, page Notes, statistiques) :
 *
 *   18,00 et plus  → Excellent
 *   16,00 – 17,99  → Très bien
 *   14,00 – 15,99  → Bien
 *   12,00 – 13,99  → Assez bien
 *   10,00 – 11,99  → Passable
 *    8,00 –  9,99  → Insuffisant
 *    7,00 –  7,99  → Très insuffisant
 *    0,00 –  6,99  → Faible
 */
export const mentionFor = (avg: number | null): string => {
  if (avg === null || Number.isNaN(avg)) return '—';
  // On compare la moyenne telle qu'elle est AFFICHÉE (2 décimales) : 9,996 s'affiche 10,00 → Passable.
  avg = Math.round(avg * 100) / 100;
  if (avg >= 18) return 'Excellent';
  if (avg >= 16) return 'Très bien';
  if (avg >= 14) return 'Bien';
  if (avg >= 12) return 'Assez bien';
  if (avg >= 10) return 'Passable';
  if (avg >= 8) return 'Insuffisant';
  if (avg >= 7) return 'Très insuffisant';
  return 'Faible';
};
