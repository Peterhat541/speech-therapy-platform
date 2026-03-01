const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/appointments
router.get('/', authenticateToken, (req, res) => {
  const { date, status, patient_id, month, year } = req.query;
  let query = `
    SELECT a.*, p.name as patient_name, u.name as therapist_name
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    LEFT JOIN users u ON a.therapist_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (date) { query += ' AND a.date = ?'; params.push(date); }
  if (status) { query += ' AND a.status = ?'; params.push(status); }
  if (patient_id) { query += ' AND a.patient_id = ?'; params.push(patient_id); }
  if (month && year) {
    query += ' AND strftime("%m", a.date) = ? AND strftime("%Y", a.date) = ?';
    params.push(String(month).padStart(2, '0'), String(year));
  }

  query += ' ORDER BY a.date ASC, a.time ASC';
  const appointments = db.prepare(query).all(...params);
  res.json(appointments);
});

// GET /api/appointments/today
router.get('/today', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const appointments = db.prepare(`
    SELECT a.*, p.name as patient_name, u.name as therapist_name
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    LEFT JOIN users u ON a.therapist_id = u.id
    WHERE a.date = ? AND a.therapist_id = ?
    ORDER BY a.time ASC
  `).all(today, req.user.id);
  res.json(appointments);
});

// GET /api/appointments/:id
router.get('/:id', authenticateToken, (req, res) => {
  const appt = db.prepare(`
    SELECT a.*, p.name as patient_name, u.name as therapist_name
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    LEFT JOIN users u ON a.therapist_id = u.id
    WHERE a.id = ?
  `).get(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Cita no encontrada' });

  const notes = db.prepare('SELECT * FROM session_notes WHERE appointment_id = ?').get(req.params.id);
  res.json({ ...appt, session_notes: notes });
});

// POST /api/appointments
router.post('/', authenticateToken, (req, res) => {
  const { patient_id, date, time, duration, type, notes } = req.body;
  if (!patient_id || !date || !time) {
    return res.status(400).json({ error: 'Paciente, fecha y hora son requeridos' });
  }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO appointments (id, patient_id, therapist_id, date, time, duration, type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, patient_id, req.user.id, date, time, duration || 60, type || 'session', notes || null);

  const appt = db.prepare(`
    SELECT a.*, p.name as patient_name, u.name as therapist_name
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    LEFT JOIN users u ON a.therapist_id = u.id
    WHERE a.id = ?
  `).get(id);
  res.status(201).json(appt);
});

// PUT /api/appointments/:id
router.put('/:id', authenticateToken, (req, res) => {
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Cita no encontrada' });

  const { date, time, duration, type, status, notes } = req.body;
  db.prepare(
    'UPDATE appointments SET date=?, time=?, duration=?, type=?, status=?, notes=? WHERE id=?'
  ).run(
    date || appt.date, time || appt.time, duration || appt.duration,
    type || appt.type, status || appt.status, notes !== undefined ? notes : appt.notes,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id));
});

// POST /api/appointments/:id/notes
router.post('/:id/notes', authenticateToken, (req, res) => {
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Cita no encontrada' });

  const { content, goals, progress_score } = req.body;
  const id = uuidv4();
  db.prepare(
    'INSERT INTO session_notes (id, appointment_id, patient_id, therapist_id, content, goals, progress_score) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.params.id, appt.patient_id, req.user.id, content, goals, progress_score);

  db.prepare("UPDATE appointments SET status = 'completed' WHERE id = ?").run(req.params.id);
  res.status(201).json(db.prepare('SELECT * FROM session_notes WHERE id = ?').get(id));
});

module.exports = router;
