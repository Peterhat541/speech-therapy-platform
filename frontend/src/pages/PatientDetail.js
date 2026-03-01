import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientsAPI } from '../services/api';

const STATUS_MAP = {
  scheduled: { label: 'Programada', badge: 'badge-blue' },
  completed: { label: 'Completada', badge: 'badge-green' },
  cancelled: { label: 'Cancelada', badge: 'badge-red' },
  no_show: { label: 'No asistió', badge: 'badge-yellow' },
};

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    patientsAPI.get(id)
      .then(setPatient)
      .catch(() => navigate('/patients'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!patient) return null;

  function getAge(bd) {
    if (!bd) return '-';
    return Math.floor((Date.now() - new Date(bd).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) + ' años';
  }

  const initials = patient.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/patients')}>← Volver</button>
          <div>
            <h2>{patient.name}</h2>
            <p>Perfil del paciente</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/appointments/new?patient=${patient.id}`)}>
            + Nueva Cita
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Profile Card */}
          <div>
            <div className="card mb-4">
              <div className="card-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
                <div className="avatar" style={{ width: '72px', height: '72px', fontSize: '24px', margin: '0 auto 16px' }}>{initials}</div>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>{patient.name}</h3>
                <p className="text-gray">{patient.diagnosis || 'Sin diagnóstico'}</p>
                <span className={`badge ${patient.status === 'active' ? 'badge-green' : 'badge-gray'}`} style={{ marginTop: '10px' }}>
                  {patient.status === 'active' ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div style={{ borderTop: '1px solid #f3f4f6', padding: '20px' }}>
                {[
                  { icon: '📧', label: 'Email', value: patient.email || '-' },
                  { icon: '📞', label: 'Teléfono', value: patient.phone || '-' },
                  { icon: '🎂', label: 'Edad', value: getAge(patient.birth_date) },
                  { icon: '📅', label: 'Registro', value: patient.created_at?.split('T')[0] || '-' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3" style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '16px', width: '20px' }}>{item.icon}</span>
                    <div>
                      <div className="text-xs text-gray">{item.label}</div>
                      <div className="font-medium text-sm">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Exercise Progress */}
            {patient.exercises?.length > 0 && (
              <div className="card">
                <div className="card-header"><span className="card-title">Ejercicios Asignados</span></div>
                <div className="card-body">
                  {patient.exercises.map(ex => (
                    <div key={ex.id} style={{ marginBottom: '16px' }}>
                      <div className="flex justify-between items-center" style={{ marginBottom: '6px' }}>
                        <span className="font-medium text-sm">{ex.title}</span>
                        <span className={`badge badge-sm ${ex.status === 'completed' ? 'badge-green' : 'badge-blue'}`}>{ex.progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${ex.progress}%` }} />
                      </div>
                      <div className="text-xs text-gray" style={{ marginTop: '4px' }}>{ex.category}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div>
            <div className="card">
              <div className="card-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
                <div className="tabs" style={{ margin: '0', width: '100%' }}>
                  {[
                    { id: 'info', label: 'Información' },
                    { id: 'appointments', label: `Citas (${patient.appointments?.length || 0})` },
                    { id: 'payments', label: `Pagos (${patient.payments?.length || 0})` },
                  ].map(tab => (
                    <button key={tab.id} className={`tab${activeTab === tab.id ? ' active' : ''}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
                  ))}
                </div>
              </div>
              <div className="card-body">
                {activeTab === 'info' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Diagnóstico</label>
                      <p style={{ fontSize: '14px', color: 'var(--gray-700)' }}>{patient.diagnosis || 'No especificado'}</p>
                    </div>
                    {patient.notes && (
                      <div className="form-group">
                        <label className="form-label">Notas</label>
                        <p style={{ fontSize: '14px', color: 'var(--gray-700)', whiteSpace: 'pre-wrap' }}>{patient.notes}</p>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'appointments' && (
                  <div>
                    {patient.appointments?.length === 0 ? (
                      <div className="empty-state"><p>Sin citas registradas</p></div>
                    ) : (
                      patient.appointments.map(a => (
                        <div key={a.id} className="flex items-center justify-between" style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                          <div>
                            <div className="font-medium">{a.date} — {a.time}</div>
                            <div className="text-sm text-gray">{a.type === 'session' ? 'Sesión' : a.type} · {a.duration} min</div>
                          </div>
                          <span className={`badge ${STATUS_MAP[a.status]?.badge || 'badge-gray'}`}>{STATUS_MAP[a.status]?.label || a.status}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {activeTab === 'payments' && (
                  <div>
                    {patient.payments?.length === 0 ? (
                      <div className="empty-state"><p>Sin pagos registrados</p></div>
                    ) : (
                      patient.payments.map(p => (
                        <div key={p.id} className="flex items-center justify-between" style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                          <div>
                            <div className="font-medium">${p.amount.toLocaleString()} {p.currency}</div>
                            <div className="text-sm text-gray">{p.description}</div>
                          </div>
                          <span className={`badge ${p.status === 'paid' ? 'badge-green' : 'badge-yellow'}`}>
                            {p.status === 'paid' ? 'Pagado' : 'Pendiente'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
