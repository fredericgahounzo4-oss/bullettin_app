import React, { useState, useEffect, useRef } from 'react';
import { Classe, Matiere, Eleve, Note, User } from '../types';
import { Check, X, Download, Users, TrendingUp, BookOpen, CheckCircle, Lock, Palette, Save, GraduationCap, Plus, Edit2, Trash2, Printer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { downloadElementAsPdf, downloadElementsAsPdf } from '../utils/pdfExport';
import {
  fetchClasses, fetchMatieres, fetchEleves, fetchNotes,
  fetchUsersByRole, createClasse, updateClasse, deleteClasse, updateClasseCouleur, createMatiere, updateMatiere, deleteMatiere,
} from '../api/resources';
import { errorMessage } from '../api/client';
import { mentionFor } from '../utils/mentions';
import { moyenneEquilibree, moyenneGeneraleEleve, moyenneDunGroupeDeleves, isFacultative } from '../utils/moyennes';

// ===== CLASSES =====
export const ClassesPage: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [classes, setClasses] = useState<Classe[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [professeurs, setProfesseurs] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editClasse, setEditClasse] = useState<Classe | null>(null);
  const [selectedProf, setSelectedProf] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Création / modification des infos de base d'une classe
  const [classeModalOpen, setClasseModalOpen] = useState<'new' | Classe | null>(null);
  const [classeForm, setClasseForm] = useState({ nom: '', niveau: '', anneeScolaire: '' });
  const [classeSaving, setClasseSaving] = useState(false);
  const [classeError, setClasseError] = useState<string | null>(null);

  // Gestion des matières
  const [matieresClasse, setMatieresClasse] = useState<Classe | null>(null);
  const [matForm, setMatForm] = useState({ nom: '', coefficient: '1', professeurId: '', couleur: '#2563a8' });
  const [editMatiere, setEditMatiere] = useState<Matiere | null>(null);
  const [matSaving, setMatSaving] = useState(false);
  const [matError, setMatError] = useState<string | null>(null);
  const matFormRef = useRef<HTMLDivElement>(null);

  const canManage = user?.role === 'admin';

  const load = () => {
    setLoading(true);
    Promise.all([fetchClasses(), fetchEleves(), fetchMatieres(), canManage ? fetchUsersByRole('professeur') : Promise.resolve([])])
      .then(([c, e, m, p]) => { setClasses(c); setEleves(e); setMatieres(m); setProfesseurs(p); })
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [canManage]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEditTitulaire = (c: Classe) => {
    setEditClasse(c);
    setSelectedProf(c.professeurPrincipalId || '');
    setSaveError(null);
  };

  const handleSaveTitulaire = async () => {
    if (!editClasse) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateClasse(editClasse.id, { professeurPrincipalId: selectedProf || null });
      setClasses(prev => prev.map(c => c.id === editClasse.id ? updated : c));
      setEditClasse(null);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openNewClasse = () => {
    setClasseModalOpen('new');
    setClasseForm({ nom: '', niveau: '', anneeScolaire: settings.anneeScolaire });
    setClasseError(null);
  };

  const openEditClasseInfo = (c: Classe) => {
    setClasseModalOpen(c);
    setClasseForm({ nom: c.nom, niveau: c.niveau, anneeScolaire: c.anneeScolaire });
    setClasseError(null);
  };

  const handleSaveClasseInfo = async () => {
    if (!classeModalOpen || !classeForm.nom || !classeForm.niveau || !classeForm.anneeScolaire) return;
    setClasseSaving(true);
    setClasseError(null);
    try {
      if (classeModalOpen === 'new') {
        const created = await createClasse({ nom: classeForm.nom, niveau: classeForm.niveau, anneeScolaire: classeForm.anneeScolaire });
        setClasses(prev => [...prev, created]);
      } else {
        const updated = await updateClasse(classeModalOpen.id, { nom: classeForm.nom, niveau: classeForm.niveau, anneeScolaire: classeForm.anneeScolaire });
        setClasses(prev => prev.map(c => c.id === updated.id ? updated : c));
      }
      setClasseModalOpen(null);
    } catch (err) {
      setClasseError(errorMessage(err));
    } finally {
      setClasseSaving(false);
    }
  };

  const handleDeleteClasse = async (c: Classe) => {
    if (!window.confirm(`Supprimer la classe "${c.nom}" ? Cette action est irréversible.`)) return;
    try {
      await deleteClasse(c.id);
      setClasses(prev => prev.filter(x => x.id !== c.id));
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  const openMatieres = (c: Classe) => {
    setMatieresClasse(c);
    setEditMatiere(null);
    setMatForm({ nom: '', coefficient: '1', professeurId: '', couleur: '#2563a8' });
    setMatError(null);
  };

  const openAddMatiere = () => {
    setEditMatiere(null);
    setMatForm({ nom: '', coefficient: '1', professeurId: '', couleur: '#2563a8' });
    setMatError(null);
  };

  const openEditMatiere = (m: Matiere) => {
    setEditMatiere(m);
    setMatForm({ nom: m.nom, coefficient: String(m.coefficient), professeurId: m.professeurId || '', couleur: m.couleur || '#2563a8' });
    setMatError(null);
    matFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSaveMatiere = async () => {
    if (!matieresClasse || !matForm.nom || !matForm.coefficient) return;
    setMatSaving(true);
    setMatError(null);
    try {
      if (editMatiere) {
        const updated = await updateMatiere(editMatiere.id, {
          nom: matForm.nom, coefficient: Number(matForm.coefficient),
          professeurId: matForm.professeurId || null as any, couleur: matForm.couleur,
        });
        setMatieres(prev => prev.map(m => m.id === editMatiere.id ? updated : m));
      } else {
        const created = await createMatiere({
          nom: matForm.nom, coefficient: Number(matForm.coefficient),
          professeurId: matForm.professeurId || undefined, classeId: matieresClasse.id, couleur: matForm.couleur,
        });
        setMatieres(prev => [...prev, created]);
      }
      openAddMatiere();
    } catch (err) {
      setMatError(errorMessage(err));
    } finally {
      setMatSaving(false);
    }
  };

  const handleDeleteMatiere = async (m: Matiere) => {
    if (!window.confirm(`Supprimer la matière "${m.nom}" ? Les notes associées seront aussi supprimées.`)) return;
    try {
      await deleteMatiere(m.id);
      setMatieres(prev => prev.filter(x => x.id !== m.id));
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  if (loading) return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</div>;
  if (error) return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>{error}</div>;

  const matieresDeLaClasse = matieresClasse ? matieres.filter(m => m.classeId === matieresClasse.id) : [];

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div><div className="page-title">Gestion des classes</div><div className="page-subtitle">{classes.length} classes — Année {settings.anneeScolaire}</div></div>
          {canManage && (
            <button className="btn btn-primary" onClick={openNewClasse}>
              <Plus size={14} /> Nouvelle classe
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {classes.map(c => {
          const effectifReel = eleves.filter(e => e.classe === c.nom).length;
          const nbMatieres = matieres.filter(m => m.classeId === c.id).length;
          return (
          <div key={c.id} className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{c.nom}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{c.niveau}</div>
              </div>
              <span className="badge badge-primary">{c.anneeScolaire}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              {[
                { label: 'Effectif', value: `${effectifReel} élèves`, icon: <Users size={14} /> },
                { label: 'Niveau', value: c.niveau, icon: <BookOpen size={14} /> },
                { label: 'Matières', value: `${nbMatieres}`, icon: <BookOpen size={14} /> },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>{row.icon} {row.label}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}><GraduationCap size={14} /> Titulaire</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {c.professeurPrincipalId ? (professeurs.find(p => p.id === c.professeurPrincipalId) ? `${professeurs.find(p => p.id === c.professeurPrincipalId)!.prenom} ${professeurs.find(p => p.id === c.professeurPrincipalId)!.nom}` : '—') : <span style={{ color: 'var(--text-light)', fontWeight: 500 }}>Non assigné</span>}
                </span>
              </div>
            </div>
            {canManage && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openMatieres(c)}>
                    Matières
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openEditTitulaire(c)}>
                    Titulaire
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openEditClasseInfo(c)}>
                    <Edit2 size={13} /> Modifier
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center', color: 'var(--danger)' }} onClick={() => handleDeleteClasse(c)}>
                    <Trash2 size={13} /> Supprimer
                  </button>
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Modal création / modification d'une classe */}
      {classeModalOpen && (
        <div className="modal-overlay" onClick={() => setClasseModalOpen(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{classeModalOpen === 'new' ? 'Nouvelle classe' : `Modifier ${classeModalOpen.nom}`}</div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setClasseModalOpen(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {classeError && <div style={{ background: 'var(--danger-pale)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{classeError}</div>}
              <div className="form-group">
                <label className="form-label">Nom de la classe *</label>
                <input className="form-control" value={classeForm.nom} onChange={e => setClasseForm(f => ({ ...f, nom: e.target.value }))} placeholder="6è A" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Niveau *</label>
                  <input className="form-control" value={classeForm.niveau} onChange={e => setClasseForm(f => ({ ...f, niveau: e.target.value }))} placeholder="collège" />
                </div>
                <div className="form-group">
                  <label className="form-label">Année scolaire *</label>
                  <input className="form-control" value={classeForm.anneeScolaire} onChange={e => setClasseForm(f => ({ ...f, anneeScolaire: e.target.value }))} placeholder="2025-2026" />
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                La couleur du bulletin de cette classe se change dans Paramètres → Couleur des bulletins par classe.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setClasseModalOpen(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSaveClasseInfo} disabled={classeSaving}>
                {classeSaving ? 'Enregistrement...' : classeModalOpen === 'new' ? 'Créer la classe' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal titulaire */}
      {editClasse && (
        <div className="modal-overlay" onClick={() => setEditClasse(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Titulaire de {editClasse.nom}</div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditClasse(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {saveError && <div style={{ background: 'var(--danger-pale)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{saveError}</div>}
              <div className="form-group">
                <label className="form-label">Professeur titulaire</label>
                <select className="form-control" value={selectedProf} onChange={e => setSelectedProf(e.target.value)}>
                  <option value="">Aucun titulaire</option>
                  {professeurs.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom} — {p.email}</option>)}
                </select>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  Le titulaire voit le bulletin complet de cette classe (toutes matières), même celles qu'il n'enseigne pas lui-même.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditClasse(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSaveTitulaire} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal matières de la classe */}
      {matieresClasse && (
        <div className="modal-overlay" onClick={() => setMatieresClasse(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Matières — {matieresClasse.nom}</div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setMatieresClasse(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {matieresDeLaClasse.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>Aucune matière pour cette classe.</div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  {matieresDeLaClasse.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: m.couleur, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.nom} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(coef. {m.coefficient})</span></div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {professeurs.find(p => p.id === m.professeurId) ? `${professeurs.find(p => p.id === m.professeurId)!.prenom} ${professeurs.find(p => p.id === m.professeurId)!.nom}` : 'Aucun professeur assigné'}
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditMatiere(m)} title="Modifier"><Edit2 size={13} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteMatiere(m)} title="Supprimer"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              )}

              <div ref={matFormRef} style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{editMatiere ? `Modifier "${editMatiere.nom}"` : 'Ajouter une matière'}</div>
                {matError && <div style={{ background: 'var(--danger-pale)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{matError}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nom de la matière *</label>
                    <input className="form-control" value={matForm.nom} onChange={e => setMatForm(f => ({ ...f, nom: e.target.value }))} placeholder="Mathématiques" />
                  </div>
                  <div className="form-group" style={{ maxWidth: 100 }}>
                    <label className="form-label">Coefficient *</label>
                    <input className="form-control" type="number" min={1} value={matForm.coefficient} onChange={e => setMatForm(f => ({ ...f, coefficient: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Professeur</label>
                    <select className="form-control" value={matForm.professeurId} onChange={e => setMatForm(f => ({ ...f, professeurId: e.target.value }))}>
                      <option value="">Aucun professeur assigné</option>
                      {professeurs.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ maxWidth: 90 }}>
                    <label className="form-label">Couleur</label>
                    <input className="form-control" type="color" value={matForm.couleur} onChange={e => setMatForm(f => ({ ...f, couleur: e.target.value }))} style={{ padding: 2, height: 38 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                  {editMatiere && <button className="btn btn-ghost" onClick={openAddMatiere}>Annuler la modification</button>}
                  <button className="btn btn-primary" onClick={handleSaveMatiere} disabled={matSaving}>
                    <Plus size={14} /> {matSaving ? 'Enregistrement...' : editMatiere ? 'Enregistrer' : 'Ajouter la matière'}
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setMatieresClasse(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== STATISTIQUES =====
export const StatistiquesPage: React.FC = () => {
  const [classes, setClasses] = useState<Classe[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchClasses(), fetchMatieres(), fetchEleves(), fetchNotes()])
      .then(([c, m, e, n]) => { if (!cancelled) { setClasses(c); setMatieres(m); setEleves(e); setNotes(n); } })
      .catch(err => { if (!cancelled) setError(errorMessage(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</div>;
  if (error) return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>{error}</div>;

  // Trimestre en cours = le plus avancé pour lequel des notes existent déjà. Les moyennes
  // générales (toutes pondérées par coefficient) doivent toujours porter sur UN SEUL
  // trimestre à la fois pour correspondre à une vraie moyenne de bulletin — jamais un
  // mélange de T1+T2+T3 qui ne correspond à aucune moyenne officielle réelle.
  const trimestreActuel = notes.length ? (Math.max(...notes.map(n => n.trimestre)) as 1 | 2 | 3) : 1;
  const notesTrimestreActuel = notes.filter(n => n.trimestre === trimestreActuel);

  // ----- Statistiques regroupées par niveau (Collège, Lycée, Primaire...) -----
  const niveaux = Array.from(new Set(classes.map(c => c.niveau)));
  const niveauStats = niveaux.map(niveau => {
    const classesDuNiveau = classes.filter(c => c.niveau === niveau);
    const nomsClasses = new Set(classesDuNiveau.map(c => c.nom));
    const elevesDuNiveau = eleves.filter(e => nomsClasses.has(e.classe));
    const moyenne = moyenneDunGroupeDeleves(elevesDuNiveau, classes, matieres, notesTrimestreActuel);
    return { niveau, nbClasses: classesDuNiveau.length, effectif: elevesDuNiveau.length, moyenne };
  });

  const NIVEAU_COLORS = ['#2563a8', '#16a34a', '#d97706', '#7c3aed', '#dc2626'];
  const niveauColor = (niveau: string) => NIVEAU_COLORS[niveaux.indexOf(niveau) % NIVEAU_COLORS.length];

  // ----- Moyennes par matière, par niveau -----
  const allMatiereNoms = Array.from(new Set(matieres.map(m => m.nom)));
  const matiereParNiveauData = allMatiereNoms.map(nom => {
    const row: Record<string, any> = { matiere: nom };
    niveaux.forEach(niveau => {
      const classeIdsNiveau = classes.filter(c => c.niveau === niveau).map(c => c.id);
      const matiereIds = matieres.filter(m => m.nom === nom && classeIdsNiveau.includes(m.classeId)).map(m => m.id);
      const ns = notes.filter(n => matiereIds.includes(n.matiereId));
      const moy = moyenneEquilibree(ns);
      row[niveau] = moy !== null ? parseFloat(moy.toFixed(1)) : null;
    });
    return row;
  }).filter(row => niveaux.some(niv => row[niv] !== null));

  // ----- Évolution mensuelle, par niveau -----
  const moisLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const evolutionParNiveauData = moisLabels.map((label, idx) => {
    const row: Record<string, any> = { mois: label };
    niveaux.forEach(niveau => {
      const nomsClassesNiveau = new Set(classes.filter(c => c.niveau === niveau).map(c => c.nom));
      const idsElevesNiveau = new Set(eleves.filter(e => nomsClassesNiveau.has(e.classe)).map(e => e.id));
      const ns = notes.filter(n => idsElevesNiveau.has(n.eleveId) && new Date(n.date).getMonth() === idx);
      const moy = moyenneEquilibree(ns);
      row[niveau] = moy !== null ? parseFloat(moy.toFixed(1)) : null;
    });
    return row;
  }).filter(row => niveaux.some(niv => row[niv] !== null && row[niv] !== undefined));

  // ----- Taux de réussite (part des élèves notés dont la moyenne générale est ≥ 10/20) -----
  const elevesAvecNotes = eleves.filter(e => notesTrimestreActuel.some(n => n.eleveId === e.id));
  const tauxReussite = elevesAvecNotes.length
    ? Math.round((elevesAvecNotes.filter(e => {
        const moy = moyenneGeneraleEleve(e.id, e.classe, classes, matieres, notesTrimestreActuel);
        return moy !== null && moy >= 10;
      }).length / elevesAvecNotes.length) * 100)
    : null;

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Statistiques & Rapports</div><div className="page-subtitle">Indicateurs de performance de l'établissement</div></div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        {[
          { label: 'Élèves total', value: eleves.length, icon: <Users size={20} />, color: '#2563a8', bg: 'var(--primary-pale)' },
          { label: 'Taux de réussite', value: tauxReussite !== null ? `${tauxReussite}%` : '—', icon: <CheckCircle size={20} />, color: '#16a34a', bg: 'var(--success-pale)' },
          { label: 'Moyenne globale', value: (() => { const m = moyenneDunGroupeDeleves(elevesAvecNotes, classes, matieres, notesTrimestreActuel); return m !== null ? m.toFixed(2) + '/20' : '—'; })(), icon: <TrendingUp size={20} />, color: '#0891b2', bg: 'var(--info-pale)' },
          { label: 'Notes saisies', value: notes.length, icon: <BookOpen size={20} />, color: '#d97706', bg: 'var(--warning-pale)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div><div className="stat-label">{s.label}</div><div className="stat-value" style={{ fontSize: 20, color: s.color }}>{s.value}</div></div>
          </div>
        ))}
      </div>

      {/* Performance par niveau */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><span style={{ fontWeight: 700 }}>Performance par niveau</span></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Niveau</th>
                <th>Classes</th>
                <th>Effectif</th>
                <th>Moyenne générale</th>
              </tr>
            </thead>
            <tbody>
              {niveauStats.map(n => (
                <tr key={n.niveau}>
                  <td style={{ fontWeight: 700 }}>{n.niveau}</td>
                  <td>{n.nbClasses}</td>
                  <td>{n.effectif}</td>
                  <td>
                    {n.moyenne !== null ? (
                      <span className={`badge badge-${n.moyenne >= 14 ? 'success' : n.moyenne >= 10 ? 'warning' : 'danger'}`}>
                        {n.moyenne.toFixed(2)}/20
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-light)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header"><span style={{ fontWeight: 700 }}>Moyennes par matière, par niveau</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={matiereParNiveauData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="matiere" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} interval={0} />
                <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [v !== null ? String(v) : '—', '']} />
                <Legend />
                {niveaux.map(niveau => (
                  <Bar key={niveau} dataKey={niveau} fill={niveauColor(niveau)} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span style={{ fontWeight: 700 }}>Évolution mensuelle, par niveau</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={evolutionParNiveauData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [v !== null ? String(v) : '—', '']} />
                <Legend />
                {niveaux.map(niveau => (
                  <Line key={niveau} type="monotone" dataKey={niveau} stroke={niveauColor(niveau)} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span style={{ fontWeight: 700 }}>Profil de compétences, par niveau</span></div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={matiereParNiveauData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="matiere" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 20]} tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v: any) => [v !== null ? String(v) : '—', '']} />
              <Legend />
              {niveaux.map(niveau => (
                <Radar key={niveau} name={niveau} dataKey={niveau} stroke={niveauColor(niveau)} fill={niveauColor(niveau)} fillOpacity={0.15} />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ===== BULLETINS =====

const appreciationFor = mentionFor;

const normalizeNom = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const hexToRgba = (hex: string, alpha: number) => {
  const clean = (hex || '#2563a8').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const bigint = parseInt(full, 16);
  if (Number.isNaN(bigint)) return `rgba(37, 99, 168, ${alpha})`;
  const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const FACULTATIVE_MATCHERS: { label: string; keywords: string[] }[] = [
  { label: 'EPS', keywords: ['eps', 'sport', 'education physique'] },
  { label: 'Dessin', keywords: ['dessin'] },
  { label: 'Enseign. Ménager', keywords: ['menager', 'menagere'] },
  { label: 'Langues Nation.', keywords: ['langue national'] },
  { label: 'Conduite', keywords: ['conduite'] },
];



export const BulletinPreview: React.FC<{ eleve: Eleve; classes: Classe[]; matieres: Matiere[]; notes: Note[]; eleves: Eleve[]; professeurs: User[]; trimestre: 1 | 2 | 3 }> = ({ eleve, classes, matieres, notes, eleves, professeurs, trimestre }) => {
  const { settings } = useSettings();
  const classeObj = classes.find(c => c.nom === eleve.classe);
  const allClasseMatieres = matieres.filter(m => m.classeId === classeObj?.id);
  const classeMatieres = allClasseMatieres.filter(m => !isFacultative(m.nom));
  const facultativeMatieresConfig = allClasseMatieres.filter(m => isFacultative(m.nom));
  const classeEleves = eleves.filter(e => e.classe === eleve.classe);

  // Pour une matière et un élève donnés :
  //   Moy Classe   = moyenne des interros et devoirs de CET élève (travail de classe)
  //   Moy de Comp  = moyenne de ses notes de composition/examen
  //   Notes Moy des 2 = moyenne de (Moy Classe, Moy de Comp) = moyenne finale de la matière
  // "Moy Classe" n'est PAS une comparaison avec les autres élèves — seul le
  // "Rang" compare l'élève à ses camarades, sur la base de sa moyenne finale.
  const avgOfType = (ns: Note[], type: Note['type']) => {
    const filtered = ns.filter(n => n.type === type);
    return filtered.length ? filtered.reduce((s, n) => s + n.valeur, 0) / filtered.length : null;
  };
  const subjectAverages = (eleveId: string, matiereId: string, tri: 1 | 2 | 3) => {
    const ns = notes.filter(n => n.eleveId === eleveId && n.matiereId === matiereId && n.trimestre === tri);
    const moyInterro = avgOfType(ns, 'interrogation');
    const moyDevoir = avgOfType(ns, 'devoir');
    const moyComp = avgOfType(ns, 'examen');
    const partiesClasse = [moyInterro, moyDevoir].filter((v): v is number => v !== null);
    const moyClasse = partiesClasse.length ? partiesClasse.reduce((s, v) => s + v, 0) / partiesClasse.length : null;
    const partiesFinal = [moyClasse, moyComp].filter((v): v is number => v !== null);
    const moyDes2 = partiesFinal.length ? partiesFinal.reduce((s, v) => s + v, 0) / partiesFinal.length : null;
    return { moyInterro, moyDevoir, moyComp, moyClasse, moyDes2 };
  };

  const computeRow = (m: Matiere) => {
    const { moyInterro, moyDevoir, moyComp, moyClasse, moyDes2 } = subjectAverages(eleve.id, m.id, trimestre);
    let rang: number | null = null;
    if (moyDes2 !== null) {
      const ranked = classeEleves
        .map(ce => ({ id: ce.id, moy: subjectAverages(ce.id, m.id, trimestre).moyDes2 }))
        .filter((x): x is { id: string; moy: number } => x.moy !== null)
        .sort((a, b) => b.moy - a.moy);
      rang = ranked.findIndex(x => x.id === eleve.id) + 1;
    }
    const prof = professeurs.find(p => p.id === m.professeurId);
    return { matiere: m, moyInterro, moyDevoir, moyComp, moyClasse, moyDes2, rang, totalClasse: classeEleves.length, prof };
  };

  const rowsData = classeMatieres.map(computeRow);

  const totalCoeff = rowsData.filter(r => r.moyDes2 !== null).reduce((s, r) => s + r.matiere.coefficient, 0);
  const totalProduit = rowsData.filter(r => r.moyDes2 !== null).reduce((s, r) => s + (r.moyDes2 as number) * r.matiere.coefficient, 0);
  const moyenneGenerale = totalCoeff ? totalProduit / totalCoeff : null;

  const facultativeRows = FACULTATIVE_MATCHERS.map(f => {
    const matched = facultativeMatieresConfig.find(m => f.keywords.some(k => normalizeNom(m.nom).includes(k)));
    return matched ? { label: matched.nom, row: computeRow(matched) } : { label: f.label, row: null };
  });

  const moyenneEleveTrimestre = (eleveId: string, tri: 1 | 2 | 3) => {
    const parties = classeMatieres.map(m => ({ avg: subjectAverages(eleveId, m.id, tri).moyDes2, coeff: m.coefficient })).filter((x): x is { avg: number; coeff: number } => x.avg !== null);
    if (!parties.length) return null;
    return parties.reduce((s, x) => s + x.avg * x.coeff, 0) / parties.reduce((s, x) => s + x.coeff, 0);
  };

  const classementGeneral = (() => {
    const ranked = classeEleves.map(ce => ({ id: ce.id, moy: moyenneEleveTrimestre(ce.id, trimestre) })).filter((x): x is { id: string; moy: number } => x.moy !== null).sort((a, b) => b.moy - a.moy);
    const idx = ranked.findIndex(x => x.id === eleve.id);
    return idx >= 0 ? `${idx + 1}${idx === 0 ? 'er' : 'ème'} / ${ranked.length}` : '—';
  })();

  const moyAnnuelleFor = (eleveId: string) => {
    // Moyenne annuelle = (T1 + T2 + T3) / 3 — seulement calculable, et donc
    // seulement affichée, une fois les 3 trimestres saisis (bulletin du 3e trimestre).
    const t1 = moyenneEleveTrimestre(eleveId, 1);
    const t2 = moyenneEleveTrimestre(eleveId, 2);
    const t3 = moyenneEleveTrimestre(eleveId, 3);
    if (t1 === null || t2 === null || t3 === null) return null;
    return (t1 + t2 + t3) / 3;
  };
  const moyenneAnnuelle = trimestre === 3 ? moyAnnuelleFor(eleve.id) : null;

  const classementAnnuel = (() => {
    if (trimestre !== 3) return '—';
    const ranked = classeEleves.map(ce => ({ id: ce.id, moy: moyAnnuelleFor(ce.id) })).filter((x): x is { id: string; moy: number } => x.moy !== null).sort((a, b) => b.moy - a.moy);
    const idx = ranked.findIndex(x => x.id === eleve.id);
    return idx >= 0 ? `${idx + 1}${idx === 0 ? 'er' : 'ème'} / ${ranked.length}` : '—';
  })();

  const mention = mentionFor(moyenneGenerale);

  // La classe peut personnaliser la couleur de son propre bulletin (réglée par son titulaire) ;
  // à défaut, on retombe sur la couleur par défaut de l'établissement.
  const accent = classeObj?.couleurBulletin || settings.couleurBulletin || '#2563a8';
  const couleurFond = classeObj?.couleurFondBulletin || settings.couleurFondBulletin;
  const accentPale = hexToRgba(accent, 0.12);

  const renderRow = (label: string, r: ReturnType<typeof computeRow> | null, key: string) => (
    <tr key={key} style={{ background: 'white' }}>
      <td style={{ padding: '3px 5px', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{label}</td>
      <td style={{ padding: '3px 5px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{r?.moyInterro !== null && r?.moyInterro !== undefined ? r.moyInterro.toFixed(2) : '—'}</td>
      <td style={{ padding: '3px 5px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{r?.moyDevoir !== null && r?.moyDevoir !== undefined ? r.moyDevoir.toFixed(2) : '—'}</td>
      <td style={{ padding: '3px 5px', textAlign: 'center', color: 'rgba(15, 23, 42, 0.72)', borderBottom: '1px solid var(--border)' }}>{r?.moyClasse !== null && r?.moyClasse !== undefined ? r.moyClasse.toFixed(2) : '—'}</td>
      <td style={{ padding: '3px 5px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{r?.moyComp !== null && r?.moyComp !== undefined ? r.moyComp.toFixed(2) : '—'}</td>
      <td style={{ padding: '3px 5px', textAlign: 'center', fontWeight: 700, borderBottom: '1px solid var(--border)', color: !r || r.moyDes2 === null ? 'var(--text-light)' : r.moyDes2 >= 14 ? 'var(--success)' : r.moyDes2 >= 10 ? 'var(--warning)' : 'var(--danger)' }}>
        {r?.moyDes2 !== null && r?.moyDes2 !== undefined ? r.moyDes2.toFixed(2) : '—'}
      </td>
      <td style={{ padding: '3px 5px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{r ? r.matiere.coefficient : '—'}</td>
      <td style={{ padding: '3px 5px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{r?.moyDes2 !== null && r?.moyDes2 !== undefined ? (r.moyDes2 * r.matiere.coefficient).toFixed(2) : '—'}</td>
      <td style={{ padding: '3px 5px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{r?.rang ? `${r.rang}/${r.totalClasse}` : '—'}</td>
      <td style={{ padding: '3px 5px', borderBottom: '1px solid var(--border)', fontSize: 9 }}>{r?.prof ? `${r.prof.prenom} ${r.prof.nom}` : '—'}</td>
      <td style={{ padding: '3px 5px', borderBottom: '1px solid var(--border)', fontSize: 9 }}>{r ? appreciationFor(r.moyDes2) : '—'}</td>
      <td style={{ padding: '3px 5px', borderBottom: '1px solid var(--border)' }} />
    </tr>
  );

  return (
    <div className="card bulletin-print" style={{ padding: '14px 18px', maxWidth: 920, margin: '0 auto', fontSize: 10, background: couleurFond }}>
      {/* En-tête officiel */}
      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 190px', gap: 8, alignItems: 'center', borderBottom: '2px solid var(--text)', paddingBottom: 6, marginBottom: 6 }}>
        {settings.logoUrl ? (
          <img src={settings.logoUrl} alt="Logo" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${accent}` }} />
        ) : (
          <div style={{ width: 52, height: 52, borderRadius: '50%', border: `2px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 7, fontWeight: 800, color: accent, lineHeight: 1.1, padding: 3 }}>
            {settings.nomEcole.split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 6).toUpperCase()}
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.3 }}>{settings.ministere}</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: accent, marginTop: 1 }}>{settings.nomEcole}</div>
          <div style={{ fontSize: 9, color: 'rgba(15, 23, 42, 0.72)', marginTop: 1, lineHeight: 1.3 }}>
            B.P: {settings.bp} {settings.ville}-{settings.pays}<br />
            Tél : {settings.telephone1}{settings.telephone2 ? <><br />{settings.telephone2}</> : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 9, fontWeight: 700 }}>
          <div>{settings.republique.toUpperCase()}</div>
          <div style={{ fontWeight: 400, fontSize: 8, marginTop: 1 }}>{settings.deviseNationale}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800 }}>BULLETIN DE NOTES N°....</div>
          <div style={{ fontSize: 10, marginTop: 1 }}>DU {trimestre}{trimestre === 1 ? 'er' : 'ème'} Trimestre</div>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 9 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 10, height: 10, border: '1px solid var(--text)', display: 'inline-block' }} /> Doublant</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 10, height: 10, border: '1px solid var(--text)', display: 'inline-block' }} /> Nouveau</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, fontSize: 10, marginBottom: 2 }}>
        <div>Année scolaire <b>{settings.anneeScolaire}</b></div>
        <div>Classe <b>{eleve.classe}</b></div>
        <div>Effectif <b>{classeEleves.length}</b></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 6, borderBottom: '1px solid var(--border)', paddingBottom: 5, flexWrap: 'wrap', gap: 6 }}>
        <div>Nom et prénoms de l'élève <b>{eleve.nom} {eleve.prenom}</b></div>
        <div>N° MLE <b>—</b></div>
      </div>

      {/* Tableau principal */}
      <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 2 }}>
          <thead>
            <tr style={{ background: accent, color: 'white' }}>
              <th style={{ padding: '3px 5px', textAlign: 'left', fontSize: 8 }}>Matières</th>
              <th style={{ padding: '3px 5px', textAlign: 'center', fontSize: 8 }}>Interro /20</th>
              <th style={{ padding: '3px 5px', textAlign: 'center', fontSize: 8 }}>Devoir /20</th>
              <th style={{ padding: '3px 5px', textAlign: 'center', fontSize: 8 }}>Moy classe /20</th>
              <th style={{ padding: '3px 5px', textAlign: 'center', fontSize: 8 }}>Moy comp /20</th>
              <th style={{ padding: '3px 5px', textAlign: 'center', fontSize: 8 }}>Moy des 2 /20</th>
              <th style={{ padding: '3px 5px', textAlign: 'center', fontSize: 8 }}>Coef</th>
              <th style={{ padding: '3px 5px', textAlign: 'center', fontSize: 8 }}>Produit</th>
              <th style={{ padding: '3px 5px', textAlign: 'center', fontSize: 8 }}>Rang</th>
              <th style={{ padding: '3px 5px', textAlign: 'left', fontSize: 8 }}>Prof</th>
              <th style={{ padding: '3px 5px', textAlign: 'left', fontSize: 8 }}>Appréc.</th>
              <th style={{ padding: '3px 5px', textAlign: 'left', fontSize: 8 }}>Signature</th>
            </tr>
          </thead>
          <tbody>
            {rowsData.map(r => renderRow(r.matiere.nom, r, r.matiere.id))}
            <tr style={{ background: accentPale, fontWeight: 700 }}>
              <td style={{ padding: '4px 5px' }}>TOTAL</td>
              <td colSpan={5} />
              <td style={{ padding: '4px 5px', textAlign: 'center' }}>{totalCoeff || '—'}</td>
              <td style={{ padding: '4px 5px', textAlign: 'center' }}>{totalProduit ? totalProduit.toFixed(2) : '—'}</td>
              <td colSpan={3} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Matières facultatives */}
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 10, margin: '6px 0 3px' }}>MATIÈRES FACULTATIVES</div>
      <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
          <tbody>
            {facultativeRows.map((f, i) => renderRow(f.label, f.row, 'fac-' + i))}
          </tbody>
        </table>
      </div>

      {/* Majoration / Observation du titulaire */}
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8, marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, marginBottom: 2 }}>MAJORATION</div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 5, minHeight: 20 }} />
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, marginBottom: 2 }}>OBSERVATION DU TITULAIRE</div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 5, minHeight: 20 }} />
        </div>
      </div>

      {/* Total des points */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 8, marginBottom: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 4 }}>TOTAL DES POINTS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {[
              ['Total des points', totalProduit ? totalProduit.toFixed(2) : '—'],
              ['Total des coefficients', String(totalCoeff || '—')],
              ['Moyenne du trimestre', moyenneGenerale !== null ? moyenneGenerale.toFixed(2) + '/20 (' + mention + ')' : '—'],
              ['Classement du trimestre', classementGeneral],
              ...(trimestre === 3 ? [
                ['Moyenne annuelle', moyenneAnnuelle !== null ? moyenneAnnuelle.toFixed(2) + '/20' : '—'],
                ['Classement annuel', classementAnnuel],
              ] : []),
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted var(--border)', paddingBottom: 2, fontSize: 10 }}>
                <span style={{ color: 'rgba(15, 23, 42, 0.72)' }}>{label}</span><span style={{ fontWeight: 700 }}>{val}</span>
              </div>
            ))}
          </div>
          <div>
            {trimestre === 3 && (
              <>
                <div style={{ fontSize: 9, color: 'rgba(15, 23, 42, 0.72)', marginBottom: 2 }}>Moyenne annuelle en toutes lettres</div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 5, minHeight: 16, marginBottom: 4, padding: 4, fontSize: 9 }} />
              </>
            )}
            <div style={{ fontSize: 9, color: 'rgba(15, 23, 42, 0.72)', marginBottom: 2 }}>Décision et observation du conseil</div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 5, minHeight: 16, padding: 4, fontSize: 9 }} />
          </div>
        </div>
      </div>

      {/* Assiduité / Décision */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 6, fontSize: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {['Travail', 'Conduite', "Nbre d'absences"].map(label => (
            <div key={label} style={{ display: 'flex', gap: 6, borderBottom: '1px dotted var(--border)', paddingBottom: 2 }}>
              <span style={{ color: 'rgba(15, 23, 42, 0.72)' }}>{label}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ display: 'flex', gap: 6, borderBottom: '1px dotted var(--border)', paddingBottom: 2, marginBottom: 3 }}><span style={{ color: 'rgba(15, 23, 42, 0.72)' }}>Passe en</span></div>
          <div style={{ display: 'flex', gap: 6, borderBottom: '1px dotted var(--border)', paddingBottom: 2, marginBottom: 3 }}><span style={{ color: 'rgba(15, 23, 42, 0.72)' }}>Double la</span></div>
          <div style={{ display: 'flex', gap: 6, borderBottom: '1px dotted var(--border)', paddingBottom: 2 }}><span style={{ color: 'rgba(15, 23, 42, 0.72)' }}>Exclu pour</span></div>
        </div>
      </div>

      {/* Résultat */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 8, marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 4, textAlign: 'center' }}>RÉSULTAT</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, fontSize: 9 }}>
          {[
            "Doit s'appliquer", 'Peut mieux faire', 'Travail satisfaisant', 'Bon travail', 'Excellent élève',
            'A fait des efforts', "Peu d'amélioration pour le travail", 'Elève faible', 'Ne fait aucun effort', 'Discipline insuffisante',
          ].map(m => (
            <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 8, height: 8, border: '1px solid var(--text)', display: 'inline-block', flexShrink: 0 }} /> {m}
            </div>
          ))}
        </div>
      </div>

      {/* Signatures */}
      <div style={{ display: 'flex', gap: 20, justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'rgba(15, 23, 42, 0.72)', marginBottom: 18 }}>Signature du Directeur</div>
          <div style={{ borderTop: '1px solid var(--text)', paddingTop: 3, fontSize: 9, color: 'rgba(15, 23, 42, 0.72)' }}>Cachet et signature</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'rgba(15, 23, 42, 0.72)', marginBottom: 18 }}>Signature du Parent</div>
          <div style={{ borderTop: '1px solid var(--text)', paddingTop: 3, fontSize: 9, color: 'rgba(15, 23, 42, 0.72)' }}>Signature</div>
        </div>
      </div>
    </div>
  );
};

// ===== GESTION DES BULLETINS =====

export const BulletinsPage: React.FC = () => {
  const [classes, setClasses] = useState<Classe[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [professeurs, setProfesseurs] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchClasses(), fetchMatieres(), fetchEleves(), fetchNotes(), fetchUsersByRole('professeur').catch(() => [] as User[])])
      .then(([c, m, e, n, p]) => { if (!cancelled) { setClasses(c); setMatieres(m); setEleves(e); setNotes(n); setProfesseurs(p); setSelectedClasse(prev => prev || c[0]?.id || ''); } })
      .catch(err => { if (!cancelled) setError(errorMessage(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const [selectedClasse, setSelectedClasse] = useState('');
  const [selectedTrimestre, setSelectedTrimestre] = useState<1 | 2 | 3>(1);
  const [viewEleve, setViewEleve] = useState<string | null>(null);
  const [viewAllClasse, setViewAllClasse] = useState(false);
  const [exporting, setExporting] = useState(false);
  const bulletinRef = useRef<HTMLDivElement>(null);
  const allBulletinRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const classeObj = classes.find(c => c.id === selectedClasse);
  const classeEleves = eleves.filter(e => e.classe === classeObj?.nom);

  const moyenneEleve = (eleveId: string) => {
    const classeMatieres = matieres.filter(m => m.classeId === selectedClasse && !isFacultative(m.nom));
    const eleveNotes = notes.filter(n => n.eleveId === eleveId && n.trimestre === selectedTrimestre);
    const parties = classeMatieres.map(m => {
      const avg = moyenneEquilibree(eleveNotes.filter(n => n.matiereId === m.id));
      return { avg, coeff: m.coefficient };
    }).filter((x): x is { avg: number; coeff: number } => x.avg !== null);
    if (!parties.length) return null;
    return parties.reduce((s, x) => s + x.avg * x.coeff, 0) / parties.reduce((s, x) => s + x.coeff, 0);
  };

  const bulletinFilename = (e: Eleve) => `bulletin-${e.nom}-${e.prenom}-T${selectedTrimestre}.pdf`.replace(/\s+/g, '_');

  const handleDownloadPdf = async () => {
    if (!bulletinRef.current || !viewEleveObj || exporting) return;
    setExporting(true);
    try {
      await downloadElementAsPdf(bulletinRef.current, bulletinFilename(viewEleveObj));
    } finally {
      setExporting(false);
    }
  };

  const handleQuickDownload = (eleveId: string) => {
    setViewEleve(eleveId);
    setTimeout(async () => {
      const el = bulletinRef.current;
      const e = eleves.find(x => x.id === eleveId);
      if (!el || !e) return;
      setExporting(true);
      try {
        await downloadElementAsPdf(el, bulletinFilename(e));
      } finally {
        setExporting(false);
      }
    }, 150);
  };

  const handleDownloadAllPdf = async () => {
    if (exporting) return;
    const elements = classeEleves.map(e => allBulletinRefs.current[e.id]).filter((el): el is HTMLDivElement => !!el);
    if (!elements.length) return;
    setExporting(true);
    try {
      await downloadElementsAsPdf(elements, `bulletins-${classeObj?.nom || 'classe'}-T${selectedTrimestre}.pdf`.replace(/\s+/g, '_'));
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</div>;
  if (error) return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>{error}</div>;

  const viewEleveObj = viewEleve ? eleves.find(e => e.id === viewEleve) : undefined;

  return (
    <div>
      <div className="no-print">
        <div className="page-header">
          <div className="flex items-center justify-between">
            <div><div className="page-title">Bulletins scolaires</div><div className="page-subtitle">Liste par classe — consultation et téléchargement</div></div>
            {classeEleves.length > 0 && (
              <button className="btn btn-accent" onClick={() => setTimeout(() => setViewAllClasse(true), 0)}>
                <Download size={14} /> Télécharger tous les bulletins ({classeEleves.length})
              </button>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">Classe</label>
              <select className="form-control" value={selectedClasse} onChange={e => setSelectedClasse(e.target.value)}>
                {classes.map(c => <option key={c.id} value={c.id}>{c.nom} — {c.niveau}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Trimestre</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {([1, 2, 3] as const).map(t => <button key={t} className={`btn ${selectedTrimestre === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSelectedTrimestre(t)}>T{t}</button>)}
              </div>
            </div>
          </div>
        </div>

        {/* Liste des élèves de la classe */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 700 }}>{classeObj?.nom} — {classeEleves.length} élève{classeEleves.length > 1 ? 's' : ''}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Élève</th>
                  <th>Moyenne générale</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classeEleves.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Aucun élève dans cette classe</td></tr>
                ) : classeEleves.map(e => {
                  const moy = moyenneEleve(e.id);
                  return (
                    <tr key={e.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar avatar-sm" style={{ background: 'var(--primary-pale)', color: 'var(--primary-light)', fontWeight: 700 }}>{e.prenom[0]}{e.nom[0]}</div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{e.prenom} {e.nom}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${moy === null ? 'neutral' : moy >= 14 ? 'success' : moy >= 10 ? 'warning' : 'danger'}`}>
                          {moy !== null ? moy.toFixed(2) + '/20' : '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setViewEleve(e.id)}>Voir le bulletin</button>
                        <button className="btn btn-accent btn-sm" onClick={() => handleQuickDownload(e.id)} disabled={exporting}><Download size={12} /> PDF</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Aperçu du bulletin sélectionné */}
      {viewEleve && viewEleveObj && (
        <div className="modal-overlay bulletin-modal-overlay" onClick={() => setViewEleve(null)}>
          <div className="modal bulletin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-header no-print">
              <div className="modal-title">Aperçu du bulletin</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><Printer size={13} /> Imprimer</button>
                <button className="btn btn-accent btn-sm" onClick={handleDownloadPdf} disabled={exporting}><Download size={13} /> {exporting ? 'Génération...' : 'Télécharger PDF'}</button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewEleve(null)}><X size={16} /></button>
              </div>
            </div>
            <div className="modal-body" style={{ background: 'var(--surface2)' }}>
              <div ref={bulletinRef}>
                <BulletinPreview eleve={viewEleveObj} classes={classes} matieres={matieres} notes={notes} eleves={eleves} professeurs={professeurs} trimestre={selectedTrimestre} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tous les bulletins de la classe, un par page dans un seul PDF */}
      {viewAllClasse && (
        <div className="modal-overlay bulletin-modal-overlay" onClick={() => setViewAllClasse(false)}>
          <div className="modal bulletin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-header no-print">
              <div className="modal-title">Tous les bulletins — {classeObj?.nom} ({classeEleves.length})</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-accent btn-sm" onClick={handleDownloadAllPdf} disabled={exporting}><Download size={13} /> {exporting ? 'Génération...' : 'Télécharger PDF (tout)'}</button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewAllClasse(false)}><X size={16} /></button>
              </div>
            </div>
            <div className="modal-body" style={{ background: 'var(--surface2)', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {classeEleves.map(e => (
                <div key={e.id} className="bulletin-page-break" ref={el => { allBulletinRefs.current[e.id] = el; }}>
                  <BulletinPreview eleve={e} classes={classes} matieres={matieres} notes={notes} eleves={eleves} professeurs={professeurs} trimestre={selectedTrimestre} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== SETTINGS =====
export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, t } = useSettings();
  const [tab, setTab] = useState<'general' | 'notifications' | 'securite' | 'apparence'>('general');
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [pwd, setPwd] = useState({ actuel: '', nouveau: '', confirmer: '' });
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Couleur du bulletin, personnalisable par classe
  const [classes, setClasses] = useState<Classe[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState('');
  const [classeCouleur, setClasseCouleur] = useState({ accent: '', fond: '' });
  const [classeCouleurSaving, setClasseCouleurSaving] = useState(false);
  const [classeCouleurSaved, setClasseCouleurSaved] = useState(false);
  const [classeCouleurError, setClasseCouleurError] = useState<string | null>(null);

  useEffect(() => {
    fetchClasses().then(cs => {
      setClasses(cs);
      setSelectedClasseId(prev => prev || cs[0]?.id || '');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const c = classes.find(cl => cl.id === selectedClasseId);
    if (c) {
      setClasseCouleur({
        accent: c.couleurBulletin || settings.couleurBulletin || '#2563a8',
        fond: c.couleurFondBulletin || settings.couleurFondBulletin || '#ffffff',
      });
      setClasseCouleurError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClasseId, classes.length]);

  const handleSaveClasseCouleur = async () => {
    if (!selectedClasseId) return;
    setClasseCouleurSaving(true);
    setClasseCouleurError(null);
    try {
      const updated = await updateClasseCouleur(selectedClasseId, { couleurBulletin: classeCouleur.accent, couleurFondBulletin: classeCouleur.fond });
      setClasses(prev => prev.map(c => c.id === updated.id ? updated : c));
      setClasseCouleurSaved(true);
      setTimeout(() => setClasseCouleurSaved(false), 2500);
    } catch (err) {
      setClasseCouleurError(errorMessage(err));
    } finally {
      setClasseCouleurSaving(false);
    }
  };

  const handleLogoUpload = (file: File | undefined) => {
    if (!file) return;
    setLogoError(null);
    if (file.size > 500 * 1024) {
      setLogoError('Image trop lourde (max 500 Ko). Utilisez une image plus légère, idéalement carrée.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setDraft(d => ({ ...d, logoUrl: String(reader.result) }));
    reader.onerror = () => setLogoError("Impossible de lire ce fichier.");
    reader.readAsDataURL(file);
  };

  const tabs: { id: typeof tab; labelKey: string }[] = [
    { id: 'general', labelKey: 'settings.tab.general' },
    { id: 'notifications', labelKey: 'settings.tab.notifications' },
    { id: 'securite', labelKey: 'settings.tab.securite' },
    { id: 'apparence', labelKey: 'settings.tab.apparence' },
  ];

  const handleSaveGeneral = () => {
    updateSettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleChangePwd = () => {
    if (!pwd.actuel || pwd.nouveau.length < 6 || pwd.nouveau !== pwd.confirmer) {
      setPwdMsg({ ok: false, text: t('settings.erreurMotDePasse') });
      return;
    }
    setPwdMsg({ ok: true, text: t('settings.motDePasseChange') });
    setPwd({ actuel: '', nouveau: '', confirmer: '' });
    setTimeout(() => setPwdMsg(null), 3000);
  };

  return (
    <div>
      <div className="page-header"><div className="page-title">{t('settings.title')}</div><div className="page-subtitle">{t('settings.subtitle')}</div></div>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
        <div className="card" style={{ padding: 0, alignSelf: 'start' }}>
          {tabs.map(item => (
            <div key={item.id} onClick={() => setTab(item.id)}
              style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === item.id ? 'var(--primary-pale)' : 'transparent', color: tab === item.id ? 'var(--primary-light)' : 'var(--text)', borderRadius: tab === item.id ? 'var(--radius-sm)' : 0, margin: 4 }}>
              {t(item.labelKey)}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {tab === 'general' && (
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 700 }}>{t('settings.etablissement')}</span></div>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('settings.nom')}</label>
                    <input className="form-control" value={draft.nomEcole} onChange={e => setDraft(d => ({ ...d, nomEcole: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('settings.annee')}</label>
                    <input className="form-control" value={draft.anneeScolaire} onChange={e => setDraft(d => ({ ...d, anneeScolaire: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('settings.ville')}</label>
                    <input className="form-control" value={draft.ville} onChange={e => setDraft(d => ({ ...d, ville: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('settings.pays')}</label>
                    <input className="form-control" value={draft.pays} onChange={e => setDraft(d => ({ ...d, pays: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Boîte postale (B.P.)</label>
                    <input className="form-control" value={draft.bp} onChange={e => setDraft(d => ({ ...d, bp: e.target.value }))} placeholder="5090" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Téléphone(s)</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="form-control" value={draft.telephone1} onChange={e => setDraft(d => ({ ...d, telephone1: e.target.value }))} placeholder="90 84 18 10" />
                      <input className="form-control" value={draft.telephone2} onChange={e => setDraft(d => ({ ...d, telephone2: e.target.value }))} placeholder="91 99 36 29" />
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ministère (en-tête bulletin)</label>
                    <input className="form-control" value={draft.ministere} onChange={e => setDraft(d => ({ ...d, ministere: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">République / devise nationale</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="form-control" value={draft.republique} onChange={e => setDraft(d => ({ ...d, republique: e.target.value }))} />
                      <input className="form-control" value={draft.deviseNationale} onChange={e => setDraft(d => ({ ...d, deviseNationale: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Logo / cachet de l'établissement</label>
                    {logoError && <div style={{ background: 'var(--danger-pale)', color: 'var(--danger)', padding: '6px 10px', borderRadius: 6, fontSize: 12, marginBottom: 8 }}>{logoError}</div>}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {draft.logoUrl ? (
                        <img src={draft.logoUrl} alt="Logo" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} />
                      ) : (
                        <div style={{ width: 56, height: 56, borderRadius: '50%', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text-light)', textAlign: 'center' }}>Aucun</div>
                      )}
                      <input type="file" accept="image/*" onChange={e => handleLogoUpload(e.target.files?.[0])} style={{ fontSize: 12 }} />
                      {draft.logoUrl && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(d => ({ ...d, logoUrl: '' }))}>Retirer</button>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Affiché en haut à gauche du bulletin. Idéalement une image carrée, moins de 500 Ko. Sans logo, les initiales de l'école sont affichées à la place.
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Couleur du bulletin de notes</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={draft.couleurBulletin} onChange={e => setDraft(d => ({ ...d, couleurBulletin: e.target.value }))} style={{ width: 44, height: 38, padding: 2, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }} />
                      <input className="form-control" value={draft.couleurBulletin} onChange={e => setDraft(d => ({ ...d, couleurBulletin: e.target.value }))} placeholder="#2563a8" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Couleur de fond du bulletin</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={draft.couleurFondBulletin} onChange={e => setDraft(d => ({ ...d, couleurFondBulletin: e.target.value }))} style={{ width: 44, height: 38, padding: 2, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }} />
                      <input className="form-control" value={draft.couleurFondBulletin} onChange={e => setDraft(d => ({ ...d, couleurFondBulletin: e.target.value }))} placeholder="#ffffff" />
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('settings.devise')}</label>
                    <select className="form-control" value={draft.devise} onChange={e => setDraft(d => ({ ...d, devise: e.target.value }))}>
                      <option value="FCFA">FCFA</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('settings.langue')}</label>
                    <select className="form-control" value={draft.langue} onChange={e => setDraft(d => ({ ...d, langue: e.target.value as 'fr' | 'en' }))}>
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
                  {saved && <span style={{ color: 'var(--success)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={14} /> {t('settings.enregistre')}</span>}
                  <button className="btn btn-primary" onClick={handleSaveGeneral}><Save size={14} /> {t('settings.enregistrer')}</button>
                </div>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 700 }}>{t('settings.tab.notifications')}</span></div>
              <div className="card-body">
                {[
                  { label: t('settings.notifEmail'), key: 'emailNotif' as const, desc: t('settings.notifEmailDesc') },
                  { label: t('settings.notifSms'), key: 'smsNotif' as const, desc: t('settings.notifSmsDesc') },
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.desc}</div>
                    </div>
                    <button onClick={() => updateSettings({ [item.key]: !settings[item.key] })}
                      style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: settings[item.key] ? 'var(--success)' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <div style={{ position: 'absolute', top: 3, left: settings[item.key] ? 22 : 2, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'securite' && (
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Lock size={15} /> {t('settings.tab.securite')}</span></div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">{t('settings.motDePasseActuel')}</label>
                  <input className="form-control" type="password" value={pwd.actuel} onChange={e => setPwd(p => ({ ...p, actuel: e.target.value }))} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('settings.nouveauMotDePasse')}</label>
                    <input className="form-control" type="password" value={pwd.nouveau} onChange={e => setPwd(p => ({ ...p, nouveau: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('settings.confirmerMotDePasse')}</label>
                    <input className="form-control" type="password" value={pwd.confirmer} onChange={e => setPwd(p => ({ ...p, confirmer: e.target.value }))} />
                  </div>
                </div>
                {pwdMsg && (
                  <div style={{ background: pwdMsg.ok ? 'var(--success-pale)' : 'var(--danger-pale)', color: pwdMsg.ok ? 'var(--success)' : 'var(--danger)', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                    {pwdMsg.text}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={handleChangePwd}>{t('settings.changerMotDePasse')}</button>
                </div>
              </div>
            </div>
          )}

          {tab === 'apparence' && (
            <>
              <div className="card">
                <div className="card-header"><span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Palette size={15} /> {t('settings.theme')}</span></div>
                <div className="card-body">
                  <div style={{ display: 'flex', gap: 12 }}>
                    {(['clair', 'sombre'] as const).map(th => (
                      <button key={th} onClick={() => updateSettings({ theme: th })}
                        className={`btn ${settings.theme === th ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ flex: 1, justifyContent: 'center', padding: '14px', border: settings.theme === th ? 'none' : '1px solid var(--border)' }}>
                        {th === 'clair' ? t('settings.themeClair') : t('settings.themeSombre')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Palette size={15} /> Couleur des bulletins par classe</span></div>
                <div className="card-body">
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0 }}>
                    Choisissez une classe pour personnaliser la couleur de son bulletin. Chaque classe garde sa
                    propre couleur ; une classe non personnalisée utilise la couleur par défaut de l'établissement
                    (onglet Général). Le titulaire de la classe peut aussi la modifier lui-même depuis sa page.
                  </p>
                  {classeCouleurError && <div style={{ background: 'var(--danger-pale)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{classeCouleurError}</div>}
                  <div className="form-group">
                    <label className="form-label">Classe</label>
                    <select className="form-control" value={selectedClasseId} onChange={e => setSelectedClasseId(e.target.value)}>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.nom}{c.couleurBulletin ? ' (personnalisée)' : ''}</option>)}
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Couleur d'accent</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="color" value={classeCouleur.accent} onChange={e => setClasseCouleur(f => ({ ...f, accent: e.target.value }))} style={{ width: 44, height: 38, padding: 2, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }} />
                        <input className="form-control" value={classeCouleur.accent} onChange={e => setClasseCouleur(f => ({ ...f, accent: e.target.value }))} placeholder="#2563a8" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Couleur de fond</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="color" value={classeCouleur.fond} onChange={e => setClasseCouleur(f => ({ ...f, fond: e.target.value }))} style={{ width: 44, height: 38, padding: 2, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }} />
                        <input className="form-control" value={classeCouleur.fond} onChange={e => setClasseCouleur(f => ({ ...f, fond: e.target.value }))} placeholder="#ffffff" />
                      </div>
                    </div>
                  </div>
                  <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 16 }}>
                    <div style={{ background: classeCouleur.fond, padding: 16 }}>
                      <div style={{ color: classeCouleur.accent, fontWeight: 800, fontSize: 14 }}>
                        Aperçu — {classes.find(c => c.id === selectedClasseId)?.nom || ''}
                      </div>
                      <div style={{ color: 'rgba(15, 23, 42, 0.72)', fontSize: 12, marginTop: 4 }}>Moyenne du trimestre : 14.50/20</div>
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={handleSaveClasseCouleur} disabled={classeCouleurSaving || !selectedClasseId}>
                    <Save size={14} /> {classeCouleurSaving ? 'Enregistrement...' : 'Enregistrer pour cette classe'}
                  </button>
                  {classeCouleurSaved && <span style={{ marginLeft: 12, color: 'var(--success)', fontSize: 13, fontWeight: 600 }}>✓ Enregistré</span>}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

// ===== TITULAIRE (professeur) =====
const getColorTitulaire = (v: number) => v >= 14 ? 'note-high' : v >= 10 ? 'note-mid' : 'note-low';

export const TitulairePage: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [classes, setClasses] = useState<Classe[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [professeurs, setProfesseurs] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClasse, setSelectedClasse] = useState('');
  const [selectedTrimestre, setSelectedTrimestre] = useState<1 | 2 | 3>(1);
  const [viewEleve, setViewEleve] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const bulletinRef = useRef<HTMLDivElement>(null);
  const [couleurModalOpen, setCouleurModalOpen] = useState(false);
  const [couleurForm, setCouleurForm] = useState({ accent: '#2563a8', fond: '#ffffff' });
  const [couleurSaving, setCouleurSaving] = useState(false);
  const [couleurError, setCouleurError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchClasses(), fetchMatieres(), fetchEleves(), fetchNotes(), fetchUsersByRole('professeur').catch(() => [] as User[])])
      .then(([c, m, e, n, prof]) => {
        if (cancelled) return;
        setClasses(c); setMatieres(m); setEleves(e); setNotes(n); setProfesseurs(prof);
        const mine = c.filter(cl => cl.professeurPrincipalId === user?.id);
        setSelectedClasse(prev => prev || mine[0]?.id || '');
      })
      .catch(err => { if (!cancelled) setError(errorMessage(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading) return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</div>;
  if (error) return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>{error}</div>;

  const mesClasses = classes.filter(c => c.professeurPrincipalId === user?.id);

  if (!mesClasses.length) {
    return (
      <div>
        <div className="page-header"><div className="page-title">Classe titulaire</div><div className="page-subtitle">Vue d'ensemble de votre classe</div></div>
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          Vous n'êtes titulaire d'aucune classe pour le moment.
        </div>
      </div>
    );
  }

  const classeObj = classes.find(c => c.id === selectedClasse) || mesClasses[0];
  const classeEleves = eleves.filter(e => e.classe === classeObj.nom);
  const classeMatieres = matieres.filter(m => m.classeId === classeObj.id && !isFacultative(m.nom));

  // Même méthode de calcul que le bulletin officiel : pour chaque matière,
  // Moy Classe = moyenne (interros + devoirs), Moy Comp = moyenne des compositions,
  // puis la moyenne finale de la matière = moyenne de (Moy Classe, Moy Comp).
  const avgFor = (eleveId: string, matiereId: string) =>
    moyenneEquilibree(notes.filter(n => n.eleveId === eleveId && n.matiereId === matiereId && n.trimestre === selectedTrimestre));
  const moyenneGeneraleEleve = (eleveId: string) => {
    const parties = classeMatieres.map(m => ({ avg: avgFor(eleveId, m.id), coeff: m.coefficient })).filter(x => x.avg !== null);
    if (!parties.length) return null;
    return parties.reduce((s, x) => s + (x.avg as number) * x.coeff, 0) / parties.reduce((s, x) => s + x.coeff, 0);
  };

  const moyennesValides = classeEleves.map(e => moyenneGeneraleEleve(e.id)).filter((v): v is number => v !== null);
  const moyenneClasse = moyennesValides.length ? moyennesValides.reduce((s, v) => s + v, 0) / moyennesValides.length : null;

  const viewEleveObj = viewEleve ? eleves.find(e => e.id === viewEleve) : undefined;

  const handleDownloadPdf = async () => {
    if (!bulletinRef.current || !viewEleveObj || exporting) return;
    setExporting(true);
    try {
      await downloadElementAsPdf(bulletinRef.current, `bulletin-${viewEleveObj.nom}-${viewEleveObj.prenom}-T${selectedTrimestre}.pdf`.replace(/\s+/g, '_'));
    } finally {
      setExporting(false);
    }
  };

  const openCouleurModal = () => {
    setCouleurForm({
      accent: classeObj.couleurBulletin || settings.couleurBulletin || '#2563a8',
      fond: classeObj.couleurFondBulletin || settings.couleurFondBulletin || '#ffffff',
    });
    setCouleurError(null);
    setCouleurModalOpen(true);
  };

  const handleSaveCouleur = async () => {
    setCouleurSaving(true);
    setCouleurError(null);
    try {
      const updated = await updateClasseCouleur(classeObj.id, { couleurBulletin: couleurForm.accent, couleurFondBulletin: couleurForm.fond });
      setClasses(prev => prev.map(c => c.id === updated.id ? updated : c));
      setCouleurModalOpen(false);
    } catch (err) {
      setCouleurError(errorMessage(err));
    } finally {
      setCouleurSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Classe titulaire — {classeObj.nom}</div><div className="page-subtitle">Vue complète : toutes les matières, tous les élèves</div></div>
        <button className="btn btn-ghost" onClick={openCouleurModal}>
          <Palette size={14} /> Couleur du bulletin
        </button>
      </div>

      {couleurModalOpen && (
        <div className="modal-overlay" onClick={() => setCouleurModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Couleur du bulletin — {classeObj.nom}</div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setCouleurModalOpen(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0 }}>
                Personnalisez les couleurs du bulletin de votre classe uniquement. Les autres classes
                de l'établissement gardent la couleur par défaut, sauf si leur propre titulaire la change aussi.
              </p>
              {couleurError && <div style={{ background: 'var(--danger-pale)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{couleurError}</div>}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Couleur d'accent</label>
                  <input type="color" className="form-control" style={{ height: 40, padding: 4 }} value={couleurForm.accent} onChange={e => setCouleurForm(f => ({ ...f, accent: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Couleur de fond</label>
                  <input type="color" className="form-control" style={{ height: 40, padding: 4 }} value={couleurForm.fond} onChange={e => setCouleurForm(f => ({ ...f, fond: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginTop: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ background: couleurForm.fond, padding: 16 }}>
                  <div style={{ color: couleurForm.accent, fontWeight: 800, fontSize: 14 }}>Aperçu — {classeObj.nom}</div>
                  <div style={{ color: 'rgba(15, 23, 42, 0.72)', fontSize: 12, marginTop: 4 }}>Moyenne du trimestre : 14.50/20</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setCouleurModalOpen(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSaveCouleur} disabled={couleurSaving}>
                {couleurSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {mesClasses.length > 1 && (
            <div style={{ minWidth: 200 }}>
              <label className="form-label">Classe (dont vous êtes titulaire)</label>
              <select className="form-control" value={selectedClasse} onChange={e => setSelectedClasse(e.target.value)}>
                {mesClasses.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="form-label">Trimestre</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {([1, 2, 3] as const).map(t => <button key={t} className={`btn ${selectedTrimestre === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSelectedTrimestre(t)}>T{t}</button>)}
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Effectif', value: classeEleves.length },
          { label: 'Moyenne de la classe', value: moyenneClasse !== null ? moyenneClasse.toFixed(2) + '/20' : '—' },
          { label: 'Matières', value: classeMatieres.length },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ flexDirection: 'column', gap: 4 }}>
            <div className="stat-label">{s.label}</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header"><span style={{ fontWeight: 700 }}>Notes de tous les élèves, toutes matières</span></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Élève</th>
                {classeMatieres.map(m => (
                  <th key={m.id} style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.couleur }} />
                      {m.nom}
                    </div>
                  </th>
                ))}
                <th style={{ textAlign: 'center' }}>Moy. générale</th>
                <th style={{ textAlign: 'right' }}>Bulletin</th>
              </tr>
            </thead>
            <tbody>
              {classeEleves.map(e => {
                const moyGen = moyenneGeneraleEleve(e.id);
                return (
                  <tr key={e.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar avatar-sm" style={{ background: 'var(--primary-pale)', color: 'var(--primary-light)', fontWeight: 700 }}>{e.prenom[0]}{e.nom[0]}</div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{e.prenom} {e.nom}</span>
                      </div>
                    </td>
                    {classeMatieres.map(m => {
                      const avg = avgFor(e.id, m.id);
                      return (
                        <td key={m.id} style={{ textAlign: 'center' }}>
                          <span className={avg !== null ? `${getColorTitulaire(avg)} font-bold` : ''} style={{ fontSize: 13, color: avg === null ? 'var(--text-light)' : undefined }}>
                            {avg !== null ? avg.toFixed(1) : '—'}
                          </span>
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge badge-${moyGen === null ? 'neutral' : moyGen >= 14 ? 'success' : moyGen >= 10 ? 'warning' : 'danger'}`}>
                        {moyGen !== null ? moyGen.toFixed(2) + '/20' : '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewEleve(e.id)}>Voir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {viewEleve && viewEleveObj && (
        <div className="modal-overlay bulletin-modal-overlay" onClick={() => setViewEleve(null)}>
          <div className="modal bulletin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-header no-print">
              <div className="modal-title">Bulletin</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><Printer size={13} /> Imprimer</button>
                <button className="btn btn-accent btn-sm" onClick={handleDownloadPdf} disabled={exporting}><Download size={13} /> {exporting ? 'Génération...' : 'Télécharger PDF'}</button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewEleve(null)}><X size={16} /></button>
              </div>
            </div>
            <div className="modal-body" style={{ background: 'var(--surface2)' }}>
              <div ref={bulletinRef}>
                <BulletinPreview eleve={viewEleveObj} classes={classes} matieres={matieres} notes={notes} eleves={eleves} professeurs={professeurs} trimestre={selectedTrimestre} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
