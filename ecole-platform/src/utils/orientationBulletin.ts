import { useSyncExternalStore } from 'react';

export type OrientationBulletin = 'portrait' | 'paysage';

const KEY = 'bulletin_orientation';

const lire = (): OrientationBulletin => {
  try {
    return localStorage.getItem(KEY) === 'paysage' ? 'paysage' : 'portrait';
  } catch {
    return 'portrait';
  }
};

let courant: OrientationBulletin = lire();
const abonnes = new Set<() => void>();

/** Met à jour la règle @page pour que « Imprimer » respecte l'orientation choisie. */
const appliquerPageImpression = () => {
  if (typeof document === 'undefined') return;
  let el = document.getElementById('bulletin-page-style');
  if (!el) {
    el = document.createElement('style');
    el.id = 'bulletin-page-style';
    document.head.appendChild(el);
  }
  el.textContent = `@page { size: A4 ${courant === 'paysage' ? 'landscape' : 'portrait'}; margin: 8mm; }`;
};
appliquerPageImpression();

export const getOrientationBulletin = (): OrientationBulletin => courant;

export const setOrientationBulletin = (o: OrientationBulletin) => {
  if (o === courant) return;
  courant = o;
  try { localStorage.setItem(KEY, o); } catch { /* stockage indisponible : on garde le choix en mémoire */ }
  appliquerPageImpression();
  abonnes.forEach(f => f());
};

const abonner = (f: () => void) => {
  abonnes.add(f);
  return () => { abonnes.delete(f); };
};

/** Orientation du bulletin (portrait par défaut), partagée par l'aperçu, l'impression et le PDF. */
export const useOrientationBulletin = (): OrientationBulletin =>
  useSyncExternalStore(abonner, getOrientationBulletin, getOrientationBulletin);
