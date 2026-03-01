const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/payments
router.get('/', authenticateToken, (req, res) => {
  const { status, patient_id, month, year } = req.query;
  let query = `
    SELECT pay.*, p.name as patient_name
    FROM payments pay
    LEFT JOIN patients p ON pay.patient_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (status) { query += ' AND pay.status = ?'; params.push(status); }
  if (patient_id) { query += ' AND pay.patient_id = ?'; params.push(patient_id); }
  if (month && year) {
    query += ' AND strftime("%m", pay.created_at) = ? AND strftime("%Y", pay.created_at) = ?';
    params.push(String(month).padStart(2, '0'), String(year));
  }

  query += ' ORDER BY pay.created_at DESC';
  const payments = db.prepare(query).all(...params);
  res.json(payments);
});

// POST /api/payments
router.post('/', authenticateToken, (req, res) => {
  const { patient_id, appointment_id, amount, currency, method, description } = req.body;
  if (!patient_id || !amount) {
    return res.status(400).json({ error: 'Paciente y monto son requeridos' });
  }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO payments (id, patient_id, appointment_id, amount, currency, method, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, patient_id, appointment_id || null, amount, currency || 'MXN', method || null, description || null);

  res.status(201).json(db.prepare('SELECT pay.*, p.name as patient_name FROM payments pay LEFT JOIN patients p ON pay.patient_id = p.id WHERE pay.id = ?').get(id));
});

// PUT /api/payments/:id/confirm
router.put('/:id/confirm', authenticateToken, (req, res) => {
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });

  const { method } = req.body;
  db.prepare(
    "UPDATE payments SET status='paid', method=?, paid_at=CURRENT_TIMESTAMP WHERE id=?"
  ).run(method || payment.method, req.params.id);

  res.json(db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id));
});

// GET /api/payments/summary
router.get('/summary', authenticateToken, (req, res) => {
  const summary = db.prepare(`
    SELECT
      COUNT(*) as total_payments,
      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_collected,
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending,
      COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
    FROM payments
  `).get();
  res.json(summary);
});

module.exports = router;
