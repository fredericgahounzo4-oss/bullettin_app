import React, { useState, useEffect } from 'react';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { ConnectivityProvider } from './context/ConnectivityContext';
import OfflineBanner from './components/OfflineBanner';
import LoginPage from './pages/LoginPage';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import ElevesPage from './pages/ElevesPage';
import UtilisateursPage from './pages/UtilisateursPage';
import NotesPage from './pages/NotesPage';
import {
  ClassesPage, StatistiquesPage, BulletinsPage, SettingsPage, TitulairePage
} from './pages/OtherPages';

const PAGE_TITLE_KEYS: Record<string, string> = {
  dashboard: 'nav.dashboard',
  eleves: 'nav.eleves',
  utilisateurs: 'nav.utilisateurs',
  classes: 'nav.classes',
  notes: 'nav.notes',
  statistiques: 'nav.statistiques',
  bulletins: 'nav.bulletins',
  titulaire: 'nav.titulaire',
  settings: 'nav.settings',
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { t } = useSettings();
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Bloquer le scroll du body quand la sidebar est ouverte sur mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
        Chargement...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleNavigate = (page: string) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} />;
      case 'eleves': return <ElevesPage />;
      case 'utilisateurs': return <UtilisateursPage />;
      case 'classes': return <ClassesPage />;
      case 'notes': return <NotesPage />;
      case 'statistiques': return <StatistiquesPage />;
      case 'bulletins': return <BulletinsPage />;
      case 'titulaire': return <TitulairePage />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-content">
        <OfflineBanner />
        <Topbar
          title={t(PAGE_TITLE_KEYS[activePage] || 'nav.dashboard')}
          onNavigate={handleNavigate}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="page-content">
          {renderPage()}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <ConnectivityProvider>
    <AuthProvider>
      {/* SettingsProvider doit être À L'INTÉRIEUR de AuthProvider : le thème (clair/sombre)
          est une préférence personnelle par compte, pas un réglage partagé — il a donc
          besoin de savoir qui est connecté pour ne jamais le mélanger entre deux comptes
          utilisés sur le même navigateur (ex. admin et professeur sur le même ordinateur). */}
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AuthProvider>
  </ConnectivityProvider>
);

export default App;
