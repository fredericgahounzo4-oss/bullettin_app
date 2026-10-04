import { Classe, ModeleBulletin } from '../types';

export const MODELES_BULLETIN: { key: ModeleBulletin; label: string; description: string }[] = [
  { key: 'standard', label: 'Standard (trimestre)', description: "Modèle par défaut de l'application, par trimestre." },
  { key: 'lycee_semestre', label: 'Lycée — Semestre (sections)', description: 'Matières littéraires / scientifiques / facultatives, moyennes mini-maxi, décision du conseil.' },
  { key: 'lycee_semestre_2', label: 'Lycée — Semestre (liste simple)', description: 'Liste unique des matières avec Int / Dev / Compo, signatures et assiduité.' },
  { key: 'college_trimestre', label: "Collège — Trimestre (bulletin d'évaluation)", description: 'Notes de classe, composition, moyennes des 3 trimestres et annuelle.' },
];

export const modeleDe = (c?: Pick<Classe, 'modeleBulletin'> | null): ModeleBulletin => c?.modeleBulletin || 'standard';
export const estSemestriel = (m: ModeleBulletin) => m === 'lycee_semestre' || m === 'lycee_semestre_2';
export const nbPeriodes = (m: ModeleBulletin) => (estSemestriel(m) ? 2 : 3);
export const periodesDe = (c?: Pick<Classe, 'modeleBulletin'> | null): (1 | 2 | 3)[] =>
  estSemestriel(modeleDe(c)) ? [1, 2] : [1, 2, 3];
export const periodeNom = (c: Pick<Classe, 'modeleBulletin'> | undefined | null, t: number) =>
  `${estSemestriel(modeleDe(c)) ? 'Semestre' : 'Trimestre'} ${t}`;
export const periodeCourt = (c: Pick<Classe, 'modeleBulletin'> | undefined | null, t: number) =>
  `${estSemestriel(modeleDe(c)) ? 'S' : 'T'}${t}`;
