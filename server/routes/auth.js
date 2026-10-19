const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { get, run } = require('../db/database');
const { loginLimiter } = require('../middleware/rateLimiter');
const { loginValidation, changePasswordValidation } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';
const IS_PROD = process.env.NODE_ENV === 'production';

// POST /api/auth/login
router.post('/login', loginLimiter, loginValidation, async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await get(`SELECT * FROM users WHERE username = ?`, [username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      mustChangePassword: Boolean(user.must_change_password)
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

    // Condition 1: HTTP-Only, Secure (in production), SameSite=Strict cookie ONLY
    res.cookie('token', token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        mustChangePassword: Boolean(user.must_change_password)
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, changePasswordValidation, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await get(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await run(`UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?`, [newHash, req.user.id]);

    // Issue updated token with mustChangePassword = false
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      mustChangePassword: false
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000
    });

    return res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict'
  });
  res.json({ message: 'Logged out successfully.' });
});

module.exports = router;
