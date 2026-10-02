import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, BookOpen, FileText } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Eleve, Note, Classe, Matiere } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { fetchEleves, fetchNotes, fetchClasses, fetchMatieres } from '../api/resources';
import { errorMessage } from '../api/client';
import { classesDuProfesseur, elevesDuProfesseur } from '../utils/permissions';
import { moyenneEquilibree, moyenneDunGroupeDeleves } from '../utils/moyennes';

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

const computePerformanceData = (notes: Note[]) =>
  MOIS_LABELS.map((label, idx) => {
    const ns = notes.filter(n => new Date(n.date).getMonth() === idx);
    const moy = moyenneEquilibree(ns);
    return { mois: label, moyenne: moy !== null ? parseFloat(moy.toFixed(1)) : null };
  }).filter(row => row.moyenne !== null);

const Dashboard: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchEleves(), fetchNotes(), fetchClasses(), fetchMatieres()])
      .then(([e, n, c, m]) => {
        if (cancelled) return;
        setEleves(e); setNotes(n); setClasses(c); setMatieres(m);
      })
      .catch(err => { if (!cancelled) setError(errorMessage(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</div>;
  if (error) return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>{error}</div>;

  const performanceData = computePerformanceData(notes);
  const totalEleves = eleves.filter(e => e.status === 'actif').length;
  // Moyenne générale réelle : moyenne des moyennes individuelles de chaque élève
  // (chacune pondérée par coefficient de matière), pas un pool brut de toutes les notes
  // mélangées entre matières de coefficients différents.
  const moyenneGlobale = (() => {
    const elevesActifs = eleves.filter(e => e.status === 'actif');
    const m = moyenneDunGroupeDeleves(elevesActifs, classes, matieres, notes);
    return m !== null ? m.toFixed(1) : '—';
  })();
  const elevesList = eleves.slice(0, 5);

  // ----- Tableau de bord Professeur -----
  if (user?.role === 'professeur') {
    const mesClasses = classesDuProfesseur(user.id, classes, matieres);
    const mesEleves = elevesDuProfesseur(user.id, eleves, classes, matieres);
    const mesNotes = notes.filter(n => matieres.find(m => m.id === n.matiereId)?.professeurId === user.id);
    const mesNotesPerf = computePerformanceData(mesNotes);

    return (
      <div>
        <div className="page-header">
          <div className="flex items-center justify-between">
            <div>
              <div className="page-title">Bonjour, {user.prenom} 👋</div>
              <div className="page-subtitle">Espace Professeur — Année {settings.anneeScolaire}</div>
            </div>
          </div>
        </div>
        <div className="stats-grid">
          {[
            { label: 'Mes classes', value: String(mesClasses.length), icon: <BookOpen size={20} />, color: '#2563a8', bg: 'var(--primary-pale)' },
            { label: 'Élèves total', value: String(mesEleves.length), icon: <Users size={20} />, color: '#16a34a', bg: 'var(--success-pale)' },
            { label: 'Notes saisies', value: String(mesNotes.length), icon: <TrendingUp size={20} />, color: '#0891b2', bg: 'var(--info-pale)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: 20, color: s.color }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-header"><span style={{ fontWeight: 700 }}>Évolution des moyennes de mes matières</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mesNotesPerf}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="moyenne" stroke="#16a34a" fill="var(--success-pale)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // ----- Tableau de bord Admin -----
  return (
    <div>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="page-title">Tableau de bord</div>
            <div className="page-subtitle">Vue d'ensemble — Année scolaire {settings.anneeScolaire}</div>
          </div>
          <button className="btn btn-primary" onClick={() => onNavigate('bulletins')}>
            <FileText size={14} /> Voir les bulletins
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {[
          { label: 'Élèves actifs', value: totalEleves, icon: <Users size={20} />, color: '#2563a8', bg: 'var(--primary-pale)' },
          { label: 'Moyenne générale', value: moyenneGlobale + '/20', icon: <TrendingUp size={20} />, color: '#0891b2', bg: 'var(--info-pale)' },
          { label: 'Classes', value: classes.length, icon: <BookOpen size={20} />, color: '#7c3aed', bg: '#f3f0ff' },
          { label: 'Notes saisies', value: notes.length, icon: <FileText size={20} />, color: '#16a34a', bg: 'var(--success-pale)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><span style={{ fontWeight: 700 }}>Évolution des performances</span></div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => [String(typeof v === "number" ? v.toFixed(1) : v), ""]} />
              <Area type="monotone" dataKey="moyenne" stroke="#2563a8" fill="var(--primary-pale)" strokeWidth={2} dot={{ r: 3, fill: '#2563a8' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span style={{ fontWeight: 700 }}>Élèves récents</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('eleves')}>Voir tout</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nom</th><th>Classe</th><th>Statut</th></tr></thead>
            <tbody>
              {elevesList.map(e => (
                <tr key={e.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar avatar-sm" style={{ background: 'var(--primary-pale)', color: 'var(--primary-light)', fontWeight: 700 }}>{e.prenom[0]}{e.nom[0]}</div>
                      <span style={{ fontWeight: 600 }}>{e.prenom} {e.nom}</span>
                    </div>
                  </td>
                  <td>{e.classe}</td>
                  <td><span className={`badge badge-${e.status === 'actif' ? 'success' : 'neutral'}`}>{e.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
