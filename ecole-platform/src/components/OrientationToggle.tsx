import React from 'react';
import { OrientationBulletin } from '../types';

/** Bascule Portrait / Paysage, placée en haut de l'aperçu du bulletin, à côté de « Imprimer ». */
export const OrientationToggle: React.FC<{
  value: OrientationBulletin;
  onChange: (o: OrientationBulletin) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const bouton = (val: OrientationBulletin, label: string, w: number, h: number) => (
    <button
      type="button"
      className={`btn btn-sm ${value === val ? 'btn-accent' : 'btn-ghost'}`}
      onClick={() => onChange(val)}
      disabled={disabled}
      aria-pressed={value === val}
      title={disabled ? "Seul le professeur titulaire ou l'administrateur peut changer le format" : `Format ${label.toLowerCase()}`}
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
