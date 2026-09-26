import React from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TopbarProps {
  title: string;
  onNavigate: (page: string) => void;
  onMenuToggle: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ title, onMenuToggle }) => {
  const { user } = useAuth();

  return (
    <div className="topbar">
      {/* Burger menu - visible uniquement sur mobile */}
      <button className="btn btn-ghost btn-icon burger-btn" onClick={onMenuToggle} aria-label="Menu">
        <Menu size={20} />
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
      </div>

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer', flexShrink: 0 }}>
          <div className="avatar avatar-sm" style={{ background: 'var(--primary-pale)', color: 'var(--primary-light)', fontWeight: 700 }}>
            {user.prenom[0]}{user.nom[0]}
          </div>
          <span className="topbar-username" style={{ fontSize: 13, fontWeight: 600 }}>{user.prenom}</span>
        </div>
      )}
    </div>
  );
};

export default Topbar;
