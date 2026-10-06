/**
 * Convertit les réponses de l'API Django (snake_case, id numériques, objets
 * imbriqués) vers les types frontend existants (camelCase, id en string).
 * Ainsi, toutes les pages déjà écrites contre src/types/index.ts continuent
 * de fonctionner sans modification de leur logique d'affichage.
 */
import { User, Eleve, Classe, Matiere, Note } from '../types';

const s = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

export function mapUser(u: any): User {
  return { id: s(u.id), nom: u.nom, prenom: u.prenom, email: u.email, role: u.role, avatar: u.avatar || undefined, isActive: u.is_active };
}

export function mapClasse(c: any): Classe {
  return {
    id: s(c.id), nom: c.nom, niveau: c.niveau, effectif: c.effectif,
    professeurPrincipalId: s(c.professeur_principal), anneeScolaire: c.annee_scolaire,
    couleurBulletin: c.couleur_bulletin || undefined,
    couleurFondBulletin: c.couleur_fond_bulletin || undefined,
    modeleBulletin: c.modele_bulletin || 'standard',
    orientationBulletin: c.orientation_bulletin || 'portrait',
  };
}

export function mapMatiere(m: any): Matiere {
  return {
    id: s(m.id), nom: m.nom, coefficient: m.coefficient,
    professeurId: s(m.professeur), classeId: s(m.classe), couleur: m.couleur,
    compteDansMoyenne: m.compte_dans_moyenne !== false,
  };
}

export function mapEleve(e: any): Eleve {
  return {
    id: s(e.id), nom: e.nom, prenom: e.prenom, dateNaissance: e.date_naissance,
    classe: e.classe_nom, photo: e.photo || undefined,
    status: e.status, adresse: e.adresse, telephone: e.telephone,
  };
}

export function mapNote(n: any): Note {
  return {
    id: s(n.id), eleveId: s(n.eleve), matiereId: s(n.matiere),
    valeur: parseFloat(n.valeur), type: n.type, date: n.date,
    commentaire: n.commentaire || undefined, trimestre: n.trimestre,
  };
}
