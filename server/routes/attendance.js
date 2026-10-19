const express = require('express');
const router = express.Router();

const { get, all, run } = require('../db/database');
const { authenticateToken, checkMustChangePassword } = require('../middleware/auth');
const { attendanceValidation } = require('../middleware/validation');

router.use(authenticateToken);
router.use(checkMustChangePassword);

// POST /api/attendance/scan
router.post('/scan', attendanceValidation, async (req, res) => {
  try {
    const { studentId, type } = req.body;

    const student = await get(`SELECT * FROM students WHERE id = ?`, [studentId]);
    if (!student) {
      return res.status(404).json({ error: `Student ID "${studentId}" not registered in the system.` });
    }

    const result = await run(
      `INSERT INTO attendance (student_id, type, scanned_by) VALUES (?, ?, ?)`,
      [studentId, type, req.user.username]
    );

    const record = await get(`
      SELECT a.id, a.type, a.timestamp, a.scanned_by,
             s.id as student_id, s.name as student_name, s.department, s.photo_url
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.id = ?
    `, [result.id]);

    res.json({
      message: `Attendance logged successfully (${type === 'check_in' ? 'Check In' : 'Check Out'})`,
      record
    });
  } catch (err) {
    console.error('Scan attendance error:', err);
    res.status(500).json({ error: 'Failed to record attendance entry.' });
  }
});

// GET /api/attendance
router.get('/', async (req, res) => {
  try {
    const { studentId, date } = req.query;

    let sql = `
      SELECT a.id, a.type, a.timestamp, a.scanned_by,
             s.id as student_id, s.name as student_name, s.department, s.photo_url
      FROM attendance a
      JOIN students s ON a.student_id = s.id
    `;
    let conditions = [];
    let params = [];

    if (studentId) {
      conditions.push(`a.student_id = ?`);
      params.push(studentId);
    }

    if (date) {
      conditions.push(`DATE(a.timestamp) = DATE(?)`);
      params.push(date);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY a.timestamp DESC`;

    const records = await all(sql, params);
    res.json({ records });
  } catch (err) {
    console.error('Fetch attendance error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance records.' });
  }
});

module.exports = router;
