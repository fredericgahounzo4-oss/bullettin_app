import React from 'react';
import { Matiere, User } from '../types';
import { useSettings } from '../context/SettingsContext';

// ============================================================================
// Modèles de bulletin (adaptés des bulletins papier) — rendu uniquement.
// Tous les calculs (moyennes, rangs, totaux) sont faits UNE fois dans
// BulletinPreview (OtherPages.tsx) puis passés ici via BulletinData.
// ============================================================================

export interface LigneBulletin {
  matiere: Matiere;
  moyInterro: number | null;
  moyDevoir: number | null;
  moyComp: number | null;
  moyClasse: number | null;
  moyDes2: number | null;
  rang: number | null;
  totalClasse: number;
  prof?: User;
}

export interface StatsPeriode {
  moy: number | null;
  rang: number | null;
  total: number;
  mini: number | null;
  maxi: number | null;
  moyClasse: number | null;
}

export interface BulletinData {
  eleve: { nom: string; prenom: string; classe: string };
  effectif: number;
  settings: ReturnType<typeof useSettings>['settings'];
  accent: string;
  accentPale: string;
  couleurFond?: string;
  periode: 1 | 2 | 3;
  nbPeriodes: number;
  /** Matières non facultatives (affichées dans le tableau principal). */
  lignes: LigneBulletin[];
  /** Matières facultatives (EPS...) ; row = null si la matière n'existe pas dans la classe. */
  facultatives: { label: string; row: LigneBulletin | null }[];
  totalCoeff: number;
  totalProduit: number;
  moyenneGenerale: number | null;
  /** Statistiques par période (1..nbPeriodes) : moyenne de l'élève, rang, mini/maxi/moyenne de la classe. */
  stats: Record<number, StatsPeriode>;
  /** Moyenne annuelle — seulement quand la dernière période est affichée et que toutes sont saisies. */
  annuel: StatsPeriode | null;
  mention: string;
  appreciation: (v: number | null) => string;
  /** Orientation de la page : portrait (défaut) ou paysage. */
  orientation?: 'portrait' | 'paysage';
}

// ------------------------------------------------------------------ helpers
const fmt = (v: number | null | undefined, d = 2) => (v === null || v === undefined ? '—' : v.toFixed(d));
const ord = (n: number) => (n === 1 ? '1er' : `${n}ème`);
const rangTxt = (s: StatsPeriode | null | undefined) => (s && s.rang ? `${ord(s.rang)} / ${s.total}` : '—');
const nomPeriodeLong = (semestriel: boolean, p: number) =>
  semestriel ? (p === 1 ? 'PREMIER SEMESTRE' : 'DEUXIÈME SEMESTRE') : `${p === 1 ? '1ER' : `${p}ÈME`} TRIMESTRE`;
const nomPeriodeCourt = (semestriel: boolean, p: number) =>
  semestriel ? (p === 1 ? '1er semestre' : '2ème semestre') : (p === 1 ? '1er trimestre' : `${p}ème trimestre`);

const normalise = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.']/g, '').trim();
const SCIENTIFIQUES = ['math', 'physi', 'chimie', 'svt', 'science', 'biolog', 'informat', 'techno', 'electr'];
export const estScientifique = (nom: string) => {
  const n = normalise(nom);
  return n === 'pc' || /\bpc\b/.test(n) || SCIENTIFIQUES.some(k => n.includes(k));
};

const profNom = (l: LigneBulletin | null) => (l?.prof ? `${l.prof.prenom} ${l.prof.nom}` : '—');
const rangMatiere = (l: LigneBulletin | null) => (l?.rang ? `${ord(l.rang)} / ${l.totalClasse}` : '—');

const BORD = '1px solid #94a3b8';

