import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { reportsAPI } from '../services/api';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

const formatMonth = (m) => {
  if (!m) return '';
  const [, mo] = m.split('-');
  return ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(mo) - 1];
};

export default function Reports() {
  const [dashboard, setDashboard] = useState(null);
  const [patientsReport, setPatientsReport] = useState(null);
  const [appointmentsReport, setAppointmentsReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    Promise.all([
      reportsAPI.dashboard(),
      reportsAPI.patients(),
      reportsAPI.appointments()
    ]).then(([d, p, a]) => {
      setDashboard(d);
      setPatientsReport(p);
      setAppointmentsReport(a);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Reportes y Estadísticas</h2>
          <p>Análisis de desempeño del centro</p>
        </div>
      </div>

      <div className="page-content">
        <div className="tabs">
          {[
            { id: 'overview', label: 'General' },
            { id: 'patients', label: 'Pacientes' },
            { id: 'appointments', label: 'Citas' },
            { id: 'revenue', label: 'Ingresos' },
          ].map(t => (
            <button key={t.id} className={`tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {activeTab === 'overview' && dashboard && (
          <div>
            {/* KPIs */}
            <div className="stats-grid mb-4">
              {[
                { icon: '👥', label: 'Pacientes Activos', value: dashboard.stats.totalPatients, color: 'blue' },
                { icon: '📅', label: 'Citas Hoy', value: dashboard.stats.todayAppointments, color: 'purple' },
                { icon: '💰', label: 'Ingresos del Mes', value: `$${(dashboard.stats.monthRevenue || 0).toLocaleString()}`, color: 'green' },
                { icon: '⚠️', label: 'Pagos Pendientes', value: dashboard.stats.pendingPayments, color: 'yellow' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className={`stat-icon ${s.color}`}>{s.icon}</div>
                  <div>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid-2">
              <div className="card">
                <div className="card-header"><span className="card-title">Citas por Mes</span></div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dashboard.appointmentsByMonth.map(d => ({ ...d, month: formatMonth(d.month) }))}>
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
                <div className="card-header"><span className="card-title">Ejercicios por Categoría</span></div>
                <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
                  <PieChart width={260} height={220}>
                    <Pie data={dashboard.exerciseCategories} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={85} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}>
                      {dashboard.exerciseCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'patients' && patientsReport && (
          <div>
            <div className="grid-2 mb-4">
              <div className="card">
                <div className="card-header"><span className="card-title">Pacientes por Estado</span></div>
                <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
                  <PieChart width={260} height={200}>
                    <Pie data={patientsReport.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, count }) => `${status}: ${count}`}>
                      {patientsReport.byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><span className="card-title">Nuevos Pacientes por Mes</span></div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={patientsReport.byMonth.map(d => ({ ...d, month: formatMonth(d.month) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} name="Pacientes" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Pacientes con Más Sesiones</span></div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Paciente</th>
                      <th>Diagnóstico</th>
                      <th>Sesiones Completadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientsReport.withMostSessions.map((p, i) => (
                      <tr key={p.id}>
                        <td><span className="badge badge-purple">{i + 1}</span></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                              {p.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                            {p.name}
                          </div>
                        </td>
                        <td className="text-gray text-sm">{p.diagnosis || '-'}</td>
                        <td><strong>{p.sessions}</strong> sesiones</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appointments' && appointmentsReport && (
          <div className="grid-2">
            <div className="card">
              <div className="card-header"><span className="card-title">Citas por Estado</span></div>
              <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
                <PieChart width={260} height={220}>
                  <Pie data={appointmentsReport.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={85} label={({ status, count }) => `${count}`}>
                    {appointmentsReport.byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Tasa de Cumplimiento</span></div>
              <div className="card-body">
                {appointmentsReport.completionRate && (
                  <div>
                    {[
                      { label: 'Total de Citas', value: appointmentsReport.completionRate.total, color: '#4f46e5' },
                      { label: 'Completadas', value: appointmentsReport.completionRate.completed, color: '#10b981' },
                      { label: 'Canceladas', value: appointmentsReport.completionRate.cancelled, color: '#ef4444' },
                      { label: 'No Asistió', value: appointmentsReport.completionRate.no_show, color: '#f59e0b' },
                    ].map(item => (
                      <div key={item.label} style={{ marginBottom: '16px' }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: '6px' }}>
                          <span className="font-medium text-sm">{item.label}</span>
                          <span className="font-semibold">{item.value}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${appointmentsReport.completionRate.total > 0 ? (item.value / appointmentsReport.completionRate.total) * 100 : 0}%`, background: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'revenue' && dashboard && (
          <div>
            <div className="card mb-4">
              <div className="card-header"><span className="card-title">Ingresos por Mes</span></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dashboard.revenueByMonth.map(d => ({ ...d, month: formatMonth(d.month) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v.toLocaleString()}`} />
                    <Tooltip formatter={v => [`$${v.toLocaleString()}`, 'Ingresos']} />
                    <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} name="Ingresos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">Resumen Financiero</span>
                <span className="badge badge-green">Mes actual</span>
              </div>
              <div className="card-body">
                <div className="grid-3">
                  {[
                    { label: 'Ingresos del Mes', value: `$${(dashboard.stats.monthRevenue || 0).toLocaleString()} MXN`, icon: '💰', color: 'green' },
                    { label: 'Por Cobrar', value: `$${(dashboard.stats.pendingPayments * 600).toLocaleString()} MXN`, icon: '⏳', color: 'yellow' },
                    { label: 'Citas Este Mes', value: dashboard.stats.todayAppointments + ' hoy', icon: '📅', color: 'blue' },
                  ].map(s => (
                    <div key={s.label} className="stat-card">
                      <div className={`stat-icon ${s.color}`}>{s.icon}</div>
                      <div>
                        <div className="stat-value" style={{ fontSize: '20px' }}>{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
