const express = require('express');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/dashboard - Main dashboard stats
router.get('/dashboard', authenticateToken, (req, res) => {
  const totalPatients = db.prepare("SELECT COUNT(*) as count FROM patients WHERE status='active'").get();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE date=?").get(todayStr);
  const monthStart = todayStr.substring(0, 7) + '-01';
  const monthRevenue = db.prepare("SELECT SUM(amount) as total FROM payments WHERE status='paid' AND date(created_at) >= ?").get(monthStart);
  const pendingPayments = db.prepare("SELECT COUNT(*) as count FROM payments WHERE status='pending'").get();

  const recentPatients = db.prepare(
    "SELECT id, name, diagnosis, created_at FROM patients ORDER BY created_at DESC LIMIT 5"
  ).all();

  const upcomingAppointments = db.prepare(`
    SELECT a.*, p.name as patient_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.date >= ? AND a.status = 'scheduled'
    ORDER BY a.date ASC, a.time ASC
    LIMIT 8
  `).all(todayStr);

  const appointmentsByMonth = db.prepare(`
    SELECT strftime('%Y-%m', date) as month, COUNT(*) as count
    FROM appointments
    WHERE date >= date('now', '-6 months')
    GROUP BY month
    ORDER BY month ASC
  `).all();

  const revenueByMonth = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total
    FROM payments
    WHERE status='paid' AND created_at >= date('now', '-6 months')
    GROUP BY month
    ORDER BY month ASC
  `).all();

  const exerciseCategories = db.prepare(`
    SELECT category, COUNT(*) as count FROM exercises GROUP BY category
  `).all();

  res.json({
    stats: {
      totalPatients: totalPatients.count,
      todayAppointments: todayAppointments.count,
      monthRevenue: monthRevenue.total || 0,
      pendingPayments: pendingPayments.count
    },
    recentPatients,
    upcomingAppointments,
    appointmentsByMonth,
    revenueByMonth,
    exerciseCategories
  });
});

// GET /api/reports/patients - Patient reports
router.get('/patients', authenticateToken, (req, res) => {
  const byStatus = db.prepare("SELECT status, COUNT(*) as count FROM patients GROUP BY status").all();
  const byMonth = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
    FROM patients
    WHERE created_at >= date('now', '-12 months')
    GROUP BY month ORDER BY month
  `).all();
  const withMostSessions = db.prepare(`
    SELECT p.id, p.name, p.diagnosis, COUNT(a.id) as sessions
    FROM patients p
    LEFT JOIN appointments a ON p.id = a.patient_id AND a.status='completed'
    GROUP BY p.id ORDER BY sessions DESC LIMIT 10
  `).all();
  res.json({ byStatus, byMonth, withMostSessions });
});

// GET /api/reports/appointments - Appointment reports
router.get('/appointments', authenticateToken, (req, res) => {
  const byStatus = db.prepare("SELECT status, COUNT(*) as count FROM appointments GROUP BY status").all();
  const byType = db.prepare("SELECT type, COUNT(*) as count FROM appointments GROUP BY type").all();
  const completionRate = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status='completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status='cancelled' THEN 1 END) as cancelled,
      COUNT(CASE WHEN status='no_show' THEN 1 END) as no_show
    FROM appointments
  `).get();
  res.json({ byStatus, byType, completionRate });
});

module.exports = router;
