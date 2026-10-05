import React from 'react';
import { useOrientationBulletin, setOrientationBulletin } from '../utils/orientationBulletin';

/** Bascule Portrait / Paysage pour l'aperçu, l'impression et le PDF du bulletin. */
export const OrientationToggle: React.FC = () => {
  const o = useOrientationBulletin();
  const bouton = (val: 'portrait' | 'paysage', label: string, w: number, h: number) => (
    <button
      type="button"
      className={`btn btn-sm ${o === val ? 'btn-accent' : 'btn-ghost'}`}
      onClick={() => setOrientationBulletin(val)}
      aria-pressed={o === val}
      title={`Format ${label.toLowerCase()}`}
    >
      <span style={{ width: w, height: h, border: '1.5px solid currentColor', borderRadius: 2, display: 'inline-block' }} />
      {label}
    </button>
  );
  return (
    <div className="no-print" style={{ display: 'flex', gap: 4 }} role="group" aria-label="Orientation du bulletin">
      {bouton('portrait', 'Portrait', 9, 12)}
      {bouton('paysage', 'Paysage', 12, 9)}
    </div>
  );
};
