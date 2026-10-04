import { http, isQueuedResponse } from './client';
import { mapUser, mapClasse, mapMatiere, mapEleve, mapNote } from './mappers';
import { User, Eleve, Classe, Matiere, Note } from '../types';

/** Identifiant temporaire pour un enregistrement créé hors-ligne, en attente de synchronisation. */
const tempId = () => 'pending-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

// -------------------------------------------------------------- Auth
export async function apiLogin(email: string, password: string): Promise<{ access: string; refresh: string; user: User }> {
  const data = await http.post<any>('/auth/login/', { email, password });
  return { access: data.access, refresh: data.refresh, user: mapUser(data.user) };
}

export async function apiMe(): Promise<User> {
  return mapUser(await http.get<any>('/auth/me/'));
}

// ------------------------------------------------------------ Classes
export const fetchClasses = async (): Promise<Classe[]> => (await http.getAll<any>('/classes/')).map(mapClasse);
export const createClasse = async (payload: { nom: string; niveau: string; anneeScolaire: string }): Promise<Classe> =>
  mapClasse(await http.post<any>('/classes/', {
    nom: payload.nom, niveau: payload.niveau, annee_scolaire: payload.anneeScolaire,
  }));
export const updateClasse = async (id: string, payload: { professeurPrincipalId?: string | null; nom?: string; niveau?: string; effectif?: number; anneeScolaire?: string }): Promise<Classe> => {
  const body: Record<string, unknown> = {};
  if (payload.professeurPrincipalId !== undefined) body.professeur_principal = payload.professeurPrincipalId ? Number(payload.professeurPrincipalId) : null;
  if (payload.nom !== undefined) body.nom = payload.nom;
  if (payload.niveau !== undefined) body.niveau = payload.niveau;
  if (payload.effectif !== undefined) body.effectif = payload.effectif;
  if (payload.anneeScolaire !== undefined) body.annee_scolaire = payload.anneeScolaire;
  return mapClasse(await http.patch<any>(`/classes/${id}/`, body));
};
export const deleteClasse = async (id: string): Promise<void> => http.delete(`/classes/${id}/`);

/**
 * Personnalise la couleur du bulletin d'UNE classe. Accessible au titulaire de cette
 * classe (en plus de l'admin) via un endpoint dédié et restreint côté serveur — contrairement
 * aux autres informations de la classe (nom, niveau...), réservées à l'admin.
 */
export const updateClasseCouleur = async (
  id: string,
  payload: { couleurBulletin?: string; couleurFondBulletin?: string }
): Promise<Classe> => {
  const body: Record<string, unknown> = {};
  if (payload.couleurBulletin !== undefined) body.couleur_bulletin = payload.couleurBulletin;
  if (payload.couleurFondBulletin !== undefined) body.couleur_fond_bulletin = payload.couleurFondBulletin;
  return mapClasse(await http.patch<any>(`/classes/${id}/couleur/`, body));
};

// ----------------------------------------------------------- Matieres
export const fetchMatieres = async (): Promise<Matiere[]> => (await http.getAll<any>('/matieres/')).map(mapMatiere);
export const createMatiere = async (payload: Partial<Matiere>): Promise<Matiere> =>
  mapMatiere(await http.post<any>('/matieres/', {
    nom: payload.nom, coefficient: payload.coefficient,
    professeur: payload.professeurId ? Number(payload.professeurId) : null,
    classe: Number(payload.classeId), couleur: payload.couleur,
    compte_dans_moyenne: payload.compteDansMoyenne !== false,
  }));
