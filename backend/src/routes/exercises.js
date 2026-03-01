const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/exercises
router.get('/', authenticateToken, (req, res) => {
  const { category, difficulty, search } = req.query;
  let query = 'SELECT e.*, u.name as creator_name FROM exercises e LEFT JOIN users u ON e.created_by = u.id WHERE 1=1';
  const params = [];

  if (category) { query += ' AND e.category = ?'; params.push(category); }
  if (difficulty) { query += ' AND e.difficulty = ?'; params.push(difficulty); }
  if (search) {
    query += ' AND (e.title LIKE ? OR e.description LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s);
  }

  query += ' ORDER BY e.created_at DESC';
  const exercises = db.prepare(query).all(...params);
  res.json(exercises);
});

// GET /api/exercises/:id
router.get('/:id', authenticateToken, (req, res) => {
  const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(req.params.id);
  if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });
  res.json(exercise);
});

// POST /api/exercises
router.post('/', authenticateToken, (req, res) => {
  const { title, description, category, difficulty, instructions, duration } = req.body;
  if (!title) return res.status(400).json({ error: 'El título es requerido' });

  const id = uuidv4();
  db.prepare(
    'INSERT INTO exercises (id, title, description, category, difficulty, instructions, duration, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, title, description || null, category || 'general', difficulty || 'beginner', instructions || null, duration || 15, req.user.id);

  res.status(201).json(db.prepare('SELECT * FROM exercises WHERE id = ?').get(id));
});

// PUT /api/exercises/:id
router.put('/:id', authenticateToken, (req, res) => {
  const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(req.params.id);
  if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });

  const { title, description, category, difficulty, instructions, duration } = req.body;
  db.prepare(
    'UPDATE exercises SET title=?, description=?, category=?, difficulty=?, instructions=?, duration=? WHERE id=?'
  ).run(
    title || exercise.title, description !== undefined ? description : exercise.description,
    category || exercise.category, difficulty || exercise.difficulty,
    instructions !== undefined ? instructions : exercise.instructions,
    duration || exercise.duration, req.params.id
  );

  res.json(db.prepare('SELECT * FROM exercises WHERE id = ?').get(req.params.id));
});

// DELETE /api/exercises/:id
router.delete('/:id', authenticateToken, (req, res) => {
  const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(req.params.id);
  if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });
  db.prepare('DELETE FROM exercises WHERE id = ?').run(req.params.id);
  res.json({ message: 'Ejercicio eliminado' });
});

// POST /api/exercises/assign
router.post('/assign', authenticateToken, (req, res) => {
  const { patient_id, exercise_id, notes } = req.body;
  if (!patient_id || !exercise_id) {
    return res.status(400).json({ error: 'Paciente y ejercicio son requeridos' });
  }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO patient_exercises (id, patient_id, exercise_id, notes) VALUES (?, ?, ?, ?)'
  ).run(id, patient_id, exercise_id, notes || null);

  res.status(201).json(db.prepare('SELECT pe.*, e.title, e.category FROM patient_exercises pe JOIN exercises e ON pe.exercise_id = e.id WHERE pe.id = ?').get(id));
});

// PUT /api/exercises/progress/:id
router.put('/progress/:id', authenticateToken, (req, res) => {
  const { progress, status, notes } = req.body;
  db.prepare(
    'UPDATE patient_exercises SET progress=?, status=?, notes=? WHERE id=?'
  ).run(progress || 0, status || 'in_progress', notes || null, req.params.id);
  res.json(db.prepare('SELECT * FROM patient_exercises WHERE id = ?').get(req.params.id));
});

module.exports = router;
