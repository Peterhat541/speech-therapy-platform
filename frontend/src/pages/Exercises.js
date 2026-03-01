import React, { useState, useEffect, useCallback } from 'react';
import { exercisesAPI, patientsAPI } from '../services/api';
import { useNotification } from '../hooks/useNotification';

const CATEGORIES = ['articulacion', 'fonologia', 'respiracion', 'lenguaje', 'fluidez', 'percepcion', 'general'];
const DIFFICULTIES = { beginner: { label: 'Principiante', badge: 'badge-green' }, intermediate: { label: 'Intermedio', badge: 'badge-yellow' }, advanced: { label: 'Avanzado', badge: 'badge-red' } };

function ExerciseModal({ exercise, onClose, onSave }) {
  const [form, setForm] = useState(exercise || { title: '', description: '', category: 'general', difficulty: 'beginner', instructions: '', duration: 15 });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (exercise?.id) {
        await exercisesAPI.update(exercise.id, form);
      } else {
        await exercisesAPI.create(form);
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
          <span className="modal-title">{exercise?.id ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Título *</label>
              <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input className="form-input" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Dificultad</label>
                <select className="form-select" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                  {Object.entries(DIFFICULTIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Instrucciones</label>
              <textarea className="form-textarea" value={form.instructions || ''} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} placeholder="Describe paso a paso cómo realizar el ejercicio..." />
            </div>
            <div className="form-group">
              <label className="form-label">Duración (minutos)</label>
              <input type="number" className="form-input" min="5" max="120" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) }))} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignModal({ exercise, onClose, onSave }) {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    patientsAPI.list({ status: 'active' }).then(setPatients).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await exercisesAPI.assign({ patient_id: patientId, exercise_id: exercise.id, notes });
      onSave();
    } catch (err) {
      alert(err.error || 'Error al asignar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Asignar: {exercise.title}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Seleccionar Paciente *</label>
              <select className="form-select" value={patientId} onChange={e => setPatientId(e.target.value)} required>
                <option value="">Elegir paciente...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notas adicionales</label>
              <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instrucciones específicas para este paciente..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Asignando...' : 'Asignar Ejercicio'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Exercises() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [search, setSearch] = useState('');
  const { notify, NotificationComponent } = useNotification();

  const fetchExercises = useCallback(() => {
    setLoading(true);
    exercisesAPI.list({ category: filterCategory, difficulty: filterDifficulty, search })
      .then(setExercises)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterCategory, filterDifficulty, search]);

  useEffect(() => {
    const t = setTimeout(fetchExercises, 300);
    return () => clearTimeout(t);
  }, [fetchExercises]);

  const handleDelete = async (ex) => {
    if (!window.confirm(`¿Eliminar "${ex.title}"?`)) return;
    try {
      await exercisesAPI.delete(ex.id);
      notify('Ejercicio eliminado');
      fetchExercises();
    } catch {
      notify('Error al eliminar', 'error');
    }
  };

  return (
    <>
      {NotificationComponent}
      <div className="page-header">
        <div>
          <h2>Ejercicios</h2>
          <p>Biblioteca de ejercicios de terapia</p>
        </div>
        <div className="header-actions">
          <div className="search-bar">
            <span>🔍</span>
            <input placeholder="Buscar ejercicio..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">Todas las categorías</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}>
            <option value="">Todas las dificultades</option>
            {Object.entries(DIFFICULTIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>+ Nuevo Ejercicio</button>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : exercises.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <p>No hay ejercicios en la biblioteca</p>
            <span>Crea el primer ejercicio haciendo clic en "Nuevo Ejercicio"</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {exercises.map(ex => (
              <div key={ex.id} className="card" style={{ padding: '0' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #f3f4f6' }}>
                  <div className="flex justify-between items-center" style={{ marginBottom: '8px' }}>
                    <span className={`badge ${DIFFICULTIES[ex.difficulty]?.badge || 'badge-gray'}`}>{DIFFICULTIES[ex.difficulty]?.label}</span>
                    <span className="badge badge-purple">{ex.category}</span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>{ex.title}</h3>
                  <p className="text-sm text-gray">{ex.description}</p>
                </div>
                {ex.instructions && (
                  <div style={{ padding: '14px 20px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                    <div className="text-xs font-medium" style={{ color: 'var(--gray-500)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Instrucciones</div>
                    <p className="text-sm" style={{ color: 'var(--gray-700)', lineHeight: '1.6' }}>{ex.instructions}</p>
                  </div>
                )}
                <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="text-sm text-gray">⏱ {ex.duration} min</span>
                  <div className="flex gap-2">
                    <button className="btn btn-sm btn-primary" onClick={() => { setAssigning(ex); setShowAssignModal(true); }}>Asignar</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(ex); setShowModal(true); }}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(ex)}>✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <ExerciseModal
          exercise={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={() => { setShowModal(false); setEditing(null); fetchExercises(); notify('Ejercicio guardado'); }}
        />
      )}
      {showAssignModal && assigning && (
        <AssignModal
          exercise={assigning}
          onClose={() => { setShowAssignModal(false); setAssigning(null); }}
          onSave={() => { setShowAssignModal(false); setAssigning(null); notify('Ejercicio asignado exitosamente'); }}
        />
      )}
    </>
  );
}
