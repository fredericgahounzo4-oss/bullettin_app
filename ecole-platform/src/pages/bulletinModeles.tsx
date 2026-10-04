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
const texteSur = (fond?: string) => (luminance(fond) > 0.5 ? '#0f172a' : '#ffffff');
/** Couleur d'accent pour du texte (titres) ; repli sur noir/blanc si elle se lit mal sur le fond. */
const accentLisible = (d: { accent: string; couleurFond?: string }) =>
  contraste(d.accent, d.couleurFond || '#ffffff') >= 3 ? d.accent : texteSur(d.couleurFond || '#ffffff');

const Cadre: React.FC<{ d: BulletinData; children: React.ReactNode }> = ({ d, children }) => (
  <div className="bulletin-scroll-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
    <div className="card bulletin-print" style={{ padding: '14px 18px', maxWidth: 920, minWidth: 680, margin: '0 auto', fontSize: 10, background: d.couleurFond, color: '#0f172a' }}>
      {children}
    </div>
  </div>
);

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
            <div style={{ fontSize: 9, color: 'rgba(15, 23, 42, 0.72)', lineHeight: 1.3 }}>
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
  padding: '3px 4px', fontSize: 8, textAlign: 'center', border: BORD, background: d.accent, color: texteSur(d.accent), verticalAlign: 'middle', ...extra,
});
const td = (extra?: React.CSSProperties): React.CSSProperties => ({ padding: '3px 4px', border: BORD, textAlign: 'center', ...extra });

const couleurNote = (v: number | null) =>
  v === null ? 'rgba(15, 23, 42, 0.45)' : v >= 14 ? 'var(--success)' : v >= 10 ? 'var(--warning)' : 'var(--danger)';

const Ligne: React.FC<{ label: string; value?: React.ReactNode; gras?: boolean }> = ({ label, value, gras }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, borderBottom: '1px dotted #94a3b8', padding: '3px 0', fontSize: 10 }}>
    <span style={{ color: 'rgba(15, 23, 42, 0.72)' }}>{label}</span>
    <span style={{ fontWeight: gras ? 800 : 600 }}>{value ?? ''}</span>
  </div>
);

const Boite: React.FC<{ titre: string; hauteur?: number }> = ({ titre, hauteur = 44 }) => (
  <div style={{ border: BORD, padding: 4, minHeight: hauteur }}>
    <div style={{ fontSize: 9, fontWeight: 700 }}>{titre}</div>
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
        <td style={td({ fontWeight: 700, color: couleurNote(l.moyDes2) })}>{fmt(l.moyDes2)}</td>
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
      <div style={{ fontSize: 8, textAlign: 'center', marginTop: 6, color: 'rgba(15, 23, 42, 0.6)' }}>
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
                <td style={td({ fontWeight: 700, color: couleurNote(l.moyDes2) })}>{fmt(l.moyDes2)}</td>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.2fr', gap: 8, marginTop: 8 }}>
        <div style={{ border: BORD, padding: '4px 8px' }}>
          {['Retards', 'Félicitations', 'Absences', 'Punitions', "Tableau d'honneur", 'Avertissement', 'Blâme'].map(l => (
            <Ligne key={l} label={l} />
          ))}
        </div>
        <div style={{ border: BORD, padding: '4px 8px' }}>
          {Array.from({ length: d.nbPeriodes }, (_, i) => i + 1).map(p => (
            <Ligne
              key={p}
              label={`Moy. du ${p === 1 ? '1er' : `${p}e`} trim. — Rang ${rangTxt(d.stats[p])}`}
              value={p <= d.periode ? fmt(d.stats[p]?.moy) : ''}
              gras={p === d.periode}
            />
          ))}
          <Ligne label={`Moy. annuelle — Rang ${rangTxt(d.annuel)}`} value={d.annuel ? fmt(d.annuel.moy) : ''} gras />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, padding: '4px 0 2px', fontSize: 10, flexWrap: 'wrap' }}>
            <span>
              Moy. la plus forte : <b style={{ borderBottom: '1px solid #0f172a', padding: '0 8px' }}>{fmt(cur?.maxi)}</b> /20
            </span>
            <span>
              Moy. la plus faible : <b style={{ borderBottom: '1px solid #0f172a', padding: '0 8px' }}>{fmt(cur?.mini)}</b> /20
            </span>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <Boite titre="Observations du Chef d'Établissement" hauteur={38} />
          <Boite titre="Observations générales du Conseil des Profs" hauteur={38} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10 }}>
        <div style={{ textAlign: 'center', minWidth: 200 }}>
          <div>Nom et signature du Titulaire de la classe</div>
          <div style={{ height: 34 }} />
        </div>
        <div style={{ textAlign: 'center', minWidth: 200 }}>
          <div>Le Directeur</div>
          <div style={{ height: 34 }} />
        </div>
      </div>
    </Cadre>
  );
};
