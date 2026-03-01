import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientsAPI } from '../services/api';
import { useNotification } from '../hooks/useNotification';

const STATUS_BADGE = {
  active: 'badge-green',
  inactive: 'badge-gray',
};

function PatientModal({ patient, onClose, onSave }) {
  const [form, setForm] = useState(patient || { name: '', email: '', phone: '', birth_date: '', diagnosis: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (patient?.id) {
        await patientsAPI.update(patient.id, form);
      } else {
        await patientsAPI.create(form);
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
          <span className="modal-title">{patient?.id ? 'Editar Paciente' : 'Nuevo Paciente'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nombre completo *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input className="form-input" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha de nacimiento</label>
                <input type="date" className="form-input" value={form.birth_date || ''} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Diagnóstico</label>
              <input className="form-input" value={form.diagnosis || ''} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} placeholder="Ej. Retraso del lenguaje, Dislalia..." />
            </div>
            <div className="form-group">
              <label className="form-label">Notas</label>
              <textarea className="form-textarea" value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observaciones adicionales..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const { notify, NotificationComponent } = useNotification();
  const navigate = useNavigate();

  const fetchPatients = useCallback(() => {
    setLoading(true);
    patientsAPI.list({ search, status: 'active' })
      .then(setPatients)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchPatients, 300);
    return () => clearTimeout(t);
  }, [fetchPatients]);

  const handleSave = () => {
    setShowModal(false);
    setEditingPatient(null);
    fetchPatients();
    notify('Paciente guardado exitosamente');
  };

  const handleEdit = (p, e) => {
    e.stopPropagation();
    setEditingPatient(p);
    setShowModal(true);
  };

  const handleDelete = async (p, e) => {
    e.stopPropagation();
    if (!window.confirm(`¿Desactivar al paciente ${p.name}?`)) return;
    try {
      await patientsAPI.delete(p.id);
      notify('Paciente desactivado');
      fetchPatients();
    } catch {
      notify('Error al desactivar', 'error');
    }
  };

  function getAge(birthDate) {
    if (!birthDate) return '-';
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)) + ' años';
  }

  return (
    <>
      {NotificationComponent}
      <div className="page-header">
        <div>
          <h2>Pacientes</h2>
          <p>Gestión de pacientes del centro</p>
        </div>
        <div className="header-actions">
          <div className="search-bar">
            <span>🔍</span>
            <input placeholder="Buscar paciente..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => { setEditingPatient(null); setShowModal(true); }}>
            + Nuevo Paciente
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="card">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : patients.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>No hay pacientes registrados</p>
              <span>Haz clic en "Nuevo Paciente" para agregar uno</span>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Teléfono</th>
                    <th>Edad</th>
                    <th>Diagnóstico</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map(p => (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/patients/${p.id}`)}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar">
                            {p.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-sm text-gray">{p.email || 'Sin email'}</div>
                          </div>
                        </div>
                      </td>
                      <td>{p.phone || '-'}</td>
                      <td>{getAge(p.birth_date)}</td>
                      <td>{p.diagnosis || <span className="text-gray">Sin diagnóstico</span>}</td>
                      <td><span className={`badge ${STATUS_BADGE[p.status] || 'badge-gray'}`}>{p.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-sm btn-secondary" onClick={e => handleEdit(p, e)}>Editar</button>
                          <button className="btn btn-sm btn-danger" onClick={e => handleDelete(p, e)}>Desactivar</button>
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
        <PatientModal
          patient={editingPatient}
          onClose={() => { setShowModal(false); setEditingPatient(null); }}
          onSave={handleSave}
        />
      )}
    </>
  );
}
