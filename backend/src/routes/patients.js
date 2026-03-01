const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/patients
router.get('/', authenticateToken, (req, res) => {
  const { status, search } = req.query;
  let query = 'SELECT p.*, u.name as therapist_name FROM patients p LEFT JOIN users u ON p.therapist_id = u.id WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND p.status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (p.name LIKE ? OR p.email LIKE ? OR p.phone LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ' ORDER BY p.created_at DESC';
  const patients = db.prepare(query).all(...params);
  res.json(patients);
});

// GET /api/patients/:id
router.get('/:id', authenticateToken, (req, res) => {
  const patient = db.prepare(
    'SELECT p.*, u.name as therapist_name FROM patients p LEFT JOIN users u ON p.therapist_id = u.id WHERE p.id = ?'
  ).get(req.params.id);

  if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });

  const appointments = db.prepare(
    'SELECT a.*, u.name as therapist_name FROM appointments a LEFT JOIN users u ON a.therapist_id = u.id WHERE a.patient_id = ? ORDER BY a.date DESC, a.time DESC LIMIT 10'
  ).all(req.params.id);

  const exercises = db.prepare(
    'SELECT pe.*, e.title, e.category, e.difficulty FROM patient_exercises pe JOIN exercises e ON pe.exercise_id = e.id WHERE pe.patient_id = ?'
  ).all(req.params.id);

  const payments = db.prepare(
    'SELECT * FROM payments WHERE patient_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(req.params.id);

  res.json({ ...patient, appointments, exercises, payments });
});

// POST /api/patients
router.post('/', authenticateToken, (req, res) => {
  const { name, email, phone, birth_date, diagnosis, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es requerido' });

  const id = uuidv4();
  db.prepare(
    'INSERT INTO patients (id, name, email, phone, birth_date, diagnosis, notes, therapist_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, email || null, phone || null, birth_date || null, diagnosis || null, notes || null, req.user.id);

  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  res.status(201).json(patient);
});

// PUT /api/patients/:id
router.put('/:id', authenticateToken, (req, res) => {
  const { name, email, phone, birth_date, diagnosis, notes, status } = req.body;
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });

  db.prepare(
    'UPDATE patients SET name=?, email=?, phone=?, birth_date=?, diagnosis=?, notes=?, status=? WHERE id=?'
  ).run(
    name || patient.name, email || patient.email, phone || patient.phone,
    birth_date || patient.birth_date, diagnosis || patient.diagnosis,
    notes || patient.notes, status || patient.status, req.params.id
  );

  res.json(db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id));
});

// DELETE /api/patients/:id
router.delete('/:id', authenticateToken, (req, res) => {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });

  db.prepare('UPDATE patients SET status = ? WHERE id = ?').run('inactive', req.params.id);
  res.json({ message: 'Paciente desactivado exitosamente' });
});

module.exports = router;
