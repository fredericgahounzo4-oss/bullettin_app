export type Role = 'admin' | 'professeur';

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  avatar?: string;
  isActive?: boolean;
}

export interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  classe: string;
  photo?: string;
  status: 'actif' | 'inactif';
  adresse: string;
  telephone: string;
}

export interface Classe {
  id: string;
  nom: string;
  niveau: string;
  effectif: number;
  professeurPrincipalId: string;
  anneeScolaire: string;
  /** Couleur d'accent du bulletin, propre à cette classe. Vide = couleur par défaut de l'établissement. */
  couleurBulletin?: string;
  /** Couleur de fond du bulletin, propre à cette classe. Vide = couleur par défaut de l'établissement. */
  couleurFondBulletin?: string;
}

export interface Matiere {
  id: string;
  nom: string;
  coefficient: number;
  professeurId: string;
  classeId: string;
  couleur: string;
  /** true (défaut) : la matière, même facultative (EPS...), compte dans le total et la moyenne. */
  compteDansMoyenne?: boolean;
}

export interface Note {
  id: string;
  eleveId: string;
  matiereId: string;
  valeur: number;
  type: 'devoir' | 'examen' | 'interrogation';
  date: string;
  commentaire?: string;
  trimestre: 1 | 2 | 3;
  /** Vrai si saisie hors-ligne, en attente d'envoi au serveur. */
  pending?: boolean;
}