// ---- Lisibilité : le texte posé sur la couleur d'accent ou sur le fond de la classe doit rester lisible.
const luminance = (hex?: string) => {
  const c = (hex || '#ffffff').replace('#', '');
  const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c.padEnd(6, 'f').slice(0, 6);
  const [r, g, b] = [0, 2, 4].map(i => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255;
    return Number.isNaN(v) ? 1 : v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a?: string, b?: string) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
/** Blanc ou quasi-noir, selon ce qui se lit le mieux sur cette couleur. */
const texteSur = (fond?: string) => (contraste(fond, '#0f172a') >= contraste(fond, '#ffffff') ? '#0f172a' : '#ffffff');
/** Couleur d'accent pour du texte (titres) ; repli sur noir/blanc si elle se lit mal sur le fond. */
const accentLisible = (d: { accent: string; couleurFond?: string }) =>
  contraste(d.accent, d.couleurFond || '#ffffff') >= 3 ? d.accent : texteSur(d.couleurFond || '#ffffff');

const Cadre: React.FC<{ d: BulletinData; children: React.ReactNode }> = ({ d, children }) => {
  const paysage = d.orientation === 'paysage';
  return (
    <div className="bulletin-scroll-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
      {/* Format de page pour « Imprimer » (le PDF utilise la même orientation) */}
      <style>{`@page { size: A4 ${paysage ? 'landscape' : 'portrait'}; margin: 8mm; }
.bulletin-paysage th { font-size: 11.5px !important; line-height: 1.25; padding: 7px 6px !important; }
.bulletin-paysage td { font-size: 11.5px !important; padding: 5px 6px !important; }`}</style>
      <div className={`card bulletin-print${paysage ? ' bulletin-paysage' : ''}`} style={{ padding: '14px 18px', maxWidth: paysage ? 1240 : 920, minWidth: paysage ? 900 : 680, margin: '0 auto', fontSize: paysage ? 11 : 10, background: d.couleurFond, color: texteSur(d.couleurFond || '#ffffff') }}>
        {children}
      </div>
    </div>
  );
};

const EnTete: React.FC<{ d: BulletinData; titre: string; sousTitre: string }> = ({ d, titre, sousTitre }) => {
  const s = d.settings;
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6, paddingBottom: 6, borderBottom: `2px solid ${accentLisible(d)}` }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.3, maxWidth: 230 }}>{s.ministere}</div>
        <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
          {s.logoUrl ? (
            <img src={s.logoUrl} alt="Logo" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${d.accent}` }} />
          ) : null}
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: accentLisible(d), textTransform: 'uppercase' }}>{s.nomEcole}</div>
            <div style={{ fontSize: 9, opacity: 0.8, lineHeight: 1.3 }}>
              B.P: {s.bp} {s.ville}-{s.pays} — Tél : {s.telephone1}{s.telephone2 ? ` / ${s.telephone2}` : ''}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 9, fontWeight: 700 }}>
          <div>{s.republique.toUpperCase()}</div>
          <div style={{ fontWeight: 400, fontSize: 8 }}>{s.deviseNationale}</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', margin: '6px 0 8px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: accentLisible(d), letterSpacing: 0.5 }}>{titre}</div>
        <div style={{ fontSize: 11, fontWeight: 700 }}>{sousTitre}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 6, fontSize: 10, marginBottom: 8, border: BORD, padding: '5px 8px' }}>
        <div>NOM ET PRÉNOM(S) : <b>{d.eleve.nom} {d.eleve.prenom}</b></div>
        <div>Classe : <b>{d.eleve.classe}</b></div>
        <div>Effectif : <b>{d.effectif}</b></div>
        <div>Année scolaire : <b>{d.settings.anneeScolaire}</b></div>
      </div>
    </>
  );
};

const th = (d: BulletinData, extra?: React.CSSProperties): React.CSSProperties => ({
  padding: '5px 3px', fontSize: 10, fontWeight: 700, lineHeight: 1.2, textAlign: 'center', border: BORD, background: d.accent, color: texteSur(d.accent), verticalAlign: 'middle', ...extra,
});
const td = (extra?: React.CSSProperties): React.CSSProperties => ({ padding: '3px 4px', border: BORD, textAlign: 'center', ...extra });

/** Couleur d'une note : vert / orange / rouge si elle reste lisible sur le fond de la classe, sinon noir ou blanc (en gras). */
const couleurNote = (v: number | null, fond?: string) => {
  const f = fond || '#ffffff';
  const base = texteSur(f);
  if (v === null) return base;
  const voulue = v >= 14 ? '#15803d' : v >= 10 ? '#b45309' : '#b91c1c';
  return contraste(voulue, f) >= 4.5 ? voulue : base;
};

const Ligne: React.FC<{ label: string; value?: React.ReactNode; gras?: boolean }> = ({ label, value, gras }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, borderBottom: '1px dotted #94a3b8', padding: '3px 0', fontSize: 10 }}>
    <span style={{ opacity: 0.8 }}>{label}</span>
    <span style={{ fontWeight: gras ? 800 : 600 }}>{value ?? ''}</span>
  </div>
);

const Boite: React.FC<{ titre: string; hauteur?: number; children?: React.ReactNode }> = ({ titre, hauteur = 44, children }) => (
  <div style={{ border: BORD, padding: 4, minHeight: hauteur }}>
    <div style={{ fontSize: 9, fontWeight: 700 }}>{titre}</div>
    {children ? <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', paddingTop: 6 }}>{children}</div> : null}
  </div>
);

// Toutes les lignes (principales + facultatives présentes), dans l'ordre d'affichage « liste simple ».
const toutesLignes = (d: BulletinData) => [
  ...d.lignes,
  ...d.facultatives.map(f => f.row).filter((r): r is LigneBulletin => r !== null),
];

// ============================================================================
// Modèle « Lycée — Semestre (sections) » — d'après le bulletin LYVO1
// ============================================================================
export const BulletinLyceeSemestre: React.FC<{ d: BulletinData }> = ({ d }) => {
  const litt = d.lignes.filter(l => !estScientifique(l.matiere.nom));
  const sci = d.lignes.filter(l => estScientifique(l.matiere.nom));
  const fac = d.facultatives.map(f => f.row).filter((r): r is LigneBulletin => r !== null);
  let n = 0;

  const moySection = (ls: LigneBulletin[]) => {
    const v = ls.map(l => l.moyDes2).filter((x): x is number => x !== null);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };

  const ligne = (l: LigneBulletin) => {
    n += 1;
    return (
      <tr key={l.matiere.id}>
        <td style={td({ textAlign: 'left', fontWeight: 600 })}>{String(n).padStart(2, '0')}. {l.matiere.nom}</td>
        <td style={td()}>{fmt(l.moyInterro)}</td>
        <td style={td()}>{fmt(l.moyDevoir)}</td>
        <td style={td()}>{fmt(l.moyClasse)}</td>
        <td style={td()}>{fmt(l.moyComp)}</td>
        <td style={td({ fontWeight: 700, color: couleurNote(l.moyDes2, d.couleurFond) })}>{fmt(l.moyDes2)}</td>
        <td style={td()}>{l.matiere.coefficient}</td>
        <td style={td({ fontWeight: 600 })}>{l.moyDes2 !== null ? (l.moyDes2 * l.matiere.coefficient).toFixed(2) : '—'}</td>
        <td style={td({ fontSize: 9 })}>{rangMatiere(l)} — {d.appreciation(l.moyDes2)}</td>
        <td style={td({ fontSize: 9, minWidth: 90, textAlign: 'left' })}>{profNom(l)}</td>
      </tr>
    );
  };

  const section = (titre: string, ls: LigneBulletin[]) => (
    <>
      <tr style={{ background: d.accentPale }}>
        <td colSpan={10} style={td({ textAlign: 'left', fontWeight: 700 })}>
          {titre} <span style={{ marginLeft: 12, fontWeight: 600 }}>MOY : {fmt(moySection(ls))} / 20</span>
        </td>
      </tr>
      {ls.map(ligne)}
    </>
  );

  const periodes = Array.from({ length: d.periode }, (_, i) => d.periode - i); // ex. [2, 1]

  return (
    <Cadre d={d}>
      <EnTete d={d} titre="BULLETIN DE NOTES" sousTitre={nomPeriodeLong(true, d.periode)} />
      <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th(d, { textAlign: 'left' })} rowSpan={2}>MATIÈRES</th>
              <th style={th(d)} colSpan={3}>ÉVALUATIONS INTERMÉDIAIRES</th>
              <th style={th(d)} rowSpan={2}>COMPO. /20</th>
              <th style={th(d)} rowSpan={2}>MOY G. /20</th>
              <th style={th(d)} rowSpan={2}>COEF.</th>
              <th style={th(d)} rowSpan={2}>MOY. POND.</th>
              <th style={th(d)} rowSpan={2}>RANG &amp; APPRÉC.</th>
              <th style={th(d)} rowSpan={2}>PROF. &amp; SIGNATURE</th>
            </tr>
            <tr>
              <th style={th(d)}>1è NOTE</th>
              <th style={th(d)}>2è NOTE</th>
              <th style={th(d)}>MOY. /20</th>
            </tr>
          </thead>
          <tbody>
            {section('MATIÈRES LITTÉRAIRES', litt)}
            {sci.length > 0 && section('MATIÈRES SCIENTIFIQUES', sci)}
            {fac.length > 0 && section('MATIÈRES FACULTATIVES', fac)}
            <tr style={{ background: d.accentPale, fontWeight: 800 }}>
              <td style={td({ textAlign: 'right' })} colSpan={6}>TOTAUX</td>
              <td style={td()}>{d.totalCoeff || '—'}</td>
              <td style={td()}>{d.totalProduit ? d.totalProduit.toFixed(2) : '—'}</td>
              <td style={td()} colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10, marginTop: 8 }}>
        <div style={{ border: BORD, padding: '4px 8px' }}>
          {periodes.map(p => {
            const s = d.stats[p];
            return (
              <Ligne
                key={p}
                label={`Moy. du ${nomPeriodeCourt(true, p)} — rang ${rangTxt(s)} — mini ${fmt(s?.mini)} / maxi ${fmt(s?.maxi)} / classe ${fmt(s?.moyClasse)}`}
                value={fmt(s?.moy)}
                gras={p === d.periode}
              />
            );
          })}
          {d.annuel && (
            <Ligne
              label={`MOY. ANNUELLE — rang ${rangTxt(d.annuel)} — mini ${fmt(d.annuel.mini)} / maxi ${fmt(d.annuel.maxi)} / classe ${fmt(d.annuel.moyClasse)}`}
              value={fmt(d.annuel.moy)}
              gras
            />
          )}
          <Ligne label="Total semestriel (points)" value={d.totalProduit ? d.totalProduit.toFixed(2) : '—'} />
          <Ligne label="Mention" value={d.mention} />
          <Ligne label="Retards (heures) / Absences (jours)" value="" />
          <Ligne label="Conduite / Travail" value="" />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <Boite titre="DÉCISION DU CONSEIL" hauteur={52} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <Boite titre="PROF. TITULAIRE" hauteur={52} />
            <Boite titre="LE PROVISEUR" hauteur={52} />
          </div>
        </div>
      </div>
      <div style={{ fontSize: 8, textAlign: 'center', marginTop: 6, opacity: 0.7 }}>
        Il n'est délivré qu'un seul relevé de notes, au besoin l'élève se fera établir un duplicata.
      </div>
    </Cadre>
  );
};

// ============================================================================
// Modèle « Lycée — Semestre (liste simple) » — d'après le bulletin 2021-2022
// ============================================================================
export const BulletinLyceeSemestre2: React.FC<{ d: BulletinData }> = ({ d }) => {
  const lignes = toutesLignes(d);
  const periodes = Array.from({ length: d.periode }, (_, i) => d.periode - i);
  const cur = d.stats[d.periode];

  return (
    <Cadre d={d}>
      <EnTete d={d} titre={`BULLETIN DU ${nomPeriodeLong(true, d.periode)}`} sousTitre={`Année académique ${d.settings.anneeScolaire}`} />
      <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th(d, { textAlign: 'left' })}>MATIÈRES</th>
              <th style={th(d)}>Coef</th>
              <th style={th(d)}>Int</th>
              <th style={th(d)}>Dev</th>
              <th style={th(d)}>Moy Classe</th>
              <th style={th(d)}>Compo</th>
              <th style={th(d)}>Note coef</th>
              <th style={th(d)}>Rang</th>
              <th style={th(d)}>Appréciations</th>
              <th style={th(d)}>Professeurs</th>
              <th style={th(d, { minWidth: 70 })}>Signatures</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map(l => (
              <tr key={l.matiere.id}>
                <td style={td({ textAlign: 'left', fontWeight: 600 })}>{l.matiere.nom}</td>
                <td style={td()}>{l.matiere.coefficient.toFixed(2)}</td>
                <td style={td()}>{fmt(l.moyInterro)}</td>
                <td style={td()}>{fmt(l.moyDevoir)}</td>
                <td style={td()}>{fmt(l.moyClasse)}</td>
                <td style={td()}>{fmt(l.moyComp)}</td>
                <td style={td({ fontWeight: 700 })}>{l.moyDes2 !== null ? (l.moyDes2 * l.matiere.coefficient).toFixed(2) : '—'}</td>
                <td style={td()}>{rangMatiere(l)}</td>
                <td style={td({ fontSize: 9 })}>{d.appreciation(l.moyDes2)}</td>
                <td style={td({ fontSize: 9, textAlign: 'left' })}>{profNom(l)}</td>
                <td style={td({ minHeight: 20 })} />
              </tr>
            ))}
            <tr style={{ background: d.accentPale, fontWeight: 800 }}>
              <td style={td({ textAlign: 'right' })}>TOTAL</td>
              <td style={td()}>{d.totalCoeff ? d.totalCoeff.toFixed(2) : '—'}</td>
              <td style={td()} colSpan={4} />
              <td style={td()}>{d.totalProduit ? d.totalProduit.toFixed(2) : '—'}</td>
              <td style={td()} colSpan={4} />
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 10, marginTop: 8 }}>
        <div style={{ border: BORD, padding: '4px 8px' }}>
          {['Retard', 'Absence', "Tableau d'honneur", 'Félicitation', 'Encouragement', 'Avertissement (Travail / Discipline)', 'Blâme (Travail / Discipline)'].map(l => (
            <Ligne key={l} label={l} />
          ))}
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            <div style={{ border: BORD, padding: '4px 8px', flex: 1 }}>
              {periodes.map(p => (
                <Ligne key={p} label={`Moy. ${nomPeriodeCourt(true, p)} — Rang ${rangTxt(d.stats[p])}`} value={fmt(d.stats[p]?.moy)} gras={p === d.periode} />
              ))}
              {d.annuel && <Ligne label={`Moy. annuelle — Rang ${rangTxt(d.annuel)}`} value={fmt(d.annuel.moy)} gras />}
            </div>
            {/* Encadré « Forte moy / Faible moy / Moy. géné » comme sur le bulletin papier */}
            <div style={{ border: BORD, padding: '6px 10px', minWidth: 130, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, fontSize: 10 }}>
              {[
                ['Forte moy.', cur?.maxi],
                ['Faible moy.', cur?.mini],
                ['Moy. géné.', cur?.moyClasse],
              ].map(([label, v]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span>{label as string}</span>
                  <b>{fmt(v as number | null | undefined)}</b>
                </div>
              ))}
            </div>
          </div>
          <Boite titre={`Observations générales : ${d.mention}`} hauteur={34} />
          <Boite titre="Obs. & Décision du conseil" hauteur={34} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10 }}>
        <div style={{ textAlign: 'center', minWidth: 180 }}>
          <div>Titulaire (Nom &amp; Signature)</div>
          <div style={{ height: 34 }} />
        </div>
        <div style={{ textAlign: 'center', minWidth: 180 }}>
          <div>Le Proviseur</div>
          <div style={{ height: 34 }} />
        </div>
      </div>
    </Cadre>
  );
};


const rangCourt = (n: number) => (n === 1 ? '1er' : `${n}e`);
const Trait: React.FC<{ children?: React.ReactNode; large?: number }> = ({ children, large = 38 }) => (
  <span style={{ display: 'inline-block', minWidth: large, borderBottom: '1px solid currentColor', textAlign: 'center', fontWeight: 700, padding: '0 3px' }}>
    {children ?? '\u00a0'}
  </span>
);
/** « Moy. du 1er Trim. ____/20 Rang ___ sur ___ » — valeurs sur un trait, comme sur le papier. */
const MoyRang: React.FC<{ label: string; stats: StatsPeriode | null | undefined }> = ({ label, stats }) => (
  <div style={{ padding: '3px 0', borderBottom: '1px dotted #94a3b8', whiteSpace: 'nowrap' }}>
    {label} <Trait>{stats ? fmt(stats.moy) : null}</Trait> /20 Rang <Trait large={26}>{stats?.rang ? rangCourt(stats.rang) : null}</Trait> sur <Trait large={26}>{stats?.rang ? stats.total : null}</Trait>
  </div>
);
/** Libellé suivi d'un trait à remplir (Retards, Absences...). */
const Souligne: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, padding: '3px 0' }}>
    <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
    <span style={{ flex: 1, borderBottom: '1px solid currentColor', height: 10 }} />
  </div>
);

// ============================================================================
// Modèle « Collège — Trimestre » — d'après le bulletin d'évaluation du CEG
// ============================================================================
export const BulletinCollege: React.FC<{ d: BulletinData }> = ({ d }) => {
  const lignes = toutesLignes(d);
  const cur = d.stats[d.periode];

  return (
    <Cadre d={d}>
      <EnTete d={d} titre="BULLETIN D'ÉVALUATION" sousTitre={`${nomPeriodeLong(false, d.periode)} — Année scolaire ${d.settings.anneeScolaire}`} />
      <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th(d, { textAlign: 'left' })} rowSpan={2}>MATIÈRES</th>
              <th style={th(d)} rowSpan={2}>Coef</th>
              <th style={th(d)} colSpan={2}>Notes de classe</th>
              <th style={th(d)} rowSpan={2}>Moy. de classe</th>
              <th style={th(d)} rowSpan={2}>Notes de Comp.</th>
              <th style={th(d)} rowSpan={2}>Moy. Trimes.</th>
              <th style={th(d)} rowSpan={2}>Rang</th>
              <th style={th(d)} rowSpan={2}>Appréciations</th>
              <th style={th(d)} rowSpan={2}>Nom des Professeurs</th>
              <th style={th(d, { minWidth: 56 })} rowSpan={2}>Signat.</th>
            </tr>
            <tr>
              <th style={th(d)}>Interro</th>
              <th style={th(d)}>Devoir</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map(l => (
              <tr key={l.matiere.id}>
                <td style={td({ textAlign: 'left', fontWeight: 600 })}>{l.matiere.nom}</td>
                <td style={td()}>{l.matiere.coefficient}</td>
                <td style={td()}>{fmt(l.moyInterro)}</td>
                <td style={td()}>{fmt(l.moyDevoir)}</td>
                <td style={td()}>{fmt(l.moyClasse)}</td>
                <td style={td()}>{fmt(l.moyComp)}</td>
                <td style={td({ fontWeight: 700, color: couleurNote(l.moyDes2, d.couleurFond) })}>{fmt(l.moyDes2)}</td>
                <td style={td()}>{rangMatiere(l)}</td>
                <td style={td({ fontSize: 9 })}>{d.appreciation(l.moyDes2)}</td>
                <td style={td({ fontSize: 9, textAlign: 'left' })}>{profNom(l)}</td>
                <td style={td()} />
              </tr>
            ))}
            <tr style={{ background: d.accentPale, fontWeight: 800 }}>
              <td style={td({ textAlign: 'left' })}>TOTAL</td>
              <td style={td()}>{d.totalCoeff || '—'}</td>
              <td style={td()} colSpan={4} />
              <td style={td()}>{d.totalProduit ? d.totalProduit.toFixed(2) : '—'}</td>
              <td style={td()} colSpan={4} />
            </tr>
            <tr style={{ background: d.accentPale, fontWeight: 800 }}>
              <td style={td({ textAlign: 'left' })}>Moyennes</td>
              <td style={td()} colSpan={5} />
              <td style={td()}>{fmt(d.moyenneGenerale)}</td>
              <td style={td()} colSpan={4} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bas du bulletin, comme sur le bulletin papier du CEG */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.2fr', border: BORD, marginTop: 8, fontSize: 10 }}>
        {/* Haut gauche : assiduité / distinctions / sanctions */}
        <div style={{ padding: '4px 8px', borderRight: BORD, borderBottom: BORD }}>
          {['Retards', 'Félicitations', 'Absences', 'Punitions', "Tableau d'honneur", 'Avertissement', 'Blâme'].map(l => (
            <Souligne key={l} label={l} />
          ))}
        </div>

        {/* Haut milieu : moyennes des trimestres, annuelle, plus forte / plus faible */}
        <div style={{ padding: '4px 8px', borderRight: BORD, borderBottom: BORD }}>
          {Array.from({ length: d.nbPeriodes }, (_, i) => i + 1).map(p => (
            <MoyRang
              key={p}
              label={`Moy. du ${p === 1 ? '1er' : `${p}e`} Trim.`}
              stats={p <= d.periode ? d.stats[p] : null}
            />
          ))}
          <MoyRang label="Moy. annuelle" stats={d.annuel} />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, padding: '5px 0 2px', flexWrap: 'wrap' }}>
            <span>
              Moy. la plus forte : <b style={{ borderBottom: '1px solid currentColor', padding: '0 8px' }}>{fmt(cur?.maxi)}</b> /20
            </span>
            <span>
              Moy. la plus faible : <b style={{ borderBottom: '1px solid currentColor', padding: '0 8px' }}>{fmt(cur?.mini)}</b> /20
            </span>
          </div>
        </div>

        {/* Droite (sur les 2 lignes) : observations du chef d'établissement, date, directeur */}
        <div style={{ gridRow: '1 / span 2', gridColumn: 3, padding: '4px 8px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 9, fontWeight: 700, marginBottom: 4 }}>Observations du Chef d'Établissement</div>
          {[0, 1, 2].map(i => <div key={i} style={{ borderBottom: '1px dotted currentColor', height: 16 }} />)}
          <div style={{ marginTop: 'auto', paddingTop: 12 }}>
            <div>{d.settings.ville}, le ____/____/______</div>
            <div style={{ textAlign: 'center', marginTop: 6 }}>Le Directeur</div>
            <div style={{ height: 40 }} />
          </div>
        </div>

        {/* Bas gauche : titulaire */}
        <div style={{ padding: '4px 8px', borderRight: BORD, minHeight: 56 }}>
          <div style={{ fontSize: 8, fontWeight: 700 }}>Nom et Signature<br />du Titulaire de la Classe</div>
        </div>

        {/* Bas milieu : observations générales du conseil = la MENTION */}
        <div style={{ padding: '4px 8px', borderRight: BORD, minHeight: 56 }}>
          <div style={{ fontSize: 8, fontWeight: 700 }}>Observations Générales du Conseil des Profs.</div>
          <div style={{ fontSize: 13, fontWeight: 800, textAlign: 'center', paddingTop: 6 }}>
            {d.moyenneGenerale !== null ? d.mention : ''}
          </div>
        </div>
      </div>
    </Cadre>
  );
};

// ============================================================================
// Modèle « Standard (trimestre) » — d'après le bulletin de notes du Complexe Scolaire St MARTIAL
// ============================================================================
const CaseACocher: React.FC<{ label: React.ReactNode }> = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 0' }}>
    <span style={{ width: 9, height: 9, border: '1px solid currentColor', display: 'inline-block', flexShrink: 0 }} />
    <span>{label}</span>
  </div>
);

/** Ligne « Libellé : ........ » à remplir à la main. */
const Pointille: React.FC<{ label: string; haut?: number }> = ({ label, haut = 16 }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, minHeight: haut, padding: '2px 0' }}>
    <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
    <span style={{ flex: 1, borderBottom: '1px dotted currentColor', height: 10 }} />
  </div>
);

export const BulletinStandard: React.FC<{ d: BulletinData }> = ({ d }) => {
  const s = d.settings;
  const lignesCompteesPrincipales = d.lignes.filter(l => l.moyDes2 !== null && l.matiere.compteDansMoyenne !== false);
  const sousTotalCoef = lignesCompteesPrincipales.reduce((a, l) => a + l.matiere.coefficient, 0);
  const sousTotalProduit = lignesCompteesPrincipales.reduce((a, l) => a + (l.moyDes2 as number) * l.matiere.coefficient, 0);
  const cur = d.stats[d.periode];
  const periodes = Array.from({ length: d.nbPeriodes }, (_, i) => i + 1);
  const trimNom = (p: number) => (p === 1 ? '1er' : `${p}e`);

  const ligne = (label: string, l: LigneBulletin | null, key: string) => (
    <tr key={key}>
      <td style={td({ textAlign: 'left', fontWeight: 600 })}>{label}</td>
      <td style={td()}>{fmt(l?.moyInterro)}</td>
      <td style={td()}>{fmt(l?.moyDevoir)}</td>
      <td style={td({ opacity: 0.85 })}>{fmt(l?.moyClasse)}</td>
      <td style={td()}>{fmt(l?.moyComp)}</td>
      <td style={td({ fontWeight: 700, color: couleurNote(l?.moyDes2 ?? null, d.couleurFond) })}>{fmt(l?.moyDes2)}</td>
      <td style={td()}>{l ? l.matiere.coefficient : '—'}</td>
      <td style={td()}>{l && l.moyDes2 !== null ? (l.moyDes2 * l.matiere.coefficient).toFixed(2) : '—'}</td>
      <td style={td()}>{rangMatiere(l)}</td>
      <td style={td({ fontSize: 9, textAlign: 'left' })}>{profNom(l)}</td>
      <td style={td({ fontSize: 9 })}>{l ? d.appreciation(l.moyDes2) : '—'}</td>
      <td style={td({ minWidth: 60 })} />
    </tr>
  );

  const ok = d.moyenneGenerale !== null;

  return (
    <Cadre d={d}>
      {/* En-tête, comme sur le bulletin papier : logo + bloc centré à gauche, titre au centre, République à droite */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.25fr 1fr', gap: 10, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {s.logoUrl ? (
            <img src={s.logoUrl} alt="Logo" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : null}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.25 }}>{s.ministere}</div>
            <div style={{ width: 70, borderTop: '1px solid currentColor', margin: '3px auto' }} />
            <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800, fontSize: 16, lineHeight: 1.1, color: accentLisible(d) }}>{s.nomEcole}</div>
            <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>B.P:{s.bp} {s.ville}-{s.pays}</div>
            <div style={{ fontSize: 10, fontWeight: 700 }}>Tél: {s.telephone1}</div>
            {s.telephone2 ? <div style={{ fontSize: 10, fontWeight: 700 }}>{s.telephone2}</div> : null}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 17, fontWeight: 800, lineHeight: 1.15 }}>BULLETIN DE NOTES N° ....</div>
          <div style={{ fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4 }}>
            <span>DU</span>
            <span style={{ borderBottom: '1px dotted currentColor', minWidth: 70, textAlign: 'center', fontWeight: 800 }}>{d.periode === 1 ? '1er' : `${d.periode}e`}</span>
            <span>Trimestre</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, fontSize: 10, marginTop: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>Doublant <span style={{ width: 28, height: 17, border: '1px solid currentColor', display: 'inline-block' }} /></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>Nouveau <span style={{ width: 28, height: 17, border: '1px solid currentColor', display: 'inline-block' }} /></span>
          </div>
        </div>
        <div style={{ textAlign: 'center', alignSelf: 'start', fontSize: 10, fontWeight: 700 }}>
          <div>{s.republique.toUpperCase()}</div>
          <div style={{ fontWeight: 600, fontSize: 9, marginTop: 1 }}>{s.deviseNationale.toUpperCase()}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, fontSize: 11, margin: '10px 0 6px', flexWrap: 'wrap' }}>
        <div>Année scolaire <Trait large={110}>{s.anneeScolaire}</Trait></div>
        <div>Classe <Trait large={80}>{d.eleve.classe}</Trait></div>
        <div>Effectif <Trait large={50}>{d.effectif}</Trait></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, fontSize: 11, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, flex: 1 }}>
          <span style={{ whiteSpace: 'nowrap' }}>NOM ET PRÉNOMS DE L'ÉLÈVE :</span>
          <span style={{ flex: 1, borderBottom: '1px solid currentColor', fontWeight: 700, padding: '0 6px' }}>{d.eleve.nom} {d.eleve.prenom}</span>
        </div>
        <div>N°MLE <Trait large={90}>{'\u00a0'}</Trait></div>
      </div>

      {/* Tableau principal */}
      <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th(d, { textAlign: 'left' })}>MATIÈRES</th>
              <th style={th(d)}>Notes d'interro. sur 20</th>
              <th style={th(d)}>Notes de devoir sur 20</th>
              <th style={th(d)}>Moy. Class. sur 20</th>
              <th style={th(d)}>Notes de Comp. sur 20</th>
              <th style={th(d)}>Moy. des 2 Notes sur 20</th>
              <th style={th(d)}>Coef</th>
              <th style={th(d)}>Produit</th>
              <th style={th(d)}>Rang</th>
              <th style={th(d)}>NOM DES PROF.</th>
              <th style={th(d)}>APPRÉCIATIONS GÉN. DES PROFESSEURS</th>
              <th style={th(d, { minWidth: 60 })}>SIGNATURE</th>
            </tr>
          </thead>
          <tbody>
            {d.lignes.map(l => ligne(l.matiere.nom, l, l.matiere.id))}
            <tr style={{ background: d.accentPale, fontWeight: 700 }}>
              <td style={td({ textAlign: 'left' })}>TOTAL</td>
              <td style={td()} colSpan={5} />
              <td style={td()}>{sousTotalCoef || '—'}</td>
              <td style={td()}>{sousTotalProduit ? sousTotalProduit.toFixed(2) : '—'}</td>
              <td style={td()} colSpan={4} />
            </tr>
            <tr>
              <td colSpan={12} style={td({ fontWeight: 800, letterSpacing: 2, padding: '5px 4px', background: d.accentPale })}>MATIÈRES FACULTATIVES</td>
            </tr>
            {d.facultatives.map((f, i) => ligne(f.label, f.row, 'fac-' + i))}
          </tbody>
        </table>
      </div>

      {/* Résumé (à gauche) + observations (à droite), comme sur le papier */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 8, marginTop: 6, fontSize: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', alignSelf: 'start' }}>
          <tbody>
            {([
              ['MAJORATION :', '', true],
              ['TOTAL DES POINTS :', d.totalProduit ? <>{d.totalProduit.toFixed(2)} <span style={{ fontWeight: 400, fontSize: 8 }}>(coef {d.totalCoeff})</span></> : '—', true],
              ['Moyenne du Trimestre', ok ? <>{fmt(d.moyenneGenerale)} /20 <span style={{ fontWeight: 400, fontSize: 8 }}>({d.mention})</span></> : '—'],
              ['Classement du Trimestre', rangTxt(cur)],
              ['Moyenne annuelle', d.annuel ? `${fmt(d.annuel.moy)} /20` : ''],
              ['Classement annuel', d.annuel ? rangTxt(d.annuel) : ''],
            ] as [string, React.ReactNode, boolean?][]).map(([label, val, gras]) => (
              <tr key={label}>
                <td style={td({ textAlign: 'left', fontWeight: gras ? 800 : 600, width: '55%' })}>{label}</td>
                <td style={td({ fontWeight: 700 })}>{val}</td>
              </tr>
            ))}
            {/* Ajouts demandés : moyennes des trimestres, plus forte, plus faible, moyenne de la classe */}
            <tr style={{ background: d.accentPale }}>
              <td colSpan={2} style={td({ textAlign: 'left', fontWeight: 800, fontSize: 9 })}>MOYENNES</td>
            </tr>
            {periodes.map(p => (
              <tr key={'t' + p}>
                <td style={td({ textAlign: 'left', fontWeight: 600 })}>Moy. du {trimNom(p)} Trim.</td>
                <td style={td({ fontWeight: 700 })}>
                  {p <= d.periode && d.stats[p]?.moy !== null && d.stats[p]?.moy !== undefined
                    ? <>{fmt(d.stats[p].moy)} /20 <span style={{ fontWeight: 400, fontSize: 8 }}>({d.stats[p].rang ? `${ord(d.stats[p].rang as number)} / ${d.stats[p].total}` : '—'})</span></>
                    : ''}
                </td>
              </tr>
            ))}
            {([
              ['Moy. la plus forte', cur?.maxi],
              ['Moy. la plus faible', cur?.mini],
              ['Moy. de la classe', cur?.moyClasse],
            ] as [string, number | null | undefined][]).map(([label, v]) => (
              <tr key={label}>
                <td style={td({ textAlign: 'left', fontWeight: 600 })}>{label}</td>
                <td style={td({ fontWeight: 700 })}>{v !== null && v !== undefined ? `${fmt(v)} /20` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6 }}>
          <div>
            <div>Observation du Titulaire :</div>
            {[0, 1].map(i => <div key={i} style={{ borderBottom: '1px dotted currentColor', height: 20 }} />)}
          </div>
          <div>
            <div>Moyenne Annuelle en toutes lettres :</div>
            {[0, 1].map(i => <div key={i} style={{ borderBottom: '1px dotted currentColor', height: 20 }} />)}
          </div>
          <div>
            <div>Décision et Observation du Conseil :</div>
            {[0, 1].map(i => <div key={i} style={{ borderBottom: '1px dotted currentColor', height: 20 }} />)}
          </div>
        </div>
      </div>

      {/* Bas du bulletin : un seul cadre à 3 colonnes, comme sur le papier */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', border: BORD, marginTop: 8, fontSize: 10 }}>
        <div style={{ padding: '6px 8px', borderRight: BORD }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Pointille label="Assiduité" />
            <Pointille label="Conduite" />
            <Pointille label="Travail" />
            <Pointille label="Nbre de Retenues" />
            <Pointille label="Nbre d'absence" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
            <div>
              <CaseACocher label="Th + Félicitations" />
              <CaseACocher label="Th + Encouragement" />
              <CaseACocher label="Tableau d'honneur" />
              <CaseACocher label="Avertissement pour le travail" />
              <CaseACocher label="Blâme pour le travail" />
            </div>
            <div>
              <div style={{ fontWeight: 800, textDecoration: 'underline', marginBottom: 2 }}>RÉSULTAT</div>
              <CaseACocher label="Satisfaisant" />
              <CaseACocher label="Tout juste moyen" />
              <CaseACocher label="Médiocre, Nul" />
              <CaseACocher label="Très faible" />
              <CaseACocher label="Ne fait aucun effort" />
            </div>
          </div>
        </div>
        <div style={{ padding: '6px 8px', borderRight: BORD }}>
          <Pointille label="Passe en" haut={22} />
          <Pointille label="Double la" haut={22} />
          <div style={{ marginTop: 10 }}>
            <div>Exclu pour</div>
            <CaseACocher label={<i>Insuffisance de travail</i>} />
            <CaseACocher label={<i>Discipline</i>} />
          </div>
        </div>
        <div style={{ padding: '6px 8px', textAlign: 'center' }}>
          <div style={{ fontWeight: 800 }}>LE DIRECTEUR GÉNÉRAL</div>
          <div style={{ height: 70 }} />
        </div>
      </div>
    </Cadre>
  );
};
