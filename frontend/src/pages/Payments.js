import React, { useState, useEffect, useCallback } from 'react';
import { paymentsAPI, patientsAPI } from '../services/api';
import { useNotification } from '../hooks/useNotification';

const METHODS = ['efectivo', 'transferencia', 'tarjeta', 'cheque'];

function PaymentModal({ onClose, onSave }) {
  const [form, setForm] = useState({ patient_id: '', amount: '', currency: 'MXN', method: 'efectivo', description: 'Sesión de terapia del habla' });
  const [patients, setPatients] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    patientsAPI.list({ status: 'active' }).then(setPatients).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await paymentsAPI.create(form);
      onSave();
    } catch (err) {
      alert(err.error || 'Error al crear pago');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Registrar Pago</span>
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
                <label className="form-label">Monto *</label>
                <input type="number" className="form-input" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Moneda</label>
                <select className="form-select" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Método de pago</label>
              <select className="form-select" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                {METHODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Registrando...' : 'Registrar Pago'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const { notify, NotificationComponent } = useNotification();

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      paymentsAPI.list({ status: filterStatus }),
      paymentsAPI.summary()
    ]).then(([p, s]) => {
      setPayments(p);
      setSummary(s);
    }).catch(console.error).finally(() => setLoading(false));
  }, [filterStatus]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleConfirm = async (p) => {
    const method = prompt('Método de pago:', p.method || 'efectivo');
    if (!method) return;
    try {
      await paymentsAPI.confirm(p.id, { method });
      notify('Pago confirmado');
      fetchAll();
    } catch {
      notify('Error al confirmar pago', 'error');
    }
  };

  return (
    <>
      {NotificationComponent}
      <div className="page-header">
        <div>
          <h2>Pagos</h2>
          <p>Gestión financiera del centro</p>
        </div>
        <div className="header-actions">
          <select className="form-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="paid">Pagados</option>
            <option value="pending">Pendientes</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Registrar Pago</button>
        </div>
      </div>

      <div className="page-content">
        {/* Summary cards */}
        {summary && (
          <div className="stats-grid mb-4">
            <div className="stat-card">
              <div className="stat-icon green">💰</div>
              <div>
                <div className="stat-value">${(summary.total_collected || 0).toLocaleString()}</div>
                <div className="stat-label">Total Cobrado</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon yellow">⏳</div>
              <div>
                <div className="stat-value">${(summary.total_pending || 0).toLocaleString()}</div>
                <div className="stat-label">Pendiente de Cobro</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue">✓</div>
              <div>
                <div className="stat-value">{summary.paid_count}</div>
                <div className="stat-label">Pagos Completados</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple">📋</div>
              <div>
                <div className="stat-value">{summary.pending_count}</div>
                <div className="stat-label">Pagos Pendientes</div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : payments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💳</div>
              <p>No hay pagos registrados</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Monto</th>
                    <th>Método</th>
                    <th>Descripción</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                            {p.patient_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          {p.patient_name}
                        </div>
                      </td>
                      <td><strong>${p.amount.toLocaleString()} {p.currency}</strong></td>
                      <td>{p.method ? <span className="badge badge-gray">{p.method}</span> : <span className="text-gray">-</span>}</td>
                      <td className="text-sm text-gray">{p.description}</td>
                      <td className="text-sm">{p.paid_at ? p.paid_at.split('T')[0] : p.created_at?.split('T')[0]}</td>
                      <td>
                        <span className={`badge ${p.status === 'paid' ? 'badge-green' : 'badge-yellow'}`}>
                          {p.status === 'paid' ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td>
                        {p.status === 'pending' && (
                          <button className="btn btn-sm btn-success" onClick={() => handleConfirm(p)}>Confirmar Pago</button>
                        )}
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
        <PaymentModal
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchAll(); notify('Pago registrado exitosamente'); }}
        />
      )}
    </>
  );
}
