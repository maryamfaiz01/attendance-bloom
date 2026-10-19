const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const { get, all, run } = require('../db/database');
const { authenticateToken, checkMustChangePassword, requireAdmin } = require('../middleware/auth');
const { studentValidation, studentUpdateValidation } = require('../middleware/validation');

// Helper to save base64 data URLs as images in /public/assets/students/
function processPhotoUpload(studentId, photoUrl) {
  if (!photoUrl || typeof photoUrl !== 'string') return '/assets/students/user.png';
  if (!photoUrl.startsWith('data:image/')) return photoUrl;

  try {
    const matches = photoUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 photo data URL format');
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const safeId = studentId.replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `stu_${safeId}_${Date.now()}.${ext}`;
    const targetDir = path.resolve(__dirname, '../../public/assets/students');

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, filename);
    fs.writeFileSync(filePath, buffer);

    return `/assets/students/${filename}`;
  } catch (err) {
    console.error(`[Photo Storage Error] Failed to save photo for student ${studentId}:`, err);
    throw new Error(`Photo upload failed: ${err.message}`);
  }
}

// Apply authentication middleware to all student routes
router.use(authenticateToken);
router.use(checkMustChangePassword);

// GET /api/students
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    let sql = `SELECT * FROM students ORDER BY id ASC`;
    let params = [];

    if (q) {
      sql = `SELECT * FROM students WHERE id LIKE ? OR name LIKE ? OR department LIKE ? ORDER BY id ASC`;
      const search = `%${q.trim()}%`;
      params = [search, search, search];
    }

    const students = await all(sql, params);
    res.json({ students });
  } catch (err) {
    console.error('[Get Students Error]:', err);
    res.status(500).json({ error: `Failed to fetch student records: ${err.message}` });
  }
});

// GET /api/students/:id
router.get('/:id', async (req, res) => {
  try {
    const student = await get(`SELECT * FROM students WHERE id = ?`, [req.params.id]);
    if (!student) {
      return res.status(404).json({ error: `Student ID "${req.params.id}" not found.` });
    }
    res.json({ student });
  } catch (err) {
    console.error('[Get Student Details Error]:', err);
    res.status(500).json({ error: `Failed to fetch student profile: ${err.message}` });
  }
});

// POST /api/students
router.post('/', studentValidation, async (req, res) => {
  try {
    const { id, name, department, photoUrl, photo } = req.body;
    const targetPhoto = photoUrl || photo;

    const existing = await get(`SELECT id FROM students WHERE id = ?`, [id]);
    if (existing) {
      return res.status(400).json({ error: `Student ID "${id}" already exists.` });
    }

    const savedPhotoPath = processPhotoUpload(id, targetPhoto);

    await run(
      `INSERT INTO students (id, name, department, photo_url) VALUES (?, ?, ?, ?)`,
      [id, name, department, savedPhotoPath]
    );

    const newStudent = await get(`SELECT * FROM students WHERE id = ?`, [id]);
    res.status(201).json({ message: 'Student created successfully.', student: newStudent });
  } catch (err) {
    console.error('[Create Student Error]:', err);
    const statusCode = err.message && err.message.startsWith('Photo upload failed') ? 400 : 500;
    res.status(statusCode).json({ error: err.message || 'Failed to create student card.' });
  }
});

// PUT /api/students/:id (Admin only)
router.put('/:id', requireAdmin, studentUpdateValidation, async (req, res) => {
  try {
    const studentId = req.params.id;
    const { name, department, photoUrl, photo } = req.body;
    const targetPhoto = photoUrl !== undefined ? photoUrl : photo;

    const existing = await get(`SELECT * FROM students WHERE id = ?`, [studentId]);
    if (!existing) {
      return res.status(404).json({ error: `Student ID "${studentId}" not found.` });
    }

    let updatedPhoto = existing.photo_url;
    if (targetPhoto !== undefined) {
      updatedPhoto = processPhotoUpload(studentId, targetPhoto);
    }

    await run(
      `UPDATE students SET name = ?, department = ?, photo_url = ? WHERE id = ?`,
      [name, department, updatedPhoto, studentId]
    );

    const updatedStudent = await get(`SELECT * FROM students WHERE id = ?`, [studentId]);
    res.json({ message: 'Student profile updated successfully.', student: updatedStudent });
  } catch (err) {
    console.error(`[Update Student Error for ID ${req.params.id}]:`, err);
    const statusCode = err.message && err.message.startsWith('Photo upload failed') ? 400 : 500;
    res.status(statusCode).json({ error: err.message || 'Failed to update student profile.' });
  }
});

// DELETE /api/students/:id (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const student = await get(`SELECT id FROM students WHERE id = ?`, [req.params.id]);
    if (!student) {
      return res.status(404).json({ error: `Student ID "${req.params.id}" not found.` });
    }

    await run(`DELETE FROM attendance WHERE student_id = ?`, [req.params.id]);
    await run(`DELETE FROM students WHERE id = ?`, [req.params.id]);

    res.json({ message: 'Student and related attendance history deleted.' });
  } catch (err) {
    console.error('[Delete Student Error]:', err);
    res.status(500).json({ error: `Failed to delete student record: ${err.message}` });
  }
});

module.exports = router;
