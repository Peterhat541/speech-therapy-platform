import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { reportsAPI } from '../services/api';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

const STATUS_MAP = {
  scheduled: { label: 'Programada', badge: 'badge-blue' },
  completed: { label: 'Completada', badge: 'badge-green' },
  cancelled: { label: 'Cancelada', badge: 'badge-red' },
  no_show: { label: 'No asistió', badge: 'badge-yellow' },
};

const formatMonth = (m) => {
  if (!m) return '';
  const [y, mo] = m.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[parseInt(mo) - 1]}`;
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    reportsAPI.dashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!data) return null;

  const { stats, recentPatients, upcomingAppointments, appointmentsByMonth, revenueByMonth, exerciseCategories } = data;

  return (
    <div className="page-content">
      <div className="page-header" style={{ background: 'transparent', border: 'none', padding: '0 0 20px' }}>
        <div>
          <h2>Dashboard</h2>
          <p>Resumen general del centro de terapia</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => navigate('/appointments/new')}>
            + Nueva Cita
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">👥</div>
          <div>
            <div className="stat-value">{stats.totalPatients}</div>
            <div className="stat-label">Pacientes Activos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">📅</div>
          <div>
            <div className="stat-value">{stats.todayAppointments}</div>
            <div className="stat-label">Citas de Hoy</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">💰</div>
          <div>
            <div className="stat-value">${(stats.monthRevenue || 0).toLocaleString()}</div>
            <div className="stat-label">Ingresos del Mes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">⏳</div>
          <div>
            <div className="stat-value">{stats.pendingPayments}</div>
            <div className="stat-label">Pagos Pendientes</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid-2 mb-4">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Citas por Mes</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={appointmentsByMonth.map(d => ({ ...d, month: formatMonth(d.month) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Citas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Ingresos por Mes</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revenueByMonth.map(d => ({ ...d, month: formatMonth(d.month) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, 'Ingresos']} />
                <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Ingresos" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Upcoming appointments */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Próximas Citas</span>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/appointments')}>Ver todas</button>
          </div>
          <div className="table-container">
            {upcomingAppointments.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px' }}>
                <div>📅</div>
                <p>No hay citas próximas</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingAppointments.slice(0, 6).map(a => (
                    <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/appointments/${a.id}`)}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                            {a.patient_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          {a.patient_name}
                        </div>
                      </td>
                      <td>{a.date}</td>
                      <td>{a.time}</td>
                      <td><span className={`badge ${STATUS_MAP[a.status]?.badge || 'badge-gray'}`}>{STATUS_MAP[a.status]?.label || a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent patients + Exercise categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Pacientes Recientes</span>
              <button className="btn btn-sm btn-secondary" onClick={() => navigate('/patients')}>Ver todos</button>
            </div>
            <div className="card-body" style={{ padding: '12px 20px' }}>
              {recentPatients.map(p => (
                <div key={p.id} className="flex items-center gap-3" style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }} onClick={() => navigate(`/patients/${p.id}`)}>
                  <div className="avatar">
                    {p.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray">{p.diagnosis || 'Sin diagnóstico'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {exerciseCategories.length > 0 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Categorías de Ejercicios</span>
              </div>
              <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
                <PieChart width={200} height={160}>
                  <Pie data={exerciseCategories} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={65} label={({ category }) => category}>
                    {exerciseCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
