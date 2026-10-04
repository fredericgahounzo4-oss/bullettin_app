import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Langue, translations } from '../i18n';
import { useAuth } from './AuthContext';

export interface AppSettings {
  nomEcole: string;
  ville: string;
  pays: string;
  anneeScolaire: string;
  devise: string;
  langue: Langue;
  theme: 'clair' | 'sombre';
  emailNotif: boolean;
  smsNotif: boolean;
  /** Boîte postale de l'établissement, affichée sur les documents officiels (bulletins, reçus). */
  bp: string;
  telephone1: string;
  telephone2: string;
  /** En-tête ministériel affiché sur les bulletins (ex. "Ministère des Enseignements Primaire et Secondaire"). */
  ministere: string;
  /** Nom du pays tel qu'affiché sur les documents officiels (ex. "République Togolaise"). */
  republique: string;
  /** Devise nationale affichée sur les bulletins (ex. "Travail - Liberté - Patrie"). */
  deviseNationale: string;
  /** Couleur d'accent utilisée sur le bulletin de notes (en-tête, tableau, moyenne). */
  couleurBulletin: string;
  /** Couleur de fond de la page du bulletin de notes. */
  couleurFondBulletin: string;
  /** Logo/cachet de l'établissement (image encodée en base64), affiché en haut du bulletin. Vide = pas de logo (initiales affichées à la place). */
  logoUrl: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  nomEcole: 'Complexe Scolaire St Martial',
  ville: 'Lomé',
  pays: 'Togo',
  anneeScolaire: '2025-2026',
  devise: 'FCFA',
  langue: 'fr',
  theme: 'clair',
  emailNotif: true,
  smsNotif: false,
  bp: '5090',
  telephone1: '90 84 18 10',
  telephone2: '91 99 36 29',
  ministere: 'Ministère des Enseignements Primaire et Secondaire',
  republique: 'République Togolaise',
  deviseNationale: 'Travail - Liberté - Patrie',
  couleurBulletin: '#2563a8',
  couleurFondBulletin: '#ffffff',
  logoUrl: '',
};

const STORAGE_KEY = 'edumanage-settings';
// Le thème (clair/sombre) est une préférence PERSONNELLE, propre à chaque compte — jamais
// partagée. Stocké sous une clé distincte par utilisateur pour que deux comptes différents
// utilisés sur le même navigateur (ex. admin et professeur sur le même ordinateur) ne se
// "volent" jamais leur préférence l'un l'autre.
const themeStorageKey = (userId?: string) => `edumanage-theme-${userId || 'invite'}`;

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  t: (key: string) => string;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  t: (key: string) => key,
});

export const useSettings = () => useContext(SettingsContext);

const loadInitial = (): AppSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // ignore corrupted storage
  }
  return DEFAULT_SETTINGS;
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(loadInitial);

  // Dès qu'on sait qui est connecté (à la connexion, ou si on change de compte sur le même
  // navigateur), on charge LE THÈME DE CE COMPTE-LÀ spécifiquement — jamais celui laissé par
  // un autre compte utilisé avant sur cet ordinateur.
  useEffect(() => {
    const saved = localStorage.getItem(themeStorageKey(user?.id));
    setSettings(prev => ({ ...prev, theme: saved === 'sombre' ? 'sombre' : 'clair' }));
  }, [user?.id]);

  useEffect(() => {
    // Réglages de l'établissement (nom, logo, couleur par défaut...) : partagés, inchangé.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.classList.toggle('dark', settings.theme === 'sombre');
    document.documentElement.lang = settings.langue;
    // Thème : sauvegardé séparément, propre à l'utilisateur connecté.
    if (user?.id) localStorage.setItem(themeStorageKey(user.id), settings.theme);
  }, [settings, user?.id]);

  const updateSettings = (patch: Partial<AppSettings>) => setSettings(prev => ({ ...prev, ...patch }));

  const t = (key: string): string => translations[settings.langue]?.[key] ?? translations.fr[key] ?? key;

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, t }}>
      {children}
    </SettingsContext.Provider>
  );
};
