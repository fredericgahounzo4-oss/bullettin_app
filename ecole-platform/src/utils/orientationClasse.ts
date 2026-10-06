import { Classe, User } from '../types';
import { updateClasseCouleur } from '../api/resources';
import { errorMessage } from '../api/client';
import { isTitulaireDeClasse } from './permissions';

/** L'orientation d'une classe peut être changée par un admin ou par le professeur titulaire de cette classe. */
export const peutChangerOrientation = (user: User | null, classe: Classe | undefined): boolean =>
  !!user && !!classe && (user.role === 'admin' || isTitulaireDeClasse(user, classe));

/**
 * Change l'orientation (portrait / paysage) du bulletin d'une classe : l'aperçu change tout de suite,
 * puis le choix est enregistré sur le serveur. En cas d'échec, on revient à l'ancienne orientation.
 */
export async function changerOrientationClasse(
  classe: Classe,
  orientation: 'portrait' | 'paysage',
  setClasses: React.Dispatch<React.SetStateAction<Classe[]>>
): Promise<void> {
  const ancienne = classe.orientationBulletin || 'portrait';
  if (ancienne === orientation) return;
  setClasses(prev => prev.map(c => (c.id === classe.id ? { ...c, orientationBulletin: orientation } : c)));
  try {
    const maj = await updateClasseCouleur(classe.id, { orientationBulletin: orientation });
    setClasses(prev => prev.map(c => (c.id === maj.id ? maj : c)));
  } catch (err) {
    setClasses(prev => prev.map(c => (c.id === classe.id ? { ...c, orientationBulletin: ancienne } : c)));
    window.alert(errorMessage(err));
  }
}
