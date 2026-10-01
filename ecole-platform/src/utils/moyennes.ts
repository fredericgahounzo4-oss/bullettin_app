<<<<<<< HEAD
import { Note, Classe, Matiere } from '../types';
=======
import { Note } from '../types';
>>>>>>> f97770d (Fix: corrige le calcul exact Moy Interro / Moy Devoir dans l'utilitaire de moyenne)

const avgOfNotes = (ns: Note[]): number | null =>
  ns.length ? ns.reduce((s, n) => s + n.valeur, 0) / ns.length : null;

<<<<<<< HEAD
const normalizeNom = (nom: string) => nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const FACULTATIVE_KEYWORDS = [
  'eps', 'sport', 'education physique',
  'dessin',
  'menager', 'menagere',
  'langue national',
  'conduite',
];

/**
 * Une matière "facultative" (EPS, Dessin, Éducation ménagère, Langues nationales,
 * Conduite...) n'entre JAMAIS dans le calcul de la moyenne générale — exactement
 * comme sur le bulletin imprimé, où elle apparaît dans une section séparée
 * "Matières facultatives" sans compter dans le total des points/coefficients.
 */
export const isFacultative = (nomMatiere: string) => {
  const n = normalizeNom(nomMatiere);
  return FACULTATIVE_KEYWORDS.some(k => n.includes(k));
};

=======
>>>>>>> f97770d (Fix: corrige le calcul exact Moy Interro / Moy Devoir dans l'utilitaire de moyenne)
/**
 * Calcule la moyenne "officielle" d'un ensemble de notes, exactement comme sur le
 * bulletin imprimé :
 *   Moy Interro = moyenne des seules interrogations
 *   Moy Devoir  = moyenne des seuls devoirs
 *   Moy Classe  = moyenne de (Moy Interro, Moy Devoir)   <- 50/50 entre les deux, pas une
 *                 moyenne brute de toutes les interros+devoirs mélangés (sinon le type le
 *                 plus nombreux écraserait l'autre)
 *   Moy Comp    = moyenne des compositions / examens
 *   Résultat    = moyenne de (Moy Classe, Moy Comp)       <- même principe : 50/50 entre le
 *                 travail de classe et la composition, quel que soit le nombre de notes de
 *                 chaque catégorie.
 *
 * Utilisée partout dans l'app (saisie des notes, classe titulaire, tableau de bord,
 * statistiques) pour que la moyenne affichée soit toujours identique à celle du
 * bulletin officiel.
 */
export const moyenneEquilibree = (ns: Note[]): number | null => {
  const avgOfType = (type: Note['type']) => avgOfNotes(ns.filter(n => n.type === type));
  const moyInterro = avgOfType('interrogation');
  const moyDevoir = avgOfType('devoir');
  const partiesClasse = [moyInterro, moyDevoir].filter((v): v is number => v !== null);
  const moyClasse = partiesClasse.length ? partiesClasse.reduce((s, v) => s + v, 0) / partiesClasse.length : null;
  const moyComp = avgOfType('examen');
  const partiesFinal = [moyClasse, moyComp].filter((v): v is number => v !== null);
  return partiesFinal.length ? partiesFinal.reduce((s, v) => s + v, 0) / partiesFinal.length : null;
};

<<<<<<< HEAD
/**
 * Moyenne générale d'UN élève, pondérée par le coefficient de chaque matière de sa classe
 * — exactement le calcul utilisé sur son bulletin. Les matières facultatives sont exclues
 * (comme sur le bulletin). À ne jamais remplacer par une moyenne brute de toutes ses notes
 * mélangées : deux matières n'ont pas forcément le même poids (ex. Maths coef. 5 vs
 * Dessin coef. 1), donc un simple pool de notes fausserait le résultat.
 */
export const moyenneGeneraleEleve = (
  eleveId: string,
  classeNom: string,
  classes: Classe[],
  matieres: Matiere[],
  notes: Note[]
): number | null => {
  const classeObj = classes.find(c => c.nom === classeNom);
  if (!classeObj) return null;
  const matieresDeLaClasse = matieres.filter(m => m.classeId === classeObj.id && !isFacultative(m.nom));
  const parties = matieresDeLaClasse
    .map(m => ({ avg: moyenneEquilibree(notes.filter(n => n.eleveId === eleveId && n.matiereId === m.id)), coeff: m.coefficient }))
    .filter((x): x is { avg: number; coeff: number } => x.avg !== null);
  if (!parties.length) return null;
  return parties.reduce((s, x) => s + x.avg * x.coeff, 0) / parties.reduce((s, x) => s + x.coeff, 0);
};

/**
 * Moyenne de plusieurs élèves : moyenne de leurs moyennes générales individuelles
 * (chacune déjà pondérée par coefficient), PAS une moyenne brute de toutes leurs notes.
 */
export const moyenneDunGroupeDeleves = (
  eleves: { id: string; classe: string }[],
  classes: Classe[],
  matieres: Matiere[],
  notes: Note[]
): number | null => {
  const valeurs = eleves
    .map(e => moyenneGeneraleEleve(e.id, e.classe, classes, matieres, notes))
    .filter((v): v is number => v !== null);
  return valeurs.length ? valeurs.reduce((s, v) => s + v, 0) / valeurs.length : null;
};


=======
>>>>>>> f97770d (Fix: corrige le calcul exact Moy Interro / Moy Devoir dans l'utilitaire de moyenne)