export const updateMatiere = async (id: string, payload: Partial<Matiere>): Promise<Matiere> => {
  const body: Record<string, unknown> = {};
  if (payload.nom !== undefined) body.nom = payload.nom;
  if (payload.coefficient !== undefined) body.coefficient = payload.coefficient;
  if (payload.professeurId !== undefined) body.professeur = payload.professeurId ? Number(payload.professeurId) : null;
  if (payload.couleur !== undefined) body.couleur = payload.couleur;
  if (payload.compteDansMoyenne !== undefined) body.compte_dans_moyenne = payload.compteDansMoyenne;
  return mapMatiere(await http.patch<any>(`/matieres/${id}/`, body));
};
export const deleteMatiere = async (id: string): Promise<void> => http.delete(`/matieres/${id}/`);

// ------------------------------------------------------------- Eleves
export const fetchEleves = async (): Promise<Eleve[]> => (await http.getAll<any>('/eleves/')).map(mapEleve);
export const createEleve = async (payload: {
  nom: string; prenom: string; dateNaissance: string; classeId: string;
  status: string; adresse: string; telephone: string;
}): Promise<Eleve> =>
  mapEleve(await http.post<any>('/eleves/', {
    nom: payload.nom, prenom: payload.prenom, date_naissance: payload.dateNaissance,
    classe: Number(payload.classeId),
    status: payload.status, adresse: payload.adresse, telephone: payload.telephone,
  }));
export const updateEleve = async (id: string, payload: Record<string, unknown>): Promise<Eleve> =>
  mapEleve(await http.patch<any>(`/eleves/${id}/`, payload));
export const deleteEleve = async (id: string): Promise<void> => http.delete(`/eleves/${id}/`);

// -------------------------------------------------------------- Notes
export const fetchNotes = async (): Promise<Note[]> => (await http.getAll<any>('/notes/')).map(mapNote);
export const createNote = async (payload: {
  eleveId: string; matiereId: string; valeur: number; type: string; date: string; trimestre: number; commentaire?: string;
}): Promise<Note> => {
  const raw = await http.post<any>('/notes/', {
    eleve: Number(payload.eleveId), matiere: Number(payload.matiereId), valeur: payload.valeur,
    type: payload.type, date: payload.date, trimestre: payload.trimestre, commentaire: payload.commentaire || '',
  });
  if (isQueuedResponse(raw)) {
    // Hors-ligne : la requête a été mise en file par le service worker et
    // sera envoyée automatiquement à la reconnexion. On affiche la note
    // localement en attendant, marquée "pending".
    return {
      id: tempId(), eleveId: payload.eleveId, matiereId: payload.matiereId, valeur: payload.valeur,
      type: payload.type as Note['type'], date: payload.date, trimestre: payload.trimestre as Note['trimestre'],
      commentaire: payload.commentaire, pending: true,
    };
  }
  return mapNote(raw);
};
export const deleteNote = async (id: string): Promise<void> => http.delete(`/notes/${id}/`);
export const updateNote = async (id: string, payload: { valeur?: number; commentaire?: string; date?: string; type?: string }): Promise<Note> =>
  mapNote(await http.patch<any>(`/notes/${id}/`, payload));

// ---------------------------------------------------------------- Users
export const fetchUsersByRole = async (role: string): Promise<User[]> =>
  (await http.getAll<any>(`/auth/users/?role=${role}`)).map(mapUser);

export const createStaffUser = async (payload: {
  nom: string; prenom: string; email: string; role: 'professeur'; password?: string;
}): Promise<{ user: User; generatedPassword?: string }> => {
  const raw = await http.post<any>('/auth/users/', {
    nom: payload.nom, prenom: payload.prenom, email: payload.email, role: payload.role,
    ...(payload.password ? { password: payload.password } : {}),
  });
  return { user: mapUser(raw), generatedPassword: raw.generated_password };
};

export const setUserActive = async (id: string, isActive: boolean): Promise<User> =>
  mapUser(await http.patch<any>(`/auth/users/${id}/`, { is_active: isActive }));

export const resetUserPassword = async (id: string, password?: string): Promise<string> =>
  (await http.post<{ password: string }>(`/auth/users/${id}/reset_password/`, password ? { password } : {})).password;
