import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { appointmentsAPI, patientsAPI } from '../services/api';
import { useNotification } from '../hooks/useNotification';

const STATUS_MAP = {
  scheduled: { label: 'Programada', badge: 'badge-blue' },
  completed: { label: 'Completada', badge: 'badge-green' },
  cancelled: { label: 'Cancelada', badge: 'badge-red' },
  no_show: { label: 'No asistió', badge: 'badge-yellow' },
};

const HOURS = Array.from({ length: 11 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

function AppointmentModal({ appointment, onClose, onSave }) {
  const [searchParams] = useSearchParams();
  const defaultPatient = searchParams.get('patient') || '';
  const [form, setForm] = useState(appointment || {
    patient_id: defaultPatient, date: new Date().toISOString().split('T')[0],
    time: '09:00', duration: 60, type: 'session', notes: ''
  });
  const [patients, setPatients] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    patientsAPI.list({ status: 'active' }).then(setPatients).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (appointment?.id) {
        await appointmentsAPI.update(appointment.id, form);
      } else {
        await appointmentsAPI.create(form);
      }
      onSave();
    } catch (err) {
      alert(err.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{appointment?.id ? 'Editar Cita' : 'Nueva Cita'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Paciente *</label>
              <select className="form-select" value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} required>
                <option value="">Seleccionar paciente</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Fecha *</label>
                <input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Hora *</label>
                <select className="form-select" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Duración (minutos)</label>
                <select className="form-select" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) }))}>
                  {[30, 45, 60, 90].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="session">Sesión</option>
                  <option value="evaluation">Evaluación</option>
                  <option value="follow_up">Seguimiento</option>
                </select>
              </div>
            </div>
            {appointment?.id && (
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Notas</label>
              <textarea className="form-textarea" value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observaciones de la cita..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const { notify, NotificationComponent } = useNotification();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('new') === '1') setShowModal(true);
  }, [searchParams]);

  const fetchAppointments = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filterDate) params.date = filterDate;
    if (filterStatus) params.status = filterStatus;
    appointmentsAPI.list(params)
      .then(setAppointments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterDate, filterStatus]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleSave = () => {
    setShowModal(false);
    setEditingAppt(null);
    fetchAppointments();
    notify('Cita guardada exitosamente');
  };

  const handleEdit = (a, e) => {
    e.stopPropagation();
    setEditingAppt(a);
    setShowModal(true);
  };

  const handleStatusChange = async (a, status, e) => {
    e.stopPropagation();
    try {
      await appointmentsAPI.update(a.id, { status });
      fetchAppointments();
      notify('Estado actualizado');
    } catch {
      notify('Error al actualizar', 'error');
    }
  };

  return (
    <>
      {NotificationComponent}
      <div className="page-header">
        <div>
          <h2>Citas</h2>
          <p>Gestión de agenda y sesiones</p>
        </div>
        <div className="header-actions">
          <input type="date" className="form-input" style={{ width: 'auto' }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          <select className="form-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={() => { setFilterDate(''); setFilterStatus(''); }}>Limpiar</button>
          <button className="btn btn-primary" onClick={() => { setEditingAppt(null); setShowModal(true); }}>+ Nueva Cita</button>
        </div>
      </div>

      <div className="page-content">
        {/* Today summary */}
        <TodaySummary />

        <div className="card mt-4">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : appointments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <p>No hay citas</p>
              <span>Ajusta los filtros o crea una nueva cita</span>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Duración</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(a => (
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
                      <td>{a.duration} min</td>
                      <td><span className="badge badge-purple">{a.type === 'session' ? 'Sesión' : a.type === 'evaluation' ? 'Evaluación' : 'Seguimiento'}</span></td>
                      <td><span className={`badge ${STATUS_MAP[a.status]?.badge || 'badge-gray'}`}>{STATUS_MAP[a.status]?.label || a.status}</span></td>
                      <td>
                        <div className="flex gap-2">
                          {a.status === 'scheduled' && (
                            <>
                              <button className="btn btn-sm btn-success" onClick={e => handleStatusChange(a, 'completed', e)}>✓</button>
                              <button className="btn btn-sm btn-danger" onClick={e => handleStatusChange(a, 'cancelled', e)}>✕</button>
                            </>
                          )}
                          <button className="btn btn-sm btn-secondary" onClick={e => handleEdit(a, e)}>Editar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <AppointmentModal
          appointment={editingAppt}
          onClose={() => { setShowModal(false); setEditingAppt(null); }}
          onSave={handleSave}
        />
      )}
    </>
  );
}

function TodaySummary() {
  const [today, setToday] = useState([]);

  useEffect(() => {
    appointmentsAPI.today().then(setToday).catch(() => {});
  }, []);

  if (today.length === 0) return null;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Citas de Hoy ({today.length})</span>
        <span className="badge badge-blue">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>
      <div className="card-body" style={{ padding: '0' }}>
        <div style={{ display: 'flex', gap: '0', overflowX: 'auto', padding: '16px 20px' }}>
          {today.map((a, i) => (
            <div key={a.id} style={{ minWidth: '180px', padding: '12px 16px', background: a.status === 'completed' ? '#d1fae5' : a.status === 'cancelled' ? '#fee2e2' : '#eef2ff', borderRadius: '8px', marginRight: '10px' }}>
              <div className="font-semibold" style={{ fontSize: '13px' }}>{a.time}</div>
              <div className="font-medium" style={{ fontSize: '14px', margin: '4px 0' }}>{a.patient_name}</div>
              <div className="text-xs text-gray">{a.duration} min</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
