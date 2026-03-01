import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  {
    section: 'Principal',
    items: [
      { to: '/', label: 'Dashboard', icon: '📊' },
      { to: '/appointments', label: 'Citas', icon: '📅' },
    ]
  },
  {
    section: 'Gestión',
    items: [
      { to: '/patients', label: 'Pacientes', icon: '👥' },
      { to: '/exercises', label: 'Ejercicios', icon: '🎯' },
      { to: '/payments', label: 'Pagos', icon: '💳' },
    ]
  },
  {
    section: 'Análisis',
    items: [
      { to: '/reports', label: 'Reportes', icon: '📈' },
    ]
  }
];

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🗣️</div>
        <div>
          <h1>TerapiaVoz</h1>
          <span>Centro de Terapia del Habla</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(section => (
          <div key={section.section} className="nav-section">
            <div className="nav-section-title">{section.section}</div>
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="user-avatar">{getInitials(user?.name)}</div>
        <div className="user-info">
          <div className="user-name">{user?.name}</div>
          <div className="user-role">{user?.role === 'admin' ? 'Administrador' : 'Terapeuta'}</div>
        </div>
        <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">⇤</button>
      </div>
    </aside>
  );
}
